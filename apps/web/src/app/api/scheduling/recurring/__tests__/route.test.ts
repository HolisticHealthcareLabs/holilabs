/**
 * Tests for POST/GET /api/scheduling/recurring
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    recurringAppointment: { create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    appointment: { create: jest.fn() },
  },
}));

jest.mock('@/lib/scheduling/recurring-generator', () => ({
  generateRecurringAppointments: jest.fn().mockReturnValue([]),
  validateRecurringPattern: jest.fn().mockReturnValue({ valid: true }),
  calculateRecurringStats: jest.fn().mockReturnValue({ totalOccurrences: 10, estimatedEnd: new Date() }),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { validateRecurringPattern } = require('@/lib/scheduling/recurring-generator');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
  validatedBody: {
    patientId: 'patient-1',
    clinicianId: 'clinician-1',
    frequency: 'WEEKLY',
    interval: 1,
    startTime: '09:00',
    duration: 30,
    seriesStart: new Date(),
    title: 'Follow-up',
    type: 'IN_PERSON',
  },
};

const mockSeries = {
  id: 'rec-1',
  patientId: 'patient-1',
  clinicianId: 'clinician-1',
  frequency: 'WEEKLY',
  isActive: true,
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', tokenId: 'tok-1' },
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@e.com', specialty: 'GP' },
};

describe('POST /api/scheduling/recurring', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates recurring series (201)', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'patient-1', firstName: 'Maria', lastName: 'Silva' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'clinician-1', role: 'CLINICIAN', firstName: 'Dr', lastName: 'Test' });
    (validateRecurringPattern as jest.Mock).mockReturnValue({ valid: true });
    (prisma.recurringAppointment.create as jest.Mock).mockResolvedValue(mockSeries);
    (prisma.recurringAppointment.update as jest.Mock).mockResolvedValue(mockSeries);

    const request = new NextRequest('http://localhost:3000/api/scheduling/recurring', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/scheduling/recurring', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Patient not found');
  });

  it('returns 404 when clinician not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/scheduling/recurring', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Clinician not found');
  });

  it('returns 400 when recurring pattern is invalid', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'patient-1', firstName: 'Maria', lastName: 'Silva' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'clinician-1', role: 'CLINICIAN', firstName: 'Dr', lastName: 'Test' });
    (validateRecurringPattern as jest.Mock).mockReturnValue({ valid: false, errors: ['Invalid pattern'] });

    const request = new NextRequest('http://localhost:3000/api/scheduling/recurring', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('INVALID_PATTERN');
  });
});

describe('GET /api/scheduling/recurring', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns recurring series list (200)', async () => {
    (prisma.recurringAppointment.findMany as jest.Mock).mockResolvedValue([{
      ...mockSeries,
      interval: 1,
      daysOfWeek: [],
      startTime: '09:00',
      duration: 30,
      seriesStart: new Date(),
      seriesEnd: null,
      maxOccurrences: null,
    }]);

    const request = new NextRequest('http://localhost:3000/api/scheduling/recurring');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count).toBe(1);
  });
});
