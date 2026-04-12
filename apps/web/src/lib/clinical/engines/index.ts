/**
 * Clinical Intelligence Engines
 *
 * All engines implement the architectural laws:
 * - Law 1: Logic-as-Data (rules in database)
 * - Law 3: Design for Failure (processWithFallback pattern)
 * - Law 4: Hybrid Core (AI extracts, deterministic executes)
 */

// Symptom-to-Diagnosis Engine
export {
  SymptomDiagnosisEngine,
  symptomDiagnosisEngine,
} from './symptom-diagnosis-engine';

// Treatment Protocol Engine
export {
  TreatmentProtocolEngine,
  treatmentProtocolEngine,
} from './treatment-protocol-engine';

// Medication Adherence Engine
export {
  MedicationAdherenceEngine,
  medicationAdherenceEngine,
} from './medication-adherence-engine';
