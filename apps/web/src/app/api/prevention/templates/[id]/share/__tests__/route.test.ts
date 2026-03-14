import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlanTemplate: { findUnique: jest.fn() },
    preventionTemplateShare: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/socket-server', () => ({
  emitPreventionEventToUser: jest.fn(),
}));

jest.mock('@/lib/socket/events', () => ({
  SocketEvent: { TEMPLATE_SHARED: 'TEMPLATE_SHARED' },
  NotificationPriority: { MEDIUM: 'MEDIUM' },
}));

const { GET, POST, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const OWNER_ID = 'user-1';
const mockContext = {
  user: { id: OWNER_ID, email: 'owner@test.com' },
  params: { id: 'tpl-1' },
};

const mockTemplate = { id: 'tpl-1', templateName: 'T2D Template', createdBy: OWNER_ID };

describe('GET /api/prevention/templates/[id]/share', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns sharing list for template owner', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.preventionTemplateShare.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'share-1',
        sharedWithUser: { id: 'user-2', firstName: 'Dr', lastName: 'Jones', email: 'jones@test.com', profilePictureUrl: null },
        sharedByUser: { id: OWNER_ID, firstName: 'Dr', lastName: 'Smith' },
        permission: 'VIEW',
        message: null,
        createdAt: new Date(),
        expiresAt: null,
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/share');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.shares).toHaveLength(1);
  });

  it('returns 403 when non-owner tries to view share list', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue({
      ...mockTemplate,
      createdBy: 'other-user',
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/share');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('Only template owner can view sharing list');
  });
});

describe('POST /api/prevention/templates/[id]/share', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shares template with a user', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.preventionTemplateShare.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'user-2', firstName: 'Dr', lastName: 'Jones', email: 'jones@test.com' })
      .mockResolvedValueOnce({ firstName: 'Dr', lastName: 'Smith' });
    (prisma.preventionTemplateShare.upsert as jest.Mock).mockResolvedValue({
      id: 'share-1',
      permission: 'VIEW',
      message: null,
      createdAt: new Date(),
      expiresAt: null,
      sharedWithUser: { id: 'user-2', firstName: 'Dr', lastName: 'Jones', email: 'jones@test.com' },
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/share', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-2', permission: 'VIEW' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.share.permission).toBe('VIEW');
  });

  it('returns 400 for invalid permission', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/share', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-2', permission: 'SUPERADMIN' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid permission');
  });

  it('returns 400 when trying to share with self', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/share', {
      method: 'POST',
      body: JSON.stringify({ userId: OWNER_ID, permission: 'VIEW' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Cannot share template with yourself');
  });
});

describe('DELETE /api/prevention/templates/[id]/share', () => {
  beforeEach(() => jest.clearAllMocks());

  it('removes sharing access', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.preventionTemplateShare.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.preventionTemplateShare.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest(
      'http://localhost:3000/api/prevention/templates/tpl-1/share?userId=user-2',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.deleted).toBe(1);
  });

  it('returns 404 when share not found', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.preventionTemplateShare.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.preventionTemplateShare.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

    const req = new NextRequest(
      'http://localhost:3000/api/prevention/templates/tpl-1/share?userId=user-2',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Share not found');
  });
});
