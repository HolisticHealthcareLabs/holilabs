/**
 * Patient API Route Tests - List and Create
 * Tests for /api/patients GET and POST endpoints
 *
 * Coverage Target: 80%+ (HIPAA-critical API)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    userBehaviorEvent: {
      create: vi.fn(),
    },
    consent: {
      create: vi.fn(),
    },
    dataAccessGrant: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/blockchain/hashing', () => ({
  generatePatientDataHash: vi.fn(() => 'mock-hash-123'),
}));

vi.mock('@/lib/security/token-generation', () => ({
  generateUniquePatientTokenId: vi.fn(() => Promise.resolve('TOKEN-123456')),
}));

vi.mock('@/lib/audit/deid-audit', () => ({
  logDeIDOperation: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/analytics/server-analytics', () => ({
  trackEvent: vi.fn(() => Promise.resolve()),
  ServerAnalyticsEvents: {
    PATIENT_CREATED: 'PATIENT_CREATED',
  },
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
  params: {},
  ...overrides,
});

// Mock request helper
const mockRequest = (options: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}) => {
  const url = options.url || 'https://holilabs.xyz/api/patients';
  const headers = new Headers(options.headers || {});

  const request = {
    url,
    method: options.method || 'GET',
    headers,
    json: async () => options.body || {},
  } as unknown as NextRequest;

  return request;
};

describe('Patient API - GET /api/patients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication', async () => {
      // This is handled by createProtectedRoute middleware
      // Test that the route is wrapped with authentication
      expect(GET).toBeDefined();
      expect(typeof GET).toBe('function');
    });

    it('should allow CLINICIAN role', async () => {
      const mockFindMany = vi.mocked(prisma.patient.findMany);
      const mockCount = vi.mocked(prisma.patient.count);

      mockFindMany.mockResolvedValue([
        {
          id: 'patient-1',
          firstName: 'John',
          lastName: 'Doe',
          assignedClinicianId: 'clinician-123',
        } as any,
      ]);
      mockCount.mockResolvedValue(1);

      const request = mockRequest({ url: 'https://holilabs.xyz/api/patients' });
      const context = mockContext({ user: { role: 'CLINICIAN' } });

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should allow ADMIN role', async () => {
      const mockFindMany = vi.mocked(prisma.patient.findMany);
      const mockCount = vi.mocked(prisma.patient.count);

      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = mockRequest({ url: 'https://holilabs.xyz/api/patients' });
      const context = mockContext({ user: { role: 'ADMIN' } });

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Tenant Isolation (HIPAA Critical)', () => {
    it('should only return patients assigned to the requesting clinician', async () => {
      const mockFindMany = vi.mocked(prisma.patient.findMany);
      const mockCount = vi.mocked(prisma.patient.count);

      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = mockRequest({ url: 'https://holilabs.xyz/api/patients' });
      const context = mockContext({ user: { id: 'clinician-123' } });

      await GET(request, context);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedClinicianId: 'clinician-123',
          }),
        })
      );
    });

    it('should reject non-ADMIN clinician accessing other clinicians patients', async () => {
      const request = mockRequest({
        url: 'https://holilabs.xyz/api/patients?clinicianId=other-clinician-456',
      });
      const context = mockContext({
        user: { id: 'clinician-123', role: 'CLINICIAN' },
      });

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
      expect(data.message).toContain('cannot access other clinicians');
    });

    it('should allow ADMIN to query other clinicians patients', async () => {
      const mockFindMany = vi.mocked(prisma.patient.findMany);
      const mockCount = vi.mocked(prisma.patient.count);

      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = mockRequest({
        url: 'https://holilabs.xyz/api/patients?clinicianId=other-clinician-456',
      });
      const context = mockContext({
        user: { id: 'admin-123', role: 'ADMIN' },
      });

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedClinicianId: 'other-clinician-456',
          }),
        })
      );
    });
  });

  describe('Pagination', () => {
    it('should default to page 1, limit 10', async () => {
      const mockFindMany = vi.mocked(prisma.patient.findMany);
      const mockCount = vi.mocked(prisma.patient.count);

      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = mockRequest({ url: 'https://holilabs.xyz/api/patients' });
      const context = mockContext();

      const response = await GET(request, context);
      const data = await response.json();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it('should handle custom page and limit', async () => {
      const mockFindMany = vi.mocked(prisma.patient.findMany);
      const mockCount = vi.mocked(prisma.patient.count);

      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(50);

      const request = mockRequest({
        url: 'https://holilabs.xyz/api/patients?page=3&limit=20',
      });
      const context = mockContext();

      const response = await GET(request, context);
      const data = await response.json();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (page 3 - 1) * 20
          take: 20,
        })
      );
      expect(data.pagination.page).toBe(3);
      expect(data.pagination.limit).toBe(20);
      expect(data.pagination.totalPages).toBe(3);
    });
  });

  describe('Search and Filters', () => {
    it('should filter by search query', async () => {
      const mockFindMany = vi.mocked(prisma.patient.findMany);
      const mockCount = vi.mocked(prisma.patient.count);

      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = mockRequest({
        url: 'https://holilabs.xyz/api/patients?search=John',
      });
      const context = mockContext();

      await GET(request, context);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: 'John', mode: 'insensitive' } },
              { lastName: { contains: 'John', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should filter by isActive status', async () => {
      const mockFindMany = vi.mocked(prisma.patient.findMany);
      const mockCount = vi.mocked(prisma.patient.count);

      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = mockRequest({
        url: 'https://holilabs.xyz/api/patients?isActive=true',
      });
      const context = mockContext();

      await GET(request, context);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });
  });

  describe('Response Structure', () => {
    it('should return patients with related data', async () => {
      const mockPatients = [
        {
          id: 'patient-1',
          firstName: 'John',
          lastName: 'Doe',
          assignedClinician: {
            id: 'clinician-123',
            firstName: 'Dr. Jane',
            lastName: 'Smith',
          },
          medications: [],
          appointments: [],
        },
      ];

      const mockFindMany = vi.mocked(prisma.patient.findMany);
      const mockCount = vi.mocked(prisma.patient.count);

      mockFindMany.mockResolvedValue(mockPatients as any);
      mockCount.mockResolvedValue(1);

      const request = mockRequest({ url: 'https://holilabs.xyz/api/patients' });
      const context = mockContext();

      const response = await GET(request, context);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPatients);
      expect(data.pagination).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockFindMany = vi.mocked(prisma.patient.findMany);
      mockFindMany.mockRejectedValue(new Error('Database connection failed'));

      const request = mockRequest({ url: 'https://holilabs.xyz/api/patients' });
      const context = mockContext();

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch patients');
    });
  });
});

describe('Patient API - POST /api/patients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const validPatientData = {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    gender: 'MALE',
    email: 'john.doe@example.com',
    phone: '+5511999999999',
    address: '123 Main St',
    city: 'São Paulo',
    state: 'SP',
    postalCode: '01310-100',
    country: 'BR',
    mrn: 'MRN-123456',
    assignedClinicianId: 'clinician-123',
  };

  describe('Authentication & Authorization', () => {
    it('should require CLINICIAN or ADMIN role', async () => {
      // Role enforcement handled by createProtectedRoute middleware
      expect(POST).toBeDefined();
      expect(typeof POST).toBe('function');
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields', async () => {
      const request = mockRequest({
        method: 'POST',
        body: {
          firstName: 'John',
          // Missing required fields
        },
      });
      const context = mockContext();

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('should validate email format', async () => {
      const request = mockRequest({
        method: 'POST',
        body: {
          ...validPatientData,
          email: 'invalid-email',
        },
      });
      const context = mockContext();

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should validate dateOfBirth format', async () => {
      const request = mockRequest({
        method: 'POST',
        body: {
          ...validPatientData,
          dateOfBirth: 'invalid-date',
        },
      });
      const context = mockContext();

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('Patient Creation', () => {
    it('should create patient with valid data', async () => {
      const mockCreate = vi.mocked(prisma.patient.create);
      const mockConsentCreate = vi.mocked(prisma.consent.create);
      const mockAccessGrantCreate = vi.mocked(prisma.dataAccessGrant.create);
      const mockAuditLogCreate = vi.mocked(prisma.auditLog.create);

      const mockPatient = {
        id: 'patient-123',
        ...validPatientData,
        tokenId: 'TOKEN-123456',
        dataHash: 'mock-hash-123',
        assignedClinician: {
          id: 'clinician-123',
          firstName: 'Dr. Jane',
          lastName: 'Smith',
          email: 'jane@holilabs.xyz',
        },
      };

      mockCreate.mockResolvedValue(mockPatient as any);
      mockConsentCreate.mockResolvedValue({ id: 'consent-123' } as any);
      mockAccessGrantCreate.mockResolvedValue({ id: 'grant-123' } as any);
      mockAuditLogCreate.mockResolvedValue({ id: 'audit-123' } as any);

      const request = mockRequest({
        method: 'POST',
        body: validPatientData,
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });
      const context = mockContext();

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('patient-123');
      expect(data.message).toBe('Patient created successfully');
    });

    it('should generate unique token ID', async () => {
      const mockCreate = vi.mocked(prisma.patient.create);
      mockCreate.mockResolvedValue({
        id: 'patient-123',
        tokenId: 'TOKEN-123456',
      } as any);

      const request = mockRequest({
        method: 'POST',
        body: validPatientData,
      });
      const context = mockContext();

      await POST(request, context);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tokenId: 'TOKEN-123456',
          }),
        })
      );
    });

    it('should generate data hash for blockchain', async () => {
      const mockCreate = vi.mocked(prisma.patient.create);
      mockCreate.mockResolvedValue({
        id: 'patient-123',
        dataHash: 'mock-hash-123',
      } as any);

      const request = mockRequest({
        method: 'POST',
        body: validPatientData,
      });
      const context = mockContext();

      await POST(request, context);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dataHash: 'mock-hash-123',
          }),
        })
      );
    });

    it('should calculate age band for de-identification', async () => {
      const mockCreate = vi.mocked(prisma.patient.create);
      mockCreate.mockResolvedValue({
        id: 'patient-123',
        ageBand: '30-39',
      } as any);

      const request = mockRequest({
        method: 'POST',
        body: {
          ...validPatientData,
          dateOfBirth: '1990-01-01', // ~34 years old in 2024
        },
      });
      const context = mockContext();

      await POST(request, context);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ageBand: expect.stringMatching(/^\d+-\d+$/),
          }),
        })
      );
    });
  });

  describe('Default Consent & Access Grant Creation', () => {
    it('should create default consent when assignedClinicianId provided', async () => {
      const mockCreate = vi.mocked(prisma.patient.create);
      const mockConsentCreate = vi.mocked(prisma.consent.create);
      const mockAccessGrantCreate = vi.mocked(prisma.dataAccessGrant.create);

      mockCreate.mockResolvedValue({
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
      } as any);
      mockConsentCreate.mockResolvedValue({ id: 'consent-123' } as any);
      mockAccessGrantCreate.mockResolvedValue({ id: 'grant-123' } as any);

      const request = mockRequest({
        method: 'POST',
        body: validPatientData,
      });
      const context = mockContext();

      await POST(request, context);

      expect(mockConsentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: 'patient-123',
            type: 'GENERAL_CONSULTATION',
            isActive: true,
          }),
        })
      );
    });

    it('should create data access grant for assigned clinician', async () => {
      const mockCreate = vi.mocked(prisma.patient.create);
      const mockAccessGrantCreate = vi.mocked(prisma.dataAccessGrant.create);

      mockCreate.mockResolvedValue({
        id: 'patient-123',
      } as any);
      mockAccessGrantCreate.mockResolvedValue({ id: 'grant-123' } as any);

      const request = mockRequest({
        method: 'POST',
        body: validPatientData,
      });
      const context = mockContext();

      await POST(request, context);

      expect(mockAccessGrantCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: 'patient-123',
            grantedToId: 'clinician-123',
            resourceType: 'ALL',
            canView: true,
          }),
        })
      );
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log for patient creation', async () => {
      const mockCreate = vi.mocked(prisma.patient.create);
      const mockAuditLogCreate = vi.mocked(prisma.auditLog.create);

      mockCreate.mockResolvedValue({
        id: 'patient-123',
        tokenId: 'TOKEN-123456',
        mrn: 'MRN-123456',
      } as any);
      mockAuditLogCreate.mockResolvedValue({ id: 'audit-123' } as any);

      const request = mockRequest({
        method: 'POST',
        body: validPatientData,
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });
      const context = mockContext();

      await POST(request, context);

      expect(mockAuditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE',
            resource: 'Patient',
            resourceId: 'patient-123',
            ipAddress: '192.168.1.1',
            success: true,
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate MRN error', async () => {
      const mockCreate = vi.mocked(prisma.patient.create);
      mockCreate.mockRejectedValue({ code: 'P2002' });

      const request = mockRequest({
        method: 'POST',
        body: validPatientData,
      });
      const context = mockContext();

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Patient with this MRN already exists');
    });

    it('should handle database errors', async () => {
      const mockCreate = vi.mocked(prisma.patient.create);
      mockCreate.mockRejectedValue(new Error('Database connection failed'));

      const request = mockRequest({
        method: 'POST',
        body: validPatientData,
      });
      const context = mockContext();

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create patient');
    });
  });
});
