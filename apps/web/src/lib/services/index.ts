/**
 * CDSS V3 - Services Index
 *
 * Central export file for all CDSS services.
 */

// Prevention Service
export {
  PreventionService,
  createPreventionService,
  PreventionAlertSchema,
  type PreventionAlert,
} from './prevention.service';

// Document Service
export {
  DocumentService,
  createDocumentService,
  type DocumentUploadInput,
  type EnqueueDocumentResult,
} from './document.service';

// De-identification Service
export {
  DeidService,
  getDeidService,
  createDeidService,
  type DeidResult,
  type DeidConfig,
} from './deid.service';

// Summary Service
export {
  SummaryService,
  createSummaryService,
  type PatientContext,
} from './summary.service';

// Sync Service
export {
  SyncService,
  createSyncService,
  type SyncResult,
  type ConflictResolutionInput,
} from './sync.service';

// Existing services (re-export for completeness)
export { CDSSService, cdssService, type AIInsight } from './cdss.service';

// Scribe Service (realtime transcription)
export { ScribeService, getScribeService, type ScribeLanguage, type CoPilotEmit } from './scribe.service';
