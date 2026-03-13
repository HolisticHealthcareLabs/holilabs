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
    scribeSession: { findUnique: jest.fn() },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'rec-1' },
};

const mockRecording = {
  id: 'rec-1',
  patientId: 'patient-1',
  status: 'COMPLETED',
  appointment: { id: 'apt-1', title: 'Consultation', startTime: new Date(), clinicianId: 'clinician-1' },
  patient: { id: 'patient-1', mrn: 'MRN-001', firstName: 'Maria', lastName: 'Silva' },
};

describe('GET /api/recordings/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns recording data for authorized clinician', async () => {
    prisma.scribeSession.findUnique.mockResolvedValue(mockRecording);
    const req = new NextRequest('http://localhost:3000/api/recordings/rec-1');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('rec-1');
  });

  it('returns 404 when recording not found', async () => {
    prisma.scribeSession.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/recordings/nonexistent');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 403 when user is not authorized', async () => {
    prisma.scribeSession.findUnique.mockResolvedValue({
      ...mockRecording,
      patientId: 'different-patient',
      appointment: { ...mockRecording.appointment, clinicianId: 'different-clinician' },
    });
    const req = new NextRequest('http://localhost:3000/api/recordings/rec-1');
    const res = await GET(req, mockContext);
    expect(res.status).toBe(403);
  });
});
