/**
 * Middleware Adapter Tests
 *
 * Validates the MCP facade middleware pipeline:
 * - Context validation (auth, roles, sessionId)
 * - Audit entry creation with hash-chain
 * - Governance event emission
 * - De-identification for external clients
 */

jest.mock('@/lib/audit/write-audit-entry', () => ({
  writeAuditEntry: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/deid/transcript-gate', () => ({
  deidentifyTranscriptOrThrow: jest.fn(async (text: string) => {
    return text.replace(/CPF:\d{11}/g, 'CPF:[REDACTED]');
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/security/redact-phi', () => ({
  redactObject: jest.fn((obj: unknown) => obj),
}));

jest.mock('../../agent-event-bus', () => ({
  agentEventBus: {
    publish: jest.fn(),
  },
  deriveAffectedEntities: jest.fn(() => ['patient']),
}));

const { writeAuditEntry } = require('@/lib/audit/write-audit-entry') as {
  writeAuditEntry: jest.Mock;
};
const { deidentifyTranscriptOrThrow } = require('@/lib/deid/transcript-gate') as {
  deidentifyTranscriptOrThrow: jest.Mock;
};
const { agentEventBus } = require('../../agent-event-bus') as {
  agentEventBus: { publish: jest.Mock };
};

const {
  validateMCPContext,
  auditToolExecution,
  emitGovernanceEvent,
  deidentifyResponseIfExternal,
  executeWithMiddleware,
} = require('../middleware-adapter') as typeof import('../middleware-adapter');

type MCPMiddlewareContext = import('../middleware-adapter').MCPMiddlewareContext;

function makeCtx(overrides: Partial<MCPMiddlewareContext> = {}): MCPMiddlewareContext {
  return {
    mcpContext: {
      clinicianId: 'doc-1',
      agentId: 'agent-1',
      sessionId: 'sess-1',
      roles: ['CLINICIAN'],
      clinicId: 'clinic-1',
    },
    isExternalClient: false,
    clientId: 'test-client',
    ipAddress: '127.0.0.1',
    ...overrides,
  };
}

describe('middleware-adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set mocks (clearAllMocks wipes mockImplementation)
    (deidentifyTranscriptOrThrow as jest.Mock).mockImplementation(async (text: string) => {
      return text.replace(/CPF:\d{11}/g, 'CPF:[REDACTED]');
    });
    const { deriveAffectedEntities } = require('../../agent-event-bus') as {
      deriveAffectedEntities: jest.Mock;
    };
    deriveAffectedEntities.mockReturnValue(['patient']);
  });

  describe('validateMCPContext', () => {
    it('passes with valid context', () => {
      const result = validateMCPContext(makeCtx());
      expect(result.blocked).toBe(false);
    });

    it('blocks when clinicianId is missing', () => {
      const ctx = makeCtx();
      ctx.mcpContext.clinicianId = '';
      const result = validateMCPContext(ctx);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('clinicianId');
    });

    it('blocks when roles are empty', () => {
      const ctx = makeCtx();
      ctx.mcpContext.roles = [];
      const result = validateMCPContext(ctx);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('roles');
    });

    it('blocks when sessionId is missing', () => {
      const ctx = makeCtx();
      ctx.mcpContext.sessionId = '';
      const result = validateMCPContext(ctx);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('sessionId');
    });

    it('provides suggested action on block', () => {
      const ctx = makeCtx();
      ctx.mcpContext.clinicianId = '';
      const result = validateMCPContext(ctx);
      expect(result.suggestedAction).toBeTruthy();
    });
  });

  describe('auditToolExecution', () => {
    it('writes audit entry for successful execution', async () => {
      await auditToolExecution('get_patient', true, makeCtx(), 42);

      expect(writeAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'mcp.facade.get_patient',
          resourceType: 'MCP_TOOL_EXECUTION',
          userId: 'doc-1',
          actorType: 'AGENT',
          metadata: expect.objectContaining({
            toolName: 'get_patient',
            success: true,
            executionTimeMs: 42,
          }),
        }),
      );
    });

    it('writes error audit entry on failure', async () => {
      await auditToolExecution('get_patient', false, makeCtx(), 100, 'timeout');

      expect(writeAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'mcp.facade.get_patient.error',
          metadata: expect.objectContaining({
            success: false,
            error: 'timeout',
          }),
        }),
      );
    });

    it('includes external client info for external calls', async () => {
      const ctx = makeCtx({ isExternalClient: true, clientId: 'ext-client' });
      await auditToolExecution('get_patient', true, ctx, 50);

      expect(writeAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accessReason: expect.stringContaining('External MCP'),
          metadata: expect.objectContaining({
            isExternalClient: true,
            clientId: 'ext-client',
          }),
        }),
      );
    });
  });

  describe('emitGovernanceEvent', () => {
    it('publishes tool_completed event on success', () => {
      emitGovernanceEvent('get_patient', 'patient', true, makeCtx());

      expect(agentEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tool_completed',
          tool: 'get_patient',
          category: 'patient',
          success: true,
          clinicianId: 'doc-1',
        }),
      );
    });

    it('publishes tool_failed event on failure', () => {
      emitGovernanceEvent('get_patient', 'patient', false, makeCtx());

      expect(agentEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tool_failed',
          success: false,
        }),
      );
    });
  });

  describe('deidentifyResponseIfExternal', () => {
    it('returns raw result for internal clients', async () => {
      const result = { success: true, data: { cpf: 'CPF:12345678901' } };
      const ctx = makeCtx({ isExternalClient: false });

      const output = await deidentifyResponseIfExternal(result, ctx);
      expect(output.data.cpf).toBe('CPF:12345678901');
      expect(deidentifyTranscriptOrThrow).not.toHaveBeenCalled();
    });

    it('de-identifies result for external clients', async () => {
      const result = { success: true, data: { cpf: 'CPF:12345678901' } };
      const ctx = makeCtx({ isExternalClient: true });

      const output = await deidentifyResponseIfExternal(result, ctx);
      expect(output.data.cpf).toBe('CPF:[REDACTED]');
    });

    it('blocks response entirely if de-id fails for external client (RVI-006)', async () => {
      (deidentifyTranscriptOrThrow as jest.Mock).mockRejectedValueOnce(new Error('Presidio down'));
      const result = { success: true, data: { name: 'test' } };
      const ctx = makeCtx({ isExternalClient: true });

      const output = await deidentifyResponseIfExternal(result, ctx);
      expect(output.success).toBe(false);
      expect(output.data).toBeNull();
      expect(output.error).toContain('RVI-006');
    });

    it('passes through null data without calling de-id', async () => {
      const result = { success: true, data: null };
      const ctx = makeCtx({ isExternalClient: true });

      const output = await deidentifyResponseIfExternal(result, ctx);
      expect(output.data).toBeNull();
      expect(deidentifyTranscriptOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('executeWithMiddleware', () => {
    it('blocks execution when context is invalid', async () => {
      const ctx = makeCtx();
      ctx.mcpContext.clinicianId = '';

      const response = await executeWithMiddleware(
        'get_patient',
        'patient',
        jest.fn(),
        ctx,
      );

      expect(response.success).toBe(false);
      expect(response.result.error).toContain('clinicianId');
    });

    it('executes tool and emits audit + governance on success', async () => {
      const executeFn = jest.fn().mockResolvedValue({
        tool: 'get_patient',
        success: true,
        result: { success: true, data: { id: 'p1' } },
        executionTimeMs: 50,
        timestamp: new Date().toISOString(),
      });

      const response = await executeWithMiddleware(
        'get_patient',
        'patient',
        executeFn,
        makeCtx(),
      );

      expect(response.success).toBe(true);
      expect(agentEventBus.publish).toHaveBeenCalled();
      // Audit is fire-and-forget; give it a tick
      await new Promise((r) => setTimeout(r, 10));
      expect(writeAuditEntry).toHaveBeenCalled();
    });

    it('handles execution errors gracefully', async () => {
      const executeFn = jest.fn().mockRejectedValue(new Error('DB down'));

      const response = await executeWithMiddleware(
        'get_patient',
        'patient',
        executeFn,
        makeCtx(),
      );

      expect(response.success).toBe(false);
      expect(response.result.error).toBe('DB down');
    });
  });
});
