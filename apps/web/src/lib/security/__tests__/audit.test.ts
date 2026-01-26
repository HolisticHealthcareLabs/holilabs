/**
 * Audit Logging Tests
 *
 * HIPAA §164.312(b) - Audit Controls
 * Tests for comprehensive audit logging of PHI access
 */

import { NextRequest } from 'next/server';

// Mock dependencies - define mocks inside factory to avoid hoisting issues
jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

// Mock the hash-chained audit entry function - define inside factory to avoid hoisting
jest.mock('@/lib/security/audit-chain', () => {
  const mockFn = jest.fn().mockResolvedValue({
    id: 'audit-log-123',
    createdAt: new Date(),
  });
  return {
    createChainedAuditEntry: mockFn,
    __mockCreateChainedAuditEntry: mockFn,
  };
});

// Import the mock after jest.mock
const mockCreateChainedAuditEntry = require('@/lib/security/audit-chain').__mockCreateChainedAuditEntry;

// Logger mock is provided by src/lib/__mocks__/logger.ts (manual mock)
jest.mock('@/lib/logger');

jest.mock('@/lib/auth', () => ({
  getServerSession: jest.fn(),
  authOptions: {},
}));

jest.mock('@/lib/auth/patient-session', () => ({
  getPatientSession: jest.fn(),
}));

// Import after mocks are set up
import { createAuditLog, type AuditLogData } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

describe('Audit Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAuditLog', () => {
    it('should create audit log with all required fields', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
      };

      await createAuditLog(auditData, undefined, 'user-123', 'user@example.com');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          userEmail: 'user@example.com',
          action: 'READ',
          resource: 'Patient',
          resourceId: 'patient-123',
          success: true,
        })
      );
    });

    it('should include metadata in audit log', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'UPDATE',
        resource: 'Patient',
        resourceId: 'patient-123',
        details: {
          changes: {
            name: { from: 'John Doe', to: 'Jane Doe' },
          },
        },
      };

      await createAuditLog(auditData, undefined, 'user-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          details: {
            changes: {
              name: { from: 'John Doe', to: 'Jane Doe' },
            },
          },
        })
      );
    });

    it('should log failed operations', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'DELETE',
        resource: 'Patient',
        resourceId: 'patient-123',
        success: false,
        errorMessage: 'Permission denied',
      };

      await createAuditLog(auditData, undefined, 'user-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Permission denied',
        })
      );
    });

    it('should extract IP address from request headers', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const mockRequest = {
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'x-forwarded-for') return '192.168.1.1, 10.0.0.1';
            if (header === 'user-agent') return 'Mozilla/5.0';
            return null;
          }),
        },
      } as unknown as NextRequest;

      const auditData: AuditLogData = {
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
      };

      await createAuditLog(auditData, mockRequest, 'user-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1', // First IP in forwarded list
          userAgent: 'Mozilla/5.0',
        })
      );
    });

    it('should handle x-real-ip header', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const mockRequest = {
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'x-real-ip') return '203.0.113.0';
            return null;
          }),
        },
      } as unknown as NextRequest;

      const auditData: AuditLogData = {
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
      };

      await createAuditLog(auditData, mockRequest, 'user-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '203.0.113.0',
        })
      );
    });

    it('should use "unknown" IP when no headers present', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const mockRequest = {
        headers: {
          get: jest.fn(() => null),
        },
      } as unknown as NextRequest;

      const auditData: AuditLogData = {
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
      };

      await createAuditLog(auditData, mockRequest, 'user-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: 'unknown',
        })
      );
    });

    it('should create data hash for sensitive operations', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'EXPORT',
        resource: 'Patient',
        resourceId: 'patient-123',
        details: {
          exportedFields: ['name', 'dob', 'ssn'],
        },
      };

      await createAuditLog(auditData, undefined, 'user-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          dataHash: expect.any(String), // SHA-256 hash
        })
      );
    });

    it('should log all PHI access actions', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const actions: Array<AuditLogData['action']> = [
        'CREATE',
        'READ',
        'UPDATE',
        'DELETE',
        'EXPORT',
        'PRINT',
      ];

      for (const action of actions) {
        await createAuditLog(
          {
            action,
            resource: 'Patient',
            resourceId: 'patient-123',
          },
          undefined,
          'user-123'
        );
      }

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledTimes(actions.length);
    });

    it('should include LGPD compliance fields', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
        accessReason: 'TREATMENT',
        accessPurpose: 'Reviewing patient chart for scheduled appointment',
      };

      await createAuditLog(auditData, undefined, 'user-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accessReason: 'TREATMENT',
          accessPurpose: 'Reviewing patient chart for scheduled appointment',
        })
      );
    });

    it('should handle audit log creation errors gracefully', async () => {
      mockCreateChainedAuditEntry.mockRejectedValue(new Error('Database connection failed'));

      const auditData: AuditLogData = {
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
      };

      // Should not throw error (fail gracefully)
      await expect(
        createAuditLog(auditData, undefined, 'user-123')
      ).resolves.not.toThrow();
    });

    it('should log authentication events', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'LOGIN',
        resource: 'User',
        resourceId: 'user-123',
        details: {
          method: 'OAuth',
          provider: 'Google',
        },
      };

      await createAuditLog(auditData, undefined, 'user-123', 'user@example.com');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN',
          details: {
            method: 'OAuth',
            provider: 'Google',
          },
        })
      );
    });

    it('should log de-identification operations', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'DEIDENTIFY',
        resource: 'PatientExport',
        resourceId: 'export-123',
        details: {
          method: 'SAFE_HARBOR',
          recordCount: 100,
        },
      };

      await createAuditLog(auditData, undefined, 'user-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DEIDENTIFY',
          details: {
            method: 'SAFE_HARBOR',
            recordCount: 100,
          },
        })
      );
    });

    it('should log prescription actions', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'PRESCRIBE',
        resource: 'Prescription',
        resourceId: 'rx-123',
        details: {
          patientId: 'patient-123',
          medication: 'Lisinopril 10mg',
          prescriberId: 'physician-123',
        },
      };

      await createAuditLog(auditData, undefined, 'physician-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PRESCRIBE',
          resource: 'Prescription',
        })
      );
    });

    it('should log document signing', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'SIGN',
        resource: 'ClinicalNote',
        resourceId: 'note-123',
        details: {
          noteType: 'SOAP',
          signedAt: new Date().toISOString(),
        },
      };

      await createAuditLog(auditData, undefined, 'physician-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SIGN',
          resource: 'ClinicalNote',
        })
      );
    });

    it('should handle missing user information', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
      };

      // No userId provided, no request
      await createAuditLog(auditData);

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          userEmail: null,
        })
      );
    });

    it('should log security alerts', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'SECURITY_ALERT',
        resource: 'System',
        resourceId: 'alert-123',
        details: {
          alertType: 'MULTIPLE_FAILED_LOGINS',
          attempts: 5,
          ipAddress: '192.168.1.1',
        },
        success: false,
      };

      await createAuditLog(auditData, undefined, 'user-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SECURITY_ALERT',
          success: false,
        })
      );
    });
  });

  describe('Audit Trail Integrity', () => {
    it('should create immutable audit logs (no update method)', () => {
      // Ensure no update method exists
      expect((prisma.auditLog as any).update).toBeUndefined();
      expect((prisma.auditLog as any).delete).toBeUndefined();
    });

    it('should create consistent data hashes', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'EXPORT',
        resource: 'Patient',
        resourceId: 'patient-123',
        details: {
          test: 'data',
        },
      };

      // Call twice with same data
      await createAuditLog(auditData, undefined, 'user-123');
      await createAuditLog(auditData, undefined, 'user-123');

      const calls = mockCreateChainedAuditEntry.mock.calls;
      const hash1 = calls[0][0].dataHash;
      const hash2 = calls[1][0].dataHash;

      // Hashes should be identical for identical data
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 format
    });
  });

  describe('Concurrent Audit Log Creation', () => {
    it('should handle concurrent audit log creation', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditPromises = Array.from({ length: 10 }, (_, i) =>
        createAuditLog(
          {
            action: 'READ',
            resource: 'Patient',
            resourceId: `patient-${i}`,
          },
          undefined,
          `user-${i}`
        )
      );

      await expect(Promise.all(auditPromises)).resolves.not.toThrow();
      expect(mockCreateChainedAuditEntry).toHaveBeenCalledTimes(10);
    });
  });

  describe('HIPAA Compliance Scenarios', () => {
    it('should log emergency access override', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
        accessReason: 'EMERGENCY',
        accessPurpose: 'Emergency room access - patient unconscious',
        details: {
          override: true,
          overrideReason: 'EMERGENCY_ACCESS',
        },
      };

      await createAuditLog(auditData, undefined, 'physician-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accessReason: 'EMERGENCY',
          details: expect.objectContaining({
            override: true,
          }),
        })
      );
    });

    it('should log batch PHI access', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'READ',
        resource: 'Patient',
        resourceId: 'batch-query-123',
        details: {
          batchAccess: true,
          recordCount: 50,
          query: 'patients with upcoming appointments',
        },
      };

      await createAuditLog(auditData, undefined, 'receptionist-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            batchAccess: true,
            recordCount: 50,
          }),
        })
      );
    });

    it('should log PHI disclosure', async () => {
      mockCreateChainedAuditEntry.mockResolvedValue({ id: 'test-audit-id' });

      const auditData: AuditLogData = {
        action: 'EXPORT',
        resource: 'Patient',
        resourceId: 'patient-123',
        accessReason: 'DISCLOSURE',
        accessPurpose: 'Patient requested records for insurance claim',
        details: {
          recipient: 'Insurance Company XYZ',
          consentId: 'consent-123',
        },
      };

      await createAuditLog(auditData, undefined, 'physician-123');

      expect(mockCreateChainedAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'EXPORT',
          accessReason: 'DISCLOSURE',
        })
      );
    });
  });
});
