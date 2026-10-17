import { describe, it, expect } from 'vitest';
import { redactSensitiveData, redactObject } from '../../src/utils/redactor';

describe('Sensitive Data Redactor', () => {
  it('masks 16-digit credit card numbers preserving first 2 and last 4', () => {
    const raw = 'Client paid with card 4111222233334444 on CBE portal';
    const redacted = redactSensitiveData(raw);
    expect(redacted).toContain('41****4444');
    expect(redacted).not.toContain('4111222233334444');
  });

  it('masks credit card numbers with spaces or dashes', () => {
    const raw = 'Card details: 4111-2222-3333-4444';
    const redacted = redactSensitiveData(raw);
    expect(redacted).toContain('41****4444');
    expect(redacted).not.toContain('4111-2222-3333-4444');
  });

  it('masks password fields in JSON strings', () => {
    const raw = '{"email":"test@zacma.com","password":"SuperSecret123!","name":"Dawit"}';
    const redacted = redactSensitiveData(raw);
    expect(redacted).toContain('"password":"[REDACTED]"');
    expect(redacted).not.toContain('SuperSecret123!');
  });

  it('masks Bearer tokens', () => {
    const raw = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3OCJ9';
    const redacted = redactSensitiveData(raw);
    expect(redacted).toContain('Bearer [TOKEN_REDACTED]');
    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIs');
  });

  it('masks Anthropic and OpenAI API keys', () => {
    const raw = 'Using key sk-ant-api03-abcdef1234567890abcdef1234567890';
    const redacted = redactSensitiveData(raw);
    expect(redacted).toContain('sk-[REDACTED]');
    expect(redacted).not.toContain('abcdef1234567890');
  });

  it('redacts sensitive fields in nested objects via redactObject', () => {
    const payload = {
      user: 'Dawit',
      card: '5500000000001234',
      auth: {
        password: 'MyPassword999',
        token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz',
      },
    };

    const redacted = redactObject(payload);
    expect(redacted.user).toBe('Dawit');
    expect(redacted.card).toBe('55****1234');
    expect(redacted.auth.password).toBe('[REDACTED]');
    expect(redacted.auth.token).toBe('Bearer [TOKEN_REDACTED]');
  });
});
