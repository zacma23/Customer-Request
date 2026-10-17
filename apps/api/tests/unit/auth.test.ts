import { describe, it, expect } from 'vitest';
import { authService } from '../../src/services/auth';
import { Role } from '@prisma/client';

describe('Auth Service Unit Tests', () => {
  it('hashes passwords and verifies matching plain text', async () => {
    const password = 'SecurePassword123!';
    const hash = await authService.hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2')).toBe(true);

    const isMatch = await authService.verifyPassword(password, hash);
    expect(isMatch).toBe(true);

    const isWrong = await authService.verifyPassword('WrongPassword!', hash);
    expect(isWrong).toBe(false);
  });

  it('generates and verifies JWT access tokens', () => {
    const payload = {
      userId: 'user-uuid-1234',
      role: Role.CLIENT,
      phone: '+251911223344',
      email: 'client@example.com',
    };

    const token = authService.generateAccessToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const decoded = authService.verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(Role.CLIENT);
    expect(decoded.phone).toBe(payload.phone);
    expect(decoded.email).toBe(payload.email);
  });

  it('generates deterministic SHA-256 token hashes', () => {
    const raw = 'random-refresh-token-value-12345';
    const hash1 = authService.hashToken(raw);
    const hash2 = authService.hashToken(raw);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex is 64 chars
  });

  it('calculates account lockout accurately', () => {
    // 1. Not locked
    const notLocked = authService.checkLockout({
      failedLoginAttempts: 2,
      lockoutUntil: null,
    });
    expect(notLocked.isLocked).toBe(false);
    expect(notLocked.remainingMinutes).toBe(0);

    // 2. Lockout in the future (10 minutes)
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    const locked = authService.checkLockout({
      failedLoginAttempts: 5,
      lockoutUntil: futureDate,
    });
    expect(locked.isLocked).toBe(true);
    expect(locked.remainingMinutes).toBeGreaterThanOrEqual(9);
    expect(locked.remainingMinutes).toBeLessThanOrEqual(10);

    // 3. Lockout expired
    const pastDate = new Date(Date.now() - 5 * 60 * 1000);
    const expiredLock = authService.checkLockout({
      failedLoginAttempts: 5,
      lockoutUntil: pastDate,
    });
    expect(expiredLock.isLocked).toBe(false);
  });
});
