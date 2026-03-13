/**
 * GET /api/billing/insurers - Insurers list tests
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    insurer: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/validation/billing-schemas', () => ({
  InsurersQuerySchema: {
    parse: jest.fn(),
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { InsurersQuerySchema } = require('@/lib/validation/billing-schemas');
const { verifyPatientAccess } = require('@/lib/api/middleware');

describe('GET /api/billing/insurers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns active insurers', async () => {
    (InsurersQuerySchema.parse as jest.Mock).mockReturnValue({});
    (prisma.insurer.findMany as jest.Mock).mockResolvedValue([
      { id: 'ins-1', name: 'Unimed', country: 'BR', insurerType: 'PRIVATE' },
      { id: 'ins-2', name: 'SulAmérica', country: 'BR', insurerType: 'PRIVATE' },
    ]);

    const request = new NextRequest('http://localhost:3000/api/billing/insurers');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
  });

  it('filters by country when provided', async () => {
    (InsurersQuerySchema.parse as jest.Mock).mockReturnValue({ country: 'UY' });
    (prisma.insurer.findMany as jest.Mock).mockResolvedValue([
      { id: 'ins-3', name: 'Casmu', country: 'UY' },
    ]);

    const request = new NextRequest('http://localhost:3000/api/billing/insurers?country=UY');
    await GET(request);

    const call = (prisma.insurer.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.country).toBe('UY');
  });

  it('returns 400 on validation failure', async () => {
    const { ZodError } = require('zod');
    (InsurersQuerySchema.parse as jest.Mock).mockImplementation(() => {
      const err = new ZodError([{ code: 'invalid_enum_value', options: ['BR', 'UY', 'AR', 'CL', 'CO', 'MX', 'US'], received: 'XX', path: ['country'], message: 'Invalid enum value' }]);
      throw err;
    });

    const request = new NextRequest('http://localhost:3000/api/billing/insurers?country=XX');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Query validation failed');
  });
});
