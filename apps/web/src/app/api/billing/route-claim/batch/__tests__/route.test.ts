/**
 * POST /api/billing/route-claim/batch - Batch claim routing tests
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
  BatchRouteClaimSchema: {
    parse: jest.fn(),
  },
}));

const { POST } = require('../route');
const { getBillingRouter } = require('@/lib/finance/billing-router');
const { BatchRouteClaimSchema } = require('@/lib/validation/billing-schemas');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockRouteResult = {
  billingCode: '10101012',
  billingSystem: 'TUSS',
  rate: { negotiatedRate: 150, currency: 'BRL', isCovered: true },
  priorAuth: { required: false },
  routingConfidence: 0.95,
};

describe('POST /api/billing/route-claim/batch', () => {
  const mockRouteClaim = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (getBillingRouter as jest.Mock).mockReturnValue({ routeClaim: mockRouteClaim });
  });

  it('routes batch claims and returns summary', async () => {
    (BatchRouteClaimSchema.parse as jest.Mock).mockReturnValue({
      procedures: [
        { snomedConceptId: '111' },
        { snomedConceptId: '222' },
      ],
      country: 'BR',
      insurerId: '11111111-1111-1111-1111-111111111111',
    });
    mockRouteClaim.mockResolvedValue(mockRouteResult);

    const request = new NextRequest('http://localhost:3000/api/billing/route-claim/batch', {
      method: 'POST',
      body: JSON.stringify({
        procedures: [{ snomedConceptId: '111' }, { snomedConceptId: '222' }],
        country: 'BR',
        insurerId: '11111111-1111-1111-1111-111111111111',
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.results).toHaveLength(2);
    expect(data.data.summary.totalProcedures).toBe(2);
    expect(data.data.summary.resolvedCount).toBe(2);
    expect(data.data.summary.totalEstimatedRate).toBe(300);
  });

  it('rejects invalid input', async () => {
    const { ZodError } = require('zod');
    (BatchRouteClaimSchema.parse as jest.Mock).mockImplementation(() => {
      const err = new ZodError([{ code: 'too_small', minimum: 1, type: 'array', inclusive: true, path: ['procedures'], message: 'Required' }]);
      throw err;
    });

    const request = new NextRequest('http://localhost:3000/api/billing/route-claim/batch', {
      method: 'POST',
      body: JSON.stringify({ procedures: [] }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('reports prior auth requirement in summary', async () => {
    (BatchRouteClaimSchema.parse as jest.Mock).mockReturnValue({
      procedures: [{ snomedConceptId: '333' }],
      country: 'BR',
      insurerId: '11111111-1111-1111-1111-111111111111',
    });
    mockRouteClaim.mockResolvedValue({
      ...mockRouteResult,
      priorAuth: { required: true },
    });

    const request = new NextRequest('http://localhost:3000/api/billing/route-claim/batch', {
      method: 'POST',
      body: JSON.stringify({
        procedures: [{ snomedConceptId: '333' }],
        country: 'BR',
        insurerId: '11111111-1111-1111-1111-111111111111',
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(data.data.summary.anyPriorAuthRequired).toBe(true);
  });
});
