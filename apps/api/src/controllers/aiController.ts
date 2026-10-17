import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { aiService } from '../services/ai';
import { logger } from '../utils/logger';

export class AiController {
  /**
   * AI Draft Reply in Client's Detected Language
   */
  public async draftReply(req: Request, res: Response): Promise<void> {
    const requestId = req.params.requestId as string;
    const { replyType = 'GENERAL', instructions } = req.body;

    const request = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        client: { select: { name: true, profile: true } },
      },
    });

    if (!request) {
      res.status(404).json({ success: false, error: { message: 'Request not found', code: 'NOT_FOUND' } });
      return;
    }

    const draft = await aiService.draftReply(
      {
        title: request.title,
        description: request.description,
        requestNumber: request.requestNumber,
        aiLanguage: request.aiLanguage || request.client.profile?.preferredLanguage,
        clientName: request.client.name,
      },
      replyType,
      instructions,
      requestId
    );

    res.json({
      success: true,
      data: {
        draft,
        detectedLanguage: request.aiLanguage || 'English',
        replyType,
      },
    });
  }

  /**
   * Summarize long request and conversation thread
   */
  public async summarize(req: Request, res: Response): Promise<void> {
    const requestId = req.params.requestId as string;

    const request = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        messages: {
          include: { sender: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!request) {
      res.status(404).json({ success: false, error: { message: 'Request not found', code: 'NOT_FOUND' } });
      return;
    }

    const messages = request.messages.map((m) => ({
      sender: m.sender.name,
      content: m.content,
    }));

    const summary = await aiService.summarizeRequest(
      request.title,
      request.description,
      messages,
      requestId
    );

    // Save summary back to request
    await prisma.serviceRequest.update({
      where: { id: requestId },
      data: { aiSummary: summary },
    });

    res.json({
      success: true,
      data: { summary },
    });
  }

  /**
   * Suggest Next Best Action
   */
  public async suggestNextAction(req: Request, res: Response): Promise<void> {
    const requestId = req.params.requestId as string;

    const request = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        paymentRequests: { include: { proofs: true } },
        meetings: true,
      },
    });

    if (!request) {
      res.status(404).json({ success: false, error: { message: 'Request not found', code: 'NOT_FOUND' } });
      return;
    }

    const hasPayment = request.paymentRequests.length > 0;
    const hasProof = request.paymentRequests.some((p) => p.proofs.length > 0);
    const hasMeeting = request.meetings.length > 0;

    const nextAction = await aiService.suggestNextAction(
      request.status,
      hasPayment,
      hasProof,
      hasMeeting,
      requestId
    );

    await prisma.serviceRequest.update({
      where: { id: requestId },
      data: { aiNextAction: nextAction },
    });

    res.json({
      success: true,
      data: { nextAction },
    });
  }

  /**
   * Generate Quotation Draft from Request
   */
  public async generateQuotation(req: Request, res: Response): Promise<void> {
    const requestId = req.params.requestId as string;

    const request = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        services: { include: { service: true } },
      },
    });

    if (!request) {
      res.status(404).json({ success: false, error: { message: 'Request not found', code: 'NOT_FOUND' } });
      return;
    }

    const serviceKeys = request.services.map((s) => s.service.key);
    const quotation = await aiService.generateQuotation(
      request.title,
      request.description,
      serviceKeys,
      requestId
    );

    res.json({
      success: true,
      data: quotation,
    });
  }
}

export const aiController = new AiController();
