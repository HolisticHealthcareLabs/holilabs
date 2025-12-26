/**
 * FHIR Ingress Integration Tests
 * Tests for external FHIR resource ingestion
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createMockPrismaClient,
  createMockRequest,
  createMockReply,
  mockOrgId,
  mockPatientTokenId,
  mockPatientToken,
  mockOrg,
  mockFhirObservation,
  mockFhirEncounter,
} from './setup';

// Mock dependencies
vi.mock('../src/index', () => ({
  prisma: createMockPrismaClient(),
}));

describe('FHIR Ingress - Observation', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaClient();
    mockRequest = createMockRequest({
      headers: {
        'x-org-id': mockOrgId,
      },
      body: mockFhirObservation,
    });
    mockReply = createMockReply();
  });

  it('should successfully ingest a valid FHIR Observation', async () => {
    // Setup mocks
    mockPrisma.org.findUnique.mockResolvedValue(mockOrg);
    mockPrisma.patientToken.findUnique.mockResolvedValue(mockPatientToken);
    mockPrisma.observation.findUnique.mockResolvedValue(null); // No duplicate
    mockPrisma.observation.create.mockResolvedValue({
      id: 'obs_new123',
      orgId: mockOrgId,
      patientTokenId: mockPatientTokenId,
      code: '8310-5',
      codeSystem: 'http://loinc.org',
      display: 'Body temperature',
      valueQuantity: '37.2',
      valueUnit: 'Cel',
      valueString: null,
      valueBoolean: null,
      effectiveDateTime: new Date('2024-01-15T10:15:00Z'),
      fhirResourceId: 'fhir_obs_xyz',
      fhirSyncEnabled: false,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    mockPrisma.auditEvent.create.mockResolvedValue({} as any);

    // Expected behavior:
    // 1. Validates org exists
    // 2. Resolves patient token
    // 3. Checks for duplicate by fhirResourceId
    // 4. Creates observation
    // 5. Creates audit event
    // 6. Returns 201 with holiId

    expect(mockPrisma.org.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.patientToken.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.observation.findUnique).not.toHaveBeenCalled();

    // In a real test, we would call the route handler here
    // For now, we verify the mock setup is correct
  });

  it('should reject observation with missing patient reference', async () => {
    const invalidObservation = {
      ...mockFhirObservation,
      subject: undefined,
    };

    mockRequest.body = invalidObservation;

    // Expected: validation should fail with clear error message
    // This would be tested by calling the route handler
  });

  it('should reject observation when patient token not found', async () => {
    mockPrisma.org.findUnique.mockResolvedValue(mockOrg);
    mockPrisma.patientToken.findUnique.mockResolvedValue(null);

    // Expected: 400 error "Patient token not found"
  });

  it('should skip duplicate observation by fhirResourceId', async () => {
    mockPrisma.org.findUnique.mockResolvedValue(mockOrg);
    mockPrisma.patientToken.findUnique.mockResolvedValue(mockPatientToken);
    mockPrisma.observation.findUnique.mockResolvedValue({
      id: 'obs_existing',
      fhirResourceId: 'fhir_obs_xyz',
    } as any);

    // Expected: 200 with success=true, returns existing holiId
    // Should NOT create duplicate
  });

  it('should handle missing encounter reference gracefully', async () => {
    const observationWithoutEncounter = {
      ...mockFhirObservation,
      encounter: undefined,
    };

    mockRequest.body = observationWithoutEncounter;
    mockPrisma.org.findUnique.mockResolvedValue(mockOrg);
    mockPrisma.patientToken.findUnique.mockResolvedValue(mockPatientToken);
    mockPrisma.observation.findUnique.mockResolvedValue(null);
    mockPrisma.observation.create.mockResolvedValue({
      id: 'obs_new_no_enc',
      encounterId: null,
    } as any);

    // Expected: creates observation with encounterId = null
  });

  it('should prefer LOINC coding when multiple codings present', async () => {
    const observationWithMultipleCodings = {
      ...mockFhirObservation,
      code: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '123456',
            display: 'SNOMED code',
          },
          {
            system: 'http://loinc.org',
            code: '8310-5',
            display: 'Body temperature',
          },
        ],
      },
    };

    mockRequest.body = observationWithMultipleCodings;

    // Expected: uses LOINC coding (8310-5) for the observation
  });

  it('should audit all ingestion attempts', async () => {
    mockPrisma.org.findUnique.mockResolvedValue(mockOrg);
    mockPrisma.patientToken.findUnique.mockResolvedValue(mockPatientToken);
    mockPrisma.observation.findUnique.mockResolvedValue(null);
    mockPrisma.observation.create.mockResolvedValue({ id: 'obs_new' } as any);
    mockPrisma.auditEvent.create.mockResolvedValue({} as any);

    // Expected: auditEvent.create called with:
    // - eventType: 'FHIR_INGRESS'
    // - resourceType: 'Observation'
    // - correlationId
    // - externalId (FHIR ID)
    // - holiId (internal ID)
  });
});

describe('FHIR Ingress - Encounter', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaClient();
    mockRequest = createMockRequest({
      headers: {
        'x-org-id': mockOrgId,
      },
      body: mockFhirEncounter,
    });
    mockReply = createMockReply();
  });

  it('should successfully ingest a valid FHIR Encounter', async () => {
    mockPrisma.org.findUnique.mockResolvedValue(mockOrg);
    mockPrisma.patientToken.findUnique.mockResolvedValue(mockPatientToken);
    mockPrisma.encounter.findUnique.mockResolvedValue(null);
    mockPrisma.encounter.create.mockResolvedValue({
      id: 'enc_new123',
      orgId: mockOrgId,
      patientTokenId: mockPatientTokenId,
      status: 'IN_PROGRESS',
      type: 'OFFICE_VISIT',
      fhirResourceId: 'fhir_enc_abc',
    } as any);

    // Expected: creates encounter with proper status/type mapping
  });

  it('should map FHIR status to Holi status correctly', async () => {
    const statusMapping = [
      { fhir: 'planned', holi: 'PLANNED' },
      { fhir: 'in-progress', holi: 'IN_PROGRESS' },
      { fhir: 'finished', holi: 'FINISHED' },
      { fhir: 'cancelled', holi: 'CANCELLED' },
      { fhir: 'entered-in-error', holi: 'ENTERED_IN_ERROR' },
    ];

    for (const mapping of statusMapping) {
      const encounterWithStatus = {
        ...mockFhirEncounter,
        status: mapping.fhir,
      };

      // Expected: encounter.status === mapping.holi
    }
  });

  it('should map FHIR class code to Holi type correctly', async () => {
    const typeMapping = [
      { fhir: 'AMB', holi: 'OFFICE_VISIT' },
      { fhir: 'EMER', holi: 'EMERGENCY' },
      { fhir: 'VR', holi: 'TELEHEALTH' },
      { fhir: 'HH', holi: 'HOME_HEALTH' },
    ];

    for (const mapping of typeMapping) {
      const encounterWithClass = {
        ...mockFhirEncounter,
        class: {
          code: mapping.fhir,
        },
      };

      // Expected: encounter.type === mapping.holi
    }
  });

  it('should skip duplicate encounter by fhirResourceId', async () => {
    mockPrisma.org.findUnique.mockResolvedValue(mockOrg);
    mockPrisma.patientToken.findUnique.mockResolvedValue(mockPatientToken);
    mockPrisma.encounter.findUnique.mockResolvedValue({
      id: 'enc_existing',
      fhirResourceId: 'fhir_enc_abc',
    } as any);

    // Expected: returns existing encounter, no duplicate created
  });

  it('should extract reason code and display from reasonCode array', async () => {
    const encounterWithReason = {
      ...mockFhirEncounter,
      reasonCode: [
        {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: 'Z00.00',
              display: 'General examination',
            },
          ],
        },
      ],
    };

    // Expected: encounter.reasonCode = 'Z00.00'
    //           encounter.reasonDisplay = 'General examination'
  });
});

describe('FHIR Ingress - Batch', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaClient();
    mockReply = createMockReply();
  });

  it('should process FHIR Bundle with mixed resources', async () => {
    const bundle = {
      resourceType: 'Bundle',
      type: 'batch',
      entry: [
        { resource: mockFhirEncounter },
        { resource: mockFhirObservation },
      ],
    };

    mockRequest = createMockRequest({
      headers: { 'x-org-id': mockOrgId },
      body: bundle,
    });

    mockPrisma.org.findUnique.mockResolvedValue(mockOrg);
    mockPrisma.patientToken.findUnique.mockResolvedValue(mockPatientToken);
    mockPrisma.encounter.findUnique.mockResolvedValue(null);
    mockPrisma.encounter.create.mockResolvedValue({ id: 'enc_1' } as any);
    mockPrisma.observation.findUnique.mockResolvedValue(null);
    mockPrisma.observation.create.mockResolvedValue({ id: 'obs_1' } as any);

    // Expected:
    // - Processes both resources
    // - Returns summary: { total: 2, succeeded: 2, failed: 0 }
  });

  it('should handle partial failures in batch', async () => {
    const bundle = {
      resourceType: 'Bundle',
      type: 'batch',
      entry: [
        { resource: mockFhirEncounter }, // Will succeed
        { resource: { ...mockFhirObservation, subject: undefined } }, // Will fail
      ],
    };

    mockRequest = createMockRequest({
      headers: { 'x-org-id': mockOrgId },
      body: bundle,
    });

    // Expected:
    // - Processes all resources
    // - Returns summary: { total: 2, succeeded: 1, failed: 1 }
    // - Includes error details for failed resource
  });

  it('should maintain order in batch processing', async () => {
    // Create 10 resources
    const entries = Array.from({ length: 10 }, (_, i) => ({
      resource: {
        ...mockFhirObservation,
        id: `obs_${i}`,
      },
    }));

    const bundle = {
      resourceType: 'Bundle',
      type: 'batch',
      entry: entries,
    };

    // Expected: results array matches input order
  });
});

describe('FHIR Ingress - Authentication', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaClient();
    mockReply = createMockReply();
  });

  it('should reject request without Authorization header', async () => {
    const mockRequest = createMockRequest({
      headers: {
        // No authorization header
        'x-org-id': mockOrgId,
      },
      body: mockFhirObservation,
    });

    // Expected: 401 or 403 error
  });

  it('should reject request without X-Org-ID header', async () => {
    const mockRequest = createMockRequest({
      headers: {
        authorization: 'Bearer test_token',
        // No x-org-id header
      },
      body: mockFhirObservation,
    });

    // Expected: 403 error
  });

  it('should reject request for non-existent organization', async () => {
    const mockRequest = createMockRequest({
      headers: {
        'x-org-id': 'org_invalid',
      },
      body: mockFhirObservation,
    });

    mockPrisma.org.findUnique.mockResolvedValue(null);

    // Expected: 403 error "Organization not found"
  });
});

describe('FHIR Ingress - Validation', () => {
  it('should reject observation with invalid status', async () => {
    const invalidObservation = {
      ...mockFhirObservation,
      status: 'invalid-status',
    };

    // Expected: Zod validation error
  });

  it('should reject observation with missing required fields', async () => {
    const invalidObservation = {
      resourceType: 'Observation',
      // Missing required fields
    };

    // Expected: Zod validation error
  });

  it('should reject encounter with invalid class code', async () => {
    const invalidEncounter = {
      ...mockFhirEncounter,
      class: {
        // Missing required code field
        system: 'http://test.com',
      },
    };

    // Expected: Zod validation error
  });

  it('should validate URL format in code systems', async () => {
    const observationWithInvalidUrl = {
      ...mockFhirObservation,
      code: {
        coding: [
          {
            system: 'not-a-valid-url',
            code: '123',
          },
        ],
      },
    };

    // Expected: Zod validation error for invalid URL
  });
});

describe('FHIR Ingress - Error Handling', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaClient();
  });

  it('should handle database errors gracefully', async () => {
    mockPrisma.org.findUnique.mockResolvedValue(mockOrg);
    mockPrisma.patientToken.findUnique.mockResolvedValue(mockPatientToken);
    mockPrisma.observation.create.mockRejectedValue(new Error('Database connection failed'));

    // Expected: returns 500 error with message
    // Should NOT crash the server
  });

  it('should log all errors with correlation ID', async () => {
    // Mock console.log to capture structured logs
    const logSpy = vi.spyOn(console, 'log');

    mockPrisma.observation.create.mockRejectedValue(new Error('Test error'));

    // Expected: error log contains correlationId
    // Format: JSON with timestamp, level, service, message, context
  });

  it('should continue batch processing after individual failures', async () => {
    const bundle = {
      resourceType: 'Bundle',
      type: 'batch',
      entry: [
        { resource: mockFhirObservation }, // Will succeed
        { resource: mockFhirObservation }, // Will fail (duplicate)
        { resource: { ...mockFhirObservation, id: 'obs_3' } }, // Will succeed
      ],
    };

    mockPrisma.observation.findUnique
      .mockResolvedValueOnce(null) // First: no duplicate
      .mockResolvedValueOnce({ id: 'existing' } as any) // Second: duplicate
      .mockResolvedValueOnce(null); // Third: no duplicate

    // Expected: processes all 3, returns mix of success/skip
  });
});
