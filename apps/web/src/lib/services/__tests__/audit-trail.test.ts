/**
 * Suite 3 — Audit Trail
 *
 * Proves createChainedAuditEntry:
 * - Writes all mandatory fields
 * - Captures data delta (previousState / nextState)
 * - Hash chain integrity: GENESIS for first entry, links subsequent entries
 * - LGPD accessReason required on patient PHI access
 * - Trigger coverage: PRESCRIBE and VIEW actions
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => null),
}));

jest.mock('@/lib/prisma', () => {
  // Create inner mock functions inside the factory to avoid hoisting issues
  const _mockTxCreate = jest.fn();
  const _mockTxQueryRaw = jest.fn();
  return {
    prisma: {
      auditLog: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      patient: { findUnique: jest.fn() },
      clinicalNote: { findUnique: jest.fn() },
      $transaction: jest.fn((fn: any) => fn({
        $queryRaw: _mockTxQueryRaw,
        auditLog: { create: _mockTxCreate },
      })),
      // Exposed for direct test access
      _txCreate: _mockTxCreate,
      _txQueryRaw: _mockTxQueryRaw,
    },
  };
});

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() })),
  logError: jest.fn((e: any) => ({ message: String(e) })),
}));

// ─── After mocks ──────────────────────────────────────────────────────────────

const { prisma } = require('@/lib/prisma');
// Inner tx mocks exposed via prisma._txCreate / prisma._txQueryRaw

import { createChainedAuditEntry } from '@/lib/security/audit-chain';
import { createAuditLog, auditView } from '@/lib/audit';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAuditEntry(overrides: Record<string, any> = {}) {
  return {
    userId: 'u1',
    userEmail: 'dr@clinic.com',
    ipAddress: '10.0.0.1',
    action: 'CREATE' as const,
    resource: 'Prescription',
    resourceId: 'rx-001',
    success: true,
    ...overrides,
  };
}

function makeCreatedEntry(overrides: Record<string, any> = {}) {
  return {
    id: 'log-001',
    userId: 'u1',
    userEmail: 'dr@clinic.com',
    ipAddress: '10.0.0.1',
    userAgent: null,
    action: 'CREATE',
    resource: 'Prescription',
    resourceId: 'rx-001',
    details: {},
    dataHash: null,
    accessReason: null,
    accessPurpose: null,
    success: true,
    errorMessage: null,
    previousHash: 'GENESIS',
    entryHash: 'sha256-entry-hash-abc',
    timestamp: new Date('2026-03-05T12:00:00.000Z'),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Suite 3 — Audit Trail', () => {
  // Access inner tx mocks via the exposed _txCreate / _txQueryRaw properties
  let txCreate: jest.Mock;
  let txQueryRaw: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set $transaction implementation every time since clearAllMocks doesn't guarantee it
    txCreate = (prisma as any)._txCreate as jest.Mock;
    txQueryRaw = (prisma as any)._txQueryRaw as jest.Mock;
    prisma.$transaction.mockImplementation((fn: any) => fn({
      $queryRaw: txQueryRaw,
      auditLog: { create: txCreate },
    }));
  });

  // ── Mandatory Audit Fields ───────────────────────────────────────────────────

  describe('Mandatory Audit Fields', () => {
    it('[ASSERT] createChainedAuditEntry() writes all required fields', async () => {
      txQueryRaw.mockResolvedValue([]); // no prior entry → GENESIS
      const expectedEntry = makeCreatedEntry();
      txCreate.mockResolvedValue(expectedEntry);

      const entry = await createChainedAuditEntry(makeAuditEntry());

      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            userEmail: 'dr@clinic.com',
            ipAddress: '10.0.0.1',
            action: 'CREATE',
            resource: 'Prescription',
            resourceId: 'rx-001',
            success: true,
          }),
        })
      );
      expect(entry.id).toBe('log-001');
    });

    it('[ASSERT] createChainedAuditEntry() captures data delta (previousState/nextState)', async () => {
      txQueryRaw.mockResolvedValue([]);
      txCreate.mockResolvedValue(makeCreatedEntry({
        details: { previousState: { status: 'PENDING' }, nextState: { status: 'SIGNED' } },
      }));

      await createChainedAuditEntry(makeAuditEntry({
        details: { previousState: { status: 'PENDING' }, nextState: { status: 'SIGNED' } },
      }));

      const callArgs = txCreate.mock.calls[0][0];
      expect(callArgs.data.details).toEqual(
        expect.objectContaining({
          previousState: { status: 'PENDING' },
          nextState: { status: 'SIGNED' },
        })
      );
    });
  });

  // ── Hash Chain Integrity ─────────────────────────────────────────────────────

  describe('Hash Chain Integrity', () => {
    it('[ASSERT] First audit entry sets previousHash to GENESIS sentinel', async () => {
      txQueryRaw.mockResolvedValue([]); // no prior entries
      txCreate.mockResolvedValue(makeCreatedEntry({ previousHash: 'GENESIS' }));

      await createChainedAuditEntry(makeAuditEntry());

      const callArgs = txCreate.mock.calls[0][0];
      expect(callArgs.data.previousHash).toBe('GENESIS');
      expect(callArgs.data.entryHash).toBeTruthy();
      expect(typeof callArgs.data.entryHash).toBe('string');
      expect(callArgs.data.entryHash.length).toBeGreaterThan(0);
    });

    it('[ASSERT] Subsequent entry references previous entry entryHash', async () => {
      const priorHash = 'abc123def456';
      txQueryRaw.mockResolvedValue([{ entryHash: priorHash }]);
      txCreate.mockResolvedValue(makeCreatedEntry({ previousHash: priorHash }));

      await createChainedAuditEntry(makeAuditEntry({ action: 'UPDATE' as const }));

      const callArgs = txCreate.mock.calls[0][0];
      expect(callArgs.data.previousHash).toBe(priorHash);
    });

    it('[ASSERT] entryHash is a valid SHA-256 hex string (64 chars)', async () => {
      txQueryRaw.mockResolvedValue([]);
      // Let the real hash computation run — do not mock entryHash
      txCreate.mockImplementation(({ data }: any) => Promise.resolve({
        id: 'log-real-hash',
        ...data,
      }));

      const entry = await createChainedAuditEntry(makeAuditEntry());

      expect(entry.entryHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // ── LGPD Access Reason ───────────────────────────────────────────────────────

  describe('LGPD Access Reason', () => {
    it('[ASSERT] auditView() passes accessReason=DIRECT_PATIENT_CARE to audit entry', async () => {
      txQueryRaw.mockResolvedValue([]);
      txCreate.mockResolvedValue(makeCreatedEntry({
        action: 'READ',
        resource: 'Patient',
        accessReason: 'DIRECT_PATIENT_CARE',
      }));

      await auditView(
        'Patient',
        'patient-001',
        undefined,
        { note: 'Routine follow-up' },
        'DIRECT_PATIENT_CARE',
        'Routine follow-up'
      );

      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessReason: 'DIRECT_PATIENT_CARE',
          }),
        })
      );
    });
  });

  // ── Trigger Coverage ─────────────────────────────────────────────────────────

  describe('Trigger Coverage', () => {
    it('[ASSERT] PRESCRIBE action captured with correct resource/resourceId', async () => {
      txQueryRaw.mockResolvedValue([]);
      txCreate.mockResolvedValue(makeCreatedEntry({
        action: 'PRESCRIBE',
        resource: 'Prescription',
        resourceId: 'rx-123',
      }));

      await createChainedAuditEntry({
        userId: 'doc-001',
        userEmail: 'dr@clinic.com',
        ipAddress: '10.0.0.1',
        action: 'PRESCRIBE',
        resource: 'Prescription',
        resourceId: 'rx-123',
      });

      const callArgs = txCreate.mock.calls[0][0];
      expect(callArgs.data.action).toBe('PRESCRIBE');
      expect(callArgs.data.resource).toBe('Prescription');
      expect(callArgs.data.resourceId).toBe('rx-123');
    });

    it('[ASSERT] READ on ClinicalNote captured with action=READ', async () => {
      txQueryRaw.mockResolvedValue([]);
      txCreate.mockResolvedValue(makeCreatedEntry({
        action: 'READ',
        resource: 'ClinicalNote',
        resourceId: 'note-001',
      }));

      await createChainedAuditEntry({
        userId: 'doc-001',
        userEmail: 'dr@clinic.com',
        ipAddress: '10.0.0.1',
        action: 'READ',
        resource: 'ClinicalNote',
        resourceId: 'note-001',
      });

      const callArgs = txCreate.mock.calls[0][0];
      expect(callArgs.data.action).toBe('READ');
      expect(callArgs.data.resource).toBe('ClinicalNote');
      expect(callArgs.data.resourceId).toBe('note-001');
    });
  });
});
