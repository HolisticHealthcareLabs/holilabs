import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventiveCareReminder: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, PATCH } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
};

describe('GET /api/prevention/reminders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns reminders with stats', async () => {
    (prisma.preventiveCareReminder.count as jest.Mock)
      .mockResolvedValueOnce(10)   // total
      .mockResolvedValueOnce(2)    // overdue
      .mockResolvedValueOnce(3)    // upcoming
      .mockResolvedValueOnce(5)    // completedThisMonth
      .mockResolvedValueOnce(10);  // totalFiltered
    (prisma.preventiveCareReminder.findMany as jest.Mock).mockResolvedValue([
      { id: 'r-1', status: 'DUE', patient: { id: 'p-1', firstName: 'John', lastName: 'Doe' } },
    ]);

    const req = new NextRequest('http://localhost:3000/api/prevention/reminders');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stats.total).toBe(10);
    expect(data.data.stats.overdue).toBe(2);
    expect(data.data.reminders).toHaveLength(1);
  });

  it('filters by status and priority', async () => {
    (prisma.preventiveCareReminder.count as jest.Mock).mockResolvedValue(0);
    (prisma.preventiveCareReminder.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/prevention/reminders?status=OVERDUE&priority=HIGH');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.preventiveCareReminder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'OVERDUE', priority: 'HIGH' }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    (prisma.preventiveCareReminder.count as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/prevention/reminders');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain('Failed to fetch reminders');
  });
});

describe('PATCH /api/prevention/reminders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('completes a reminder', async () => {
    (prisma.preventiveCareReminder.findUnique as jest.Mock).mockResolvedValue({ id: 'r-1', status: 'DUE' });
    (prisma.preventiveCareReminder.update as jest.Mock).mockResolvedValue({ id: 'r-1', status: 'COMPLETED' });

    const req = new NextRequest('http://localhost:3000/api/prevention/reminders', {
      method: 'PATCH',
      body: JSON.stringify({ reminderId: 'r-1', action: 'complete' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('completed');
  });

  it('returns 400 for missing reminderId', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/reminders', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'complete' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('reminderId');
  });

  it('returns 404 when reminder not found', async () => {
    (prisma.preventiveCareReminder.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/reminders', {
      method: 'PATCH',
      body: JSON.stringify({ reminderId: 'r-missing', action: 'complete' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('Reminder not found');
  });

  it('returns 400 for invalid action', async () => {
    (prisma.preventiveCareReminder.findUnique as jest.Mock).mockResolvedValue({ id: 'r-1' });

    const req = new NextRequest('http://localhost:3000/api/prevention/reminders', {
      method: 'PATCH',
      body: JSON.stringify({ reminderId: 'r-1', action: 'invalid' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid action');
  });
});
