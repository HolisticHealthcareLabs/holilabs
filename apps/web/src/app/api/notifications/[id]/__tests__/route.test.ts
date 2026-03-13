/**
 * Tests for /api/notifications/[id]
 *
 * - PUT marks notification as read
 * - PUT returns 404 when notification not found
 * - PUT returns 403 when user doesn't own notification
 * - DELETE removes notification
 */

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
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/notifications', () => ({
  markNotificationAsRead: jest.fn().mockResolvedValue({ id: 'notif-1', isRead: true }),
  deleteNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/demo/synthetic', () => ({
  getSyntheticNotifications: jest.fn().mockReturnValue([]),
  isDemoClinician: jest.fn().mockReturnValue(false),
}));

const { PUT, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'notif-1' },
  requestId: 'req-1',
};

describe('PUT /api/notifications/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('marks notification as read', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      id: 'notif-1',
      recipientId: 'clinician-1',
      recipientType: 'CLINICIAN',
      isRead: false,
    });

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'PUT',
    });

    const response = await PUT(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('leída');
  });

  it('returns 404 when notification not found', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notifications/nonexistent', {
      method: 'PUT',
    });

    const response = await PUT(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('no encontrada');
  });

  it('returns 403 when user does not own notification', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      id: 'notif-1',
      recipientId: 'other-user',
      recipientType: 'CLINICIAN',
    });

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'PUT',
    });

    const response = await PUT(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('permiso');
  });
});

describe('DELETE /api/notifications/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('deletes notification successfully', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      id: 'notif-1',
      recipientId: 'clinician-1',
      recipientType: 'CLINICIAN',
    });

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('eliminada');
  });
});
