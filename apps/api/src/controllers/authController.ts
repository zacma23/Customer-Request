import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authService } from '../services/auth';
import { otpService } from '../services/otp';
import { normalizePhoneNumber } from '../utils/phone';
import { config } from '../config';
import { recordAuditLog } from '../utils/audit';
import { ChannelType, OtpType, Role } from '@prisma/client';
import crypto from 'crypto';

export class AuthController {
  /**
   * Client Signup
   */
  public async signup(req: Request, res: Response): Promise<void> {
    const { name, phone, email, password, address, city, companyName } = req.body;
    const normalizedPhone = normalizePhoneNumber(phone);
    const cleanEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : null;

    // Check if phone already registered
    const existingPhone = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existingPhone) {
      res.status(400).json({
        success: false,
        error: { message: 'A user with this phone number already exists', code: 'PHONE_EXISTS' },
      });
      return;
    }

    // Check if email already registered (if provided)
    if (cleanEmail) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (existingEmail) {
        res.status(400).json({
          success: false,
          error: { message: 'A user with this email address already exists', code: 'EMAIL_EXISTS' },
        });
        return;
      }
    }

    const passwordHash = await authService.hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        phone: normalizedPhone,
        email: cleanEmail,
        passwordHash,
        role: Role.CLIENT,
        isActive: true,
        isPhoneVerified: false,
        profile: {
          create: {
            address: address || null,
            city: city || 'Addis Ababa',
            companyName: companyName || null,
          },
        },
      },
      include: { profile: true },
    });

    // Trigger phone verification OTP
    const otpResult = await otpService.generateAndSendOtp(normalizedPhone, OtpType.PHONE_VERIFY);

    // Issue initial tokens
    const accessToken = authService.generateAccessToken({
      userId: user.id,
      role: user.role,
      phone: user.phone,
      email: user.email,
    });
    const refreshToken = await authService.createRefreshToken(user.id);

    // Set HTTP-only secure cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await recordAuditLog({
      userId: user.id,
      action: 'CLIENT_SIGNUP',
      resourceType: 'User',
      resourceId: user.id,
      details: { phone: user.phone, email: user.email },
      req,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isPhoneVerified: user.isPhoneVerified,
          profile: user.profile,
        },
        tokens: {
          accessToken,
          expiresIn: config.jwt.accessExpiresIn,
        },
        devOtpCode: otpResult.devCode,
      },
      message: 'Account created successfully. Please verify your phone number.',
    });
  }

  /**
   * User Login (Phone or Email + Password)
   */
  public async login(req: Request, res: Response): Promise<void> {
    const { identifier, password } = req.body;
    const cleanIdentifier = identifier.trim();

    // Determine if identifier is phone or email
    const isEmail = cleanIdentifier.includes('@');
    const lookupPhone = normalizePhoneNumber(cleanIdentifier);

    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: cleanIdentifier.toLowerCase(), deletedAt: null }
        : { phone: lookupPhone, deletedAt: null },
      include: { profile: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid phone/email or password', code: 'INVALID_CREDENTIALS' },
      });
      return;
    }

    // Check account lockout
    const lockout = authService.checkLockout(user);
    if (lockout.isLocked) {
      res.status(423).json({
        success: false,
        error: {
          message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${lockout.remainingMinutes} minute(s).`,
          code: 'ACCOUNT_LOCKED',
        },
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: { message: 'Your account has been deactivated. Please contact support.', code: 'ACCOUNT_DEACTIVATED' },
      });
      return;
    }

    const isMatch = await authService.verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      await authService.handleFailedLogin(user.id, user.failedLoginAttempts);
      res.status(401).json({
        success: false,
        error: { message: 'Invalid phone/email or password', code: 'INVALID_CREDENTIALS' },
      });
      return;
    }

    // Reset failed login counter on success
    await authService.resetFailedLogin(user.id);

    const accessToken = authService.generateAccessToken({
      userId: user.id,
      role: user.role,
      phone: user.phone,
      email: user.email,
    });
    const refreshToken = await authService.createRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await recordAuditLog({
      userId: user.id,
      action: 'USER_LOGIN',
      resourceType: 'User',
      resourceId: user.id,
      req,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isPhoneVerified: user.isPhoneVerified,
          profile: user.profile,
        },
        tokens: {
          accessToken,
          expiresIn: config.jwt.accessExpiresIn,
        },
      },
    });
  }

  /**
   * Refresh Token Rotation
   */
  public async refreshToken(req: Request, res: Response): Promise<void> {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawToken) {
      res.status(401).json({
        success: false,
        error: { message: 'No refresh token provided', code: 'MISSING_REFRESH_TOKEN' },
      });
      return;
    }

    try {
      const result = await authService.rotateRefreshToken(rawToken);

      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        data: {
          tokens: {
            accessToken: result.tokens.accessToken,
            expiresIn: result.tokens.expiresIn,
          },
          user: {
            id: result.user.id,
            name: result.user.name,
            phone: result.user.phone,
            email: result.user.email,
            role: result.user.role,
          },
        },
      });
    } catch (err: any) {
      res.clearCookie('refreshToken');
      res.status(401).json({
        success: false,
        error: { message: err.message || 'Invalid refresh token', code: 'REFRESH_FAILED' },
      });
    }
  }

  /**
   * User Logout
   */
  public async logout(req: Request, res: Response): Promise<void> {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (rawToken) {
      await authService.revokeRefreshToken(rawToken);
    }
    res.clearCookie('refreshToken');

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'USER_LOGOUT',
        resourceType: 'User',
        resourceId: req.user.id,
        req,
      });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  }

  /**
   * Get Current Authenticated Profile
   */
  public async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
        channelLinks: {
          select: {
            id: true,
            channelType: true,
            channelUsername: true,
            isVerified: true,
            linkedAt: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isPhoneVerified: user.isPhoneVerified,
          profile: user.profile,
          channelLinks: user.channelLinks,
        },
      },
    });
  }

  /**
   * Request OTP (for phone verification or password reset)
   */
  public async requestOtp(req: Request, res: Response): Promise<void> {
    const { destination, type } = req.body;
    const cleanDest = destination.includes('@')
      ? destination.trim().toLowerCase()
      : normalizePhoneNumber(destination);

    const otpResult = await otpService.generateAndSendOtp(cleanDest, type as OtpType);

    res.json({
      success: true,
      message: `OTP code dispatched to ${destination}`,
      devCode: otpResult.devCode,
    });
  }

  /**
   * Verify Phone OTP
   */
  public async verifyPhoneOtp(req: Request, res: Response): Promise<void> {
    const { destination, code } = req.body;
    const normalized = normalizePhoneNumber(destination);

    const isValid = await otpService.verifyOtp(normalized, code, OtpType.PHONE_VERIFY);
    if (!isValid) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid or expired OTP code', code: 'INVALID_OTP' },
      });
      return;
    }

    await prisma.user.updateMany({
      where: { phone: normalized },
      data: { isPhoneVerified: true },
    });

    res.json({
      success: true,
      message: 'Phone number verified successfully',
    });
  }

  /**
   * Reset Password with OTP
   */
  public async resetPassword(req: Request, res: Response): Promise<void> {
    const { destination, code, newPassword } = req.body;
    const cleanDest = destination.includes('@')
      ? destination.trim().toLowerCase()
      : normalizePhoneNumber(destination);

    const isValid = await otpService.verifyOtp(cleanDest, code, OtpType.PASSWORD_RESET);
    if (!isValid) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid or expired OTP code', code: 'INVALID_OTP' },
      });
      return;
    }

    const passwordHash = await authService.hashPassword(newPassword);

    const isEmail = cleanDest.includes('@');
    await prisma.user.updateMany({
      where: isEmail ? { email: cleanDest } : { phone: cleanDest },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully. You may now log in.',
    });
  }

  /**
   * Generate 6-digit one-time code to link Telegram or WhatsApp
   */
  public async generateChannelLinkCode(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
      return;
    }

    const channelType = ((req.params.channel as string) || 'TELEGRAM').toUpperCase() as ChannelType;
    const oneTimeCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create or update pending link record
    await prisma.channelLink.upsert({
      where: {
        id: (await prisma.channelLink.findFirst({
          where: { userId: req.user.id, channelType },
          select: { id: true },
        }))?.id || 'new-uuid',
      },
      update: {
        oneTimeCode,
        isVerified: false,
      },
      create: {
        userId: req.user.id,
        channelType,
        oneTimeCode,
        isVerified: false,
      },
    });

    res.json({
      success: true,
      data: {
        channelType,
        oneTimeCode,
        instructions:
          channelType === ChannelType.TELEGRAM
            ? `Open @${config.telegram.botToken ? 'ZacmaSupportBot' : 'your_telegram_bot'} on Telegram and send: /link ${oneTimeCode}`
            : `Send message: /link ${oneTimeCode} to our WhatsApp support number.`,
      },
    });
  }
}

export const authController = new AuthController();
