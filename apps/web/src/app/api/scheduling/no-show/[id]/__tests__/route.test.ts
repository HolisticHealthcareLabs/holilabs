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
    noShowHistory: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    appointment: { count: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/api/schemas/scheduling', () => ({
  UpdateNoShowSchema: {},
}));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'noshow-1' },
  validatedBody: { contacted: true },
};

const mockNoShow = {
  id: 'noshow-1',
  patientId: 'patient-1',
  appointmentId: 'apt-1',
  contacted: false,
  feeCharged: false,
  feePaid: false,
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', tokenId: 'tok-1', dateOfBirth: new Date(), email: 'p@test.com', phone: '+55' },
  appointment: {
    id: 'apt-1', startTime: new Date(), endTime: new Date(), title: 'Consultation',
    description: '', type: 'IN_PERSON', status: 'NO_SHOW',
    clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@test.com', specialty: 'GP' },
  },
};

describe('GET /api/scheduling/no-show/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns no-show record with analytics', async () => {
    prisma.noShowHistory.findUnique.mockResolvedValue(mockNoShow);
    prisma.noShowHistory.count.mockResolvedValue(2);
    prisma.appointment.count.mockResolvedValue(10);
    const req = new NextRequest('http://localhost:3000/api/scheduling/no-show/noshow-1');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.patientAnalytics).toBeDefined();
  });

  it('returns 404 when no-show record not found', async () => {
    prisma.noShowHistory.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/no-show/bad-id');
    const res = await GET(req, mockContext);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/scheduling/no-show/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates no-show record successfully', async () => {
    prisma.noShowHistory.findUnique.mockResolvedValue({
      id: 'noshow-1', patientId: 'patient-1', contacted: false, feeCharged: false, feePaid: false,
      appointment: { clinician: { id: 'clinician-1' } },
    });
    prisma.noShowHistory.update.mockResolvedValue({ ...mockNoShow, contacted: true });
    const req = new NextRequest('http://localhost:3000/api/scheduling/no-show/noshow-1', { method: 'PATCH' });
    const res = await PATCH(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when no-show record not found', async () => {
    prisma.noShowHistory.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/no-show/bad-id', { method: 'PATCH' });
    const res = await PATCH(req, mockContext);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/scheduling/no-show/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes no-show record and reverts appointment status', async () => {
    prisma.noShowHistory.findUnique.mockResolvedValue({ id: 'noshow-1', appointmentId: 'apt-1', patientId: 'patient-1' });
    prisma.$transaction.mockResolvedValue([{}, {}]);
    const req = new NextRequest('http://localhost:3000/api/scheduling/no-show/noshow-1', { method: 'DELETE' });
    const res = await DELETE(req, { ...mockContext, user: { ...mockContext.user, role: 'ADMIN' } });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when no-show record not found', async () => {
    prisma.noShowHistory.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/no-show/bad-id', { method: 'DELETE' });
    const res = await DELETE(req, { ...mockContext, user: { ...mockContext.user, role: 'ADMIN' } });
    expect(res.status).toBe(404);
  });
});
