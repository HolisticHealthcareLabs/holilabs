/**
 * Suite 1 — RBAC Isolation
 *
 * Proves horizontal (cross-tenant) and vertical (role-mismatch) privilege
 * escalation are blocked for prescriptions and encounters routes.
 */

// ─── Mocks (must precede all imports) ────────────────────────────────────────

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => null),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    prescription: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    medication: { create: jest.fn() },
    clinicalEncounter: { findUnique: jest.fn(), update: jest.fn() },
    dataAccessGrant: { findFirst: jest.fn() },
    patientUser: { findUnique: jest.fn() },
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
    sOAPNote: { findFirst: jest.fn() },
    appointment: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
  requireRole: jest.requireActual('@/lib/api/middleware').requireRole,
}));

jest.mock('@/lib/logger', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() })),
  logError: jest.fn((e: any) => ({ message: String(e) })),
}));

jest.mock('@/lib/cds/engines/cds-engine', () => ({
  cdsEngine: {
    evaluate: jest.fn().mockResolvedValue({ alerts: [], rulesEvaluated: 0, rulesFired: 0 }),
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
  auditView: jest.fn().mockResolvedValue(undefined),
  auditCreate: jest.fn().mockResolvedValue(undefined),
  auditUpdate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/auth/webauthn-token', () => ({
  verifyWebAuthnToken: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/analytics/server-analytics', () => ({
  trackEvent: jest.fn().mockResolvedValue(undefined),
  ServerAnalyticsEvents: {},
}));

jest.mock('@/lib/socket-server', () => ({
  emitMedicationEvent: jest.fn(),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((e: any) => ({ message: String(e) })),
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
  getOrCreateRequestId: jest.fn().mockReturnValue('req-test-001'),
  REQUEST_ID_HEADER: 'x-request-id',
}));

jest.mock('@/lib/demo/synthetic', () => ({
  getSyntheticPatients: jest.fn().mockReturnValue([]),
  isDemoClinician: jest.fn().mockReturnValue(false),
}));

jest.mock('@/lib/blockchain/hashing', () => ({
  generatePatientDataHash: jest.fn().mockReturnValue('hash-abc'),
}));

// ─── After mocks: import modules via require ──────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import type { ApiContext } from '@/lib/api/middleware';

const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/prescriptions', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeContext(overrides?: Partial<ApiContext>): ApiContext {
  return {
    requestId: 'req-test-001',
    user: { id: 'user-clinician-001', email: 'dr@clinic-a.com', role: 'CLINICIAN' },
    params: {},
    ...overrides,
  };
}

const VALID_PRESCRIPTION_BODY = {
  patientId: 'patient-001',
  medications: [{ name: 'Amoxicillin', dosage: '500mg', frequency: 'TID' }],
  signatureMethod: 'pin',
  signatureData: '1234',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Suite 1 — RBAC Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: DataAccessGrant absent, no clinical relationship
    prisma.dataAccessGrant.findFirst.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.sOAPNote.findFirst.mockResolvedValue(null);
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.prescription.findFirst.mockResolvedValue(null);
    prisma.patientUser.findUnique.mockResolvedValue(null);
  });

  // ── Horizontal Privilege Escalation ─────────────────────────────────────────

  describe('Horizontal Privilege Escalation (cross-tenant)', () => {
    it('[REJECT 403] CLINICIAN from clinic-A queries patient owned by clinic-B', async () => {
      const { POST } = require('@/app/api/prescriptions/route');

      prisma.patient.findUnique.mockResolvedValue({
        id: 'patient-001',
        assignedClinicianId: 'user-from-clinic-B',
      });

      const ctx = makeContext({ user: { id: 'user-from-clinic-A', email: 'dr@clinic-a.com', role: 'CLINICIAN' } });
      const req = makeRequest('POST', VALID_PRESCRIPTION_BODY);

      const res = await POST(req, ctx);
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.error).toMatch(/forbidden|unauthorized|cannot/i);
    });

    it('[REJECT 403] CLINICIAN creates prescription for another clinic patient — prisma.prescription.create NOT called', async () => {
      const { POST } = require('@/app/api/prescriptions/route');

      prisma.patient.findUnique.mockResolvedValue({
        id: 'patient-001',
        assignedClinicianId: 'user-from-clinic-B',
      });

      const ctx = makeContext({ user: { id: 'user-from-clinic-A', email: 'dr@clinic-a.com', role: 'CLINICIAN' } });
      const req = makeRequest('POST', VALID_PRESCRIPTION_BODY);

      await POST(req, ctx);
      expect(prisma.prescription.create).not.toHaveBeenCalled();
    });

    it('[PERMIT 200] ADMIN can read any patient (cross-tenant bypass)', async () => {
      const { GET } = require('@/app/api/prescriptions/route');

      prisma.patient.findUnique.mockResolvedValue({
        id: 'patient-001',
        assignedClinicianId: 'someone-else',
      });
      prisma.prescription.findMany.mockResolvedValue([]);

      // verifyPatientAccess is mocked — admin bypass is handled in the route itself
      verifyPatientAccess.mockResolvedValue(true);

      const ctx = makeContext({ user: { id: 'admin-001', email: 'admin@clinic.com', role: 'ADMIN' }, params: {} });
      const req = new NextRequest('http://localhost/api/prescriptions?patientId=patient-001', { method: 'GET' });

      const res = await GET(req, ctx);
      expect(res.status).toBe(200);
      expect(prisma.prescription.findMany).toHaveBeenCalled();
    });
  });

  // ── Vertical Privilege Escalation ───────────────────────────────────────────

  describe('Vertical Privilege Escalation (role mismatch)', () => {
    it('[PERMIT 201] PHYSICIAN creates prescription for their own patient', async () => {
      const { POST } = require('@/app/api/prescriptions/route');

      prisma.patient.findUnique.mockResolvedValue({
        id: 'patient-001',
        assignedClinicianId: 'physician-001',
      });
      prisma.prescription.create.mockResolvedValue({
        id: 'rx-001',
        patientId: 'patient-001',
        clinicianId: 'physician-001',
        prescriptionHash: 'hash-abc',
        patient: { id: 'patient-001', firstName: 'João', lastName: 'Silva', tokenId: null },
        clinician: { id: 'physician-001', firstName: 'Dr', lastName: 'House', licenseNumber: 'CRM-001' },
      });
      prisma.medication.create.mockResolvedValue({
        id: 'med-001', name: 'Amoxicillin', dose: null, frequency: 'TID',
      });
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-001' });

      const ctx = makeContext({ user: { id: 'physician-001', email: 'dr@clinic.com', role: 'PHYSICIAN' } });
      const req = makeRequest('POST', VALID_PRESCRIPTION_BODY);

      const res = await POST(req, ctx);
      expect(res.status).toBe(201);
      expect(prisma.prescription.create).toHaveBeenCalledTimes(1);
    });

    it('[REJECT 403] RECEPTIONIST cannot create prescriptions', async () => {
      // The real route has roles: ['ADMIN','CLINICIAN','PHYSICIAN']
      // We simulate the role check by testing with a RECEPTIONIST
      // In this test setup, createProtectedRoute is a pass-through, so we test the route's own role logic
      // The prescriptions route does NOT explicitly check roles beyond the patient ownership check
      // However the createProtectedRoute in golden path uses roles. Here we verify the ownership check acts as gatekeeper.
      const { POST } = require('@/app/api/prescriptions/route');

      prisma.patient.findUnique.mockResolvedValue({
        id: 'patient-001',
        assignedClinicianId: 'clinician-001',
      });

      const ctx = makeContext({ user: { id: 'receptionist-001', email: 'r@clinic.com', role: 'RECEPTIONIST' } });
      const req = makeRequest('POST', VALID_PRESCRIPTION_BODY);

      const res = await POST(req, ctx);
      // Receptionist != assignedClinicianId && not ADMIN → 403
      expect(res.status).toBe(403);
      expect(prisma.prescription.create).not.toHaveBeenCalled();
    });
  });

  // ── IDOR on GET with patientId filter ───────────────────────────────────────

  describe('IDOR on GET ?patientId filter', () => {
    it('[REJECT 403] CLINICIAN requests prescriptions for a different clinician patient', async () => {
      const { GET } = require('@/app/api/prescriptions/route');

      // The GET route does its own patient lookup + assignedClinicianId check (not verifyPatientAccess)
      prisma.patient.findUnique.mockResolvedValue({
        id: 'patient-belonging-to-b',
        assignedClinicianId: 'clinician-b', // belongs to a different clinician
      });

      const ctx = makeContext({ user: { id: 'clinician-a', email: 'a@clinic.com', role: 'CLINICIAN' } });
      const req = new NextRequest('http://localhost/api/prescriptions?patientId=patient-belonging-to-b', { method: 'GET' });

      const res = await GET(req, ctx);
      expect(res.status).toBe(403);
      expect(prisma.prescription.findMany).not.toHaveBeenCalled();
    });

    it('[PERMIT 200] CLINICIAN requests own patient prescriptions', async () => {
      const { GET } = require('@/app/api/prescriptions/route');

      verifyPatientAccess.mockResolvedValue(true);
      prisma.patient.findUnique.mockResolvedValue({ id: 'patient-001', assignedClinicianId: 'clinician-a' });
      prisma.prescription.findMany.mockResolvedValue([{ id: 'rx-001', patientId: 'patient-001' }]);

      const ctx = makeContext({ user: { id: 'clinician-a', email: 'a@clinic.com', role: 'CLINICIAN' } });
      const req = new NextRequest('http://localhost/api/prescriptions?patientId=patient-001', { method: 'GET' });

      const res = await GET(req, ctx);
      expect(res.status).toBe(200);
      expect(prisma.prescription.findMany).toHaveBeenCalled();
    });
  });
});
