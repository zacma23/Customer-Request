import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { generalApiLimiter } from './middleware/rateLimiter';
import { openApiSpec } from './docs/openapi';

// Route imports
import authRoutes from './routes/authRoutes';
import requestRoutes from './routes/requestRoutes';
import messageRoutes from './routes/messageRoutes';
import meetingRoutes from './routes/meetingRoutes';
import paymentRoutes from './routes/paymentRoutes';
import feedbackRoutes from './routes/feedbackRoutes';
import aiRoutes from './routes/aiRoutes';
import templateRoutes from './routes/templateRoutes';
import settingRoutes from './routes/settingRoutes';
import userRoutes from './routes/userRoutes';
import serviceRoutes from './routes/serviceRoutes';
import fileRoutes from './routes/fileRoutes';
import webhookRoutes from './routes/webhookRoutes';
import reportRoutes from './routes/reportRoutes';
import realtimeRoutes from './routes/realtimeRoutes';

export function createApp(): Application {
  const app = express();

  // 1. Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Permissive for local Swagger and Vite dev
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // 2. CORS configuration with credentials support
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow mobile apps, postman, and curl (no origin) or allowed origins
        if (!origin || config.corsOrigins.includes(origin) || config.isDev) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not permitted by CORS allowlist`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Telegram-Bot-Api-Secret-Token', 'X-Hub-Signature-256'],
    })
  );

  // 3. Body and Cookie Parsers
  app.use(cookieParser(config.jwt.cookieSecret));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Request Logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path !== '/api/v1/realtime/stream' && req.path !== '/api/health') {
        logger.info(
          {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
          },
          'HTTP Request'
        );
      }
    });
    next();
  });

  // 5. Health Check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: config.env,
      version: '1.0.0',
    });
  });

  // 6. OpenAPI / Swagger Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // 7. General Rate Limiter on API routes
  app.use('/api/v1', generalApiLimiter);

  // 8. Versioned REST API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/requests', requestRoutes);
  app.use('/api/v1/messages', messageRoutes);
  app.use('/api/v1/meetings', meetingRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/feedbacks', feedbackRoutes);
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1/templates', templateRoutes);
  app.use('/api/v1/settings', settingRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/services', serviceRoutes);
  app.use('/api/v1/files', fileRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/realtime', realtimeRoutes);

  // 9. 404 Route Not Found
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { message: `Route ${req.method} ${req.path} not found`, code: 'ROUTE_NOT_FOUND' },
    });
  });

  // 10. Global Centralized Error Handler
  app.use(errorHandler);

  return app;
}
