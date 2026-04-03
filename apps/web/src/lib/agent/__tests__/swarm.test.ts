/**
 * Swarm Orchestrator Contract Tests
 *
 * Validates capability-scoped sub-agent forking:
 * - Parallel mode: runs all, returns all
 * - Race mode: returns first success
 * - Quorum mode: requires N/M agreement
 * - Context isolation (CYRUS): each fork gets isolated tenant context
 * - Emergency override does NOT propagate
 */

import { createSwarmOrchestrator } from '@holi/shared-kernel/agent/swarm';
import type {
  AgentRuntime,
  AgentRequest,
  AgentEvent,
  AgentDefinition,
  TenantContext,
  TokenUsage,
} from '@holi/shared-kernel/agent/types';

function makeAgentDef(name: string): AgentDefinition {
  return {
    name,
    systemPrompt: `You are ${name}`,
    allowedTools: ['get_patient'],
  };
}

const PARENT_CONTEXT: TenantContext = {
  organizationId: 'org-1',
  clinicianId: 'doc-1',
  roles: ['CLINICIAN'],
  sessionId: 'sess-1',
  agentId: 'agent-1',
  emergencyOverride: true,
  emergencyJustification: 'Critical patient',
};

function mockRuntimeFactory(
  resultMap: Record<string, { content: string; success: boolean; error?: string }>,
) {
  return (agentDef: AgentDefinition): AgentRuntime => ({
    execute(_request: AgentRequest): AsyncIterable<AgentEvent> {
      const entry = resultMap[agentDef.name] ?? { content: 'default', success: true };
      return (async function* () {
        if (entry.content) {
          yield { type: 'assistant_message' as const, content: entry.content };
        }
        if (!entry.success && entry.error) {
          yield { type: 'error' as const, code: 'AGENT_ERROR', message: entry.error };
        }
        yield {
          type: 'done' as const,
          result: entry.content,
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } as TokenUsage,
        };
      })();
    },
  });
}

describe('Swarm Orchestrator', () => {
  describe('parallel mode', () => {
    it('runs all agents and returns all results', async () => {
      const orch = createSwarmOrchestrator(mockRuntimeFactory({
        ruth: { content: 'Legal OK', success: true },
        elena: { content: 'Clinical OK', success: true },
      }));

      const results = await orch.fork(PARENT_CONTEXT, {
        mode: 'parallel',
        agents: [makeAgentDef('ruth'), makeAgentDef('elena')],
        prompt: 'Check patient safety',
        tenantContext: PARENT_CONTEXT,
      });

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(results[0].agentName).toBe('ruth');
      expect(results[1].agentName).toBe('elena');
    });

    it('returns partial successes', async () => {
      const orch = createSwarmOrchestrator(mockRuntimeFactory({
        a: { content: 'OK', success: true },
        b: { content: '', success: false, error: 'Timeout' },
      }));

      const results = await orch.fork(PARENT_CONTEXT, {
        mode: 'parallel',
        agents: [makeAgentDef('a'), makeAgentDef('b')],
        prompt: 'test',
        tenantContext: PARENT_CONTEXT,
      });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('race mode', () => {
    it('returns at least one successful result', async () => {
      const orch = createSwarmOrchestrator(mockRuntimeFactory({
        fast: { content: 'Quick answer', success: true },
        slow: { content: 'Slow answer', success: true },
      }));

      const results = await orch.fork(PARENT_CONTEXT, {
        mode: 'race',
        agents: [makeAgentDef('fast'), makeAgentDef('slow')],
        prompt: 'Fastest wins',
        tenantContext: PARENT_CONTEXT,
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].success).toBe(true);
    });

    it('returns failures when no agent succeeds', async () => {
      const orch = createSwarmOrchestrator(mockRuntimeFactory({
        a: { content: '', success: false, error: 'Failed' },
        b: { content: '', success: false, error: 'Also failed' },
      }));

      const results = await orch.fork(PARENT_CONTEXT, {
        mode: 'race',
        agents: [makeAgentDef('a'), makeAgentDef('b')],
        prompt: 'test',
        tenantContext: PARENT_CONTEXT,
      });

      expect(results.every(r => !r.success)).toBe(true);
    });
  });

  describe('quorum mode', () => {
    it('succeeds when quorum threshold is met', async () => {
      const orch = createSwarmOrchestrator(mockRuntimeFactory({
        a: { content: 'Yes', success: true },
        b: { content: 'Yes', success: true },
        c: { content: '', success: false, error: 'Failed' },
      }));

      const results = await orch.fork(PARENT_CONTEXT, {
        mode: 'quorum',
        agents: [makeAgentDef('a'), makeAgentDef('b'), makeAgentDef('c')],
        prompt: 'Consensus check',
        tenantContext: PARENT_CONTEXT,
        quorumThreshold: 2,
      });

      const successful = results.filter(r => r.success);
      expect(successful.length).toBeGreaterThanOrEqual(2);
    });

    it('fails when quorum threshold is not met', async () => {
      const orch = createSwarmOrchestrator(mockRuntimeFactory({
        a: { content: 'Yes', success: true },
        b: { content: '', success: false, error: 'Failed' },
        c: { content: '', success: false, error: 'Failed' },
      }));

      const results = await orch.fork(PARENT_CONTEXT, {
        mode: 'quorum',
        agents: [makeAgentDef('a'), makeAgentDef('b'), makeAgentDef('c')],
        prompt: 'Consensus check',
        tenantContext: PARENT_CONTEXT,
        quorumThreshold: 2,
      });

      expect(results.every(r => !r.success)).toBe(true);
      expect(results[0].error).toContain('Quorum not reached');
    });

    it('defaults to ceil(N/2) threshold', async () => {
      const orch = createSwarmOrchestrator(mockRuntimeFactory({
        a: { content: 'Yes', success: true },
        b: { content: 'Yes', success: true },
        c: { content: '', success: false, error: 'Failed' },
      }));

      // 3 agents, default threshold = ceil(3/2) = 2
      const results = await orch.fork(PARENT_CONTEXT, {
        mode: 'quorum',
        agents: [makeAgentDef('a'), makeAgentDef('b'), makeAgentDef('c')],
        prompt: 'test',
        tenantContext: PARENT_CONTEXT,
      });

      const successful = results.filter(r => r.success);
      expect(successful.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('context isolation (CYRUS)', () => {
    it('each sub-agent gets isolated agentId and sessionId', async () => {
      const capturedContexts: TenantContext[] = [];

      const factory = (_agentDef: AgentDefinition): AgentRuntime => ({
        execute(request: AgentRequest): AsyncIterable<AgentEvent> {
          if (request.tenantContext) {
            capturedContexts.push(request.tenantContext);
          }
          return (async function* () {
            yield {
              type: 'done' as const,
              result: '',
              usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            };
          })();
        },
      });

      const orch = createSwarmOrchestrator(factory);
      await orch.fork(PARENT_CONTEXT, {
        mode: 'parallel',
        agents: [makeAgentDef('ruth'), makeAgentDef('elena')],
        prompt: 'test',
        tenantContext: PARENT_CONTEXT,
      });

      expect(capturedContexts).toHaveLength(2);
      expect(capturedContexts[0].agentId).toContain('ruth');
      expect(capturedContexts[1].agentId).toContain('elena');
      expect(capturedContexts[0].sessionId).toContain('ruth');
      expect(capturedContexts[1].sessionId).toContain('elena');
    });

    it('emergency override does NOT propagate to sub-agents', async () => {
      const capturedContexts: TenantContext[] = [];

      const factory = (_agentDef: AgentDefinition): AgentRuntime => ({
        execute(request: AgentRequest): AsyncIterable<AgentEvent> {
          if (request.tenantContext) capturedContexts.push(request.tenantContext);
          return (async function* () {
            yield {
              type: 'done' as const,
              result: '',
              usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            };
          })();
        },
      });

      const orch = createSwarmOrchestrator(factory);
      await orch.fork(PARENT_CONTEXT, {
        mode: 'parallel',
        agents: [makeAgentDef('sub1')],
        prompt: 'test',
        tenantContext: PARENT_CONTEXT,
      });

      expect(capturedContexts[0].emergencyOverride).toBe(false);
      expect(capturedContexts[0].emergencyJustification).toBeUndefined();
    });

    it('preserves organizationId and clinicianId from parent', async () => {
      const capturedContexts: TenantContext[] = [];

      const factory = (_agentDef: AgentDefinition): AgentRuntime => ({
        execute(request: AgentRequest): AsyncIterable<AgentEvent> {
          if (request.tenantContext) capturedContexts.push(request.tenantContext);
          return (async function* () {
            yield {
              type: 'done' as const,
              result: '',
              usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            };
          })();
        },
      });

      const orch = createSwarmOrchestrator(factory);
      await orch.fork(PARENT_CONTEXT, {
        mode: 'parallel',
        agents: [makeAgentDef('child')],
        prompt: 'test',
        tenantContext: PARENT_CONTEXT,
      });

      expect(capturedContexts[0].organizationId).toBe('org-1');
      expect(capturedContexts[0].clinicianId).toBe('doc-1');
    });
  });
});
