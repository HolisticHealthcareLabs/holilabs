/**
 * POST /api/calendar/apple/connect - Apple CalDAV connection tests
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    calendarIntegration: { upsert: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/calendar/token-encryption', () => ({
  encryptToken: jest.fn().mockReturnValue('encrypted-password'),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  ),
}));

const originalFetch = global.fetch;

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/calendar/apple/connect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.calendarIntegration.upsert as jest.Mock).mockResolvedValue({});
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns 400 when appleId or appPassword is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/calendar/apple/connect', {
      method: 'POST',
      body: JSON.stringify({ appleId: 'user@icloud.com' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('returns 401 when CalDAV auth fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });

    const request = new NextRequest('http://localhost:3000/api/calendar/apple/connect', {
      method: 'POST',
      body: JSON.stringify({ appleId: 'user@icloud.com', appPassword: 'bad-pass' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Failed to connect');
  });

  it('connects successfully and returns provider info', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const request = new NextRequest('http://localhost:3000/api/calendar/apple/connect', {
      method: 'POST',
      body: JSON.stringify({ appleId: 'user@icloud.com', appPassword: 'app-specific-pass' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.provider).toBe('APPLE');
    expect(data.data.email).toBe('user@icloud.com');
    expect(prisma.calendarIntegration.upsert).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});
