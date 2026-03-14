import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/appointments/confirmation', () => ({
  getAppointmentByToken: jest.fn(),
  getAvailableSlots: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'a1' }),
}));

const { GET } = require('../route');
const { getAppointmentByToken, getAvailableSlots } = require('@/lib/appointments/confirmation');

const mockAppointment = {
  id: 'appt-1',
  clinicianId: 'clinician-1',
  patientId: 'patient-1',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/appointments/confirm/[token]/available-slots', () => {
  it('returns available slots for a valid token', async () => {
    (getAppointmentByToken as jest.Mock).mockResolvedValue(mockAppointment);
    (getAvailableSlots as jest.Mock).mockResolvedValue([
      new Date('2026-03-20T09:00:00.000Z'),
      new Date('2026-03-20T10:00:00.000Z'),
      new Date('2026-03-20T11:00:00.000Z'),
    ]);

    const req = new NextRequest('http://localhost:3000/api/appointments/confirm/tok123/available-slots');
    const res = await GET(req, { params: { token: 'tok123' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.slots).toHaveLength(3);
    expect(json.data.slots[0].available).toBe(true);
  });

  it('returns 404 when appointment is not found for token', async () => {
    (getAppointmentByToken as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/appointments/confirm/bad-token/available-slots');
    const res = await GET(req, { params: { token: 'bad-token' } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });

  it('returns 500 when slot lookup throws', async () => {
    (getAppointmentByToken as jest.Mock).mockResolvedValue(mockAppointment);
    (getAvailableSlots as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/appointments/confirm/tok123/available-slots');
    const res = await GET(req, { params: { token: 'tok123' } });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
  });

  it('returns 400 when token param is falsy', async () => {
    const req = new NextRequest('http://localhost:3000/api/appointments/confirm//available-slots');
    const res = await GET(req, { params: { token: '' } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/token/i);
  });
});
