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
