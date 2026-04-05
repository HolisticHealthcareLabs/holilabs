/**
 * Agent Runtime Contract Tests
 *
 * Validates the provider-agnostic agent loop:
 * - Prompt → provider.chat() → response flow
 * - Tool call execution with middleware pipeline
 * - Permission denial feedback (tool_blocked events)
 * - Constraint enforcement (maxTurns, maxToolCalls)
 * - System prompt assembly with ENCOUNTER_MEMORY boundary
 * - Session resume from session store
 */

import { createAgentRuntime } from '@holi/shared-kernel/agent/runtime';
import type { SessionStore } from '@holi/shared-kernel/agent/runtime';
import type {
  AgentRequest,
  AgentEvent,
  ChatProvider,
  ChatProviderResponse,
  ToolExecutor,
  ToolMiddleware,
  TenantContext,
} from '@holi/shared-kernel/agent/types';

async function collectEvents(iterable: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of iterable) {
    events.push(event);
  }
  return events;
}

function mockChatProvider(responses: ChatProviderResponse[]): ChatProvider {
  let callIndex = 0;
  return {
    async chat() {
      const response = responses[callIndex] ?? responses[responses.length - 1];
      callIndex++;
      return response;
    },
  };
}

function mockToolExecutor(
  results?: Record<string, { success: boolean; data: unknown; error?: string }>,
): ToolExecutor {
  return {
    async execute(req) {
      return results?.[req.tool] ?? { success: true, data: { ok: true } };
    },
  };
}

const TENANT_CTX: TenantContext = {
  organizationId: 'org-1',
  clinicianId: 'doc-1',
  roles: ['CLINICIAN'],
  sessionId: 'sess-1',
  agentId: 'agent-1',
};

function makeRequest(overrides: Partial<AgentRequest> = {}): AgentRequest {
  return {
    prompt: 'Hello',
    provider: { type: 'claude', model: 'claude-sonnet-4-20250514' },
    tools: [],
    middleware: [],
    tenantContext: TENANT_CTX,
    ...overrides,
  };
}

describe('Agent Runtime', () => {
  it('completes a simple prompt → response flow', async () => {
    const provider = mockChatProvider([{
      content: 'Hello, how can I help?',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      model: 'claude-sonnet-4-20250514',
      finishReason: 'stop',
    }]);

    const runtime = createAgentRuntime({
      chatProvider: provider,
      toolExecutor: mockToolExecutor(),
    });

    const events = await collectEvents(runtime.execute(makeRequest()));
    const messages = events.filter(e => e.type === 'assistant_message');
    const done = events.find(e => e.type === 'done');

    expect(messages).toHaveLength(1);
    expect(messages[0].type === 'assistant_message' && messages[0].content).toBe('Hello, how can I help?');
    expect(done).toBeDefined();
    expect(done!.type === 'done' && done!.usage.totalTokens).toBe(30);
  });

  it('executes tool calls and feeds results back to provider', async () => {
    const provider = mockChatProvider([
      {
        content: '',
        toolCalls: [{ id: 'tc-1', name: 'get_patient', arguments: { patientId: 'p1' } }],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        model: 'claude-sonnet-4-20250514',
        finishReason: 'tool_calls',
      },
      {
        content: 'Patient found.',
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
        model: 'claude-sonnet-4-20250514',
        finishReason: 'stop',
      },
    ]);

    const runtime = createAgentRuntime({
      chatProvider: provider,
      toolExecutor: mockToolExecutor({ get_patient: { success: true, data: { name: 'Jane' } } }),
    });

    const events = await collectEvents(runtime.execute(makeRequest({
      tools: [{ name: 'get_patient', description: 'Get patient', parameters: {} }],
    })));

    const toolCalls = events.filter(e => e.type === 'tool_call');
    const toolResults = events.filter(e => e.type === 'tool_result');

    expect(toolCalls).toHaveLength(1);
    expect(toolResults).toHaveLength(1);
    expect(toolResults[0].type === 'tool_result' && toolResults[0].success).toBe(true);
  });

  it('emits tool_blocked when pre-middleware denies access', async () => {
    const blockingMiddleware: ToolMiddleware = {
      phase: 'pre',
      name: 'rbac',
      priority: 10,
      handler: async () => ({
        blocked: true,
        reason: 'RBAC: NURSE cannot prescribe',
        suggestion: 'Escalate to CLINICIAN',
      }),
    };

    const provider = mockChatProvider([
      {
        content: '',
        toolCalls: [{ id: 'tc-1', name: 'prescribe', arguments: { drug: 'aspirin' } }],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        model: 'claude-sonnet-4-20250514',
        finishReason: 'tool_calls',
      },
      {
        content: 'I need to escalate this.',
        usage: { promptTokens: 30, completionTokens: 10, totalTokens: 40 },
        model: 'claude-sonnet-4-20250514',
        finishReason: 'stop',
      },
    ]);

    const runtime = createAgentRuntime({
      chatProvider: provider,
      toolExecutor: mockToolExecutor(),
    });

    const events = await collectEvents(runtime.execute(makeRequest({
      middleware: [blockingMiddleware],
      tools: [{ name: 'prescribe', description: 'Prescribe', parameters: {} }],
    })));

    const blocked = events.filter(e => e.type === 'tool_blocked');
    expect(blocked).toHaveLength(1);
    expect(blocked[0].type === 'tool_blocked' && blocked[0].reason).toContain('NURSE cannot prescribe');
  });

  it('enforces maxTurns constraint', async () => {
    const provider = mockChatProvider([{
      content: '',
      toolCalls: [{ id: 'tc-1', name: 'loop_tool', arguments: {} }],
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
      model: 'claude-sonnet-4-20250514',
      finishReason: 'tool_calls',
    }]);

    const runtime = createAgentRuntime({
      chatProvider: provider,
      toolExecutor: mockToolExecutor(),
    });

    const events = await collectEvents(runtime.execute(makeRequest({
      constraints: { maxTurns: 3 },
      tools: [{ name: 'loop_tool', description: 'Loops', parameters: {} }],
    })));

    const errors = events.filter(e => e.type === 'error');
    expect(errors.some(e => e.type === 'error' && e.code === 'MAX_TURNS')).toBe(true);
  });

  it('enforces maxToolCalls constraint', async () => {
    let callCount = 0;
    const provider: ChatProvider = {
      async chat() {
        callCount++;
        return {
          content: '',
          toolCalls: [{ id: `tc-${callCount}`, name: 'repeat_tool', arguments: {} }],
          usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
          model: 'claude-sonnet-4-20250514',
          finishReason: 'tool_calls' as const,
        };
      },
    };

    const runtime = createAgentRuntime({
      chatProvider: provider,
      toolExecutor: mockToolExecutor(),
    });

    const events = await collectEvents(runtime.execute(makeRequest({
      constraints: { maxToolCalls: 2, maxTurns: 10 },
      tools: [{ name: 'repeat_tool', description: 'Repeats', parameters: {} }],
    })));

    const errors = events.filter(e => e.type === 'error');
    expect(errors.some(e => e.type === 'error' && e.code === 'TOOL_CALL_LIMIT')).toBe(true);
  });

  it('assembles system prompt with ENCOUNTER_MEMORY and dynamic boundary', async () => {
    let capturedSystemPrompt = '';
    const provider: ChatProvider = {
      async chat(req) {
        capturedSystemPrompt = req.systemPrompt ?? '';
        return {
          content: 'Done',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          model: 'claude-sonnet-4-20250514',
          finishReason: 'stop' as const,
        };
      },
    };

    const runtime = createAgentRuntime({
      chatProvider: provider,
      toolExecutor: mockToolExecutor(),
    });

    await collectEvents(runtime.execute(makeRequest({
      systemPrompt: 'You are a clinical assistant.',
      memory: {
        encounterId: 'enc-1',
        patientId: 'p-1',
        content: '# ENCOUNTER_MEMORY\n- HbA1c: 7.2%',
        generatedAt: '2026-04-01T00:00:00Z',
        stalenessTTLs: { metabolic: 168 },
      },
    })));

    expect(capturedSystemPrompt).toContain('You are a clinical assistant.');
    expect(capturedSystemPrompt).toContain('__HOLILABS_DYNAMIC_BOUNDARY__');
    expect(capturedSystemPrompt).toContain('ENCOUNTER_MEMORY');
  });

  it('resumes session from session store', async () => {
    let capturedMessages: Array<{ role: string; content: string }> = [];
    const provider: ChatProvider = {
      async chat(req) {
        capturedMessages = (req.messages ?? []) as Array<{ role: string; content: string }>;
        return {
          content: 'Continuing...',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          model: 'claude-sonnet-4-20250514',
          finishReason: 'stop' as const,
        };
      },
    };

    const sessionStore: SessionStore = {
      async save() {},
      async load(sessionId) {
        if (sessionId === 'prev-session') {
          return [
            { role: 'user' as const, content: 'Previous question' },
            { role: 'assistant' as const, content: 'Previous answer' },
          ];
        }
        return null;
      },
      async delete() {},
    };

    const runtime = createAgentRuntime({
      chatProvider: provider,
      toolExecutor: mockToolExecutor(),
      sessionStore,
    });

    await collectEvents(runtime.execute(makeRequest({
      prompt: 'Follow-up question',
      session: { mode: 'resume', parentSessionId: 'prev-session' },
    })));

    expect(capturedMessages).toHaveLength(3);
    expect(capturedMessages[0].content).toBe('Previous question');
    expect(capturedMessages[2].content).toBe('Follow-up question');
  });

  it('runs post-middleware after tool execution', async () => {
    let auditCalled = false;
    const auditMiddleware: ToolMiddleware = {
      phase: 'post',
      name: 'audit',
      priority: 10,
      handler: async (ctx) => {
        auditCalled = true;
        expect(ctx.toolResult).toBeDefined();
        return { blocked: false };
      },
    };

    const provider = mockChatProvider([
      {
        content: '',
        toolCalls: [{ id: 'tc-1', name: 'get_data', arguments: {} }],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        model: 'claude-sonnet-4-20250514',
        finishReason: 'tool_calls',
      },
      {
        content: 'Got it.',
        usage: { promptTokens: 20, completionTokens: 5, totalTokens: 25 },
        model: 'claude-sonnet-4-20250514',
        finishReason: 'stop',
      },
    ]);

    const runtime = createAgentRuntime({
      chatProvider: provider,
      toolExecutor: mockToolExecutor(),
    });

    await collectEvents(runtime.execute(makeRequest({
      middleware: [auditMiddleware],
      tools: [{ name: 'get_data', description: 'Get data', parameters: {} }],
    })));

    expect(auditCalled).toBe(true);
  });
});
