import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn().mockResolvedValue({ id: 'a1' }), auditView: jest.fn(), auditCreate: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    providerTimeOff: { findUnique: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
  },
}));
jest.mock('@/lib/api/schemas/scheduling', () => ({
  UpdateTimeOffSchema: {},
}));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'timeoff-1' },
  validatedBody: {},
};

const mockTimeOff = {
  id: 'timeoff-1',
  clinicianId: 'clinician-1',
  startDate: new Date('2026-04-01'),
  endDate: new Date('2026-04-05'),
  reason: 'Vacation',
  status: 'PENDING',
  affectedAppointments: 3,
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@test.com', specialty: 'GP' },
};

describe('GET /api/scheduling/time-off/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns time off request when found', async () => {
    prisma.providerTimeOff.findUnique.mockResolvedValue(mockTimeOff);
    const req = new NextRequest('http://localhost:3000/api/scheduling/time-off/timeoff-1');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('timeoff-1');
  });

  it('returns 404 when time off not found', async () => {
    prisma.providerTimeOff.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/time-off/bad-id');
    const res = await GET(req, mockContext);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/scheduling/time-off/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates time off request as owner', async () => {
    prisma.providerTimeOff.findUnique.mockResolvedValue({ ...mockTimeOff, status: 'PENDING' });
    prisma.providerTimeOff.update.mockResolvedValue(mockTimeOff);
    const req = new NextRequest('http://localhost:3000/api/scheduling/time-off/timeoff-1', { method: 'PATCH' });
    const res = await PATCH(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when time off not found', async () => {
    prisma.providerTimeOff.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/time-off/bad-id', { method: 'PATCH' });
    const res = await PATCH(req, mockContext);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/scheduling/time-off/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cancels time off request by marking as CANCELLED', async () => {
    prisma.providerTimeOff.findUnique.mockResolvedValue({ ...mockTimeOff, status: 'PENDING' });
    prisma.providerTimeOff.update.mockResolvedValue({ ...mockTimeOff, status: 'CANCELLED' });
    const req = new NextRequest('http://localhost:3000/api/scheduling/time-off/timeoff-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when time off not found', async () => {
    prisma.providerTimeOff.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/time-off/bad-id', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    expect(res.status).toBe(404);
  });
});
