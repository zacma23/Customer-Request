import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sseManager } from '../realtime/sse';
import { telegramService } from '../services/telegram';
import { whatsappService } from '../services/whatsapp';
import { recordAuditLog } from '../utils/audit';
import { MessageType, PaymentStatus, RequestStatus, Role } from '@prisma/client';

export class MessageController {
  /**
   * List conversation thread for a request
   * IDOR protected & Internal notes hidden from CLIENT role
   */
  public async listByRequest(req: Request, res: Response): Promise<void> {
    const requestId = req.params.requestId as string;
    const user = req.user!;

    const where: any = { serviceRequestId: requestId };

    // If client, hide internal notes
    if (user.role === Role.CLIENT) {
      where.type = { not: MessageType.INTERNAL_NOTE };
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        attachments: true,
        meeting: true,
        paymentRequest: {
          include: {
            proofs: { include: { receiptAttachment: true } },
          },
        },
      },
    });

    // Mark as read
    if (user.role === Role.CLIENT) {
      await prisma.message.updateMany({
        where: { serviceRequestId: requestId, isReadByClient: false },
        data: { isReadByClient: true },
      });
    } else {
      await prisma.message.updateMany({
        where: { serviceRequestId: requestId, isReadByAdmin: false },
        data: { isReadByAdmin: true },
      });
    }

    res.json({
      success: true,
      data: messages,
    });
  }

  /**
   * Send message in request thread
   * Handles GENERAL, APPROVAL, MEETING, PAYMENT, and INTERNAL_NOTE
   */
  public async send(req: Request, res: Response): Promise<void> {
    const requestId = req.params.requestId as string;
    const user = req.user!;
    const { content, type = 'GENERAL', metadata } = req.body;

    // Clients cannot send internal notes, approval, or payment messages
    if (user.role === Role.CLIENT && type !== 'GENERAL') {
      res.status(403).json({
        success: false,
        error: { message: 'Clients can only send general messages', code: 'FORBIDDEN' },
      });
      return;
    }

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { client: true },
    });

    if (!serviceRequest) {
      res.status(404).json({ success: false, error: { message: 'Service request not found', code: 'NOT_FOUND' } });
      return;
    }

    // Create Message and optional related entities
    const createdMessage = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          serviceRequestId: requestId,
          senderId: user.id,
          type: type as MessageType,
          content,
          metadata: metadata ? JSON.stringify(metadata) : null,
          isReadByClient: user.role === Role.CLIENT,
          isReadByAdmin: user.role !== Role.CLIENT,
        },
        include: {
          sender: { select: { id: true, name: true, role: true } },
        },
      });

      // If MEETING type, create Meeting record
      if (type === MessageType.MEETING && metadata?.scheduledAt) {
        await tx.meeting.create({
          data: {
            serviceRequestId: requestId,
            messageId: msg.id,
            scheduledAt: new Date(metadata.scheduledAt),
            durationMinutes: metadata.durationMinutes || 30,
            meetingType: metadata.meetingType || 'ONLINE',
            locationOrUrl: metadata.locationOrUrl || 'Google Meet',
          },
        });

        await tx.serviceRequest.update({
          where: { id: requestId },
          data: { status: RequestStatus.MEETING_SCHEDULED },
        });
      }

      // If PAYMENT type, create PaymentRequest record
      if (type === MessageType.PAYMENT && metadata?.amount) {
        await tx.paymentRequest.create({
          data: {
            serviceRequestId: requestId,
            messageId: msg.id,
            amount: parseFloat(metadata.amount),
            currency: metadata.currency || 'ETB',
            description: metadata.description || content,
            paymentLink: metadata.paymentLink || null,
            bankDetails: metadata.bankDetails ? JSON.stringify(metadata.bankDetails) : null,
            dueDate: metadata.dueDate ? new Date(metadata.dueDate) : null,
            status: PaymentStatus.AWAITING_PAYMENT,
          },
        });

        await tx.serviceRequest.update({
          where: { id: requestId },
          data: { status: RequestStatus.AWAITING_PAYMENT },
        });
      }

      // If APPROVAL type
      if (type === MessageType.APPROVAL) {
        const approved = metadata?.approved !== false;
        await tx.serviceRequest.update({
          where: { id: requestId },
          data: { status: approved ? RequestStatus.APPROVED : RequestStatus.REJECTED },
        });
      }

      return msg;
    });

    // Fetch complete populated message with relations
    const fullMessage = await prisma.message.findUnique({
      where: { id: createdMessage.id },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        attachments: true,
        meeting: true,
        paymentRequest: true,
      },
    });

    // Real-time dispatch via SSE
    if (type !== MessageType.INTERNAL_NOTE) {
      // Send to client
      sseManager.sendToUser(serviceRequest.clientId, 'new_message', {
        requestId,
        requestNumber: serviceRequest.requestNumber,
        message: fullMessage,
      });

      // Push to Telegram / WhatsApp
      const outboundText = `📩 <b>Message from Zacma Tech (${serviceRequest.requestNumber})</b>\n\n${content}`;
      await telegramService.sendNotificationToUser(serviceRequest.clientId, outboundText);
      await whatsappService.sendNotificationToUser(serviceRequest.clientId, `Message from Zacma Tech (${serviceRequest.requestNumber}):\n${content}`);
    }

    // Always dispatch to staff and admin room
    sseManager.sendToRoom('staff_admin', 'new_message', {
      requestId,
      requestNumber: serviceRequest.requestNumber,
      message: fullMessage,
    });

    res.status(201).json({
      success: true,
      data: fullMessage,
    });
  }
}

export const messageController = new MessageController();
