/**
 * Sensitive Data Redactor
 * Masks credit card numbers, passwords, auth tokens, and secret keys before sending to AI or logger.
 */

export function redactSensitiveData(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let redacted = text;

  // 1. Redact Credit / Debit Card Numbers (13-19 digits with optional spaces or dashes)
  redacted = redacted.replace(
    /\b(?:\d[ -]*?){13,19}\b/g,
    (match) => {
      const digitsOnly = match.replace(/\D/g, '');
      if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
        // Keep first 2 and last 4, mask middle
        return `${digitsOnly.slice(0, 2)}****${digitsOnly.slice(-4)}`;
      }
      return match;
    }
  );

  // 2. Redact Passwords in JSON or key-value format
  redacted = redacted.replace(
    /(["']?(?:password|passwd|pwd|secret|accessToken|refreshToken)["']?\s*[:=]\s*["'])([^"'\s]+)(["'])/gi,
    '$1[REDACTED]$3'
  );

  // 3. Redact Bearer / API tokens
  redacted = redacted.replace(
    /(Bearer\s+)[a-zA-Z0-9_\-\.]{20,}/gi,
    '$1[TOKEN_REDACTED]'
  );

  // 4. Redact Anthropic / OpenAI style keys
  redacted = redacted.replace(
    /(sk-[a-zA-Z0-9_\-]{20,})/gi,
    'sk-[REDACTED]'
  );

  return redacted;
}

export function redactObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  try {
    const jsonStr = JSON.stringify(obj);
    const redactedJson = redactSensitiveData(jsonStr);
    return JSON.parse(redactedJson) as T;
  } catch {
    return obj;
  }
}
