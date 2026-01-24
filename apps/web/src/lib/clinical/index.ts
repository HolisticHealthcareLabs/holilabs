/**
 * Clinical Intelligence Module
 *
 * Entry point for all clinical decision support functionality.
 *
 * Implements the Clinical Intelligence MVP per the architectural laws:
 * - Law 1: Logic-as-Data (rules in database, not code)
 * - Law 3: Design for Failure (processWithFallback pattern)
 * - Law 4: Hybrid Core (AI extracts, deterministic executes)
 * - Law 5: Data Contract (Zod validation on all AI outputs)
 * - Law 7: Context Merging (AI output + patient history before rules)
 */

// Core fallback pattern
export {
  processWithFallback,
  ClinicalProcessor,
  FallbackError,
  type ProcessingResult,
  type FallbackOptions,
} from './process-with-fallback';

// Clinical engines
export {
  SymptomDiagnosisEngine,
  symptomDiagnosisEngine,
  TreatmentProtocolEngine,
  treatmentProtocolEngine,
  MedicationAdherenceEngine,
  medicationAdherenceEngine,
} from './engines';

// Context merging (Law 7)
export { ContextMerger, contextMerger } from './context';

// Re-export lab utilities (existing)
export * from './lab-decision-rules';
export * from './lab-reference-ranges';
