import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`🚀 API Server running on ${config.apiBaseUrl} [env: ${config.env}]`);
  logger.info(`📚 Swagger Documentation available at ${config.apiBaseUrl}/api/docs`);
});

// Graceful Shutdown
async function handleShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
      process.exit(0);
    } catch (err: any) {
      logger.error({ err }, 'Error during database disconnect');
      process.exit(1);
    }
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    logger.error('Forceful shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
