import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/enterprise/auth', () => ({
  validateEnterpriseKey: jest.fn(),
}));

jest.mock('@/lib/enterprise/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
  SINGLE_ASSESSMENT_LIMIT: { windowMs: 60000, maxRequests: 60 },
}));

jest.mock('@/services/risk-calculator.service', () => ({
  calculateCompositeRisk: jest.fn(),
}));

jest.mock('@/services/enterprise-export.service', () => ({
  exportForEnterprise: jest.fn(),
  ExportPIIViolationError: class extends Error {},
}));

jest.mock('@/lib/finance/tuss-lookup', () => ({
  estimateClaimCost: jest.fn().mockReturnValue({ totalBRL: 1500, totalUSD: 300 }),
}));

jest.mock('@/services/data-flywheel.service', () => ({
  dataFlywheelService: { ingest: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/lib/enterprise/usage-meter', () => ({
  enterpriseUsageMeter: { logUsage: jest.fn() },
}));

const { POST } = require('../route');
const { validateEnterpriseKey } = require('@/lib/enterprise/auth');
const { checkRateLimit } = require('@/lib/enterprise/rate-limiter');
const { calculateCompositeRisk } = require('@/services/risk-calculator.service');
const { exportForEnterprise } = require('@/services/enterprise-export.service');
const { dataFlywheelService } = require('@/services/data-flywheel.service');

describe('POST /api/enterprise/risk-assessment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateEnterpriseKey as jest.Mock).mockReturnValue({ authorized: true });
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true });
    (dataFlywheelService.ingest as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns risk assessment for valid input', async () => {
    (calculateCompositeRisk as jest.Mock).mockReturnValue({
      compositeScore: 42,
      riskTier: 'MODERATE',
      confidence: 0.85,
    });
    (exportForEnterprise as jest.Mock).mockReturnValue({
      pseudoId: 'pseudo-1',
      riskScore: 42,
      confidence: 0.85,
    });

    const req = new NextRequest('http://localhost:3000/api/enterprise/risk-assessment', {
      method: 'POST',
      headers: { 'x-pharma-partner-key': 'test-key-123' },
      body: JSON.stringify({
        patient: { ageYears: 55, tobaccoUse: false, alcoholUse: false },
        overrideHistory: { totalOverrides: 0, hardBlockOverrides: 0, totalRulesEvaluated: 10 },
        organizationId: 'org-1',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.__format).toBe('enterprise_risk_assessment_v1');
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

    const req = new NextRequest('http://localhost:3000/api/enterprise/risk-assessment', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 when request body is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/risk-assessment', {
      method: 'POST',
      headers: { 'x-pharma-partner-key': 'test-key-123' },
      body: JSON.stringify({ patient: {} }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Bad Request');
  });

  it('returns 500 when PII violation is detected in export', async () => {
    (calculateCompositeRisk as jest.Mock).mockReturnValue({
      compositeScore: 42, riskTier: 'MODERATE', confidence: 0.85,
    });
    const { ExportPIIViolationError } = require('@/services/enterprise-export.service');
    (exportForEnterprise as jest.Mock).mockImplementation(() => {
      throw new ExportPIIViolationError('PII found');
    });

    const req = new NextRequest('http://localhost:3000/api/enterprise/risk-assessment', {
      method: 'POST',
      headers: { 'x-pharma-partner-key': 'test-key-123' },
      body: JSON.stringify({
        patient: { ageYears: 55, tobaccoUse: false, alcoholUse: false },
        overrideHistory: { totalOverrides: 0, hardBlockOverrides: 0, totalRulesEvaluated: 10 },
        organizationId: 'org-1',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
