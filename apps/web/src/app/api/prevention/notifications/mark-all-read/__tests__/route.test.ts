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
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  auditUpdate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/prevention-notification.service', () => ({
  NOTIFICATION_TEMPLATES: {
    CONDITION_DETECTED: 'condition-detected',
    SCREENING_REMINDER: 'screening-reminder',
  },
}));

// NotificationType enum from @prisma/client
jest.mock('@prisma/client', () => ({
  NotificationType: {
    CONDITION_DETECTED: 'CONDITION_DETECTED',
    SCREENING_REMINDER: 'SCREENING_REMINDER',
  },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'user-1', email: 'clinician@holilabs.com', role: 'CLINICIAN' },
  params: {},
};

describe('POST /api/prevention/notifications/mark-all-read', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 5 });
  });

  it('marks all unread notifications as read', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/mark-all-read', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.markedReadCount).toBe(5);
  });

  it('returns 0 when no unread notifications exist', async () => {
    (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/mark-all-read', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.markedReadCount).toBe(0);
  });

  it('filters by recipientId of the authenticated user', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/mark-all-read', {
      method: 'POST',
    });
    await POST(req, mockContext);

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ recipientId: 'user-1', readAt: null }),
      })
    );
  });

  it('includes latency metadata in response', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/mark-all-read', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(data.meta.latencyMs).toBeDefined();
    expect(typeof data.meta.latencyMs).toBe('number');
  });
});
