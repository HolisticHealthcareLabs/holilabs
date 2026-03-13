/**
 * GET /api/forms/sent - Sent forms list tests
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    formInstance: { findMany: jest.fn() },
  },
}));

jest.mock('@prisma/client', () => ({
  FormStatus: {
    PENDING: 'PENDING',
    VIEWED: 'VIEWED',
    IN_PROGRESS: 'IN_PROGRESS',
    SIGNED: 'SIGNED',
    COMPLETED: 'COMPLETED',
    REVOKED: 'REVOKED',
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockForms = [
  {
    id: 'fi-1', status: 'PENDING', sentAt: new Date(),
    patient: { id: 'p-1', firstName: 'Maria', lastName: 'Lopez' },
    template: { id: 'tpl-1', title: 'Intake Form', category: 'INTAKE' },
  },
  {
    id: 'fi-2', status: 'SIGNED', sentAt: new Date(),
    patient: { id: 'p-2', firstName: 'João', lastName: 'Silva' },
    template: { id: 'tpl-2', title: 'Consent Form', category: 'CONSENT' },
  },
];

describe('GET /api/forms/sent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns all sent forms', async () => {
    (prisma.formInstance.findMany as jest.Mock).mockResolvedValue(mockForms);

    const request = new NextRequest('http://localhost:3000/api/forms/sent');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.forms).toHaveLength(2);
  });

  it('filters by status parameter', async () => {
    (prisma.formInstance.findMany as jest.Mock).mockResolvedValue([mockForms[0]]);

    const request = new NextRequest('http://localhost:3000/api/forms/sent?status=PENDING');
    await GET(request);

    const call = (prisma.formInstance.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.status).toBe('PENDING');
  });

  it('returns 500 on database error', async () => {
    (prisma.formInstance.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost:3000/api/forms/sent');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed');
  });
});
