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
  SocketEvent: { TEMPLATE_UPDATED: 'TEMPLATE_UPDATED' },
  NotificationPriority: { HIGH: 'HIGH' },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'user-1', email: 'user@test.com' },
  params: { id: 'tpl-1' },
};

const mockTargetVersion = {
  id: 'v1',
  templateId: 'tpl-1',
  versionNumber: 1,
  versionLabel: 'Initial version',
  templateData: {
    templateName: 'Old Name',
    planType: 'PREVENTIVE',
    description: 'Original',
    guidelineSource: 'AHA',
    evidenceLevel: 'A',
    targetPopulation: 'adults',
    goals: [],
    recommendations: [],
    isActive: true,
  },
};

const mockUpdatedTemplate = { id: 'tpl-1', templateName: 'Old Name', updatedAt: new Date() };

describe('POST /api/prevention/templates/[id]/revert', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reverts template to a specific version with snapshot', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        preventionPlanTemplateVersion: {
          findUnique: jest.fn().mockResolvedValue(mockTargetVersion),
          findFirst: jest.fn().mockResolvedValue({ versionNumber: 2 }),
          create: jest.fn().mockResolvedValue({ id: 'v3', versionNumber: 3 }),
        },
        preventionPlanTemplate: {
          findUnique: jest.fn().mockResolvedValue({ id: 'tpl-1', ...mockTargetVersion.templateData, templateName: 'Current Name', useCount: 3, createdBy: 'user-1', createdAt: new Date(), updatedAt: new Date() }),
          update: jest.fn().mockResolvedValue(mockUpdatedTemplate),
        },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/revert', {
      method: 'POST',
      body: JSON.stringify({ versionId: 'v1', createSnapshot: true }),
      headers: { 'x-forwarded-for': '127.0.0.1' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.revertedToVersion.id).toBe('v1');
    expect(data.data.preRevertSnapshot).toBeDefined();
  });

  it('returns 400 when versionId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/revert', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('versionId is required');
  });

  it('throws when version not found in transaction', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        preventionPlanTemplateVersion: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };
      return fn(tx);
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/revert', {
      method: 'POST',
      body: JSON.stringify({ versionId: 'missing' }),
    });

    await expect(POST(req, mockContext)).rejects.toThrow('Version not found');
  });

  it('reverts without snapshot when createSnapshot is false', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        preventionPlanTemplateVersion: {
          findUnique: jest.fn().mockResolvedValue(mockTargetVersion),
        },
        preventionPlanTemplate: {
          findUnique: jest.fn().mockResolvedValue({ id: 'tpl-1', ...mockTargetVersion.templateData, templateName: 'Current', useCount: 1, createdBy: 'user-1', createdAt: new Date(), updatedAt: new Date() }),
          update: jest.fn().mockResolvedValue(mockUpdatedTemplate),
        },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/revert', {
      method: 'POST',
      body: JSON.stringify({ versionId: 'v1', createSnapshot: false }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.preRevertSnapshot).toBeNull();
  });
});
