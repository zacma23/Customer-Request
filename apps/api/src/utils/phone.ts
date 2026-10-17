/**
 * Phone number validation and normalization supporting:
 * 1. Ethiopian mobile numbers (+251 9... Ethio Telecom, +251 7... Safaricom)
 * 2. International numbers complying with E.164 standard (+[country][number] up to 15 digits)
 */

export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';

  // Remove whitespace, dashes, dots, and parentheses
  let cleaned = rawPhone.trim().replace(/[\s\-\.\(\)]/g, '');

  // Ethiopian local format conversion (09XXXXXXXX or 07XXXXXXXX -> +251XXXXXXXXX)
  if (/^0(9|7)\d{8}$/.test(cleaned)) {
    return `+251${cleaned.substring(1)}`;
  }

  // 9-digit Ethiopian format without leading 0 (9XXXXXXXX or 7XXXXXXXX -> +251XXXXXXXXX)
  if (/^(9|7)\d{8}$/.test(cleaned)) {
    return `+251${cleaned}`;
  }

  // 2519XXXXXXXX without leading plus
  if (/^251(9|7)\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // If already starts with +, ensure digits follow
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Default return with + prefix if digits
  if (/^\d{7,15}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return cleaned;
}

export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);

  // Check Ethiopian pattern: +251 followed by 9 or 7 and 8 digits (total 13 chars)
  const isEthiopian = /^\+251(9|7)\d{8}$/.test(normalized);
  if (isEthiopian) return true;

  // General International E.164 pattern: + followed by 1-9 and 6 to 14 digits
  const isE164 = /^\+[1-9]\d{6,14}$/.test(normalized);
  return isE164;
}

export function isEthiopianNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return /^\+251(9|7)\d{8}$/.test(normalized);
}
