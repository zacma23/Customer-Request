import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * Strict Rate Limiter for Login and Registration endpoints
 * Prevents credential brute-forcing
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * Strict Rate Limiter for OTP Generation
 */
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 OTP requests per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many OTP requests. Please wait an hour before requesting more codes.',
      code: 'OTP_RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * General API Rate Limiter
 */
export const generalApiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP. Please slow down.',
      code: 'API_RATE_LIMIT_EXCEEDED',
    },
  },
});
