import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/referral', () => ({
  validateReferralCode: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST } = require('../route');
const { validateReferralCode } = require('@/lib/referral');

const mockReferralCode = {
  id: 'ref-1',
  code: 'HOLI123',
  rewardType: 'FREE_MONTHS',
  rewardValue: 3,
  user: {
    firstName: 'Dr.',
    lastName: 'Smith',
    specialty: 'Internal Medicine',
  },
};

describe('POST /api/referrals/validate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates a valid referral code', async () => {
    (validateReferralCode as jest.Mock).mockResolvedValue(mockReferralCode);

    const req = new NextRequest('http://localhost:3000/api/referrals/validate', {
      method: 'POST',
      body: JSON.stringify({ code: 'HOLI123' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.valid).toBe(true);
    expect(data.referralCode.code).toBe('HOLI123');
    expect(data.referralCode.reward.description).toContain('3 months');
  });

  it('returns 400 when code is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/referrals/validate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing required field: code');
  });

  it('returns 404 for invalid or expired code', async () => {
    (validateReferralCode as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/referrals/validate', {
      method: 'POST',
      body: JSON.stringify({ code: 'INVALID' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.valid).toBe(false);
    expect(data.error).toBe('Invalid or expired referral code');
  });

  it('returns 500 on unexpected error', async () => {
    (validateReferralCode as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

    const req = new NextRequest('http://localhost:3000/api/referrals/validate', {
      method: 'POST',
      body: JSON.stringify({ code: 'HOLI123' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
