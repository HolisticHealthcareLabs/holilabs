/**
 * POST /api/forms/public/[token]/submit - Form submission tests
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

jest.mock('@/lib/email', () => ({
  sendFormCompletionEmail: jest.fn().mockResolvedValue(undefined),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockFormInstance = {
  id: 'fi-1',
  accessToken: 'valid-token',
  status: 'IN_PROGRESS',
  expiresAt: new Date(Date.now() + 86400000),
  patient: { firstName: 'Maria', lastName: 'Lopez' },
  template: { title: 'Intake Form', structure: {} },
};

describe('POST /api/forms/public/[token]/submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.formAuditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('submits form with signature successfully', async () => {
    (prisma.formInstance.findUnique as jest.Mock).mockResolvedValue(mockFormInstance);
    (prisma.formInstance.update as jest.Mock).mockResolvedValue({
      ...mockFormInstance, status: 'SIGNED', completedAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/forms/public/valid-token/submit', {
      method: 'POST',
      body: JSON.stringify({
        responses: { q1: 'yes' },
        signatureDataUrl: 'data:image/png;base64,abc123',
      }),
    });
    const response = await POST(request, { params: { token: 'valid-token' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.formInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SIGNED', progressPercent: 100 }),
      })
    );
  });

  it('returns 400 when signature is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/forms/public/valid-token/submit', {
      method: 'POST',
      body: JSON.stringify({ responses: { q1: 'yes' } }),
    });
    const response = await POST(request, { params: { token: 'valid-token' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Signature');
  });

  it('returns 404 for invalid token', async () => {
    (prisma.formInstance.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/forms/public/bad-token/submit', {
      method: 'POST',
      body: JSON.stringify({
        responses: {},
        signatureDataUrl: 'data:image/png;base64,abc',
      }),
    });
    const response = await POST(request, { params: { token: 'bad-token' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns 410 for already completed form', async () => {
    (prisma.formInstance.findUnique as jest.Mock).mockResolvedValue({
      ...mockFormInstance,
      status: 'SIGNED',
    });

    const request = new NextRequest('http://localhost:3000/api/forms/public/valid-token/submit', {
      method: 'POST',
      body: JSON.stringify({
        responses: {},
        signatureDataUrl: 'data:image/png;base64,abc',
      }),
    });
    const response = await POST(request, { params: { token: 'valid-token' } });
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error).toContain('already been submitted');
  });
});
