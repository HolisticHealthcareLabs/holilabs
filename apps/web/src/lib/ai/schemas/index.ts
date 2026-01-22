/**
 * AI Output Schemas
 *
 * Central export for all AI output validation schemas.
 */

// SOAP Notes
export {
  SOAPNoteSchema,
  PartialSOAPNoteSchema,
  SubjectiveFindingSchema,
  VitalSignsSchema,
  ExamFindingSchema,
  DiagnosisSchema,
  PlanItemSchema,
  type SOAPNote,
  type PartialSOAPNote,
  type SubjectiveFinding,
  type VitalSigns,
  type ExamFinding,
  type Diagnosis,
  type PlanItem,
} from './soap-note';

// Autofill
export {
  AutofillSuggestionSchema,
  AutofillResponseSchema,
  DemographicsAutofillSchema,
  VitalsAutofillSchema,
  MedicationAutofillSchema,
  type AutofillSuggestion,
  type AutofillResponse,
  type DemographicsAutofill,
  type VitalsAutofill,
  type MedicationAutofill,
} from './autofill';

// Clinical Alerts
export {
  ClinicalAlertSchema,
  DrugInteractionAlertSchema,
  LabAbnormalityAlertSchema,
  AlertBatchResponseSchema,
  AlertSeveritySchema,
  AlertCategorySchema,
  EvidenceSourceSchema,
  RecommendedActionSchema,
  type ClinicalAlert,
  type DrugInteractionAlert,
  type LabAbnormalityAlert,
  type AlertBatchResponse,
  type AlertSeverity,
  type AlertCategory,
  type EvidenceSource,
  type RecommendedAction,
} from './clinical-alert';

// Prescriptions
export {
  PrescriptionSchema,
  MedicationSchema,
  DrugDoseSchema,
  RouteSchema,
  FrequencySchema,
  DurationSchema,
  PrescriptionValidationResultSchema,
  type Prescription,
  type Medication,
  type DrugDose,
  type Route,
  type Frequency,
  type Duration,
  type PrescriptionValidationResult,
} from './prescription';
