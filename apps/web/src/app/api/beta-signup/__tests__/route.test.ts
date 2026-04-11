import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    betaSignup: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    invitationCode: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    signupCounter: {
      upsert: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((_err: any, opts: any) =>
    new (require('next/server').NextResponse)(
      JSON.stringify({ error: opts?.userMessage || 'Error' }),
      { status: 500 }
    )
  ),
}));

const { POST } = require('../route');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('POST /api/beta-signup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates pending signup without invite code', async () => {
    (prisma.betaSignup.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.betaSignup.create as jest.Mock).mockResolvedValue({
      id: 'bs-1',
      email: 'doc@test.com',
      status: 'pending',
    });
    (prisma.signupCounter.upsert as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/beta-signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'doc@test.com',
        fullName: 'Dr. Test',
        role: 'doctor',
      }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.signup.status).toBe('pending');
  });

  it('returns 400 for invalid email', async () => {
    const req = new NextRequest('http://localhost:3000/api/beta-signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'bad-email', fullName: 'Dr. Test' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 for missing fullName', async () => {
    const req = new NextRequest('http://localhost:3000/api/beta-signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'doc@test.com' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 for already registered email', async () => {
    (prisma.betaSignup.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

    const req = new NextRequest('http://localhost:3000/api/beta-signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'doc@test.com', fullName: 'Dr. Test' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
