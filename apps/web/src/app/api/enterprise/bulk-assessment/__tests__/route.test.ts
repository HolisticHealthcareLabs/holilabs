import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/enterprise/auth', () => ({
  validateEnterpriseKey: jest.fn(),
}));

jest.mock('@/lib/enterprise/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
  BULK_ASSESSMENT_LIMIT: { windowMs: 60000, maxRequests: 10 },
}));

jest.mock('@/services/risk-calculator.service', () => ({
  calculateCompositeRisk: jest.fn(),
}));

jest.mock('@/services/enterprise-export.service', () => ({
  batchExportForEnterprise: jest.fn(),
}));

jest.mock('@/lib/finance/tuss-lookup', () => ({
  estimateClaimCost: jest.fn().mockReturnValue({ totalBRL: 5000, totalUSD: 1000 }),
}));

jest.mock('@/services/data-flywheel.service', () => ({
  dataFlywheelService: { ingest: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/lib/enterprise/usage-meter', () => ({
  enterpriseUsageMeter: { logUsage: jest.fn() },
}));

jest.mock('@/lib/enterprise/webhook-dispatcher', () => ({
  webhookDispatcher: { dispatch: jest.fn().mockResolvedValue(undefined) },
}));

const { POST } = require('../route');
const { validateEnterpriseKey } = require('@/lib/enterprise/auth');
const { checkRateLimit } = require('@/lib/enterprise/rate-limiter');
const { calculateCompositeRisk } = require('@/services/risk-calculator.service');
const { batchExportForEnterprise } = require('@/services/enterprise-export.service');
const { dataFlywheelService } = require('@/services/data-flywheel.service');
const { webhookDispatcher } = require('@/lib/enterprise/webhook-dispatcher');

const makePatientEntry = (id: string) => ({
  id,
  patient: { ageYears: 45, tobaccoUse: false, alcoholUse: false },
  overrideHistory: { totalOverrides: 0, hardBlockOverrides: 0, totalRulesEvaluated: 5 },
});

describe('POST /api/enterprise/bulk-assessment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateEnterpriseKey as jest.Mock).mockReturnValue({ authorized: true });
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true });
    (dataFlywheelService.ingest as jest.Mock).mockResolvedValue(undefined);
    (webhookDispatcher.dispatch as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns bulk assessment summary', async () => {
    (calculateCompositeRisk as jest.Mock).mockReturnValue({
      compositeScore: 35, riskTier: 'MODERATE', confidence: 0.8,
    });
    (batchExportForEnterprise as jest.Mock).mockReturnValue({
      successful: [{ pseudoId: 'p1' }, { pseudoId: 'p2' }],
      failed: [],
    });

    const req = new NextRequest('http://localhost:3000/api/enterprise/bulk-assessment', {
      method: 'POST',
      headers: { 'x-pharma-partner-key': 'test-key-123' },
      body: JSON.stringify({
        patients: [makePatientEntry('p1'), makePatientEntry('p2')],
        organizationId: 'org-1',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.__format).toBe('enterprise_bulk_assessment_v1');
    expect(data.summary.totalAssessed).toBe(2);
  });

  it('returns 401 when API key is invalid', async () => {
    const errorResponse = new (require('next/server').NextResponse)(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 },
    );
    (validateEnterpriseKey as jest.Mock).mockReturnValue({
      authorized: false,
      response: errorResponse,
    });

    const req = new NextRequest('http://localhost:3000/api/enterprise/bulk-assessment', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 when patients array is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/bulk-assessment', {
      method: 'POST',
      headers: { 'x-pharma-partner-key': 'test-key-123' },
      body: JSON.stringify({ patients: [], organizationId: 'org-1' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it('returns 400 when batch size exceeds maximum', async () => {
    const patients = Array.from({ length: 101 }, (_, i) => makePatientEntry(`p${i}`));

    const req = new NextRequest('http://localhost:3000/api/enterprise/bulk-assessment', {
      method: 'POST',
      headers: { 'x-pharma-partner-key': 'test-key-123' },
      body: JSON.stringify({ patients, organizationId: 'org-1' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain('maximum');
  });
});
