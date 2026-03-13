import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    scheduledReminder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@clinic.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockReminder = {
  id: 'reminder-1',
  templateName: 'appointment-reminder',
  status: 'ACTIVE',
  recurrencePattern: null,
  recurrenceInterval: null,
};

describe('POST /api/reminders/[id]/[action]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cancels an active reminder', async () => {
    (prisma.scheduledReminder.findUnique as jest.Mock).mockResolvedValue(mockReminder);
    (prisma.scheduledReminder.update as jest.Mock).mockResolvedValue({
      ...mockReminder,
      status: 'CANCELLED',
      nextExecution: null,
    });

    const req = new NextRequest(
      'http://localhost:3000/api/reminders/reminder-1/cancel',
      { method: 'POST' }
    );
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.scheduledReminder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) })
    );
  });

  it('returns 400 for invalid action', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/reminders/reminder-1/fly',
      { method: 'POST' }
    );
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/invalid action/i);
  });

  it('returns 404 when reminder not found', async () => {
    (prisma.scheduledReminder.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/reminders/nonexistent/cancel',
      { method: 'POST' }
    );
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it('returns 400 when pausing a non-recurring reminder', async () => {
    (prisma.scheduledReminder.findUnique as jest.Mock).mockResolvedValue({
      ...mockReminder,
      recurrencePattern: null,
    });

    const req = new NextRequest(
      'http://localhost:3000/api/reminders/reminder-1/pause',
      { method: 'POST' }
    );
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/pause/i);
  });
});
