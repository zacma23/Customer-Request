import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber, isValidPhoneNumber, isEthiopianNumber } from '../../src/utils/phone';

describe('Phone Number Utilities', () => {
  describe('normalizePhoneNumber', () => {
    it('normalizes local Ethiopian Ethio Telecom format (09XXXXXXXX)', () => {
      expect(normalizePhoneNumber('0911223344')).toBe('+251911223344');
    });

    it('normalizes local Safaricom Ethiopia format (07XXXXXXXX)', () => {
      expect(normalizePhoneNumber('0712345678')).toBe('+251712345678');
    });

    it('normalizes 9-digit format without leading 0', () => {
      expect(normalizePhoneNumber('911223344')).toBe('+251911223344');
      expect(normalizePhoneNumber('712345678')).toBe('+251712345678');
    });

    it('normalizes 251 prefix without leading +', () => {
      expect(normalizePhoneNumber('251911223344')).toBe('+251911223344');
    });

    it('preserves existing E.164 formatted number', () => {
      expect(normalizePhoneNumber('+251911223344')).toBe('+251911223344');
      expect(normalizePhoneNumber('+14155552671')).toBe('+14155552671');
    });

    it('strips dashes, whitespace, dots, and parentheses', () => {
      expect(normalizePhoneNumber('+251 (911) 22-33-44')).toBe('+251911223344');
      expect(normalizePhoneNumber('0911 22 33 44')).toBe('+251911223344');
    });

    it('returns empty string for empty input', () => {
      expect(normalizePhoneNumber('')).toBe('');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('accepts valid Ethiopian numbers', () => {
      expect(isValidPhoneNumber('0911223344')).toBe(true);
      expect(isValidPhoneNumber('0712345678')).toBe(true);
      expect(isValidPhoneNumber('+251911223344')).toBe(true);
      expect(isValidPhoneNumber('251712345678')).toBe(true);
    });

    it('accepts valid international numbers in E.164 format', () => {
      expect(isValidPhoneNumber('+14155552671')).toBe(true);
      expect(isValidPhoneNumber('+447911123456')).toBe(true);
      expect(isValidPhoneNumber('+971501234567')).toBe(true);
    });

    it('rejects invalid inputs', () => {
      expect(isValidPhoneNumber('abc')).toBe(false);
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('09112233')).toBe(false); // too short
      expect(isValidPhoneNumber('+2519112233445566')).toBe(false); // too long for Ethiopian
    });
  });

  describe('isEthiopianNumber', () => {
    it('correctly identifies Ethiopian numbers', () => {
      expect(isEthiopianNumber('0911223344')).toBe(true);
      expect(isEthiopianNumber('0712345678')).toBe(true);
      expect(isEthiopianNumber('+251911223344')).toBe(true);
    });

    it('returns false for foreign numbers', () => {
      expect(isEthiopianNumber('+14155552671')).toBe(false);
      expect(isEthiopianNumber('+447911123456')).toBe(false);
    });
  });
});
