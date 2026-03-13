import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlanTemplate: { updateMany: jest.fn(), findMany: jest.fn() },
    auditLog: { createMany: jest.fn() },
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
  NotificationPriority: { MEDIUM: 'MEDIUM' },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
};

const mockTemplates = [
  { id: 'tmpl-1', templateName: 'Cardiovascular Template' },
  { id: 'tmpl-2', templateName: 'Diabetes Template' },
];

describe('POST /api/prevention/templates/bulk/activate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('activates multiple templates successfully', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        preventionPlanTemplate: {
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
          findMany: jest.fn().mockResolvedValue(mockTemplates),
        },
        auditLog: { createMany: jest.fn() },
      };
      return fn(tx);
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/bulk/activate', {
      method: 'POST',
      body: JSON.stringify({ templateIds: ['tmpl-1', 'tmpl-2'] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.updated).toBe(2);
    expect(data.data.templates).toHaveLength(2);
  });

  it('returns 400 when templateIds array is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/bulk/activate', {
      method: 'POST',
      body: JSON.stringify({ templateIds: [] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('must not be empty');
  });

  it('returns 400 when templateIds is not provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/bulk/activate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it('returns 400 when more than 100 templates are submitted', async () => {
    const tooManyIds = Array.from({ length: 101 }, (_, i) => `tmpl-${i}`);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/bulk/activate', {
      method: 'POST',
      body: JSON.stringify({ templateIds: tooManyIds }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('100');
  });
});
