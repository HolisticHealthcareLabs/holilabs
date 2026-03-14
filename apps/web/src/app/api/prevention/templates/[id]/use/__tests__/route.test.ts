import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlanTemplate: { findUnique: jest.fn(), update: jest.fn() },
    preventionPlan: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: { id: 'tpl-1' },
};

const mockTemplate = {
  id: 'tpl-1',
  templateName: 'Diabetes Prevention Plan',
  planType: 'PREVENTIVE',
  description: 'Standard T2D prevention',
  guidelineSource: 'ADA',
  evidenceLevel: 'A',
  isActive: true,
  goals: [{ goal: 'Reduce HbA1c' }],
  recommendations: [],
};

const mockPlan = {
  id: 'plan-new',
  patientId: 'patient-1',
  planName: 'Diabetes Prevention Plan',
  status: 'ACTIVE',
};

describe('POST /api/prevention/templates/[id]/use', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new plan from template', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.preventionPlan.create as jest.Mock).mockResolvedValue(mockPlan);
    (prisma.preventionPlanTemplate.update as jest.Mock).mockResolvedValue({ ...mockTemplate, useCount: 1 });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/use', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.plan.id).toBe('plan-new');
    expect(data.data.templateId).toBe('tpl-1');
    expect(data.message).toBe('Plan created from template successfully');
  });

  it('returns 400 when patientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/use', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Patient ID is required');
  });

  it('returns 404 when template not found', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/missing/use', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Template not found');
  });

  it('returns 400 when template is inactive', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue({
      ...mockTemplate,
      isActive: false,
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/use', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Template is not active');
  });
});
