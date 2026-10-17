import { config } from '../config';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { aiService } from './ai';
import { storageService } from './storage';
import { ChannelType, MessageType, PaymentStatus, RequestStatus, Role } from '@prisma/client';
import { sseManager } from '../realtime/sse';

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
    caption?: string;
    photo?: {
      file_id: string;
      file_unique_id: string;
      file_size: number;
      width: number;
      height: number;
    }[];
    document?: {
      file_id: string;
      file_name?: string;
      mime_type?: string;
      file_size?: number;
    };
  };
}

export class TelegramService {
  private botToken: string;
  private apiBase: string;

  constructor() {
    this.botToken = config.telegram.botToken;
    this.apiBase = `https://api.telegram.org/bot${this.botToken}`;
  }

  public verifyWebhookSecret(secretHeader?: string): boolean {
    if (!config.telegram.webhookSecret || config.telegram.webhookSecret === 'dev_telegram_secret') {
      return true; // permissive in local dev
    }
    return secretHeader === config.telegram.webhookSecret;
  }

  public async sendMessage(chatId: string | number, text: string, replyMarkup?: any): Promise<boolean> {
    if (!this.botToken || this.botToken === 'your_telegram_bot_token_from_botfather') {
      logger.info({ chatId, text }, 'Telegram dispatch (Mock/Dev token)');
      return true;
    }

    try {
      const response = await fetch(`${this.apiBase}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        }),
      });

      const resJson = (await response.json()) as any;
      return Boolean(resJson?.ok);
    } catch (err: any) {
      logger.error({ err: err.message, chatId }, 'Failed to dispatch Telegram message');
      return false;
    }
  }

  public async sendNotificationToUser(userId: string, message: string): Promise<boolean> {
    const link = await prisma.channelLink.findFirst({
      where: {
        userId,
        channelType: ChannelType.TELEGRAM,
        isVerified: true,
      },
    });

    if (!link || !link.channelUserId) {
      return false;
    }

    return this.sendMessage(link.channelUserId, message);
  }

  public async handleWebhook(update: TelegramUpdate): Promise<void> {
    const msg = update.message;
    if (!msg) return;

    const chatId = msg.chat.id;
    const text = msg.text?.trim() || msg.caption?.trim() || '';
    const telegramUserId = msg.from.id.toString();

    // Check if account is linked
    const existingLink = await prisma.channelLink.findFirst({
      where: {
        channelType: ChannelType.TELEGRAM,
        channelUserId: telegramUserId,
        isVerified: true,
      },
      include: { user: { include: { profile: true } } },
    });

    // 1. Photo / Document Upload (Receipt Submission)
    if (msg.photo || msg.document) {
      await this.handleMediaUpload(chatId, telegramUserId, existingLink?.user, msg);
      return;
    }

    // 2. Commands
    if (text.startsWith('/start')) {
      const welcome = `<b>Welcome to Zacma Technologies! 🚀</b>\n\n` +
        `We provide Telegram & WhatsApp Bots, Web Development, Mobile Apps, IT Support, and E-Commerce.\n\n` +
        `<b>Available Commands:</b>\n` +
        `• <b>/link &lt;code&gt;</b> - Link your web account using the 6-digit code in your profile\n` +
        `• <b>/requests</b> - View your open service requests\n` +
        `• <b>/status &lt;REQ-ID&gt;</b> - Check status of a specific request\n` +
        `• <b>/new &lt;title&gt;</b> - Start a new project request\n` +
        `• <b>/help</b> - Support and contact information\n\n` +
        (existingLink
          ? `✅ <i>Linked as: ${existingLink.user.name} (${existingLink.user.phone})</i>`
          : `⚠️ <i>Your Telegram is not yet linked. Log in to your portal and type /link &lt;code&gt;</i>`);

      await this.sendMessage(chatId, welcome);
      return;
    }

    if (text.startsWith('/link')) {
      const code = text.replace('/link', '').trim();
      if (!code) {
        await this.sendMessage(chatId, '⚠️ Please provide your 6-digit linking code.\nExample: <code>/link 123456</code>');
        return;
      }

      const pendingLink = await prisma.channelLink.findFirst({
        where: {
          channelType: ChannelType.TELEGRAM,
          oneTimeCode: code,
          isVerified: false,
        },
        include: { user: true },
      });

      if (!pendingLink) {
        await this.sendMessage(chatId, '❌ Invalid or expired linking code. Please generate a new code in your web portal.');
        return;
      }

      await prisma.channelLink.update({
        where: { id: pendingLink.id },
        data: {
          channelUserId: telegramUserId,
          channelUsername: msg.from.username || null,
          isVerified: true,
          linkedAt: new Date(),
          oneTimeCode: null,
        },
      });

      await this.sendMessage(
        chatId,
        `🎉 <b>Account Linked Successfully!</b>\n\nWelcome ${pendingLink.user.name}! You will now receive real-time request updates, meeting links, and invoice notifications directly here.`
      );
      return;
    }

    if (text.startsWith('/requests')) {
      if (!existingLink) {
        await this.sendMessage(chatId, '⚠️ Please link your account first using <code>/link &lt;code&gt;</code>');
        return;
      }

      const userRequests = await prisma.serviceRequest.findMany({
        where: { clientId: existingLink.userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      if (userRequests.length === 0) {
        await this.sendMessage(chatId, 'You currently have no submitted requests.\nType <code>/new</code> to submit one!');
        return;
      }

      let resp = '<b>📋 Your Recent Requests:</b>\n\n';
      for (const req of userRequests) {
        resp += `• <b>${req.requestNumber}</b>: ${req.title}\n  Status: <code>${req.status}</code>\n\n`;
      }
      resp += 'Type <code>/status REQ-XXXX-XXXX</code> for details.';
      await this.sendMessage(chatId, resp);
      return;
    }

    if (text.startsWith('/status')) {
      const reqNum = text.replace('/status', '').trim().toUpperCase();
      if (!reqNum) {
        await this.sendMessage(chatId, 'Please specify the request number. Example: <code>/status REQ-2026-0001</code>');
        return;
      }

      const found = await prisma.serviceRequest.findFirst({
        where: { requestNumber: reqNum, deletedAt: null },
        include: { paymentRequests: true, meetings: true },
      });

      if (!found) {
        await this.sendMessage(chatId, `❌ Request ${reqNum} was not found.`);
        return;
      }

      let details = `<b>🔍 Request ${found.requestNumber}</b>\n` +
        `<b>Title:</b> ${found.title}\n` +
        `<b>Status:</b> <code>${found.status}</code>\n` +
        `<b>Priority:</b> ${found.priority}\n\n`;

      if (found.status === RequestStatus.AWAITING_PAYMENT) {
        details += `💳 <b>Payment Pending:</b> Send a photo of your Telebirr or CBE transfer receipt in this chat to verify!\n\n`;
      }

      await this.sendMessage(chatId, details);
      return;
    }

    if (text.startsWith('/new')) {
      const title = text.replace('/new', '').trim();
      if (!existingLink) {
        await this.sendMessage(chatId, '⚠️ Please link your account first using <code>/link &lt;code&gt;</code> before submitting requests.');
        return;
      }

      if (!title) {
        await this.sendMessage(chatId, 'Please describe your project title. Example: <code>/new E-commerce store with Telebirr</code>');
        return;
      }

      // Generate sequence number
      const count = await prisma.serviceRequest.count();
      const currentYear = new Date().getFullYear();
      const requestNumber = `REQ-${currentYear}-${(count + 1).toString().padStart(4, '0')}`;

      // AI auto-classify
      const classification = await aiService.classifyRequest(title, title);

      // Match service
      const matchedService = await prisma.service.findFirst({
        where: { key: classification.category },
      });

      const newRequest = await prisma.serviceRequest.create({
        data: {
          requestNumber,
          clientId: existingLink.userId,
          title,
          description: `Created via Telegram Bot by @${msg.from.username || msg.from.first_name}`,
          status: RequestStatus.PENDING,
          priority: classification.priority,
          aiCategory: classification.category,
          aiPriority: classification.priority,
          aiSentiment: classification.sentiment,
          aiLanguage: classification.language,
          services: matchedService
            ? { create: [{ serviceId: matchedService.id }] }
            : undefined,
        },
      });

      // Notify staff/admin via real-time SSE
      sseManager.notifyStaffAndAdmin('new_request', {
        id: newRequest.id,
        requestNumber: newRequest.requestNumber,
        title: newRequest.title,
        clientName: existingLink.user.name,
      });

      await this.sendMessage(
        chatId,
        `✅ <b>Request Created Successfully!</b>\n\n` +
        `<b>Number:</b> <code>${newRequest.requestNumber}</code>\n` +
        `<b>Service:</b> ${classification.category}\n` +
        `<b>Status:</b> <code>PENDING</code>\n\n` +
        `Our engineering team has received your ticket and will follow up shortly.`
      );
      return;
    }

    // Default: AI Concierge Assistant
    const aiResponse = await aiService.botIntakeChat([], text);
    await this.sendMessage(chatId, aiResponse.reply);
  }

  private async handleMediaUpload(
    chatId: number,
    telegramUserId: string,
    user: any,
    msg: any
  ): Promise<void> {
    if (!user) {
      await this.sendMessage(chatId, '⚠️ Please link your account with <code>/link &lt;code&gt;</code> before uploading payment receipts.');
      return;
    }

    // Find pending payment request
    const pendingPayment = await prisma.paymentRequest.findFirst({
      where: {
        serviceRequest: { clientId: user.id },
        status: PaymentStatus.AWAITING_PAYMENT,
      },
      include: { serviceRequest: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!pendingPayment) {
      await this.sendMessage(chatId, 'ℹ️ Receipt received, but you do not currently have any pending payment requests awaiting proof.');
      return;
    }

    // Record receipt proof
    const refText = msg.caption?.trim() || `TG-${msg.from.id}-${Date.now()}`;
    await prisma.$transaction([
      prisma.paymentProof.create({
        data: {
          paymentRequestId: pendingPayment.id,
          referenceNumber: refText,
          amountPaid: pendingPayment.amount,
          paymentMethod: 'TELEGRAM_SUBMISSION',
          notes: `Uploaded via Telegram by @${msg.from.username || msg.from.first_name}`,
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

    // Real-time alert to staff
    sseManager.notifyStaffAndAdmin('payment_proof_submitted', {
      requestId: pendingPayment.serviceRequestId,
      requestNumber: pendingPayment.serviceRequest.requestNumber,
      amount: pendingPayment.amount,
      clientName: user.name,
    });

    await this.sendMessage(
      chatId,
      `✅ <b>Payment Proof Received!</b>\n\nYour receipt for request <b>${pendingPayment.serviceRequest.requestNumber}</b> has been queued for admin verification.`
    );
  }
}

export const telegramService = new TelegramService();
