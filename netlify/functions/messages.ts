import type { Handler, HandlerEvent } from '@netlify/functions';
import { prisma } from '../lib/db';
import { json, error, unauthorized, forbidden, notFound, handleOptions } from '../lib/response';
import { getAuthUser } from '../lib/auth';
import { canAccessRequest, isStaffOrAdmin } from '../lib/rbac';
import { sendMessageSchema } from '../lib/validation';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  const authUser = await getAuthUser(event);
  if (!authUser) {
    return unauthorized('Authentication required');
  }

  const cleanPath = event.path
    .replace(/\/?\.netlify\/functions\/messages\/?/, '')
    .replace(/^\/api\/v1\/messages\/?/, '');
  const pathParts = cleanPath.split('/').filter(Boolean);

  try {
    // 1. GET /messages?requestId=... or GET /messages/request/:id
    if (event.httpMethod === 'GET') {
      const requestId = event.queryStringParameters?.requestId || pathParts[1] || pathParts[0];
      if (!requestId) {
        return error(400, 'requestId query parameter is required', 'MISSING_REQUEST_ID');
      }

      const req = await prisma.serviceRequest.findUnique({
        where: { id: requestId },
        select: { clientId: true, assignedStaffId: true },
      });
      if (!req) return notFound('Service request not found');

      if (!canAccessRequest(authUser, req.clientId, req.assignedStaffId)) {
        return forbidden('Access denied to this conversation thread');
      }

      const where: any = { serviceRequestId: requestId };

      // Hide internal notes from clients
      if (authUser.role === 'CLIENT') {
        where.type = { not: 'INTERNAL_NOTE' };
      }

      const messages = await prisma.message.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, name: true, role: true } },
          meeting: true,
          paymentRequest: {
            include: { proofs: { include: { receiptAttachment: true } } },
          },
          attachments: true,
        },
      });

      return json(200, messages);
    }

    // 2. POST /messages or POST /messages/request/:id
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const requestId = body.requestId || pathParts[1] || pathParts[0];

      if (!requestId) {
        return error(400, 'serviceRequestId is required', 'MISSING_REQUEST_ID');
      }

      const validated = sendMessageSchema.safeParse(body);
      if (!validated.success) {
        return error(400, 'Invalid message data', 'VALIDATION_ERROR', validated.error.flatten());
      }

      const { content, type, metadata } = validated.data;

      // Only staff/admin can post INTERNAL_NOTE, APPROVAL, MEETING, PAYMENT messages
      if (type !== 'GENERAL' && !isStaffOrAdmin(authUser.role)) {
        return forbidden('Clients can only post general messages');
      }

      const req = await prisma.serviceRequest.findUnique({
        where: { id: requestId },
        select: { clientId: true, assignedStaffId: true },
      });
      if (!req) return notFound('Service request not found');

      if (!canAccessRequest(authUser, req.clientId, req.assignedStaffId)) {
        return forbidden('Access denied to this request');
      }

      const message = await prisma.message.create({
        data: {
          serviceRequestId: requestId,
          senderId: authUser.id,
          type,
          content,
          metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
          isReadByClient: authUser.role === 'CLIENT',
          isReadByAdmin: isStaffOrAdmin(authUser.role),
        },
        include: {
          sender: { select: { id: true, name: true, role: true } },
          attachments: true,
        },
      });

      return json(201, message);
    }

    return error(404, 'Endpoint not found', 'NOT_FOUND');
  } catch (err: any) {
    console.error('Messages function error:', err);
    return error(500, err?.message || 'Server error', 'SERVER_ERROR');
  }
};
