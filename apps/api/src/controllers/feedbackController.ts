import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { recordAuditLog } from '../utils/audit';
import { RequestStatus, Role } from '@prisma/client';

export class FeedbackController {
  /**
   * Submit Feedback (Client)
   */
  public async submit(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const requestId = req.params.requestId as string;
    const { rating, comment, isPublic = true } = req.body;

    const request = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { feedback: true },
    });

    if (!request) {
      res.status(404).json({ success: false, error: { message: 'Request not found', code: 'NOT_FOUND' } });
      return;
    }

    if (request.clientId !== user.id) {
      res.status(403).json({ success: false, error: { message: 'Unauthorized', code: 'FORBIDDEN' } });
      return;
    }

    if (request.status !== RequestStatus.COMPLETED && request.status !== RequestStatus.CLOSED) {
      res.status(400).json({
        success: false,
        error: { message: 'Feedback can only be submitted for completed requests', code: 'REQUEST_NOT_COMPLETED' },
      });
      return;
    }

    if (request.feedback) {
      res.status(400).json({
        success: false,
        error: { message: 'Feedback has already been provided for this request', code: 'FEEDBACK_EXISTS' },
      });
      return;
    }

    const feedback = await prisma.feedback.create({
      data: {
        serviceRequestId: requestId,
        clientId: user.id,
        rating: parseInt(rating, 10),
        comment: comment || null,
        isPublic,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: 'SUBMIT_FEEDBACK',
      resourceType: 'Feedback',
      resourceId: feedback.id,
      details: { rating, comment },
      req,
    });

    res.status(201).json({
      success: true,
      data: feedback,
      message: 'Thank you for your feedback!',
    });
  }

  /**
   * List Feedback (Admin & Public)
   */
  public async list(req: Request, res: Response): Promise<void> {
    const { serviceKey, rating } = req.query as Record<string, string>;

    const where: any = {};
    if (rating) {
      where.rating = parseInt(rating, 10);
    }
    if (serviceKey) {
      where.serviceRequest = {
        services: {
          some: { service: { key: serviceKey } },
        },
      };
    }

    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { name: true } },
        serviceRequest: {
          select: {
            requestNumber: true,
            title: true,
            services: { include: { service: true } },
          },
        },
      },
    });

    // Compute average rating
    const totalRating = feedbacks.reduce((acc, f) => acc + f.rating, 0);
    const averageRating = feedbacks.length > 0 ? (totalRating / feedbacks.length).toFixed(1) : '5.0';

    res.json({
      success: true,
      data: feedbacks,
      meta: {
        count: feedbacks.length,
        averageRating: parseFloat(averageRating),
      },
    });
  }
}

export const feedbackController = new FeedbackController();
