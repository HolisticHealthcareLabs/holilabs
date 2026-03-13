/**
 * Tests for POST /api/appointments/send-reminder
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

jest.mock('@/lib/sms', () => ({
  sendAppointmentReminderSMS: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { sendAppointmentReminderSMS } = require('@/lib/sms');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
};

const futureDate = new Date(Date.now() + 86400000);

const mockAppointment = {
  id: 'apt-1',
  startTime: futureDate,
  endTime: new Date(futureDate.getTime() + 1800000),
  reminderSent: false,
  reminderSentAt: null,
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', phone: '+5511999999999' },
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test' },
};

describe('POST /api/appointments/send-reminder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends SMS reminder successfully (200)', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
    (sendAppointmentReminderSMS as jest.Mock).mockResolvedValue(true);
    (prisma.appointment.update as jest.Mock).mockResolvedValue({
      ...mockAppointment,
      reminderSent: true,
      reminderSentAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/appointments/send-reminder', {
      method: 'POST',
      body: JSON.stringify({ appointmentId: 'apt-1' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.sentTo).toBe('+5511999999999');
  });

  it('returns 404 when appointment not found', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/appointments/send-reminder', {
      method: 'POST',
      body: JSON.stringify({ appointmentId: 'nonexistent' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 400 when reminder already sent', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      ...mockAppointment,
      reminderSent: true,
      reminderSentAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/appointments/send-reminder', {
      method: 'POST',
      body: JSON.stringify({ appointmentId: 'apt-1' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('already sent');
  });

  it('returns 400 when patient has no phone', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      ...mockAppointment,
      patient: { ...mockAppointment.patient, phone: null },
    });

    const request = new NextRequest('http://localhost:3000/api/appointments/send-reminder', {
      method: 'POST',
      body: JSON.stringify({ appointmentId: 'apt-1' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('no phone');
  });
});
