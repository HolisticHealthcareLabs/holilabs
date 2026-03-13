import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashed'),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
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
const { prisma } = require('@/lib/prisma');

describe('POST /api/onboarding/complete', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates user and workspace on valid input', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue({
      user: { id: 'u1', email: 'doc@test.com' },
      workspace: { id: 'ws1', slug: 'test-clinic-abc123' },
    });

    const req = new NextRequest('http://localhost:3000/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({
        leadId: 'lead-1',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.userId).toBe('u1');
    expect(json.workspaceSlug).toBe('test-clinic-abc123');
  });

  it('returns 400 for password mismatch', async () => {
    const req = new NextRequest('http://localhost:3000/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({
        leadId: 'lead-1',
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass!',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const req = new NextRequest('http://localhost:3000/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({
        leadId: 'lead-1',
        password: 'short',
        confirmPassword: 'short',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 404 when lead not found', async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('NOT_FOUND'));

    const req = new NextRequest('http://localhost:3000/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({
        leadId: 'nonexistent',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });
});
