import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { Application } from 'express';

describe('API Route Integration & Security Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/health', () => {
    it('returns 200 OK with system status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('Route Not Found (404 Handling)', () => {
    it('returns structured 404 for non-existent endpoint', async () => {
      const res = await request(app).get('/api/v1/non-existent-resource');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });
  });

  describe('POST /api/v1/auth/signup - Validation Pipeline', () => {
    it('rejects registration without required fields with 400', async () => {
      const res = await request(app).post('/api/v1/auth/signup').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toBeDefined();
    });

    it('rejects registration with invalid Ethiopian phone format', async () => {
      const res = await request(app).post('/api/v1/auth/signup').send({
        name: 'Dawit Test',
        phone: '123456', // Invalid phone
        password: 'Password123!',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects registration with short password (< 8 chars)', async () => {
      const res = await request(app).post('/api/v1/auth/signup').send({
        name: 'Dawit Test',
        phone: '0911223344',
        password: 'short', // Too short
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('IDOR & Authentication Protections', () => {
    it('denies unauthenticated requests to protected /requests endpoint with 401', async () => {
      const res = await request(app).get('/api/v1/requests');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('denies unauthenticated requests to admin /users endpoint with 401', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('denies requests with malformed or fake JWT tokens', async () => {
      const res = await request(app)
        .get('/api/v1/requests')
        .set('Authorization', 'Bearer invalid.token.payload');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('GET /api/docs', () => {
    it('serves Swagger UI endpoint', async () => {
      const res = await request(app).get('/api/docs/');
      // Swagger UI returns 200 or 301 redirect depending on trailing slash
      expect([200, 301, 302]).toContain(res.status);
    });
  });
});
