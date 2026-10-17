export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Customer Request & Feedback Management System API',
    version: '1.0.0',
    description: 'Production-ready REST API for all-in-one business operations, client request tracking, Claude AI automation, and Telegram/WhatsApp bots.',
    contact: {
      name: 'Zacma Technologies Engineering',
      email: 'engineering@zacma.tech',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Version 1 API Endpoint',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '15-minute JWT Access Token passed in the Authorization header: Bearer <token>',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: '7-day rotating HTTP-only secure refresh token cookie',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Validation failed' },
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Bethlehem Haile' },
          phone: { type: 'string', example: '+251911001122' },
          email: { type: 'string', example: 'betty@example.com' },
          role: { type: 'string', enum: ['CLIENT', 'STAFF', 'ADMIN', 'SUPER_ADMIN'] },
          isPhoneVerified: { type: 'boolean', example: true },
        },
      },
      ServiceRequest: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          requestNumber: { type: 'string', example: 'REQ-2026-0001' },
          title: { type: 'string', example: 'Online Fashion Boutique with Telebirr & CBE Payment' },
          description: { type: 'string' },
          status: {
            type: 'string',
            enum: [
              'PENDING',
              'APPROVED',
              'MEETING_SCHEDULED',
              'AWAITING_PAYMENT',
              'PROOF_SUBMITTED',
              'VERIFIED',
              'IN_PROGRESS',
              'COMPLETED',
              'REJECTED',
              'CLOSED',
            ],
          },
          priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
          aiCategory: { type: 'string', example: 'ECOMMERCE' },
          aiSentiment: { type: 'string', example: 'Positive' },
          aiLanguage: { type: 'string', example: 'English' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/auth/signup': {
      post: {
        summary: 'Register client account with Ethiopian / International phone',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'phone', 'password', 'confirmPassword'],
                properties: {
                  name: { type: 'string', example: 'Dawit Tadesse' },
                  phone: { type: 'string', example: '+251912345678' },
                  email: { type: 'string', example: 'dawit@example.com' },
                  password: { type: 'string', example: 'SecurePassword123!' },
                  confirmPassword: { type: 'string', example: 'SecurePassword123!' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Account created with JWT tokens and verification OTP' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login with phone/email and password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identifier', 'password'],
                properties: {
                  identifier: { type: 'string', example: '+251911001122' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Authenticated successfully' },
          '423': { description: 'Account locked due to consecutive failed attempts' },
        },
      },
    },
    '/requests': {
      get: {
        summary: 'List service requests with pagination, filter, search, and sorting',
        tags: ['Requests'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Paginated list of service requests' },
        },
      },
      post: {
        summary: 'Submit new service request (Client)',
        tags: ['Requests'],
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Request created and classified by Claude AI' },
        },
      },
    },
    '/reports/dashboard': {
      get: {
        summary: 'Get dashboard statistics, revenue, and SLA response time',
        tags: ['Reports & Admin'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Executive dashboard analytics metrics' },
        },
      },
    },
    '/webhooks/telegram': {
      post: {
        summary: 'Telegram bot webhook',
        tags: ['Bots & Webhooks'],
        responses: { '200': { description: 'Acknowledged' } },
      },
    },
    '/webhooks/whatsapp': {
      get: {
        summary: 'WhatsApp Cloud API webhook verification challenge',
        tags: ['Bots & Webhooks'],
        responses: { '200': { description: 'Challenge returned' } },
      },
      post: {
        summary: 'WhatsApp Cloud API inbound events',
        tags: ['Bots & Webhooks'],
        responses: { '200': { description: 'Event received' } },
      },
    },
    '/realtime/stream': {
      get: {
        summary: 'Server-Sent Events (SSE) real-time feed',
        tags: ['Real-time'],
        parameters: [{ name: 'token', in: 'query', schema: { type: 'string' } }],
        responses: {
          '200': { description: 'EventStream stream connected' },
        },
      },
    },
  },
};
