/**
 * Health 3.0 Module — Barrel Export
 *
 * Entry point for the Health 3.0 orchestration layer.
 * Importing this module registers all event handlers.
 */

export { processEvent, registerHandler, clearHandlerRegistry, isEventProcessed } from './orchestrator';
export { registerAllHandlers } from './event-handlers';
export { advancePathway, enrollPatient, resolveNextStep, evaluateEntryCriteria, checkStepTimeout, OptimisticLockError } from './pathways/pathway-engine';
export { buildPatientTimeline, traceOutcomeFactors, getConditionProviderNetwork, identifyScreeningGaps } from './graph/health-graph-queries';
export type { EventHandler, EventHandlerResult, HandlerContext, PathwayStepDefinition, PathwayBranch, StepHistoryEntry, TimelineEntry, OutcomeTrace } from './types';
