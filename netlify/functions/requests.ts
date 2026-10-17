import type { Handler, HandlerEvent } from '@netlify/functions';
import { prisma } from '../lib/db';
import { json, error, unauthorized, forbidden, notFound, handleOptions } from '../lib/response';
import { getAuthUser } from '../lib/auth';
import { canAccessRequest, isStaffOrAdmin } from '../lib/rbac';
import { createServiceRequestSchema } from '../lib/validation';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  const authUser = await getAuthUser(event);
  if (!authUser) {
    return unauthorized('Authentication required');
  }

  // Extract ID from path: /api/v1/requests or /api/v1/requests/:id
  const cleanPath = event.path
    .replace(/\/?\.netlify\/functions\/requests\/?/, '')
    .replace(/^\/api\/v1\/requests\/?/, '');
  const pathParts = cleanPath.split('/').filter(Boolean);
  const requestId = pathParts[0] || null;

  try {
    // 1. GET /requests (List)
    if (event.httpMethod === 'GET' && !requestId) {
      const params = event.queryStringParameters || {};
      const status = params.status;
      const search = params.search;
      const page = Math.max(1, parseInt(params.page || '1', 10));
      const limit = Math.min(50, Math.max(1, parseInt(params.limit || '10', 10)));
      const skip = (page - 1) * limit;

      const where: any = {};

      // Role filtering: CLIENT sees only their own requests
      if (authUser.role === 'CLIENT') {
        where.clientId = authUser.id;
      }

      if (status && status !== 'ALL') {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { requestNumber: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [requests, total] = await Promise.all([
        prisma.serviceRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            services: { include: { service: true } },
            client: { select: { id: true, name: true, phone: true, email: true, role: true } },
            assignedStaff: { select: { id: true, name: true, email: true } },
            _count: { select: { messages: true, attachments: true } },
          },
        }),
        prisma.serviceRequest.count({ where }),
      ]);

      return json(200, requests, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

    // 2. POST /requests (Create)
    if (event.httpMethod === 'POST' && !requestId) {
      const body = JSON.parse(event.body || '{}');
      const validated = createServiceRequestSchema.safeParse(body);
      if (!validated.success) {
        return error(400, 'Invalid request data', 'VALIDATION_ERROR', validated.error.flatten());
      }

      const { title, description, serviceKeys, budgetRange, preferredContactTime } = validated.data;

      // Find services by key
      const services = await prisma.service.findMany({
        where: { key: { in: serviceKeys } },
      });

      if (services.length === 0) {
        return error(400, 'At least one valid service key is required', 'INVALID_SERVICES');
      }

      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const requestNumber = `REQ-2026-${randomNum}`;

      const newRequest = await prisma.serviceRequest.create({
        data: {
          requestNumber,
          clientId: authUser.id,
          title,
          description,
          budgetRange: budgetRange || null,
          preferredContactTime: preferredContactTime || null,
          status: 'PENDING',
          priority: 'NORMAL',
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

      return json(201, newRequest);
    }

    // 3. GET /requests/:id (Detail)
    if (event.httpMethod === 'GET' && requestId) {
      const req = await prisma.serviceRequest.findUnique({
        where: { id: requestId },
        include: {
          services: { include: { service: true } },
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              role: true,
              profile: true,
            },
          },
          assignedStaff: { select: { id: true, name: true, email: true } },
          attachments: { include: { uploadedBy: { select: { id: true, name: true } } } },
          meetings: { orderBy: { scheduledAt: 'desc' } },
          paymentRequests: {
            include: {
              proofs: { include: { receiptAttachment: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          feedback: true,
        },
      });

      if (!req) return notFound('Service request not found');

      if (!canAccessRequest(authUser, req.clientId, req.assignedStaffId)) {
        return forbidden('You do not have access to this request');
      }

      return json(200, req);
    }

    // 4. PATCH /requests/:id (Update)
    if ((event.httpMethod === 'PATCH' || event.httpMethod === 'PUT') && requestId) {
      const existing = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
      if (!existing) return notFound('Service request not found');

      if (!canAccessRequest(authUser, existing.clientId, existing.assignedStaffId)) {
        return forbidden('Access denied');
      }

      const body = JSON.parse(event.body || '{}');
      const updateData: any = {};

      if (body.title && authUser.id === existing.clientId) updateData.title = body.title;
      if (body.description && authUser.id === existing.clientId) updateData.description = body.description;

      // Staff / Admin status or priority or assignment update
      if (isStaffOrAdmin(authUser.role)) {
        if (body.status) updateData.status = body.status;
        if (body.priority) updateData.priority = body.priority;
        if (body.assignedStaffId !== undefined) updateData.assignedStaffId = body.assignedStaffId;
      }

      const updated = await prisma.serviceRequest.update({
        where: { id: requestId },
        data: updateData,
        include: {
          services: { include: { service: true } },
          client: { select: { id: true, name: true, phone: true } },
        },
      });

      return json(200, updated);
    }

    // 5. DELETE /requests/:id (Delete)
    if (event.httpMethod === 'DELETE' && requestId) {
      const existing = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
      if (!existing) return notFound('Service request not found');

      const isOwner = authUser.id === existing.clientId;
      const isAdmin = authUser.role === 'ADMIN' || authUser.role === 'SUPER_ADMIN';

      if (!isOwner && !isAdmin) {
        return forbidden('You can only delete your own service requests');
      }

      await prisma.serviceRequest.delete({ where: { id: requestId } });
      return json(200, { message: 'Service request deleted successfully' });
    }

    return error(404, 'Endpoint not found', 'NOT_FOUND');
  } catch (err: any) {
    console.error('Requests function error:', err);
    return error(500, err?.message || 'Server error', 'SERVER_ERROR');
  }
};
