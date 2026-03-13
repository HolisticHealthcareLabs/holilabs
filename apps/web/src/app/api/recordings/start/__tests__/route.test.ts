import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findUnique: jest.fn() },
    scribeSession: { findFirst: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));
jest.mock('@/lib/consent/recording-consent', () => ({
  verifyRecordingConsent: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyRecordingConsent } = require('@/lib/consent/recording-consent');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockAppointment = {
  id: 'apt-1',
  clinicianId: 'clinician-1',
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test' },
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', state: 'SP' },
};

const mockSession = {
  id: 'sess-1',
  appointmentId: 'apt-1',
  patientId: 'patient-1',
  clinicianId: 'clinician-1',
  status: 'RECORDING',
  startedAt: new Date(),
  appointment: { title: 'Consultation', startTime: new Date() },
  patient: { firstName: 'Maria', lastName: 'Silva', id: 'patient-1' },
};

const validBody = {
  appointmentId: '00000000-0000-0000-0000-000000000001',
  patientId: '00000000-0000-0000-0000-000000000002',
  accessReason: 'DIRECT_PATIENT_CARE',
};

describe('POST /api/recordings/start', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts recording session and returns 201', async () => {
    prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
    prisma.scribeSession.findFirst.mockResolvedValue(null);
    prisma.scribeSession.create.mockResolvedValue(mockSession);
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    verifyRecordingConsent.mockResolvedValue({ allowed: true, reason: null });

    const req = new NextRequest('http://localhost:3000/api/recordings/start', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('returns 400 when request body is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/recordings/start', {
      method: 'POST',
      body: JSON.stringify({ appointmentId: 'not-a-uuid' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    expect(res.status).toBe(400);
  });

  it('returns 404 when appointment not found', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/recordings/start', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    expect(res.status).toBe(404);
  });

  it('returns 403 when recording consent is not granted', async () => {
    prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
    verifyRecordingConsent.mockResolvedValue({ allowed: false, reason: 'Two-party consent required', requiresConsent: true });
    const req = new NextRequest('http://localhost:3000/api/recordings/start', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    expect(res.status).toBe(403);
  });
});
