import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    screeningOutcome: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/prevention-notification.service', () => ({
  getPreventionNotificationService: jest.fn().mockReturnValue({
    sendScreeningReminder: jest.fn().mockResolvedValue(undefined),
    sendScreeningOverdueAlert: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new (require('next/server').NextResponse)(JSON.stringify({ error: 'Error' }), { status: 500 })
  ),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { getPreventionNotificationService } = require('@/lib/services/prevention-notification.service');

describe('POST /api/prevention/notifications/cron/send-reminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CRON_SECRET;
    (prisma.screeningOutcome.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.screeningOutcome.update as jest.Mock).mockResolvedValue(undefined);
  });

  it('processes reminders successfully with no screenings pending', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/cron/send-reminders', {
      method: 'POST',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.reminders7Days).toBe(0);
    expect(data.data.overdueAlerts).toBe(0);
  });

  it('returns 401 when CRON_SECRET is set and token is missing', async () => {
    process.env.CRON_SECRET = 'my-cron-secret';
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/cron/send-reminders', {
      method: 'POST',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('accepts valid Bearer token when CRON_SECRET is set', async () => {
    process.env.CRON_SECRET = 'my-cron-secret';
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/cron/send-reminders', {
      method: 'POST',
      headers: { Authorization: 'Bearer my-cron-secret' },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it('sends 7-day reminders for upcoming screenings', async () => {
    const mockScreening = {
      id: 'scr-1',
      patientId: 'pat-1',
      screeningType: 'MAMMOGRAM',
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - 3600000),
      dueDate: null,
      completedDate: null,
      remindersSent: 0,
      lastReminderAt: null,
      facility: null,
      patient: { id: 'pat-1', firstName: 'Ana', lastName: 'Lima' },
    };

    (prisma.screeningOutcome.findMany as jest.Mock)
      .mockResolvedValueOnce([mockScreening]) // 7-day
      .mockResolvedValueOnce([])              // 3-day
      .mockResolvedValueOnce([])              // 1-day
      .mockResolvedValueOnce([]);             // overdue

    const service = getPreventionNotificationService();
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/cron/send-reminders', {
      method: 'POST',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.data.reminders7Days).toBe(1);
    expect(service.sendScreeningReminder).toHaveBeenCalledTimes(1);
  });
});
