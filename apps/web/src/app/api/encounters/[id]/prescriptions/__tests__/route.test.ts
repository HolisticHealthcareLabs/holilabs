/**
 * Tests for POST /api/encounters/[id]/prescriptions
 *
 * Validates encounter-linked prescription creation:
 * - GREEN → 201 with prescription
 * - RED → 422 with alert details
 * - RED + overrideToken → 201 flagged
 * - Missing encounter → 404
 */

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
  logError: jest.fn((e: any) => ({ message: String(e) })),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clinicalEncounter: {
      findUnique: jest.fn(),
    },
    prescription: {
      create: jest.fn(),
    },
  },
}));

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const { prisma } = require('@/lib/prisma');
const { POST } = require('../route');

const MOCK_CONTEXT = {
  user: { id: 'provider-1', email: 'dr@test.com', role: 'CLINICIAN' },
  params: { id: 'enc-001' },
};

const MOCK_ENCOUNTER = {
  id: 'enc-001',
  patientId: 'patient-001',
  providerId: 'provider-1',
  status: 'IN_PROGRESS',
};

const MOCK_PRESCRIPTION = {
  id: 'rx-001',
  patientId: 'patient-001',
  clinicianId: 'provider-1',
  encounterId: 'enc-001',
  medications: [{ name: 'metformin', dose: '500mg', frequency: 'BID', quantity: 30 }],
  prescriptionHash: 'abc123',
  status: 'PENDING',
  signatureMethod: 'system',
  signatureData: 'encounter-linked',
};

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/encounters/enc-001/prescriptions', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/encounters/[id]/prescriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.clinicalEncounter.findUnique as any).mockResolvedValue(MOCK_ENCOUNTER);
    (prisma.prescription.create as any).mockResolvedValue(MOCK_PRESCRIPTION);
  });

  // ── GREEN → 201 ──────────────────────────────────────────────────────────

  test('GREEN → 201: safe prescription (metformin, valid ICD-10, qty 30)', async () => {
    const req = makeRequest({
      medications: [{ name: 'metformin', dose: '500mg', frequency: 'BID', quantity: 30 }],
      icd10Codes: ['E11.9'],
      clinicalContext: { creatinineClearance: 60, weight: 75, age: 55, labTimestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
    });
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.prescription).toBeDefined();
    expect(json.warning).toBeUndefined();
  });

  // ── RED → 422 ────────────────────────────────────────────────────────────

  test('RED → 422: apixaban with CrCl 10 (BLOCK) → no override', async () => {
    const req = makeRequest({
      medications: [{ name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 30 }],
      icd10Codes: ['I48.0'],
      clinicalContext: { creatinineClearance: 10, weight: 75, age: 65, labTimestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
    });
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error).toContain('blocked');
    expect(Array.isArray(json.signal)).toBe(true);
    expect(json.signal.length).toBeGreaterThan(0);
    // Prescription should NOT be created
    expect(prisma.prescription.create).not.toHaveBeenCalled();
  });

  // ── RED + overrideToken → 201 ─────────────────────────────────────────────

  test('RED + overrideToken → 201 flagged with warning', async () => {
    const req = makeRequest({
      medications: [{ name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 30 }],
      icd10Codes: ['I48.0'],
      clinicalContext: { creatinineClearance: 10, weight: 75, age: 65, labTimestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
      overrideToken: 'emergency-override-token-123',
    });
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.overridden).toBe(true);
    expect(json.warning).toBe(true);
    expect(Array.isArray(json.signal)).toBe(true);
    expect(prisma.prescription.create).toHaveBeenCalled();
  });

  // ── 404 ──────────────────────────────────────────────────────────────────

  test('404: encounter not found', async () => {
    (prisma.clinicalEncounter.findUnique as any).mockResolvedValue(null);

    const req = makeRequest({
      medications: [{ name: 'metformin', dose: '500mg', frequency: 'BID', quantity: 30 }],
    });
    const res = await POST(req, MOCK_CONTEXT);

    expect(res.status).toBe(404);
  });

  // ── 403 ──────────────────────────────────────────────────────────────────

  test('403: non-provider cannot create prescription for encounter', async () => {
    (prisma.clinicalEncounter.findUnique as any).mockResolvedValue({
      ...MOCK_ENCOUNTER,
      providerId: 'different-provider',
    });

    const req = makeRequest({
      medications: [{ name: 'metformin', dose: '500mg', frequency: 'BID', quantity: 30 }],
    });
    const res = await POST(req, MOCK_CONTEXT);

    expect(res.status).toBe(403);
  });

  // ── 400 ──────────────────────────────────────────────────────────────────

  test('400: missing medications', async () => {
    const req = makeRequest({ icd10Codes: ['E11.9'] });
    const res = await POST(req, MOCK_CONTEXT);
    expect(res.status).toBe(400);
  });
});
