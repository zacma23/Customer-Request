import { Router } from 'express';
import { webhookController } from '../controllers/webhookController';

const router = Router();

// Telegram Webhook
router.post('/telegram', (req, res) => webhookController.handleTelegram(req, res));

// WhatsApp Webhook (GET challenge & POST notification events)
router.get('/whatsapp', (req, res) => webhookController.verifyWhatsApp(req, res));
router.post('/whatsapp', (req, res) => webhookController.handleWhatsApp(req, res));

export default router;
