/**
 * Provider-Agnostic Agent Runtime
 *
 * The core agent loop that works with ANY LLM provider.
 * Inspired by Claude Agent SDK patterns, built without vendor dependency.
 *
 * Flow: prompt → provider.chat() → tool calls → pre-middleware →
 *       execute → post-middleware → tool results → back to provider → repeat
 *
 * ELENA: EVI-003 — This loop routes tool calls. It does NOT make clinical decisions.
 *        CDSS rule engine is the ONLY authority for clinical logic.
 * CYRUS: CVI-004 — AuditLog records append-only in middleware.
 *        CVI-005 — Hash-chain integrity preserved.
 * ARCHIE: AVI-003 — No nondeterminism in Protocol Engine path.
 */

import type {
  AgentRuntime,
  AgentRequest,
  AgentEvent,
  ChatProvider,
  ChatMessage,
  ToolExecutor,
  ToolMiddleware,
  ToolContext,
  MiddlewareResult,
  TokenUsage,
  AgentConstraints,
  TenantContext,
} from './types';

// ─── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_CONSTRAINTS: Required<AgentConstraints> = {
  maxTokens: 200_000,
  maxToolCalls: 50,
  timeoutMs: 120_000,
  maxTurns: 25,
};

// ─── Session Store Interface ────────────────────────────────────────────────

/**
 * Minimal session persistence interface. Implemented by Redis adapter
 * in the web app layer (not in shared-kernel to avoid infra dependency).
 */
export interface SessionStore {
  save(sessionId: string, messages: ChatMessage[], ttlSeconds: number): Promise<void>;
  load(sessionId: string): Promise<ChatMessage[] | null>;
  delete(sessionId: string): Promise<void>;
}

// ─── Runtime Factory ────────────────────────────────────────────────────────

export interface AgentRuntimeConfig {
  /** The chat provider to use for LLM calls. */
  chatProvider: ChatProvider;
  /** The tool executor (MCP registry wrapper). */
  toolExecutor: ToolExecutor;
  /** Optional session store for resume/fork. */
  sessionStore?: SessionStore;
}

/**
 * Create a provider-agnostic agent runtime.
 *
 * Usage:
 * ```ts
 * const runtime = createAgentRuntime({
 *   chatProvider: anthropicAdapter,
 *   toolExecutor: mcpRegistryExecutor,
 *   sessionStore: redisSessionStore,
 * });
 *
 * for await (const event of runtime.execute(request)) {
 *   // handle events
 * }
 * ```
 */
export function createAgentRuntime(config: AgentRuntimeConfig): AgentRuntime {
  return {
    execute(request: AgentRequest): AsyncIterable<AgentEvent> {
      return agentLoop(config, request);
    },
  };
}

// ─── Core Agent Loop ────────────────────────────────────────────────────────

async function* agentLoop(
  config: AgentRuntimeConfig,
  request: AgentRequest,
): AsyncGenerator<AgentEvent> {
  const constraints = resolveConstraints(request.constraints);
  const abortController = new AbortController();

  // Timeout guard
  const timeout = setTimeout(() => abortController.abort(), constraints.timeoutMs);

  try {
    // Load or initialize conversation history
    let messages = await initializeMessages(config, request);
    let totalUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let totalToolCalls = 0;
    let turns = 0;

    // Sort middleware by priority within each phase
    const preMiddleware = sortMiddleware(request.middleware.filter(m => m.phase === 'pre'));
    const postMiddleware = sortMiddleware(request.middleware.filter(m => m.phase === 'post'));

    while (turns < constraints.maxTurns) {
      if (abortController.signal.aborted) {
        yield { type: 'error', code: 'TIMEOUT', message: `Agent execution timed out after ${constraints.timeoutMs}ms` };
        break;
      }

      turns++;

      // ── Call provider ─────────────────────────────────────────────
      const providerResponse = await config.chatProvider.chat({
        messages,
        model: request.provider.model,
        systemPrompt: buildSystemPrompt(request),
        tools: request.tools,
        ...(request.provider.options ?? {}),
      });

      // Accumulate usage
      totalUsage = addUsage(totalUsage, providerResponse.usage);

      // Check token budget
      if (totalUsage.totalTokens > constraints.maxTokens) {
        yield { type: 'error', code: 'TOKEN_LIMIT', message: `Token limit exceeded: ${totalUsage.totalTokens} > ${constraints.maxTokens}` };
        break;
      }

      // Emit assistant message
      if (providerResponse.content) {
        yield { type: 'assistant_message', content: providerResponse.content };
      }

      // Append assistant message to history
      messages = [
        ...messages,
        { role: 'assistant' as const, content: providerResponse.content || '' },
      ];

      // ── No tool calls → done ──────────────────────────────────────
      if (providerResponse.finishReason !== 'tool_calls' || !providerResponse.toolCalls?.length) {
        // Persist session if configured
        await persistSession(config, request, messages);

        yield {
          type: 'done',
          result: providerResponse.content,
          usage: totalUsage,
        };
        return;
      }

      // ── Process tool calls ────────────────────────────────────────
      const toolMessages: ChatMessage[] = [];

      for (const toolCall of providerResponse.toolCalls) {
        if (totalToolCalls >= constraints.maxToolCalls) {
          yield {
            type: 'error',
            code: 'TOOL_CALL_LIMIT',
            message: `Tool call limit exceeded: ${totalToolCalls} >= ${constraints.maxToolCalls}`,
          };
          // Persist and exit
          await persistSession(config, request, messages);
          yield { type: 'done', result: providerResponse.content, usage: totalUsage };
          return;
        }

        totalToolCalls++;

        // Emit tool_call event
        yield {
          type: 'tool_call',
          id: toolCall.id,
          tool: toolCall.name,
          input: toolCall.arguments,
        };

        // ── Pre-middleware pipeline ──────────────────────────────────
        const preResult = await runPreMiddleware(
          preMiddleware,
          toolCall,
          request,
        );

        if (preResult.blocked) {
          // PERMISSION DENIAL FEEDBACK: Inject denial reason into conversation
          // so the agent adapts behavior (e.g., NURSE → escalate to CLINICIAN)
          yield {
            type: 'tool_blocked',
            id: toolCall.id,
            tool: toolCall.name,
            reason: preResult.reason ?? 'Access denied',
            suggestion: preResult.suggestion,
          };

          // Feed denial back as a tool result so LLM sees it
          toolMessages.push({
            role: 'tool',
            content: JSON.stringify({
              blocked: true,
              reason: preResult.reason,
              suggestion: preResult.suggestion,
            }),
            toolCallId: toolCall.id,
          });

          continue;
        }

        // Apply input mutations from middleware (e.g., de-id stripped PII)
        const effectiveInput = preResult.mutatedInput ?? toolCall.arguments;

        // ── Execute tool via MCP registry ────────────────────────────
        const tenantCtx = request.tenantContext ?? buildTenantContext(request);
        let toolResult: { success: boolean; data: unknown; error?: string };

        try {
          toolResult = await config.toolExecutor.execute({
            tool: toolCall.name,
            input: effectiveInput,
            tenantContext: tenantCtx,
          });
        } catch (execError) {
          const errorMsg = execError instanceof Error ? execError.message : 'Tool execution failed';
          toolResult = { success: false, data: null, error: errorMsg };
        }

        // Emit tool_result event
        yield {
          type: 'tool_result',
          id: toolCall.id,
          tool: toolCall.name,
          result: toolResult.data,
          success: toolResult.success,
        };

        // ── Post-middleware pipeline (audit, cost tracking) ──────────
        await runPostMiddleware(
          postMiddleware,
          toolCall,
          request,
          toolResult,
        );

        // Add tool result to conversation
        const resultContent = toolResult.success
          ? JSON.stringify(toolResult.data)
          : JSON.stringify({ error: toolResult.error });

        toolMessages.push({
          role: 'tool',
          content: resultContent,
          toolCallId: toolCall.id,
        });
      }

      // Append all tool results to history for next turn
      messages = [...messages, ...toolMessages];
    }

    // Max turns reached
    yield {
      type: 'error',
      code: 'MAX_TURNS',
      message: `Agent reached maximum turns: ${constraints.maxTurns}`,
    };
    await persistSession(config, request, messages);
    yield { type: 'done', result: '', usage: totalUsage };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Middleware Execution ────────────────────────────────────────────────────

function sortMiddleware(middleware: ToolMiddleware[]): ToolMiddleware[] {
  return [...middleware].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
}

async function runPreMiddleware(
  middleware: ToolMiddleware[],
  toolCall: { id: string; name: string; arguments: Record<string, unknown> },
  request: AgentRequest,
): Promise<MiddlewareResult> {
  let mutatedInput: Record<string, unknown> | undefined;

  for (const mw of middleware) {
    const context: ToolContext = {
      toolCall: {
        id: toolCall.id,
        name: toolCall.name,
        input: mutatedInput ?? toolCall.arguments,
      },
      request,
    };

    const result = await mw.handler(context);

    if (result.blocked) {
      return result;
    }

    // Accumulate input mutations (e.g., de-id middleware strips PII)
    if (result.mutatedInput) {
      mutatedInput = result.mutatedInput;
    }
  }

  return { blocked: false, mutatedInput };
}

async function runPostMiddleware(
  middleware: ToolMiddleware[],
  toolCall: { id: string; name: string; arguments: Record<string, unknown> },
  request: AgentRequest,
  toolResult: { success: boolean; data: unknown; error?: string },
): Promise<void> {
  for (const mw of middleware) {
    const context: ToolContext = {
      toolCall: {
        id: toolCall.id,
        name: toolCall.name,
        input: toolCall.arguments,
      },
      request,
      toolResult,
    };

    // Post-middleware should not block — it's for audit/cost tracking.
    // Errors are swallowed to avoid disrupting the agent loop.
    try {
      await mw.handler(context);
    } catch {
      // Post-middleware failure is non-fatal.
      // CVI-004: Audit writes use fire-and-forget buffer internally.
    }
  }
}

// ─── Session Management ─────────────────────────────────────────────────────

async function initializeMessages(
  config: AgentRuntimeConfig,
  request: AgentRequest,
): Promise<ChatMessage[]> {
  if (request.session?.mode === 'resume' && request.session.parentSessionId && config.sessionStore) {
    const existing = await config.sessionStore.load(request.session.parentSessionId);
    if (existing) {
      // Append new prompt to existing conversation
      return [...existing, { role: 'user' as const, content: request.prompt }];
    }
  }

  if (request.session?.mode === 'fork' && request.session.parentSessionId && config.sessionStore) {
    const existing = await config.sessionStore.load(request.session.parentSessionId);
    if (existing) {
      // Fork: copy history, append new prompt (does not mutate parent)
      return [...existing, { role: 'user' as const, content: request.prompt }];
    }
  }

  // New session or no store configured
  return [{ role: 'user' as const, content: request.prompt }];
}

async function persistSession(
  config: AgentRuntimeConfig,
  request: AgentRequest,
  messages: ChatMessage[],
): Promise<void> {
  if (!config.sessionStore || !request.session) return;

  const sessionId = request.session.mode === 'resume' && request.session.parentSessionId
    ? request.session.parentSessionId
    : generateSessionId(request);

  const ttl = request.session.ttlSeconds ?? 3600;
  await config.sessionStore.save(sessionId, messages, ttl);
}

// ─── System Prompt Assembly ─────────────────────────────────────────────────

function buildSystemPrompt(request: AgentRequest): string {
  const parts: string[] = [];

  if (request.systemPrompt) {
    parts.push(request.systemPrompt);
  }

  // Inject ENCOUNTER_MEMORY as context hint
  if (request.memory) {
    parts.push('');
    parts.push('__HOLILABS_DYNAMIC_BOUNDARY__');
    parts.push('');
    parts.push(request.memory.content);
  }

  return parts.join('\n');
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveConstraints(overrides?: AgentConstraints): Required<AgentConstraints> {
  return {
    maxTokens: overrides?.maxTokens ?? DEFAULT_CONSTRAINTS.maxTokens,
    maxToolCalls: overrides?.maxToolCalls ?? DEFAULT_CONSTRAINTS.maxToolCalls,
    timeoutMs: overrides?.timeoutMs ?? DEFAULT_CONSTRAINTS.timeoutMs,
    maxTurns: overrides?.maxTurns ?? DEFAULT_CONSTRAINTS.maxTurns,
  };
}

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

function buildTenantContext(request: AgentRequest): TenantContext {
  return {
    organizationId: '',
    clinicianId: '',
    roles: [],
    sessionId: '',
    agentId: 'agent-runtime',
    ...(request.tenantContext ?? {}),
  };
}

function generateSessionId(request: AgentRequest): string {
  const prefix = request.session?.namespace ?? 'agent-session';
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}:${ts}-${rand}`;
}
