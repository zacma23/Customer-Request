import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from '../services/auth';
import { prisma } from '../utils/prisma';
import { Role } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        phone: string;
        email: string | null;
        name: string;
      };
    }
  }
}

/**
 * Verifies JWT Access Token from Authorization Header
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required. Missing Bearer token.', code: 'UNAUTHORIZED' },
      });
      return;
    }

    const token = authHeader.substring(7);
    let payload: TokenPayload;

    try {
      payload = authService.verifyAccessToken(token);
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired access token', code: 'TOKEN_EXPIRED' },
      });
      return;
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, phone: true, email: true, name: true, isActive: true, deletedAt: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      res.status(401).json({
        success: false,
        error: { message: 'Account is deactivated, suspended, or not found', code: 'ACCOUNT_INACTIVE' },
      });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    logger.error({ error }, 'Authentication middleware failure');
    res.status(500).json({
      success: false,
      error: { message: 'Internal authentication error', code: 'AUTH_ERROR' },
    });
  }
}

/**
 * Enforces Role-Based Access Control (RBAC)
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          message: `Forbidden: requires one of roles [${roles.join(', ')}]. Current role: ${req.user.role}`,
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    next();
  };
}

/**
 * Convenience helper for STAFF, ADMIN, and SUPER_ADMIN
 */
export const requireStaffOrAdmin = requireRole(Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN);

/**
 * Convenience helper for ADMIN and SUPER_ADMIN
 */
export const requireAdmin = requireRole(Role.ADMIN, Role.SUPER_ADMIN);

/**
 * Convenience helper for SUPER_ADMIN only
 */
export const requireSuperAdmin = requireRole(Role.SUPER_ADMIN);

/**
 * IDOR Prevention: Ensures clients can only access their own service requests.
 * Staff and Admin roles are granted authorization.
 */
export async function checkRequestAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const requestId = (req.params.id || req.params.requestId) as string;
    if (!requestId) {
      next();
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
      return;
    }

    // Super Admin & Admin can access all
    if (req.user.role === Role.ADMIN || req.user.role === Role.SUPER_ADMIN) {
      next();
      return;
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { id: true, clientId: true, assignedStaffId: true, deletedAt: true },
    });

    if (!request || request.deletedAt) {
      res.status(404).json({ success: false, error: { message: 'Request not found', code: 'NOT_FOUND' } });
      return;
    }

    // Client can ONLY access their own requests
    if (req.user.role === Role.CLIENT) {
      if (request.clientId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: { message: 'Access denied. You cannot view other clients’ requests.', code: 'FORBIDDEN' },
        });
        return;
      }
      next();
      return;
    }

    // Staff can view if assigned or general staff queue
    if (req.user.role === Role.STAFF) {
      next();
      return;
    }

    res.status(403).json({ success: false, error: { message: 'Access denied', code: 'FORBIDDEN' } });
  } catch (err: any) {
    logger.error({ err }, 'IDOR check failed');
    res.status(500).json({ success: false, error: { message: 'Security check failed', code: 'INTERNAL_ERROR' } });
  }
}
