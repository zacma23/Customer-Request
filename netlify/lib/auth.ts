import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { HandlerEvent } from '@netlify/functions';
import { prisma } from './db';
import { AuthUser } from './types';
import { Role } from '@prisma/client';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'dev_jwt_access_secret_min_32_characters_123456';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_min_32_characters_678901';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: { userId: string; role: Role; phone: string; email?: string | null }): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): { userId: string; role: Role; phone: string; email?: string | null } | null {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as any;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as any;
  } catch {
    return null;
  }
}

export function extractTokenFromEvent(event: HandlerEvent): string | null {
  // 1. Authorization header: Bearer <token>
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Cookie header: accessToken=<token>
  const cookieHeader = event.headers['cookie'] || event.headers['Cookie'];
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, c) => {
      const [key, val] = c.trim().split('=');
      if (key && val) acc[key] = decodeURIComponent(val);
      return acc;
    }, {} as Record<string, string>);

    if (cookies.accessToken) {
      return cookies.accessToken;
    }
  }

  return null;
}

export async function getAuthUser(event: HandlerEvent): Promise<AuthUser | null> {
  const token = extractTokenFromEvent(event);
  if (!token) return null;

  const decoded = verifyAccessToken(token);
  if (!decoded || !decoded.userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        isPhoneVerified: true,
      },
    });

    if (!user || !user.isActive) return null;
    return user;
  } catch (err) {
    console.error('Error fetching auth user:', err);
    return null;
  }
}
