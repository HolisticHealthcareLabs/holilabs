import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/referral', () => ({
  claimReferralReward: jest.fn(),
  checkAndGrantReward: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    referralReward: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(),
}));

const { GET, POST } = require('../route');
const { claimReferralReward, checkAndGrantReward } = require('@/lib/referral');
const { prisma } = require('@/lib/prisma');
const { createAuditLog } = require('@/lib/audit');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@clinic.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockReward = {
  id: 'reward-1',
  rewardType: 'DISCOUNT',
  rewardValue: 15,
  rewardDescription: '15% off next month',
  status: 'AVAILABLE',
  earnedAt: new Date().toISOString(),
  claimedAt: null,
  expiresAt: null,
};

describe('GET /api/referrals/rewards', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns rewards and eligibility check for user', async () => {
    (checkAndGrantReward as jest.Mock).mockResolvedValue({ eligible: false });
    (prisma.referralReward.findMany as jest.Mock).mockResolvedValue([mockReward]);
    (createAuditLog as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/referrals/rewards');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.rewards).toHaveLength(1);
    expect(data.eligibilityCheck).toEqual({ eligible: false });
    expect(checkAndGrantReward).toHaveBeenCalledWith('clinician-1');
  });

  it('returns empty array when user has no rewards', async () => {
    (checkAndGrantReward as jest.Mock).mockResolvedValue({ eligible: false });
    (prisma.referralReward.findMany as jest.Mock).mockResolvedValue([]);
    (createAuditLog as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/referrals/rewards');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.rewards).toHaveLength(0);
  });
});

describe('POST /api/referrals/rewards', () => {
  beforeEach(() => jest.clearAllMocks());

  it('claims a reward successfully', async () => {
    const claimedReward = { ...mockReward, status: 'CLAIMED', claimedAt: new Date().toISOString() };
    (claimReferralReward as jest.Mock).mockResolvedValue(claimedReward);
    (createAuditLog as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/referrals/rewards', {
      method: 'POST',
      body: JSON.stringify({ rewardId: 'reward-1' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.reward.id).toBe('reward-1');
    expect(claimReferralReward).toHaveBeenCalledWith('reward-1', 'clinician-1');
  });

  it('returns 400 when rewardId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/referrals/rewards', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/rewardId/i);
  });
});
