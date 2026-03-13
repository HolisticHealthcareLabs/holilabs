import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlanTemplate: { findMany: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
};

describe('GET /api/prevention/templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns list of templates', async () => {
    (prisma.preventionPlanTemplate.findMany as jest.Mock).mockResolvedValue([
      { id: 't-1', templateName: 'CV Template', planType: 'CARDIOVASCULAR', isActive: true, useCount: 5, _count: { comments: 2, shares: 1 } },
      { id: 't-2', templateName: 'Diabetes Template', planType: 'DIABETES', isActive: true, useCount: 3, _count: { comments: 0, shares: 0 } },
    ]);

    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/templates'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.count).toBe(2);
    expect(data.data.templates).toHaveLength(2);
  });

  it('filters by planType', async () => {
    (prisma.preventionPlanTemplate.findMany as jest.Mock).mockResolvedValue([]);

    await GET(new NextRequest('http://localhost:3000/api/prevention/templates?planType=DIABETES'));

    expect(prisma.preventionPlanTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ planType: 'DIABETES' }),
      })
    );
  });

  it('filters by isActive', async () => {
    (prisma.preventionPlanTemplate.findMany as jest.Mock).mockResolvedValue([]);

    await GET(new NextRequest('http://localhost:3000/api/prevention/templates?isActive=true'));

    expect(prisma.preventionPlanTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    );
  });
});

describe('POST /api/prevention/templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new template', async () => {
    (prisma.preventionPlanTemplate.create as jest.Mock).mockResolvedValue({
      id: 't-new',
      templateName: 'New Template',
      planType: 'COMPREHENSIVE',
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates', {
      method: 'POST',
      body: JSON.stringify({
        templateName: 'New Template',
        planType: 'COMPREHENSIVE',
        description: 'A test template',
        goals: [{ goal: 'Goal 1', category: 'screening' }],
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.template.templateName).toBe('New Template');
  });

  it('returns 400 when required fields are missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates', {
      method: 'POST',
      body: JSON.stringify({ description: 'Missing name and type' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('returns 400 for invalid goal structure', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates', {
      method: 'POST',
      body: JSON.stringify({
        templateName: 'Bad Goals',
        planType: 'COMPREHENSIVE',
        goals: [{ goal: 'Missing category' }],
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('category');
  });
});
