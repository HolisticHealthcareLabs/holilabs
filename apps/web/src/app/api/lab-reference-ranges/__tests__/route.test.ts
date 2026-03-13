/**
 * Tests for /api/lab-reference-ranges
 *
 * - GET returns paginated reference ranges
 * - GET returns specific test by LOINC code
 * - GET returns 404 for unknown LOINC code
 * - GET returns database statistics
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

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  ),
}));

jest.mock('@/lib/clinical/lab-reference-ranges', () => ({
  REFERENCE_RANGES: [
    { loincCode: '718-7', testName: 'Hemoglobin', category: 'Hematology' },
    { loincCode: '4544-3', testName: 'Hematocrit', category: 'Hematology' },
  ],
  getReferenceRange: jest.fn(),
  getReferenceRangeByTestName: jest.fn(),
  getAllLoincCodes: jest.fn().mockReturnValue(['718-7', '4544-3']),
  getTestsByCategory: jest.fn().mockReturnValue([{ loincCode: '718-7', testName: 'Hemoglobin' }]),
  getAllCategories: jest.fn().mockReturnValue(['Hematology', 'Chemistry']),
  isValidLoincCode: jest.fn().mockReturnValue(true),
  getTestInfoByLoincCode: jest.fn(),
  getDatabaseStats: jest.fn().mockReturnValue({
    totalTests: 50,
    totalCategories: 8,
    lastUpdated: '2026-03-12',
  }),
}));

const { GET } = require('../route');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { getTestInfoByLoincCode, getReferenceRange } = require('@/lib/clinical/lab-reference-ranges');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/lab-reference-ranges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns paginated reference ranges by default', async () => {
    const request = new NextRequest('http://localhost:3000/api/lab-reference-ranges');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.total).toBe(2);
    expect(data.data.ranges).toHaveLength(2);
  });

  it('returns specific test by LOINC code', async () => {
    (getTestInfoByLoincCode as jest.Mock).mockReturnValue({
      loincCode: '718-7',
      testName: 'Hemoglobin',
      category: 'Hematology',
    });

    const request = new NextRequest('http://localhost:3000/api/lab-reference-ranges?loincCode=718-7');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.loincCode).toBe('718-7');
  });

  it('returns 404 for unknown LOINC code', async () => {
    (getTestInfoByLoincCode as jest.Mock).mockReturnValue(null);

    const request = new NextRequest('http://localhost:3000/api/lab-reference-ranges?loincCode=99999');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns database statistics', async () => {
    const request = new NextRequest('http://localhost:3000/api/lab-reference-ranges?stats=true');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.totalTests).toBe(50);
  });
});
