/**
 * Agent Runtime — Core Type Definitions
 *
 * These are the contracts that all consumers (CLI 2, CLI 3, apps) depend on.
 * AI-engine agnostic: ZERO vendor-specific runtime dependencies.
 *
 * ARCHIE: AVI-001 — No `any` type in shared-kernel (use `unknown` + guards).
 * ELENA:  EVI-003 — Agent loop MUST NOT make clinical decisions. It routes tool calls.
 *                    CDSS rule engine is the ONLY authority for clinical logic.
 * CYRUS:  CVI-004 — AuditLog records are append-only.
 *         CVI-005 — Hash-chain integrity of audit trail is inviolable.
 */

// ─── Provider Configuration ─────────────────────────────────────────────────

export type AIProviderType =
  | 'claude' | 'openai' | 'gemini'
  | 'ollama' | 'vllm' | 'together'
  | 'groq' | 'cerebras' | 'mistral' | 'deepseek';

export interface ProviderConfig {
  type: AIProviderType;
  model: string;
  /** Provider-specific options (e.g., topP, topK, baseUrl). */
  options?: Record<string, unknown>;
}

// ─── Tool Definitions ───────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema describing the tool's parameters. */
  parameters: Record<string, unknown>;
}

/** A named set of tools available to an agent. */
export type ToolSet = ToolDefinition[];

// ─── Session Management ─────────────────────────────────────────────────────

export type SessionMode = 'new' | 'resume' | 'fork';

export interface SessionConfig {
  mode: SessionMode;
  /** Session ID to resume or fork from. Required when mode !== 'new'. */
  parentSessionId?: string;
  /** Redis key prefix for session storage. */
  namespace?: string;
  /** TTL in seconds for session data. Default: 3600 (1 hour). */
  ttlSeconds?: number;
}

// ─── Agent Constraints ──────────────────────────────────────────────────────

export interface AgentConstraints {
  /** Maximum total tokens (prompt + completion) per agent execution. */
  maxTokens?: number;
  /** Maximum number of tool calls before forced stop. */
  maxToolCalls?: number;
  /** Hard timeout in milliseconds for entire execution. */
  timeoutMs?: number;
  /** Maximum number of conversation turns (prompt → response cycles). */
  maxTurns?: number;
}

// ─── Token Usage ────────────────────────────────────────────────────────────

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ─── Encounter Memory ───────────────────────────────────────────────────────

/**
 * Lightweight pointer index for patient encounter context.
 *
 * ELENA: Memory is a HINT. Agent MUST verify all values against FHIR
 * before clinical use. CDSS rules engine is authoritative.
 */
export interface EncounterMemory {
  /** The encounter this memory belongs to. */
  encounterId: string;
  /** The patient this memory belongs to. */
  patientId: string;
  /** Pre-rendered markdown pointer index (~200 lines). */
  content: string;
  /** ISO timestamp when this memory was generated. */
  generatedAt: string;
  /** Per-section staleness TTLs in hours (from ELENA's MVD definitions). */
  stalenessTTLs: Record<string, number>;
}

// ─── Middleware ──────────────────────────────────────────────────────────────

export interface ToolContext {
  /** The tool call being processed. */
  toolCall: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
  /** The full agent request (for role/tenant/session context). */
  request: AgentRequest;
  /** Present only in 'post' phase — the result from tool execution. */
  toolResult?: {
    success: boolean;
    data: unknown;
    error?: string;
  };
}

export interface MiddlewareResult {
  /** If true, tool execution is blocked. */
  blocked: boolean;
  /** Reason for blocking — fed back to agent as denial feedback. */
  reason?: string;
  /** Suggested alternative action — e.g., "Escalate to CLINICIAN role". */
  suggestion?: string;
  /** De-id middleware can strip PII from input before forwarding. */
  mutatedInput?: Record<string, unknown>;
  /** Metadata to attach to audit entry (post-phase). */
  auditMetadata?: Record<string, unknown>;
}

export interface ToolMiddleware {
  /** 'pre' runs before tool execution; 'post' runs after. */
  phase: 'pre' | 'post';
  /** Middleware identifier: 'consent' | 'rbac' | 'deid' | 'audit' | 'cost'. */
  name: string;
  /** Execution priority within phase. Lower = runs first. Default: 100. */
  priority?: number;
  handler: (context: ToolContext) => Promise<MiddlewareResult>;
}

// ─── Sub-Agent Definitions ──────────────────────────────────────────────────

export interface AgentDefinition {
  /** Unique name for this sub-agent. */
  name: string;
  /** System prompt describing the sub-agent's role and constraints. */
  systemPrompt: string;
  /** Tools this sub-agent is allowed to use (capability scoping). */
  allowedTools: string[];
  /** Provider override (defaults to parent's provider). */
  provider?: ProviderConfig;
  /** Constraints override (defaults to parent's constraints). */
  constraints?: AgentConstraints;
}

// ─── Agent Request ──────────────────────────────────────────────────────────

export interface AgentRequest {
  /** The user/system prompt to process. */
  prompt: string;
  /** Which LLM provider + model to use. */
  provider: ProviderConfig;
  /** MCP tools available to this agent. */
  tools: ToolSet;
  /** Ordered middleware pipeline (consent, RBAC, audit, de-id, cost). */
  middleware: ToolMiddleware[];
  /** Capability-scoped child agents. */
  subagents?: AgentDefinition[];
  /** Session configuration (resume | fork | new). */
  session?: SessionConfig;
  /** Execution constraints (tokens, tool calls, timeout). */
  constraints?: AgentConstraints;
  /** ENCOUNTER_MEMORY context (patient/encounter pointer index). */
  memory?: EncounterMemory;
  /** System prompt (static rules, tool definitions, RBAC context). */
  systemPrompt?: string;
  /** Tenant/organization context for multi-tenant isolation. */
  tenantContext?: TenantContext;
}

// ─── Tenant Context (CYRUS: CVI-002, CVI-009) ──────────────────────────────

export interface TenantContext {
  organizationId: string;
  clinicianId: string;
  roles: string[];
  sessionId: string;
  agentId: string;
  /** Emergency break-glass override (2hr expiry, 3/24h rate limit). */
  emergencyOverride?: boolean;
  emergencyJustification?: string;
}

// ─── Agent Events (Streaming Output) ────────────────────────────────────────

export type AgentEvent =
  | AgentAssistantMessage
  | AgentToolCall
  | AgentToolResult
  | AgentToolBlocked
  | AgentSubagentStart
  | AgentSubagentResult
  | AgentError
  | AgentDone;

export interface AgentAssistantMessage {
  type: 'assistant_message';
  content: string;
  /** Chain-of-thought / thinking content (if provider supports it). */
  thinking?: string;
}

export interface AgentToolCall {
  type: 'tool_call';
  id: string;
  tool: string;
  input: Record<string, unknown>;
}

export interface AgentToolResult {
  type: 'tool_result';
  id: string;
  tool: string;
  result: unknown;
  success: boolean;
}

export interface AgentToolBlocked {
  type: 'tool_blocked';
  id: string;
  tool: string;
  /** Why the tool was blocked (e.g., "RBAC: NURSE role cannot prescribe"). */
  reason: string;
  /** Suggested alternative (e.g., "Request CLINICIAN to perform this action"). */
  suggestion?: string;
}

export interface AgentSubagentStart {
  type: 'subagent_start';
  agentName: string;
  parentToolUseId: string;
}

export interface AgentSubagentResult {
  type: 'subagent_result';
  agentName: string;
  result: string;
}

export interface AgentError {
  type: 'error';
  code: string;
  message: string;
}

export interface AgentDone {
  type: 'done';
  result: string;
  usage: TokenUsage;
}

// ─── Agent Runtime Interface ────────────────────────────────────────────────

/**
 * The universal agent loop — works with ANY LLM provider.
 *
 * Returns an AsyncIterable of AgentEvents, enabling streaming consumption:
 *
 * ```ts
 * for await (const event of runtime.execute(request)) {
 *   switch (event.type) {
 *     case 'assistant_message': handleMessage(event); break;
 *     case 'tool_call':         handleToolCall(event); break;
 *     case 'tool_blocked':      handleDenial(event); break;
 *     case 'done':              handleComplete(event); break;
 *   }
 * }
 * ```
 */
export interface AgentRuntime {
  execute(request: AgentRequest): AsyncIterable<AgentEvent>;
}

// ─── Chat Provider Interface (Runtime-Internal) ─────────────────────────────

/**
 * Minimal interface that the agent runtime requires from a chat provider.
 * Maps 1:1 to existing AIProviderV2.chat() contract.
 */
export interface ChatProvider {
  chat(request: ChatProviderRequest): Promise<ChatProviderResponse>;
}

export interface ChatProviderRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: ToolDefinition[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
}

export interface ChatProviderResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  usage: TokenUsage;
  model: string;
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}

// ─── Tool Executor Interface ────────────────────────────────────────────────

/**
 * Abstraction over MCP registry execution. Decouples the agent loop
 * from the specific tool registry implementation.
 */
export interface ToolExecutor {
  execute(request: {
    tool: string;
    input: Record<string, unknown>;
    tenantContext: TenantContext;
  }): Promise<{
    success: boolean;
    data: unknown;
    error?: string;
  }>;
}

// ─── Swarm Types ────────────────────────────────────────────────────────────

export type SwarmMode =
  /** Wait for ALL sub-agents to complete. */
  | 'parallel'
  /** Return the first successful result. */
  | 'race'
  /** Require N of M sub-agents to agree. */
  | 'quorum';

export interface SwarmRequest {
  mode: SwarmMode;
  agents: AgentDefinition[];
  /** The prompt each sub-agent receives. */
  prompt: string;
  /** Parent's tenant context (each fork gets an isolated copy). */
  tenantContext: TenantContext;
  /** For quorum mode: minimum number of agreeing agents. Default: ceil(N/2). */
  quorumThreshold?: number;
  /** Per-agent timeout in milliseconds. */
  agentTimeoutMs?: number;
}

export interface SwarmResult {
  agentName: string;
  success: boolean;
  result: string;
  usage: TokenUsage;
  error?: string;
}

export interface SwarmOrchestrator {
  fork(
    parentContext: TenantContext,
    request: SwarmRequest,
  ): Promise<SwarmResult[]>;
}

// ─── Context Compression Types ──────────────────────────────────────────────

export interface CompactionConfig {
  /** Token threshold that triggers auto-compact. */
  tokenThreshold: number;
  /** Model context window size (for ratio calculation). */
  contextWindowSize: number;
  /** Categories that MUST NOT be compacted. */
  protectedCategories: Set<string>;
}

/** Default protected categories — never compact these. */
export const PROTECTED_COMPACTION_CATEGORIES = new Set([
  'cdss_result',
  'consent_decision',
  'audit_action',
  'clinical_finding',
  'patient_decision',
]);

// ─── Staleness TTLs (ELENA's MVD definitions) ──────────────────────────────

/**
 * Maximum acceptable age (in hours) for cached clinical data
 * before it MUST be re-fetched from FHIR source of truth.
 *
 * ELENA: EVI-004 — No imputed missing lab values. Show "—" or omit.
 */
export const STALENESS_TTL_HOURS: Record<string, number> = {
  cardiac_emergency: 6,
  renal: 72,
  metabolic: 168,
  hematology: 168,
  allergy: 720,       // 30 days — allergies change infrequently
  medication: 24,     // Active meds checked daily
  vitals: 24,
  care_plan: 168,
  demographics: 720,
};
