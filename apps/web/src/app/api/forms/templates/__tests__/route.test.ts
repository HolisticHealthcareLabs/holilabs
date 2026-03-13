/**
 * Form Templates API Route Tests
 *
 * GET  /api/forms/templates - List all form templates
 * POST /api/forms/templates - Create new template
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    formTemplate: { findMany: jest.fn(), create: jest.fn() },
  },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/forms/templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all active templates', async () => {
    const mockTemplates = [
      { id: 'tpl-1', title: 'Intake Form', category: 'INTAKE', isBuiltIn: true, usageCount: 42 },
      { id: 'tpl-2', title: 'Consent Form', category: 'CONSENT', isBuiltIn: true, usageCount: 18 },
    ];

    (prisma.formTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);

    const request = new NextRequest('http://localhost:3000/api/forms/templates');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.templates).toHaveLength(2);
    expect(prisma.formTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } })
    );
  });

  it('filters templates by category', async () => {
    (prisma.formTemplate.findMany as jest.Mock).mockResolvedValue([
      { id: 'tpl-1', title: 'Intake Form', category: 'INTAKE' },
    ]);

    const request = new NextRequest('http://localhost:3000/api/forms/templates?category=INTAKE');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.formTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { category: 'INTAKE', isActive: true } })
    );
  });
});

describe('POST /api/forms/templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new template', async () => {
    const mockCreated = {
      id: 'tpl-new',
      title: 'PHQ-9 Depression Screen',
      category: 'SCREENING',
      estimatedMinutes: 5,
      isActive: true,
      isBuiltIn: false,
    };

    (prisma.formTemplate.create as jest.Mock).mockResolvedValue(mockCreated);

    const request = new NextRequest('http://localhost:3000/api/forms/templates', {
      method: 'POST',
      body: JSON.stringify({
        title: 'PHQ-9 Depression Screen',
        category: 'SCREENING',
        estimatedMinutes: 5,
        structure: { fields: [] },
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.template.title).toBe('PHQ-9 Depression Screen');
    expect(prisma.formTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'PHQ-9 Depression Screen',
          category: 'SCREENING',
          createdBy: 'clinician-1',
        }),
      })
    );
  });

  it('returns 400 when title is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/forms/templates', {
      method: 'POST',
      body: JSON.stringify({ category: 'SCREENING' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
    expect(prisma.formTemplate.create).not.toHaveBeenCalled();
  });

  it('returns 400 when category is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/forms/templates', {
      method: 'POST',
      body: JSON.stringify({ title: 'My Form' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
    expect(prisma.formTemplate.create).not.toHaveBeenCalled();
  });
});
