/**
 * Tests for POST /api/clinical/primitives/merge-context
 *
 * - POST merges context from multiple sources into a unified patient context
 * - POST returns 400 when patientId is missing
 * - POST resolves conflicts using highest_priority strategy
 * - POST always merges symptoms from all sources
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

const { POST } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/clinical/primitives/merge-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges context from EHR and AI scribe into a unified patient context', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/merge-context',
      {
        method: 'POST',
        body: JSON.stringify({
          patientId: 'patient-1',
          age: 45,
          sex: 'F',
          sources: [
            {
              source: 'ehr',
              priority: 8,
              diagnoses: [{ icd10Code: 'E11', name: 'Type 2 diabetes' }],
              medications: [{ name: 'Metformin', dose: '500mg' }],
              allergies: [],
            },
            {
              source: 'ai_scribe',
              priority: 5,
              chiefComplaint: 'Fatigue and increased thirst',
              symptoms: ['fatigue', 'polyuria', 'polydipsia'],
            },
          ],
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.context).toBeDefined();
    expect(data.data.context.patientId).toBe('patient-1');
    expect(data.data.context.diagnoses).toBeInstanceOf(Array);
    expect(data.data.sourcesSummary).toBeInstanceOf(Array);
  });

  it('returns 400 when patientId is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/merge-context',
      {
        method: 'POST',
        body: JSON.stringify({
          sources: [{ source: 'ehr', diagnoses: [] }],
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.details).toBeDefined();
  });

  it('resolves conflicts and records them when highest_priority strategy is used', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/merge-context',
      {
        method: 'POST',
        body: JSON.stringify({
          patientId: 'patient-1',
          conflictResolution: 'highest_priority',
          sources: [
            {
              source: 'ehr',
              priority: 9,
              diagnoses: [{ icd10Code: 'E11', name: 'Type 2 diabetes mellitus' }],
            },
            {
              source: 'ai_scribe',
              priority: 3,
              diagnoses: [{ icd10Code: 'E11', name: 'T2DM (scribe version)' }],
            },
          ],
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.context.diagnoses[0].name).toBe('Type 2 diabetes mellitus');
  });

  it('merges all symptoms from every source regardless of priority', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/merge-context',
      {
        method: 'POST',
        body: JSON.stringify({
          patientId: 'patient-2',
          sources: [
            { source: 'ehr', priority: 8, symptoms: ['fatigue'] },
            { source: 'ai_scribe', priority: 3, symptoms: ['headache'] },
          ],
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metadata.method).toBe('deterministic');
  });
});
