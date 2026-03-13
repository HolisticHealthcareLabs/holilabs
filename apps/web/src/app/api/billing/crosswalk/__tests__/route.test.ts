/**
 * GET /api/billing/crosswalk - SNOMED-to-billing crosswalk tests
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {},
}));

jest.mock('@/lib/finance/billing-router', () => ({
  getBillingRouter: jest.fn(),
}));

jest.mock('@/lib/validation/billing-schemas', () => ({
  CrosswalkQuerySchema: {
    parse: jest.fn(),
  },
}));

const { GET } = require('../route');
const { getBillingRouter } = require('@/lib/finance/billing-router');
const { CrosswalkQuerySchema } = require('@/lib/validation/billing-schemas');
const { verifyPatientAccess } = require('@/lib/api/middleware');

describe('GET /api/billing/crosswalk', () => {
  const mockCrosswalk = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (getBillingRouter as jest.Mock).mockReturnValue({ crosswalkCode: mockCrosswalk });
  });

  it('returns crosswalk result for valid SNOMED code', async () => {
    (CrosswalkQuerySchema.parse as jest.Mock).mockReturnValue({
      snomedConceptId: '123456', country: 'BR',
    });
    mockCrosswalk.mockResolvedValue({
      billingCode: '10101012', billingSystem: 'TUSS', description: 'Consulta',
    });

    const request = new NextRequest('http://localhost:3000/api/billing/crosswalk?snomedConceptId=123456&country=BR');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.billingCode).toBe('10101012');
  });

  it('returns 404 when crosswalk not found', async () => {
    (CrosswalkQuerySchema.parse as jest.Mock).mockReturnValue({
      snomedConceptId: '999999', country: 'BR',
    });
    mockCrosswalk.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/billing/crosswalk?snomedConceptId=999999&country=BR');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Crosswalk not found');
  });

  it('returns 400 on validation failure', async () => {
    const { ZodError } = require('zod');
    (CrosswalkQuerySchema.parse as jest.Mock).mockImplementation(() => {
      const err = new ZodError([{ code: 'invalid_type', expected: 'string', received: 'undefined', path: ['snomedConceptId'], message: 'Required' }]);
      throw err;
    });

    const request = new NextRequest('http://localhost:3000/api/billing/crosswalk');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Query validation failed');
  });
});
