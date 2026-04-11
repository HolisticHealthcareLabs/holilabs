/**
 * HoliLabs Integration Test Setup
 *
 * Shared mocks, utilities, and factories for integration tests.
 *
 * IMPORTANT — CLAUDE.md Jest Mocking Rule:
 *   jest.mock() calls MUST come BEFORE require() calls.
 *   Pattern: jest.mock('@/lib/prisma', ...) → then → const { prisma } = require('@/lib/prisma')
 *
 * @see CLAUDE.md — Jest mock ordering
 * @see sprint5-assets/prisma-seed-data.json — demo data for factories
 */

// ─── Mock Prisma Client ──────────────────────────────────────────────────────

/**
 * Creates a mock Prisma client with all models stubbed.
 * Usage: const prisma = createMockPrisma();
 *
 * CLAUDE.md pattern:
 *   jest.mock('@/lib/prisma', () => ({ prisma: createMockPrisma() }));
 *   const { prisma } = require('@/lib/prisma');
 */
export function createMockPrisma() {
  const modelMethods = {
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: `mock_${Date.now()}`, ...args.data, createdAt: new Date(), updatedAt: new Date() })
    ),
    update: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'mock_id', ...args.data, updatedAt: new Date() })
    ),
    upsert: jest.fn().mockImplementation((args: { create: Record<string, unknown> }) =>
      Promise.resolve({ id: `mock_${Date.now()}`, ...args.create })
    ),
    delete: jest.fn().mockResolvedValue({ id: 'mock_id' }),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({ _sum: {}, _count: 0 }),
    groupBy: jest.fn().mockResolvedValue([]),
  };

  const models = [
    'patient', 'user', 'organization', 'encounter', 'clinicalNote',
    'invoice', 'invoiceLineItem', 'conversation', 'message',
    'notification', 'scheduledReminder', 'auditLog', 'auditLogHashChain',
    'iCD10Code', 'loincCode', 'snomedConcept', 'medication',
    'prescription', 'insuranceClaim', 'preventionPlanTemplate',
    'preventiveCareReminder', 'calendarIntegration',
  ];

  const prisma: Record<string, unknown> = {
    $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma)),
    $executeRaw: jest.fn().mockResolvedValue(0),
    $queryRaw: jest.fn().mockResolvedValue([]),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  for (const model of models) {
    prisma[model] = { ...modelMethods };
    // Clone each mock so they're independent
    for (const method of Object.keys(modelMethods)) {
      (prisma[model] as Record<string, unknown>)[method] = jest.fn().mockImplementation(
        (modelMethods as Record<string, jest.Mock>)[method].getMockImplementation()!
      );
    }
  }

  return prisma;
}

// ─── Mock NextAuth Session ───────────────────────────────────────────────────

type Role = 'CLINICIAN' | 'BILLING' | 'ORG_ADMIN' | 'PATIENT';

interface MockSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    organizationId: string;
  };
  expires: string;
}

/**
 * Creates a mock NextAuth session for the given role.
 * Usage:
 *   jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
 *   const { getServerSession } = require('next-auth/next');
 *   (getServerSession as jest.Mock).mockResolvedValue(createMockSession('CLINICIAN'));
 */
export function createMockSession(role: Role, overrides?: Partial<MockSession['user']>): MockSession {
  const users: Record<Role, MockSession['user']> = {
    CLINICIAN: { id: 'user_dr_ricardo', name: 'Dr. Ricardo Mendes', email: 'ricardo@holilabs.demo', role: 'CLINICIAN', organizationId: 'org_holilabs_demo' },
    BILLING: { id: 'user_billing_ana', name: 'Ana Figueiredo', email: 'ana.billing@holilabs.demo', role: 'BILLING', organizationId: 'org_holilabs_demo' },
    ORG_ADMIN: { id: 'user_admin_marcos', name: 'Marcos Tavares', email: 'marcos.admin@holilabs.demo', role: 'ORG_ADMIN', organizationId: 'org_holilabs_demo' },
    PATIENT: { id: 'pat_01', name: 'João Carlos da Silva', email: 'joao.silva@email.com', role: 'PATIENT', organizationId: 'org_holilabs_demo' },
  };

  return {
    user: { ...users[role], ...overrides },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

/**
 * Creates a session for a different organization (for cross-tenant tests).
 * CYRUS invariant: cross-tenant access must return 403 or 404.
 */
export function createCrossTenantSession(role: Role): MockSession {
  return createMockSession(role, { organizationId: 'org_OTHER_TENANT', id: 'user_other_tenant' });
}

// ─── Mock Twilio Client ──────────────────────────────────────────────────────

interface TwilioMessage {
  sid: string;
  status: string;
  to: string;
  body: string;
}

/**
 * Creates a mock Twilio client for WhatsApp/SMS testing.
 * CYRUS invariant: always validate X-Twilio-Signature before processing.
 */
export function createMockTwilio() {
  return {
    messages: {
      create: jest.fn().mockImplementation((opts: { to: string; body: string }) =>
        Promise.resolve({
          sid: `SM${Date.now()}`,
          status: 'queued',
          to: opts.to,
          body: opts.body,
          dateCreated: new Date(),
        } as TwilioMessage)
      ),
    },
    validateRequest: jest.fn().mockReturnValue(true),
    /** Simulate invalid signature */
    rejectSignature: () => {
      return { ...createMockTwilio(), validateRequest: jest.fn().mockReturnValue(false) };
    },
  };
}

// ─── Mock RNDS/FHIR Client ──────────────────────────────────────────────────

/**
 * Creates a mock FHIR HTTP client for RNDS integration tests.
 */
export function createMockRNDS() {
  return {
    submitBundle: jest.fn().mockResolvedValue({
      success: true,
      system: 'RNDS',
      submissionId: 'RNDS-STUB-TEST-001',
      status: 'STUB_OK',
      protocolNumber: 'RNDS-STUB-TEST-001',
      errors: [],
      note: 'Test mock',
    }),
    getImmunizations: jest.fn().mockResolvedValue({
      immunizations: [],
      note: 'Test mock',
    }),
  };
}

// ─── Test Data Factories ─────────────────────────────────────────────────────

/** Creates a realistic test patient matching prisma-seed-data.json */
export function createTestPatient(overrides?: Record<string, unknown>) {
  return {
    id: 'pat_test_01',
    firstName: 'João Carlos',
    lastName: 'da Silva',
    cpf: '12345678909',
    cns: '700501234567890',
    dateOfBirth: new Date('1959-04-15'),
    sex: 'M',
    phone: '+5511987654321',
    email: 'joao.silva@email.com',
    organizationId: 'org_holilabs_demo',
    whatsappConsentGiven: true,
    whatsappConsentDate: new Date(),
    smsEnabled: true,
    emailEnabled: true,
    ...overrides,
  };
}

/** Creates a test encounter */
export function createTestEncounter(overrides?: Record<string, unknown>) {
  return {
    id: 'enc_test_01',
    patientId: 'pat_test_01',
    clinicianId: 'user_dr_ricardo',
    organizationId: 'org_holilabs_demo',
    status: 'IN_PROGRESS',
    startTime: new Date(),
    endTime: null,
    reasonCode: 'I10',
    ...overrides,
  };
}

/** Creates a test invoice with line items */
export function createTestInvoice(overrides?: Record<string, unknown>) {
  return {
    id: 'inv_test_01',
    invoiceNumber: 'HLB-TEST-0001',
    patientId: 'pat_test_01',
    organizationId: 'org_holilabs_demo',
    createdById: 'user_billing_ana',
    status: 'PENDING',
    totalAmount: 250.00,
    dueDate: new Date(Date.now() + 30 * 86400000),
    lineItems: [
      { id: 'li_01', description: 'Consulta em consultório', tussCode: '10101012', cbhpmCode: '1.01.01.01-2', icd10Code: 'I10', quantity: 1, unitAmount: 250.00, amount: 250.00 },
    ],
    ...overrides,
  };
}

/** Creates a test conversation */
export function createTestConversation(overrides?: Record<string, unknown>) {
  return {
    id: 'conv_test_01',
    patientId: 'pat_test_01',
    organizationId: 'org_holilabs_demo',
    channelType: 'WHATSAPP',
    status: 'ACTIVE',
    lastMessageAt: new Date(),
    unreadCount: 0,
    ...overrides,
  };
}

/** Creates a test audit log entry */
export function createTestAuditEntry(overrides?: Record<string, unknown>) {
  return {
    id: 'audit_test_01',
    timestamp: new Date(),
    actionType: 'CREATE',
    userId: 'user_dr_ricardo',
    userName: 'Dr. Ricardo Mendes',
    entityType: 'Encounter',
    entityId: 'enc_test_01',
    accessReason: 'TREATMENT',
    dataHash: 'abc123def456',
    isPhiAccess: false,
    ...overrides,
  };
}

// ─── Request Helpers ─────────────────────────────────────────────────────────

/** Builds a mock NextRequest for API route testing */
export function createMockRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>
) {
  return {
    method,
    url: `http://localhost:3000${url}`,
    json: jest.fn().mockResolvedValue(body || {}),
    headers: {
      get: jest.fn().mockImplementation((name: string) => {
        const h: Record<string, string> = {
          'content-type': 'application/json',
          'x-access-reason': 'TREATMENT',
          ...headers,
        };
        return h[name.toLowerCase()] || null;
      }),
    },
    nextUrl: { searchParams: new URLSearchParams() },
  };
}

// ─── Assertion Helpers ───────────────────────────────────────────────────────

/** Verify ELENA invariant: result has sourceAuthority and citationUrl */
export function expectELENACompliant(result: Record<string, unknown>) {
  expect(result.sourceAuthority).toBeTruthy();
  expect(result.citationUrl).toBeTruthy();
  expect(typeof result.sourceAuthority).toBe('string');
  expect(typeof result.citationUrl).toBe('string');
  if (result.evidenceGrade) {
    expect(['A', 'B', 'C']).toContain(result.evidenceGrade);
  }
}

/** Verify CYRUS invariant: audit log was created */
export function expectAuditLogCreated(prismaMock: Record<string, unknown>, action: string) {
  const auditLog = prismaMock.auditLog as Record<string, jest.Mock>;
  expect(auditLog.create).toHaveBeenCalled();
  const call = auditLog.create.mock.calls[0][0];
  expect(call.data.actionType).toBe(action);
}

/** Verify RUTH invariant: no diagnostic language in patient-facing text */
export function expectSaMDSafe(text: string) {
  const forbidden = /\b(diagnos[ei]s?|detect[s]?|prevent[s]?|treat[s]?|cure[s]?|predict.*disease)\b/i;
  expect(text).not.toMatch(forbidden);
}
