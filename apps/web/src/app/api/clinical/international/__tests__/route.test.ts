/**
 * Tests for /api/clinical/international
 *
 * - GET returns summary when no type specified
 * - GET returns 400 for icd10-map without query
 * - POST validates international standards
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

jest.mock('@/lib/clinical', () => ({
  icd11Service: {
    search: jest.fn(),
    getAllCodes: jest.fn(),
    mapFromICD10: jest.fn(),
    validate: jest.fn(),
    getEntity: jest.fn(),
  },
  internationalGuidelinesService: {
    WHO_ESSENTIAL_MEDICINES: [{ name: 'Metformin', category: 'Endocrine' }],
    INTERNATIONAL_GUIDELINES: [{ source: 'NICE', condition: 'hypertension' }],
    getEssentialMedicinesByCategory: jest.fn(),
    getGuidelinesForCondition: jest.fn(),
    isEssentialMedicine: jest.fn(),
    generateGuidelinesSummary: jest.fn(),
  },
}));

const { GET, POST } = require('../route');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { icd11Service, internationalGuidelinesService } = require('@/lib/clinical');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/clinical/international', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (icd11Service.search as jest.Mock).mockReturnValue({ matches: [], totalCount: 0 });
    (icd11Service.getAllCodes as jest.Mock).mockReturnValue([{ code: '5A11', title: 'Type 2 diabetes' }]);
    (icd11Service.mapFromICD10 as jest.Mock).mockReturnValue({ icd11Code: '5A11', entity: 'Type 2 diabetes' });
    (icd11Service.validate as jest.Mock).mockReturnValue(true);
    (icd11Service.getEntity as jest.Mock).mockReturnValue({ code: '5A11', title: 'Type 2 diabetes' });
    (internationalGuidelinesService.getEssentialMedicinesByCategory as jest.Mock).mockReturnValue([]);
    (internationalGuidelinesService.getGuidelinesForCondition as jest.Mock).mockReturnValue([]);
    (internationalGuidelinesService.isEssentialMedicine as jest.Mock).mockReturnValue({ name: 'Metformin' });
    (internationalGuidelinesService.generateGuidelinesSummary as jest.Mock).mockReturnValue({ conditions: [] });
  });

  it('returns summary when no type specified', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/international');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.type).toBe('international_standards_summary');
    expect(data.data.available).toHaveProperty('icd11');
  });

  it('returns 400 for icd10-map without query param', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/international?type=icd10-map');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('ICD-10 code required');
  });

  it('returns essential medicines list', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/international?type=essential-medicines');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.type).toBe('who_essential_medicines');
  });
});

describe('POST /api/clinical/international', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (icd11Service.validate as jest.Mock).mockReturnValue(true);
    (icd11Service.getEntity as jest.Mock).mockReturnValue({ code: '5A11', title: 'Type 2 diabetes' });
    (internationalGuidelinesService.isEssentialMedicine as jest.Mock).mockReturnValue({ name: 'Metformin' });
    (internationalGuidelinesService.generateGuidelinesSummary as jest.Mock).mockReturnValue({ conditions: [] });
  });

  it('validates drug against WHO essential medicines', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/international', {
      method: 'POST',
      body: JSON.stringify({ drugName: 'Metformin' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.validations.length).toBeGreaterThan(0);
    expect(data.validations[0].type).toBe('who_essential_medicine');
  });
});
