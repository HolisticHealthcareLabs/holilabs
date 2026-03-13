/**
 * Tests for GET /api/cds/hooks/discovery
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { GET } = require('../route');

describe('GET /api/cds/hooks/discovery', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns list of CDS services (200)', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.services).toBeDefined();
    expect(data.services).toHaveLength(4);
  });

  it('includes patient-view hook', async () => {
    const response = await GET();
    const data = await response.json();

    const patientView = data.services.find((s: any) => s.hook === 'patient-view');
    expect(patientView).toBeDefined();
    expect(patientView.id).toBe('holi-cds-patient-view');
    expect(patientView.prefetch).toBeDefined();
  });

  it('includes medication-prescribe hook', async () => {
    const response = await GET();
    const data = await response.json();

    const medPrescribe = data.services.find((s: any) => s.hook === 'medication-prescribe');
    expect(medPrescribe).toBeDefined();
    expect(medPrescribe.id).toBe('holi-cds-medication-prescribe');
  });

  it('includes encounter-start hook', async () => {
    const response = await GET();
    const data = await response.json();

    const encounterStart = data.services.find((s: any) => s.hook === 'encounter-start');
    expect(encounterStart).toBeDefined();
    expect(encounterStart.id).toBe('holi-cds-encounter-start');
  });
});
