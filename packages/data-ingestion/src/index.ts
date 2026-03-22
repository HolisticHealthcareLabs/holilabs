/**
 * @holi/data-ingestion
 *
 * Health 3.0 — Source-Agnostic Data Aggregation Pipeline
 *
 * Public API surface:
 *
 * ─── PIPELINE ───────────────────────────────────────────────────
 * import { IngestionPipeline } from '@holi/data-ingestion';
 * const pipeline = new IngestionPipeline();
 * const result = await pipeline.run(dataSource, { fileContent: csvString });
 *
 * ─── CONNECTORS (direct use) ────────────────────────────────────
 * import { FhirConnector, CsvConnector, RestApiConnector } from '@holi/data-ingestion';
 *
 * ─── TYPES ──────────────────────────────────────────────────────
 * import type {
 *   DataSource, CanonicalHealthRecord, CanonicalLabResult,
 *   IngestionJob, PipelineResult
 * } from '@holi/data-ingestion';
 *
 * ─── VALIDATORS ─────────────────────────────────────────────────
 * import { validateCanonical } from '@holi/data-ingestion';
 */

// Pipeline
export { IngestionPipeline } from './pipeline/ingestion.pipeline';
export type { PipelineRunOptions, PipelineResult, PipelineSummary } from './pipeline/ingestion.pipeline';

// Connectors
export { FhirConnector } from './connectors/fhir.connector';
export { CsvConnector } from './connectors/csv.connector';
export { RestApiConnector } from './connectors/rest.connector';

// Validators
export { validateCanonical } from './validators/canonical.validator';

// All types
export type {
  // Source definition
  DataSource,
  DataSourceType,
  SourceConfig,
  FhirSourceConfig,
  FhirResourceType,
  Hl7SourceConfig,
  CsvSourceConfig,
  RestApiSourceConfig,
  DatabaseSourceConfig,
  ManualSourceConfig,

  // Canonical record
  CanonicalHealthRecord,
  CanonicalRecordType,
  CanonicalPayload,

  // Canonical payload shapes
  CanonicalLabResult,
  CanonicalVitalSign,
  CanonicalDiagnosis,
  CanonicalMedication,
  CanonicalAllergy,
  CanonicalImmunization,
  CanonicalImagingMeta,
  CanonicalClinicalNote,
  CanonicalProcedure,
  CanonicalEncounter,
  CanonicalPatientDemographics,
  CanonicalSupplyChainItem,
  CanonicalDeviceReading,

  // Validation & provenance
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ProvenanceChain,

  // Pipeline I/O
  IngestionJob,
  IngestionError,
  ConnectorResult,
} from './types';
