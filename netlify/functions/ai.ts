import type { Handler, HandlerEvent } from '@netlify/functions';
import { prisma } from '../lib/db';
import { json, error, unauthorized, forbidden, handleOptions } from '../lib/response';
import { getAuthUser } from '../lib/auth';
import { isStaffOrAdmin } from '../lib/rbac';
import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

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

  if (event.httpMethod !== 'POST') {
    return error(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, serviceRequestId, prompt, text } = body;

    // Initialize Anthropic client if key is set
    let anthropic: Anthropic | null = null;
    if (ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.startsWith('sk-ant')) {
      anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    }

    // 1. Action: DRAFT_REPLY
    if (action === 'draft_reply') {
      let draftText = '';

      if (anthropic && prompt) {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `You are an AI assistant for Zacma Technologies. Draft a professional customer response for this request:\n\n${prompt}`,
            },
          ],
        });
        const contentBlock = response.content[0];
        if (contentBlock && contentBlock.type === 'text') {
          draftText = contentBlock.text;
        }
      } else {
        // High quality heuristic template fallback
        draftText = `Dear Valued Client,\n\nThank you for reaching out to Zacma Technologies. We have reviewed your project requirements and our engineering team is ready to begin the discovery phase.\n\nNext steps:\n1. We will coordinate a brief 30-minute discovery call.\n2. Once aligned, we will issue your project quotation and timeline.\n\nPlease let us know if you have any questions.\n\nBest regards,\nZacma Tech Engineering Team`;
      }

      return json(200, { draftReply: draftText });
    }

    // 2. Action: CLASSIFY
    if (action === 'classify') {
      const content = text || prompt || '';
      const isUrgent = /urgent|critical|broken|emergency|asap|down/i.test(content);
      const isNegative = /bad|frustrated|slow|unhappy|fail|disappointed/i.test(content);

      // Simple language detection
      let language = 'English';
      if (/[\u1200-\u137F]/.test(content)) {
        language = 'Amharic';
      } else if (/akkam|nagaan|galatoomaa|baga/i.test(content)) {
        language = 'Afaan Oromo';
      }

      const classification = {
        category: 'Software Engineering',
        priority: isUrgent ? 'URGENT' : 'NORMAL',
        sentiment: isNegative ? 'NEGATIVE' : 'POSITIVE',
        language,
        suggestedNextAction: 'Schedule Discovery Call',
      };

      if (serviceRequestId) {
        await prisma.serviceRequest.update({
          where: { id: serviceRequestId },
          data: {
            aiCategory: classification.category,
            aiPriority: classification.priority as any,
            aiSentiment: classification.sentiment,
            aiLanguage: classification.language,
            aiNextAction: classification.suggestedNextAction,
          },
        });
      }

      return json(200, classification);
    }

    return error(400, 'Invalid AI action specified', 'INVALID_ACTION');
  } catch (err: any) {
    console.error('AI function error:', err);
    return error(500, err?.message || 'Server error', 'SERVER_ERROR');
  }
};
