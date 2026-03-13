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
    recurringAppointment: { findUnique: jest.fn(), update: jest.fn() },
    appointment: { findMany: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
  },
}));
jest.mock('@/lib/api/schemas/scheduling', () => ({
  UpdateRecurringAppointmentSchema: {},
}));
jest.mock('@/lib/scheduling/recurring-generator', () => ({
  generateRecurringAppointments: jest.fn().mockReturnValue([]),
  validateRecurringPattern: jest.fn().mockReturnValue({ valid: true, errors: [] }),
}));
jest.mock('date-fns', () => ({
  addMonths: jest.fn().mockReturnValue(new Date('2026-06-01')),
}));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'series-1' },
  validatedBody: {},
};

const mockSeries = {
  id: 'series-1',
  clinicianId: 'clinician-1',
  patientId: 'patient-1',
  frequency: 'WEEKLY',
  interval: 1,
  daysOfWeek: [1],
  dayOfMonth: null,
  startTime: '09:00',
  duration: 30,
  seriesStart: new Date('2026-01-01'),
  seriesEnd: new Date('2026-12-31'),
  maxOccurrences: null,
  isActive: true,
  isPaused: false,
  generatedCount: 10,
  lastGeneratedDate: new Date('2026-03-01'),
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', tokenId: 'tok-1' },
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@test.com', specialty: 'GP' },
};

describe('GET /api/scheduling/recurring/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns recurring series with appointments', async () => {
    prisma.recurringAppointment.findUnique.mockResolvedValue(mockSeries);
    prisma.appointment.findMany.mockResolvedValue([]);
    const req = new NextRequest('http://localhost:3000/api/scheduling/recurring/series-1');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when series not found', async () => {
    prisma.recurringAppointment.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/recurring/bad-id');
    const res = await GET(req, mockContext);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/scheduling/recurring/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates recurring series successfully', async () => {
    prisma.recurringAppointment.findUnique.mockResolvedValue(mockSeries);
    prisma.recurringAppointment.update.mockResolvedValue(mockSeries);
    const req = new NextRequest('http://localhost:3000/api/scheduling/recurring/series-1', { method: 'PATCH' });
    const res = await PATCH(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when series not found', async () => {
    prisma.recurringAppointment.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/recurring/bad-id', { method: 'PATCH' });
    const res = await PATCH(req, mockContext);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/scheduling/recurring/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cancels recurring series and future appointments', async () => {
    prisma.recurringAppointment.findUnique.mockResolvedValue(mockSeries);
    prisma.recurringAppointment.update.mockResolvedValue({ ...mockSeries, isActive: false });
    prisma.appointment.updateMany.mockResolvedValue({ count: 3 });
    const req = new NextRequest('http://localhost:3000/api/scheduling/recurring/series-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when series not found', async () => {
    prisma.recurringAppointment.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scheduling/recurring/bad-id', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    expect(res.status).toBe(404);
  });
});
