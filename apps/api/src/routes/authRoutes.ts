import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimiter';
import {
  signupSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from '../validators';

const router = Router();

router.post('/signup', authRateLimiter, validateBody(signupSchema), (req, res) => authController.signup(req, res));
router.post('/login', authRateLimiter, validateBody(loginSchema), (req, res) => authController.login(req, res));
router.post('/refresh', (req, res) => authController.refreshToken(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', authenticate, (req, res) => authController.me(req, res));

// OTP & Password Recovery
router.post('/request-otp', otpRateLimiter, validateBody(requestOtpSchema), (req, res) => authController.requestOtp(req, res));
router.post('/verify-phone', validateBody(verifyOtpSchema), (req, res) => authController.verifyPhoneOtp(req, res));
router.post('/reset-password', validateBody(resetPasswordSchema), (req, res) => authController.resetPassword(req, res));

// Bot Linking
router.post('/link-code/:channel', authenticate, (req, res) => authController.generateChannelLinkCode(req, res));

export default router;
