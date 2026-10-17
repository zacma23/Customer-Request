import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { redactSensitiveData } from '../utils/redactor';
import { Priority } from '@prisma/client';

export interface ClassificationResult {
  category: string;
  priority: Priority;
  sentiment: string;
  language: string;
}

export interface QuotationLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuotationDraft {
  title: string;
  currency: 'ETB' | 'USD';
  items: QuotationLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  estimatedDeliveryDays: number;
  paymentTerms: string;
  notes: string;
}

export interface BotChatResult {
  reply: string;
  isReadyForSubmission: boolean;
  requestDraft?: {
    title: string;
    description: string;
    serviceKey: string;
    budgetRange?: string;
  };
}

export class AiService {
  private client: Anthropic | null = null;

  constructor() {
    if (config.ai.apiKey && config.ai.apiKey !== 'your_anthropic_claude_api_key_here') {
      try {
        this.client = new Anthropic({ apiKey: config.ai.apiKey });
      } catch (err: any) {
        logger.warn({ err }, 'Failed to initialize Anthropic client, using smart fallback');
        this.client = null;
      }
    }
  }

  private async logAiCall(
    serviceRequestId: string | null,
    action: string,
    tokens: { prompt: number; completion: number },
    latencyMs: number,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      await prisma.aiLog.create({
        data: {
          serviceRequestId,
          action,
          promptTokens: tokens.prompt,
          completionTokens: tokens.completion,
          latencyMs,
          success,
          error: error || null,
        },
      });
    } catch (err: any) {
      logger.warn({ err }, 'Failed to log AI metrics to database');
    }
  }

  /**
   * 1. Auto-classify new request: category, priority, sentiment, language
   */
  public async classifyRequest(
    title: string,
    description: string,
    requestId?: string
  ): Promise<ClassificationResult> {
    const startTime = Date.now();
    const sanitizedTitle = redactSensitiveData(title);
    const sanitizedDesc = redactSensitiveData(description);

    if (this.client) {
      try {
        const prompt = `Analyze this client service request for a software and digital agency.
Title: "${sanitizedTitle}"
Description: "${sanitizedDesc}"

Respond ONLY with valid JSON with keys:
"category": one of ["TELEGRAM_BOT", "WHATSAPP_BOT", "MARKETING_WEBSITE", "MOBILE_APP", "IT_SUPPORT", "DIGITAL_MARKETING", "FACEBOOK_MARKETING", "YOUTUBE_MARKETING", "ECOMMERCE"],
"priority": one of ["LOW", "NORMAL", "HIGH", "URGENT"],
"sentiment": brief phrase like "Positive / Eager", "Neutral / Professional", or "Urgent / Demanding",
"language": one of ["English", "Amharic", "Afaan Oromo"]`;

        const response = await this.client.messages.create({
          model: config.ai.model,
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        });

        const latency = Date.now() - startTime;
        const textContent = response.content[0].type === 'text' ? response.content[0].text : '';
        const parsed = JSON.parse(textContent.match(/\{[\s\S]*\}/)?.[0] || '{}');

        await this.logAiCall(
          requestId || null,
          'CLASSIFY',
          { prompt: response.usage.input_tokens, completion: response.usage.output_tokens },
          latency,
          true
        );

        return {
          category: parsed.category || this.fallbackCategory(sanitizedTitle + ' ' + sanitizedDesc),
          priority: (parsed.priority as Priority) || Priority.NORMAL,
          sentiment: parsed.sentiment || 'Neutral',
          language: parsed.language || this.detectLanguage(sanitizedTitle + ' ' + sanitizedDesc),
        };
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Claude classification failed, using heuristic fallback');
        await this.logAiCall(requestId || null, 'CLASSIFY', { prompt: 0, completion: 0 }, Date.now() - startTime, false, err.message);
      }
    }

    // Heuristic Fallback
    const combined = `${sanitizedTitle} ${sanitizedDesc}`.toLowerCase();
    const category = this.fallbackCategory(combined);
    const priority = this.fallbackPriority(combined);
    const sentiment = this.fallbackSentiment(combined);
    const language = this.detectLanguage(sanitizedTitle + ' ' + sanitizedDesc);

    return { category, priority, sentiment, language };
  }

  /**
   * 2. Summarize long request and conversation thread
   */
  public async summarizeRequest(
    title: string,
    description: string,
    messages: { sender: string; content: string }[] = [],
    requestId?: string
  ): Promise<string> {
    const startTime = Date.now();
    const cleanDesc = redactSensitiveData(description);
    const cleanThread = messages
      .slice(-10)
      .map((m) => `${m.sender}: ${redactSensitiveData(m.content)}`)
      .join('\n');

    if (this.client) {
      try {
        const prompt = `Provide a concise 3-bullet executive summary of this client request and recent conversation for technical leadership.
Request Title: ${redactSensitiveData(title)}
Initial Description: ${cleanDesc}
Recent Thread:
${cleanThread || 'No messages yet.'}`;

        const response = await this.client.messages.create({
          model: config.ai.model,
          max_tokens: 350,
          messages: [{ role: 'user', content: prompt }],
        });

        const latency = Date.now() - startTime;
        const text = response.content[0].type === 'text' ? response.content[0].text : '';

        await this.logAiCall(
          requestId || null,
          'SUMMARIZE',
          { prompt: response.usage.input_tokens, completion: response.usage.output_tokens },
          latency,
          true
        );

        return text.trim();
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Claude summarization failed, falling back');
        await this.logAiCall(requestId || null, 'SUMMARIZE', { prompt: 0, completion: 0 }, Date.now() - startTime, false, err.message);
      }
    }

    // Heuristic summary
    return `• Client requested: ${title}\n• Scope: ${cleanDesc.substring(0, 150)}${cleanDesc.length > 150 ? '...' : ''}\n• Messages exchanged: ${messages.length}. Status active.`;
  }

  /**
   * 3. AI Draft Reply in client's language
   */
  public async draftReply(
    request: { title: string; description: string; requestNumber: string; aiLanguage?: string | null; clientName?: string },
    replyType: 'GENERAL' | 'APPROVAL' | 'MEETING' | 'PAYMENT',
    instructions?: string,
    requestId?: string
  ): Promise<string> {
    const startTime = Date.now();
    const language = request.aiLanguage || 'English';
    const clientName = request.clientName || 'Valued Client';

    if (this.client) {
      try {
        const prompt = `You are a courteous, professional technical account manager at Zacma Technologies.
Draft a professional response to client ${clientName} regarding request ${request.requestNumber} ("${redactSensitiveData(request.title)}").
Message Intent: ${replyType}
Target Language: ${language}
Admin guidance: ${instructions || 'Professional and welcoming'}

Guidelines:
- Draft in ${language} (if Amharic or Afaan Oromo, write authentic and accurate script/text).
- If PAYMENT, inform them how to upload their receipt or reference number once processed.
- If MEETING, offer flexibility for online or office discovery.
- Keep tone polite, reassuring, and precise. Return ONLY the drafted reply message without preamble.`;

        const response = await this.client.messages.create({
          model: config.ai.model,
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        });

        const latency = Date.now() - startTime;
        const text = response.content[0].type === 'text' ? response.content[0].text : '';

        await this.logAiCall(
          requestId || null,
          'DRAFT_REPLY',
          { prompt: response.usage.input_tokens, completion: response.usage.output_tokens },
          latency,
          true
        );

        return text.trim();
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Claude reply drafting failed, using template fallback');
        await this.logAiCall(requestId || null, 'DRAFT_REPLY', { prompt: 0, completion: 0 }, Date.now() - startTime, false, err.message);
      }
    }

    // Heuristic template fallback
    if (language.toLowerCase().includes('amharic')) {
      switch (replyType) {
        case 'APPROVAL':
          return `ሰላም ${clientName}፣ ለጠየቁት የ${request.title} ፕሮጀክት ጥያቄዎ (${request.requestNumber}) ተቀባይነት አግኝቷል። ቀጣዩን ዝርዝር በቅርቡ እናሳውቆታለን።`;
        case 'MEETING':
          return `ሰላም ${clientName}፣ ስለ ፕሮጀክትዎ (${request.requestNumber}) በዝርዝር ለመወያየት የውይይት ቀጠሮ ማስያዝ እንፈልጋለን። ከታች ያሉትን የቀጠሮ ዝርዝሮች ይመልከቱ።`;
        case 'PAYMENT':
          return `ሰላም ${clientName}፣ ለፕሮጀክት ቁጥር ${request.requestNumber} የክፍያ ዝርዝር ከታች ተዘጋጅቷል። በቴሌብር ወይም በንግድ ባንክ ከከፈሉ በኋላ ደረሰኙን እዚህ ማያያዝ ይችላሉ።`;
        default:
          return `ሰላም ${clientName}፣ መልዕክትዎ ደርሶናል፤ የቴክኒክ ቡድናችን ጥያቄዎን (${request.requestNumber}) እየገመገመ ነው። እናመሰግናለን!`;
      }
    }

    // English Fallback
    switch (replyType) {
      case 'APPROVAL':
        return `Dear ${clientName},\n\nWe are pleased to inform you that your request ${request.requestNumber} ("${request.title}") has been approved by our technical committee. We look forward to executing your project with excellence.`;
      case 'MEETING':
        return `Hello ${clientName},\n\nWe would like to coordinate a discovery consultation for request ${request.requestNumber}. Please find the proposed schedule and meeting coordinates below.`;
      case 'PAYMENT':
        return `Dear ${clientName},\n\nYour milestone invoice for request ${request.requestNumber} is ready. You may proceed with settlement via Telebirr or CBE Bank Transfer, and upload your confirmation receipt directly here.`;
      default:
        return `Dear ${clientName},\n\nThank you for checking in regarding ${request.requestNumber}. Our engineering team is reviewing the specifications and will provide an update shortly.`;
    }
  }

  /**
   * 4. Suggest Next Best Action for the admin
   */
  public async suggestNextAction(
    status: string,
    hasPayment: boolean,
    hasProof: boolean,
    hasMeeting: boolean,
    requestId?: string
  ): Promise<string> {
    if (status === 'PENDING') {
      return 'Review client specifications and either Approve or Schedule a Discovery Meeting.';
    }
    if (status === 'APPROVED' && !hasMeeting && !hasPayment) {
      return 'Generate and issue technical quotation & payment milestone request.';
    }
    if (status === 'MEETING_SCHEDULED') {
      return 'Conduct discovery call and document agreed project deliverables.';
    }
    if (status === 'AWAITING_PAYMENT' && hasProof) {
      return 'Urgent: Payment receipt submitted. Verify transaction in verification queue.';
    }
    if (status === 'AWAITING_PAYMENT' && !hasProof) {
      return 'Awaiting client settlement. Send gentle reminder if overdue.';
    }
    if (status === 'VERIFIED') {
      return 'Payment confirmed. Assign lead developer and transition request to In Progress.';
    }
    if (status === 'IN_PROGRESS') {
      return 'Development sprint underway. Share staging preview or milestone update.';
    }
    if (status === 'COMPLETED') {
      return 'Project delivered. Request client feedback and testimonial.';
    }
    return 'Review conversation thread and update request status.';
  }

  /**
   * 5. Generate Quotation Draft with line items
   */
  public async generateQuotation(
    title: string,
    description: string,
    services: string[] = [],
    requestId?: string
  ): Promise<QuotationDraft> {
    const startTime = Date.now();
    const sanitizedTitle = redactSensitiveData(title);
    const sanitizedDesc = redactSensitiveData(description);

    if (this.client) {
      try {
        const prompt = `Generate a realistic, itemized quotation for this technology project.
Title: "${sanitizedTitle}"
Description: "${sanitizedDesc}"
Selected Services: ${services.join(', ')}

Return ONLY valid JSON matching this schema:
{
  "title": "Quotation for ...",
  "currency": "ETB",
  "items": [
    {"description": "Core development", "quantity": 1, "unitPrice": 25000, "total": 25000}
  ],
  "subtotal": 25000,
  "tax": 3750,
  "total": 28750,
  "estimatedDeliveryDays": 14,
  "paymentTerms": "50% upfront deposit, 50% upon final acceptance",
  "notes": "Includes 30 days post-launch warranty and technical support."
}`;

        const response = await this.client.messages.create({
          model: config.ai.model,
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        });

        const latency = Date.now() - startTime;
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');

        await this.logAiCall(
          requestId || null,
          'QUOTATION',
          { prompt: response.usage.input_tokens, completion: response.usage.output_tokens },
          latency,
          true
        );

        if (parsed.items && Array.isArray(parsed.items)) {
          return parsed as QuotationDraft;
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Claude quotation generation failed, using heuristic draft');
        await this.logAiCall(requestId || null, 'QUOTATION', { prompt: 0, completion: 0 }, Date.now() - startTime, false, err.message);
      }
    }

    // Heuristic Quotation
    const basePrice = services.includes('MOBILE_APP')
      ? 50000
      : services.includes('ECOMMERCE')
      ? 35000
      : services.includes('MARKETING_WEBSITE')
      ? 25000
      : 18000;

    const items: QuotationLineItem[] = [
      {
        description: `${title} - System Architecture & UI/UX Design`,
        quantity: 1,
        unitPrice: Math.round(basePrice * 0.35),
        total: Math.round(basePrice * 0.35),
      },
      {
        description: `Core Engineering & API Integration`,
        quantity: 1,
        unitPrice: Math.round(basePrice * 0.5),
        total: Math.round(basePrice * 0.5),
      },
      {
        description: `Quality Assurance, Deployment & SLA Setup`,
        quantity: 1,
        unitPrice: Math.round(basePrice * 0.15),
        total: Math.round(basePrice * 0.15),
      },
    ];

    const subtotal = items.reduce((acc, it) => acc + it.total, 0);
    const tax = Math.round(subtotal * 0.15); // 15% VAT

    return {
      title: `Technical Proposal & Quotation - ${title}`,
      currency: 'ETB',
      items,
      subtotal,
      tax,
      total: subtotal + tax,
      estimatedDeliveryDays: 21,
      paymentTerms: '50% initial milestone deposit, 50% upon deployment verification',
      notes: 'Includes 3 months complimentary maintenance and Ethiopian payment gateway testing.',
    };
  }

  /**
   * 6. Telegram / WhatsApp AI Intake Assistant
   */
  public async botIntakeChat(
    history: { role: 'user' | 'assistant'; content: string }[],
    incomingMessage: string
  ): Promise<BotChatResult> {
    const startTime = Date.now();
    const sanitizedMsg = redactSensitiveData(incomingMessage);

    if (this.client) {
      try {
        const systemPrompt = `You are the AI intake concierge for Zacma Technologies, providing Telegram/WhatsApp bots, websites, mobile apps, IT support, marketing, and e-commerce.
Your job is to answer client FAQs politely and collect their project request details (Service type, Project title, Detailed description, Budget).
When you have collected enough info to create a ticket, return JSON:
{
  "reply": "Your conversational reply to client",
  "isReadyForSubmission": true,
  "requestDraft": {
    "title": "...",
    "description": "...",
    "serviceKey": "TELEGRAM_BOT" (one of the 9 keys),
    "budgetRange": "..."
  }
}
If still collecting info or answering questions, set "isReadyForSubmission": false and omit "requestDraft".`;

        const messages = [
          ...history.map((h) => ({ role: h.role, content: redactSensitiveData(h.content) })),
          { role: 'user' as const, content: sanitizedMsg },
        ];

        const response = await this.client.messages.create({
          model: config.ai.model,
          max_tokens: 500,
          system: systemPrompt,
          messages,
        });

        const latency = Date.now() - startTime;
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');

        await this.logAiCall(
          null,
          'BOT_CHAT',
          { prompt: response.usage.input_tokens, completion: response.usage.output_tokens },
          latency,
          true
        );

        if (parsed.reply) {
          return {
            reply: parsed.reply,
            isReadyForSubmission: Boolean(parsed.isReadyForSubmission),
            requestDraft: parsed.requestDraft,
          };
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Claude bot intake failed, using fallback');
      }
    }

    // Heuristic bot intake
    const lower = sanitizedMsg.toLowerCase();
    if (lower.includes('website') || lower.includes('web') || lower.includes('app') || lower.includes('bot')) {
      return {
        reply: `Thank you for reaching out! We specialize in custom development. Could you describe your target features and estimated timeline? You can also reply with your project title to begin formal ticket intake.`,
        isReadyForSubmission: false,
      };
    }

    return {
      reply: `Welcome to Zacma Technologies! 🚀\nWe provide:\n• Telegram & WhatsApp Bots\n• Marketing Websites & E-Commerce\n• Mobile Apps (iOS/Android)\n• IT Support & Digital Marketing\n\nHow can we assist you today?`,
      isReadyForSubmission: false,
    };
  }

  // --- Helpers for Heuristic Engine ---
  private fallbackCategory(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('telegram')) return 'TELEGRAM_BOT';
    if (t.includes('whatsapp')) return 'WHATSAPP_BOT';
    if (t.includes('store') || t.includes('commerce') || t.includes('shop') || t.includes('telebirr')) return 'ECOMMERCE';
    if (t.includes('mobile') || t.includes('android') || t.includes('ios') || t.includes('app')) return 'MOBILE_APP';
    if (t.includes('facebook') || t.includes('fb') || t.includes('meta')) return 'FACEBOOK_MARKETING';
    if (t.includes('youtube') || t.includes('video')) return 'YOUTUBE_MARKETING';
    if (t.includes('marketing') || t.includes('seo') || t.includes('growth')) return 'DIGITAL_MARKETING';
    if (t.includes('support') || t.includes('server') || t.includes('network') || t.includes('it')) return 'IT_SUPPORT';
    return 'MARKETING_WEBSITE';
  }

  private fallbackPriority(text: string): Priority {
    const t = text.toLowerCase();
    if (t.includes('urgent') || t.includes('asap') || t.includes('emergency') || t.includes('immediately')) return Priority.URGENT;
    if (t.includes('high') || t.includes('critical') || t.includes('important')) return Priority.HIGH;
    if (t.includes('low') || t.includes('whenever') || t.includes('next month')) return Priority.LOW;
    return Priority.NORMAL;
  }

  private fallbackSentiment(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('excited') || t.includes('love') || t.includes('great') || t.includes('look forward')) return 'Positive / Eager';
    if (t.includes('frustrated') || t.includes('broken') || t.includes('bad') || t.includes('issue')) return 'Urgent / Concerned';
    return 'Professional / Neutral';
  }

  private detectLanguage(text: string): string {
    // Check Ethiopic Unicode script range: U+1200 to U+137F
    if (/[\u1200-\u137F]/.test(text)) {
      return 'Amharic';
    }
    // Check Afaan Oromo common markers
    const lower = text.toLowerCase();
    if (lower.includes('akkam') || lower.includes('nagaan') || lower.includes('galatoomi') || lower.includes('fayyaa')) {
      return 'Afaan Oromo';
    }
    return 'English';
  }
}

export const aiService = new AiService();
