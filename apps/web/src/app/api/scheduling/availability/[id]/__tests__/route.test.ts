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
    providerAvailability: { findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock('@/lib/api/schemas/scheduling', () => ({
  UpdateProviderAvailabilitySchema: {},
}));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'avail-1' },
  validatedBody: { isActive: true },
};

const mockAvailability = {
  id: 'avail-1',
  clinicianId: 'clinician-1',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '17:00',
  isActive: true,
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@test.com', specialty: 'GP' },
};

describe('GET /api/scheduling/availability/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns availability schedule when found', async () => {
    prisma.providerAvailability.findUnique.mockResolvedValue(mockAvailability);
    const req = new NextRequest('http://localhost:3000/api/scheduling/availability/avail-1');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('avail-1');
  });

  it('returns 404 when availability not found', async () => {
    prisma.providerAvailability.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/availability/nonexistent');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/scheduling/availability/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates availability and returns success', async () => {
    prisma.providerAvailability.findUnique.mockResolvedValue({ id: 'avail-1', clinicianId: 'clinician-1', dayOfWeek: 1 });
    prisma.providerAvailability.update.mockResolvedValue({ ...mockAvailability, startTime: '10:00' });
    const req = new NextRequest('http://localhost:3000/api/scheduling/availability/avail-1', { method: 'PATCH' });
    const res = await PATCH(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when availability not found', async () => {
    prisma.providerAvailability.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/availability/bad-id', { method: 'PATCH' });
    const res = await PATCH(req, mockContext);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/scheduling/availability/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('soft deletes availability by marking inactive', async () => {
    prisma.providerAvailability.findUnique.mockResolvedValue({ id: 'avail-1', clinicianId: 'clinician-1', dayOfWeek: 1 });
    prisma.providerAvailability.update.mockResolvedValue({ ...mockAvailability, isActive: false });
    const req = new NextRequest('http://localhost:3000/api/scheduling/availability/avail-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when availability not found', async () => {
    prisma.providerAvailability.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/availability/bad-id', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    expect(res.status).toBe(404);
  });
});
