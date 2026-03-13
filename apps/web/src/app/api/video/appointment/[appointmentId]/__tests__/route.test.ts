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
    appointment: { findUnique: jest.fn() },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { appointmentId: 'apt-1' },
};

const mockAppointment = {
  id: 'apt-1',
  title: 'Telehealth Consultation',
  startTime: new Date('2026-03-15T10:00:00Z'),
  endTime: new Date('2026-03-15T10:30:00Z'),
  status: 'SCHEDULED',
  type: 'TELEHEALTH',
  clinicianId: 'clinician-1',
  meetingUrl: 'https://meet.holilabs.com/room/abc123',
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@test.com' },
  patient: {
    id: 'patient-1', firstName: 'Maria', lastName: 'Silva', email: 'p@test.com',
    patientUser: { id: 'patient-user-1' },
  },
};

describe('GET /api/video/appointment/[appointmentId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns appointment data for the clinician', async () => {
    prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
    const req = new NextRequest('http://localhost:3000/api/video/appointment/apt-1');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.userType).toBe('clinician');
  });

  it('returns 404 when appointment not found', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/video/appointment/nonexistent');
    const res = await GET(req, mockContext);
    expect(res.status).toBe(404);
  });

  it('returns 400 when appointment is not telehealth', async () => {
    prisma.appointment.findUnique.mockResolvedValue({ ...mockAppointment, type: 'IN_PERSON' });
    const req = new NextRequest('http://localhost:3000/api/video/appointment/apt-1');
    const res = await GET(req, mockContext);
    expect(res.status).toBe(400);
  });

  it('returns 403 when user is not part of the appointment', async () => {
    prisma.appointment.findUnique.mockResolvedValue({
      ...mockAppointment,
      clinicianId: 'other-clinician',
      patient: { ...mockAppointment.patient, patientUser: { id: 'other-patient-user' } },
    });
    const req = new NextRequest('http://localhost:3000/api/video/appointment/apt-1');
    const res = await GET(req, mockContext);
    expect(res.status).toBe(403);
  });
});
