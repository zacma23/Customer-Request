import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import multer from 'multer';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled API Exception');

  // Multer errors (file too large, invalid field)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: {
          message: 'File size exceeds maximum allowed limit (10 MB)',
          code: 'FILE_TOO_LARGE',
        },
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: 'UPLOAD_ERROR',
      },
    });
    return;
  }

  // Custom known business errors
  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const message = err.message || 'Internal Server Error';
  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 403 ? 'FORBIDDEN' : 'INTERNAL_SERVER_ERROR');

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
}
