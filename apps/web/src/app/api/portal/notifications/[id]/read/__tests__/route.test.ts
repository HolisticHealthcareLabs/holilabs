import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'p@test.com' },
  requestId: 'req-1',
};

const mockNotification = {
  id: 'notif-1',
  recipientId: 'patient-1',
  recipientType: 'PATIENT',
  isRead: false,
  readAt: null,
};

describe('POST /api/portal/notifications/[id]/read', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks notification as read successfully', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(mockNotification);
    (prisma.notification.update as jest.Mock).mockResolvedValue({
      ...mockNotification,
      isRead: true,
      readAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/portal/notifications/notif-1/read', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.isRead).toBe(true);
  });

  it('returns 404 when notification not found', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/portal/notifications/missing/read', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 403 when notification belongs to another patient', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      ...mockNotification,
      recipientId: 'other-patient',
    });

    const req = new NextRequest('http://localhost:3000/api/portal/notifications/notif-1/read', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it('returns 403 when notification is not for a PATIENT recipient type', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      ...mockNotification,
      recipientType: 'CLINICIAN',
    });

    const req = new NextRequest('http://localhost:3000/api/portal/notifications/notif-1/read', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
  });
});
