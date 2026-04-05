import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    betaSignup: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/email/resend', () => ({
  sendEmail: jest.fn().mockResolvedValue({ id: 'email-1' }),
}));

jest.mock('@/components/email/InviteEmail', () => ({
  InviteEmail: jest.fn(() => '<html>invite</html>'),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn() }
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { sendEmail } = require('@/lib/email/resend');

describe('POST /api/auth/invite/request', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates beta signup and sends confirmation email', async () => {
    (prisma.betaSignup.upsert as jest.Mock).mockResolvedValue({ id: 'signup-1' });

    const req = new NextRequest('http://localhost:3000/api/auth/invite/request', {
      method: 'POST',
      body: JSON.stringify({ email: 'doc@test.com', fullName: 'Dr. Test' }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.message).toBe('Access request received successfully');
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid email', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/invite/request', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-email', fullName: 'Dr. Test' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 for missing fullName', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/invite/request', {
      method: 'POST',
      body: JSON.stringify({ email: 'doc@test.com', fullName: '' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 500 on database error', async () => {
    (prisma.betaSignup.upsert as jest.Mock).mockRejectedValue(new Error('DB down'));

    const req = new NextRequest('http://localhost:3000/api/auth/invite/request', {
      method: 'POST',
      body: JSON.stringify({ email: 'doc@test.com', fullName: 'Dr. Test' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
