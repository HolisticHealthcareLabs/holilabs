import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlanTemplateVersion: { findUnique: jest.fn() },
    preventionPlanTemplate: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'user-1', email: 'user@test.com' },
  params: { id: 'tpl-1' },
};

const mockTemplateData = {
  templateName: 'Old Name',
  planType: 'PREVENTIVE',
  description: 'Old description',
  guidelineSource: 'AHA',
  evidenceLevel: 'A',
  targetPopulation: 'adults',
  goals: [],
  recommendations: [],
  isActive: true,
};

const mockVersion1 = {
  id: 'v1',
  templateId: 'tpl-1',
  versionNumber: 1,
  versionLabel: 'Initial version',
  changeLog: 'First version',
  templateData: mockTemplateData,
  createdByUser: { id: 'user-1', firstName: 'Dr.', lastName: 'Smith', email: 'user@test.com' },
  createdAt: new Date(),
};

const mockVersion2 = {
  id: 'v2',
  templateId: 'tpl-1',
  versionNumber: 2,
  versionLabel: 'Updated',
  changeLog: 'Updated name',
  templateData: { ...mockTemplateData, templateName: 'New Name', description: 'New description' },
  createdByUser: { id: 'user-1', firstName: 'Dr.', lastName: 'Smith', email: 'user@test.com' },
  createdAt: new Date(),
};

describe('POST /api/prevention/templates/[id]/compare', () => {
  beforeEach(() => jest.clearAllMocks());

  it('compares two versions and returns differences', async () => {
    (prisma.preventionPlanTemplateVersion.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockVersion1)
      .mockResolvedValueOnce(mockVersion2);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/compare', {
      method: 'POST',
      body: JSON.stringify({ versionId1: 'v1', versionId2: 'v2' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.differences).toBeDefined();
    expect(data.data.changedFields).toContain('templateName');
    expect(data.data.summary.changedFields).toBeGreaterThan(0);
  });

  it('returns 400 when versionId1 is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/compare', {
      method: 'POST',
      body: JSON.stringify({ versionId2: 'v2' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('versionId1 is required');
  });

  it('returns 404 when version 1 not found', async () => {
    (prisma.preventionPlanTemplateVersion.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/compare', {
      method: 'POST',
      body: JSON.stringify({ versionId1: 'missing', versionId2: 'v2' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Version 1 not found');
  });

  it('compares version with current template when compareWithCurrent is true', async () => {
    (prisma.preventionPlanTemplateVersion.findUnique as jest.Mock).mockResolvedValue(mockVersion1);
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue({
      ...mockTemplateData,
      id: 'tpl-1',
      useCount: 5,
      createdBy: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/compare', {
      method: 'POST',
      body: JSON.stringify({ versionId1: 'v1', compareWithCurrent: true }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.version2.id).toBe('current');
  });
});
