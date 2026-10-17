import type { Handler, HandlerEvent } from '@netlify/functions';
import { prisma } from '../lib/db';
import { json, error, unauthorized, forbidden, notFound, handleOptions } from '../lib/response';
import { getAuthUser } from '../lib/auth';
import { isStaffOrAdmin, canAccessRequest } from '../lib/rbac';
import { submitPaymentProofSchema } from '../lib/validation';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  const authUser = await getAuthUser(event);
  if (!authUser) {
    return unauthorized('Authentication required');
  }

  const cleanPath = event.path
    .replace(/\/?\.netlify\/functions\/payments\/?/, '')
    .replace(/^\/api\/v1\/payments\/?/, '');
  const pathParts = cleanPath.split('/').filter(Boolean);
  const action = pathParts[0] || '';

  try {
    // 1. GET /payments (List invoices)
    if (event.httpMethod === 'GET') {
      const where: any = {};
      if (authUser.role === 'CLIENT') {
        where.serviceRequest = { clientId: authUser.id };
      }

      const payments = await prisma.paymentRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          serviceRequest: {
            select: { id: true, requestNumber: true, title: true, clientId: true },
          },
          proofs: {
            include: { receiptAttachment: true },
          },
        },
      });

      return json(200, payments);
    }

    // 2. POST /payments/request (Admin creates invoice / payment request)
    if (event.httpMethod === 'POST' && action === 'request') {
      if (!isStaffOrAdmin(authUser.role)) {
        return forbidden('Only staff or admins can generate payment invoices');
      }

      const body = JSON.parse(event.body || '{}');
      const { serviceRequestId, amount, currency, description, paymentLink, bankDetails, dueDate } = body;

      if (!serviceRequestId || !amount || !description) {
        return error(400, 'serviceRequestId, amount, and description are required', 'MISSING_FIELDS');
      }

      const req = await prisma.serviceRequest.findUnique({ where: { id: serviceRequestId } });
      if (!req) return notFound('Service request not found');

      // Create message in thread as PAYMENT type
      const message = await prisma.message.create({
        data: {
          serviceRequestId,
          senderId: authUser.id,
          type: 'PAYMENT',
          content: `Payment Invoice: ${amount} ${currency || 'ETB'} - ${description}`,
          isReadByClient: false,
          isReadByAdmin: true,
        },
      });

      const paymentRequest = await prisma.paymentRequest.create({
        data: {
          serviceRequestId,
          messageId: message.id,
          amount: parseFloat(amount),
          currency: currency || 'ETB',
          description,
          paymentLink: paymentLink || null,
          bankDetails: bankDetails ? (typeof bankDetails === 'string' ? bankDetails : JSON.stringify(bankDetails)) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: 'AWAITING_PAYMENT',
        },
      });

      await prisma.serviceRequest.update({
        where: { id: serviceRequestId },
        data: { status: 'AWAITING_PAYMENT' },
      });

      return json(201, paymentRequest);
    }

    // 3. POST /payments/proof (Client submits proof of payment)
    if (event.httpMethod === 'POST' && action === 'proof') {
      const body = JSON.parse(event.body || '{}');
      const validated = submitPaymentProofSchema.safeParse(body);
      if (!validated.success) {
        return error(400, 'Invalid proof submission', 'VALIDATION_ERROR', validated.error.flatten());
      }

      const { paymentRequestId, referenceNumber, amountPaid, paymentMethod, notes, receiptAttachmentId } = validated.data;

      const pReq = await prisma.paymentRequest.findUnique({
        where: { id: paymentRequestId },
        include: { serviceRequest: true },
      });
      if (!pReq) return notFound('Payment request not found');

      if (!canAccessRequest(authUser, pReq.serviceRequest.clientId, pReq.serviceRequest.assignedStaffId)) {
        return forbidden('Access denied');
      }

      const proof = await prisma.paymentProof.create({
        data: {
          paymentRequestId,
          referenceNumber: referenceNumber || null,
          amountPaid,
          paymentMethod,
          notes: notes || null,
          receiptAttachmentId: receiptAttachmentId || null,
        },
      });

      // Update payment request status to PROOF_SUBMITTED
      await prisma.paymentRequest.update({
        where: { id: paymentRequestId },
        data: { status: 'PROOF_SUBMITTED' },
      });

      // Update service request status to PROOF_SUBMITTED
      await prisma.serviceRequest.update({
        where: { id: pReq.serviceRequestId },
        data: { status: 'PROOF_SUBMITTED' },
      });

      // Add message in thread
      await prisma.message.create({
        data: {
          serviceRequestId: pReq.serviceRequestId,
          senderId: authUser.id,
          type: 'PAYMENT',
          content: `Payment proof submitted via ${paymentMethod}. Reference: ${referenceNumber || 'N/A'}. Amount: ${amountPaid} ${pReq.currency}.`,
          isReadByClient: authUser.role === 'CLIENT',
          isReadByAdmin: isStaffOrAdmin(authUser.role),
        },
      });

      return json(201, proof);
    }

    // 4. POST /payments/verify (Admin verifies or rejects payment proof)
    if (event.httpMethod === 'POST' && action === 'verify') {
      if (!isStaffOrAdmin(authUser.role)) {
        return forbidden('Only staff or admins can verify payments');
      }

      const body = JSON.parse(event.body || '{}');
      const { paymentRequestId, verified, rejectionReason } = body;

      if (!paymentRequestId) return error(400, 'paymentRequestId is required', 'MISSING_PAYMENT_ID');

      const pReq = await prisma.paymentRequest.findUnique({
        where: { id: paymentRequestId },
        include: { serviceRequest: true },
      });
      if (!pReq) return notFound('Payment request not found');

      const newStatus = verified ? 'VERIFIED' : 'REJECTED';

      const updated = await prisma.paymentRequest.update({
        where: { id: paymentRequestId },
        data: {
          status: newStatus,
          verifiedByUserId: verified ? authUser.id : null,
          rejectionReason: !verified ? rejectionReason || 'Payment proof could not be verified' : null,
        },
      });

      // When verified, transition request into IN_PROGRESS
      if (verified) {
        await prisma.serviceRequest.update({
          where: { id: pReq.serviceRequestId },
          data: { status: 'IN_PROGRESS' },
        });

        await prisma.message.create({
          data: {
            serviceRequestId: pReq.serviceRequestId,
            senderId: authUser.id,
            type: 'APPROVAL',
            content: `Payment of ${pReq.amount} ${pReq.currency} has been verified! Development and implementation is now active.`,
            isReadByClient: false,
            isReadByAdmin: true,
          },
        });
      } else {
        await prisma.serviceRequest.update({
          where: { id: pReq.serviceRequestId },
          data: { status: 'AWAITING_PAYMENT' },
        });

        await prisma.message.create({
          data: {
            serviceRequestId: pReq.serviceRequestId,
            senderId: authUser.id,
            type: 'PAYMENT',
            content: `Payment verification issue: ${rejectionReason || 'Receipt reference not matching records. Please re-submit.'}`,
            isReadByClient: false,
            isReadByAdmin: true,
          },
        });
      }

      return json(200, updated);
    }

    return error(404, 'Payment endpoint not found', 'NOT_FOUND');
  } catch (err: any) {
    console.error('Payments function error:', err);
    return error(500, err?.message || 'Server error', 'SERVER_ERROR');
  }
};
