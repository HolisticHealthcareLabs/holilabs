/**
 * Book Appointment API Route Tests
 *
 * POST /api/portal/appointments/book - Book an appointment (patient portal)
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/auth/patient-session', () => ({
  requirePatientSession: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/analytics/server-analytics', () => ({
  trackEvent: jest.fn().mockResolvedValue(undefined),
  ServerAnalyticsEvents: {
    PORTAL_APPOINTMENT_BOOKED: 'portal_appointment_booked',
    APPOINTMENT_CREATED: 'appointment_created',
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    appointment: { findFirst: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
    notification: { create: jest.fn() },
  },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { requirePatientSession } = require('@/lib/auth/patient-session');

const mockSession = { patientId: 'patient-1', userId: 'user-p-1' };

describe('POST /api/portal/appointments/book', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requirePatientSession as jest.Mock).mockResolvedValue(mockSession);
  });

  const validBody = {
    clinicianId: 'clfqvz9hc0001p4fk8k0g4k0g',
    date: '2026-06-15',
    time: '10:00',
    type: 'IN_PERSON',
    reason: 'Annual checkup',
  };

  it('books an appointment successfully', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      firstName: 'Maria',
      lastName: 'Lopez',
      email: 'maria@test.com',
      phone: '+5511999',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'clfqvz9hc0001p4fk8k0g4k0g',
      firstName: 'Ana',
      lastName: 'Garcia',
      email: 'dr@holilabs.com',
      role: 'CLINICIAN',
    });
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.appointment.create as jest.Mock).mockResolvedValue({
      id: 'apt-1',
      title: 'Consulta Presencial - Annual checkup',
      startTime: new Date('2026-06-15T10:00:00'),
      endTime: new Date('2026-06-15T10:30:00'),
      type: 'IN_PERSON',
      status: 'SCHEDULED',
      clinician: { id: 'clfqvz9hc0001p4fk8k0g4k0g', firstName: 'Ana', lastName: 'Garcia', email: 'dr@holilabs.com' },
      patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Lopez', email: 'maria@test.com' },
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (prisma.notification.create as jest.Mock).mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/portal/appointments/book', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.appointment.id).toBe('apt-1');
    expect(data.data.appointment.status).toBe('SCHEDULED');
    expect(prisma.appointment.create).toHaveBeenCalled();
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
  });

  it('returns 400 for invalid booking data (reason too short)', async () => {
    const request = new NextRequest('http://localhost:3000/api/portal/appointments/book', {
      method: 'POST',
      body: JSON.stringify({
        clinicianId: 'clfqvz9hc0001p4fk8k0g4k0g',
        date: '2026-06-15',
        time: '10:00',
        type: 'IN_PERSON',
        reason: 'ab',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid booking data');
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/portal/appointments/book', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Patient not found');
  });

  it('returns 409 when time slot is taken', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      firstName: 'Maria',
      lastName: 'Lopez',
      email: 'maria@test.com',
      phone: '+5511999',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'clfqvz9hc0001p4fk8k0g4k0g',
      firstName: 'Ana',
      lastName: 'Garcia',
      email: 'dr@holilabs.com',
      role: 'CLINICIAN',
    });
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-apt' });

    const request = new NextRequest('http://localhost:3000/api/portal/appointments/book', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('no longer available');
  });
});
