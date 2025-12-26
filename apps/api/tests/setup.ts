/**
 * Test Setup and Utilities
 * Provides mocks, fixtures, and helpers for FHIR integration tests
 */

import { vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { Bundle, Patient, Encounter, Observation } from '@medplum/fhirtypes';

/**
 * Mock Prisma Client
 */
export function createMockPrismaClient(): jest.Mocked<PrismaClient> {
  return {
    patientToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    consent: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    encounter: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    observation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    org: {
      findUnique: vi.fn(),
    },
    $disconnect: vi.fn(),
  } as any;
}

/**
 * Test Fixtures
 */

export const mockOrgId = 'org_test123';
export const mockUserId = 'user_test456';
export const mockPatientTokenId = 'pt_test789';

export const mockPatientToken = {
  id: mockPatientTokenId,
  orgId: mockOrgId,
  pointerHash: 'hash_abc123',
  storageUri: 's3://bucket/path/to/encrypted/data',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockOrg = {
  id: mockOrgId,
  name: 'Test Clinic',
  domain: 'test-clinic.holilabs.xyz',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockConsent = {
  id: 'consent_test',
  orgId: mockOrgId,
  patientTokenId: mockPatientTokenId,
  purpose: 'CARE',
  state: 'ACTIVE',
  dataClasses: ['CLINICAL_NOTES', 'LAB_RESULTS', 'MEDICATIONS'],
  grantedAt: new Date('2024-01-01T00:00:00Z'),
  expiresAt: new Date('2025-01-01T00:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockEncounter = {
  id: 'enc_test123',
  orgId: mockOrgId,
  patientTokenId: mockPatientTokenId,
  status: 'IN_PROGRESS',
  type: 'OFFICE_VISIT',
  reasonCode: 'Z00.00',
  reasonDisplay: 'General examination',
  start: new Date('2024-01-15T10:00:00Z'),
  end: null,
  locationDisplay: 'Room 101',
  fhirResourceId: 'Encounter/fhir_enc_abc',
  fhirSyncEnabled: true,
  lastSyncedAt: new Date('2024-01-15T10:05:00Z'),
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
};

export const mockObservation = {
  id: 'obs_test456',
  orgId: mockOrgId,
  patientTokenId: mockPatientTokenId,
  encounterId: mockEncounter.id,
  code: '8310-5',
  codeSystem: 'http://loinc.org',
  display: 'Body temperature',
  valueQuantity: '37.2',
  valueUnit: 'Cel',
  valueString: null,
  valueBoolean: null,
  effectiveDateTime: new Date('2024-01-15T10:15:00Z'),
  fhirResourceId: 'Observation/fhir_obs_xyz',
  fhirSyncEnabled: true,
  lastSyncedAt: new Date('2024-01-15T10:16:00Z'),
  createdAt: new Date('2024-01-15T10:15:00Z'),
  updatedAt: new Date('2024-01-15T10:15:00Z'),
};

/**
 * FHIR Resource Fixtures
 */

export const mockFhirPatient: Patient = {
  resourceType: 'Patient',
  id: mockPatientTokenId,
  identifier: [
    {
      system: 'https://holilabs.xyz/patient-token',
      value: mockPatientTokenId,
    },
  ],
  name: [
    {
      text: 'Patient [TEST]',
      family: '***',
      given: ['***'],
    },
  ],
  telecom: [],
  address: [],
};

export const mockFhirEncounter: Encounter = {
  resourceType: 'Encounter',
  id: 'fhir_enc_abc',
  status: 'in-progress',
  class: {
    system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
    code: 'AMB',
  },
  subject: {
    reference: `Patient/${mockPatientTokenId}`,
  },
  period: {
    start: '2024-01-15T10:00:00Z',
  },
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
  location: [
    {
      location: {
        display: 'Room 101',
      },
    },
  ],
};

export const mockFhirObservation: Observation = {
  resourceType: 'Observation',
  id: 'fhir_obs_xyz',
  status: 'final',
  code: {
    coding: [
      {
        system: 'http://loinc.org',
        code: '8310-5',
        display: 'Body temperature',
      },
    ],
  },
  subject: {
    reference: `Patient/${mockPatientTokenId}`,
  },
  encounter: {
    reference: `Encounter/fhir_enc_abc`,
  },
  effectiveDateTime: '2024-01-15T10:15:00Z',
  valueQuantity: {
    value: 37.2,
    unit: 'Cel',
    system: 'http://unitsofmeasure.org',
    code: 'Cel',
  },
};

export const mockFhirBundle: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 3,
  entry: [
    {
      resource: mockFhirPatient,
    },
    {
      resource: mockFhirEncounter,
    },
    {
      resource: mockFhirObservation,
    },
  ],
};

/**
 * Mock Medplum Client
 */
export function createMockMedplumClient() {
  return {
    readResource: vi.fn(),
    createResource: vi.fn(),
    updateResource: vi.fn(),
    deleteResource: vi.fn(),
    search: vi.fn(),
    startClientLogin: vi.fn(),
    processCode: vi.fn(),
  };
}

/**
 * Mock BullMQ Queue
 */
export function createMockQueue() {
  return {
    add: vi.fn(),
    getJob: vi.fn(),
    getJobs: vi.fn(),
    clean: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    close: vi.fn(),
    getJobCounts: vi.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 100,
      failed: 2,
      delayed: 0,
      paused: 0,
    }),
  };
}

/**
 * Mock Fastify Request
 */
export function createMockRequest(overrides?: any) {
  return {
    headers: {
      authorization: 'Bearer test_token',
      'x-user-id': mockUserId,
      'x-org-id': mockOrgId,
      'x-role': 'ADMIN',
      ...overrides?.headers,
    },
    params: overrides?.params || {},
    query: overrides?.query || {},
    body: overrides?.body || {},
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

/**
 * Mock Fastify Reply
 */
export function createMockReply() {
  const reply = {
    code: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply;
}

/**
 * Test Utilities
 */

export function mockEnvVariables(overrides?: Record<string, string>) {
  const originalEnv = process.env;

  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test_jwt_secret_32_chars_long!!!',
    NEXTAUTH_SECRET: 'test_nextauth_secret_32_chars!!',
    NEXTAUTH_URL: 'http://localhost:3000',
    API_PORT: '3001',
    API_HOST: '0.0.0.0',
    LOG_LEVEL: 'error',
    CORS_ORIGIN: 'http://localhost:3000',
    S3_ENDPOINT: 'http://localhost:9000',
    S3_ACCESS_KEY_ID: 'test',
    S3_SECRET_ACCESS_KEY: 'test',
    S3_BUCKET_NAME: 'test',
    S3_REGION: 'us-east-1',
    ENABLE_MEDPLUM: 'true',
    MEDPLUM_BASE_URL: 'http://localhost:8103',
    MEDPLUM_CLIENT_ID: 'test_client_id',
    MEDPLUM_CLIENT_SECRET: 'test_client_secret_32_chars_long',
    MEDPLUM_PROJECT_ID: 'test_project_id',
    ...overrides,
  };

  return () => {
    process.env = originalEnv;
  };
}

/**
 * Sleep utility for async tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate correlation ID for tests
 */
export function generateCorrelationId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
