import { Request, Response } from 'express';
import { telegramService } from '../services/telegram';
import { whatsappService } from '../services/whatsapp';
import { logger } from '../utils/logger';

export class WebhookController {
  /**
   * Telegram Webhook Handler
   */
  public async handleTelegram(req: Request, res: Response): Promise<void> {
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'] as string | undefined;

    if (!telegramService.verifyWebhookSecret(secretHeader)) {
      logger.warn('Unauthorized Telegram webhook attempt');
      res.status(401).json({ error: 'Unauthorized secret token' });
      return;
    }

    // Process asynchronously and acknowledge Telegram immediately (200 OK)
    res.status(200).json({ ok: true });

    try {
      await telegramService.handleWebhook(req.body);
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error in Telegram webhook processing');
    }
  }

  /**
   * WhatsApp Webhook Verification Challenge (GET)
   */
  public async verifyWhatsApp(req: Request, res: Response): Promise<void> {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    if (whatsappService.verifyChallenge(mode, token)) {
      logger.info('WhatsApp webhook verified successfully');
      res.status(200).send(challenge);
      return;
    }

    res.status(403).send('Verification failed');
  }

  /**
   * WhatsApp Webhook Event Handler (POST)
   */
  public async handleWhatsApp(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawPayload = JSON.stringify(req.body);

    if (!whatsappService.verifySignature(rawPayload, signature)) {
      logger.warn('Invalid WhatsApp webhook signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    res.status(200).json({ status: 'EVENT_RECEIVED' });

    try {
      await whatsappService.handleWebhook(req.body);
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error in WhatsApp webhook processing');
    }
  }
}

export const webhookController = new WebhookController();
