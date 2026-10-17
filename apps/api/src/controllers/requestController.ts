import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { aiService } from '../services/ai';
import { sseManager } from '../realtime/sse';
import { recordAuditLog } from '../utils/audit';
import { telegramService } from '../services/telegram';
import { whatsappService } from '../services/whatsapp';
import { Priority, RequestStatus, Role } from '@prisma/client';
import { logger } from '../utils/logger';

export class RequestController {
  /**
   * Create a new Service Request (Client)
   */
  public async create(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { title, description, serviceKeys, budgetRange, preferredContactTime } = req.body;

    // 1. Generate sequential request number: REQ-YYYY-NNNN
    const currentYear = new Date().getFullYear();
    const count = await prisma.serviceRequest.count();
    const requestNumber = `REQ-${currentYear}-${(count + 1).toString().padStart(4, '0')}`;

    // 2. AI Auto-Classification
    const aiClassification = await aiService.classifyRequest(title, description);

    // 3. AI Next Action suggestion
    const aiNextAction = await aiService.suggestNextAction('PENDING', false, false, false);

    // 4. Find matched services by keys
    const services = await prisma.service.findMany({
      where: { key: { in: serviceKeys } },
    });

    // 5. Create Request and RequestServices in transaction
    const serviceRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.serviceRequest.create({
        data: {
          requestNumber,
          clientId: userId,
          title,
          description,
          budgetRange: budgetRange || null,
          preferredContactTime: preferredContactTime || null,
          status: RequestStatus.PENDING,
          priority: aiClassification.priority,
          aiCategory: aiClassification.category,
          aiPriority: aiClassification.priority,
          aiSentiment: aiClassification.sentiment,
          aiLanguage: aiClassification.language,
          aiNextAction,
          services: {
            create: services.map((s) => ({
              serviceId: s.id,
            })),
          },
        },
        include: {
          services: { include: { service: true } },
          client: { select: { id: true, name: true, phone: true, email: true } },
        },
      });

      return created;
    });

    // 6. Real-time notification to staff/admin dashboard
    sseManager.notifyStaffAndAdmin('new_request', {
      id: serviceRequest.id,
      requestNumber: serviceRequest.requestNumber,
      title: serviceRequest.title,
      clientName: req.user!.name,
      priority: serviceRequest.priority,
    });

    await recordAuditLog({
      userId,
      action: 'CREATE_REQUEST',
      resourceType: 'ServiceRequest',
      resourceId: serviceRequest.id,
      details: { requestNumber, title, serviceKeys },
      req,
    });

    res.status(201).json({
      success: true,
      data: serviceRequest,
      message: 'Service request submitted successfully',
    });
  }

  /**
   * List Service Requests with server-side pagination, search, filter, and sorting
   */
  public async list(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const {
      page = '1',
      limit = '10',
      search,
      status,
      serviceKey,
      priority,
      assigneeId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * take;

    const where: any = { deletedAt: null };

    // Role-based visibility
    if (user.role === Role.CLIENT) {
      where.clientId = user.id;
    } else if (user.role === Role.STAFF && assigneeId === 'me') {
      where.assignedStaffId = user.id;
    } else if (assigneeId) {
      where.assignedStaffId = assigneeId;
    }

    // Status filter
    if (status) {
      where.status = status as RequestStatus;
    }

    // Priority filter
    if (priority) {
      where.priority = priority as Priority;
    }

    // Service key filter
    if (serviceKey) {
      where.services = {
        some: {
          service: { key: serviceKey },
        },
      };
    }

    // Search query
    if (search) {
      where.OR = [
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { client: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, requests] = await Promise.all([
      prisma.serviceRequest.count({ where }),
      prisma.serviceRequest.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          services: { include: { service: true } },
          client: { select: { id: true, name: true, phone: true, email: true } },
          assignedStaff: { select: { id: true, name: true, phone: true, email: true } },
          paymentRequests: { select: { id: true, amount: true, currency: true, status: true } },
          _count: { select: { messages: true, attachments: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  }

  /**
   * Get Request Detail by ID
   */
  public async getById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const user = req.user!;

    const request = await prisma.serviceRequest.findFirst({
      where: { id, deletedAt: null },
      include: {
        services: { include: { service: true } },
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            createdAt: true,
            profile: true,
            channelLinks: { select: { channelType: true, isVerified: true } },
          },
        },
        assignedStaff: { select: { id: true, name: true, phone: true, email: true } },
        attachments: { include: { uploadedBy: { select: { id: true, name: true } } } },
        meetings: { orderBy: { scheduledAt: 'desc' } },
        paymentRequests: {
          include: {
            proofs: { include: { receiptAttachment: true } },
            verifiedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        feedback: true,
      },
    });

    if (!request) {
      res.status(404).json({ success: false, error: { message: 'Service request not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({
      success: true,
      data: request,
    });
  }

  /**
   * Update Status (Approve, Reject, In Progress, Complete, Close)
   */
  public async updateStatus(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { status, reason } = req.body;
    const user = req.user!;

    const existing = await prisma.serviceRequest.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { message: 'Request not found', code: 'NOT_FOUND' } });
      return;
    }

    const previousStatus = existing.status;

    // AI Next Best Action computation
    const nextAction = await aiService.suggestNextAction(
      status,
      false,
      false,
      false,
      id
    );

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: {
        status: status as RequestStatus,
        aiNextAction: nextAction,
      },
      include: { client: true },
    });

    // Create system audit message in thread
    const statusNote = reason ? `Status updated to ${status}. Reason: ${reason}` : `Status updated to ${status}`;
    await prisma.message.create({
      data: {
        serviceRequestId: id,
        senderId: user.id,
        type: status === RequestStatus.APPROVED || status === RequestStatus.REJECTED ? 'APPROVAL' : 'GENERAL',
        content: statusNote,
        metadata: JSON.stringify({ previousStatus, newStatus: status, reason }),
      },
    });

    // Real-time notification to client
    sseManager.sendToUser(existing.clientId, 'request_status_updated', {
      requestId: id,
      requestNumber: existing.requestNumber,
      previousStatus,
      newStatus: status,
    });

    // Outbound push to linked Telegram / WhatsApp
    const pushMsg = `🔔 <b>Status Update: Request ${existing.requestNumber}</b>\nYour request has moved to: <code>${status}</code>\n${reason ? `<i>Note: ${reason}</i>` : ''}`;
    await telegramService.sendNotificationToUser(existing.clientId, pushMsg);
    await whatsappService.sendNotificationToUser(existing.clientId, `Status Update: Request ${existing.requestNumber} is now ${status}.`);

    await recordAuditLog({
      userId: user.id,
      action: 'UPDATE_REQUEST_STATUS',
      resourceType: 'ServiceRequest',
      resourceId: id,
      details: { previousStatus, newStatus: status, reason },
      req,
    });

    res.json({
      success: true,
      data: updated,
      message: `Request status transitioned to ${status}`,
    });
  }

  /**
   * Assign Staff Member (Admin)
   */
  public async assignStaff(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { staffId } = req.body;
    const user = req.user!;

    let staffName = 'Unassigned';
    if (staffId) {
      const staffUser = await prisma.user.findFirst({
        where: { id: staffId, role: { in: [Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN] } },
      });
      if (!staffUser) {
        res.status(400).json({ success: false, error: { message: 'Invalid staff user ID', code: 'INVALID_STAFF' } });
        return;
      }
      staffName = staffUser.name;
    }

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: { assignedStaffId: staffId },
      include: { assignedStaff: { select: { id: true, name: true, phone: true } } },
    });

    if (staffId) {
      sseManager.sendToUser(staffId, 'request_assigned_to_you', {
        requestId: id,
        requestNumber: updated.requestNumber,
        title: updated.title,
      });
    }

    await recordAuditLog({
      userId: user.id,
      action: 'ASSIGN_STAFF',
      resourceType: 'ServiceRequest',
      resourceId: id,
      details: { assignedStaffId: staffId, staffName },
      req,
    });

    res.json({
      success: true,
      data: updated,
      message: `Assigned to ${staffName}`,
    });
  }

  /**
   * Update Request Priority (Admin / Staff)
   */
  public async updatePriority(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { priority } = req.body;

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: { priority: priority as Priority },
    });

    await recordAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_PRIORITY',
      resourceType: 'ServiceRequest',
      resourceId: id,
      details: { priority },
      req,
    });

    res.json({
      success: true,
      data: updated,
    });
  }

  /**
   * Export Requests as CSV
   */
  public async exportCsv(req: Request, res: Response): Promise<void> {
    const requests = await prisma.serviceRequest.findMany({
      where: { deletedAt: null },
      include: {
        client: true,
        assignedStaff: true,
        services: { include: { service: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV string
    const headers = ['Request Number', 'Client Name', 'Client Phone', 'Title', 'Services', 'Status', 'Priority', 'Assigned Staff', 'Created At'];
    const rows = requests.map((r) => [
      `"${r.requestNumber}"`,
      `"${r.client.name}"`,
      `"${r.client.phone}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.services.map((s) => s.service.title).join('; ')}"`,
      `"${r.status}"`,
      `"${r.priority}"`,
      `"${r.assignedStaff?.name || 'Unassigned'}"`,
      `"${r.createdAt.toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="requests-export-${Date.now()}.csv"`);
    res.send(csvContent);
  }

  /**
   * Soft Delete Request
   */
  public async delete(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;

    await prisma.serviceRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await recordAuditLog({
      userId: req.user!.id,
      action: 'DELETE_REQUEST',
      resourceType: 'ServiceRequest',
      resourceId: id,
      req,
    });

    res.json({ success: true, message: 'Request moved to trash' });
  }
}

export const requestController = new RequestController();
