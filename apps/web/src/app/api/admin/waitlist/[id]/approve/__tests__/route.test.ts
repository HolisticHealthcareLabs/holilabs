/**
 * Tests for /api/admin/waitlist/[id]/approve
 *
 * - POST approves a pending waitlist entry
 * - POST returns 404 when entry not found
 * - POST returns 409 when entry already processed
 * - POST returns 400 when ID is missing
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
    waitlistEntry: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/email/resend', () => ({
  isResendConfigured: jest.fn().mockReturnValue(false),
  sendApprovalInvite: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  params: { id: 'entry-1' },
  requestId: 'req-1',
};

describe('POST /api/admin/waitlist/[id]/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('approves a pending waitlist entry', async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValue({
      id: 'entry-1',
      email: 'doc@clinic.com',
      firstName: 'Maria',
      status: 'PENDING',
    });
    (prisma.waitlistEntry.update as jest.Mock).mockResolvedValue({
      id: 'entry-1',
      email: 'doc@clinic.com',
      firstName: 'Maria',
      status: 'APPROVED',
      approvedAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/admin/waitlist/entry-1/approve', {
      method: 'POST',
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.entry.status).toBe('APPROVED');
    expect(data.onboardingLink).toContain('entry-1');
  });

  it('returns 404 when entry not found', async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/admin/waitlist/nonexistent/approve', {
      method: 'POST',
    });

    const response = await POST(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns 409 when entry already approved', async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValue({
      id: 'entry-1',
      email: 'doc@clinic.com',
      status: 'APPROVED',
    });

    const request = new NextRequest('http://localhost:3000/api/admin/waitlist/entry-1/approve', {
      method: 'POST',
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already');
  });

  it('returns 400 when ID is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/waitlist//approve', {
      method: 'POST',
    });

    const response = await POST(request, { ...mockContext, params: {} });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing entry ID');
  });
});
