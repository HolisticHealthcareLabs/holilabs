/**
 * Agent Memory — Public API
 *
 * Exports the encounter memory generator and auto-compact pipeline.
 */

// Encounter Memory
export { generateEncounterMemory } from './encounter-memory';
export type {
  PatientSummary,
  MedicationEntry,
  AllergyEntry,
  ObservationEntry,
  CarePlanGoal,
  EncounterData,
  EncounterMemorySource,
} from './encounter-memory';

// Auto-Compact
export {
  estimateTokens,
  estimateConversationTokens,
  getContextWindow,
  defaultCompactionConfig,
  microCompact,
  autoCompact,
  MODEL_CONTEXT_WINDOWS,
} from './auto-compact';
