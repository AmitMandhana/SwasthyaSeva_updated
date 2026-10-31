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

const supabase = require('../db');

let app;
beforeAll(() => {
  app = express();
  app.use(express.json());
  const adminRoutes = require('../routes/adminRoutes');
  app.use('/api/admin', adminRoutes);
});

describe('Admin Lookup Endpoints', () => {
  let adminToken;

  beforeAll(async () => {
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    
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

  describe('GET /api/admin/specializations', () => {
    beforeEach(() => {
      const mockSpecializations = [
        { specialization_code: 'MBBS', name: 'Bachelor of Medicine, Bachelor of Surgery' },
        { specialization_code: 'BDS', name: 'Bachelor of Dental Surgery' },
        { specialization_code: 'MD_GEN_MED', name: 'MD (General Medicine)' },
        { specialization_code: 'MS_GEN_SURG', name: 'MS (General Surgery)' },
        { specialization_code: 'DM_CARDIO', name: 'DM (Cardiology)' },
        { specialization_code: 'MCH_NEURO', name: 'MCh (Neurosurgery)' },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockSpecializations,
          error: null,
        }),
      });
    });

    it('should return all specializations when authenticated', async () => {
      const res = await request(app)
        .get('/api/admin/specializations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('specializations');
      expect(Array.isArray(res.body.specializations)).toBe(true);
      expect(res.body.specializations.length).toBeGreaterThan(0);
      
      const firstSpec = res.body.specializations[0];
      expect(firstSpec).toHaveProperty('specialization_code');
      expect(firstSpec).toHaveProperty('name');
    });

    it('should include base degrees (MBBS, BDS)', async () => {
      const res = await request(app)
        .get('/api/admin/specializations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const codes = res.body.specializations.map(s => s.specialization_code);
      expect(codes).toContain('MBBS');
      expect(codes).toContain('BDS');
    });

    it('should include postgrad degrees (MD_*, MS_*)', async () => {
      const res = await request(app)
        .get('/api/admin/specializations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const codes = res.body.specializations.map(s => s.specialization_code);
      expect(codes.some(c => c.startsWith('MD_'))).toBe(true);
      expect(codes.some(c => c.startsWith('MS_'))).toBe(true);
    });

    it('should include super-specializations (DM_*, MCh_*)', async () => {
      const res = await request(app)
        .get('/api/admin/specializations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const codes = res.body.specializations.map(s => s.specialization_code);
      expect(codes.some(c => c.startsWith('DM_'))).toBe(true);
      expect(codes.some(c => c.startsWith('MCH_'))).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get('/api/admin/specializations');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/tags', () => {
    beforeEach(() => {
      const mockTags = [
        { tag_code: 'PED', name: 'Pediatrician' },
        { tag_code: 'PSY', name: 'Psychiatrist' },
        { tag_code: 'DERM', name: 'Dermatologist' },
        { tag_code: 'ORTHO', name: 'Orthopedic surgeons' },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTags,
          error: null,
        }),
      });
    });

    it('should return all tags when authenticated', async () => {
      const res = await request(app)
        .get('/api/admin/tags')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tags');
      expect(Array.isArray(res.body.tags)).toBe(true);
      expect(res.body.tags.length).toBeGreaterThan(0);
      
      const firstTag = res.body.tags[0];
      expect(firstTag).toHaveProperty('tag_code');
      expect(firstTag).toHaveProperty('name');
    });

    it('should include expected tags (PED, PSY, DERM, etc.)', async () => {
      const res = await request(app)
        .get('/api/admin/tags')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const codes = res.body.tags.map(t => t.tag_code);
      expect(codes).toContain('PED');
      expect(codes).toContain('PSY');
      expect(codes).toContain('DERM');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get('/api/admin/tags');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/extra-qualifications', () => {
    beforeEach(() => {
      const mockExtraQuals = [
        { qualification_code: 'FELLOW_INTERVENT_CARDIO', name: 'Fellowship in Interventional Cardiology', type: 'fellowship' },
        { qualification_code: 'PGDPLM_ANAES', name: 'Anaesthesiology (D.A.)', type: 'diploma' },
        { qualification_code: 'PDCC_ORGAN_TX_ANAES', name: 'PDCC in Organ Transplant Anaesthesia', type: 'pdcc' },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockExtraQuals,
          error: null,
        }),
      });
    });

    it('should return all extra qualifications when authenticated', async () => {
      const res = await request(app)
        .get('/api/admin/extra-qualifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('extraQualifications');
      expect(Array.isArray(res.body.extraQualifications)).toBe(true);
      expect(res.body.extraQualifications.length).toBeGreaterThan(0);
      
      const first = res.body.extraQualifications[0];
      expect(first).toHaveProperty('qualification_code');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('type');
      expect(['fellowship', 'diploma', 'pdcc']).toContain(first.type);
    });

    it('should include fellowships', async () => {
      const res = await request(app)
        .get('/api/admin/extra-qualifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const fellowships = res.body.extraQualifications.filter(q => q.type === 'fellowship');
      expect(fellowships.length).toBeGreaterThan(0);
    });

    it('should include diplomas', async () => {
      const res = await request(app)
        .get('/api/admin/extra-qualifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const diplomas = res.body.extraQualifications.filter(q => q.type === 'diploma');
      expect(diplomas.length).toBeGreaterThan(0);
    });

    it('should include PDCCs', async () => {
      const res = await request(app)
        .get('/api/admin/extra-qualifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const pdccs = res.body.extraQualifications.filter(q => q.type === 'pdcc');
      expect(pdccs.length).toBeGreaterThan(0);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get('/api/admin/extra-qualifications');

      expect(res.status).toBe(401);
    });
  });
});
