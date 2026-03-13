import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlanTemplate: { findUnique: jest.fn() },
    preventionPlanTemplateVersion: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
    auditLog: { create: jest.fn() },
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
  SocketEvent: { TEMPLATE_UPDATED: 'TEMPLATE_UPDATED', BULK_OPERATION_COMPLETED: 'BULK_OPERATION_COMPLETED' },
  NotificationPriority: { MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: { id: 'tmpl-1' },
};

const mockTemplate = {
  id: 'tmpl-1',
  templateName: 'Cardiovascular Template',
  planType: 'CARDIOVASCULAR',
  description: 'Test description',
  guidelineSource: 'AHA',
  evidenceLevel: 'A',
  targetPopulation: 'Adults 40+',
  goals: [],
  recommendations: [],
  isActive: true,
  useCount: 5,
  createdBy: 'doc-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdByUser: { id: 'doc-1', firstName: 'Dr', lastName: 'Test', email: 'doc@test.com' },
};

const mockVersion = {
  id: 'ver-1',
  templateId: 'tmpl-1',
  versionNumber: 1,
  versionLabel: 'v1',
  changeLog: 'Initial version',
  changedFields: ['goals'],
  createdBy: 'doc-1',
  createdAt: new Date(),
  createdByUser: { id: 'doc-1', firstName: 'Dr', lastName: 'Test', email: 'doc@test.com' },
};

describe('GET /api/prevention/templates/[id]/versions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns version history for a template', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.preventionPlanTemplateVersion.findMany as jest.Mock).mockResolvedValue([mockVersion]);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tmpl-1/versions');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.templateName).toBe('Cardiovascular Template');
    expect(data.data.versions).toHaveLength(1);
    expect(data.data.versions[0].versionNumber).toBe(1);
  });

  it('returns 404 when template not found', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/missing/versions');
    const res = await GET(req, { ...mockContext, params: { id: 'missing' } });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 400 when templateId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates//versions');
    const res = await GET(req, { ...mockContext, params: {} });
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it('returns empty array when no versions exist', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.preventionPlanTemplateVersion.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tmpl-1/versions');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.versions).toHaveLength(0);
  });
});

describe('POST /api/prevention/templates/[id]/versions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new version snapshot of the template', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        preventionPlanTemplate: {
          findUnique: jest.fn().mockResolvedValue(mockTemplate),
        },
        preventionPlanTemplateVersion: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ ...mockVersion, versionNumber: 1 }),
        },
        auditLog: { create: jest.fn() },
      };
      return fn(tx);
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tmpl-1/versions', {
      method: 'POST',
      body: JSON.stringify({ versionLabel: 'v1.0', changeLog: 'Updated goals', changedFields: ['goals'] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.version.versionNumber).toBe(1);
  });

  it('returns 400 when changeLog is not a string', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tmpl-1/versions', {
      method: 'POST',
      body: JSON.stringify({ changeLog: 123 }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('changeLog must be a string');
  });

  it('returns 400 when changedFields is not an array', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tmpl-1/versions', {
      method: 'POST',
      body: JSON.stringify({ changedFields: 'goals' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('changedFields must be an array');
  });
});
