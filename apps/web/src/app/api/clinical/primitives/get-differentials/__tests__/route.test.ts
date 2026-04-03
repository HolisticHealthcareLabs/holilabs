/**
 * Tests for POST /api/clinical/primitives/get-differentials
 *
 * - POST returns differentials for valid chief complaint
 * - POST returns 400 when chiefComplaint is missing
 * - POST includes metadata with processing method and confidence
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

jest.mock('@/lib/clinical/engines/symptom-diagnosis-engine', () => ({
  symptomDiagnosisEngine: {
    evaluate: jest.fn(),
  },
}));

const { symptomDiagnosisEngine } = require('@/lib/clinical/engines/symptom-diagnosis-engine');
const { POST } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockEngineResult = {
  method: 'fallback',
  confidence: 0.75,
  fallbackReason: 'AI unavailable',
  data: {
    differentials: [
      {
        icd10Code: 'J06.9',
        name: 'Upper respiratory infection',
        probability: 0.8,
        confidence: 'high',
        reasoning: 'Typical presentation',
        redFlags: [],
        workupSuggestions: ['Throat swab'],
      },
    ],
    urgency: 'routine',
  },
};

describe('POST /api/clinical/primitives/get-differentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (symptomDiagnosisEngine.evaluate as jest.Mock).mockResolvedValue(mockEngineResult);
  });

  it('returns differential diagnoses for valid chief complaint', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/get-differentials',
      {
        method: 'POST',
        body: JSON.stringify({
          chiefComplaint: 'Sore throat and fever',
          symptoms: ['throat pain', 'fever', 'difficulty swallowing'],
          age: 28,
          sex: 'F',
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.differentials)).toBe(true);
    expect(data.data.urgency).toBeDefined();
    expect(data.metadata.method).toBeDefined();
    expect(data.metadata.confidence).toBeDefined();
  });

  it('returns 400 when chiefComplaint is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/get-differentials',
      {
        method: 'POST',
        body: JSON.stringify({ symptoms: ['cough'] }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.details).toBeDefined();
  });

  it('includes fallbackReason in metadata when fallback was used', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/get-differentials',
      {
        method: 'POST',
        body: JSON.stringify({ chiefComplaint: 'Back pain', symptoms: ['lower back pain'] }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(data.metadata.fallbackReason).toBe('AI unavailable');
  });

  it('returns 500 when the engine throws an unexpected error', async () => {
    (symptomDiagnosisEngine.evaluate as jest.Mock).mockRejectedValue(
      new Error('Engine crash')
    );

    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/get-differentials',
      {
        method: 'POST',
        body: JSON.stringify({ chiefComplaint: 'Headache', symptoms: [] }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
