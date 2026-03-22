/**
 * BaseConnector — Abstract contract every source adapter must implement.
 *
 * Each connector is responsible for:
 *   1. Fetching raw data from its specific source
 *   2. Passing raw data to the normalizer
 *   3. Reporting job status
 *
 * Connectors NEVER write to the database directly.
 * They return CanonicalHealthRecord[] which the pipeline persists.
 */

import type {
  CanonicalHealthRecord,
  ConnectorResult,
  DataSource,
  IngestionJob,
} from '../types';
import { createJobId, createIngestId, hashRawData } from '../pipeline/utils';

export abstract class BaseConnector {
  protected source: DataSource;

  constructor(source: DataSource) {
    this.source = source;
  }

  /**
   * Pull raw records from the external source.
   * Must be implemented by each concrete connector.
   */
  protected abstract fetchRaw(): Promise<unknown[]>;

  /**
   * Convert one raw item into a CanonicalHealthRecord.
   * Must be implemented by each concrete connector.
   */
  protected abstract normalize(raw: unknown, index: number): CanonicalHealthRecord;

  /**
   * Main entry point — called by the IngestionPipeline.
   */
  async run(): Promise<ConnectorResult> {
    const job: IngestionJob = {
      jobId: createJobId(),
      sourceId: this.source.id,
      tenantId: this.source.tenantId,
      startedAt: new Date(),
      status: 'RUNNING',
      totalRecords: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    let rawItems: unknown[] = [];
    try {
      rawItems = await this.fetchRaw();
      job.totalRecords = rawItems.length;
    } catch (err) {
      job.status = 'FAILED';
      job.completedAt = new Date();
      job.errors.push({
        errorCode: 'FETCH_FAILED',
        message: err instanceof Error ? err.message : String(err),
      });
      return { records: [], job };
    }

    const records: CanonicalHealthRecord[] = [];

    for (let i = 0; i < rawItems.length; i++) {
      try {
        const record = this.normalize(rawItems[i], i);
        records.push(record);
        job.successCount++;
      } catch (err) {
        job.failureCount++;
        job.errors.push({
          recordIndex: i,
          errorCode: 'NORMALIZE_FAILED',
          message: err instanceof Error ? err.message : String(err),
          rawData: rawItems[i],
        });
      }
    }

    job.status = job.failureCount === 0
      ? 'COMPLETED'
      : job.successCount === 0
        ? 'FAILED'
        : 'PARTIAL';
    job.completedAt = new Date();

    return { records, job };
  }

  protected buildBaseRecord(
    raw: unknown,
    recordType: CanonicalHealthRecord['recordType'],
  ): Omit<CanonicalHealthRecord, 'payload' | 'validation'> {
    return {
      ingestId: createIngestId(),
      sourceId: this.source.id,
      sourceType: this.source.type,
      tenantId: this.source.tenantId,
      patientId: this.source.patientId,
      ingestedAt: new Date(),
      recordType,
      rawData: raw,
      provenance: {
        sourceSystem: this.source.name,
        rawDataHash: hashRawData(raw),
        normalizerVersion: '1.0.0',
        normalizedAt: new Date(),
        transformations: [],
      },
    };
  }
}
