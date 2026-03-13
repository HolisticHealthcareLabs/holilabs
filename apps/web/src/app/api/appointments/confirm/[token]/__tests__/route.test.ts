/**
 * Tests for GET/POST /api/appointments/confirm/[token]
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  ),
}));

jest.mock('@/lib/appointments/confirmation', () => ({
  getAppointmentByToken: jest.fn(),
  confirmAppointment: jest.fn(),
  cancelAppointment: jest.fn(),
  requestReschedule: jest.fn(),
  formatAppointmentDetails: jest.fn(),
}));

const { GET, POST } = require('../route');
const {
  getAppointmentByToken,
  confirmAppointment,
  cancelAppointment,
  requestReschedule,
  formatAppointmentDetails,
} = require('@/lib/appointments/confirmation');

const mockAppointment = {
  id: 'apt-1',
  patientId: 'patient-1',
  status: 'SCHEDULED',
  confirmationStatus: 'PENDING',
  type: 'IN_PERSON',
  description: 'Consulta general',
};

const mockDetails = {
  date: '15 de junio de 2025',
  time: '10:00',
  doctor: 'Dr. Test',
  location: 'Clínica Norte',
};

beforeEach(() => {
  jest.clearAllMocks();
  (formatAppointmentDetails as jest.Mock).mockReturnValue(mockDetails);
});

describe('GET /api/appointments/confirm/[token]', () => {
  it('returns 404 when appointment is not found for token', async () => {
    (getAppointmentByToken as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/appointments/confirm/bad-token');
    const response = await GET(request, { params: { token: 'bad-token' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns appointment details for valid token', async () => {
    (getAppointmentByToken as jest.Mock).mockResolvedValue(mockAppointment);

    const request = new NextRequest('http://localhost:3000/api/appointments/confirm/valid-token');
    const response = await GET(request, { params: { token: 'valid-token' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.appointment.id).toBe('apt-1');
  });
});

describe('POST /api/appointments/confirm/[token]', () => {
  it('returns 400 when action is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments/confirm/valid-token', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: { token: 'valid-token' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/action/i);
  });

  it('confirms appointment for confirm action', async () => {
    (confirmAppointment as jest.Mock).mockResolvedValue({
      id: 'apt-1',
      patientId: 'patient-1',
      status: 'CONFIRMED',
      confirmationStatus: 'CONFIRMED',
    });

    const request = new NextRequest('http://localhost:3000/api/appointments/confirm/valid-token', {
      method: 'POST',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const response = await POST(request, { params: { token: 'valid-token' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(confirmAppointment).toHaveBeenCalledWith('valid-token');
  });

  it('cancels appointment for cancel action', async () => {
    (cancelAppointment as jest.Mock).mockResolvedValue({
      id: 'apt-1',
      patientId: 'patient-1',
      status: 'CANCELLED',
      confirmationStatus: 'DECLINED',
    });

    const request = new NextRequest('http://localhost:3000/api/appointments/confirm/valid-token', {
      method: 'POST',
      body: JSON.stringify({ action: 'cancel', reason: 'Personal reasons' }),
    });
    const response = await POST(request, { params: { token: 'valid-token' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(cancelAppointment).toHaveBeenCalledWith('valid-token', 'Personal reasons');
  });

  it('returns 400 for reschedule action without newTime', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments/confirm/valid-token', {
      method: 'POST',
      body: JSON.stringify({ action: 'reschedule' }),
    });
    const response = await POST(request, { params: { token: 'valid-token' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/nueva fecha/i);
  });
});
