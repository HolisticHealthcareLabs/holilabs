/**
 * Tests for GET /api/admin/waitlist
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    waitlistEntry: { findMany: jest.fn() },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
};

const mockEntries = [
  {
    id: 'entry-1',
    email: 'clinic@example.com',
    firstName: 'Test',
    lastName: 'Clinic',
    companyName: 'Test Clinic',
    status: 'PENDING',
    createdAt: new Date(),
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/admin/waitlist', () => {
  it('returns waitlist entries', async () => {
    (prisma.waitlistEntry.findMany as jest.Mock).mockResolvedValue(mockEntries);

    const request = new NextRequest('http://localhost:3000/api/admin/waitlist');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].id).toBe('entry-1');
  });

  it('returns empty array when no entries exist', async () => {
    (prisma.waitlistEntry.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/admin/waitlist');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.entries).toHaveLength(0);
  });

  it('queries entries ordered by createdAt desc', async () => {
    (prisma.waitlistEntry.findMany as jest.Mock).mockResolvedValue(mockEntries);

    const request = new NextRequest('http://localhost:3000/api/admin/waitlist');
    await GET(request, mockContext);

    expect(prisma.waitlistEntry.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
  });
});
