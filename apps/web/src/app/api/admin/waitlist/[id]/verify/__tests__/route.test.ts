/**
 * Tests for GET /api/admin/waitlist/[id]/verify
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    waitlistEntry: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockEntry = {
  email: 'clinic@example.com',
  firstName: 'Test',
  lastName: 'Clinic',
  companyName: 'Test Clinic',
  plan: 'PRO',
  status: 'APPROVED',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/admin/waitlist/[id]/verify', () => {
  it('returns valid:true for an approved entry', async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValue(mockEntry);

    const request = new NextRequest('http://localhost:3000/api/admin/waitlist/entry-1/verify');
    const response = await GET(request, { params: { id: 'entry-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.lead.email).toBe('clinic@example.com');
    expect(data.lead.plan).toBe('PRO');
  });

  it('returns valid:false when entry is not APPROVED', async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValue({
      ...mockEntry,
      status: 'PENDING',
    });

    const request = new NextRequest('http://localhost:3000/api/admin/waitlist/entry-1/verify');
    const response = await GET(request, { params: { id: 'entry-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(false);
  });

  it('returns valid:false when entry does not exist', async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/admin/waitlist/missing-id/verify');
    const response = await GET(request, { params: { id: 'missing-id' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(false);
  });

  it('returns valid:false when id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/waitlist//verify');
    const response = await GET(request, { params: {} });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(false);
  });
});
