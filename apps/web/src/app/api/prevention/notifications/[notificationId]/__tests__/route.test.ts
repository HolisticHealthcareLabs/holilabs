import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  auditView: jest.fn().mockResolvedValue(undefined),
  auditUpdate: jest.fn().mockResolvedValue(undefined),
}));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const USER_ID = 'user-1';

const mockContext = (notificationId: string) => ({
  user: { id: USER_ID, email: 'clinician@holilabs.com', role: 'CLINICIAN' },
  params: { notificationId },
});

const mockNotification = {
  id: 'notif-1',
  recipientId: USER_ID,
  type: 'SCREENING_REMINDER',
  title: 'Lembrete de triagem',
  readAt: null,
  createdAt: new Date(),
};

describe('GET /api/prevention/notifications/[notificationId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(mockNotification);
  });

  it('returns notification details for the owner', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/notif-1');
    const res = await GET(req, mockContext('notif-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('notif-1');
  });

  it('returns 404 when notification not found', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/nonexistent');
    const res = await GET(req, mockContext('nonexistent'));

    expect(res.status).toBe(404);
  });

  it('returns 403 when notification belongs to another user', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      ...mockNotification,
      recipientId: 'other-user',
    });
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/notif-1');
    const res = await GET(req, mockContext('notif-1'));

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/prevention/notifications/[notificationId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(mockNotification);
    (prisma.notification.update as jest.Mock).mockResolvedValue({ ...mockNotification, readAt: new Date() });
  });

  it('marks notification as read', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/notif-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
    const res = await PATCH(req, mockContext('notif-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 400 for invalid request data', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/notif-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: 'not-a-boolean' }),
    });
    const res = await PATCH(req, mockContext('notif-1'));

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/prevention/notifications/[notificationId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(mockNotification);
    (prisma.notification.delete as jest.Mock).mockResolvedValue(undefined);
  });

  it('deletes notification for the owner', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/notif-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, mockContext('notif-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted');
  });

  it('returns 403 when notification belongs to another user', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      ...mockNotification,
      recipientId: 'other-user',
    });
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/notif-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, mockContext('notif-1'));

    expect(res.status).toBe(403);
  });
});
