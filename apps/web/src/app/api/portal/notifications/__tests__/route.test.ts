import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: { findMany: jest.fn(), count: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@test.com' },
  requestId: 'req-1',
  params: {},
};

describe('GET /api/portal/notifications', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns notifications with unread count', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([
      { id: 'n-1', type: 'SYSTEM_ALERT', isRead: false, createdAt: new Date() },
      { id: 'n-2', type: 'APPOINTMENT_REMINDER', isRead: true, createdAt: new Date() },
    ]);
    (prisma.notification.count as jest.Mock).mockResolvedValue(1);

    const res = await GET(
      new NextRequest('http://localhost:3000/api/portal/notifications?limit=50&type=SYSTEM_ALERT'),
      mockContext
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.notifications).toHaveLength(2);
    expect(data.data.unreadCount).toBe(1);
    expect(data.data.total).toBe(2);
  });

  it('filters unread only', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);

    await GET(
      new NextRequest('http://localhost:3000/api/portal/notifications?unreadOnly=true&limit=50&type=SYSTEM_ALERT'),
      mockContext
    );

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isRead: false }),
      })
    );
  });

  it('filters by notification type', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);

    await GET(
      new NextRequest('http://localhost:3000/api/portal/notifications?type=APPOINTMENT_REMINDER&limit=50'),
      mockContext
    );

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'APPOINTMENT_REMINDER' }),
      })
    );
  });

  it('respects limit parameter', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);

    await GET(
      new NextRequest('http://localhost:3000/api/portal/notifications?limit=10&type=SYSTEM_ALERT'),
      mockContext
    );

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it('returns empty when no notifications', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);

    const res = await GET(
      new NextRequest('http://localhost:3000/api/portal/notifications?limit=50&type=SYSTEM_ALERT'),
      mockContext
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.notifications).toEqual([]);
    expect(data.data.unreadCount).toBe(0);
  });
});
