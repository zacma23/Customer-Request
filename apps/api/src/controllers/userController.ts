import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authService } from '../services/auth';
import { normalizePhoneNumber } from '../utils/phone';
import { recordAuditLog } from '../utils/audit';
import { Role } from '@prisma/client';

export class UserController {
  /**
   * List users with search and role filtering (Admin/Super Admin)
   */
  public async list(req: Request, res: Response): Promise<void> {
    const { role, search, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * take;

    const where: any = { deletedAt: null };
    if (role) {
      where.role = role as Role;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          isActive: true,
          isPhoneVerified: true,
          createdAt: true,
          profile: true,
          _count: { select: { requests: true, assignedRequests: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  }

  /**
   * Get user detail & history
   */
  public async getById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        requests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { services: { include: { service: true } } },
        },
        channelLinks: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  }

  /**
   * Create Staff or Admin Account (SUPER_ADMIN only)
   */
  public async createStaffOrAdmin(req: Request, res: Response): Promise<void> {
    const { name, phone, email, password, role } = req.body;
    const admin = req.user!;

    if (role !== Role.STAFF && role !== Role.ADMIN) {
      res.status(400).json({
        success: false,
        error: { message: 'Can only create STAFF or ADMIN accounts', code: 'INVALID_ROLE' },
      });
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const cleanEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findFirst({
      where: { OR: [{ phone: normalizedPhone }, { email: cleanEmail }] },
    });

    if (existing) {
      res.status(400).json({
        success: false,
        error: { message: 'User with this phone or email already exists', code: 'USER_EXISTS' },
      });
      return;
    }

    const passwordHash = await authService.hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        phone: normalizedPhone,
        email: cleanEmail,
        passwordHash,
        role: role as Role,
        isActive: true,
        isPhoneVerified: true,
      },
      select: { id: true, name: true, phone: true, email: true, role: true, createdAt: true },
    });

    await recordAuditLog({
      userId: admin.id,
      action: 'CREATE_STAFF_OR_ADMIN',
      resourceType: 'User',
      resourceId: newUser.id,
      details: { role, email: cleanEmail },
      req,
    });

    res.status(201).json({
      success: true,
      data: newUser,
      message: `${role} account created successfully`,
    });
  }

  /**
   * Suspend or Activate user
   */
  public async toggleStatus(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { isActive } = req.body;
    const admin = req.user!;

    // Prevent suspending yourself
    if (id === admin.id) {
      res.status(400).json({ success: false, error: { message: 'You cannot suspend your own account', code: 'BAD_REQUEST' } });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
      select: { id: true, name: true, isActive: true },
    });

    await recordAuditLog({
      userId: admin.id,
      action: isActive ? 'ACTIVATE_USER' : 'SUSPEND_USER',
      resourceType: 'User',
      resourceId: id,
      req,
    });

    res.json({
      success: true,
      data: updated,
      message: `User ${isActive ? 'activated' : 'suspended'} successfully`,
    });
  }

  /**
   * Get Audit Logs (Super Admin)
   */
  public async getAuditLogs(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '30', action, resourceType } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, role: true, email: true } } },
      }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  }
}

export const userController = new UserController();
