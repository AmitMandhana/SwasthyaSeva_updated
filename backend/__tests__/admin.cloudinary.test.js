const request = require('supertest');
const express = require('express');

jest.mock('../db', () => ({
  from: jest.fn(),
}));
jest.mock('../jwt', () => {
  const jsonwebtoken = require('jsonwebtoken');
  return {
    generateToken: jest.fn((payload, opts) => jsonwebtoken.sign(payload, 'test-secret', { expiresIn: '1h', ...opts })),
    verifyToken: jest.fn((token) => { try { return jsonwebtoken.verify(token, 'test-secret'); } catch { return null; } }),
    extractUserId: jest.fn(),
  };
});
jest.mock('../queries/create/createActiveToken', () => ({ hashToken: jest.fn(() => 'hashed'), storeActiveToken: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../queries/read/getActiveTokens', () => ({ isTokenActive: jest.fn().mockResolvedValue(true) }));
jest.mock('../utils/ensureTable', () => ({
  ensureTable: jest.fn().mockResolvedValue(undefined),
  withTableGuard: jest.fn((queryFn) => queryFn()),
}));

jest.mock('../ratelimits/adminLogin', () => ({
  adminLoginRateLimit: (req, res, next) => next(),
}));

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(() => ({
      cloud_name: 'test_cloud',
      api_key: 'test_api_key_123',
      api_secret: 'test_api_secret_456',
    })),
    utils: {
      api_sign_request: jest.fn((paramsToSign, apiSecret) => 'mock_signature_123'),
    },
  },
}));

const supabase = require('../db');
const cloudinary = require('cloudinary');

let app;
beforeAll(() => {
  process.env.CLOUDINARY_URL = 'cloudinary://test_api_key_123:test_api_secret_456@test_cloud';
  
  app = express();
  app.use(express.json());
  const adminRoutes = require('../routes/adminRoutes');
  app.use('/api/admin', adminRoutes);
});

describe('Admin Cloudinary Signature Endpoint', () => {
  let adminToken;

  beforeAll(async () => {
    const bcrypt = require('bcrypt');
    
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          admin_id: 1,
          username: 'admin',
          password_hash: await bcrypt.hash('admin123', 1),
        },
        error: null,
      }),
    });

    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = loginRes.body.token;
  });

  describe('GET /api/admin/cloudinary-signature', () => {
    it('should return signature params when authenticated', async () => {
      const res = await request(app)
        .get('/api/admin/cloudinary-signature')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('signature');
      expect(res.body).toHaveProperty('api_key');
      expect(res.body).toHaveProperty('cloud_name');
      
      expect(typeof res.body.timestamp).toBe('number');
      expect(typeof res.body.signature).toBe('string');
      expect(typeof res.body.api_key).toBe('string');
      expect(typeof res.body.cloud_name).toBe('string');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get('/api/admin/cloudinary-signature');

      expect(res.status).toBe(401);
    });

    it('should generate different timestamps on subsequent calls', async () => {
      const res1 = await request(app)
        .get('/api/admin/cloudinary-signature')
        .set('Authorization', `Bearer ${adminToken}`);

      await new Promise(resolve => setTimeout(resolve, 1100));

      const res2 = await request(app)
        .get('/api/admin/cloudinary-signature')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.timestamp).not.toBe(res2.body.timestamp);
    });
  });
});
