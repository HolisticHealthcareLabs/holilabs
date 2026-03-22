/**
 * IngestionPipeline — Orchestrates the full ingest flow.
 *
 * Flow:
 *   1. Receive a DataSource config
 *   2. Instantiate the correct connector (factory pattern)
 *   3. Run fetch + normalize
 *   4. Validate each CanonicalHealthRecord
 *   5. Return results for persistence (caller writes to DB)
 *
 * This pipeline is intentionally DB-agnostic.
 * The caller (API route or background job) is responsible for
 * persisting CanonicalHealthRecord[] via Prisma.
 *
 * CYRUS note: This pipeline never logs raw PHI.
 * It logs job IDs, counts, and error codes only.
 */

import type { DataSource, CanonicalHealthRecord, ConnectorResult, IngestionJob } from '../types';
import { FhirConnector } from '../connectors/fhir.connector';
import { CsvConnector } from '../connectors/csv.connector';
import { RestApiConnector } from '../connectors/rest.connector';
import type { BaseConnector } from '../connectors/base.connector';

export interface PipelineRunOptions {
  /** Raw file content for CSV/Excel sources */
  fileContent?: string;
  /** Webhook payload for REST/push sources */
  webhookPayload?: unknown;
  /** Dry run: normalize & validate but don't return for persistence */
  dryRun?: boolean;
}

export interface PipelineResult {
  job: IngestionJob;
  records: CanonicalHealthRecord[];
  /** Records that passed validation */
  validRecords: CanonicalHealthRecord[];
  /** Records that failed validation */
  invalidRecords: CanonicalHealthRecord[];
  /** Summary stats */
  summary: PipelineSummary;
}

export interface PipelineSummary {
  totalFetched: number;
  totalNormalized: number;
  totalValid: number;
  totalInvalid: number;
  completenessAvg: number;
  errorBreakdown: Record<string, number>;
}

export class IngestionPipeline {
  async run(source: DataSource, options: PipelineRunOptions = {}): Promise<PipelineResult> {
    const connector = this.createConnector(source, options);
    const { records, job }: ConnectorResult = await connector.run();

    const validRecords = records.filter(r => r.validation.isValid);
    const invalidRecords = records.filter(r => !r.validation.isValid);

    const completenessAvg = records.length > 0
      ? records.reduce((sum, r) => sum + r.validation.completenessScore, 0) / records.length
      : 0;

    // Count error codes across all records
    const errorBreakdown: Record<string, number> = {};
    for (const record of invalidRecords) {
      for (const err of record.validation.errors) {
        errorBreakdown[err.code] = (errorBreakdown[err.code] ?? 0) + 1;
      }
    }

    const summary: PipelineSummary = {
      totalFetched: job.totalRecords,
      totalNormalized: records.length,
      totalValid: validRecords.length,
      totalInvalid: invalidRecords.length,
      completenessAvg: Math.round(completenessAvg * 100) / 100,
      errorBreakdown,
    };

    return {
      job,
      records: options.dryRun ? [] : records,
      validRecords: options.dryRun ? [] : validRecords,
      invalidRecords: options.dryRun ? [] : invalidRecords,
      summary,
    };
  }

  private createConnector(source: DataSource, options: PipelineRunOptions): BaseConnector {
    switch (source.type) {
      case 'FHIR_R4':
        return new FhirConnector(source);

      case 'CSV':
      case 'EXCEL':
        if (!options.fileContent) {
          throw new Error(`CSV/Excel source "${source.id}" requires fileContent in options`);
        }
        return new CsvConnector(source, options.fileContent);

      case 'REST_API':
        return new RestApiConnector(source);

      // HL7 V2, PostgreSQL, SQLite — Phase 2 connectors
      case 'HL7_V2':
        throw new Error('HL7 V2 connector is not yet implemented (Phase 2). Use FHIR R4 or CSV for now.');

      case 'POSTGRES':
      case 'SQLITE':
        throw new Error('Database connectors are not yet implemented (Phase 2). Export data as CSV first.');

      default:
        throw new Error(`Unsupported data source type: ${source.type}`);
    }
  }
}
