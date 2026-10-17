import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from workspace root or local .env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  port: parseInt(process.env.PORT || '5000', 10),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
  webBaseUrl: process.env.WEB_BASE_URL || 'http://localhost:5173',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/crm_db?schema=public',

  // Authentication & Security
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_super_secret_access_key_min_32_characters_12345',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_super_secret_refresh_key_min_32_characters_67890',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresInDays: 7,
    cookieSecret: process.env.COOKIE_SECRET || 'cookie_salt_secret_12345',
  },

  // CORS
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(',').map((s) => s.trim()),

  // Super Admin Credentials
  superAdmin: {
    name: process.env.SUPER_ADMIN_NAME || 'System Super Admin',
    phone: process.env.SUPER_ADMIN_PHONE || '+251911223344',
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@zacma.tech',
    password: process.env.SUPER_ADMIN_PASSWORD || 'AdminSecurePassword123!',
  },

  // File Storage
  storage: {
    driver: (process.env.STORAGE_DRIVER || 'local') as 'local' | 's3',
    localPath: process.env.LOCAL_STORAGE_PATH || path.resolve(process.cwd(), 'uploads'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ],
  },

  // Anthropic Claude AI
  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
  },

  // Telegram Bot
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || 'dev_telegram_secret',
  },

  // WhatsApp Cloud API
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'dev_whatsapp_verify_token',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
  },

  // Rate Limiting & Lockout
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutMinutes: parseInt(process.env.LOCKOUT_TIME_MINUTES || '15', 10),
  },

  // Timezone
  timezone: process.env.APP_TIMEZONE || 'Africa/Addis_Ababa',
};
