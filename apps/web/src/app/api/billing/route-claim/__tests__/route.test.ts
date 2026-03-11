/**
 * POST /api/billing/route-claim - Billing claim routing tests
 *
 * Tests: POST routes claim, returns billing code, rejects invalid input.
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {},
}));

jest.mock('@/lib/finance/billing-router', () => ({
  getBillingRouter: jest.fn(),
}));

const { POST } = require('../route');
const { getBillingRouter } = require('@/lib/finance/billing-router');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockRouteResult = {
  snomedConceptId: '123456',
  country: 'BR',
  billingCode: '10101012',
  billingSystem: 'TUSS',
  procedureDescription: 'Consulta médica',
  actuarialWeight: 1.0,
  rate: { negotiatedRate: 150, currency: 'BRL', isCovered: true },
  priorAuth: { required: false, windowDays: null },
  clinicianNetwork: { isInNetwork: true },
  routingConfidence: 1.0,
  usedFallback: false,
  resolvedAt: new Date().toISOString(),
};

describe('POST /api/billing/route-claim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockRouter = { routeClaim: jest.fn().mockResolvedValue(mockRouteResult) };
    (getBillingRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('POST routes claim and returns billing code', async () => {
    const request = new NextRequest('http://localhost:3000/api/billing/route-claim', {
      method: 'POST',
      body: JSON.stringify({
        snomedConceptId: '123456',
        country: 'BR',
        insurerId: '11111111-1111-1111-1111-111111111111',
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.billingCode).toBe('10101012');
    expect(data.data.snomedConceptId).toBe('123456');
    expect(getBillingRouter).toHaveBeenCalled();
  });

  it('rejects invalid input (missing snomedConceptId)', async () => {
    const request = new NextRequest('http://localhost:3000/api/billing/route-claim', {
      method: 'POST',
      body: JSON.stringify({
        country: 'BR',
        insurerId: '11111111-1111-1111-1111-111111111111',
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
    expect(getBillingRouter).not.toHaveBeenCalled();
  });

  it('rejects invalid insurerId (non-UUID)', async () => {
    const request = new NextRequest('http://localhost:3000/api/billing/route-claim', {
      method: 'POST',
      body: JSON.stringify({
        snomedConceptId: '123456',
        country: 'BR',
        insurerId: 'invalid-uuid',
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
    expect(getBillingRouter).not.toHaveBeenCalled();
  });
});
