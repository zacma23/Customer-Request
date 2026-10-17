import type { Handler, HandlerEvent } from '@netlify/functions';
import { prisma } from '../lib/db';
import { json, error, unauthorized, handleOptions } from '../lib/response';
import {
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  getAuthUser,
} from '../lib/auth';
import { signupSchema, loginSchema, normalizePhoneNumber } from '../lib/validation';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  const path = event.path.replace(/\/?\.netlify\/functions\/auth\/?/, '').replace(/^\/api\/v1\/auth\/?/, '');

  try {
    // 1. POST /signup
    if (event.httpMethod === 'POST' && (path === 'signup' || path === '')) {
      const body = JSON.parse(event.body || '{}');
      const validated = signupSchema.safeParse(body);
      if (!validated.success) {
        return error(400, 'Validation failed', 'VALIDATION_ERROR', validated.error.flatten());
      }

      const { name, phone, email, password, companyName, address, city } = validated.data;
      const normalizedPhone = normalizePhoneNumber(phone);

      // Check unique phone
      const existingPhone = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });
      if (existingPhone) {
        return error(409, 'A user with this phone number already exists', 'PHONE_EXISTS');
      }

      // Check unique email if provided
      if (email && email.trim() !== '') {
        const existingEmail = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (existingEmail) {
          return error(409, 'A user with this email address already exists', 'EMAIL_EXISTS');
        }
      }

      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          name,
          phone: normalizedPhone,
          email: email && email.trim() !== '' ? email.toLowerCase().trim() : null,
          passwordHash,
          role: 'CLIENT',
          profile: {
            create: {
              companyName: companyName || null,
              address: address || null,
              city: city || 'Addis Ababa',
              preferredLanguage: 'en',
            },
          },
        },
        include: {
          profile: true,
        },
      });

      const accessToken = signAccessToken({
        userId: user.id,
        role: user.role,
        phone: user.phone,
        email: user.email,
      });
      const refreshToken = signRefreshToken({ userId: user.id });

      return json(201, {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          profile: user.profile,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    }

    // 2. POST /login
    if (event.httpMethod === 'POST' && path === 'login') {
      const body = JSON.parse(event.body || '{}');
      const validated = loginSchema.safeParse(body);
      if (!validated.success) {
        return error(400, 'Identifier and password are required', 'VALIDATION_ERROR');
      }

      const { identifier, password } = validated.data;
      const normalizedIdentifier = identifier.trim();

      // Find by phone or email
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: normalizePhoneNumber(normalizedIdentifier) },
            { email: normalizedIdentifier.toLowerCase() },
          ],
        },
        include: {
          profile: true,
        },
      });

      if (!user) {
        return error(401, 'Invalid phone/email or password', 'INVALID_CREDENTIALS');
      }

      if (!user.isActive) {
        return error(403, 'Your account is suspended. Contact support.', 'ACCOUNT_INACTIVE');
      }

      // Check lockout
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
        return error(
          429,
          `Account locked due to consecutive failed attempts. Try again in ${remainingMinutes} minutes.`,
          'ACCOUNT_LOCKED'
        );
      }

      const isValidPassword = await comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        const newAttempts = user.failedLoginAttempts + 1;
        const lockout = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            lockoutUntil: lockout,
          },
        });
        return error(401, 'Invalid phone/email or password', 'INVALID_CREDENTIALS');
      }

      // Reset failed attempts on success
      if (user.failedLoginAttempts > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockoutUntil: null },
        });
      }

      const accessToken = signAccessToken({
        userId: user.id,
        role: user.role,
        phone: user.phone,
        email: user.email,
      });
      const refreshToken = signRefreshToken({ userId: user.id });

      return json(200, {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          profile: user.profile,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    }

    // 3. GET /me
    if (event.httpMethod === 'GET' && (path === 'me' || path === '')) {
      const authUser = await getAuthUser(event);
      if (!authUser) {
        return unauthorized('You must be signed in to view your profile');
      }

      const fullUser = await prisma.user.findUnique({
        where: { id: authUser.id },
        include: {
          profile: true,
          channelLinks: true,
        },
      });

      return json(200, { user: fullUser });
    }

    // 4. POST /logout
    if (event.httpMethod === 'POST' && path === 'logout') {
      return json(200, { message: 'Logged out successfully' });
    }

    return error(404, `Auth endpoint not found: ${path}`, 'ROUTE_NOT_FOUND');
  } catch (err: any) {
    console.error('Auth function error:', err);
    return error(500, err?.message || 'Internal server error', 'SERVER_ERROR');
  }
};
