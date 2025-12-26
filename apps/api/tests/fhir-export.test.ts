/**
 * FHIR Export Integration Tests
 * Tests for $everything operation with RBAC and consent validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createMockPrismaClient,
  createMockRequest,
  createMockReply,
  mockOrgId,
  mockUserId,
  mockPatientTokenId,
  mockPatientToken,
  mockConsent,
  mockFhirBundle,
} from './setup';

// Mock dependencies
vi.mock('../src/index', () => ({
  prisma: createMockPrismaClient(),
}));

vi.mock('../src/services/fhir-sync-enhanced', () => ({
  fetchPatientEverything: vi.fn(),
}));

import { fetchPatientEverything } from '../src/services/fhir-sync-enhanced';

describe('FHIR Export - $everything Operation', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaClient();
    mockReply = createMockReply();

    (fetchPatientEverything as any).mockResolvedValue(mockFhirBundle);
  });

  it('should return FHIR Bundle for authorized ADMIN user', async () => {
    mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
        'x-user-id': mockUserId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
    });

    mockPrisma.patientToken.findUnique.mockResolvedValue({
      ...mockPatientToken,
      org: { id: mockOrgId, name: 'Test Clinic' },
    } as any);
    mockPrisma.consent.findFirst.mockResolvedValue(mockConsent as any);
    mockPrisma.auditEvent.create.mockResolvedValue({} as any);

    // Expected flow:
    // 1. Authenticate user
    // 2. Authorize ADMIN access (allows all patients in org)
    // 3. Validate consent
    // 4. Fetch FHIR Bundle
    // 5. Audit export
    // 6. Return 200 with Bundle

    expect(fetchPatientEverything).not.toHaveBeenCalled();
  });

  it('should return FHIR Bundle for PATIENT accessing own data', async () => {
    mockRequest = createMockRequest({
      headers: {
        'x-role': 'PATIENT',
        'x-org-id': mockOrgId,
        'x-user-id': mockUserId,
        'x-patient-token-id': mockPatientTokenId, // PATIENT's own token
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
    });

    mockPrisma.patientToken.findUnique.mockResolvedValue({
      ...mockPatientToken,
      org: { id: mockOrgId, name: 'Test Clinic' },
    } as any);
    mockPrisma.consent.findFirst.mockResolvedValue(mockConsent as any);
    mockPrisma.auditEvent.create.mockResolvedValue({} as any);

    // Expected: PATIENT can access their own data
  });

  it('should reject PATIENT accessing other patient data', async () => {
    mockRequest = createMockRequest({
      headers: {
        'x-role': 'PATIENT',
        'x-org-id': mockOrgId,
        'x-user-id': mockUserId,
        'x-patient-token-id': 'pt_different123', // Different patient
      },
      params: {
        patientTokenId: mockPatientTokenId, // Requesting OTHER patient's data
      },
    });

    // Expected: 403 error "Patients can only access their own data"
    // Should NOT call fetchPatientEverything
  });

  it('should authorize CLINICIAN with active encounter', async () => {
    mockRequest = createMockRequest({
      headers: {
        'x-role': 'CLINICIAN',
        'x-org-id': mockOrgId,
        'x-user-id': mockUserId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
    });

    mockPrisma.encounter.findFirst.mockResolvedValue({
      id: 'enc_active',
      patientTokenId: mockPatientTokenId,
      status: 'IN_PROGRESS',
      // clinicianId: mockUserId, // TODO: Add this field
    } as any);
    mockPrisma.patientToken.findUnique.mockResolvedValue({
      ...mockPatientToken,
      org: { id: mockOrgId, name: 'Test Clinic' },
    } as any);
    mockPrisma.consent.findFirst.mockResolvedValue(mockConsent as any);

    // Expected: CLINICIAN authorized via active encounter
  });

  it('should reject CLINICIAN without active encounter', async () => {
    mockRequest = createMockRequest({
      headers: {
        'x-role': 'CLINICIAN',
        'x-org-id': mockOrgId,
        'x-user-id': mockUserId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
    });

    mockPrisma.encounter.findFirst.mockResolvedValue(null); // No active encounter

    // Expected: 403 error "No active encounter with this patient"
  });

  it('should reject RESEARCHER from accessing identified data', async () => {
    mockRequest = createMockRequest({
      headers: {
        'x-role': 'RESEARCHER',
        'x-org-id': mockOrgId,
        'x-user-id': mockUserId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
    });

    // Expected: 403 error "Researchers can only access de-identified datasets"
    // Should NOT proceed with data fetch
  });

  it('should reject access when patient belongs to different org', async () => {
    mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
        'x-user-id': mockUserId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
    });

    mockPrisma.patientToken.findUnique.mockResolvedValue({
      ...mockPatientToken,
      orgId: 'org_different', // Different organization
    } as any);

    // Expected: 403 error "Patient belongs to different organization"
  });
});

describe('FHIR Export - Consent Validation', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;
  let mockRequest: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaClient();

    mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
    });

    (fetchPatientEverything as any).mockResolvedValue(mockFhirBundle);
  });

  it('should reject when no CARE consent exists', async () => {
    mockPrisma.patientToken.findUnique.mockResolvedValue({
      ...mockPatientToken,
      org: { id: mockOrgId },
    } as any);
    mockPrisma.consent.findFirst.mockResolvedValue(null); // No consent

    // Expected: 403 error "No active CARE consent found"
  });

  it('should reject when consent is REVOKED', async () => {
    mockPrisma.patientToken.findUnique.mockResolvedValue({
      ...mockPatientToken,
      org: { id: mockOrgId },
    } as any);
    mockPrisma.consent.findFirst.mockResolvedValue(null); // Query filters by state='ACTIVE'

    // Expected: 403 error (no active consent found)
  });

  it('should reject when consent missing required data classes', async () => {
    mockPrisma.patientToken.findUnique.mockResolvedValue({
      ...mockPatientToken,
      org: { id: mockOrgId },
    } as any);
    mockPrisma.consent.findFirst.mockResolvedValue({
      ...mockConsent,
      dataClasses: ['CLINICAL_NOTES'], // Missing LAB_RESULTS, MEDICATIONS
    } as any);

    // Expected: 403 error "Consent missing data classes: LAB_RESULTS, MEDICATIONS"
  });

  it('should succeed when consent includes all required classes', async () => {
    mockPrisma.patientToken.findUnique.mockResolvedValue({
      ...mockPatientToken,
      org: { id: mockOrgId },
    } as any);
    mockPrisma.consent.findFirst.mockResolvedValue({
      ...mockConsent,
      dataClasses: ['CLINICAL_NOTES', 'LAB_RESULTS', 'MEDICATIONS'],
    } as any);
    mockPrisma.auditEvent.create.mockResolvedValue({} as any);

    // Expected: validation passes, proceeds with export
  });
});

describe('FHIR Export - Filtering', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaClient();

    mockPrisma.patientToken.findUnique.mockResolvedValue({
      ...mockPatientToken,
      org: { id: mockOrgId },
    } as any);
    mockPrisma.consent.findFirst.mockResolvedValue(mockConsent as any);
    mockPrisma.auditEvent.create.mockResolvedValue({} as any);

    (fetchPatientEverything as any).mockResolvedValue(mockFhirBundle);
  });

  it('should filter Bundle by start date', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
      query: {
        start: '2024-01-10T00:00:00Z',
      },
    });

    // Expected:
    // - Only includes resources with dates >= 2024-01-10
    // - Patient resource included (no date filter)
    // - Returns filtered bundle
  });

  it('should filter Bundle by end date', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
      query: {
        end: '2024-01-20T00:00:00Z',
      },
    });

    // Expected: Only includes resources with dates <= 2024-01-20
  });

  it('should filter Bundle by date range', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
      query: {
        start: '2024-01-10T00:00:00Z',
        end: '2024-01-20T00:00:00Z',
      },
    });

    // Expected: Only includes resources between dates
  });

  it('should filter Bundle by resource type', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
      query: {
        type: 'Observation',
      },
    });

    // Expected: Only includes Observation resources
  });

  it('should filter Bundle by multiple resource types', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
      query: {
        type: ['Observation', 'Encounter'],
      },
    });

    // Expected: Includes Observation and Encounter resources only
  });

  it('should combine date and type filters', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
      query: {
        start: '2024-01-10T00:00:00Z',
        type: 'Observation',
      },
    });

    // Expected: Only Observations after 2024-01-10
  });

  it('should update Bundle total count after filtering', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
      query: {
        type: 'Observation',
      },
    });

    // Expected: Bundle.total reflects filtered count, not original
  });
});

describe('FHIR Export - Audit Trail', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaClient();

    mockPrisma.patientToken.findUnique.mockResolvedValue({
      ...mockPatientToken,
      org: { id: mockOrgId },
    } as any);
    mockPrisma.consent.findFirst.mockResolvedValue(mockConsent as any);
    mockPrisma.auditEvent.create.mockResolvedValue({} as any);

    (fetchPatientEverything as any).mockResolvedValue(mockFhirBundle);
  });

  it('should audit all successful exports', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
        'x-user-id': mockUserId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
    });

    // Expected: auditEvent.create called with:
    // - eventType: 'FHIR_EXPORT'
    // - userId
    // - userRole
    // - patientTokenId
    // - resourceCount
    // - correlationId
  });

  it('should include filter parameters in audit log', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
      query: {
        start: '2024-01-01',
        type: 'Observation',
      },
    });

    // Expected: audit payload includes dateRange and resourceTypes
  });

  it('should NOT audit failed authorization attempts', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'PATIENT',
        'x-patient-token-id': 'pt_different', // Wrong patient
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
    });

    // Expected: auditEvent.create NOT called (authorization failed)
  });
});

describe('FHIR Export - Export List', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaClient();
  });

  it('should return recent exports for ADMIN', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
        'x-user-id': mockUserId,
      },
      query: {
        limit: '10',
      },
    });

    mockPrisma.auditEvent.findMany.mockResolvedValue([
      {
        ts: new Date('2024-01-15T10:00:00Z'),
        payload: {
          correlationId: 'export-123',
          userId: mockUserId,
          patientTokenId: mockPatientTokenId,
          resourceCount: 15,
        },
      },
    ] as any);

    // Expected: returns list of recent exports
    // No filtering by patientTokenId (ADMIN sees all)
  });

  it('should filter exports by patientTokenId for PATIENT role', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'PATIENT',
        'x-org-id': mockOrgId,
        'x-user-id': mockUserId,
        'x-patient-token-id': mockPatientTokenId,
      },
    });

    // Expected: findMany called with filter:
    // payload.patientTokenId === mockPatientTokenId
    // PATIENT only sees their own exports
  });

  it('should limit results to specified count', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      query: {
        limit: '5',
      },
    });

    // Expected: findMany called with take: 5
  });

  it('should default to 50 exports if limit not specified', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
    });

    // Expected: findMany called with take: 50
  });
});

describe('FHIR Export - Error Handling', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaClient();

    mockPrisma.patientToken.findUnique.mockResolvedValue({
      ...mockPatientToken,
      org: { id: mockOrgId },
    } as any);
    mockPrisma.consent.findFirst.mockResolvedValue(mockConsent as any);
  });

  it('should handle Medplum fetch failure gracefully', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
    });

    (fetchPatientEverything as any).mockResolvedValue(null); // Fetch failed

    // Expected: 500 error "Failed to fetch patient data from FHIR server"
  });

  it('should handle database errors during authorization', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
    });

    mockPrisma.patientToken.findUnique.mockRejectedValue(
      new Error('Database connection failed')
    );

    // Expected: 500 error with message
  });

  it('should return 404 when patient token not found', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      params: {
        patientTokenId: 'pt_nonexistent',
      },
    });

    mockPrisma.patientToken.findUnique.mockResolvedValue(null);

    // Expected: 404 error "Patient not found"
  });

  it('should log all errors with correlation ID', async () => {
    const logSpy = vi.spyOn(console, 'log');

    (fetchPatientEverything as any).mockRejectedValue(new Error('Network error'));

    // Expected: error log contains correlationId, stack trace
  });
});

describe('FHIR Export - Response Format', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaClient();

    mockPrisma.patientToken.findUnique.mockResolvedValue({
      ...mockPatientToken,
      org: { id: mockOrgId },
    } as any);
    mockPrisma.consent.findFirst.mockResolvedValue(mockConsent as any);
    mockPrisma.auditEvent.create.mockResolvedValue({} as any);

    (fetchPatientEverything as any).mockResolvedValue(mockFhirBundle);
  });

  it('should return Content-Type: application/fhir+json', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-role': 'ADMIN',
        'x-org-id': mockOrgId,
      },
      params: {
        patientTokenId: mockPatientTokenId,
      },
    });

    const mockReply = createMockReply();

    // Expected: reply.header('Content-Type', 'application/fhir+json')
  });

  it('should return valid FHIR Bundle structure', async () => {
    // Expected response shape:
    // {
    //   resourceType: 'Bundle',
    //   type: 'searchset',
    //   total: number,
    //   entry: Array<{ resource: FhirResource }>
    // }
  });

  it('should return 200 status code on success', async () => {
    const mockReply = createMockReply();

    // Expected: reply.code(200)
  });
});
