/**
 * Tests for GET /api/scheduling/available-slots
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    providerAvailability: { findMany: jest.fn() },
    providerTimeOff: { findMany: jest.fn() },
    appointment: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const today = new Date();
const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
  validatedQuery: {
    clinicianId: 'clinician-1',
    startDate: today,
    endDate: nextWeek,
    duration: 30,
  },
};

const mockClinician = {
  id: 'clinician-1',
  firstName: 'Dr',
  lastName: 'Test',
  role: 'CLINICIAN',
};

describe('GET /api/scheduling/available-slots', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns available slots (200)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockClinician);
    (prisma.providerAvailability.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.providerTimeOff.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/scheduling/available-slots');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when clinician not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/scheduling/available-slots');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('NOT_FOUND');
  });

  it('returns 400 when date range exceeds 90 days', async () => {
    const farFuture = new Date(today.getTime() + 100 * 24 * 60 * 60 * 1000);
    const ctx = { ...mockContext, validatedQuery: { ...mockContext.validatedQuery, endDate: farFuture } };

    const request = new NextRequest('http://localhost:3000/api/scheduling/available-slots');
    const response = await GET(request, ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('INVALID_RANGE');
  });

  it('returns 400 when user is not a clinician', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockClinician, role: 'PATIENT' });

    const request = new NextRequest('http://localhost:3000/api/scheduling/available-slots');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('INVALID_ROLE');
  });
});
