/**
 * Schema Exports
 *
 * Central export file for all Zod validation schemas
 */

// Patient schemas
export {
  createPatientSchema,
  updatePatientSchema,
  patientQuerySchema,
  type CreatePatientInput,
  type UpdatePatientInput,
  type PatientQueryInput,
} from './patient.schema';

// Clinical note schemas
export {
  createClinicalNoteSchema,
  updateClinicalNoteSchema,
  clinicalNoteQuerySchema,
  type CreateClinicalNoteInput,
  type UpdateClinicalNoteInput,
  type ClinicalNoteQueryInput,
  type VitalSigns,
  type Diagnosis,
  type Procedure,
} from './clinical-note.schema';

// Medication and prescription schemas
export {
  createMedicationSchema,
  updateMedicationSchema,
  medicationQuerySchema,
  createPrescriptionSchema,
  updatePrescriptionSchema,
  prescriptionQuerySchema,
  type CreateMedicationInput,
  type UpdateMedicationInput,
  type MedicationQueryInput,
  type CreatePrescriptionInput,
  type UpdatePrescriptionInput,
  type PrescriptionQueryInput,
} from './medication.schema';

// Care plan schemas
export {
  createCarePlanSchema,
  updateCarePlanSchema,
  carePlanQuerySchema,
  updateGoalSchema,
  updateInterventionSchema,
  type CreateCarePlanInput,
  type UpdateCarePlanInput,
  type CarePlanQueryInput,
  type Goal,
  type Intervention,
  type UpdateGoalInput,
  type UpdateInterventionInput,
} from './care-plan.schema';

// CDSS V3: Parsed document schemas
export {
  ParsedDocumentSchema,
  ParserOutputSchema,
  CreateParsedDocumentSchema,
  type ParsedDocument,
  type ParserOutput,
  type CreateParsedDocumentInput,
  type Table,
  type DocumentMetadata,
  type Section,
} from './parsed-document.schema';

// CDSS V3: Summary draft schemas
export {
  SummaryDraftSchema,
  PartialSummaryDraftSchema,
  SummaryGenerationInputSchema,
  type SummaryDraft,
  type PartialSummaryDraft,
  type SummaryGenerationInput,
  type Differential,
  type MedicationPlan,
  type NextScreening,
} from './summary-draft.schema';

// CDSS V3: Prevention alert schemas
export {
  PreventionAlertSchema,
  PreventionAlertsSchema,
  PartialPreventionAlertSchema,
  PreventionAlertType,
  AlertSeverity,
  AlertActionType,
  AlertActionSchema,
  type PreventionAlert,
  type PreventionAlerts,
  type PartialPreventionAlert,
  type AlertAction,
} from './prevention-alert.schema';
