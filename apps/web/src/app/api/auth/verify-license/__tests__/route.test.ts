import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/medical-license-verification', () => ({
  verifyMedicalLicense: jest.fn(),
  createCredentialVerificationRecord: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const { POST } = require('../route');
const { verifyMedicalLicense } = require('@/lib/medical-license-verification');

const validBody = {
  firstName: 'Maria',
  lastName: 'Garcia',
  licenseNumber: 'CRM-12345',
  country: 'BR',
};

describe('POST /api/auth/verify-license', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns verification result for valid license', async () => {
    (verifyMedicalLicense as jest.Mock).mockResolvedValue({
      verified: true,
      status: 'VERIFIED',
      matchScore: 0.95,
      source: 'CFM',
      verificationNotes: 'Verified via CFM API',
      matchedData: { registrationNumber: 'CRM-12345' },
    });

    const req = new NextRequest('http://localhost:3000/api/auth/verify-license', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.result.verified).toBe(true);
    expect(json.result.matchedData).toBeDefined();
  });

  it('returns 400 for invalid country', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/verify-license', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, country: 'XX' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid request');
  });

  it('omits matchedData when not verified', async () => {
    (verifyMedicalLicense as jest.Mock).mockResolvedValue({
      verified: false,
      status: 'NOT_FOUND',
      matchScore: 0,
      source: 'CFM',
      matchedData: null,
    });

    const req = new NextRequest('http://localhost:3000/api/auth/verify-license', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(json.result.matchedData).toBeUndefined();
  });

  it('returns 500 on service error', async () => {
    (verifyMedicalLicense as jest.Mock).mockRejectedValue(new Error('Service timeout'));

    const req = new NextRequest('http://localhost:3000/api/auth/verify-license', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
