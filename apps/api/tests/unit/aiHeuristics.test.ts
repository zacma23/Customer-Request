import { describe, it, expect } from 'vitest';
import { aiService } from '../../src/services/ai';
import { Priority } from '@prisma/client';

describe('AI Service Heuristic Fallbacks', () => {
  describe('Classification & Language Detection', () => {
    it('classifies Telegram bot request correctly', async () => {
      const res = await aiService.classifyRequest(
        'Need a Telegram bot for food ordering',
        'We want an interactive Telegram bot integrated with Telebirr.'
      );
      expect(res.category).toBe('TELEGRAM_BOT');
      expect(res.language).toBe('English');
    });

    it('classifies E-Commerce and detects urgent priority', async () => {
      const res = await aiService.classifyRequest(
        'Urgent e-commerce store with Telebirr',
        'Need online store immediately for holiday campaign ASAP, broken site has critical issue.'
      );
      expect(res.category).toBe('ECOMMERCE');
      expect(res.priority).toBe(Priority.URGENT);
      expect(res.sentiment).toContain('Urgent');
    });

    it('detects Amharic language from Ethiopic Unicode characters', async () => {
      const res = await aiService.classifyRequest(
        'የቴሌግራም ቦት ማሰራት እፈልጋለሁ',
        'ለድርጅታችን የደንበኞች አገልግሎት የሚሰጥ የቴሌግራም ቦት ያስፈልገናል።'
      );
      expect(res.language).toBe('Amharic');
    });

    it('detects Afaan Oromo from greeting keywords', async () => {
      const res = await aiService.classifyRequest(
        'Akkam jirtu, Website haarawa barbaanna',
        'Nagaan hunda caala. Website daldalaaf nuuf hojjedhaa.'
      );
      expect(res.language).toBe('Afaan Oromo');
    });
  });

  describe('Draft Reply Generation', () => {
    it('generates an English polite reply draft', async () => {
      const draft = await aiService.draftReply(
        {
          title: 'Mobile App Development',
          description: 'We need an Android and iOS app for logistics',
          requestNumber: 'REQ-2026-0001',
          aiLanguage: 'English',
          clientName: 'Abebe Bikila',
        },
        'GENERAL'
      );
      expect(typeof draft).toBe('string');
      expect(draft.length).toBeGreaterThan(20);
      expect(draft).toContain('REQ-2026-0001');
    });

    it('generates an Amharic polite reply draft when requested', async () => {
      const draft = await aiService.draftReply(
        {
          title: 'የሞባይል መተግበሪያ',
          description: 'የሞባይል መተግበሪያ ማሰራት እንፈልጋለን',
          requestNumber: 'REQ-2026-0002',
          aiLanguage: 'Amharic',
          clientName: 'አበበ',
        },
        'APPROVAL'
      );
      expect(typeof draft).toBe('string');
      // Contains Amharic characters
      expect(/[\u1200-\u137F]/.test(draft)).toBe(true);
    });
  });

  describe('Next Action Suggestion', () => {
    it('suggests appropriate action based on workflow status', async () => {
      const pendingAction = await aiService.suggestNextAction('PENDING', false, false, false);
      expect(pendingAction).toContain('Approve');

      const paymentAction = await aiService.suggestNextAction('AWAITING_PAYMENT', true, true, false);
      expect(paymentAction).toContain('Verify');

      const completedAction = await aiService.suggestNextAction('COMPLETED', true, true, true);
      expect(completedAction).toContain('feedback');
    });
  });

  describe('Quotation Heuristic Generator', () => {
    it('generates structured quotation with 15% VAT and valid line items', async () => {
      const quote = await aiService.generateQuotation(
        'Custom Web & Telegram Bot',
        'Full corporate marketing website with integrated Telegram channel support',
        ['MARKETING_WEBSITE', 'TELEGRAM_BOT']
      );

      expect(quote).toHaveProperty('title');
      expect(quote).toHaveProperty('items');
      expect(quote.items.length).toBeGreaterThan(0);
      expect(quote.currency).toBe('ETB');

      // Math verification: subtotal + tax (15%) = total
      const calculatedSubtotal = quote.items.reduce((s, item) => s + item.total, 0);
      expect(quote.subtotal).toBe(calculatedSubtotal);
      expect(quote.tax).toBe(Math.round(calculatedSubtotal * 0.15));
      expect(quote.total).toBe(quote.subtotal + quote.tax);
      expect(quote.estimatedDeliveryDays).toBeGreaterThan(0);
    });
  });
});
