/**
 * Smoke tests — verifies existing registration endpoints still behave correctly
 * after the queries/ restructure. No real DB calls are made; middleware response
 * shape is what we validate here.
 */
require('dotenv').config();
const request = require('supertest');
const express = require('express');

jest.mock('../db', () => ({ from: jest.fn() }));
jest.mock('../jwt', () => ({
  generateToken: jest.fn(),
  verifyToken: jest.fn(() => null),
  extractUserId: jest.fn(() => null),
}));

let app;

beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '1kb' }));

  const authRoutes = require('../routes/authRoutes');
  app.use('/api/auth', authRoutes);
});

describe('Existing auth routes — smoke tests', () => {
  test('POST /api/auth/register/initiate without token → 401', async () => {
    const res = await request(app)
      .post('/api/auth/register/initiate')
      .send({ turnstileToken: 'dummy' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/auth/register/complete without token → 401', async () => {
    const res = await request(app)
      .post('/api/auth/register/complete')
      .send({ registrationId: 'test', otp: '123456' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/auth/register/initiate with invalid Bearer token → 401', async () => {
    const res = await request(app)
      .post('/api/auth/register/initiate')
      .set('Authorization', 'Bearer not.a.real.token')
      .send({ turnstileToken: 'dummy' });
    expect(res.status).toBe(401);
  });
});
