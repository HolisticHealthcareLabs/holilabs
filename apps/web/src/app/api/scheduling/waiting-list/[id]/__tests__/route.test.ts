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
    waitingList: { findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    appointment: { findUnique: jest.fn() },
  },
}));
jest.mock('@/lib/api/schemas/scheduling', () => ({
  UpdateWaitingListSchema: {},
}));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'wl-1' },
  validatedBody: {},
};

const mockEntry = {
  id: 'wl-1',
  patientId: 'patient-1',
  clinicianId: 'clinician-1',
  status: 'WAITING',
  priority: 'NORMAL',
  appointmentId: null,
  createdAt: new Date('2026-03-01'),
  expiresAt: null,
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', tokenId: 'tok-1', dateOfBirth: new Date(), email: 'p@test.com', phone: '+55' },
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@test.com', specialty: 'GP' },
};

describe('GET /api/scheduling/waiting-list/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns waiting list entry with position', async () => {
    prisma.waitingList.findUnique.mockResolvedValue(mockEntry);
    prisma.waitingList.count.mockResolvedValue(3);
    const req = new NextRequest('http://localhost:3000/api/scheduling/waiting-list/wl-1');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.queuePosition).toBeDefined();
  });

  it('returns 404 when entry not found', async () => {
    prisma.waitingList.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/waiting-list/bad-id');
    const res = await GET(req, mockContext);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/scheduling/waiting-list/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates waiting list entry status', async () => {
    prisma.waitingList.findUnique.mockResolvedValue({ ...mockEntry, status: 'WAITING', priority: 'NORMAL', appointmentId: null });
    prisma.waitingList.update.mockResolvedValue({ ...mockEntry, status: 'NOTIFIED' });
    const req = new NextRequest('http://localhost:3000/api/scheduling/waiting-list/wl-1', { method: 'PATCH' });
    const res = await PATCH(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when entry not found', async () => {
    prisma.waitingList.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/waiting-list/bad-id', { method: 'PATCH' });
    const res = await PATCH(req, mockContext);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/scheduling/waiting-list/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('removes patient from waiting list by marking EXPIRED', async () => {
    prisma.waitingList.findUnique.mockResolvedValue({ ...mockEntry, status: 'WAITING' });
    prisma.waitingList.update.mockResolvedValue({ ...mockEntry, status: 'EXPIRED' });
    const req = new NextRequest('http://localhost:3000/api/scheduling/waiting-list/wl-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when entry not found', async () => {
    prisma.waitingList.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/waiting-list/bad-id', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    expect(res.status).toBe(404);
  });
});
