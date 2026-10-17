import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sseManager } from '../realtime/sse';
import { recordAuditLog } from '../utils/audit';
import { MeetingStatus, MessageType } from '@prisma/client';

export class MeetingController {
  /**
   * Client responds to meeting: Accept or Request Reschedule
   */
  public async respond(req: Request, res: Response): Promise<void> {
    const meetingId = req.params.meetingId as string;
    const { action, reason } = req.body; // action: 'ACCEPT' | 'RESCHEDULE'
    const user = req.user!;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        serviceRequest: { include: { client: true } },
      },
    });

    if (!meeting) {
      res.status(404).json({ success: false, error: { message: 'Meeting not found', code: 'NOT_FOUND' } });
      return;
    }

    // IDOR check: client can only respond to their own meeting
    if (meeting.serviceRequest.clientId !== user.id) {
      res.status(403).json({ success: false, error: { message: 'Forbidden', code: 'FORBIDDEN' } });
      return;
    }

    const newStatus = action === 'ACCEPT' ? MeetingStatus.ACCEPTED : MeetingStatus.RESCHEDULE_REQUESTED;

    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: newStatus,
        clientRescheduleReason: reason || null,
      },
    });

    // Create system message in conversation thread
    const msgContent =
      action === 'ACCEPT'
        ? `Client ${user.name} accepted the scheduled meeting.`
        : `Client requested to reschedule the meeting. Reason: "${reason}"`;

    await prisma.message.create({
      data: {
        serviceRequestId: meeting.serviceRequestId,
        senderId: user.id,
        type: MessageType.GENERAL,
        content: msgContent,
      },
    });

    // Notify staff and admin
    sseManager.notifyStaffAndAdmin('meeting_status_changed', {
      meetingId,
      requestId: meeting.serviceRequestId,
      requestNumber: meeting.serviceRequest.requestNumber,
      clientName: user.name,
      status: newStatus,
      reason,
    });

    await recordAuditLog({
      userId: user.id,
      action: `MEETING_${action}`,
      resourceType: 'Meeting',
      resourceId: meetingId,
      details: { action, reason },
      req,
    });

    res.json({
      success: true,
      data: updatedMeeting,
      message: action === 'ACCEPT' ? 'Meeting confirmed successfully' : 'Reschedule request submitted to admin',
    });
  }
}

export const meetingController = new MeetingController();
