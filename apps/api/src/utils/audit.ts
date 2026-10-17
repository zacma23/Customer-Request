import { prisma } from './prisma';
import { logger } from './logger';
import { Request } from 'express';

export interface AuditLogParams {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, any> | null;
  req?: Request;
}

export async function recordAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const ipAddress =
      params.req?.ip ||
      (params.req?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      params.req?.socket?.remoteAddress ||
      null;

    const userAgent = params.req?.headers['user-agent'] || null;

    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (err: any) {
    logger.error({ err, action: params.action }, 'Failed to record audit log');
  }
}
