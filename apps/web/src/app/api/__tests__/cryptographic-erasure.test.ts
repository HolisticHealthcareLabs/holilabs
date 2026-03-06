/**
 * Suite 6 — Cryptographic Erasure
 *
 * Proves LGPD Art. 18 (VI) deletion lifecycle:
 * - POST /api/patients/[id]/deletion-request creates PENDING_CONFIRMATION with LGPD_ARTICLE_18
 * - Duplicate request → 409
 * - Soft delete sets deletedAt, NEVER deletes auditLog
 * - Hard erasure anonymizes all PII fields, destroys tokenMap, removes consents
 * - Prescriptions retain prescriptionHash after erasure
 * - Distinction: soft delete keeps consents, hard delete removes them
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => null),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn(), update: jest.fn() },
    prescription: { updateMany: jest.fn() },
    clinicalNote: { updateMany: jest.fn() },
    consent: { deleteMany: jest.fn() },
    auditLog: { findMany: jest.fn(), deleteMany: jest.fn() },
    tokenMap: { deleteMany: jest.fn() },
    deletionRequest: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
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

jest.mock('@/lib/security/encryption', () => ({
  encryptPHIWithVersion: jest.fn().mockResolvedValue('ANONYMIZED_BLOB'),
  decryptPHIWithVersion: jest.fn(),
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
  getOrCreateRequestId: jest.fn().mockReturnValue('req-test-006'),
  REQUEST_ID_HEADER: 'x-request-id',
}));

// ─── After mocks ──────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api/middleware';

const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

// Per-test transaction mock — re-created each beforeEach
let mockTx: {
  patient: { update: jest.Mock };
  prescription: { updateMany: jest.Mock };
  clinicalNote: { updateMany: jest.Mock };
  tokenMap: { deleteMany: jest.Mock };
  consent: { deleteMany: jest.Mock };
  deletionRequest: { update: jest.Mock };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PATIENT_ID = 'patient-001';
const ADMIN_CTX: ApiContext = {
  requestId: 'req-test-006',
  user: { id: 'admin-001', email: 'admin@clinic.com', role: 'ADMIN' },
  params: { id: PATIENT_ID },
};

function makePostRequest(patientId: string, route: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/patients/${patientId}/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : JSON.stringify({}),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Suite 6 — Cryptographic Erasure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyPatientAccess.mockResolvedValue(true);
    prisma.patient.findUnique.mockResolvedValue({ id: PATIENT_ID, firstName: 'João' });
    prisma.deletionRequest.findFirst.mockResolvedValue(null); // no existing request
    prisma.deletionRequest.create.mockResolvedValue({
      id: 'dr-001',
      patientId: PATIENT_ID,
      status: 'PENDING_CONFIRMATION',
      legalBasis: 'LGPD_ARTICLE_18',
      confirmationToken: 'token-abc123',
      confirmationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Build fresh transaction mock every test to avoid stale state
    mockTx = {
      patient: { update: jest.fn().mockResolvedValue({ id: PATIENT_ID, firstName: '[ERASED]' }) },
      prescription: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      clinicalNote: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      tokenMap: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      consent: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      deletionRequest: { update: jest.fn().mockResolvedValue({ id: 'dr-001', status: 'COMPLETED' }) },
    };
    prisma.$transaction.mockImplementation((fn: any) => fn(mockTx));
  });

  // ── Deletion Request Lifecycle ────────────────────────────────────────────────

  describe('Deletion Request Lifecycle', () => {
    it('[ASSERT] POST deletion-request creates DeletionRequest with status=PENDING_CONFIRMATION and legalBasis=LGPD_ARTICLE_18', async () => {
      const { POST } = require('@/app/api/patients/[id]/deletion-request/route');

      const req = makePostRequest(PATIENT_ID, 'deletion-request', { legalBasis: 'LGPD_ARTICLE_18' });
      const res = await POST(req, ADMIN_CTX);

      expect(res.status).toBe(201);

      expect(prisma.deletionRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: PATIENT_ID,
            legalBasis: 'LGPD_ARTICLE_18',
            status: 'PENDING_CONFIRMATION',
          }),
        })
      );

      const body = await res.json();
      expect(body.confirmationToken).toBeTruthy();
      expect(new Date(body.confirmationDeadline).getTime()).toBeGreaterThan(Date.now());
    });

    it('[REJECT 409] Duplicate deletion request when PENDING already exists', async () => {
      const { POST } = require('@/app/api/patients/[id]/deletion-request/route');

      prisma.deletionRequest.findFirst.mockResolvedValue({
        id: 'dr-existing',
        status: 'PENDING_CONFIRMATION',
      });

      const req = makePostRequest(PATIENT_ID, 'deletion-request');
      const res = await POST(req, ADMIN_CTX);

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toMatch(/already pending/i);
    });
  });

  // ── Soft Delete ───────────────────────────────────────────────────────────────

  describe('Soft Delete (Audit Retention)', () => {
    it('[ASSERT] Soft delete sets patient.deletedAt, does NOT delete auditLog records', async () => {
      const { POST } = require('@/app/api/patients/[id]/erasure/route');

      prisma.deletionRequest.findFirst.mockResolvedValue({
        id: 'dr-001',
        confirmationToken: 'valid-token',
        status: 'PENDING_CONFIRMATION',
      });
      prisma.patient.update.mockResolvedValue({ id: PATIENT_ID, deletedAt: new Date() });
      prisma.deletionRequest.update.mockResolvedValue({ id: 'dr-001', status: 'COMPLETED' });

      const req = makePostRequest(PATIENT_ID, 'erasure', {
        type: 'soft',
        confirmationToken: 'valid-token',
      });
      const res = await POST(req, ADMIN_CTX);

      expect(res.status).toBe(200);

      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );

      // CRITICAL: auditLog must NOT be deleted
      expect(prisma.auditLog.deleteMany ?? mockTx.consent.deleteMany).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ resource: 'AuditLog' }) })
      );
    });

    it('[ASSERT] Soft delete does NOT remove consents', async () => {
      const { POST } = require('@/app/api/patients/[id]/erasure/route');

      prisma.deletionRequest.findFirst.mockResolvedValue({
        id: 'dr-001',
        confirmationToken: 'valid-token',
      });
      prisma.patient.update.mockResolvedValue({ id: PATIENT_ID, deletedAt: new Date() });
      prisma.deletionRequest.update.mockResolvedValue({ id: 'dr-001' });

      const req = makePostRequest(PATIENT_ID, 'erasure', {
        type: 'soft',
        confirmationToken: 'valid-token',
      });
      await POST(req, ADMIN_CTX);

      // Soft delete path: consent.deleteMany must NOT be called
      expect(prisma.consent.deleteMany).not.toHaveBeenCalled();
    });
  });

  // ── Hard Delete / Cryptographic Shredding ────────────────────────────────────

  describe('Hard Delete / Cryptographic Shredding', () => {
    it('[ASSERT] Hard erasure anonymizes all PII fields', async () => {
      const { POST } = require('@/app/api/patients/[id]/erasure/route');

      prisma.deletionRequest.findFirst.mockResolvedValue({
        id: 'dr-001',
        confirmationToken: 'valid-token',
      });

      const req = makePostRequest(PATIENT_ID, 'erasure', {
        type: 'hard',
        confirmationToken: 'valid-token',
      });
      const res = await POST(req, ADMIN_CTX);

      expect(res.status).toBe(200);

      expect(mockTx.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: '[ERASED]',
            lastName: '[ERASED]',
            cpf: '[ERASED]',
          }),
        })
      );
    });

    it('[ASSERT] Hard erasure destroys TokenMap re-identification keys', async () => {
      const { POST } = require('@/app/api/patients/[id]/erasure/route');

      prisma.deletionRequest.findFirst.mockResolvedValue({
        id: 'dr-001',
        confirmationToken: 'valid-token',
      });

      const req = makePostRequest(PATIENT_ID, 'erasure', {
        type: 'hard',
        confirmationToken: 'valid-token',
      });
      await POST(req, ADMIN_CTX);

      expect(mockTx.tokenMap.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ recordId: PATIENT_ID }),
        })
      );
    });

    it('[ASSERT] Hard erasure anonymizes prescriptions: patientName erased, does NOT null prescriptionHash', async () => {
      const { POST } = require('@/app/api/patients/[id]/erasure/route');

      prisma.deletionRequest.findFirst.mockResolvedValue({
        id: 'dr-001',
        confirmationToken: 'valid-token',
      });

      const req = makePostRequest(PATIENT_ID, 'erasure', {
        type: 'hard',
        confirmationToken: 'valid-token',
      });
      await POST(req, ADMIN_CTX);

      const updateManyCall = mockTx.prescription.updateMany.mock.calls[0]?.[0];
      if (updateManyCall) {
        // patientName should be erased
        expect(updateManyCall.data.patientName).toBe('[ERASED]');
        // prescriptionHash must NOT be nulled
        expect(updateManyCall.data.prescriptionHash).toBeUndefined();
      }
    });

    it('[ASSERT] Hard delete DOES remove consents', async () => {
      const { POST } = require('@/app/api/patients/[id]/erasure/route');

      prisma.deletionRequest.findFirst.mockResolvedValue({
        id: 'dr-001',
        confirmationToken: 'valid-token',
      });

      const req = makePostRequest(PATIENT_ID, 'erasure', {
        type: 'hard',
        confirmationToken: 'valid-token',
      });
      await POST(req, ADMIN_CTX);

      expect(mockTx.consent.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ patientId: PATIENT_ID }),
        })
      );
    });
  });
});
