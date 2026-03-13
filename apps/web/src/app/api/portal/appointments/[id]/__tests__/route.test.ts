import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, PATCH } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@test.com' },
  requestId: 'req-1',
};

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const mockAppointment = {
  id: 'apt-1',
  patientId: 'patient-1',
  status: 'SCHEDULED',
  startTime: futureDate,
  clinician: { id: 'doc-1', firstName: 'Dr', lastName: 'Test', specialty: 'GP', licenseNumber: 'L1', email: 'dr@test.com' },
  patient: { id: 'patient-1', mrn: 'MRN-1', firstName: 'Maria', lastName: 'Silva' },
};

describe('GET /api/portal/appointments/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns appointment details', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/appointments/apt-1'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('apt-1');
  });

  it('returns 404 when appointment not found', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/appointments/apt-1'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });

  it('returns 403 when appointment belongs to different patient', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      ...mockAppointment,
      patientId: 'other-patient',
    });

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/appointments/apt-1'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/portal/appointments/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cancels an appointment', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: 'apt-1',
      patientId: 'patient-1',
      status: 'SCHEDULED',
      startTime: futureDate,
    });
    (prisma.appointment.update as jest.Mock).mockResolvedValue({
      ...mockAppointment,
      status: 'CANCELLED',
      clinician: { firstName: 'Dr', lastName: 'Test' },
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/portal/appointments/apt-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'cancel' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED' }),
      })
    );
  });

  it('returns 400 for invalid action', async () => {
    const req = new NextRequest('http://localhost:3000/api/portal/appointments/apt-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reschedule' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid action');
  });

  it('returns 404 when appointment not found', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/portal/appointments/apt-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'cancel' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });

  it('returns 403 for unauthorized cancel', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: 'apt-1',
      patientId: 'other-patient',
      status: 'SCHEDULED',
      startTime: futureDate,
    });

    const req = new NextRequest('http://localhost:3000/api/portal/appointments/apt-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'cancel' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
  });

  it('returns 400 when already cancelled', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: 'apt-1',
      patientId: 'patient-1',
      status: 'CANCELLED',
      startTime: futureDate,
    });

    const req = new NextRequest('http://localhost:3000/api/portal/appointments/apt-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'cancel' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('cancelada');
  });

  it('returns 400 when appointment is completed', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: 'apt-1',
      patientId: 'patient-1',
      status: 'COMPLETED',
      startTime: futureDate,
    });

    const req = new NextRequest('http://localhost:3000/api/portal/appointments/apt-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'cancel' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('completada');
  });
});
