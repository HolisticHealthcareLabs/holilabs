/**
 * Tests for POST/GET /api/cdss/summary
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clinicalEncounter: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/services/summary.service', () => ({
  createSummaryService: jest.fn().mockReturnValue({
    enqueueGeneration: jest.fn(),
  }),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

jest.mock('@/lib/clinical/safety-envelope', () => ({
  wrapInSafetyEnvelope: jest.fn((data, meta) => ({ data, safetyMetadata: meta })),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { createSummaryService } = require('@/lib/services/summary.service');

const mockContext = {
  user: { id: 'provider-1', role: 'CLINICIAN' },
};

describe('POST /api/cdss/summary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queues summary generation (202)', async () => {
    (prisma.clinicalEncounter.findUnique as jest.Mock).mockResolvedValue({
      id: 'enc-1',
      patientId: 'patient-1',
      providerId: 'provider-1',
    });
    createSummaryService().enqueueGeneration.mockResolvedValue('job-1');

    const request = new NextRequest('http://localhost:3000/api/cdss/summary', {
      method: 'POST',
      body: JSON.stringify({
        encounterId: 'enc-1',
        transcript: 'Patient reports headache and nausea for 3 days.',
        patientContext: { age: 45, sex: 'male', conditions: [], medications: [] },
        language: 'en',
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.success).toBe(true);
  });

  it('returns 400 for invalid body', async () => {
    const request = new NextRequest('http://localhost:3000/api/cdss/summary', {
      method: 'POST',
      body: JSON.stringify({ encounterId: '', transcript: '' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 404 when encounter not found', async () => {
    (prisma.clinicalEncounter.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/cdss/summary', {
      method: 'POST',
      body: JSON.stringify({
        encounterId: 'nonexistent',
        transcript: 'Patient reports headache and nausea for 3 days.',
        patientContext: { age: 45, sex: 'male', conditions: [], medications: [] },
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });
});

describe('GET /api/cdss/summary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns encounter summary (200)', async () => {
    (prisma.clinicalEncounter.findUnique as jest.Mock).mockResolvedValue({
      id: 'enc-1',
      patientId: 'patient-1',
      providerId: 'provider-1',
      summaryDraft: 'Summary of the encounter.',
    });

    const request = new NextRequest('http://localhost:3000/api/cdss/summary?encounterId=enc-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 400 when encounterId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/cdss/summary');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Encounter ID is required');
  });

  it('returns 404 when encounter not found', async () => {
    (prisma.clinicalEncounter.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/cdss/summary?encounterId=nonexistent');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });
});
