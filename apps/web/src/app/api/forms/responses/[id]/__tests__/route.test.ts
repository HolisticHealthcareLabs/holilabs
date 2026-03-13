/**
 * Form Responses API Route Tests
 *
 * GET /api/forms/responses/[id] - Get form responses for a specific instance
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
    formInstance: { findUnique: jest.fn() },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'fi-1' },
};

describe('GET /api/forms/responses/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns completed form responses', async () => {
    const mockForm = {
      id: 'fi-1',
      status: 'COMPLETED',
      progressPercent: 100,
      responses: { q1: 'Yes', q2: 'No' },
      signatureDataUrl: 'data:image/png;base64,abc',
      completedAt: new Date('2025-01-15'),
      patient: { id: 'p-1', firstName: 'Maria', lastName: 'Lopez', email: 'maria@test.com' },
      template: { id: 'tpl-1', title: 'Intake Form', description: 'Intake', structure: {} },
    };

    (prisma.formInstance.findUnique as jest.Mock).mockResolvedValue(mockForm);

    const request = new NextRequest('http://localhost:3000/api/forms/responses/fi-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.form.id).toBe('fi-1');
    expect(data.form.responses).toEqual({ q1: 'Yes', q2: 'No' });
    expect(data.form.patient.firstName).toBe('Maria');
  });

  it('returns 404 when form instance not found', async () => {
    (prisma.formInstance.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/forms/responses/nonexistent');
    const response = await GET(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Form not found');
  });

  it('returns 400 when form is not yet completed', async () => {
    (prisma.formInstance.findUnique as jest.Mock).mockResolvedValue({
      id: 'fi-2',
      status: 'PENDING',
      progressPercent: 30,
      responses: {},
    });

    const request = new NextRequest('http://localhost:3000/api/forms/responses/fi-2');
    const response = await GET(request, { ...mockContext, params: { id: 'fi-2' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('not been completed');
  });

  it('also accepts SIGNED status as completed', async () => {
    const mockForm = {
      id: 'fi-3',
      status: 'SIGNED',
      progressPercent: 100,
      responses: { q1: 'Answer' },
      signatureDataUrl: 'data:image/png;base64,xyz',
      completedAt: new Date('2025-01-20'),
      patient: { id: 'p-1', firstName: 'Maria', lastName: 'Lopez', email: 'maria@test.com' },
      template: { id: 'tpl-1', title: 'Consent Form', description: 'Consent', structure: {} },
    };

    (prisma.formInstance.findUnique as jest.Mock).mockResolvedValue(mockForm);

    const request = new NextRequest('http://localhost:3000/api/forms/responses/fi-3');
    const response = await GET(request, { ...mockContext, params: { id: 'fi-3' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.form.status).toBe('SIGNED');
  });
});
