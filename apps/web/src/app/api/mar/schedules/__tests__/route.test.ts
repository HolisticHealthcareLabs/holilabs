import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    medication: { findUnique: jest.fn() },
    medicationSchedule: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/mar/schedule-generator', () => ({
  generateSchedule: jest.fn().mockReturnValue({
    isPRN: false,
    timesPerDay: 2,
    scheduledTimes: [{ label: '08:00' }, { label: '20:00' }],
  }),
}));

jest.mock('@/lib/audit', () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new (require('next/server').NextResponse)(JSON.stringify({ error: 'Error' }), { status: 500 })
  ),
}));

const { POST, GET, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');
const { generateSchedule } = require('@/lib/mar/schedule-generator');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'clinician@holilabs.com', role: 'CLINICIAN' },
  params: {},
};

const mockMedication = {
  id: 'med-1',
  name: 'Metformin',
  frequency: 'BID',
  patientId: 'pat-1',
  startDate: new Date(),
  endDate: null,
  patient: { id: 'pat-1', firstName: 'Ana', lastName: 'Lima' },
};

const mockSchedule = {
  id: 'sched-1',
  medicationId: 'med-1',
  patientId: 'pat-1',
  scheduledTime: new Date(),
  frequency: 'BID',
  isActive: true,
  medication: mockMedication,
  patient: { id: 'pat-1', firstName: 'Ana', lastName: 'Lima', mrn: 'MRN001' },
  administrations: [],
};

describe('POST /api/mar/schedules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.medication.findUnique as jest.Mock).mockResolvedValue(mockMedication);
    (prisma.medicationSchedule.create as jest.Mock).mockResolvedValue(mockSchedule);
  });

  it('creates schedules for a medication', async () => {
    const req = new NextRequest('http://localhost:3000/api/mar/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicationId: 'med-1' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toContain('Created 2 schedules');
  });

  it('returns 400 when medicationId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/mar/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Medication ID');
  });

  it('returns 404 when medication not found', async () => {
    (prisma.medication.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/mar/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicationId: 'nonexistent' }),
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(404);
  });

  it('returns PRN message without creating schedules for PRN medication', async () => {
    (generateSchedule as jest.Mock).mockReturnValue({ isPRN: true, scheduledTimes: [], timesPerDay: 0 });
    const req = new NextRequest('http://localhost:3000/api/mar/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicationId: 'med-1' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.isPRN).toBe(true);
    expect(data.schedules).toHaveLength(0);
  });
});

describe('GET /api/mar/schedules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.medicationSchedule.findMany as jest.Mock).mockResolvedValue([mockSchedule]);
  });

  it('returns schedules for a patient', async () => {
    const req = new NextRequest('http://localhost:3000/api/mar/schedules?patientId=pat-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.count).toBe(1);
    expect(data.schedules[0].medicationId).toBe('med-1');
  });

  it('returns 400 when neither patientId nor medicationId is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/mar/schedules');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/mar/schedules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.medicationSchedule.update as jest.Mock).mockResolvedValue({
      ...mockSchedule,
      isActive: false,
      patientId: 'pat-1',
      medication: { name: 'Metformin' },
    });
  });

  it('deactivates a schedule successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/mar/schedules?scheduleId=sched-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deactivated');
  });

  it('returns 400 when scheduleId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/mar/schedules', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);

    expect(res.status).toBe(400);
  });
});
