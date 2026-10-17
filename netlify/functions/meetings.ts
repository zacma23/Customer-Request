import type { Handler, HandlerEvent } from '@netlify/functions';
import { prisma } from '../lib/db';
import { json, error, unauthorized, forbidden, notFound, handleOptions } from '../lib/response';
import { getAuthUser } from '../lib/auth';
import { isStaffOrAdmin, canAccessRequest } from '../lib/rbac';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  const authUser = await getAuthUser(event);
  if (!authUser) {
    return unauthorized('Authentication required');
  }

  const cleanPath = event.path
    .replace(/\/?\.netlify\/functions\/meetings\/?/, '')
    .replace(/^\/api\/v1\/meetings\/?/, '');
  const pathParts = cleanPath.split('/').filter(Boolean);

  try {
    // 1. POST /meetings (Schedule meeting - Admin/Staff)
    if (event.httpMethod === 'POST' && pathParts.length === 0) {
      if (!isStaffOrAdmin(authUser.role)) {
        return forbidden('Only staff or admins can schedule consultations');
      }

      const body = JSON.parse(event.body || '{}');
      const { serviceRequestId, scheduledAt, durationMinutes, meetingType, locationOrUrl, notes } = body;

      if (!serviceRequestId || !scheduledAt || !locationOrUrl) {
        return error(400, 'serviceRequestId, scheduledAt, and locationOrUrl are required', 'MISSING_FIELDS');
      }

      const req = await prisma.serviceRequest.findUnique({ where: { id: serviceRequestId } });
      if (!req) return notFound('Service request not found');

      // Create message in thread as MEETING type
      const message = await prisma.message.create({
        data: {
          serviceRequestId,
          senderId: authUser.id,
          type: 'MEETING',
          content: notes || `Consultation meeting scheduled for ${new Date(scheduledAt).toLocaleString()}`,
          isReadByClient: false,
          isReadByAdmin: true,
        },
      });

      const meeting = await prisma.meeting.create({
        data: {
          serviceRequestId,
          messageId: message.id,
          scheduledAt: new Date(scheduledAt),
          durationMinutes: durationMinutes || 30,
          meetingType: meetingType || 'ONLINE',
          locationOrUrl,
          status: 'SCHEDULED',
        },
      });

      // Update request status to MEETING_SCHEDULED if currently PENDING or APPROVED
      if (req.status === 'PENDING' || req.status === 'APPROVED') {
        await prisma.serviceRequest.update({
          where: { id: serviceRequestId },
          data: { status: 'MEETING_SCHEDULED' },
        });
      }

      return json(201, meeting);
    }

    // 2. POST /meetings/:id/respond (Accept or Reschedule)
    if (event.httpMethod === 'POST' && pathParts[1] === 'respond') {
      const meetingId = pathParts[0];
      const body = JSON.parse(event.body || '{}');
      const { action, reason } = body; // action: ACCEPT or RESCHEDULE

      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { serviceRequest: true },
      });
      if (!meeting) return notFound('Meeting not found');

      if (!canAccessRequest(authUser, meeting.serviceRequest.clientId, meeting.serviceRequest.assignedStaffId)) {
        return forbidden('Access denied');
      }

      let newStatus: 'ACCEPTED' | 'RESCHEDULE_REQUESTED' = action === 'ACCEPT' ? 'ACCEPTED' : 'RESCHEDULE_REQUESTED';

      const updated = await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: newStatus,
          clientRescheduleReason: action === 'RESCHEDULE' ? reason || 'Client requested new time' : null,
        },
      });

      // Post status update message in thread
      await prisma.message.create({
        data: {
          serviceRequestId: meeting.serviceRequestId,
          senderId: authUser.id,
          type: 'GENERAL',
          content: action === 'ACCEPT'
            ? `Client accepted the scheduled consultation meeting.`
            : `Client requested to reschedule: ${reason || 'Preferred new time'}`,
          isReadByClient: authUser.role === 'CLIENT',
          isReadByAdmin: isStaffOrAdmin(authUser.role),
        },
      });

      return json(200, updated);
    }

    return error(404, 'Meeting endpoint not found', 'NOT_FOUND');
  } catch (err: any) {
    console.error('Meetings function error:', err);
    return error(500, err?.message || 'Server error', 'SERVER_ERROR');
  }
};
