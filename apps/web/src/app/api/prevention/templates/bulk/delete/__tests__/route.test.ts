import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/socket-server', () => ({
  emitPreventionEventToAll: jest.fn(),
}));

jest.mock('@/lib/socket/events', () => ({
  SocketEvent: { BULK_OPERATION_COMPLETED: 'BULK_OPERATION_COMPLETED' },
  NotificationPriority: { HIGH: 'HIGH' },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@test.com' },
  params: {},
};

describe('POST /api/prevention/templates/bulk/delete', () => {
  beforeEach(() => jest.clearAllMocks());

  it('bulk deletes templates successfully', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        preventionPlanTemplate: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'tpl-1', templateName: 'Template 1' },
            { id: 'tpl-2', templateName: 'Template 2' },
          ]),
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        auditLog: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      };
      return fn(tx);
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ templateIds: ['tpl-1', 'tpl-2'] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.deleted).toBe(2);
    expect(data.data.templates).toHaveLength(2);
  });

  it('returns 400 when templateIds array is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ templateIds: [] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('required');
  });

  it('returns 400 when deleting more than 100 templates', async () => {
    const templateIds = Array.from({ length: 101 }, (_, i) => `tpl-${i}`);
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ templateIds }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('100');
  });

  it('returns 400 when templateIds is not an array', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ templateIds: 'not-an-array' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
  });
});
