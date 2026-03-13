/**
 * Tests for POST /api/clinical/diagnosis
 *
 * - POST returns differential diagnosis for valid symptoms
 * - POST returns 400 when chief complaint or symptoms are missing
 * - POST returns 400 for invalid age
 * - POST returns 429 when daily AI quota exceeded
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

jest.mock('@/lib/prisma', () => ({
  prisma: {
    subscriptionTier: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/ai/usage-tracker', () => ({
  trackUsage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/security/validation', () => ({
  sanitizeString: jest.fn((s: string) => s),
  validateArray: jest.fn(),
  sanitizeMedicationName: jest.fn((s: string) => s),
}));

jest.mock('@/lib/clinical/engines/symptom-diagnosis-engine', () => ({
  symptomDiagnosisEngine: {
    evaluate: jest.fn(),
  },
}));

jest.mock('@/lib/clinical/safety-envelope', () => ({
  CLINICAL_DISCLAIMER: 'CDS tool — not a substitute for clinical judgement.',
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((err) =>
    require('next/server').NextResponse.json({ success: false, error: 'error' }, { status: 500 })
  ),
}));

const { verifyPatientAccess } = require('@/lib/api/middleware');
const { prisma } = require('@/lib/prisma');
const { symptomDiagnosisEngine } = require('@/lib/clinical/engines/symptom-diagnosis-engine');
const { POST } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockEngineResult = {
  method: 'fallback',
  confidence: 0.8,
  fallbackReason: undefined,
  aiLatencyMs: undefined,
  data: {
    differentials: [
      {
        name: 'Upper respiratory infection',
        icd10Code: 'J06.9',
        probability: 0.75,
        reasoning: 'Symptoms consistent',
        redFlags: [],
        workupSuggestions: ['CBC'],
      },
    ],
    urgency: 'routine',
  },
};

describe('POST /api/clinical/diagnosis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (symptomDiagnosisEngine.evaluate as jest.Mock).mockResolvedValue(mockEngineResult);
    (prisma.subscriptionTier.findUnique as jest.Mock).mockResolvedValue({
      tier: 'PRO',
      dailyAIUsed: 5,
      dailyAILimit: 100,
    });
    (prisma.subscriptionTier.update as jest.Mock).mockResolvedValue({});
  });

  it('returns differential diagnosis for valid symptoms', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/diagnosis', {
      method: 'POST',
      body: JSON.stringify({
        age: 35,
        sex: 'M',
        chiefComplaint: 'Cough and fever',
        symptoms: ['cough', 'fever', 'fatigue'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.diagnosis).toBeDefined();
    expect(data.diagnosis.differentialDiagnosis).toBeInstanceOf(Array);
    expect(data.disclaimer).toBeDefined();
  });

  it('returns 400 when chief complaint is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/diagnosis', {
      method: 'POST',
      body: JSON.stringify({ age: 35, sex: 'M', symptoms: ['cough'] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 400 for invalid age', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/diagnosis', {
      method: 'POST',
      body: JSON.stringify({ age: -5, sex: 'M', chiefComplaint: 'Cough', symptoms: ['cough'] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 429 when daily AI quota is exceeded', async () => {
    (prisma.subscriptionTier.findUnique as jest.Mock).mockResolvedValue({
      tier: 'FREE',
      dailyAIUsed: 10,
      dailyAILimit: 10,
    });

    const request = new NextRequest('http://localhost:3000/api/clinical/diagnosis', {
      method: 'POST',
      body: JSON.stringify({
        age: 40,
        sex: 'F',
        chiefComplaint: 'Headache',
        symptoms: ['headache'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.quotaInfo).toBeDefined();
  });
});
