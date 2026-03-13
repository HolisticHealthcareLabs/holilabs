/**
 * Available Appointment Slots API Route Tests
 *
 * GET /api/portal/appointments/available-slots - List available time slots
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

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    appointment: { findMany: jest.fn() },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { requirePatientSession } = require('@/lib/auth/patient-session');

const CLINICIAN_CUID = 'clfqvz9hc0001p4fk8k0g4k0g';

describe('GET /api/portal/appointments/available-slots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requirePatientSession as jest.Mock).mockResolvedValue({
      patientId: 'patient-1',
      userId: 'user-p-1',
    });
  });

  it('returns available slots for a future date', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: CLINICIAN_CUID,
      firstName: 'Ana',
      lastName: 'Garcia',
      role: 'CLINICIAN',
    });
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

    const futureDate = '2027-12-20';
    const url = `http://localhost:3000/api/portal/appointments/available-slots?clinicianId=${CLINICIAN_CUID}&date=${futureDate}&type=IN_PERSON`;
    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.clinician.id).toBe(CLINICIAN_CUID);
    expect(data.data.date).toBe(futureDate);
    expect(data.data.slots.length).toBeGreaterThan(0);
    expect(data.data.summary.available).toBeGreaterThan(0);
  });

  it('returns 404 when clinician not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const url = `http://localhost:3000/api/portal/appointments/available-slots?clinicianId=${CLINICIAN_CUID}&date=2027-12-20&type=IN_PERSON`;
    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Clinician not found');
  });

  it('returns 400 for invalid parameters (bad date format)', async () => {
    const url = `http://localhost:3000/api/portal/appointments/available-slots?clinicianId=${CLINICIAN_CUID}&date=not-a-date&type=IN_PERSON`;
    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid parameters');
  });

  it('marks slots as unavailable when appointments exist', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: CLINICIAN_CUID,
      firstName: 'Ana',
      lastName: 'Garcia',
      role: 'CLINICIAN',
    });
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
      {
        startTime: new Date('2027-12-20T10:00:00'),
        endTime: new Date('2027-12-20T10:30:00'),
      },
    ]);

    const url = `http://localhost:3000/api/portal/appointments/available-slots?clinicianId=${CLINICIAN_CUID}&date=2027-12-20&type=IN_PERSON`;
    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    const tenAmSlot = data.data.slots.find((s: any) => s.time === '10:00');
    expect(tenAmSlot.available).toBe(false);
    expect(data.data.summary.booked).toBeGreaterThan(0);
  });
});
