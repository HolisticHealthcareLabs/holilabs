import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    magicLink: { findUnique: jest.fn(), update: jest.fn() },
    patientUser: { update: jest.fn() },
  },
}));

jest.mock('@/lib/auth/patient-session', () => ({
  createPatientSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockMagicLink = {
  id: 'ml-1',
  tokenHash: expect.any(String),
  usedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
  patientUser: {
    id: 'pu-1',
    email: 'p@test.com',
    emailVerifiedAt: null,
    patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', mrn: 'MRN-001' },
  },
};

describe('GET /api/portal/auth/verify-email', () => {
  beforeEach(() => jest.clearAllMocks());

  it('redirects to portal dashboard on successful verification', async () => {
    (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue(mockMagicLink);
    (prisma.magicLink.update as jest.Mock).mockResolvedValue({});
    (prisma.patientUser.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/portal/auth/verify-email?token=valid-token-abc');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/portal/dashboard?verified=true');
  });

  it('redirects to login with error when token is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/portal/auth/verify-email');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=invalid_verification_token');
  });

  it('redirects with error when token not found in database', async () => {
    (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/portal/auth/verify-email?token=unknown');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=invalid_verification_token');
  });

  it('redirects with error when token is expired', async () => {
    (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue({
      ...mockMagicLink,
      expiresAt: new Date(Date.now() - 1000),
    });

    const req = new NextRequest('http://localhost:3000/api/portal/auth/verify-email?token=expired-token');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=verification_token_expired');
  });
});
