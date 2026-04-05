/**
 * Agent Runtime — Public API
 *
 * Exports the provider-agnostic agent runtime, middleware factories,
 * swarm orchestration, and all core type definitions.
 */

// Types (re-export everything for consumers)
export type {
  AIProviderType,
  ProviderConfig,
  ToolDefinition,
  ToolSet,
  SessionMode,
  SessionConfig,
  AgentConstraints,
  TokenUsage,
  EncounterMemory,
  ToolContext,
  MiddlewareResult,
  ToolMiddleware,
  AgentDefinition,
  AgentRequest,
  TenantContext,
  AgentEvent,
  AgentAssistantMessage,
  AgentToolCall,
  AgentToolResult,
  AgentToolBlocked,
  AgentSubagentStart,
  AgentSubagentResult,
  AgentError,
  AgentDone,
  AgentRuntime,
  ChatProvider,
  ChatProviderRequest,
  ChatMessage,
  ChatProviderResponse,
  ToolExecutor,
  SwarmMode,
  SwarmRequest,
  SwarmResult,
  SwarmOrchestrator,
  CompactionConfig,
} from './types';

export {
  PROTECTED_COMPACTION_CATEGORIES,
  STALENESS_TTL_HOURS,
} from './types';

// Runtime
export { createAgentRuntime } from './runtime';
export type { AgentRuntimeConfig, SessionStore } from './runtime';

// Middleware
export {
  createRBACMiddleware,
  createConsentMiddleware,
  createDeIdMiddleware,
  createAuditMiddleware,
  createCostMiddleware,
  buildStandardMiddleware,
} from './middleware';

export type {
  RBACChecker,
  ConsentVerifier,
  DeIdentifier,
  AuditWriter,
  CostTracker,
  ToolPermissionMap,
  ToolConsentMap,
} from './middleware';

// Swarm
export { createSwarmOrchestrator } from './swarm';
