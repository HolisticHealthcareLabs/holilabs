/**
 * CDSS V3 - ClinicalAssistant Facade
 *
 * This is a FACADE - it contains NO business logic.
 * All logic lives in the services. This class only coordinates.
 *
 * Target: <100 lines of code (excluding imports/types)
 */

import {
  PreventionService,
  createPreventionService,
  type PreventionAlert,
} from '@/lib/services/prevention.service';
import {
  DocumentService,
  createDocumentService,
  type DocumentUploadInput,
  type EnqueueDocumentResult,
} from '@/lib/services/document.service';
import {
  DeidService,
  createDeidService,
} from '@/lib/services/deid.service';
import {
  SummaryService,
  createSummaryService,
  type PatientContext,
} from '@/lib/services/summary.service';
import {
  SyncService,
  createSyncService,
  type SyncResult,
} from '@/lib/services/sync.service';
import type { SummaryDraft } from '@/lib/schemas/summary-draft.schema';
import type { ParsedDocument } from '@prisma/client';

/**
 * ClinicalAssistant - Facade for CDSS V3
 *
 * Usage:
 * ```typescript
 * const assistant = getClinicalAssistant();
 * const alerts = await assistant.getAlerts(patientId);
 * const jobId = await assistant.queueDocumentParse(file, patientId);
 * ```
 */
export class ClinicalAssistant {
  constructor(
    private readonly prevention: PreventionService,
    private readonly document: DocumentService,
    private readonly deid: DeidService,
    private readonly summary: SummaryService,
    private readonly sync: SyncService
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Prevention Alerts
  // ─────────────────────────────────────────────────────────────

  /** Get actionable alerts for a patient */
  async getAlerts(patientId: string): Promise<PreventionAlert[]> {
    return this.prevention.getActionableAlerts(patientId);
  }

  // ─────────────────────────────────────────────────────────────
  // Document Processing
  // ─────────────────────────────────────────────────────────────

  /** Queue document for parsing (returns job ID, not result) */
  async queueDocumentParse(input: DocumentUploadInput): Promise<EnqueueDocumentResult> {
    return this.document.enqueueParseJob(input);
  }

  /** Get pre-visit documents for a patient */
  async getPreVisitDocuments(patientId: string): Promise<ParsedDocument[]> {
    return this.document.getPreVisitDocuments(patientId);
  }

  // ─────────────────────────────────────────────────────────────
  // Summary Generation
  // ─────────────────────────────────────────────────────────────

  /** Generate summary draft (returns job ID, not result) */
  async generateSummaryDraft(
    encounterId: string,
    transcript: string,
    patientContext: PatientContext,
    providerId: string,
    language: 'en' | 'es' | 'pt' = 'en'
  ): Promise<string> {
    return this.summary.enqueueGeneration(
      encounterId,
      transcript,
      patientContext,
      providerId,
      language
    );
  }

  /** Approve all sections of a summary draft */
  async approveSummary(encounterId: string): Promise<SummaryDraft> {
    return this.summary.approveAll(encounterId);
  }

  // ─────────────────────────────────────────────────────────────
  // FHIR Sync
  // ─────────────────────────────────────────────────────────────

  /** Push patient data to FHIR server */
  async syncToFHIR(patientId: string): Promise<string> {
    return this.sync.pushPatient(patientId);
  }

  /** Get pending sync conflicts */
  async getPendingConflicts() {
    return this.sync.getPendingConflicts();
  }

  // ─────────────────────────────────────────────────────────────
  // De-identification (utility)
  // ─────────────────────────────────────────────────────────────

  /** De-identify text (for direct use when needed) */
  async deidentify(text: string): Promise<string> {
    return this.deid.redact(text);
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Factory
// ─────────────────────────────────────────────────────────────

let instance: ClinicalAssistant | null = null;

export function getClinicalAssistant(): ClinicalAssistant {
  if (!instance) {
    instance = new ClinicalAssistant(
      createPreventionService(),
      createDocumentService(),
      createDeidService(),
      createSummaryService(),
      createSyncService()
    );
  }
  return instance;
}

// Factory for testing with custom dependencies
export function createClinicalAssistant(
  prevention?: PreventionService,
  document?: DocumentService,
  deid?: DeidService,
  summary?: SummaryService,
  sync?: SyncService
): ClinicalAssistant {
  return new ClinicalAssistant(
    prevention ?? createPreventionService(),
    document ?? createDocumentService(),
    deid ?? createDeidService(),
    summary ?? createSummaryService(),
    sync ?? createSyncService()
  );
}
