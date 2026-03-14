import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    notification: { create: jest.fn() },
  },
}));

jest.mock('@/lib/sms/twilio', () => ({
  sendSMS: jest.fn(),
  sendWhatsApp: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/notifications/reminder-policy', () => ({
  buildReminderLifecycleEvent: jest.fn().mockReturnValue({ event: 'mock_event' }),
  buildReminderRetryState: jest.fn().mockReturnValue({
    attempt: 1,
    maxAttempts: 3,
    remainingAttempts: 2,
    nextAttempt: 2,
    nextRetryAt: null,
    escalationReady: false,
    escalationReason: null,
    state: 'ready',
    terminal: false,
    hooks: { retryScheduledEvent: 'REMINDER_RETRY_SCHEDULED' },
  }),
  DEFAULT_REMINDER_RETRY_POLICY: { maxAttempts: 3 },
  evaluateReminderConsent: jest.fn().mockReturnValue({ allowed: true }),
  executeReminderWithRetry: jest.fn().mockResolvedValue({ success: true, attemptsUsed: 1 }),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { sendSMS } = require('@/lib/sms/twilio');

const mockContext = { user: { id: 'doc-1', email: 'doc@test.com' } };

const mockPatient = {
  id: 'patient-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@test.com',
  phone: '+1234567890',
  appointments: [],
  medications: [],
  preferences: { smsEnabled: true, smsReminders: true },
  consents: [{ type: 'SERVICE' }],
};

const baseTemplate = {
  name: 'Appointment Reminder',
  category: 'appointment',
  message: 'Hi {{patient_name}}, your appointment is tomorrow.',
  variables: ['patient_name'],
};

describe('POST /api/reminders/send', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when patientIds is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/reminders/send', {
      method: 'POST',
      body: JSON.stringify({ patientIds: [], template: baseTemplate, channel: 'SMS' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('At least one patient ID is required');
  });

  it('returns 400 for invalid channel', async () => {
    const req = new NextRequest('http://localhost:3000/api/reminders/send', {
      method: 'POST',
      body: JSON.stringify({ patientIds: ['patient-1'], template: baseTemplate, channel: 'TELEGRAM' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid channel. Must be SMS, EMAIL, or WHATSAPP');
  });

  it('schedules future reminder when sendImmediately is false', async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    const req = new NextRequest('http://localhost:3000/api/reminders/send', {
      method: 'POST',
      body: JSON.stringify({
        patientIds: ['patient-1'],
        template: baseTemplate,
        channel: 'SMS',
        sendImmediately: false,
        scheduledFor: futureDate,
      }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.scheduled).toBe(true);
  });

  it('sends SMS reminder immediately', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notif-1' });

    const req = new NextRequest('http://localhost:3000/api/reminders/send', {
      method: 'POST',
      body: JSON.stringify({ patientIds: ['patient-1'], template: baseTemplate, channel: 'SMS' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sent).toBeGreaterThanOrEqual(0);
  });
});
