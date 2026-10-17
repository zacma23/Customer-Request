import crypto from 'crypto';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { aiService } from './ai';
import { ChannelType, PaymentStatus, RequestStatus } from '@prisma/client';
import { sseManager } from '../realtime/sse';
import { normalizePhoneNumber } from '../utils/phone';

export class WhatsAppService {
  private apiToken: string;
  private phoneId: string;
  private verifyToken: string;
  private appSecret: string;

  constructor() {
    this.apiToken = config.whatsapp.apiToken;
    this.phoneId = config.whatsapp.phoneNumberId;
    this.verifyToken = config.whatsapp.verifyToken;
    this.appSecret = config.whatsapp.appSecret;
  }

  public verifyChallenge(mode: string, token: string): boolean {
    return mode === 'subscribe' && token === this.verifyToken;
  }

  public verifySignature(payload: string, signatureHeader?: string): boolean {
    if (!this.appSecret || !signatureHeader) return true;
    try {
      const signature = signatureHeader.replace('sha256=', '');
      const expected = crypto
        .createHmac('sha256', this.appSecret)
        .update(payload)
        .digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  public async sendMessage(toPhone: string, text: string): Promise<boolean> {
    if (!this.apiToken || !this.phoneId) {
      logger.info({ toPhone, text }, 'WhatsApp dispatch (Mock/Dev credentials)');
      return true;
    }

    try {
      const cleaned = toPhone.replace(/\D/g, '');
      const url = `https://graph.facebook.com/v18.0/${this.phoneId}/messages`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleaned,
          type: 'text',
          text: { body: text },
        }),
      });

      return res.ok;
    } catch (err: any) {
      logger.error({ err: err.message, toPhone }, 'WhatsApp message dispatch error');
      return false;
    }
  }

  public async sendNotificationToUser(userId: string, message: string): Promise<boolean> {
    const link = await prisma.channelLink.findFirst({
      where: {
        userId,
        channelType: ChannelType.WHATSAPP,
        isVerified: true,
      },
    });

    if (!link || !link.channelUserId) {
      return false;
    }

    return this.sendMessage(link.channelUserId, message);
  }

  public async handleWebhook(body: any): Promise<void> {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) return;

    const fromRaw = message.from; // Phone number without +
    const fromPhone = normalizePhoneNumber(`+${fromRaw}`);
    const messageType = message.type;
    const text = message.text?.body?.trim() || '';

    // Check account link
    const existingLink = await prisma.channelLink.findFirst({
      where: {
        channelType: ChannelType.WHATSAPP,
        channelUserId: fromPhone,
        isVerified: true,
      },
      include: { user: true },
    });

    // 1. Image upload (Receipt submission)
    if (messageType === 'image' || messageType === 'document') {
      await this.handleMediaUpload(fromPhone, existingLink?.user, message);
      return;
    }

    // 2. Text Commands
    if (text.startsWith('/link')) {
      const code = text.replace('/link', '').trim();
      const pendingLink = await prisma.channelLink.findFirst({
        where: {
          channelType: ChannelType.WHATSAPP,
          oneTimeCode: code,
          isVerified: false,
        },
        include: { user: true },
      });

      if (!pendingLink) {
        await this.sendMessage(fromPhone, '❌ Invalid or expired linking code. Please check your web dashboard.');
        return;
      }

      await prisma.channelLink.update({
        where: { id: pendingLink.id },
        data: {
          channelUserId: fromPhone,
          isVerified: true,
          linkedAt: new Date(),
          oneTimeCode: null,
        },
      });

      await this.sendMessage(
        fromPhone,
        `🎉 Account Linked Successfully!\nWelcome ${pendingLink.user.name}. You will receive order updates and invoice details right here.`
      );
      return;
    }

    if (text.toLowerCase() === 'menu' || text.toLowerCase() === 'help') {
      const menu = `*Zacma Technologies Concierge*\n\n` +
        `• Reply with */link <code>* to link your account\n` +
        `• Reply with *status* to view active tickets\n` +
        `• Send a receipt image to confirm pending payments\n` +
        `• Or describe your project requirements to chat with our AI consultant.`;
      await this.sendMessage(fromPhone, menu);
      return;
    }

    if (text.toLowerCase() === 'status') {
      if (!existingLink) {
        await this.sendMessage(fromPhone, 'Please link your account first by typing: /link <code>');
        return;
      }

      const activeReqs = await prisma.serviceRequest.findMany({
        where: { clientId: existingLink.userId, deletedAt: null },
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      if (activeReqs.length === 0) {
        await this.sendMessage(fromPhone, 'You have no open requests at the moment.');
        return;
      }

      let resp = '*Your Active Requests:*\n\n';
      for (const r of activeReqs) {
        resp += `• *${r.requestNumber}*: ${r.title}\nStatus: ${r.status}\n\n`;
      }
      await this.sendMessage(fromPhone, resp);
      return;
    }

    // Default: AI Concierge
    const aiResp = await aiService.botIntakeChat([], text);
    await this.sendMessage(fromPhone, aiResp.reply);
  }

  private async handleMediaUpload(fromPhone: string, user: any, message: any): Promise<void> {
    if (!user) {
      await this.sendMessage(fromPhone, 'Please link your account with /link <code> before sending payment receipts.');
      return;
    }

    const pendingPayment = await prisma.paymentRequest.findFirst({
      where: {
        serviceRequest: { clientId: user.id },
        status: PaymentStatus.AWAITING_PAYMENT,
      },
      include: { serviceRequest: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!pendingPayment) {
      await this.sendMessage(fromPhone, 'Receipt received, but no pending payments are currently awaiting verification on your account.');
      return;
    }

    await prisma.$transaction([
      prisma.paymentProof.create({
        data: {
          paymentRequestId: pendingPayment.id,
          referenceNumber: `WA-${Date.now()}`,
          amountPaid: pendingPayment.amount,
          paymentMethod: 'WHATSAPP_SUBMISSION',
          notes: 'Submitted via WhatsApp image attachment',
        },
      }),
      prisma.paymentRequest.update({
        where: { id: pendingPayment.id },
        data: { status: PaymentStatus.PROOF_SUBMITTED },
      }),
      prisma.serviceRequest.update({
        where: { id: pendingPayment.serviceRequestId },
        data: { status: RequestStatus.PROOF_SUBMITTED },
      }),
    ]);

    sseManager.notifyStaffAndAdmin('payment_proof_submitted', {
      requestId: pendingPayment.serviceRequestId,
      requestNumber: pendingPayment.serviceRequest.requestNumber,
      amount: pendingPayment.amount,
      clientName: user.name,
    });

    await this.sendMessage(
      fromPhone,
      `✅ Payment receipt received for ${pendingPayment.serviceRequest.requestNumber}! Our finance team will verify it shortly.`
    );
  }
}

export const whatsappService = new WhatsAppService();
