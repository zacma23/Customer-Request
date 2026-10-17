import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sseManager } from '../realtime/sse';
import { telegramService } from '../services/telegram';
import { whatsappService } from '../services/whatsapp';
import { recordAuditLog } from '../utils/audit';
import { MessageType, PaymentStatus, RequestStatus, Role } from '@prisma/client';

export class PaymentController {
  /**
   * List Payments (Admin Verification Queue)
   */
  public async listAll(req: Request, res: Response): Promise<void> {
    const { status, currency } = req.query as Record<string, string>;
    const user = req.user!;

    const where: any = {};
    if (user.role === Role.CLIENT) {
      where.serviceRequest = { clientId: user.id };
    }
    if (status) {
      where.status = status as PaymentStatus;
    }
    if (currency) {
      where.currency = currency;
    }

    const payments = await prisma.paymentRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        serviceRequest: {
          select: {
            id: true,
            requestNumber: true,
            title: true,
            status: true,
            client: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        proofs: {
          include: {
            receiptAttachment: true,
          },
        },
        verifiedBy: { select: { id: true, name: true } },
      },
    });

    res.json({
      success: true,
      data: payments,
    });
  }

  /**
   * Submit Payment Proof (Client)
   */
  public async submitProof(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const {
      paymentRequestId,
      referenceNumber,
      amountPaid,
      paymentMethod,
      paymentDate,
      notes,
      receiptAttachmentId,
    } = req.body;

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: paymentRequestId },
      include: { serviceRequest: { include: { client: true } } },
    });

    if (!paymentRequest) {
      res.status(404).json({ success: false, error: { message: 'Payment request not found', code: 'NOT_FOUND' } });
      return;
    }

    // IDOR check: client owns this request
    if (paymentRequest.serviceRequest.clientId !== user.id) {
      res.status(403).json({ success: false, error: { message: 'Unauthorized', code: 'FORBIDDEN' } });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const proof = await tx.paymentProof.create({
        data: {
          paymentRequestId,
          receiptAttachmentId: receiptAttachmentId || null,
          referenceNumber: referenceNumber || null,
          amountPaid: parseFloat(amountPaid),
          paymentMethod,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes: notes || null,
        },
      });

      // Update payment request status
      const updatedPayment = await tx.paymentRequest.update({
        where: { id: paymentRequestId },
        data: { status: PaymentStatus.PROOF_SUBMITTED },
      });

      // Update service request status
      await tx.serviceRequest.update({
        where: { id: paymentRequest.serviceRequestId },
        data: { status: RequestStatus.PROOF_SUBMITTED },
      });

      // System message in chat
      await tx.message.create({
        data: {
          serviceRequestId: paymentRequest.serviceRequestId,
          senderId: user.id,
          type: MessageType.GENERAL,
          content: `Payment receipt submitted (${amountPaid} ${paymentRequest.currency} via ${paymentMethod}). Ref: ${referenceNumber || 'N/A'}. Awaiting admin verification.`,
        },
      });

      return { proof, updatedPayment };
    });

    // Notify admin
    sseManager.notifyStaffAndAdmin('payment_proof_submitted', {
      requestId: paymentRequest.serviceRequestId,
      requestNumber: paymentRequest.serviceRequest.requestNumber,
      paymentRequestId,
      amount: amountPaid,
      currency: paymentRequest.currency,
      clientName: user.name,
      referenceNumber,
    });

    await recordAuditLog({
      userId: user.id,
      action: 'SUBMIT_PAYMENT_PROOF',
      resourceType: 'PaymentProof',
      resourceId: result.proof.id,
      details: { paymentRequestId, amountPaid, paymentMethod, referenceNumber },
      req,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Payment proof submitted successfully. Verification pending.',
    });
  }

  /**
   * Verify or Reject Payment Proof (Admin)
   */
  public async verifyProof(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string; // paymentRequestId
    const { verified, rejectionReason } = req.body;
    const admin = req.user!;

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        serviceRequest: { include: { client: true } },
      },
    });

    if (!paymentRequest) {
      res.status(404).json({ success: false, error: { message: 'Payment request not found', code: 'NOT_FOUND' } });
      return;
    }

    const clientId = paymentRequest.serviceRequest.clientId;
    const requestNumber = paymentRequest.serviceRequest.requestNumber;
    const nextPaymentStatus = verified ? PaymentStatus.VERIFIED : PaymentStatus.REJECTED;
    const nextRequestStatus = verified ? RequestStatus.IN_PROGRESS : RequestStatus.AWAITING_PAYMENT;

    await prisma.$transaction(async (tx) => {
      await tx.paymentRequest.update({
        where: { id },
        data: {
          status: nextPaymentStatus,
          verifiedByUserId: admin.id,
          rejectionReason: verified ? null : rejectionReason || 'Payment details could not be validated',
        },
      });

      await tx.serviceRequest.update({
        where: { id: paymentRequest.serviceRequestId },
        data: { status: nextRequestStatus },
      });

      // Thread message
      const announcement = verified
        ? `Payment of ${paymentRequest.amount} ${paymentRequest.currency} has been verified by finance! Project status changed to IN PROGRESS.`
        : `Payment proof was rejected: "${rejectionReason || 'Receipt details do not match'}". Please resubmit valid payment proof.`;

      await tx.message.create({
        data: {
          serviceRequestId: paymentRequest.serviceRequestId,
          senderId: admin.id,
          type: MessageType.PAYMENT,
          content: announcement,
        },
      });
    });

    // Notify client via SSE
    sseManager.sendToUser(clientId, 'payment_verified', {
      paymentRequestId: id,
      requestId: paymentRequest.serviceRequestId,
      requestNumber,
      verified,
      rejectionReason,
    });

    // Outbound push to Telegram / WhatsApp
    const notifyText = verified
      ? `✅ <b>Payment Confirmed!</b>\nYour payment for request <b>${requestNumber}</b> was verified. Development is now IN PROGRESS.`
      : `⚠️ <b>Payment Proof Issue:</b>\nYour proof for request <b>${requestNumber}</b> was rejected: ${rejectionReason}. Please check your portal.`;

    await telegramService.sendNotificationToUser(clientId, notifyText);
    await whatsappService.sendNotificationToUser(clientId, verified ? `Payment verified for ${requestNumber}! Sprint in progress.` : `Payment rejected for ${requestNumber}: ${rejectionReason}`);

    await recordAuditLog({
      userId: admin.id,
      action: verified ? 'VERIFY_PAYMENT' : 'REJECT_PAYMENT',
      resourceType: 'PaymentRequest',
      resourceId: id,
      details: { verified, rejectionReason },
      req,
    });

    res.json({
      success: true,
      message: verified ? 'Payment verified and project set to IN PROGRESS' : 'Payment proof rejected with reason recorded',
    });
  }
}

export const paymentController = new PaymentController();
