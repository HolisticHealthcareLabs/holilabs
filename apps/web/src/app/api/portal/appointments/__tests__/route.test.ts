import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findMany: jest.fn(), create: jest.fn() },
    patient: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@test.com' },
  requestId: 'req-1',
};

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

describe('GET /api/portal/appointments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns patient appointments with summary', async () => {
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'apt-1',
        startTime: futureDate,
        status: 'SCHEDULED',
        clinician: { id: 'doc-1', firstName: 'Dr', lastName: 'Test', specialty: 'GP', licenseNumber: 'L1' },
      },
      {
        id: 'apt-2',
        startTime: pastDate,
        status: 'COMPLETED',
        clinician: { id: 'doc-1', firstName: 'Dr', lastName: 'Test', specialty: 'GP', licenseNumber: 'L1' },
      },
    ]);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/appointments'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.summary.total).toBe(2);
    expect(data.data.summary.upcoming).toBe(1);
    expect(data.data.summary.past).toBe(1);
  });

  it('filters by status', async () => {
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

    await GET(new NextRequest('http://localhost:3000/api/portal/appointments?status=SCHEDULED'), mockContext);

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'SCHEDULED' }),
      })
    );
  });

  it('filters upcoming appointments', async () => {
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

    await GET(new NextRequest('http://localhost:3000/api/portal/appointments?upcoming=true'), mockContext);

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startTime: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    );
  });
});

describe('POST /api/portal/appointments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates appointment request', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      assignedClinicianId: 'doc-1',
      assignedClinician: { id: 'doc-1', firstName: 'Dr', lastName: 'Test' },
    });
    (prisma.appointment.create as jest.Mock).mockResolvedValue({
      id: 'apt-new',
      status: 'SCHEDULED',
      clinician: { firstName: 'Dr', lastName: 'Test', specialty: 'GP' },
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/portal/appointments', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Follow-up consultation for blood work',
        preferredDate: futureDate.toISOString(),
        preferredTime: 'MORNING',
        type: 'IN_PERSON',
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(prisma.appointment.create).toHaveBeenCalled();
  });

  it('returns 400 for invalid body', async () => {
    const req = new NextRequest('http://localhost:3000/api/portal/appointments', {
      method: 'POST',
      body: JSON.stringify({ reason: 'short' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 400 when no assigned clinician', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      assignedClinicianId: null,
    });

    const req = new NextRequest('http://localhost:3000/api/portal/appointments', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Follow-up consultation for blood work',
        preferredDate: futureDate.toISOString(),
        preferredTime: 'MORNING',
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('médico asignado');
  });
});
