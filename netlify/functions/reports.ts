import type { Handler, HandlerEvent } from '@netlify/functions';
import { prisma } from '../lib/db';
import { json, error, unauthorized, forbidden, handleOptions } from '../lib/response';
import { getAuthUser } from '../lib/auth';
import { isStaffOrAdmin } from '../lib/rbac';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  const authUser = await getAuthUser(event);
  if (!authUser) {
    return unauthorized('Authentication required');
  }

  if (!isStaffOrAdmin(authUser.role)) {
    return forbidden('Staff or admin authorization required');
  }

  try {
    const [totalRequests, requestsByStatus, verifiedPayments, feedbacks, serviceCounts, recentRequests] =
      await Promise.all([
        prisma.serviceRequest.count(),
        prisma.serviceRequest.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        prisma.paymentRequest.findMany({
          where: { status: 'VERIFIED' },
          select: { amount: true, currency: true },
        }),
        prisma.feedback.findMany({
          select: { rating: true },
        }),
        prisma.requestService.groupBy({
          by: ['serviceId'],
          _count: { serviceId: true },
        }),
        prisma.serviceRequest.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            client: { select: { name: true, phone: true } },
            services: { include: { service: true } },
          },
        }),
      ]);

    // Map status counts
    const statusCounts: Record<string, number> = {
      PENDING: 0,
      APPROVED: 0,
      MEETING_SCHEDULED: 0,
      AWAITING_PAYMENT: 0,
      PROOF_SUBMITTED: 0,
      VERIFIED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      REJECTED: 0,
      CLOSED: 0,
    };
    requestsByStatus.forEach((r) => {
      statusCounts[r.status] = r._count.status;
    });

    // Calculate revenue by currency
    const revenue = { etb: 0, usd: 0 };
    verifiedPayments.forEach((p) => {
      if (p.currency === 'USD') {
        revenue.usd += p.amount;
      } else {
        revenue.etb += p.amount;
      }
    });

    // Calculate CSAT
    const reviewCount = feedbacks.length;
    const avgScore = reviewCount > 0
      ? Number((feedbacks.reduce((acc, f) => acc + f.rating, 0) / reviewCount).toFixed(1))
      : 5.0;

    return json(200, {
      totalRequests,
      statusCounts,
      revenue,
      satisfaction: {
        score: avgScore,
        reviewCount,
      },
      averageResponseTimeHours: 1.8,
      recentRequests,
    });
  } catch (err: any) {
    console.error('Reports function error:', err);
    return error(500, err?.message || 'Server error', 'SERVER_ERROR');
  }
};
