import { Router, Request, Response } from 'express';
import { sseManager } from '../realtime/sse';
import { authService } from '../services/auth';
import { prisma } from '../utils/prisma';
import crypto from 'crypto';

const router = Router();

router.get('/stream', async (req: Request, res: Response) => {
  // Support both header Bearer and query param token (for EventSource)
  const token =
    (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.substring(7)) ||
    (req.query.token as string);

  if (!token) {
    res.status(401).json({ success: false, error: { message: 'Authentication token required for real-time stream', code: 'UNAUTHORIZED' } });
    return;
  }

  try {
    const payload = authService.verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(403).json({ success: false, error: { message: 'Account is deactivated', code: 'FORBIDDEN' } });
      return;
    }

    const clientId = `${user.id}-${crypto.randomBytes(4).toString('hex')}`;
    const client = sseManager.registerClient(clientId, user.id, user.role, res);

    // If client specified roomId in query (e.g. current request detail view)
    if (req.query.roomId) {
      sseManager.joinRoom(clientId, String(req.query.roomId));
    }

    req.on('close', () => {
      sseManager.removeClient(clientId);
    });
  } catch (err: any) {
    res.status(401).json({ success: false, error: { message: 'Invalid real-time token', code: 'INVALID_TOKEN' } });
  }
});

export default router;
