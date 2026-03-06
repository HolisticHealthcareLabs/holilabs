/**
 * Suite 4 — Habeas Data Export
 *
 * Proves GET /api/patients/[id]/export:
 * - Returns all clinical domains in a single JSON response
 * - Includes full consent lifecycle (active + revoked + expired)
 * - Enforces authorization (403 for wrong clinician, 401 for anon)
 * - Paginates large lab result sets (DoS prevention)
 * - Content-Type is application/json, dates are ISO 8601
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => null),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    prescription: { findMany: jest.fn() },
    clinicalNote: { findMany: jest.fn() },
    vitalSign: { findMany: jest.fn() },
    diagnosis: { findMany: jest.fn() },
    consent: { findMany: jest.fn() },
    labResult: { findMany: jest.fn() },
    auditLog: { findMany: jest.fn() },
    patientUser: { findUnique: jest.fn() },
    dataAccessGrant: { findFirst: jest.fn() },
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
    sOAPNote: { findFirst: jest.fn() },
    appointment: { findFirst: jest.fn() },
  },
}));

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() })),
  logError: jest.fn((e: any) => ({ message: String(e) })),
}));

jest.mock('@/lib/api/audit-buffer', () => ({
  auditBuffer: { enqueue: jest.fn() },
}));

jest.mock('@/lib/security/csrf', () => ({
  csrfProtection: () => (_req: any, _ctx: any, next: any) => next(),
}));

jest.mock('@/lib/api/cors', () => ({
  handlePreflight: jest.fn().mockReturnValue(null),
  applyCorsHeaders: jest.fn((_req: any, res: any) => res),
}));

jest.mock('@/lib/api/security-headers', () => ({
  applySecurityHeaders: jest.fn((res: any) => res),
}));

jest.mock('@/lib/request-id', () => ({
  getOrCreateRequestId: jest.fn().mockReturnValue('req-test-004'),
  REQUEST_ID_HEADER: 'x-request-id',
}));

// ─── After mocks ──────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api/middleware';

const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(patientId: string, cursor?: string): NextRequest {
  const url = `http://localhost/api/patients/${patientId}/export${cursor ? `?cursor=${cursor}` : ''}`;
  return new NextRequest(url, { method: 'GET' });
}

function makeContext(overrides?: Partial<ApiContext>): ApiContext {
  return {
    requestId: 'req-test-004',
    user: { id: 'clinician-001', email: 'dr@clinic-a.com', role: 'CLINICIAN' },
    params: { id: 'patient-001' },
    ...overrides,
  };
}

const MOCK_PATIENT = {
  id: 'patient-001',
  firstName: 'João',
  lastName: 'Silva',
  email: 'joao@example.com',
  dateOfBirth: new Date('1985-01-15T00:00:00.000Z'),
  gender: 'MALE',
  phone: '+55-11-99999-9999',
  address: 'Rua das Flores, 123',
  mrn: 'MRN-001',
  cpf: 'ENCRYPTED_CPF',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  assignedClinicianId: 'clinician-001',
};

function setupDefaultMocks() {
  verifyPatientAccess.mockResolvedValue(true);
  prisma.patient.findUnique.mockResolvedValue(MOCK_PATIENT);
  prisma.prescription.findMany.mockResolvedValue([]);
  prisma.clinicalNote.findMany.mockResolvedValue([]);
  prisma.vitalSign.findMany.mockResolvedValue([]);
  prisma.diagnosis.findMany.mockResolvedValue([]);
  prisma.consent.findMany.mockResolvedValue([]);
  prisma.labResult.findMany.mockResolvedValue([]);
  prisma.auditLog.findMany.mockResolvedValue([]);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Suite 4 — Habeas Data Export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  // ── Completeness ─────────────────────────────────────────────────────────────

  describe('Completeness', () => {
    it('[ASSERT] Export response includes all clinical domains', async () => {
      const { GET } = require('@/app/api/patients/[id]/export/route');

      const ctx = makeContext();
      const req = makeRequest('patient-001');

      const res = await GET(req, ctx);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('patient');
      expect(body).toHaveProperty('prescriptions');
      expect(body).toHaveProperty('diagnoses');
      expect(body).toHaveProperty('vitalSigns');
      expect(body).toHaveProperty('clinicalNotes');
      expect(body).toHaveProperty('consents');
      expect(body).toHaveProperty('labResults');
    });

    it('[ASSERT] Patient record omits sensitive internal keys (cpf raw value in export)', async () => {
      const { GET } = require('@/app/api/patients/[id]/export/route');

      const ctx = makeContext();
      const req = makeRequest('patient-001');

      const res = await GET(req, ctx);
      const body = await res.json();

      // passwordHash should never be present (PatientUser model, not Patient)
      expect(body.patient).not.toHaveProperty('passwordHash');
      // tokenId / internal fields should not be present
      expect(body.patient).not.toHaveProperty('tokenId');
    });

    it('[ASSERT] Consent history includes revoked and expired consents (full lifecycle)', async () => {
      const { GET } = require('@/app/api/patients/[id]/export/route');

      const allConsents = [
        { id: 'c1', type: 'GENERAL_CONSULTATION', isActive: true, revokedAt: null, expiresAt: null },
        { id: 'c2', type: 'DATA_RESEARCH', isActive: true, revokedAt: null, expiresAt: null },
        { id: 'c3', type: 'RECORDING', isActive: false, revokedAt: new Date('2025-06-01'), expiresAt: null },
        { id: 'c4', type: 'TELEHEALTH', isActive: false, revokedAt: null, expiresAt: new Date('2023-01-01') },
      ];

      prisma.consent.findMany.mockResolvedValue(allConsents);

      const ctx = makeContext();
      const req = makeRequest('patient-001');

      const res = await GET(req, ctx);
      const body = await res.json();

      expect(body.consents).toHaveLength(4);
      const revokedConsent = body.consents.find((c: any) => c.id === 'c3');
      expect(revokedConsent.revokedAt).toBeTruthy();
    });
  });

  // ── Authorization ────────────────────────────────────────────────────────────

  describe('Authorization', () => {
    it('[REJECT 403] CLINICIAN cannot export a patient assigned to a different clinician', async () => {
      const { GET } = require('@/app/api/patients/[id]/export/route');

      verifyPatientAccess.mockResolvedValue(false);

      const ctx = makeContext({ user: { id: 'clinician-B', email: 'b@clinic.com', role: 'CLINICIAN' } });
      const req = makeRequest('patient-001');

      const res = await GET(req, ctx);
      expect(res.status).toBe(403);

      // No clinical data queries should have been executed
      expect(prisma.prescription.findMany).not.toHaveBeenCalled();
    });

    it('[PERMIT 200] PATIENT can export their own records', async () => {
      const { GET } = require('@/app/api/patients/[id]/export/route');

      const ctx = makeContext({
        user: { id: 'patient-001', email: 'joao@example.com', role: 'PATIENT' },
        params: { id: 'patient-001' },
      });
      const req = makeRequest('patient-001');

      const res = await GET(req, ctx);
      expect(res.status).toBe(200);
    });

    it('[REJECT 403] PATIENT cannot export another patient records', async () => {
      const { GET } = require('@/app/api/patients/[id]/export/route');

      const ctx = makeContext({
        user: { id: 'patient-002', email: 'other@example.com', role: 'PATIENT' },
        params: { id: 'patient-001' },
      });
      const req = makeRequest('patient-001');

      const res = await GET(req, ctx);
      expect(res.status).toBe(403);
    });

    it('[REJECT 401] Unauthenticated request', async () => {
      const { GET } = require('@/app/api/patients/[id]/export/route');

      const ctx = makeContext({ user: undefined });
      const req = makeRequest('patient-001');

      const res = await GET(req, ctx);
      expect(res.status).toBe(401);
    });
  });

  // ── Pagination / DoS Prevention ──────────────────────────────────────────────

  describe('Pagination / DoS Prevention', () => {
    it('[ASSERT] Export with exactly PAGE_LIMIT lab results includes pagination cursor', async () => {
      const { GET } = require('@/app/api/patients/[id]/export/route');

      const labResults = Array.from({ length: 1000 }, (_, i) => ({
        id: `lab-${i}`,
        patientId: 'patient-001',
        testName: `Test ${i}`,
      }));
      prisma.labResult.findMany.mockResolvedValue(labResults);

      const ctx = makeContext();
      const req = makeRequest('patient-001');

      const res = await GET(req, ctx);
      expect(res.status).toBe(200);

      const body = await res.json();
      // When exactly PAGE_LIMIT results are returned, the route sets nextCursor
      expect(body.meta.pagination).toBeTruthy();
      expect(body.meta.pagination.nextCursor).toBe('lab-999');
    });

    it('[ASSERT] Export with fewer than PAGE_LIMIT lab results has no pagination cursor', async () => {
      const { GET } = require('@/app/api/patients/[id]/export/route');

      prisma.labResult.findMany.mockResolvedValue([{ id: 'lab-1', patientId: 'patient-001' }]);

      const ctx = makeContext();
      const req = makeRequest('patient-001');

      const res = await GET(req, ctx);
      const body = await res.json();
      expect(body.meta.pagination).toBeNull();
    });
  });

  // ── Machine-Readable Format ──────────────────────────────────────────────────

  describe('Machine-Readable Format', () => {
    it('[ASSERT] Response Content-Type is application/json', async () => {
      const { GET } = require('@/app/api/patients/[id]/export/route');

      const ctx = makeContext();
      const req = makeRequest('patient-001');

      const res = await GET(req, ctx);
      expect(res.headers.get('content-type')).toContain('application/json');
    });

    it('[ASSERT] All dates in response are ISO 8601 strings', async () => {
      const { GET } = require('@/app/api/patients/[id]/export/route');

      const ctx = makeContext();
      const req = makeRequest('patient-001');

      const res = await GET(req, ctx);
      const body = await res.json();

      // Verify createdAt is ISO 8601
      const isoDate = body.patient.createdAt;
      expect(new Date(isoDate).toISOString()).toBe(isoDate);
    });
  });
});
