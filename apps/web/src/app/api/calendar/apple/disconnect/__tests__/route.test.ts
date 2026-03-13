/**
 * DELETE /api/calendar/apple/disconnect - Apple Calendar disconnect tests
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
    calendarIntegration: { findUnique: jest.fn(), delete: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  ),
}));

const { DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('DELETE /api/calendar/apple/disconnect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.calendarIntegration.delete as jest.Mock).mockResolvedValue({});
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('returns 404 when integration not found', async () => {
    (prisma.calendarIntegration.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/calendar/apple/disconnect', { method: 'DELETE' });
    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Calendar integration not found');
  });

  it('disconnects successfully and creates audit log', async () => {
    (prisma.calendarIntegration.findUnique as jest.Mock).mockResolvedValue({
      id: 'int-1',
      calendarEmail: 'user@icloud.com',
    });

    const request = new NextRequest('http://localhost:3000/api/calendar/apple/disconnect', { method: 'DELETE' });
    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('disconnected');
    expect(prisma.calendarIntegration.delete).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('calls safeErrorResponse on database error', async () => {
    const { safeErrorResponse } = require('@/lib/api/safe-error-response');
    (prisma.calendarIntegration.findUnique as jest.Mock).mockResolvedValue({
      id: 'int-1',
      calendarEmail: 'user@icloud.com',
    });
    (prisma.calendarIntegration.delete as jest.Mock).mockRejectedValue(new Error('DB down'));

    const request = new NextRequest('http://localhost:3000/api/calendar/apple/disconnect', { method: 'DELETE' });
    await DELETE(request, mockContext);

    expect(safeErrorResponse).toHaveBeenCalled();
  });
});
