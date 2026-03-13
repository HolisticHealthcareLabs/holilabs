import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    waitlistEntry: { upsert: jest.fn() },
  },
}));
jest.mock('@/lib/email/resend', () => ({
  isResendConfigured: jest.fn().mockReturnValue(false),
  sendWaitlistConfirmation: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  ),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockEntry = { id: 'wl-1', email: 'user@test.com', firstName: 'Alice', lastName: null, plan: null };

describe('POST /api/waitlist', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds user to waitlist and returns success', async () => {
    prisma.waitlistEntry.upsert.mockResolvedValue(mockEntry);
    const req = new NextRequest('http://localhost:3000/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', name: 'Alice Doe' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 400 when email is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/valid email/);
  });

  it('returns 400 when email is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ name: 'No Email' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('upserts existing entry with updated info', async () => {
    prisma.waitlistEntry.upsert.mockResolvedValue({ ...mockEntry, companyName: 'Acme Corp' });
    const req = new NextRequest('http://localhost:3000/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', organization: 'Acme Corp', plan: 'enterprise' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
