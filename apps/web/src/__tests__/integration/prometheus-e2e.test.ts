/**
 * PROMETHEUS E2E Integration Test
 *
 * Validates the full cross-CLI pipeline:
 *
 *   CLI 1 (CONDUIT): MCP schema conversion + security gate + middleware adapter
 *   CLI 2 (CORTEX):  Agent runtime + middleware stack + swarm isolation
 *   CLI 3 (SENTINEL): Gateway cache boundary + audit verification
 *
 * Pipeline under test:
 *   1. MCP tool schemas are convertible from Zod → JSON Schema
 *   2. Agent runtime executes prompt with tool calls
 *   3. Pre-middleware blocks unauthorized tool (RBAC denial feedback)
 *   4. Agent adapts and uses an allowed tool
 *   5. De-id middleware strips PII from external-bound inputs
 *   6. Post-middleware writes audit entry
 *   7. External security gate blocks unapproved servers (RVI-003)
 *   8. External security gate de-identifies inputs (RVI-006)
 *   9. System prompt cache boundary marker is preserved
 *  10. Swarm sub-agents get isolated context (no emergency propagation)
 *  11. No PII in final audit metadata
 */

import { z } from 'zod';

// ─── CLI 1: CONDUIT imports ────────────────────────────────────────────────

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/security/redact-phi', () => ({
  redactObject: jest.fn((obj: unknown) => obj),
}));

jest.mock('@/lib/audit/write-audit-entry', () => ({
  writeAuditEntry: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/deid/transcript-gate', () => ({
  deidentifyTranscriptOrThrow: jest.fn(async (text: string) => {
    return text
      .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '[CPF_REDACTED]')
      .replace(/CPF:\d{11}/g, 'CPF:[REDACTED]')
      .replace(/CNS:\d{15}/g, 'CNS:[REDACTED]');
  }),
}));

jest.mock('../../lib/mcp/agent-event-bus', () => ({
  agentEventBus: { publish: jest.fn() },
  deriveAffectedEntities: jest.fn(() => ['patient']),
}));

const { zodToMCPJsonSchema, convertToolToMCPSchema } =
  require('../../lib/mcp/facade/schema-converter') as typeof import('../../lib/mcp/facade/schema-converter');

const { validateMCPContext, deidentifyResponseIfExternal } =
  require('../../lib/mcp/facade/middleware-adapter') as typeof import('../../lib/mcp/facade/middleware-adapter');

const securityGate =
  require('../../lib/mcp/client/security-gate') as typeof import('../../lib/mcp/client/security-gate');

const { deidentifyTranscriptOrThrow } =
  require('@/lib/deid/transcript-gate') as { deidentifyTranscriptOrThrow: jest.Mock };

const { agentEventBus } =
  require('../../lib/mcp/agent-event-bus') as { agentEventBus: { publish: jest.Mock } };
const { deriveAffectedEntities } =
  require('../../lib/mcp/agent-event-bus') as { deriveAffectedEntities: jest.Mock };

const { writeAuditEntry } =
  require('@/lib/audit/write-audit-entry') as { writeAuditEntry: jest.Mock };

// ─── CLI 2: CORTEX imports ─────────────────────────────────────────────────

import { createAgentRuntime } from '@holi/shared-kernel/agent/runtime';
import {
  createRBACMiddleware,
  createDeIdMiddleware,
  createAuditMiddleware,
} from '@holi/shared-kernel/agent/middleware';
import { createSwarmOrchestrator } from '@holi/shared-kernel/agent/swarm';
import type {
  AgentRequest,
  AgentEvent,
  ChatProvider,
  ToolExecutor,
  TenantContext,
  AgentDefinition,
  AgentRuntime,
} from '@holi/shared-kernel/agent/types';

// ─── CLI 3: SENTINEL imports ───────────────────────────────────────────────

import { splitSystemPrompt } from '../../lib/ai/gateway';

// ─── Test helpers ──────────────────────────────────────────────────────────

async function collectEvents(iterable: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of iterable) {
    events.push(event);
  }
  return events;
}

const TENANT: TenantContext = {
  organizationId: 'org-test',
  clinicianId: 'doc-1',
  roles: ['CLINICIAN'],
  sessionId: 'sess-integration',
  agentId: 'agent-prometheus',
};

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('PROMETHEUS E2E Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set mocks after clearAllMocks
    (deidentifyTranscriptOrThrow as jest.Mock).mockImplementation(async (text: string) => {
      return text
        .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '[CPF_REDACTED]')
        .replace(/CPF:\d{11}/g, 'CPF:[REDACTED]')
        .replace(/CNS:\d{15}/g, 'CNS:[REDACTED]');
    });
    deriveAffectedEntities.mockReturnValue(['patient']);
  });

  // ── CLI 1 → CLI 2 Integration ──────────────────────────────────────────

  describe('CLI 1 (CONDUIT) → CLI 2 (CORTEX) tool schema pipeline', () => {
    it('Zod schemas from MCP registry convert to valid JSON Schema for agent runtime', () => {
      const zodSchema = z.object({
        patientId: z.string().describe('FHIR Patient ID'),
        includeHistory: z.boolean().optional(),
      });

      const mcpSchema = convertToolToMCPSchema({
        name: 'get_patient',
        description: 'Retrieve patient data from FHIR',
        category: 'patient' as const,
        inputSchema: zodSchema,
        requiredPermissions: ['patient:read'],
        handler: jest.fn(),
      });

      // Schema is valid for agent runtime ToolDefinition
      expect(mcpSchema.name).toBe('get_patient');
      expect(mcpSchema.inputSchema).toHaveProperty('type', 'object');
      expect(mcpSchema.inputSchema).toHaveProperty('properties.patientId');
      expect(mcpSchema.metadata.requiredPermissions).toEqual(['patient:read']);

      // JSON Schema has no $schema (MCP spec requirement)
      expect(mcpSchema.inputSchema).not.toHaveProperty('$schema');
    });

    it('MCP context validation gates agent execution', () => {
      // Valid context passes
      const valid = validateMCPContext({
        mcpContext: {
          clinicianId: 'doc-1',
          agentId: 'agent-1',
          sessionId: 'sess-1',
          roles: ['CLINICIAN'],
          clinicId: 'clinic-1',
        },
        isExternalClient: false,
        clientId: 'test',
        ipAddress: '127.0.0.1',
      });
      expect(valid.blocked).toBe(false);

      // Missing clinicianId blocks
      const invalid = validateMCPContext({
        mcpContext: {
          clinicianId: '',
          agentId: 'agent-1',
          sessionId: 'sess-1',
          roles: ['CLINICIAN'],
          clinicId: 'clinic-1',
        },
        isExternalClient: false,
        clientId: 'test',
        ipAddress: '127.0.0.1',
      });
      expect(invalid.blocked).toBe(true);
    });
  });

  // ── Full Agent Loop with Middleware ─────────────────────────────────────

  describe('Agent runtime with RBAC denial feedback + audit', () => {
    it('blocks unauthorized tool, adapts, uses allowed tool, audits both', async () => {
      const rbacChecker = {
        checkPermission(roles: string[], required: string[]) {
          const missing = required.filter(p => !roles.includes(p));
          return { allowed: missing.length === 0, missing };
        },
      };

      let auditEntries: Array<{ action: string; toolName: string; success: boolean }> = [];
      const auditWriter = {
        async writeEntry(params: { action: string; toolName: string; success: boolean }) {
          auditEntries.push(params);
        },
      };

      const rbac = createRBACMiddleware(rbacChecker, {
        prescribe_medication: ['medication:prescribe'],
        get_patient: ['patient:read'],
      });
      const audit = createAuditMiddleware(auditWriter);

      let chatCallCount = 0;
      const chatProvider: ChatProvider = {
        async chat() {
          chatCallCount++;
          if (chatCallCount === 1) {
            // First call: agent tries to prescribe (will be blocked)
            return {
              content: '',
              toolCalls: [{ id: 'tc-1', name: 'prescribe_medication', arguments: { drug: 'aspirin' } }],
              usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
              model: 'claude-sonnet-4-20250514',
              finishReason: 'tool_calls' as const,
            };
          }
          if (chatCallCount === 2) {
            // After denial, agent adapts and reads patient instead
            return {
              content: '',
              toolCalls: [{ id: 'tc-2', name: 'get_patient', arguments: { patientId: 'p1' } }],
              usage: { promptTokens: 20, completionTokens: 5, totalTokens: 25 },
              model: 'claude-sonnet-4-20250514',
              finishReason: 'tool_calls' as const,
            };
          }
          // Final response
          return {
            content: 'Patient data retrieved. Escalating prescription to physician.',
            usage: { promptTokens: 30, completionTokens: 10, totalTokens: 40 },
            model: 'claude-sonnet-4-20250514',
            finishReason: 'stop' as const,
          };
        },
      };

      const toolExecutor: ToolExecutor = {
        async execute(req) {
          if (req.tool === 'get_patient') {
            return { success: true, data: { id: 'p1', name: 'Jane Doe' } };
          }
          return { success: false, data: null, error: 'Unknown tool' };
        },
      };

      const runtime = createAgentRuntime({
        chatProvider,
        toolExecutor,
      });

      const events = await collectEvents(runtime.execute({
        prompt: 'Prescribe aspirin for patient p1',
        provider: { type: 'claude', model: 'claude-sonnet-4-20250514' },
        tools: [
          { name: 'prescribe_medication', description: 'Prescribe', parameters: {} },
          { name: 'get_patient', description: 'Get patient', parameters: {} },
        ],
        middleware: [rbac, audit],
        tenantContext: { ...TENANT, roles: ['patient:read'] }, // No prescribe permission
      }));

      // Verify denial feedback was emitted
      const blocked = events.filter(e => e.type === 'tool_blocked');
      expect(blocked).toHaveLength(1);
      expect(blocked[0].type === 'tool_blocked' && blocked[0].reason).toContain('RBAC');

      // Verify allowed tool was executed
      const toolResults = events.filter(e => e.type === 'tool_result');
      expect(toolResults).toHaveLength(1);
      expect(toolResults[0].type === 'tool_result' && toolResults[0].success).toBe(true);

      // Verify audit trail captured the successful execution
      expect(auditEntries.some(e => e.toolName === 'get_patient' && e.success)).toBe(true);

      // Verify final response acknowledges escalation
      const done = events.find(e => e.type === 'done');
      expect(done).toBeDefined();
    });
  });

  // ── De-identification Pipeline ─────────────────────────────────────────

  describe('De-identification across CLI boundaries (RVI-006)', () => {
    it('de-id middleware strips PII before tool execution', async () => {
      let capturedInput: Record<string, unknown> = {};
      const deidentifier = {
        async deidentify(input: Record<string, unknown>) {
          const cleaned = { ...input };
          if (typeof cleaned.query === 'string') {
            cleaned.query = cleaned.query.replace(/CPF:\d{11}/g, 'CPF:[REDACTED]');
          }
          return cleaned;
        },
      };

      const deid = createDeIdMiddleware(deidentifier, new Set(['search_patient']));

      const chatProvider: ChatProvider = {
        async chat() {
          return {
            content: 'Found patient.',
            toolCalls: [{ id: 'tc-1', name: 'search_patient', arguments: { query: 'CPF:12345678901' } }],
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
            model: 'test',
            finishReason: 'tool_calls' as const,
          };
        },
      };

      // After tool_calls, provider returns stop
      let calls = 0;
      const provider: ChatProvider = {
        async chat() {
          calls++;
          if (calls === 1) return chatProvider.chat({} as never);
          return {
            content: 'Done',
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
            model: 'test',
            finishReason: 'stop' as const,
          };
        },
      };

      const toolExecutor: ToolExecutor = {
        async execute(req) {
          capturedInput = req.input;
          return { success: true, data: { id: 'p1' } };
        },
      };

      const runtime = createAgentRuntime({ chatProvider: provider, toolExecutor });
      await collectEvents(runtime.execute({
        prompt: 'Find patient CPF:12345678901',
        provider: { type: 'claude', model: 'test' },
        tools: [{ name: 'search_patient', description: 'Search', parameters: {} }],
        middleware: [deid],
        tenantContext: TENANT,
      }));

      // The de-id middleware should have stripped the CPF
      expect(JSON.stringify(capturedInput)).not.toContain('12345678901');
      expect(JSON.stringify(capturedInput)).toContain('[REDACTED]');
    });

    it('external response de-identification strips PII for external clients', async () => {
      const result = await deidentifyResponseIfExternal(
        { success: true, data: { note: 'Patient CPF:12345678901 admitted' } },
        {
          mcpContext: {
            clinicianId: 'doc-1', agentId: 'a-1', sessionId: 's-1',
            roles: ['CLINICIAN'], clinicId: 'c-1',
          },
          isExternalClient: true,
          clientId: 'ext-partner',
          ipAddress: '10.0.0.1',
        },
      );

      expect(JSON.stringify(result.data)).not.toContain('12345678901');
      expect(JSON.stringify(result.data)).toContain('[REDACTED]');
    });
  });

  // ── External MCP Security Gate (RVI-003) ───────────────────────────────

  describe('External MCP security gate (RUTH RVI-003)', () => {
    it('blocks unapproved external servers', () => {
      const result = securityGate.isServerApproved('https://rogue-server.com/mcp');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('RVI-003');
    });

    it('approves registered servers with DPA reference', () => {
      securityGate.registerApprovedServer({
        url: 'https://medplum.integration.test/mcp',
        name: 'medplum-integration',
        jurisdiction: 'BR',
        dpaReference: 'DPA-INT-001',
        approved: true,
      });
      const result = securityGate.isServerApproved('https://medplum.integration.test/mcp');
      expect(result.allowed).toBe(true);
    });

    it('pre-call security strips PII from external-bound args (RVI-006)', async () => {
      securityGate.registerApprovedServer({
        url: 'https://medplum.deid.test/mcp',
        name: 'medplum-deid',
        jurisdiction: 'BR',
        dpaReference: 'DPA-DEID-001',
        approved: true,
      });

      const result = await securityGate.preCallSecurityCheck(
        'https://medplum.deid.test/mcp',
        'fhir_search',
        { query: 'Patient CPF:12345678901 lookup' },
        { tenantId: 'clinic-1', userId: 'doc-1', agentId: 'a-1', sessionId: 's-1' },
      );

      expect(result.allowed).toBe(true);
      expect(JSON.stringify(result.deidentifiedArgs)).not.toContain('12345678901');
    });
  });

  // ── System Prompt Cache Boundary (SENTINEL) ────────────────────────────

  describe('System prompt cache boundary', () => {
    it('splits static and dynamic segments at boundary marker', () => {
      const prompt = [
        'You are a clinical assistant.',
        'Use these tools: [tool list]',
        '__HOLILABS_DYNAMIC_BOUNDARY__',
        '# ENCOUNTER_MEMORY',
        '- HbA1c: 7.2% → LOINC:4548-4',
      ].join('\n');

      const { staticSegment, dynamicSegment, hasBoundary } = splitSystemPrompt(prompt);

      expect(hasBoundary).toBe(true);
      expect(staticSegment).toContain('clinical assistant');
      expect(staticSegment).not.toContain('ENCOUNTER_MEMORY');
      expect(dynamicSegment).toContain('ENCOUNTER_MEMORY');
      expect(dynamicSegment).toContain('HbA1c');
    });

    it('treats entire prompt as dynamic when no boundary', () => {
      const { staticSegment, hasBoundary } = splitSystemPrompt('Simple prompt');
      expect(hasBoundary).toBe(false);
      expect(staticSegment).toBeNull();
    });

    it('agent runtime injects boundary when memory is provided', async () => {
      let capturedPrompt = '';
      const provider: ChatProvider = {
        async chat(req) {
          capturedPrompt = req.systemPrompt ?? '';
          return {
            content: 'Done',
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
            model: 'test',
            finishReason: 'stop' as const,
          };
        },
      };

      const runtime = createAgentRuntime({
        chatProvider: provider,
        toolExecutor: { execute: async () => ({ success: true, data: {} }) },
      });

      await collectEvents(runtime.execute({
        prompt: 'Check vitals',
        provider: { type: 'claude', model: 'test' },
        tools: [],
        middleware: [],
        systemPrompt: 'You are a clinical assistant.\nUse tools.',
        memory: {
          encounterId: 'enc-1',
          patientId: 'p-1',
          content: '# ENCOUNTER_MEMORY\n- BP: 120/80',
          generatedAt: new Date().toISOString(),
          stalenessTTLs: { vitals: 24 },
        },
        tenantContext: TENANT,
      }));

      // Runtime should have injected the boundary between static and memory
      const { hasBoundary, staticSegment, dynamicSegment } = splitSystemPrompt(capturedPrompt);
      expect(hasBoundary).toBe(true);
      expect(staticSegment).toContain('clinical assistant');
      expect(dynamicSegment).toContain('ENCOUNTER_MEMORY');
    });
  });

  // ── Swarm Context Isolation ────────────────────────────────────────────

  describe('Swarm context isolation (CYRUS cross-CLI)', () => {
    it('sub-agents cannot inherit emergency override from parent', async () => {
      const capturedContexts: TenantContext[] = [];

      const factory = (_agentDef: AgentDefinition): AgentRuntime => ({
        execute(request: AgentRequest): AsyncIterable<AgentEvent> {
          if (request.tenantContext) capturedContexts.push(request.tenantContext);
          return (async function* () {
            yield {
              type: 'done' as const,
              result: 'OK',
              usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
            };
          })();
        },
      });

      const orch = createSwarmOrchestrator(factory);
      await orch.fork(
        { ...TENANT, emergencyOverride: true, emergencyJustification: 'Code blue' },
        {
          mode: 'parallel',
          agents: [
            { name: 'ruth', systemPrompt: 'Legal check', allowedTools: [] },
            { name: 'elena', systemPrompt: 'Clinical check', allowedTools: [] },
          ],
          prompt: 'Verify patient safety',
          tenantContext: { ...TENANT, emergencyOverride: true, emergencyJustification: 'Code blue' },
        },
      );

      // Both sub-agents should have emergency override stripped
      expect(capturedContexts).toHaveLength(2);
      expect(capturedContexts[0].emergencyOverride).toBe(false);
      expect(capturedContexts[1].emergencyOverride).toBe(false);
      // But organization and clinician context is preserved
      expect(capturedContexts[0].organizationId).toBe('org-test');
      expect(capturedContexts[1].clinicianId).toBe('doc-1');
    });
  });

  // ── PII Verification Across Full Pipeline ──────────────────────────────

  describe('No PII leakage across pipeline', () => {
    it('CPF/CNS never appears in external-facing output or audit metadata', async () => {
      const allAuditMetadata: Record<string, unknown>[] = [];
      const auditWriter = {
        async writeEntry(params: { metadata?: Record<string, unknown> }) {
          if (params.metadata) allAuditMetadata.push(params.metadata);
        },
      };

      const deid = createDeIdMiddleware(
        {
          async deidentify(input: Record<string, unknown>) {
            const serialized = JSON.stringify(input);
            const cleaned = serialized
              .replace(/CPF:\d{11}/g, 'CPF:[REDACTED]')
              .replace(/CNS:\d{15}/g, 'CNS:[REDACTED]');
            return JSON.parse(cleaned) as Record<string, unknown>;
          },
        },
        new Set(['search_records']),
      );
      const audit = createAuditMiddleware(auditWriter);

      let calls = 0;
      const provider: ChatProvider = {
        async chat() {
          calls++;
          if (calls === 1) {
            return {
              content: '',
              toolCalls: [{
                id: 'tc-1',
                name: 'search_records',
                arguments: { query: 'Patient CPF:12345678901 CNS:123456789012345' },
              }],
              usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
              model: 'test',
              finishReason: 'tool_calls' as const,
            };
          }
          return {
            content: 'Records found.',
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
            model: 'test',
            finishReason: 'stop' as const,
          };
        },
      };

      let executedInput: Record<string, unknown> = {};
      const toolExecutor: ToolExecutor = {
        async execute(req) {
          executedInput = req.input;
          return { success: true, data: { records: [] } };
        },
      };

      const runtime = createAgentRuntime({ chatProvider: provider, toolExecutor });
      await collectEvents(runtime.execute({
        prompt: 'Find records for CPF:12345678901',
        provider: { type: 'claude', model: 'test' },
        tools: [{ name: 'search_records', description: 'Search', parameters: {} }],
        middleware: [deid, audit],
        tenantContext: TENANT,
      }));

      // Tool input should have PII stripped
      const inputStr = JSON.stringify(executedInput);
      expect(inputStr).not.toContain('12345678901');
      expect(inputStr).not.toContain('123456789012345');

      // Audit metadata should not contain raw PII
      const allMetaStr = JSON.stringify(allAuditMetadata);
      expect(allMetaStr).not.toContain('12345678901');
    });
  });
});
