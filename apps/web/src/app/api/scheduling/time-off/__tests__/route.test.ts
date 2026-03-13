/**
 * Tests for POST/GET /api/scheduling/time-off
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    providerTimeOff: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    appointment: { count: jest.fn() },
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
    startDate: new Date('2025-07-01'),
    endDate: new Date('2025-07-05'),
    type: 'VACATION',
    reason: 'Summer break',
    allDay: true,
  },
  validatedQuery: {},
};

const mockClinician = { id: 'clinician-1', role: 'CLINICIAN', firstName: 'Dr', lastName: 'Test' };

const mockTimeOff = {
  id: 'to-1',
  clinicianId: 'clinician-1',
  startDate: new Date('2025-07-01'),
  endDate: new Date('2025-07-05'),
  type: 'VACATION',
  status: 'APPROVED',
  affectedAppointments: 3,
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@e.com', specialty: 'GP' },
};

describe('POST /api/scheduling/time-off', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates time off request (201)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockClinician);
    (prisma.providerTimeOff.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.appointment.count as jest.Mock).mockResolvedValue(3);
    (prisma.providerTimeOff.create as jest.Mock).mockResolvedValue(mockTimeOff);

    const request = new NextRequest('http://localhost:3000/api/scheduling/time-off', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.affectedAppointments).toBe(3);
  });

  it('returns 404 when clinician not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/scheduling/time-off', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('NOT_FOUND');
  });

  it('returns 409 when time off overlaps', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockClinician);
    (prisma.providerTimeOff.findFirst as jest.Mock).mockResolvedValue({
      id: 'existing-to',
      startDate: new Date('2025-07-02'),
      endDate: new Date('2025-07-04'),
      status: 'APPROVED',
    });

    const request = new NextRequest('http://localhost:3000/api/scheduling/time-off', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('CONFLICT');
  });

  it('returns 400 when user is not a clinician', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockClinician, role: 'PATIENT' });

    const request = new NextRequest('http://localhost:3000/api/scheduling/time-off', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('INVALID_ROLE');
  });
});

describe('GET /api/scheduling/time-off', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns time off list with stats (200)', async () => {
    (prisma.providerTimeOff.findMany as jest.Mock).mockResolvedValue([mockTimeOff]);

    const request = new NextRequest('http://localhost:3000/api/scheduling/time-off');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.stats).toBeDefined();
    expect(data.count).toBe(1);
  });
});
