import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { Role } from '@prisma/client';
import { logger } from '../utils/logger';

export interface TokenPayload {
  userId: string;
  role: Role;
  phone: string;
  email: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class AuthService {
  /**
   * Hash password using bcrypt
   */
  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Verify password against hash
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate Access Token (JWT, 15 min)
   */
  public generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn as any,
    });
  }

  /**
   * Verify Access Token
   */
  public verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
  }

  /**
   * Hash a raw refresh token for safe database storage
   */
  public hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Issue new Refresh Token, store hash in DB with 7-day expiration
   */
  public async createRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshExpiresInDays);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  /**
   * Refresh Token Rotation with reuse detection
   */
  public async rotateRefreshToken(oldRawToken: string): Promise<{ user: any; tokens: AuthTokens }> {
    const oldHash = this.hashToken(oldRawToken);

    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: oldHash },
      include: { user: true },
    });

    if (!existingToken) {
      throw new Error('Invalid refresh token');
    }

    // Reuse detection: If token is already revoked, someone may have stolen it
    if (existingToken.revokedAt) {
      logger.warn({ userId: existingToken.userId }, 'Refresh token reuse detected! Revoking all sessions.');
      await prisma.refreshToken.updateMany({
        where: { userId: existingToken.userId },
        data: { revokedAt: new Date() },
      });
      throw new Error('Refresh token reuse detected. Please log in again.');
    }

    // Check expiration
    if (new Date() > existingToken.expiresAt) {
      throw new Error('Refresh token expired');
    }

    const user = existingToken.user;
    if (!user.isActive || user.deletedAt) {
      throw new Error('User account is deactivated or deleted');
    }

    // Issue new raw token and calculate replacement hash
    const newRawToken = crypto.randomBytes(40).toString('hex');
    const newHash = this.hashToken(newRawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshExpiresInDays);

    // Transaction: revoke old token and insert new token
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: {
          revokedAt: new Date(),
          replacedByTokenHash: newHash,
        },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newHash,
          expiresAt,
        },
      }),
    ]);

    const accessToken = this.generateAccessToken({
      userId: user.id,
      role: user.role,
      phone: user.phone,
      email: user.email,
    });

    return {
      user,
      tokens: {
        accessToken,
        refreshToken: newRawToken,
        expiresIn: config.jwt.accessExpiresIn,
      },
    };
  }

  /**
   * Revoke a refresh token (Logout)
   */
  public async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Check account lockout status
   */
  public checkLockout(user: { failedLoginAttempts: number; lockoutUntil: Date | null }): { isLocked: boolean; remainingMinutes: number } {
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingMs = user.lockoutUntil.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
      return { isLocked: true, remainingMinutes };
    }
    return { isLocked: false, remainingMinutes: 0 };
  }

  /**
   * Record failed login attempt and trigger lockout if limit reached
   */
  public async handleFailedLogin(userId: string, currentAttempts: number): Promise<void> {
    const newAttempts = currentAttempts + 1;
    let lockoutUntil: Date | null = null;

    if (newAttempts >= config.rateLimit.maxLoginAttempts) {
      lockoutUntil = new Date(Date.now() + config.rateLimit.lockoutMinutes * 60 * 1000);
      logger.warn({ userId, attempts: newAttempts }, 'User account locked due to excessive failed logins');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newAttempts,
        lockoutUntil,
      },
    });
  }

  /**
   * Reset failed login counter on successful authentication
   */
  public async resetFailedLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });
  }
}

export const authService = new AuthService();
