import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { OtpType } from '@prisma/client';
import { logger } from '../utils/logger';

export interface IOtpSender {
  sendOtp(destination: string, code: string, type: OtpType): Promise<void>;
}

export class ConsoleOtpSender implements IOtpSender {
  public async sendOtp(destination: string, code: string, type: OtpType): Promise<void> {
    logger.info(
      `\n=========================================\n` +
      `🔐 [DEV OTP DISPATCH]\n` +
      `Target: ${destination}\n` +
      `Type: ${type}\n` +
      `Code: ${code}\n` +
      `Valid for: 10 minutes\n` +
      `=========================================\n`
    );
  }
}

export class OtpService {
  private sender: IOtpSender;

  constructor(sender?: IOtpSender) {
    this.sender = sender || new ConsoleOtpSender();
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Generate and dispatch a 6-digit OTP
   */
  public async generateAndSendOtp(destination: string, type: OtpType): Promise<{ success: boolean; devCode?: string }> {
    // Generate secure 6-digit numeric code
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = this.hashCode(rawCode);

    // 10 minutes expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate prior unused OTPs for same target and type
    await prisma.otpCode.deleteMany({
      where: {
        phoneOrEmail: destination,
        type,
        usedAt: null,
      },
    });

    await prisma.otpCode.create({
      data: {
        phoneOrEmail: destination,
        codeHash,
        type,
        expiresAt,
      },
    });

    await this.sender.sendOtp(destination, rawCode, type);

    return {
      success: true,
      // Provide in development responses for seamless developer testing
      devCode: process.env.NODE_ENV !== 'production' ? rawCode : undefined,
    };
  }

  /**
   * Verify provided OTP code
   */
  public async verifyOtp(destination: string, code: string, type: OtpType): Promise<boolean> {
    const codeHash = this.hashCode(code.trim());

    const record = await prisma.otpCode.findFirst({
      where: {
        phoneOrEmail: destination,
        type,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return false;
    }

    if (new Date() > record.expiresAt) {
      return false;
    }

    if (record.attempts >= 5) {
      return false;
    }

    if (record.codeHash !== codeHash) {
      await prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    // Mark as used
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return true;
  }
}

export const otpService = new OtpService();
