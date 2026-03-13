import { NextRequest } from 'next/server';
import crypto from 'crypto';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    patientPreferences: { upsert: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const TEST_SECRET = 'test-secret-key-for-unit-tests';

function encryptToken(patientId: string): string {
  const key = crypto.createHash('sha256').update(TEST_SECRET).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.alloc(16, 0));
  let encrypted = cipher.update(patientId, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

describe('GET /api/patients/preferences/opt-out', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, OPT_OUT_SECRET_KEY: TEST_SECRET };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 400 when token parameter is missing', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/patients/preferences/opt-out?type=sms'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/token/i);
  });

  it('returns 400 when type parameter is invalid', async () => {
    const token = encryptToken('patient-1');
    const req = new NextRequest(
      `http://localhost:3000/api/patients/preferences/opt-out?token=${token}&type=push`
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/type/i);
  });

  it('returns 400 when token is invalid or corrupted', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/patients/preferences/opt-out?token=invalidtoken&type=sms'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/invalid/i);
  });

  it('returns HTML confirmation page on successful SMS opt-out', async () => {
    const token = encryptToken('patient-1');
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      firstName: 'Maria',
      lastName: 'Lopez',
    });
    (prisma.patientPreferences.upsert as jest.Mock).mockResolvedValue({});
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest(
      `http://localhost:3000/api/patients/preferences/opt-out?token=${token}&type=sms`
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Maria Lopez');
    expect(prisma.patientPreferences.upsert).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});
