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
import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { logDeIDOperation } from '@/lib/audit/deid-audit';
import {
  checkKAnonymity,
  applyKAnonymity,
  dpCount,
  dpHistogram,
} from '@holi/deid';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit/deid-audit', () => ({
  logDeIDOperation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@holi/deid', () => ({
  checkKAnonymity: jest.fn(),
  applyKAnonymity: jest.fn(),
  dpCount: jest.fn(),
  dpHistogram: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('POST /api/patients/export', () => {
  // Test user context
  const TEST_USER = {
    id: 'test-clinician-1',
    email: 'clinician@test.com',
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

    // Default: k-anonymity satisfied
    (checkKAnonymity as jest.Mock).mockReturnValue({
      isAnonymous: true,
      violatingGroups: [],
    });

    // Default: no suppression needed
    (applyKAnonymity as jest.Mock).mockImplementation((data) => data);

    // Default: return count as-is (for testing purposes)
    (dpCount as jest.Mock).mockImplementation((count) => count);
    (dpHistogram as jest.Mock).mockImplementation((hist) => hist);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('De-identification', () => {
    it('should only export de-identified fields (no PHI)', async () => {
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

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
      const selectArg = (prisma.patient.findMany as jest.Mock).mock.calls[0][0].select;
      expect(selectArg).not.toHaveProperty('firstName');
      expect(selectArg).not.toHaveProperty('lastName');
      expect(selectArg).not.toHaveProperty('dateOfBirth');
      expect(selectArg).not.toHaveProperty('email');
      expect(selectArg).not.toHaveProperty('phone');
      expect(selectArg).not.toHaveProperty('address');
    });
  });

  describe('k-Anonymity Enforcement', () => {
    it('should check k-anonymity with default k=5', async () => {
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Research study requiring k-anonymity',
        },
      });

      await POST(request, mockContext);

      expect(checkKAnonymity).toHaveBeenCalledWith(MOCK_PATIENTS, {
        k: 5,
        quasiIdentifiers: ['ageBand', 'region', 'gender'],
      });
    });

    it('should check k-anonymity with custom k value', async () => {
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Research study with strict privacy',
          options: { k: 10 },
        },
      });

      await POST(request, mockContext);

      expect(checkKAnonymity).toHaveBeenCalledWith(MOCK_PATIENTS, {
        k: 10,
        quasiIdentifiers: ['ageBand', 'region', 'gender'],
      });
    });

    it('should apply k-anonymity suppression when dataset does not satisfy k-anonymity', async () => {
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

      // Simulate k-anonymity violation
      (checkKAnonymity as jest.Mock).mockReturnValueOnce({
        isAnonymous: false,
        violatingGroups: [
          { ageBand: '30-39', region: 'Northeast', gender: 'MALE', count: 2 },
        ],
      });

      // Apply suppression: remove 2 records
      (applyKAnonymity as jest.Mock).mockReturnValueOnce(MOCK_PATIENTS.slice(2));

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Research study',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(applyKAnonymity).toHaveBeenCalledWith(MOCK_PATIENTS, {
        k: 5,
        quasiIdentifiers: ['ageBand', 'region', 'gender'],
      });

      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3); // 5 - 2 suppressed
      expect(data.metadata.privacy.kAnonymity.suppressedRecords).toBe(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'patients_export_k_anonymity_suppression',
          suppressedCount: 2,
          originalCount: 5,
          k: 5,
        })
      );
    });

    it('should allow disabling k-anonymity enforcement', async () => {
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Internal quality review (no k-anonymity needed)',
          options: { enforceKAnonymity: false },
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(checkKAnonymity).not.toHaveBeenCalled();
      expect(applyKAnonymity).not.toHaveBeenCalled();
      expect(data.data).toHaveLength(5); // All records returned
      expect(data.metadata.privacy.kAnonymity.enforced).toBe(false);
    });
  });

  describe('Differential Privacy', () => {
    it('should apply differential privacy to aggregate counts', async () => {
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

      // Simulate noisy count
      (dpCount as jest.Mock).mockReturnValueOnce(5.2);

      const request = createMockRequest({
        body: {
          format: 'AGGREGATE',
          accessReason: 'Statistical analysis requiring differential privacy',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(dpCount).toHaveBeenCalledWith(5, 0.1); // epsilon=0.1 default
      expect(data.success).toBe(true);
      expect(data.data.totalCount).toBe(5.2); // Noisy count
    });

    it('should apply differential privacy to histogram distributions', async () => {
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

      const noisyGender = { MALE: 3.1, FEMALE: 2.2 };
      (dpHistogram as jest.Mock).mockReturnValueOnce(noisyGender);

      const request = createMockRequest({
        body: {
          format: 'AGGREGATE',
          accessReason: 'Gender distribution analysis',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(dpHistogram).toHaveBeenCalledWith(
        { MALE: 3, FEMALE: 2 },
        0.05 // epsilon / 2
      );
      expect(data.data.genderDistribution).toEqual(noisyGender);
    });

    it('should allow custom epsilon parameter', async () => {
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'AGGREGATE',
          accessReason: 'High-privacy aggregate analysis',
          options: { epsilon: 0.5 },
        },
      });

      await POST(request, mockContext);

      expect(dpCount).toHaveBeenCalledWith(5, 0.5);
      expect(dpHistogram).toHaveBeenCalledWith(
        expect.any(Object),
        0.25 // epsilon / 2
      );
    });

    it('should allow disabling differential privacy', async () => {
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'AGGREGATE',
          accessReason: 'Internal audit (exact counts needed)',
          options: { applyDifferentialPrivacy: false },
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(dpCount).not.toHaveBeenCalled();
      expect(dpHistogram).not.toHaveBeenCalled();
      expect(data.data.totalCount).toBe(5); // Exact count
      expect(data.metadata.privacy.differentialPrivacy.applied).toBe(false);
    });
  });

  describe('Export Formats', () => {
    it('should export in JSON format', async () => {
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'CSV',
          accessReason: 'Spreadsheet analysis',
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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(patientsWithSpecialChars);

      const request = createMockRequest({
        body: {
          format: 'CSV',
          accessReason: 'Test CSV escaping',
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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(largeDataset);

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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(largeDataset);

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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(smallDataset);

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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(
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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(
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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(
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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(
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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(
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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(largeDataset);

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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

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
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce([]);

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
      (prisma.patient.findMany as jest.Mock).mockRejectedValueOnce(
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
    it('should include comprehensive metadata in response', async () => {
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Testing metadata',
          options: { k: 5, epsilon: 0.1 },
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(data.metadata).toMatchObject({
        exportFormat: 'JSON',
        recordCount: expect.any(Number),
        originalRecordCount: 5,
        privacy: {
          kAnonymity: {
            enforced: true,
            k: 5,
            satisfied: true,
            suppressedRecords: 0,
          },
          differentialPrivacy: {
            applied: true,
            epsilon: 0.1,
          },
        },
        exportedAt: expect.any(String),
      });
    });

    it('should include suppression count in metadata when records are suppressed', async () => {
      (prisma.patient.findMany as jest.Mock).mockResolvedValueOnce(MOCK_PATIENTS);

      (checkKAnonymity as jest.Mock).mockReturnValueOnce({
        isAnonymous: false,
        violatingGroups: [],
      });

      (applyKAnonymity as jest.Mock).mockReturnValueOnce(MOCK_PATIENTS.slice(0, 3));

      const request = createMockRequest({
        body: {
          format: 'JSON',
          accessReason: 'Testing suppression metadata',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(data.metadata.privacy.kAnonymity.suppressedRecords).toBe(2);
      expect(data.metadata.recordCount).toBe(3); // After suppression
      expect(data.metadata.originalRecordCount).toBe(5); // Before suppression
    });
  });
});
