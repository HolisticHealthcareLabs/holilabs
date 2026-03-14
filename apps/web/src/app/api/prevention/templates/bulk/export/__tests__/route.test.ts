import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlanTemplate: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@test.com' },
  params: {},
};

const mockTemplates = [
  {
    id: 'tpl-1',
    templateName: 'Diabetes Prevention',
    planType: 'PREVENTIVE',
    description: 'T2D prevention',
    guidelineSource: 'ADA',
    evidenceLevel: 'A',
    targetPopulation: 'adults 40-65',
    goals: [{ goal: 'Reduce HbA1c' }],
    recommendations: [],
    isActive: true,
    useCount: 5,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    createdByUser: { id: 'admin-1', firstName: 'Dr.', lastName: 'Smith', email: 'admin@test.com' },
  },
];

describe('POST /api/prevention/templates/bulk/export', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exports templates as JSON', async () => {
    (prisma.preventionPlanTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'admin-1', firstName: 'Dr.', lastName: 'Smith', email: 'admin@test.com' });

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/bulk/export', {
      method: 'POST',
      body: JSON.stringify({ templateIds: ['tpl-1'], format: 'json' }),
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Content-Disposition')).toContain('prevention-templates');
    const body = await res.text();
    const parsed = JSON.parse(body);
    expect(parsed.templateCount).toBe(1);
  });

  it('exports templates as CSV', async () => {
    (prisma.preventionPlanTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/bulk/export', {
      method: 'POST',
      body: JSON.stringify({ templateIds: ['tpl-1'], format: 'csv' }),
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    const body = await res.text();
    expect(body).toContain('Template Name');
    expect(body).toContain('Diabetes Prevention');
  });

  it('returns 400 when templateIds is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/bulk/export', {
      method: 'POST',
      body: JSON.stringify({ templateIds: [] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 400 for invalid format', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/bulk/export', {
      method: 'POST',
      body: JSON.stringify({ templateIds: ['tpl-1'], format: 'xml' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('format');
  });
});
