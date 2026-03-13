/**
 * Tests for GET/PATCH/DELETE /api/appointments/[id]
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((_err: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: opts?.userMessage ?? 'Internal server error' }, { status: 500 });
  }),
}));

jest.mock('@/lib/appointments/conflict-detection', () => ({
  checkAppointmentConflicts: jest.fn(() => ({ hasConflict: false })),
}));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockAppointment = {
  id: 'apt-1',
  patientId: 'patient-1',
  clinicianId: 'clinician-1',
  title: 'Checkup',
  status: 'SCHEDULED',
  startTime: new Date('2025-06-15T10:00:00Z'),
  endTime: new Date('2025-06-15T10:30:00Z'),
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', tokenId: 'tok-1', email: 'p@e.com', phone: '+55', dateOfBirth: new Date() },
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@e.com', specialty: 'GP', licenseNumber: 'CRM-123' },
};

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
  params: { id: 'apt-1' },
};

describe('GET /api/appointments/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns appointment by id', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);

    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('apt-1');
  });

  it('returns 404 when appointment not found', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/appointments/missing');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Appointment not found');
  });
});

describe('PATCH /api/appointments/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates appointment title', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
    (prisma.appointment.update as jest.Mock).mockResolvedValue({ ...mockAppointment, title: 'Follow-up' });

    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Follow-up' }),
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when updating non-existent appointment', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/appointments/missing', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated' }),
    });

    const response = await PATCH(request, { ...mockContext, params: { id: 'missing' } });
    const data = await response.json();

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/appointments/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cancels an appointment (soft delete)', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
    (prisma.appointment.update as jest.Mock).mockResolvedValue({ ...mockAppointment, status: 'CANCELLED' });

    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1', { method: 'DELETE' });
    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('cancelled');
  });

  it('returns 404 when cancelling non-existent appointment', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/appointments/missing', { method: 'DELETE' });
    const response = await DELETE(request, { ...mockContext, params: { id: 'missing' } });
    const data = await response.json();

    expect(response.status).toBe(404);
  });
});
