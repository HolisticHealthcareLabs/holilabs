/**
 * Tests for POST/GET /api/scheduling/availability
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    providerAvailability: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
  validatedBody: {
    clinicianId: 'clinician-1',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    maxBookings: 1,
  },
  validatedQuery: {},
};

const mockClinician = {
  id: 'clinician-1',
  role: 'CLINICIAN',
  firstName: 'Dr',
  lastName: 'Test',
};

const mockAvailability = {
  id: 'avail-1',
  clinicianId: 'clinician-1',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '17:00',
  slotDuration: 30,
  isActive: true,
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@e.com', specialty: 'GP' },
};

describe('POST /api/scheduling/availability', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates availability schedule (201)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockClinician);
    (prisma.providerAvailability.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.providerAvailability.create as jest.Mock).mockResolvedValue(mockAvailability);

    const request = new NextRequest('http://localhost:3000/api/scheduling/availability', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('avail-1');
  });

  it('returns 404 when clinician not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/scheduling/availability', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('NOT_FOUND');
  });

  it('returns 400 when user is not a clinician', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockClinician, role: 'PATIENT' });

    const request = new NextRequest('http://localhost:3000/api/scheduling/availability', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('INVALID_ROLE');
  });

  it('returns 409 when overlapping availability exists', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockClinician);
    (prisma.providerAvailability.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-1' });

    const request = new NextRequest('http://localhost:3000/api/scheduling/availability', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('CONFLICT');
  });
});

describe('GET /api/scheduling/availability', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns availability list (200)', async () => {
    (prisma.providerAvailability.findMany as jest.Mock).mockResolvedValue([mockAvailability]);

    const request = new NextRequest('http://localhost:3000/api/scheduling/availability');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.count).toBe(1);
  });

  it('returns empty array when no availability', async () => {
    (prisma.providerAvailability.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/scheduling/availability');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(0);
    expect(data.count).toBe(0);
  });
});
