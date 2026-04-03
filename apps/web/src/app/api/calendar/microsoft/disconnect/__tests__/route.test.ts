import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    calendarIntegration: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');
const { safeErrorResponse } = require('@/lib/api/safe-error-response');

const ctx = { user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' } };

const mockIntegration = {
  id: 'int-1',
  userId: 'user-1',
  provider: 'MICROSOFT',
  calendarEmail: 'dr@contoso.com',
};

beforeEach(() => {
  jest.clearAllMocks();
  (safeErrorResponse as jest.Mock).mockImplementation((_err: unknown, opts: any) =>
    new Response(JSON.stringify({ error: opts?.userMessage || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  (prisma.calendarIntegration.findUnique as jest.Mock).mockResolvedValue(mockIntegration);
  (prisma.calendarIntegration.delete as jest.Mock).mockResolvedValue({});
  (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
});

describe('DELETE /api/calendar/microsoft/disconnect', () => {
  it('deletes the integration and returns success', async () => {
    const req = new NextRequest('http://localhost:3000/api/calendar/microsoft/disconnect', {
      method: 'DELETE',
    });
    const res = await DELETE(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toMatch(/disconnected/i);
    expect(prisma.calendarIntegration.delete).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('returns 404 when integration is not found', async () => {
    (prisma.calendarIntegration.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/calendar/microsoft/disconnect', {
      method: 'DELETE',
    });
    const res = await DELETE(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toMatch(/not found/i);
  });

  it('returns 500 when delete throws', async () => {
    (prisma.calendarIntegration.delete as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/calendar/microsoft/disconnect', {
      method: 'DELETE',
    });
    const res = await DELETE(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBeDefined();
  });
});
