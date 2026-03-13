/**
 * Tests for GET/POST /api/appointments
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { create: jest.fn(), findMany: jest.fn() },
  },
}));

jest.mock('@/lib/consent/consent-guard', () => ({
  consentGuard: {
    canBookAppointment: jest.fn(() => ({ allowed: true })),
    logConsentCheck: jest.fn(),
  },
}));

jest.mock('@/lib/api/schemas', () => ({
  CreateAppointmentSchema: {},
  AppointmentQuerySchema: {},
}));

jest.mock('@/lib/socket-server', () => ({
  emitAppointmentEvent: jest.fn(),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { consentGuard } = require('@/lib/consent/consent-guard');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
  validatedBody: {
    patientId: 'patient-1',
    clinicianId: 'clinician-1',
    title: 'Checkup',
    description: 'Routine visit',
    startTime: '2025-06-15T10:00:00Z',
    endTime: '2025-06-15T10:30:00Z',
    timezone: 'America/Sao_Paulo',
    type: 'IN_PERSON',
  },
  validatedQuery: {},
};

const mockAppointment = {
  id: 'apt-1',
  patientId: 'patient-1',
  clinicianId: 'clinician-1',
  title: 'Checkup',
  status: 'SCHEDULED',
  startTime: new Date('2025-06-15T10:00:00Z'),
  endTime: new Date('2025-06-15T10:30:00Z'),
  type: 'IN_PERSON',
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', tokenId: 'tok-1', email: 'p@e.com', phone: '+55' },
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@e.com', specialty: 'GP' },
};

describe('POST /api/appointments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates an appointment when consent is granted', async () => {
    (consentGuard.canBookAppointment as jest.Mock).mockResolvedValue({ allowed: true });
    (prisma.appointment.create as jest.Mock).mockResolvedValue(mockAppointment);

    const request = new NextRequest('http://localhost:3000/api/appointments', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('apt-1');
  });

  it('returns 403 when patient consent is missing', async () => {
    (consentGuard.canBookAppointment as jest.Mock).mockResolvedValue({
      allowed: false,
      missingConsents: ['treatment_access'],
    });

    const request = new NextRequest('http://localhost:3000/api/appointments', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('CONSENT_REQUIRED');
  });
});

describe('GET /api/appointments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns appointment list', async () => {
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([mockAppointment]);

    const request = new NextRequest('http://localhost:3000/api/appointments');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.count).toBe(1);
  });
});
