/**
 * Tests for PATCH /api/appointments/[id]/status
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockImplementation((error: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }),
}));

jest.mock('@/lib/socket-server', () => ({
  emitAppointmentEvent: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { PATCH } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
  params: { id: 'apt-1' },
};

const mockAppointment = {
  id: 'apt-1',
  patientId: 'patient-1',
  clinicianId: 'clinician-1',
  status: 'SCHEDULED',
  confirmationStatus: 'PENDING',
  confirmedAt: null,
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva' },
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test' },
};

describe('PATCH /api/appointments/[id]/status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates appointment status (200)', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
    (prisma.appointment.update as jest.Mock).mockResolvedValue({
      ...mockAppointment,
      status: 'CONFIRMED',
      patient: mockAppointment.patient,
      clinician: mockAppointment.clinician,
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 400 when appointment ID is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments//status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    const response = await PATCH(request, { ...mockContext, params: {} });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Appointment ID is required');
  });

  it('returns 400 for invalid status value', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'INVALID_STATUS' }),
    });
    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 404 when appointment not found', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/appointments/nonexistent/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    const response = await PATCH(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Appointment not found');
  });
});
