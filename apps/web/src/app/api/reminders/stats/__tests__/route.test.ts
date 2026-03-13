import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    scheduledReminder: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    notification: {
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@clinic.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/reminders/stats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns reminder statistics with correct structure', async () => {
    (prisma.scheduledReminder.count as jest.Mock)
      .mockResolvedValueOnce(10) // totalScheduled
      .mockResolvedValueOnce(3)  // failedThisWeek
      .mockResolvedValueOnce(0); // sentTodayFailed
    (prisma.notification.count as jest.Mock).mockResolvedValue(5); // sentToday
    (prisma.scheduledReminder.findFirst as jest.Mock).mockResolvedValue({
      id: 'sched-1',
      templateName: 'appointment-reminder',
      scheduledFor: new Date(),
      nextExecution: null,
    });

    const req = new NextRequest('http://localhost:3000/api/reminders/stats');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.totalScheduled).toBe(10);
    expect(data.data.sentToday).toBe(5);
    expect(data.data.failedThisWeek).toBe(3);
    expect(data.data.nextScheduled).toBeDefined();
    expect(data.data.nextScheduled.id).toBe('sched-1');
  });

  it('returns successRate of 100 when sentToday is 0', async () => {
    (prisma.scheduledReminder.count as jest.Mock)
      .mockResolvedValueOnce(0)  // totalScheduled
      .mockResolvedValueOnce(0)  // failedThisWeek
      .mockResolvedValueOnce(0); // sentTodayFailed
    (prisma.notification.count as jest.Mock).mockResolvedValue(0); // sentToday
    (prisma.scheduledReminder.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/reminders/stats');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.data.successRate).toBe(100);
    expect(data.data.nextScheduled).toBeNull();
  });

  it('returns nextScheduled as null when no upcoming reminders', async () => {
    (prisma.scheduledReminder.count as jest.Mock).mockResolvedValue(0);
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);
    (prisma.scheduledReminder.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/reminders/stats');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.data.nextScheduled).toBeNull();
  });

  it('calculates correct successRate when some sent today failed', async () => {
    (prisma.scheduledReminder.count as jest.Mock)
      .mockResolvedValueOnce(20)  // totalScheduled
      .mockResolvedValueOnce(5)   // failedThisWeek
      .mockResolvedValueOnce(2);  // sentTodayFailed
    (prisma.notification.count as jest.Mock).mockResolvedValue(10); // sentToday
    (prisma.scheduledReminder.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/reminders/stats');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.data.successRate).toBe(80); // (10-2)/10 * 100
  });
});
