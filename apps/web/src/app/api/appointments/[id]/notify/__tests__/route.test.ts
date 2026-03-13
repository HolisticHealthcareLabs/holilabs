/**
 * Tests for POST /api/appointments/[id]/notify
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

jest.mock('@/lib/notifications/whatsapp', () => ({
  notifyAppointmentReminder: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/notifications/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/notifications/sms', () => ({
  sendSMS: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/notifications/send-push', () => ({
  sendPushNotification: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'apt-1' },
};

const mockAppointment = {
  id: 'apt-1',
  startTime: new Date('2025-06-15T10:00:00Z'),
  endTime: new Date('2025-06-15T10:30:00Z'),
  branch: 'Main Clinic',
  followUpCount: 0,
  patient: {
    id: 'patient-1',
    firstName: 'Maria',
    lastName: 'Silva',
    email: 'maria@e.com',
    phone: '+5511999999999',
    preferences: { whatsappEnabled: true, emailEnabled: true, smsEnabled: true, pushEnabled: true },
  },
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test' },
};

describe('POST /api/appointments/[id]/notify', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends notification via email (200)', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1/notify', {
      method: 'POST',
      body: JSON.stringify({ channel: 'email', type: 'appointment_reminder' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.results).toBeDefined();
  });

  it('returns 400 when appointment ID is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments//notify', {
      method: 'POST',
      body: JSON.stringify({ channel: 'email' }),
    });
    const response = await POST(request, { ...mockContext, params: {} });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 400 when channel is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1/notify', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('channel is required');
  });

  it('returns 404 when appointment not found', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/appointments/nonexistent/notify', {
      method: 'POST',
      body: JSON.stringify({ channel: 'email' }),
    });
    const response = await POST(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });
});
