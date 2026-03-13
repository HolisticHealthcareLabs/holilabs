/**
 * GET/POST /api/forms/public/[token] - Public form access and progress tests
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    formInstance: { findUnique: jest.fn(), update: jest.fn() },
    formAuditLog: { create: jest.fn() },
  },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockFormInstance = {
  id: 'fi-1',
  accessToken: 'valid-token',
  status: 'PENDING',
  expiresAt: new Date(Date.now() + 86400000),
  responses: {},
  currentStepIndex: 0,
  progressPercent: 0,
  patient: { id: 'p-1', firstName: 'Maria', lastName: 'Lopez' },
  template: { id: 'tpl-1', title: 'Intake Form', description: 'Patient intake', structure: {}, estimatedMinutes: 10 },
};

describe('GET /api/forms/public/[token]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.formInstance.update as jest.Mock).mockResolvedValue({});
    (prisma.formAuditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('returns form data for valid token', async () => {
    (prisma.formInstance.findUnique as jest.Mock).mockResolvedValue(mockFormInstance);

    const request = new NextRequest('http://localhost:3000/api/forms/public/valid-token');
    const response = await GET(request, { params: { token: 'valid-token' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.form.template.title).toBe('Intake Form');
    expect(prisma.formInstance.update).toHaveBeenCalled();
  });

  it('returns 404 for invalid token', async () => {
    (prisma.formInstance.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/forms/public/bad-token');
    const response = await GET(request, { params: { token: 'bad-token' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns 410 for expired form', async () => {
    (prisma.formInstance.findUnique as jest.Mock).mockResolvedValue({
      ...mockFormInstance,
      expiresAt: new Date(Date.now() - 86400000),
    });

    const request = new NextRequest('http://localhost:3000/api/forms/public/expired-token');
    const response = await GET(request, { params: { token: 'expired-token' } });
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error).toContain('expired');
  });
});

describe('POST /api/forms/public/[token]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.formInstance.update as jest.Mock).mockResolvedValue({});
    (prisma.formAuditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('saves progress successfully', async () => {
    (prisma.formInstance.findUnique as jest.Mock).mockResolvedValue(mockFormInstance);

    const request = new NextRequest('http://localhost:3000/api/forms/public/valid-token', {
      method: 'POST',
      body: JSON.stringify({ responses: { q1: 'yes' }, progress: 50 }),
    });
    const response = await POST(request, { params: { token: 'valid-token' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.formInstance.update).toHaveBeenCalled();
    expect(prisma.formAuditLog.create).toHaveBeenCalled();
  });
});
