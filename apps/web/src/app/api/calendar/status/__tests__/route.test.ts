/**
 * GET /api/calendar/status - Calendar integration status tests
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
    calendarIntegration: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  ),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/calendar/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns all provider statuses', async () => {
    (prisma.calendarIntegration.findMany as jest.Mock).mockResolvedValue([
      { id: 'int-1', provider: 'GOOGLE', calendarEmail: 'dr@gmail.com', syncEnabled: true, lastSyncAt: new Date(), createdAt: new Date() },
      { id: 'int-2', provider: 'APPLE', calendarEmail: 'dr@icloud.com', syncEnabled: true, lastSyncAt: new Date(), createdAt: new Date() },
    ]);

    const request = new NextRequest('http://localhost:3000/api/calendar/status');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.google).toBeDefined();
    expect(data.data.apple).toBeDefined();
    expect(data.data.microsoft).toBeNull();
  });

  it('returns null for all providers when none connected', async () => {
    (prisma.calendarIntegration.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/calendar/status');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.google).toBeNull();
    expect(data.data.microsoft).toBeNull();
    expect(data.data.apple).toBeNull();
  });

  it('returns 500 on database error', async () => {
    (prisma.calendarIntegration.findMany as jest.Mock).mockRejectedValue(new Error('DB down'));

    const request = new NextRequest('http://localhost:3000/api/calendar/status');
    const response = await GET(request, mockContext);

    expect(response.status).toBe(500);
  });
});
