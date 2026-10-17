import type { Handler, HandlerEvent } from '@netlify/functions';
import { prisma } from '../lib/db';
import { json, error, unauthorized, forbidden, notFound, handleOptions } from '../lib/response';
import { getAuthUser } from '../lib/auth';
import { isAdminOrSuperAdmin, isSuperAdmin } from '../lib/rbac';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  const authUser = await getAuthUser(event);
  if (!authUser) {
    return unauthorized('Authentication required');
  }

  if (!isAdminOrSuperAdmin(authUser.role)) {
    return forbidden('Admin authorization required');
  }

  const cleanPath = event.path
    .replace(/\/?\.netlify\/functions\/admin\/?/, '')
    .replace(/^\/api\/v1\/admin\/?/, '');
  const pathParts = cleanPath.split('/').filter(Boolean);
  const resource = pathParts[0] || '';
  const resourceId = pathParts[1] || null;

  try {
    // 1. Clients Directory
    if (resource === 'clients') {
      if (event.httpMethod === 'GET') {
        const clients = await prisma.user.findMany({
          where: { role: 'CLIENT' },
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
            channelLinks: true,
            _count: { select: { requests: true } },
          },
        });
        return json(200, clients);
      }

      if (event.httpMethod === 'PATCH' && resourceId) {
        const body = JSON.parse(event.body || '{}');
        const updated = await prisma.user.update({
          where: { id: resourceId },
          data: {
            isActive: body.isActive !== undefined ? body.isActive : undefined,
          },
          select: { id: true, name: true, isActive: true },
        });
        return json(200, updated);
      }
    }

    // 2. Reply Templates
    if (resource === 'templates') {
      if (event.httpMethod === 'GET') {
        const templates = await prisma.replyTemplate.findMany({
          orderBy: { category: 'asc' },
        });
        return json(200, templates);
      }

      if (event.httpMethod === 'POST') {
        const body = JSON.parse(event.body || '{}');
        const template = await prisma.replyTemplate.create({
          data: {
            title: body.title,
            category: body.category || 'GENERAL',
            content: body.content,
            placeholders: body.placeholders ? JSON.stringify(body.placeholders) : null,
          },
        });
        return json(201, template);
      }

      if (event.httpMethod === 'DELETE' && resourceId) {
        await prisma.replyTemplate.delete({ where: { id: resourceId } });
        return json(200, { message: 'Template deleted' });
      }
    }

    // 3. Settings (Super Admin Only)
    if (resource === 'settings') {
      if (event.httpMethod === 'GET') {
        const settings = await prisma.setting.findMany();
        return json(200, settings);
      }

      if (event.httpMethod === 'PATCH') {
        if (!isSuperAdmin(authUser.role)) {
          return forbidden('Super admin access required for system settings');
        }
        const body = JSON.parse(event.body || '{}');
        const { key, value } = body;
        const updated = await prisma.setting.upsert({
          where: { key },
          update: {
            value: typeof value === 'string' ? value : JSON.stringify(value),
            updatedByUserId: authUser.id,
          },
          create: {
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            updatedByUserId: authUser.id,
          },
        });
        return json(200, updated);
      }
    }

    // 4. Audit Logs
    if (resource === 'audit-logs') {
      const logs = await prisma.auditLog.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true, role: true } } },
      });
      return json(200, logs);
    }

    return error(404, 'Admin resource not found', 'NOT_FOUND');
  } catch (err: any) {
    console.error('Admin function error:', err);
    return error(500, err?.message || 'Server error', 'SERVER_ERROR');
  }
};
