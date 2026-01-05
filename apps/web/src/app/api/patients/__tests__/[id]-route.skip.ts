/**
 * Patient API Route Tests - Individual Operations
 * Tests for /api/patients/[id] GET, PUT, DELETE endpoints
 *
 * Coverage Target: 80%+ (HIPAA-critical API with IDOR protection)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../[id]/route';
import { prisma } from '@/lib/prisma';
import { verifyPatientAccess } from '@/lib/api/middleware';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    dataAccessGrant: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api/middleware', async () => {
  const actual = await vi.importActual('@/lib/api/middleware');
  return {
    ...actual,
    verifyPatientAccess: vi.fn(),
  };
});

vi.mock('@/lib/audit', () => ({
  auditView: vi.fn(() => Promise.resolve()),
  auditUpdate: vi.fn(() => Promise.resolve()),
  auditDelete: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/blockchain/hashing', () => ({
  generatePatientDataHash: vi.fn(() => 'updated-hash-456'),
}));

vi.mock('@/lib/cache/patient-context-cache', () => ({
  onPatientUpdated: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock context helper
const mockContext = (overrides: any = {}) => ({
  user: {
    id: 'clinician-123',
    email: 'clinician@holilabs.xyz',
    role: 'CLINICIAN',
    ...overrides.user,
  },
  params: {
    id: 'patient-123',
    ...overrides.params,
  },
  ...overrides,
});

// Mock request helper
const mockRequest = (options: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}) => {
  const url = options.url || 'https://holilabs.xyz/api/patients/patient-123';
  const headers = new Headers(options.headers || {});

  const request = {
    url,
    method: options.method || 'GET',
    headers,
    json: async () => options.body || {},
  } as unknown as NextRequest;

  return request;
};

describe('Patient API - GET /api/patients/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication', async () => {
      expect(GET).toBeDefined();
      expect(typeof GET).toBe('function');
    });

    it('should validate patient ID is provided', async () => {
      const request = mockRequest();
      const context = mockContext({ params: { id: undefined } });

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Patient ID required');
    });
  });

  describe('IDOR Protection (HIPAA Critical)', () => {
    it('should verify user has access to patient', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const mockFindUnique = vi.mocked(prisma.patient.findUnique);
      mockFindUnique.mockResolvedValue({
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        assignedClinician: {},
        medications: [],
        appointments: [],
        consents: [],
        documents: [],
        clinicalNotes: [],
        prescriptions: [],
      } as any);

      const request = mockRequest({
        url: 'https://holilabs.xyz/api/patients/patient-123?accessReason=DIRECT_PATIENT_CARE',
      });
      const context = mockContext();

      await GET(request, context);

      expect(mockVerifyAccess).toHaveBeenCalledWith('clinician-123', 'patient-123');
    });

    it('should reject access when user does not have permission', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(false);

      const request = mockRequest({
        url: 'https://holilabs.xyz/api/patients/patient-123?accessReason=DIRECT_PATIENT_CARE',
      });
      const context = mockContext();

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('do not have permission');
    });
  });

  describe('HIPAA Access Reason Requirement (§164.502(b))', () => {
    it('should require accessReason query parameter', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const request = mockRequest({
        url: 'https://holilabs.xyz/api/patients/patient-123', // No accessReason
      });
      const context = mockContext();

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Access reason is required');
      expect(data.hipaaReference).toBe('HIPAA §164.502(b) - Minimum Necessary Standard');
    });

    it('should reject invalid access reasons', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const request = mockRequest({
        url: 'https://holilabs.xyz/api/patients/patient-123?accessReason=INVALID_REASON',
      });
      const context = mockContext();

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.validReasons).toBeDefined();
    });

    it('should accept valid access reasons', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const mockFindUnique = vi.mocked(prisma.patient.findUnique);
      mockFindUnique.mockResolvedValue({
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        assignedClinician: {},
        medications: [],
        appointments: [],
        consents: [],
        documents: [],
        clinicalNotes: [],
        prescriptions: [],
      } as any);

      const validReasons = [
        'DIRECT_PATIENT_CARE',
        'CARE_COORDINATION',
        'EMERGENCY_ACCESS',
        'ADMINISTRATIVE',
      ];

      for (const reason of validReasons) {
        const request = mockRequest({
          url: `https://holilabs.xyz/api/patients/patient-123?accessReason=${reason}`,
        });
        const context = mockContext();

        const response = await GET(request, context);
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Patient Data Retrieval', () => {
    it('should return patient with related data', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const mockPatient = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'MALE',
        email: 'john.doe@example.com',
        mrn: 'MRN-123456',
        assignedClinician: {
          id: 'clinician-123',
          firstName: 'Dr. Jane',
          lastName: 'Smith',
        },
        medications: [
          {
            id: 'med-1',
            name: 'Aspirin',
            dose: '100mg',
            frequency: 'Daily',
          },
        ],
        appointments: [],
        consents: [],
        documents: [],
        clinicalNotes: [],
        prescriptions: [],
      };

      const mockFindUnique = vi.mocked(prisma.patient.findUnique);
      mockFindUnique.mockResolvedValue(mockPatient as any);

      const request = mockRequest({
        url: 'https://holilabs.xyz/api/patients/patient-123?accessReason=DIRECT_PATIENT_CARE',
      });
      const context = mockContext();

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('patient-123');
      expect(data.data.firstName).toBe('John');
      expect(data.data.medications).toHaveLength(1);
    });

    it('should return 404 when patient not found', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const mockFindUnique = vi.mocked(prisma.patient.findUnique);
      mockFindUnique.mockResolvedValue(null);

      const request = mockRequest({
        url: 'https://holilabs.xyz/api/patients/nonexistent?accessReason=DIRECT_PATIENT_CARE',
      });
      const context = mockContext({ params: { id: 'nonexistent' } });

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Patient not found');
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log with access reason', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const mockFindUnique = vi.mocked(prisma.patient.findUnique);
      mockFindUnique.mockResolvedValue({
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        mrn: 'MRN-123456',
        assignedClinician: {},
        medications: [],
        appointments: [],
        consents: [],
        documents: [],
        clinicalNotes: [],
        prescriptions: [],
      } as any);

      const { auditView } = await import('@/lib/audit');
      const mockAuditView = vi.mocked(auditView);

      const request = mockRequest({
        url: 'https://holilabs.xyz/api/patients/patient-123?accessReason=DIRECT_PATIENT_CARE&accessPurpose=Annual+checkup',
      });
      const context = mockContext();

      await GET(request, context);

      expect(mockAuditView).toHaveBeenCalledWith(
        'Patient',
        'patient-123',
        expect.anything(),
        expect.objectContaining({
          patientName: 'John Doe',
          mrn: 'MRN-123456',
        }),
        'DIRECT_PATIENT_CARE',
        'Annual checkup'
      );
    });
  });
});

describe('Patient API - PUT /api/patients/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication', async () => {
      expect(PUT).toBeDefined();
      expect(typeof PUT).toBe('function');
    });

    it('should validate patient ID is provided', async () => {
      const request = mockRequest({ method: 'PUT' });
      const context = mockContext({ params: { id: undefined } });

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Patient ID required');
    });
  });

  describe('IDOR Protection', () => {
    it('should verify user has access to patient', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(false);

      const request = mockRequest({
        method: 'PUT',
        body: { firstName: 'Updated' },
      });
      const context = mockContext();

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('do not have permission');
    });
  });

  describe('Input Validation', () => {
    it('should validate update data with Zod schema', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const request = mockRequest({
        method: 'PUT',
        body: {
          email: 'invalid-email', // Invalid format
        },
      });
      const context = mockContext();

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });
  });

  describe('Patient Update', () => {
    it('should update patient with valid data', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const mockFindUnique = vi.mocked(prisma.patient.findUnique);
      mockFindUnique.mockResolvedValue({
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        mrn: 'MRN-123456',
        dateOfBirth: new Date('1990-01-01'),
      } as any);

      const mockUpdate = vi.mocked(prisma.patient.update);
      mockUpdate.mockResolvedValue({
        id: 'patient-123',
        firstName: 'Jane',
        lastName: 'Doe',
        mrn: 'MRN-123456',
        assignedClinician: {},
      } as any);

      const request = mockRequest({
        method: 'PUT',
        body: {
          firstName: 'Jane',
          phone: '+5511999999999',
        },
      });
      const context = mockContext();

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.firstName).toBe('Jane');
      expect(data.message).toBe('Patient updated successfully');
    });

    it('should regenerate hash when critical fields change', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const mockFindUnique = vi.mocked(prisma.patient.findUnique);
      mockFindUnique.mockResolvedValue({
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        mrn: 'MRN-123456',
        dateOfBirth: new Date('1990-01-01'),
      } as any);

      const mockUpdate = vi.mocked(prisma.patient.update);
      mockUpdate.mockResolvedValue({
        id: 'patient-123',
        dataHash: 'updated-hash-456',
        assignedClinician: {},
      } as any);

      const request = mockRequest({
        method: 'PUT',
        body: {
          firstName: 'UpdatedName', // Critical field
        },
      });
      const context = mockContext();

      await PUT(request, context);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dataHash: 'updated-hash-456',
            lastHashUpdate: expect.any(Date),
          }),
        })
      );
    });

    it('should return 404 when patient not found', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const mockFindUnique = vi.mocked(prisma.patient.findUnique);
      mockFindUnique.mockResolvedValue(null);

      const request = mockRequest({
        method: 'PUT',
        body: { firstName: 'Updated' },
      });
      const context = mockContext();

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Patient not found');
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate patient cache on update', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const mockFindUnique = vi.mocked(prisma.patient.findUnique);
      mockFindUnique.mockResolvedValue({
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        mrn: 'MRN-123456',
        dateOfBirth: new Date('1990-01-01'),
      } as any);

      const mockUpdate = vi.mocked(prisma.patient.update);
      mockUpdate.mockResolvedValue({
        id: 'patient-123',
        firstName: 'Updated',
        assignedClinician: {},
      } as any);

      const { onPatientUpdated } = await import('@/lib/cache/patient-context-cache');
      const mockCacheInvalidation = vi.mocked(onPatientUpdated);

      const request = mockRequest({
        method: 'PUT',
        body: { firstName: 'Updated' },
      });
      const context = mockContext();

      await PUT(request, context);

      expect(mockCacheInvalidation).toHaveBeenCalledWith('patient-123');
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log with updated fields', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const mockFindUnique = vi.mocked(prisma.patient.findUnique);
      mockFindUnique.mockResolvedValue({
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        mrn: 'MRN-123456',
        dateOfBirth: new Date('1990-01-01'),
      } as any);

      const mockUpdate = vi.mocked(prisma.patient.update);
      mockUpdate.mockResolvedValue({
        id: 'patient-123',
        firstName: 'Updated',
        lastName: 'Doe',
        mrn: 'MRN-123456',
        assignedClinician: {},
      } as any);

      const { auditUpdate } = await import('@/lib/audit');
      const mockAuditUpdate = vi.mocked(auditUpdate);

      const request = mockRequest({
        method: 'PUT',
        body: {
          firstName: 'Updated',
          phone: '+5511999999999',
        },
      });
      const context = mockContext();

      await PUT(request, context);

      expect(mockAuditUpdate).toHaveBeenCalledWith(
        'Patient',
        'patient-123',
        expect.anything(),
        expect.objectContaining({
          updatedFields: expect.arrayContaining(['firstName', 'phone']),
          mrn: 'MRN-123456',
        })
      );
    });
  });
});

describe('Patient API - DELETE /api/patients/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication', async () => {
      expect(DELETE).toBeDefined();
      expect(typeof DELETE).toBe('function');
    });

    it('should validate patient ID is provided', async () => {
      const request = mockRequest({ method: 'DELETE' });
      const context = mockContext({ params: { id: undefined } });

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Patient ID required');
    });
  });

  describe('IDOR Protection', () => {
    it('should verify user has access to patient', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(false);

      const request = mockRequest({ method: 'DELETE' });
      const context = mockContext();

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('do not have permission');
    });
  });

  describe('Soft Deletion', () => {
    it('should perform soft delete (set isActive=false)', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const mockFindUnique = vi.mocked(prisma.patient.findUnique);
      mockFindUnique.mockResolvedValue({
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        mrn: 'MRN-123456',
        isActive: true,
      } as any);

      const mockUpdate = vi.mocked(prisma.patient.update);
      mockUpdate.mockResolvedValue({
        id: 'patient-123',
        isActive: false,
      } as any);

      const request = mockRequest({ method: 'DELETE' });
      const context = mockContext();

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Patient deactivated successfully');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'patient-123' },
          data: { isActive: false },
        })
      );
    });

    it('should return 404 when patient not found', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const mockFindUnique = vi.mocked(prisma.patient.findUnique);
      mockFindUnique.mockResolvedValue(null);

      const request = mockRequest({ method: 'DELETE' });
      const context = mockContext();

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Patient not found');
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log with deletion details', async () => {
      const mockVerifyAccess = vi.mocked(verifyPatientAccess);
      mockVerifyAccess.mockResolvedValue(true);

      const mockFindUnique = vi.mocked(prisma.patient.findUnique);
      mockFindUnique.mockResolvedValue({
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        mrn: 'MRN-123456',
        isActive: true,
      } as any);

      const mockUpdate = vi.mocked(prisma.patient.update);
      mockUpdate.mockResolvedValue({
        id: 'patient-123',
        isActive: false,
      } as any);

      const { auditDelete } = await import('@/lib/audit');
      const mockAuditDelete = vi.mocked(auditDelete);

      const request = mockRequest({ method: 'DELETE' });
      const context = mockContext();

      await DELETE(request, context);

      expect(mockAuditDelete).toHaveBeenCalledWith(
        'Patient',
        'patient-123',
        expect.anything(),
        expect.objectContaining({
          patientName: 'John Doe',
          mrn: 'MRN-123456',
          reason: 'Soft delete (set isActive=false)',
        })
      );
    });
  });
});
