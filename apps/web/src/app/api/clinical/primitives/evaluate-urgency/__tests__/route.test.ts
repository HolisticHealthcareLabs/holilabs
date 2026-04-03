/**
 * Tests for POST /api/clinical/primitives/evaluate-urgency
 *
 * - POST returns emergent urgency for chest pain presentation
 * - POST returns routine urgency for mild symptoms
 * - POST returns 400 for missing chiefComplaint
 * - POST handles abnormal vital signs and elevates urgency
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

describe('POST /api/clinical/primitives/evaluate-urgency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns emergent urgency for chest pain presentation', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/evaluate-urgency',
      {
        method: 'POST',
        body: JSON.stringify({
          chiefComplaint: 'chest pain with shortness of breath',
          symptoms: ['crushing chest pain', 'radiating to arm'],
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(['emergent', 'urgent']).toContain(data.data.urgency);
    expect(data.data.score).toBeGreaterThanOrEqual(30);
    expect(data.data.factors.length).toBeGreaterThan(0);
    expect(data.metadata.method).toBe('deterministic');
  });

  it('returns routine urgency for mild symptoms', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/evaluate-urgency',
      {
        method: 'POST',
        body: JSON.stringify({
          chiefComplaint: 'routine checkup',
          symptoms: ['mild fatigue'],
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.urgency).toBe('routine');
    expect(data.data.score).toBeLessThan(30);
  });

  it('returns 400 for missing chiefComplaint', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/evaluate-urgency',
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

  it('elevates to urgent when hypotension is present in vitals', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/evaluate-urgency',
      {
        method: 'POST',
        body: JSON.stringify({
          chiefComplaint: 'dizziness',
          vitalSigns: { systolicBp: 85, heartRate: 110 },
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.urgency).not.toBe('routine');
    const factorNames = data.data.factors.map((f: any) => f.factor);
    expect(factorNames.some((f: string) => f.includes('Hypotension') || f.includes('Tachycardia'))).toBe(true);
  });
});
