import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlanTemplateVersion: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'user-1', email: 'user@test.com' },
  params: { id: 'tpl-1', versionId: 'v1' },
};

const mockVersion = {
  id: 'v1',
  templateId: 'tpl-1',
  versionNumber: 1,
  versionLabel: 'Initial version',
  changeLog: 'First version',
  changedFields: ['templateName'],
  templateData: { templateName: 'Diabetes Care', planType: 'PREVENTIVE' },
  template: { id: 'tpl-1', templateName: 'Diabetes Care' },
  createdByUser: { id: 'user-1', firstName: 'Dr.', lastName: 'Smith', email: 'user@test.com' },
  createdAt: new Date(),
};

describe('GET /api/prevention/templates/[id]/versions/[versionId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns version details', async () => {
    (prisma.preventionPlanTemplateVersion.findUnique as jest.Mock).mockResolvedValue(mockVersion);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/versions/v1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('v1');
    expect(data.data.versionNumber).toBe(1);
    expect(data.data.templateData).toBeDefined();
  });

  it('returns 404 when version not found', async () => {
    (prisma.preventionPlanTemplateVersion.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/versions/missing');
    const res = await GET(req, { ...mockContext, params: { id: 'tpl-1', versionId: 'missing' } });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Version not found');
  });

  it('returns 400 when version belongs to different template', async () => {
    (prisma.preventionPlanTemplateVersion.findUnique as jest.Mock).mockResolvedValue({
      ...mockVersion,
      templateId: 'other-tpl',
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/versions/v1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Version does not belong to this template');
  });

  it('returns 400 when templateId or versionId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates//versions/');
    const res = await GET(req, { user: { id: 'user-1' }, params: {} });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('required');
  });
});
