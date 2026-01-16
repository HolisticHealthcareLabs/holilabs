/**
 * CDSS V3 - Repository Exports
 *
 * Central export file for all data access repositories.
 */

// Patient repository
export {
  PatientRepository,
  patientRepository,
  type PatientWithMedications,
  type PatientContext,
} from './patient.repository';

// Encounter repository
export {
  EncounterRepository,
  encounterRepository,
  type CreateEncounterInput,
  type UpdateEncounterInput,
  type EncounterWithRelations,
} from './encounter.repository';

// Document repository
export {
  DocumentRepository,
  documentRepository,
  type CreateParsedDocumentInput,
} from './document.repository';

// Job repository
export {
  JobRepository,
  jobRepository,
  type CreateJobInput,
  type UpdateJobInput,
  type JobWithPatient,
} from './job.repository';
