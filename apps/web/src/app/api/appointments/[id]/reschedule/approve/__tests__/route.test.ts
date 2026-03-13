/**
 * Tests for POST /api/appointments/[id]/reschedule/approve
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/notifications/whatsapp', () => ({
  notifyAppointmentReminder: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/notifications/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  ),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'apt-1' },
  requestId: 'req-1',
};

const rescheduleTime = new Date('2025-07-01T10:00:00Z');

const mockAppointment = {
  id: 'apt-1',
  patientId: 'patient-1',
  startTime: new Date('2025-06-15T10:00:00Z'),
  rescheduleRequested: true,
  rescheduleNewTime: rescheduleTime,
  patient: {
    id: 'patient-1',
    firstName: 'Maria',
    lastName: 'Silva',
    email: 'maria@example.com',
    phone: '+5511999990000',
    preferences: { whatsappEnabled: true, emailEnabled: true },
  },
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test' },
  branch: 'Clínica Norte',
};

const mockUpdatedAppointment = {
  ...mockAppointment,
  startTime: rescheduleTime,
  status: 'SCHEDULED',
  rescheduleApproved: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
});

describe('POST /api/appointments/[id]/reschedule/approve', () => {
  it('returns 400 when appointment id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments//reschedule/approve', {
      method: 'POST',
    });
    const response = await POST(request, { ...mockContext, params: {} });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/appointment id/i);
  });

  it('returns 404 when appointment does not exist', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1/reschedule/approve', {
      method: 'POST',
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it('returns 400 when no reschedule request is pending', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      ...mockAppointment,
      rescheduleRequested: false,
      rescheduleNewTime: null,
    });

    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1/reschedule/approve', {
      method: 'POST',
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/no reschedule request/i);
  });

  it('approves reschedule and sends notifications', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
    (prisma.appointment.update as jest.Mock).mockResolvedValue(mockUpdatedAppointment);

    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1/reschedule/approve', {
      method: 'POST',
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'apt-1' },
        data: expect.objectContaining({ rescheduleApproved: true }),
      })
    );
  });
});
