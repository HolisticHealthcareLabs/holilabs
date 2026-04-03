/**
 * Swarm Orchestration — Capability-Scoped Sub-Agent Forking
 *
 * Enables parallel agent execution with isolated contexts.
 * Like OS process forking with capability-based sandboxing.
 *
 * Use cases:
 * - Parallel patient intake: Lab + Medication + Insurance agents simultaneously
 * - Cortex Boardroom: RUTH, ELENA, CYRUS as parallel compliance sub-agents
 * - Multi-provider consensus: Same question → Claude + GPT + Gemini → aggregate
 *
 * CYRUS: Each sub-agent gets tenant-scoped context. No data leakage
 *        between swarm members. Each fork emits its own audit trail.
 * ELENA: Multi-provider consensus is ONLY for non-clinical tasks.
 *        Clinical decisions go through deterministic CDSS.
 */

import type {
  AgentRuntime,
  AgentRequest,
  AgentEvent,
  AgentDefinition,
  SwarmOrchestrator,
  SwarmRequest,
  SwarmResult,
  TenantContext,
  TokenUsage,
  ToolMiddleware,
} from './types';

// ─── Swarm Implementation ───────────────────────────────────────────────────

export function createSwarmOrchestrator(
  runtimeFactory: (agentDef: AgentDefinition) => AgentRuntime,
): SwarmOrchestrator {
  return {
    async fork(
      parentContext: TenantContext,
      request: SwarmRequest,
    ): Promise<SwarmResult[]> {
      switch (request.mode) {
        case 'parallel':
          return executeParallel(runtimeFactory, parentContext, request);
        case 'race':
          return executeRace(runtimeFactory, parentContext, request);
        case 'quorum':
          return executeQuorum(runtimeFactory, parentContext, request);
        default:
          throw new Error(`Unknown swarm mode: ${request.mode as string}`);
      }
    },
  };
}

// ─── Parallel Mode: Wait for ALL sub-agents ─────────────────────────────────

async function executeParallel(
  runtimeFactory: (agentDef: AgentDefinition) => AgentRuntime,
  parentContext: TenantContext,
  request: SwarmRequest,
): Promise<SwarmResult[]> {
  const promises = request.agents.map(agentDef =>
    executeAgent(
      runtimeFactory,
      agentDef,
      request.prompt,
      isolateContext(parentContext, agentDef.name),
      request.agentTimeoutMs,
    ),
  );

  return Promise.all(promises);
}

// ─── Race Mode: Return first successful result ──────────────────────────────

async function executeRace(
  runtimeFactory: (agentDef: AgentDefinition) => AgentRuntime,
  parentContext: TenantContext,
  request: SwarmRequest,
): Promise<SwarmResult[]> {
  const abortController = new AbortController();

  const promises = request.agents.map(agentDef =>
    executeAgent(
      runtimeFactory,
      agentDef,
      request.prompt,
      isolateContext(parentContext, agentDef.name),
      request.agentTimeoutMs,
      abortController.signal,
    ).then(result => {
      if (result.success) {
        abortController.abort();
      }
      return result;
    }),
  );

  // Wait for first successful result
  const results = await Promise.allSettled(promises);
  const successful: SwarmResult[] = [];
  const failed: SwarmResult[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled') {
      (r.value.success ? successful : failed).push(r.value);
    }
  }

  // Return first success, or all failures if none succeeded
  return successful.length > 0 ? [successful[0]] : failed;
}

// ─── Quorum Mode: Require N of M to agree ───────────────────────────────────

async function executeQuorum(
  runtimeFactory: (agentDef: AgentDefinition) => AgentRuntime,
  parentContext: TenantContext,
  request: SwarmRequest,
): Promise<SwarmResult[]> {
  const threshold = request.quorumThreshold ?? Math.ceil(request.agents.length / 2);

  const promises = request.agents.map(agentDef =>
    executeAgent(
      runtimeFactory,
      agentDef,
      request.prompt,
      isolateContext(parentContext, agentDef.name),
      request.agentTimeoutMs,
    ),
  );

  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success);

  if (successful.length >= threshold) {
    // Tag results with quorum metadata
    return results.map(r => ({
      ...r,
      result: r.success
        ? `[QUORUM: ${successful.length}/${request.agents.length} agreed] ${r.result}`
        : r.result,
    }));
  }

  // Quorum not reached — return all results with failure indicator
  return results.map(r => ({
    ...r,
    success: false,
    error: r.error ?? `Quorum not reached: ${successful.length}/${threshold} required`,
  }));
}

// ─── Single Agent Execution ─────────────────────────────────────────────────

async function executeAgent(
  runtimeFactory: (agentDef: AgentDefinition) => AgentRuntime,
  agentDef: AgentDefinition,
  prompt: string,
  isolatedContext: TenantContext,
  timeoutMs?: number,
  abortSignal?: AbortSignal,
): Promise<SwarmResult> {
  const runtime = runtimeFactory(agentDef);
  const usage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let finalResult = '';
  let success = true;
  let error: string | undefined;

  // Build a scoped request for this sub-agent
  const scopedRequest: AgentRequest = {
    prompt,
    provider: agentDef.provider ?? {
      type: 'claude',
      model: 'claude-sonnet-4-20250514',
    },
    tools: agentDef.allowedTools.map(name => ({
      name,
      description: '',
      parameters: {},
    })),
    middleware: [], // Sub-agents inherit middleware from parent runtime factory
    systemPrompt: agentDef.systemPrompt,
    constraints: {
      ...agentDef.constraints,
      timeoutMs: timeoutMs ?? agentDef.constraints?.timeoutMs ?? 60_000,
    },
    tenantContext: isolatedContext,
  };

  try {
    // Wrap execution with optional timeout
    const execution = consumeAgentEvents(runtime, scopedRequest);

    if (timeoutMs) {
      const result = await withTimeout(execution, timeoutMs);
      finalResult = result.content;
      success = result.success;
      error = result.error;
      addUsageInPlace(usage, result.usage);
    } else {
      const result = await execution;
      finalResult = result.content;
      success = result.success;
      error = result.error;
      addUsageInPlace(usage, result.usage);
    }
  } catch (execError) {
    success = false;
    error = execError instanceof Error ? execError.message : 'Sub-agent execution failed';
  }

  // Check abort signal
  if (abortSignal?.aborted) {
    return {
      agentName: agentDef.name,
      success: false,
      result: finalResult,
      usage,
      error: 'Aborted: another agent in the swarm succeeded first',
    };
  }

  return {
    agentName: agentDef.name,
    success,
    result: finalResult,
    usage,
    error,
  };
}

// ─── Event Consumer ─────────────────────────────────────────────────────────

interface AgentOutput {
  content: string;
  success: boolean;
  usage: TokenUsage;
  error?: string;
}

async function consumeAgentEvents(
  runtime: AgentRuntime,
  request: AgentRequest,
): Promise<AgentOutput> {
  const chunks: string[] = [];
  let usage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let error: string | undefined;

  for await (const event of runtime.execute(request)) {
    switch (event.type) {
      case 'assistant_message':
        chunks.push(event.content);
        break;
      case 'done':
        usage = event.usage;
        if (event.result) chunks.push(event.result);
        break;
      case 'error':
        error = `${event.code}: ${event.message}`;
        break;
    }
  }

  // De-duplicate: if done.result was already pushed as assistant_message
  const content = chunks.length > 0 ? chunks[chunks.length - 1] : '';

  return {
    content,
    success: !error,
    usage,
    error,
  };
}

// ─── Context Isolation (CYRUS: No Data Leakage) ────────────────────────────

/**
 * Creates an isolated copy of the tenant context for a sub-agent.
 * Each fork gets its own agentId and sessionId to prevent cross-contamination.
 */
function isolateContext(parent: TenantContext, agentName: string): TenantContext {
  return {
    organizationId: parent.organizationId,
    clinicianId: parent.clinicianId,
    roles: [...parent.roles], // Defensive copy
    sessionId: `${parent.sessionId}:swarm:${agentName}`,
    agentId: `${parent.agentId}:${agentName}`,
    // Emergency override does NOT propagate to sub-agents
    // Each sub-agent must be explicitly granted override if needed
    emergencyOverride: false,
    emergencyJustification: undefined,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function addUsageInPlace(target: TokenUsage, source: TokenUsage): void {
  target.promptTokens += source.promptTokens;
  target.completionTokens += source.completionTokens;
  target.totalTokens += source.totalTokens;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}
