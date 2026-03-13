import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    scheduledReminder: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@clinic.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // tomorrow

const validBody = {
  patientIds: ['patient-1'],
  template: {
    name: 'appointment-reminder',
    category: 'appointment',
    message: 'Your appointment is tomorrow.',
    variables: [],
  },
  channel: 'SMS',
  scheduledFor: futureDate,
};

describe('POST /api/reminders/schedule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a one-time scheduled reminder', async () => {
    (prisma.scheduledReminder.create as jest.Mock).mockResolvedValue({
      id: 'sched-1',
      scheduledFor: new Date(futureDate),
    });

    const req = new NextRequest('http://localhost:3000/api/reminders/schedule', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.reminder.id).toBe('sched-1');
    expect(data.reminder.isRecurring).toBe(false);
  });

  it('returns 400 when patientIds is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/reminders/schedule', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, patientIds: [] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/patient/i);
  });

  it('returns 400 when scheduledFor is in the past', async () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString();

    const req = new NextRequest('http://localhost:3000/api/reminders/schedule', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, scheduledFor: pastDate }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/future/i);
  });

  it('returns 400 when channel is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/reminders/schedule', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, channel: 'TELEGRAM' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/channel/i);
  });
});

describe('GET /api/reminders/schedule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated list of scheduled reminders', async () => {
    (prisma.scheduledReminder.findMany as jest.Mock).mockResolvedValue([
      { id: 'sched-1', templateName: 'appointment-reminder' },
    ]);
    (prisma.scheduledReminder.count as jest.Mock).mockResolvedValue(1);

    const req = new NextRequest('http://localhost:3000/api/reminders/schedule');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.pagination.total).toBe(1);
  });

  it('filters by status when provided', async () => {
    (prisma.scheduledReminder.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.scheduledReminder.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/reminders/schedule?status=PENDING');
    await GET(req, mockContext);

    expect(prisma.scheduledReminder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDING' } })
    );
  });
});
