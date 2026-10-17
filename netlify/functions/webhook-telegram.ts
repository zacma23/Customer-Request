import type { Handler, HandlerEvent } from '@netlify/functions';
import { prisma } from '../lib/db';
import { json, handleOptions } from '../lib/response';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'Telegram Webhook Live' };
  }

  try {
    const update = JSON.parse(event.body || '{}');
    const message = update.message;

    if (!message || !message.text) {
      return json(200, { ok: true });
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const fromUser = message.from?.username || message.from?.first_name || 'User';

    // Check for linking code: e.g. /link <CODE> or 6-digit code
    if (text.startsWith('/link ') || /^[A-Z0-9]{6}$/.test(text)) {
      const code = text.replace('/link ', '').trim().toUpperCase();
      const linkRecord = await prisma.channelLink.findUnique({
        where: { oneTimeCode: code },
        include: { user: true },
      });

      if (linkRecord) {
        await prisma.channelLink.update({
          where: { id: linkRecord.id },
          data: {
            channelUserId: chatId,
            channelUsername: fromUser,
            isVerified: true,
            linkedAt: new Date(),
          },
        });
        return json(200, {
          method: 'sendMessage',
          chat_id: chatId,
          text: `✅ Telegram account linked successfully with ${linkRecord.user.name} at Zacma Technologies!`,
        });
      }
    }

    // Default bot reply
    return json(200, {
      method: 'sendMessage',
      chat_id: chatId,
      text: `Hello! 👋 Welcome to Zacma Technologies.\n\nTo link your account, use the one-time linking code from your Client Portal profile (e.g. /link CODE).`,
    });
  } catch (err: any) {
    console.error('Telegram webhook error:', err);
    return json(200, { ok: true });
  }
};
