import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/referral', () => ({
  getOrCreateReferralCode: jest.fn(),
  getReferralStats: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(),
}));

const { GET } = require('../route');
const { getOrCreateReferralCode, getReferralStats } = require('@/lib/referral');
const { createAuditLog } = require('@/lib/audit');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@clinic.com', role: 'CLINICIAN', firstName: 'Ana', lastName: 'Lopez' },
  requestId: 'req-1',
};

const mockReferralCode = {
  id: 'ref-code-1',
  code: 'ANA2025',
  rewardType: 'DISCOUNT',
  rewardValue: 10,
  requiredReferrals: 3,
  createdAt: new Date('2025-01-01'),
};

const mockStats = {
  totalInvited: 5,
  totalConverted: 2,
  pendingRewards: 1,
};

describe('GET /api/referrals/code', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns referral code and stats for the user', async () => {
    (getOrCreateReferralCode as jest.Mock).mockResolvedValue(mockReferralCode);
    (getReferralStats as jest.Mock).mockResolvedValue(mockStats);
    (createAuditLog as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/referrals/code');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.referralCode.code).toBe('ANA2025');
    expect(data.stats).toEqual(mockStats);
  });

  it('calls getOrCreateReferralCode with user id and name', async () => {
    (getOrCreateReferralCode as jest.Mock).mockResolvedValue(mockReferralCode);
    (getReferralStats as jest.Mock).mockResolvedValue(mockStats);
    (createAuditLog as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/referrals/code');
    await GET(req, mockContext);

    expect(getOrCreateReferralCode).toHaveBeenCalledWith('clinician-1', 'Ana', 'Lopez');
  });

  it('emits an audit log on access', async () => {
    (getOrCreateReferralCode as jest.Mock).mockResolvedValue(mockReferralCode);
    (getReferralStats as jest.Mock).mockResolvedValue(mockStats);
    (createAuditLog as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/referrals/code');
    await GET(req, mockContext);

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'READ', resource: 'ReferralCode' }),
      req
    );
  });

  it('excludes sensitive fields from response', async () => {
    (getOrCreateReferralCode as jest.Mock).mockResolvedValue({ ...mockReferralCode, userId: 'clinician-1' });
    (getReferralStats as jest.Mock).mockResolvedValue(mockStats);
    (createAuditLog as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/referrals/code');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.referralCode).not.toHaveProperty('userId');
  });
});
