import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/referral', () => ({
  trackReferralInvitation: jest.fn(),
  getOrCreateReferralCode: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(),
}));

const { POST } = require('../route');
const { trackReferralInvitation, getOrCreateReferralCode } = require('@/lib/referral');
const { createAuditLog } = require('@/lib/audit');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@clinic.com', role: 'CLINICIAN', firstName: 'Ana', lastName: 'Lopez' },
  requestId: 'req-1',
};

const mockReferralCode = {
  id: 'ref-code-1',
  code: 'ANA2025',
};

describe('POST /api/referrals/invite', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends invitations to valid email addresses', async () => {
    (getOrCreateReferralCode as jest.Mock).mockResolvedValue(mockReferralCode);
    (trackReferralInvitation as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      refereeEmail: 'colleague@clinic.com',
      status: 'PENDING',
      invitedAt: new Date().toISOString(),
    });
    (createAuditLog as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/referrals/invite', {
      method: 'POST',
      body: JSON.stringify({ emails: ['colleague@clinic.com', 'other@example.com'] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.invitations).toHaveLength(2);
    expect(trackReferralInvitation).toHaveBeenCalledTimes(2);
  });

  it('returns 400 when emails array is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/referrals/invite', {
      method: 'POST',
      body: JSON.stringify({ emails: [] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/emails/i);
  });

  it('returns 400 when emails contains invalid addresses', async () => {
    const req = new NextRequest('http://localhost:3000/api/referrals/invite', {
      method: 'POST',
      body: JSON.stringify({ emails: ['valid@example.com', 'not-an-email'] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.invalidEmails).toContain('not-an-email');
  });

  it('includes referralUrl in response', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.holilabs.com';
    (getOrCreateReferralCode as jest.Mock).mockResolvedValue(mockReferralCode);
    (trackReferralInvitation as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      refereeEmail: 'x@y.com',
      status: 'PENDING',
      invitedAt: new Date().toISOString(),
    });
    (createAuditLog as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/referrals/invite', {
      method: 'POST',
      body: JSON.stringify({ emails: ['x@y.com'] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(data.referralUrl).toContain('ANA2025');
  });
});
