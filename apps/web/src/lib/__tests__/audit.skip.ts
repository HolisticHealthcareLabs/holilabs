/**
 * Audit Logging Test Suite
 * Tests HIPAA-compliant audit trail functionality
 *
 * Coverage Target: 95%+ (critical security infrastructure)
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import {
  createAuditLog,
  auditView,
  auditCreate,
  auditUpdate,
  auditDelete,
  auditExport,
  auditAccessDenied,
  auditLogin,
  auditLogout,
} from '../audit';
import { prisma } from '../prisma';

// Mock Prisma
jest.mock('../prisma', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
    },
  },
}));

// Mock auth module to avoid ESM import issues
jest.mock('../auth', () => ({
  getServerSession: jest.fn().mockResolvedValue(null),
  authOptions: {},
}));

jest.mock('../auth/patient-session', () => ({
  getPatientSession: jest.fn().mockResolvedValue(null),
}));

// Mock NextRequest
const mockRequest = (options: { url?: string; headers?: Record<string, string> } = {}) => {
  const headers = new Headers(options.headers || {});
  return {
    url: options.url || 'https://holilabs.xyz/api/test',
    headers,
  } as NextRequest;
};

describe('Audit Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createAuditLog', () => {
    it('should create audit log with all required fields', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({
        id: 'audit-123',
        userId: 'user-123',
        userEmail: 'clinician@holilabs.xyz',
        ipAddress: '192.168.1.1',
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
        details: {},
        success: true,
        timestamp: new Date('2026-01-01T12:00:00Z'),
      } as any);

      const request = mockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      await createAuditLog({
        userId: 'user-123',
        userEmail: 'clinician@holilabs.xyz',
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
        success: true,
        request,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          userEmail: 'clinician@holilabs.xyz',
          ipAddress: '192.168.1.1',
          action: 'READ',
          resource: 'Patient',
          resourceId: 'patient-123',
          success: true,
        }),
      });
    });

    it('should use x-real-ip header as fallback for IP address', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({
        headers: { 'x-real-ip': '203.0.113.1' },
      });

      await createAuditLog({
        userId: 'user-123',
        userEmail: 'test@example.com',
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
        success: true,
        request,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '203.0.113.1',
        }),
      });
    });

    it('should use "unknown" if no IP headers present', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await createAuditLog({
        userId: 'user-123',
        userEmail: 'test@example.com',
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
        success: true,
        request,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: 'unknown',
        }),
      });
    });

    it('should include details object', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});
      const details = {
        patientName: 'John Doe',
        recordCount: 5,
      };

      await createAuditLog({
        userId: 'user-123',
        userEmail: 'test@example.com',
        action: 'EXPORT',
        resource: 'Patient',
        resourceId: 'multiple',
        success: true,
        request,
        details,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details,
        }),
      });
    });

    it('should handle audit log creation failure gracefully', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockRejectedValue(new Error('Database connection failed'));

      const request = mockRequest({});

      // Should not throw error
      await expect(
        createAuditLog({
          userId: 'user-123',
          userEmail: 'test@example.com',
          action: 'READ',
          resource: 'Patient',
          resourceId: 'patient-123',
          success: true,
          request,
        })
      ).resolves.not.toThrow();

      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('auditView', () => {
    it('should create READ audit log with access reason', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await auditView(
        'Patient',
        'patient-123',
        request,
        { patientName: 'John Doe' },
        'DIRECT_PATIENT_CARE',
        'Annual checkup'
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'READ',
          resource: 'Patient',
          resourceId: 'patient-123',
          details: expect.objectContaining({
            patientName: 'John Doe',
            accessReason: 'DIRECT_PATIENT_CARE',
            accessPurpose: 'Annual checkup',
          }),
        }),
      });
    });

    it('should work without access purpose', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await auditView('Patient', 'patient-123', request, {}, 'CARE_COORDINATION');

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            accessReason: 'CARE_COORDINATION',
          }),
        }),
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.not.objectContaining({
            accessPurpose: expect.anything(),
          }),
        }),
      });
    });
  });

  describe('auditCreate', () => {
    it('should create CREATE audit log', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await auditCreate('Patient', 'patient-123', request, {
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CREATE',
          resource: 'Patient',
          resourceId: 'patient-123',
        }),
      });
    });
  });

  describe('auditUpdate', () => {
    it('should create UPDATE audit log', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await auditUpdate('Patient', 'patient-123', request, {
        changedFields: ['phone', 'address'],
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPDATE',
          resource: 'Patient',
          resourceId: 'patient-123',
          details: expect.objectContaining({
            changedFields: ['phone', 'address'],
          }),
        }),
      });
    });
  });

  describe('auditDelete', () => {
    it('should create DELETE audit log', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await auditDelete('Patient', 'patient-123', request, {
        reason: 'Patient requested deletion',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DELETE',
          resource: 'Patient',
          resourceId: 'patient-123',
          details: expect.objectContaining({
            reason: 'Patient requested deletion',
          }),
        }),
      });
    });
  });

  describe('auditExport', () => {
    it('should create EXPORT audit log with supervisor approval', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await auditExport('Patient', request, {
        recordCount: 500,
        exportFormat: 'CSV',
        accessReason: 'RESEARCH_IRB_APPROVED',
        supervisorApproval: 'supervisor-123',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'EXPORT',
          resource: 'Patient',
          details: expect.objectContaining({
            recordCount: 500,
            exportFormat: 'CSV',
            accessReason: 'RESEARCH_IRB_APPROVED',
            supervisorApproval: 'supervisor-123',
          }),
        }),
      });
    });

    it('should handle bulk export without supervisor (< 100 records)', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await auditExport('Patient', request, {
        recordCount: 50,
        exportFormat: 'PDF',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'EXPORT',
          details: expect.objectContaining({
            recordCount: 50,
          }),
        }),
      });
    });
  });

  describe('auditAccessDenied', () => {
    it('should create ACCESS_DENIED audit log with failure status', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await auditAccessDenied('Patient', 'patient-123', request, {
        reason: 'User does not have access to this patient',
        attemptedAction: 'READ',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ACCESS_DENIED',
          resource: 'Patient',
          resourceId: 'patient-123',
          success: false,
          details: expect.objectContaining({
            reason: 'User does not have access to this patient',
            attemptedAction: 'READ',
          }),
        }),
      });
    });
  });

  describe('auditLogin', () => {
    it('should create LOGIN audit log on successful login', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await auditLogin('user-123', 'clinician@holilabs.xyz', request, true, {
        provider: 'credentials',
        mfaUsed: true,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          userEmail: 'clinician@holilabs.xyz',
          action: 'LOGIN',
          resource: 'Auth',
          success: true,
          details: expect.objectContaining({
            provider: 'credentials',
            mfaUsed: true,
          }),
        }),
      });
    });

    it('should create LOGIN audit log on failed login', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await auditLogin(null, 'wrong@example.com', request, false, {
        reason: 'Invalid credentials',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          userEmail: 'wrong@example.com',
          action: 'LOGIN',
          success: false,
          details: expect.objectContaining({
            reason: 'Invalid credentials',
          }),
        }),
      });
    });
  });

  describe('auditLogout', () => {
    it('should create LOGOUT audit log', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await auditLogout('user-123', 'clinician@holilabs.xyz', request, {
        sessionDuration: 3600,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          userEmail: 'clinician@holilabs.xyz',
          action: 'LOGOUT',
          resource: 'Auth',
          success: true,
          details: expect.objectContaining({
            sessionDuration: 3600,
          }),
        }),
      });
    });
  });

  describe('HIPAA Compliance', () => {
    it('should include timestamp for all audit logs', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await createAuditLog({
        userId: 'user-123',
        userEmail: 'test@example.com',
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
        success: true,
        request,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timestamp: expect.any(Date),
        }),
      });
    });

    it('should never omit required fields', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await createAuditLog({
        userId: 'user-123',
        userEmail: 'test@example.com',
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
        success: true,
        request,
      });

      const calledWith = mockCreate.mock.calls[0][0].data;

      // Verify all required HIPAA audit fields
      expect(calledWith).toHaveProperty('userId');
      expect(calledWith).toHaveProperty('userEmail');
      expect(calledWith).toHaveProperty('ipAddress');
      expect(calledWith).toHaveProperty('action');
      expect(calledWith).toHaveProperty('resource');
      expect(calledWith).toHaveProperty('resourceId');
      expect(calledWith).toHaveProperty('success');
      expect(calledWith).toHaveProperty('timestamp');
    });

    it('should handle null userId (for unauthenticated attempts)', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const request = mockRequest({});

      await createAuditLog({
        userId: null,
        userEmail: 'anonymous',
        action: 'LOGIN',
        resource: 'Auth',
        resourceId: 'login-attempt',
        success: false,
        request,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          userEmail: 'anonymous',
        }),
      });
    });
  });

  describe('Error Handling', () => {
    it('should not throw on database errors (fire-and-forget pattern)', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      mockCreate.mockRejectedValue(new Error('Connection timeout'));

      const request = mockRequest({});

      await expect(
        createAuditLog({
          userId: 'user-123',
          userEmail: 'test@example.com',
          action: 'READ',
          resource: 'Patient',
          resourceId: 'patient-123',
          success: true,
          request,
        })
      ).resolves.toBeUndefined();
    });

    it('should log audit failures to monitoring', async () => {
      const mockCreate = jest.mocked(prisma.auditLog.create);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCreate.mockRejectedValue(new Error('Disk full'));

      const request = mockRequest({});

      await createAuditLog({
        userId: 'user-123',
        userEmail: 'test@example.com',
        action: 'READ',
        resource: 'Patient',
        resourceId: 'patient-123',
        success: true,
        request,
      });

      // Should log the error but not throw
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });
});
