import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlanTemplate: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, PUT, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  params: { id: 'tmpl-1' },
  user: { id: 'doc-1', email: 'doc@test.com' },
};

const mockTemplate = {
  id: 'tmpl-1',
  templateName: 'CV Template',
  planType: 'CARDIOVASCULAR',
  description: 'Test template',
  isActive: true,
  useCount: 5,
  guidelineSource: 'AHA',
  evidenceLevel: 'Grade A',
  targetPopulation: null,
  goals: [],
  recommendations: [],
  createdBy: 'doc-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GET /api/prevention/templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns template by ID', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);

    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/templates/tmpl-1'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.template.templateName).toBe('CV Template');
  });

  it('returns 404 when template not found', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/templates/tmpl-1'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns 400 without template ID', async () => {
    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/templates/tmpl-1'), { ...mockContext, params: {} });
    const data = await res.json();

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/prevention/templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates template via transaction', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue({
      updatedTemplate: { ...mockTemplate, templateName: 'Updated Name' },
      newVersion: { id: 'v-1', versionNumber: 1, versionLabel: 'v1' },
      changedFields: ['templateName'],
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tmpl-1', {
      method: 'PUT',
      headers: { 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({ templateName: 'Updated Name' }),
    });

    const res = await PUT(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.changedFields).toContain('templateName');
  });

  it('returns 500 when template not found during update', async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Template not found'));

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tmpl-1', {
      method: 'PUT',
      body: JSON.stringify({ templateName: 'Updated' }),
    });

    const res = await PUT(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/prevention/templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('soft-deletes template by setting isActive to false', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.preventionPlanTemplate.update as jest.Mock).mockResolvedValue({ ...mockTemplate, isActive: false });

    const res = await DELETE(new NextRequest('http://localhost:3000/api/prevention/templates/tmpl-1', { method: 'DELETE' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.preventionPlanTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) })
    );
  });

  it('returns 404 when template not found for deletion', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await DELETE(new NextRequest('http://localhost:3000/api/prevention/templates/tmpl-1', { method: 'DELETE' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });
});
