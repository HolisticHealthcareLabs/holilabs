/**
 * Tests for /api/clinical/drug-interactions
 *
 * - POST checks drug interactions successfully
 * - POST returns 400 when fewer than 2 medications
 * - POST returns 400 for invalid medications array
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

jest.mock('@/lib/security/validation', () => ({
  validateArray: jest.fn(),
  sanitizeMedicationName: jest.fn((name: string) => name.trim()),
}));

jest.mock('@/lib/openfda/drug-interactions', () => ({
  checkDrugInteractions: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  ),
}));

const { POST } = require('../route');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { validateArray } = require('@/lib/security/validation');
const { checkDrugInteractions } = require('@/lib/openfda/drug-interactions');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/clinical/drug-interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (validateArray as jest.Mock).mockImplementation(() => {});
  });

  it('returns interactions for valid medication list', async () => {
    (checkDrugInteractions as jest.Mock).mockResolvedValue([
      {
        drug1: 'warfarin',
        drug2: 'aspirin',
        severity: 'high',
        description: 'Increased bleeding risk',
        source: 'FDA',
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/clinical/drug-interactions', {
      method: 'POST',
      body: JSON.stringify({ medications: ['warfarin', 'aspirin'] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.interactions).toHaveLength(1);
    expect(data.data.summary.major).toBe(1);
  });

  it('returns 400 when fewer than 2 medications', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/drug-interactions', {
      method: 'POST',
      body: JSON.stringify({ medications: ['aspirin'] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('At least 2 medications');
  });

  it('returns 400 for invalid medications array', async () => {
    (validateArray as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid array');
    });

    const request = new NextRequest('http://localhost:3000/api/clinical/drug-interactions', {
      method: 'POST',
      body: JSON.stringify({ medications: null }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid array');
  });

  it('returns empty interactions when no issues found', async () => {
    (checkDrugInteractions as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/clinical/drug-interactions', {
      method: 'POST',
      body: JSON.stringify({ medications: ['metformin', 'levothyroxine'] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.interactions).toHaveLength(0);
    expect(data.data.summary.total).toBe(0);
  });
});
