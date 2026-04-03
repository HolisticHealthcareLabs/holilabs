/**
 * Security Gate Tests — CYRUS-mandated security for external MCP calls
 *
 * Validates:
 * - RVI-003: Unapproved jurisdiction → rejected
 * - RVI-006: Input de-identification (no CPF, CNS, RG in output)
 * - CVI-002: Response filtered by tenant isolation
 * - CVI-005: Audit entry includes externalServerUrl and responseHash
 */

jest.mock('@/lib/deid/transcript-gate', () => ({
  deidentifyTranscriptOrThrow: jest.fn(async (text: string) => {
    return text
      .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '[CPF_REDACTED]')
      .replace(/CPF:\d{11}/g, 'CPF:[REDACTED]')
      .replace(/CNS:\d{15}/g, 'CNS:[REDACTED]')
      .replace(/RG:\d{9}/g, 'RG:[REDACTED]');
  }),
}));

jest.mock('@/lib/audit/write-audit-entry', () => ({
  writeAuditEntry: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/security/redact-phi', () => ({
  redactObject: jest.fn((obj: unknown) => obj),
}));

const { writeAuditEntry } = require('@/lib/audit/write-audit-entry') as {
  writeAuditEntry: jest.Mock;
};
const { deidentifyTranscriptOrThrow } = require('@/lib/deid/transcript-gate') as {
  deidentifyTranscriptOrThrow: jest.Mock;
};

const {
  registerApprovedServer,
  isServerApproved,
  deidentifyExternalInput,
  preCallSecurityCheck,
  postCallSecurityCheck,
  auditExternalToolCall,
  validateResponseTenantIsolation,
} = require('../security-gate') as typeof import('../security-gate');

type SecurityGateContext = import('../security-gate').SecurityGateContext;

const makeCtx = (): SecurityGateContext => ({
  tenantId: 'clinic-1',
  userId: 'doc-1',
  agentId: 'agent-1',
  sessionId: 'sess-1',
});

const MEDPLUM_CONFIG = {
  url: 'https://medplum.example.com/mcp',
  name: 'medplum',
  jurisdiction: 'BR',
  dpaReference: 'DPA-2026-001',
  approved: true,
};

describe('security-gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set deidentify mock (clearAllMocks wipes mockImplementation)
    (deidentifyTranscriptOrThrow as jest.Mock).mockImplementation(async (text: string) => {
      return text
        .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '[CPF_REDACTED]')
        .replace(/CPF:\d{11}/g, 'CPF:[REDACTED]')
        .replace(/CNS:\d{15}/g, 'CNS:[REDACTED]')
        .replace(/RG:\d{9}/g, 'RG:[REDACTED]');
    });
    // Re-register for each test since module state persists
    try {
      registerApprovedServer(MEDPLUM_CONFIG);
    } catch {
      // Already registered
    }
  });

  describe('registerApprovedServer', () => {
    it('registers an approved server', () => {
      const result = isServerApproved(MEDPLUM_CONFIG.url);
      expect(result.allowed).toBe(true);
    });

    it('rejects unapproved server registration', () => {
      expect(() =>
        registerApprovedServer({ ...MEDPLUM_CONFIG, url: 'https://bad.com', approved: false }),
      ).toThrow('unapproved');
    });

    it('rejects server without DPA reference (RUTH RVI-003)', () => {
      expect(() =>
        registerApprovedServer({ ...MEDPLUM_CONFIG, url: 'https://nodpa.com', dpaReference: '' }),
      ).toThrow('DPA/SCC');
    });
  });

  describe('isServerApproved', () => {
    it('allows approved server', () => {
      const result = isServerApproved(MEDPLUM_CONFIG.url);
      expect(result.allowed).toBe(true);
    });

    it('rejects unknown server (RVI-003)', () => {
      const result = isServerApproved('https://unknown-server.com/mcp');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('RVI-003');
      expect(result.reason).toContain('GOVERNANCE_EVENT');
    });
  });

  describe('deidentifyExternalInput', () => {
    it('strips CPF from input', async () => {
      const args = { query: 'Patient CPF:12345678901 lookup' };
      const result = await deidentifyExternalInput(args);
      expect(JSON.stringify(result)).not.toContain('12345678901');
      expect(JSON.stringify(result)).toContain('[REDACTED]');
    });

    it('strips CNS from input', async () => {
      const args = { note: 'CNS:123456789012345 registered' };
      const result = await deidentifyExternalInput(args);
      expect(JSON.stringify(result)).not.toContain('123456789012345');
    });

    it('strips RG from input', async () => {
      const args = { doc: 'RG:123456789 issued' };
      const result = await deidentifyExternalInput(args);
      expect(JSON.stringify(result)).not.toContain('123456789');
    });

    it('preserves non-PII data', async () => {
      const args = { query: 'list all medications', limit: 10 };
      const result = await deidentifyExternalInput(args);
      expect(result.query).toBe('list all medications');
      expect(result.limit).toBe(10);
    });
  });

  describe('validateResponseTenantIsolation', () => {
    it('allows response when tenantId is present', () => {
      const result = validateResponseTenantIsolation({ data: 'ok' }, 'clinic-1');
      expect(result.allowed).toBe(true);
    });

    it('blocks response when tenantId is missing (CVI-002)', () => {
      const result = validateResponseTenantIsolation({ data: 'ok' }, '');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('tenantId');
    });
  });

  describe('auditExternalToolCall', () => {
    it('writes audit entry with externalServerUrl and responseHash (CVI-005)', async () => {
      await auditExternalToolCall(
        'fhir_search',
        MEDPLUM_CONFIG.url,
        true,
        makeCtx(),
        { results: [{ id: 'p1' }] },
        120,
      );

      expect(writeAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'mcp.external.fhir_search',
          resourceType: 'EXTERNAL_MCP_TOOL_EXECUTION',
          metadata: expect.objectContaining({
            externalServerUrl: MEDPLUM_CONFIG.url,
            externalServerName: 'medplum',
            jurisdiction: 'BR',
            dpaReference: 'DPA-2026-001',
            tenantId: 'clinic-1',
            responseHash: expect.stringMatching(/^[a-f0-9]{64}$/),
            dataClassification: 'DEIDENTIFIED',
          }),
        }),
      );
    });

    it('includes error info on failure', async () => {
      await auditExternalToolCall(
        'fhir_search',
        MEDPLUM_CONFIG.url,
        false,
        makeCtx(),
        null,
        200,
        'Connection refused',
      );

      expect(writeAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'mcp.external.fhir_search.error',
          metadata: expect.objectContaining({
            success: false,
            error: 'Connection refused',
          }),
        }),
      );
    });
  });

  describe('preCallSecurityCheck', () => {
    it('allows call to approved server with de-identified args', async () => {
      const result = await preCallSecurityCheck(
        MEDPLUM_CONFIG.url,
        'fhir_search',
        { query: 'Patient CPF:12345678901' },
        makeCtx(),
      );

      expect(result.allowed).toBe(true);
      expect(result.deidentifiedArgs).toBeDefined();
      expect(JSON.stringify(result.deidentifiedArgs)).not.toContain('12345678901');
    });

    it('blocks call to unapproved server (RVI-003)', async () => {
      const result = await preCallSecurityCheck(
        'https://rogue-server.com/mcp',
        'some_tool',
        { data: 'test' },
        makeCtx(),
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('RVI-003');
    });

    it('blocks call if de-identification fails (RVI-006)', async () => {
      (deidentifyTranscriptOrThrow as jest.Mock).mockRejectedValueOnce(
        new Error('Presidio unavailable'),
      );

      const result = await preCallSecurityCheck(
        MEDPLUM_CONFIG.url,
        'fhir_search',
        { data: 'sensitive' },
        makeCtx(),
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('RVI-006');
    });
  });

  describe('postCallSecurityCheck', () => {
    it('audits successful call', async () => {
      await postCallSecurityCheck(
        MEDPLUM_CONFIG.url,
        'fhir_search',
        true,
        { patients: [] },
        makeCtx(),
        150,
      );

      expect(writeAuditEntry).toHaveBeenCalled();
    });

    it('audits failed call with error', async () => {
      await postCallSecurityCheck(
        MEDPLUM_CONFIG.url,
        'fhir_search',
        false,
        null,
        makeCtx(),
        300,
        'Timeout',
      );

      expect(writeAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: 'Timeout',
          }),
        }),
      );
    });
  });
});
