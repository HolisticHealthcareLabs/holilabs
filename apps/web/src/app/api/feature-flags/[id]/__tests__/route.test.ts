/**
 * Tests for /api/feature-flags/[id]
 *
 * - GET returns flag details
 * - GET returns 404 when flag not found
 * - PUT updates flag
 * - DELETE removes flag
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    featureFlag: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

const { GET, PUT, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  params: { id: 'flag-1' },
  requestId: 'req-1',
};

describe('GET /api/feature-flags/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns flag details', async () => {
    (prisma.featureFlag.findUnique as jest.Mock).mockResolvedValue({
      id: 'flag-1',
      name: 'dark_mode',
      enabled: true,
      defaultValue: false,
    });

    const request = new NextRequest('http://localhost:3000/api/feature-flags/flag-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('dark_mode');
  });

  it('returns 404 when flag not found', async () => {
    (prisma.featureFlag.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/feature-flags/nonexistent');
    const response = await GET(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });
});

describe('PUT /api/feature-flags/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('updates flag successfully', async () => {
    (prisma.featureFlag.findUnique as jest.Mock).mockResolvedValue({
      id: 'flag-1',
      name: 'dark_mode',
      enabled: false,
    });
    (prisma.featureFlag.update as jest.Mock).mockResolvedValue({
      id: 'flag-1',
      name: 'dark_mode',
      enabled: true,
    });

    const request = new NextRequest('http://localhost:3000/api/feature-flags/flag-1', {
      method: 'PUT',
      body: JSON.stringify({ enabled: true }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PUT(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.enabled).toBe(true);
  });
});

describe('DELETE /api/feature-flags/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('deletes flag successfully', async () => {
    (prisma.featureFlag.findUnique as jest.Mock).mockResolvedValue({
      id: 'flag-1',
      name: 'dark_mode',
    });
    (prisma.featureFlag.delete as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/feature-flags/flag-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted');
  });
});
