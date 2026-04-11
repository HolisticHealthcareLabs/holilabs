/**
 * Health 3.0 Orchestrator — Core Type Definitions
 *
 * Types used across the orchestration layer: pathway definitions,
 * event handler contracts, health graph queries.
 */

import type { ClinicalEvent } from '@holi/event-bus';

// ---------------------------------------------------------------------------
// Pathway Types
// ---------------------------------------------------------------------------

export interface PathwayStepDefinition {
  stepId: string;
  name: string;
  description: string;
  entryCriteria: Record<string, unknown>;   // JSON-Logic
  expectedOutcome?: Record<string, unknown>; // JSON-Logic
  timeoutDays: number;
  escalationRules?: EscalationRule[];
  branches?: PathwayBranch[];
  isTerminal?: boolean;
}

export interface PathwayBranch {
  condition: Record<string, unknown>; // JSON-Logic
  targetStepId: string;
  label: string;
}

export interface EscalationRule {
  condition: 'TIMEOUT' | 'DEVIATION' | 'CRITICAL_RESULT';
  action: 'NOTIFY' | 'ESCALATE' | 'CONFERENCE';
  targetRole?: string;
}

export interface StepHistoryEntry {
  stepId: string;
  enteredAt: string;   // ISO-8601
  completedAt?: string;
  outcome?: string;
  deviations: string[];
}

// ---------------------------------------------------------------------------
// Event Handler Types
// ---------------------------------------------------------------------------

export interface EventHandlerResult {
  handlerName: string;
  processed: boolean;
  actions: string[];
  errors?: string[];
}

export type EventHandler = (
  event: ClinicalEvent,
  context: HandlerContext,
) => Promise<EventHandlerResult>;

export interface HandlerContext {
  prisma: any; // PrismaClient
  tenantId: string;
  eventId: string;
}

// ---------------------------------------------------------------------------
// Health Graph Types
// ---------------------------------------------------------------------------

export interface TimelineEntry {
  date: string;
  type: string;
  sourceId: string;
  description: string;
  relationships: Array<{
    targetType: string;
    targetId: string;
    relationship: string;
  }>;
}

export interface OutcomeTrace {
  outcomeId: string;
  chain: Array<{
    nodeType: string;
    nodeId: string;
    relationship: string;
    depth: number;
  }>;
}
