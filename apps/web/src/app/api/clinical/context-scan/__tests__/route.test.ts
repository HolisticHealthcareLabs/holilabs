/**
 * Tests for /api/clinical/context-scan
 *
 * - POST generates clinical context from facesheet data
 * - Returns 400 for missing patientId or encounterId
 * - Returns 403 when patient access denied
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

const { POST } = require('../route');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/clinical/context-scan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('generates clinical context from facesheet data', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/context-scan', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-123',
        encounterId: 'encounter-456',
        facesheetData: {
          medications: [{ name: 'Metformin', dose: '500mg', frequency: 'BID' }],
          allergies: [{ allergen: 'Penicillin', reaction: 'Rash', severity: 'severe' }],
          diagnoses: [{ description: 'Type 2 Diabetes', icd10: 'E11.9' }],
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.context.patientId).toBe('patient-123');
    expect(data.context.activeMedications).toHaveLength(1);
    expect(data.context.allergies).toHaveLength(1);
  });

  it('returns 400 when patientId or encounterId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/context-scan', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('patientId and encounterId are required');
  });

  it('returns 403 when patient access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest('http://localhost:3000/api/clinical/context-scan', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-123',
        encounterId: 'encounter-456',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Access denied');
  });

  it('returns 400 for invalid request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/context-scan', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid request body');
  });
});
