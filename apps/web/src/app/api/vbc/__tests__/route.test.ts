import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  __esModule: true,
  safeErrorResponse: jest.fn((_error: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(
      { error: opts?.userMessage ?? 'Internal server error' },
      { status: 500 },
    );
  }),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    qualityMeasure: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    qualityMeasureResult: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    vBCPayerContract: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    patientAttribution: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    vBCOutcomeRecord: {
      findMany: jest.fn(),
    },
    careGoal: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/vbc/quality-engine.service', () => ({
  evaluateAndPersist: jest.fn(),
  getMeasureHistory: jest.fn(),
}));

jest.mock('@/lib/vbc/attribution.service', () => ({
  listAttributions: jest.fn(),
  getAttributionSummary: jest.fn(),
  reconcileAttributions: jest.fn(),
}));

jest.mock('@/lib/vbc/population-health.service', () => ({
  getPopulationDashboard: jest.fn(),
  getRiskDistribution: jest.fn(),
}));

const { prisma } = require('@/lib/prisma');
const { evaluateAndPersist, getMeasureHistory } = require('@/lib/vbc/quality-engine.service');
const { listAttributions, getAttributionSummary, reconcileAttributions } = require('@/lib/vbc/attribution.service');
const { getPopulationDashboard, getRiskDistribution } = require('@/lib/vbc/population-health.service');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
};

describe('VBC API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // POST /api/vbc/measures
  // -------------------------------------------------------------------------
  describe('POST /api/vbc/measures', () => {
    const { POST } = require('../../vbc/measures/route');

    const validBody = {
      code: 'HBA1C_CTRL',
      name: 'HbA1c Control for T2D',
      category: 'OUTCOME',
      numeratorRule: { '<': [{ var: 'hba1c' }, 8] },
      denominatorRule: { some: [{ var: 'diagnoses' }, { '===': [{ var: '' }, 'E11.9'] }] },
      sourceAuthority: 'ADA 2025 Standards of Care',
      effectiveDate: '2026-01-01',
    };

    it('creates a quality measure', async () => {
      const mockMeasure = { id: 'qm-1', ...validBody };
      (prisma.qualityMeasure.create as jest.Mock).mockResolvedValue(mockMeasure);

      const request = new NextRequest('http://localhost:3000/api/vbc/measures', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.code).toBe('HBA1C_CTRL');
    });

    it('rejects missing sourceAuthority', async () => {
      const { sourceAuthority, ...incomplete } = validBody;
      const request = new NextRequest('http://localhost:3000/api/vbc/measures', {
        method: 'POST',
        body: JSON.stringify(incomplete),
      });
      const response = await POST(request, mockContext);

      expect(response.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/vbc/measures
  // -------------------------------------------------------------------------
  describe('GET /api/vbc/measures', () => {
    const { GET } = require('../../vbc/measures/route');

    it('lists measures with filters', async () => {
      (prisma.qualityMeasure.findMany as jest.Mock).mockResolvedValue([
        { id: 'qm-1', code: 'HBA1C', category: 'OUTCOME' },
      ]);

      const request = new NextRequest('http://localhost:3000/api/vbc/measures?category=OUTCOME');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/vbc/measures/evaluate
  // -------------------------------------------------------------------------
  describe('POST /api/vbc/measures/evaluate', () => {
    const { POST } = require('../../vbc/measures/evaluate/route');

    it('evaluates a measure and returns result', async () => {
      const mockResult = {
        measureId: 'qm-1',
        measureCode: 'HBA1C_CTRL',
        numerator: 8,
        denominator: 10,
        rate: 0.8,
        meetsTarget: true,
      };
      (evaluateAndPersist as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/vbc/measures/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          measureCode: 'HBA1C_CTRL',
          organizationId: 'org-1',
          periodStart: '2026-01-01',
          periodEnd: '2026-03-31',
          population: [
            {
              patientId: 'p-1',
              age: 55,
              sex: 'M',
              diagnoses: ['E11.9'],
              medications: ['metformin'],
              labResults: [{ code: '4548-4', value: 7.1, unit: '%', date: '2026-01-15' }],
              encounters: [{ type: 'PRIMARY_CARE', date: '2026-01-01' }],
              vitals: [{ type: 'bp', value: 130, unit: 'mmHg', date: '2026-01-01' }],
            },
          ],
        }),
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.rate).toBe(0.8);
    });

    it('returns 404 when measure not found', async () => {
      (evaluateAndPersist as jest.Mock).mockRejectedValue(new Error('Quality measure with code "MISSING" not found'));

      const request = new NextRequest('http://localhost:3000/api/vbc/measures/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          measureCode: 'MISSING',
          organizationId: 'org-1',
          periodStart: '2026-01-01',
          periodEnd: '2026-03-31',
          population: [{
            patientId: 'p-1', age: 55, sex: 'M',
            diagnoses: [], medications: [], labResults: [],
            encounters: [], vitals: [],
          }],
        }),
      });
      const response = await POST(request, mockContext);

      expect(response.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/vbc/measures/[code]/results
  // -------------------------------------------------------------------------
  describe('GET /api/vbc/measures/[code]/results', () => {
    const { GET } = require('../../vbc/measures/[code]/results/route');

    it('returns measure history', async () => {
      (getMeasureHistory as jest.Mock).mockResolvedValue([
        { rate: 0.80, periodStart: '2026-01-01' },
        { rate: 0.75, periodStart: '2025-10-01' },
      ]);

      const request = new NextRequest('http://localhost:3000/api/vbc/measures/HBA1C/results?organizationId=org-1');
      const response = await GET(request, { ...mockContext, params: { code: 'HBA1C' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
    });

    it('requires organizationId', async () => {
      const request = new NextRequest('http://localhost:3000/api/vbc/measures/HBA1C/results');
      const response = await GET(request, { ...mockContext, params: { code: 'HBA1C' } });

      expect(response.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/vbc/population/dashboard
  // -------------------------------------------------------------------------
  describe('GET /api/vbc/population/dashboard', () => {
    const { GET } = require('../../vbc/population/dashboard/route');

    it('returns population dashboard', async () => {
      const mockDashboard = {
        totalAttributed: 100,
        riskDistribution: { low: 50, moderate: 30, high: 15, veryHigh: 5 },
      };
      (getPopulationDashboard as jest.Mock).mockResolvedValue(mockDashboard);

      const request = new NextRequest(
        'http://localhost:3000/api/vbc/population/dashboard?organizationId=org-1',
      );
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.totalAttributed).toBe(100);
    });

    it('requires organizationId', async () => {
      const request = new NextRequest('http://localhost:3000/api/vbc/population/dashboard');
      const response = await GET(request, mockContext);

      expect(response.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/vbc/attribution
  // -------------------------------------------------------------------------
  describe('GET /api/vbc/attribution', () => {
    const { GET } = require('../../vbc/attribution/route');

    it('returns attribution list', async () => {
      (listAttributions as jest.Mock).mockResolvedValue([{ id: 'attr-1' }]);

      const request = new NextRequest(
        'http://localhost:3000/api/vbc/attribution?organizationId=org-1',
      );
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });

    it('returns summary when summary=true', async () => {
      const mockSummary = { totalAttributed: 50, activeCount: 45 };
      (getAttributionSummary as jest.Mock).mockResolvedValue(mockSummary);

      const request = new NextRequest(
        'http://localhost:3000/api/vbc/attribution?organizationId=org-1&summary=true',
      );
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.totalAttributed).toBe(50);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/vbc/contracts
  // -------------------------------------------------------------------------
  describe('POST /api/vbc/contracts', () => {
    const { POST } = require('../../vbc/contracts/route');

    it('creates a VBC contract', async () => {
      const mockContract = { id: 'contract-1', payerName: 'SulAmérica' };
      (prisma.vBCPayerContract.create as jest.Mock).mockResolvedValue(mockContract);

      const request = new NextRequest('http://localhost:3000/api/vbc/contracts', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: 'org-1',
          payerName: 'SulAmérica',
          contractType: 'SHARED_SAVINGS',
          effectiveFrom: '2026-01-01',
          effectiveUntil: '2026-12-31',
          linkedMeasureCodes: ['HBA1C_CTRL'],
        }),
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.payerName).toBe('SulAmérica');
    });

    it('rejects invalid contract type', async () => {
      const request = new NextRequest('http://localhost:3000/api/vbc/contracts', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: 'org-1',
          payerName: 'Test',
          contractType: 'INVALID',
          effectiveFrom: '2026-01-01',
          effectiveUntil: '2026-12-31',
        }),
      });
      const response = await POST(request, mockContext);

      expect(response.status).toBe(400);
    });
  });
});
