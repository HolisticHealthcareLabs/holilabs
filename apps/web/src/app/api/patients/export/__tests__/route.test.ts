/**
 * Patient Data Export Tests
 *
 * Comprehensive tests for HIPAA-compliant patient data export with:
 * - De-identification (no PHI exposure)
 * - k-Anonymity validation and enforcement
 * - Differential privacy for aggregates
 * - Multi-format support (JSON, CSV, AGGREGATE)
 * - Supervisor approval for bulk exports
 * - Comprehensive audit logging
 *
 * @group unit
 */

import { NextRequest } from 'next/server';

// Mock dependencies BEFORE requiring route
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    patient: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit/deid-audit', () => ({
  __esModule: true,
  logDeIDOperation: jest.fn().mockResolvedValue(undefined),
}));

// Mock @holi/deid workspace package - must be hoisted BEFORE route import
jest.mock('@holi/deid', () => ({
  __esModule: true,
  checkKAnonymity: jest.fn().mockReturnValue({ isAnonymous: true, violatingGroups: [] }),
  applyKAnonymity: jest.fn().mockImplementation((data: any) => data),
  dpCount: jest.fn().mockImplementation((count: number) => count),
  dpHistogram: jest.fn().mockImplementation((hist: any) => hist),
}));

jest.mock('@/lib/logger', () => {
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  };
  return {
    __esModule: true,
    logger: mockLogger,
    createLogger: jest.fn().mockReturnValue(mockLogger),
    createApiLogger: jest.fn().mockReturnValue(mockLogger),
    logError: jest.fn().mockImplementation((error) => ({ err: error })),
    default: mockLogger,
  };
});

// Mock CSRF to skip validation in tests
jest.mock('@/lib/security/csrf', () => ({
  __esModule: true,
  csrfProtection: () => async (
    _request: any,
    _context: any,
    next: () => Promise<any>
  ) => next(),
  generateCsrfToken: jest.fn().mockReturnValue('test-csrf-token'),
  validateCsrfToken: jest.fn().mockReturnValue(true),
}));

// Mock export rate limiter to skip rate limiting in tests
jest.mock('@/lib/api/export-rate-limit', () => ({
  __esModule: true,
  exportRateLimit: () => async (
    _request: any,
    _context: any,
    next: () => Promise<any>
  ) => next(),
}));

// Use require AFTER jest.mock to ensure mocks are applied
const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { logDeIDOperation } = require('@/lib/audit/deid-audit');
const { checkKAnonymity, applyKAnonymity, dpCount, dpHistogram } = require('@holi/deid');
const { logger } = require('@/lib/logger');

describe('POST /api/patients/export', () => {
  // Test user context - must match middleware.ts test mode defaults
  const TEST_USER = {
    id: 'test-user-id',  // Matches middleware.ts line 237 in test mode
    email: 'test@example.com',
    role: 'CLINICIAN' as const,
  };

  // Mock de-identified patient data
  const MOCK_PATIENTS = [
    {
      id: 'patient-1',
      tokenId: 'pt_abc123',
      ageBand: '30-39',
      region: 'Northeast',
      gender: 'MALE',
      isPalliativeCare: false,
      hasSpecialNeeds: false,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'patient-2',
      tokenId: 'pt_def456',
      ageBand: '40-49',
      region: 'Northeast',
      gender: 'FEMALE',
      isPalliativeCare: true,
      hasSpecialNeeds: true,
      createdAt: new Date('2024-01-02'),
    },
    {
      id: 'patient-3',
      tokenId: 'pt_ghi789',
      ageBand: '30-39',
      region: 'Northeast',
      gender: 'MALE',
      isPalliativeCare: false,
      hasSpecialNeeds: false,
      createdAt: new Date('2024-01-03'),
    },
    {
      id: 'patient-4',
      tokenId: 'pt_jkl012',
      ageBand: '40-49',
      region: 'Southeast',
      gender: 'FEMALE',
      isPalliativeCare: false,
      hasSpecialNeeds: true,
      createdAt: new Date('2024-01-04'),
    },
    {
      id: 'patient-5',
      tokenId: 'pt_mno345',
      ageBand: '30-39',
      region: 'Southeast',
      gender: 'MALE',
      isPalliativeCare: false,
      hasSpecialNeeds: false,
      createdAt: new Date('2024-01-05'),
    },
  ];

  function createMockRequest(options: {
    body?: any;
    headers?: Record<string, string>;
    url?: string;
  }): NextRequest {
    const url = options.url || 'http://localhost:3000/api/patients/export';
    const headers = new Headers(options.headers || {});
    return new NextRequest(url, {
      method: 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  const mockContext = {
    user: TEST_USER,
    params: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset prisma mock to ensure no lingering implementations
    prisma.patient.findMany.mockReset();

    // Default: k-anonymity satisfied
    checkKAnonymity.mockReturnValue({
      isAnonymous: true,
      violatingGroups: [],
    });

    // Default: no suppression needed
    applyKAnonymity.mockImplementation((data: any) => data);

    // Default: return count as-is (for testing purposes)
    dpCount.mockImplementation((count: number) => count);
    dpHistogram.mockImplementation((hist: any) => hist);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('De-identification', () => {
    it('should only export de-identified fields (no PHI)', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Research study on patient demographics',
          filters: {},
          options: { enforceKAnonymity: false }, // Disable for this test
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(5);

      // Verify ONLY de-identified fields are present
      data.data.forEach((patient: any) => {
        expect(patient).toHaveProperty('TokenID');
        expect(patient).toHaveProperty('AgeBand');
        expect(patient).toHaveProperty('Region');
        expect(patient).toHaveProperty('Gender');
        expect(patient).toHaveProperty('PalliativeCare');
        expect(patient).toHaveProperty('SpecialNeeds');

        // Verify NO PHI fields
        expect(patient).not.toHaveProperty('firstName');
        expect(patient).not.toHaveProperty('lastName');
        expect(patient).not.toHaveProperty('dateOfBirth');
        expect(patient).not.toHaveProperty('email');
        expect(patient).not.toHaveProperty('phone');
        expect(patient).not.toHaveProperty('address');
        expect(patient).not.toHaveProperty('mrn');
      });
    });

    it('should query database with tenant isolation', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Quality improvement analysis',
          filters: { region: 'Northeast' },
        },
      });

      await POST(request, mockContext);

      // Verify tenant isolation: only user's assigned patients
      expect(prisma.patient.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          assignedClinicianId: TEST_USER.id,
          region: 'Northeast',
        }),
        select: expect.objectContaining({
          id: true,
          tokenId: true,
          ageBand: true,
          region: true,
          gender: true,
          isPalliativeCare: true,
          hasSpecialNeeds: true,
          createdAt: true,
        }),
      });

      // Verify PHI fields are NOT selected
      const selectArg = prisma.patient.findMany.mock.calls[0][0].select;
      expect(selectArg).not.toHaveProperty('firstName');
      expect(selectArg).not.toHaveProperty('lastName');
      expect(selectArg).not.toHaveProperty('dateOfBirth');
      expect(selectArg).not.toHaveProperty('email');
      expect(selectArg).not.toHaveProperty('phone');
      expect(selectArg).not.toHaveProperty('address');
    });
  });

  describe('k-Anonymity Enforcement', () => {
    it('should enforce k-anonymity by default with k=5', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Research study requiring k-anonymity',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Verify k-anonymity was enforced via metadata
      expect(data.metadata.privacy.kAnonymity.enforced).toBe(true);
      expect(data.metadata.privacy.kAnonymity.k).toBe(5);
    });

    it('should use custom k value when specified', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Research study with strict privacy',
          options: { k: 10 },
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Verify custom k value used
      expect(data.metadata.privacy.kAnonymity.k).toBe(10);
    });

    it('should report suppression in metadata when records are suppressed for k-anonymity', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      // Note: The real @holi/deid will be called, which may or may not suppress
      // This test verifies the metadata structure is correct

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Research study',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Verify metadata structure includes suppression info
      expect(data.metadata.privacy.kAnonymity).toHaveProperty('suppressedRecords');
      expect(typeof data.metadata.privacy.kAnonymity.suppressedRecords).toBe('number');
    });

    it('should allow disabling k-anonymity enforcement', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Internal quality review (no k-anonymity needed)',
          options: { enforceKAnonymity: false },
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(5); // All records returned
      expect(data.metadata.privacy.kAnonymity.enforced).toBe(false);
    });
  });

  describe('Differential Privacy', () => {
    it('should apply differential privacy to aggregate counts by default', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'AGGREGATE',
          accessReason: 'Statistical analysis requiring differential privacy',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Verify differential privacy was applied via metadata
      expect(data.metadata.privacy.differentialPrivacy.applied).toBe(true);
      expect(data.metadata.privacy.differentialPrivacy.epsilon).toBe(0.1); // default
      // Count should be present (may be noisy)
      expect(data.data.totalCount).toBeDefined();
    });

    it('should include gender distribution in aggregate format', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'AGGREGATE',
          accessReason: 'Gender distribution analysis',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Verify gender distribution is included
      expect(data.data.genderDistribution).toBeDefined();
      expect(data.metadata.privacy.differentialPrivacy.applied).toBe(true);
    });

    it('should use custom epsilon parameter', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'AGGREGATE',
          accessReason: 'High-privacy aggregate analysis',
          options: { epsilon: 0.5 },
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Verify custom epsilon is reflected in metadata
      expect(data.metadata.privacy.differentialPrivacy.epsilon).toBe(0.5);
    });

    it('should allow disabling differential privacy', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'AGGREGATE',
          accessReason: 'Internal audit (exact counts needed)',
          options: { applyDifferentialPrivacy: false },
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalCount).toBe(5); // Exact count
      expect(data.metadata.privacy.differentialPrivacy.applied).toBe(false);
    });
  });

  describe('Export Formats', () => {
    it('should export in JSON format', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Data analysis in JSON format',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data[0]).toHaveProperty('TokenID');
      expect(data.metadata.exportFormat).toBe('JSON');
    });

    it('should export in CSV format', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'CSV',
          accessReason: 'Spreadsheet analysis',
          options: { enforceKAnonymity: false }, // Disable to test actual CSV values
        },
      });

      const response = await POST(request, mockContext);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toMatch(
        /attachment; filename="patients-deidentified-\d{4}-\d{2}-\d{2}-\d{6}\.csv"/
      );

      const csv = await response.text();
      expect(csv).toContain('TokenID,AgeBand,Region,Gender,PalliativeCare,SpecialNeeds');
      expect(csv).toContain('pt_abc123');
      expect(csv).toContain('30-39');
      expect(csv).toContain('Northeast');
    });

    it('should export in AGGREGATE format with statistics', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'AGGREGATE',
          accessReason: 'Statistical reporting',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('totalCount');
      expect(data.data).toHaveProperty('genderDistribution');
      expect(data.metadata.exportFormat).toBe('AGGREGATE');
    });

    it('should properly escape CSV values with special characters', async () => {
      const patientsWithSpecialChars = [
        {
          ...MOCK_PATIENTS[0],
          region: 'Northeast, Urban Area',
        },
      ];
      prisma.patient.findMany.mockResolvedValueOnce(patientsWithSpecialChars);

      const request = createMockRequest({
        body: {
          format: 'CSV',
          accessReason: 'Test CSV escaping',
          options: { enforceKAnonymity: false }, // Disable to test actual CSV values
        },
      });

      const response = await POST(request, mockContext);
      const csv = await response.text();

      // CSV should escape values with commas using quotes
      expect(csv).toContain('"Northeast, Urban Area"');
    });
  });

  describe('Supervisor Approval for Bulk Exports', () => {
    it('should require supervisor approval for exports >100 records', async () => {
      const largeDataset = Array.from({ length: 150 }, (_, i) => ({
        ...MOCK_PATIENTS[0],
        id: `patient-${i}`,
        tokenId: `pt_${i}`,
      }));
      prisma.patient.findMany.mockResolvedValueOnce(largeDataset);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Large dataset export',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('SUPERVISOR_APPROVAL_REQUIRED');
      expect(data.message).toContain('Exports of 150 records require supervisor approval');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'bulk_export_blocked_no_supervisor_approval',
          recordCount: 150,
        })
      );
    });

    it('should allow bulk export with supervisor approval', async () => {
      const largeDataset = Array.from({ length: 150 }, (_, i) => ({
        ...MOCK_PATIENTS[0],
        id: `patient-${i}`,
        tokenId: `pt_${i}`,
      }));
      prisma.patient.findMany.mockResolvedValueOnce(largeDataset);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Large dataset export approved by supervisor',
          options: { supervisorApproval: 'SUPERVISOR-123' },
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(150);
    });

    it('should not require approval for exports ≤100 records', async () => {
      const smallDataset = Array.from({ length: 100 }, (_, i) => ({
        ...MOCK_PATIENTS[0],
        id: `patient-${i}`,
        tokenId: `pt_${i}`,
      }));
      prisma.patient.findMany.mockResolvedValueOnce(smallDataset);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Standard dataset export',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Filtering', () => {
    it('should filter by age band', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(
        MOCK_PATIENTS.filter((p) => p.ageBand === '30-39')
      );

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Age-specific analysis',
          filters: { ageBand: '30-39' },
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ageBand: '30-39' }),
        })
      );
      expect(data.success).toBe(true);
    });

    it('should filter by region', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(
        MOCK_PATIENTS.filter((p) => p.region === 'Northeast')
      );

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Regional analysis',
          filters: { region: 'Northeast' },
        },
      });

      await POST(request, mockContext);

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ region: 'Northeast' }),
        })
      );
    });

    it('should filter by gender', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(
        MOCK_PATIENTS.filter((p) => p.gender === 'FEMALE')
      );

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Gender-specific study',
          filters: { gender: 'FEMALE' },
        },
      });

      await POST(request, mockContext);

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ gender: 'FEMALE' }),
        })
      );
    });

    it('should filter by palliative care status', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(
        MOCK_PATIENTS.filter((p) => p.isPalliativeCare)
      );

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Palliative care research',
          filters: { isPalliativeCare: true },
        },
      });

      await POST(request, mockContext);

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPalliativeCare: true }),
        })
      );
    });

    it('should combine multiple filters', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(
        MOCK_PATIENTS.filter(
          (p) => p.ageBand === '30-39' && p.region === 'Northeast' && p.gender === 'MALE'
        )
      );

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Multi-criteria analysis',
          filters: {
            ageBand: '30-39',
            region: 'Northeast',
            gender: 'MALE',
          },
        },
      });

      await POST(request, mockContext);

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ageBand: '30-39',
            region: 'Northeast',
            gender: 'MALE',
          }),
        })
      );
    });
  });

  describe('Audit Logging', () => {
    it('should audit all successful exports with metadata', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Research study requiring comprehensive audit',
          options: { k: 5, epsilon: 0.1 },
        },
        headers: { 'x-forwarded-for': '192.168.1.100' },
      });

      await POST(request, mockContext);

      expect(logDeIDOperation).toHaveBeenCalledWith(
        'EXPORT',
        TEST_USER.id,
        MOCK_PATIENTS.map((p) => p.id),
        expect.objectContaining({
          ipAddress: '192.168.1.100',
          exportFormat: 'JSON',
          recordCount: 5,
          accessReason: 'Research study requiring comprehensive audit',
          kAnonymityEnforced: true,
          k: 5,
          differentialPrivacyApplied: true,
          epsilon: 0.1,
        })
      );
    });

    it('should include supervisor approval in audit log', async () => {
      const largeDataset = Array.from({ length: 150 }, (_, i) => ({
        ...MOCK_PATIENTS[0],
        id: `patient-${i}`,
      }));
      prisma.patient.findMany.mockResolvedValueOnce(largeDataset);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Large export with approval',
          options: { supervisorApproval: 'SUPERVISOR-456' },
        },
      });

      await POST(request, mockContext);

      expect(logDeIDOperation).toHaveBeenCalledWith(
        'EXPORT',
        TEST_USER.id,
        expect.any(Array),
        expect.objectContaining({
          supervisorApproval: 'SUPERVISOR-456',
        })
      );
    });

    it('should audit CSV exports with format metadata', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'CSV',
          accessReason: 'CSV export for spreadsheet',
        },
      });

      await POST(request, mockContext);

      expect(logDeIDOperation).toHaveBeenCalledWith(
        'EXPORT',
        TEST_USER.id,
        expect.any(Array),
        expect.objectContaining({
          exportFormat: 'CSV',
        })
      );
    });
  });

  describe('Validation and Error Handling', () => {
    it('should require access reason', async () => {
      const request = createMockRequest({
        body: {
          format: 'JSON',
          // Missing accessReason
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should require access reason to be at least 10 characters', async () => {
      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Too short',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('VALIDATION_ERROR');
      expect(data.details).toBeDefined();
    });

    it('should limit access reason to 500 characters', async () => {
      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'A'.repeat(501),
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should validate export format enum', async () => {
      const request = createMockRequest({
        body: {
          format: 'INVALID_FORMAT',
          accessReason: 'Testing invalid format',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should validate k value range (2-20)', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Testing k validation',
          options: { k: 1 }, // Below minimum
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should validate epsilon value range (0.01-10)', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'AGGREGATE',
          accessReason: 'Testing epsilon validation',
          options: { epsilon: 0.001 }, // Below minimum
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when no patients match filters', async () => {
      prisma.patient.findMany.mockResolvedValueOnce([]);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Testing empty result set',
          filters: { region: 'NonexistentRegion' },
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('NO_DATA');
      expect(data.message).toContain('No patients match the specified filters');
    });

    it('should handle database errors gracefully', async () => {
      prisma.patient.findMany.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Testing error handling',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('EXPORT_FAILED');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Response Metadata', () => {
    it('should include comprehensive metadata in JSON response', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Testing metadata',
          options: { k: 5 },
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      // JSON format includes k-anonymity metadata but NOT differential privacy
      expect(data.metadata).toMatchObject({
        exportFormat: 'JSON',
        recordCount: expect.any(Number),
        originalRecordCount: 5,
        privacy: {
          kAnonymity: {
            enforced: true,
            k: 5,
            // satisfied depends on actual k-anonymity calculation
            suppressedRecords: expect.any(Number),
          },
        },
        exportedAt: expect.any(String),
      });
    });

    it('should include comprehensive metadata in AGGREGATE response with differential privacy', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'AGGREGATE',
          accessReason: 'Testing aggregate metadata',
          options: { k: 5, epsilon: 0.1 },
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      // AGGREGATE format includes both k-anonymity and differential privacy
      expect(data.metadata).toMatchObject({
        exportFormat: 'AGGREGATE',
        recordCount: expect.any(Number),
        originalRecordCount: 5,
        privacy: {
          kAnonymity: {
            enforced: true,
            k: 5,
            suppressedRecords: expect.any(Number),
          },
          differentialPrivacy: {
            applied: true,
            epsilon: 0.1,
          },
        },
        exportedAt: expect.any(String),
      });
    });

    it('should track original vs exported record counts for transparency', async () => {
      prisma.patient.findMany.mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Testing record count tracking',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Metadata should always include both counts
      expect(data.metadata.originalRecordCount).toBe(5);
      expect(data.metadata.recordCount).toBeDefined();
      // If suppression occurred, recordCount < originalRecordCount
      expect(data.metadata.recordCount).toBeLessThanOrEqual(data.metadata.originalRecordCount);
    });
  });
});
