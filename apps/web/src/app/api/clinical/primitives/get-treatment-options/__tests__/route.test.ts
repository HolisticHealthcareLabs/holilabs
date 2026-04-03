/**
 * Tests for POST /api/clinical/primitives/get-treatment-options
 *
 * - POST returns treatment recommendations for a known ICD-10 code
 * - POST returns 400 when icd10Code is missing
 * - POST includes metadata with method and confidence
 * - POST handles engine failure gracefully with 500
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

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/clinical/engines/treatment-protocol-engine', () => ({
  treatmentProtocolEngine: {
    getRecommendations: jest.fn(),
  },
}));

const { treatmentProtocolEngine } = require('@/lib/clinical/engines/treatment-protocol-engine');
const { POST } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockTreatmentResult = {
  method: 'fallback',
  confidence: 0.85,
  fallbackReason: undefined,
  data: [
    {
      type: 'medication',
      priority: 'first-line',
      medication: { name: 'Metformin', dose: '500mg', frequency: 'twice daily' },
      rationale: 'First-line treatment for T2DM',
      evidenceGrade: 'A',
      contraindications: ['renal impairment'],
    },
  ],
};

describe('POST /api/clinical/primitives/get-treatment-options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (treatmentProtocolEngine.getRecommendations as jest.Mock).mockResolvedValue(mockTreatmentResult);
  });

  it('returns treatment recommendations for a known ICD-10 code', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/get-treatment-options',
      {
        method: 'POST',
        body: JSON.stringify({
          icd10Code: 'E11',
          age: 55,
          sex: 'M',
          currentMedications: [],
          allergies: [],
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.recommendations)).toBe(true);
    expect(data.data.condition).toBe('E11');
    expect(data.metadata.method).toBeDefined();
  });

  it('returns 400 when icd10Code is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/get-treatment-options',
      {
        method: 'POST',
        body: JSON.stringify({ age: 40 }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.details).toBeDefined();
  });

  it('passes patient context including medications and allergies to engine', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/get-treatment-options',
      {
        method: 'POST',
        body: JSON.stringify({
          icd10Code: 'I10',
          currentMedications: ['Lisinopril'],
          allergies: ['Penicillin'],
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    await POST(request, mockContext);

    expect(treatmentProtocolEngine.getRecommendations).toHaveBeenCalledWith(
      'I10',
      expect.objectContaining({
        medications: expect.arrayContaining([expect.objectContaining({ name: 'Lisinopril' })]),
        allergies: expect.arrayContaining([expect.objectContaining({ allergen: 'Penicillin' })]),
      })
    );
  });

  it('returns 500 when engine throws an unexpected error', async () => {
    (treatmentProtocolEngine.getRecommendations as jest.Mock).mockRejectedValue(
      new Error('Engine failure')
    );

    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/get-treatment-options',
      {
        method: 'POST',
        body: JSON.stringify({ icd10Code: 'J45' }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
