import type { Handler, HandlerEvent } from '@netlify/functions';
import { json, handleOptions } from '../lib/response';

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'dev_whatsapp_verify_token';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  // 1. Meta Webhook Verification (GET)
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const mode = params['hub.mode'];
    const token = params['hub.verify_token'];
    const challenge = params['hub.challenge'];

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      return {
        statusCode: 200,
        body: challenge || '',
      };
    }
    return {
      statusCode: 403,
      body: 'Verification failed',
    };
  }

  // 2. Incoming messages (POST)
  if (event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body || '{}');
      console.log('WhatsApp Webhook incoming payload:', JSON.stringify(payload));
      return json(200, { status: 'received' });
    } catch (err: any) {
      return json(200, { status: 'error_handled' });
    }
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
