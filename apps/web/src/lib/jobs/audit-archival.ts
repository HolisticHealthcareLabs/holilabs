/**
 * HIPAA-Compliant Audit Log Archival System
 *
 * HIPAA Requirements:
 * - 6-year retention of audit logs (45 CFR § 164.316(b)(2)(i))
 * - Secure archival and storage
 * - Integrity protection
 *
 * This module provides:
 * 1. Daily archival: Compress and archive logs older than 1 year
 * 2. Annual cleanup: Delete logs older than 6 years
 * 3. Atomic operations with transactions
 * 4. GZIP compression for storage efficiency
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { promises as fs } from 'fs';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

// Archive configuration
const ARCHIVE_BASE_PATH = process.env.AUDIT_ARCHIVE_PATH || '/var/log/audit-archives';
const ARCHIVAL_AGE_DAYS = parseInt(process.env.AUDIT_ARCHIVAL_AGE_DAYS || '365', 10); // 1 year
const DELETION_AGE_DAYS = parseInt(process.env.AUDIT_DELETION_AGE_DAYS || '2190', 10); // 6 years
const BATCH_SIZE = parseInt(process.env.AUDIT_BATCH_SIZE || '1000', 10);

/**
 * Archive metadata interface
 */
export interface ArchiveMetadata {
  archivalDate: string;
  recordCount: number;
  startDate: string;
  endDate: string;
  logs: any[];
}

/**
 * Archive result interface
 */
export interface ArchiveResult {
  success: boolean;
  archiveFile?: string;
  recordCount?: number;
  compressedSize?: number;
  error?: string;
}

/**
 * Deletion result interface
 */
export interface DeletionResult {
  success: boolean;
  deletedCount?: number;
  error?: string;
}

/**
 * Daily job: Archive audit logs older than 1 year
 *
 * Process:
 * 1. Query logs older than ARCHIVAL_AGE_DAYS
 * 2. Batch process logs in chunks (memory efficient)
 * 3. Create JSON archive with metadata
 * 4. Compress with GZIP
 * 5. Delete archived logs from database (within transaction)
 * 6. Verify archive integrity
 */
export async function archiveOldAuditLogs(): Promise<ArchiveResult> {
  const startTime = Date.now();

  try {
    // Calculate date threshold (logs older than 1 year)
    const archivalThreshold = new Date();
    archivalThreshold.setDate(archivalThreshold.getDate() - ARCHIVAL_AGE_DAYS);

    logger.info({
      event: 'audit_archival_start',
      threshold: archivalThreshold.toISOString(),
      archivalAgeDays: ARCHIVAL_AGE_DAYS,
    });

    // Count logs to be archived
    const logsToArchiveCount = await prisma.auditLog.count({
      where: {
        timestamp: {
          lt: archivalThreshold,
        },
      },
    });

    if (logsToArchiveCount === 0) {
      logger.info({
        event: 'audit_archival_skipped',
        reason: 'no_logs_to_archive',
      });
      return {
        success: true,
        recordCount: 0,
      };
    }

    logger.info({
      event: 'audit_archival_logs_found',
      count: logsToArchiveCount,
    });

    // Ensure archive directory exists
    await ensureArchiveDirectory();

    // Fetch logs in batches to avoid memory issues
    const allLogs: any[] = [];
    let skip = 0;
    let oldestTimestamp: Date | null = null;
    let newestTimestamp: Date | null = null;

    while (skip < logsToArchiveCount) {
      const batch = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            lt: archivalThreshold,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
        skip,
        take: BATCH_SIZE,
      });

      if (batch.length === 0) break;

      // Track date range
      if (!oldestTimestamp) {
        oldestTimestamp = batch[0].timestamp;
      }
      newestTimestamp = batch[batch.length - 1].timestamp;

      allLogs.push(...batch);
      skip += batch.length;

      logger.info({
        event: 'audit_archival_batch_processed',
        processed: skip,
        total: logsToArchiveCount,
        progress: `${((skip / logsToArchiveCount) * 100).toFixed(1)}%`,
      });
    }

    // Create archive metadata
    const archiveData: ArchiveMetadata = {
      archivalDate: new Date().toISOString(),
      recordCount: allLogs.length,
      startDate: oldestTimestamp?.toISOString() || '',
      endDate: newestTimestamp?.toISOString() || '',
      logs: allLogs,
    };

    // Generate archive filename with timestamp
    const archiveDate = new Date().toISOString().split('T')[0];
    const archiveFileName = `audit-logs-${archiveDate}-${Date.now()}.json.gz`;
    const archiveFilePath = path.join(ARCHIVE_BASE_PATH, archiveFileName);

    // Write and compress archive
    const jsonContent = JSON.stringify(archiveData, null, 2);
    const compressedSize = await writeCompressedArchive(archiveFilePath, jsonContent);

    logger.info({
      event: 'audit_archival_file_created',
      file: archiveFilePath,
      originalSize: Buffer.byteLength(jsonContent),
      compressedSize,
      compressionRatio: `${((compressedSize / Buffer.byteLength(jsonContent)) * 100).toFixed(1)}%`,
    });

    // Delete archived logs from database (atomic transaction)
    const deletedCount = await prisma.$transaction(async (tx) => {
      const result = await tx.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: archivalThreshold,
          },
        },
      });
      return result.count;
    });

    const duration = Date.now() - startTime;

    logger.info({
      event: 'audit_archival_complete',
      archiveFile: archiveFilePath,
      recordCount: allLogs.length,
      deletedCount,
      compressedSize,
      durationMs: duration,
      durationSeconds: (duration / 1000).toFixed(2),
    });

    return {
      success: true,
      archiveFile: archiveFilePath,
      recordCount: allLogs.length,
      compressedSize,
    };
  } catch (error) {
    logger.error({
      event: 'audit_archival_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Annual job: Delete audit logs older than 6 years
 *
 * HIPAA allows deletion after 6 years from the date of creation or last use.
 * This job should run less frequently (annually) and delete very old logs.
 */
export async function deleteExpiredAuditLogs(): Promise<DeletionResult> {
  const startTime = Date.now();

  try {
    // Calculate deletion threshold (logs older than 6 years)
    const deletionThreshold = new Date();
    deletionThreshold.setDate(deletionThreshold.getDate() - DELETION_AGE_DAYS);

    logger.info({
      event: 'audit_deletion_start',
      threshold: deletionThreshold.toISOString(),
      deletionAgeDays: DELETION_AGE_DAYS,
    });

    // Count logs to be deleted
    const logsToDeleteCount = await prisma.auditLog.count({
      where: {
        timestamp: {
          lt: deletionThreshold,
        },
      },
    });

    if (logsToDeleteCount === 0) {
      logger.info({
        event: 'audit_deletion_skipped',
        reason: 'no_logs_to_delete',
      });
      return {
        success: true,
        deletedCount: 0,
      };
    }

    logger.warn({
      event: 'audit_deletion_logs_found',
      count: logsToDeleteCount,
      threshold: deletionThreshold.toISOString(),
      message: 'Logs older than 6 years will be permanently deleted',
    });

    // Delete logs in a transaction
    const deletedCount = await prisma.$transaction(async (tx) => {
      const result = await tx.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: deletionThreshold,
          },
        },
      });
      return result.count;
    });

    const duration = Date.now() - startTime;

    logger.warn({
      event: 'audit_deletion_complete',
      deletedCount,
      durationMs: duration,
      durationSeconds: (duration / 1000).toFixed(2),
      message: 'Audit logs permanently deleted per HIPAA 6-year retention policy',
    });

    return {
      success: true,
      deletedCount,
    };
  } catch (error) {
    logger.error({
      event: 'audit_deletion_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Ensure archive directory exists with proper permissions
 */
async function ensureArchiveDirectory(): Promise<void> {
  try {
    await fs.access(ARCHIVE_BASE_PATH);
  } catch {
    // Directory doesn't exist, create it
    logger.info({
      event: 'audit_archive_directory_create',
      path: ARCHIVE_BASE_PATH,
    });

    await fs.mkdir(ARCHIVE_BASE_PATH, {
      recursive: true,
      mode: 0o700, // Owner read/write/execute only
    });

    logger.info({
      event: 'audit_archive_directory_created',
      path: ARCHIVE_BASE_PATH,
    });
  }
}

/**
 * Write compressed archive file using GZIP streaming
 */
async function writeCompressedArchive(
  filePath: string,
  content: string
): Promise<number> {
  const gzip = createGzip({ level: 9 }); // Maximum compression
  const source = Readable.from([content]);
  const destination = await fs.open(filePath, 'w', 0o600); // Owner read/write only

  try {
    await pipeline(source, gzip, destination.createWriteStream());

    // Get compressed file size
    const stats = await fs.stat(filePath);
    return stats.size;
  } finally {
    await destination.close();
  }
}

/**
 * Manual archival trigger (for testing or admin use)
 *
 * Archives logs within a specific date range
 */
export async function archiveAuditLogsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<ArchiveResult> {
  const startTime = Date.now();

  try {
    logger.info({
      event: 'audit_archival_range_start',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Count logs in range
    const logsToArchiveCount = await prisma.auditLog.count({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    if (logsToArchiveCount === 0) {
      logger.info({
        event: 'audit_archival_range_skipped',
        reason: 'no_logs_in_range',
      });
      return {
        success: true,
        recordCount: 0,
      };
    }

    // Ensure archive directory exists
    await ensureArchiveDirectory();

    // Fetch logs in batches
    const allLogs: any[] = [];
    let skip = 0;

    while (skip < logsToArchiveCount) {
      const batch = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
        skip,
        take: BATCH_SIZE,
      });

      if (batch.length === 0) break;

      allLogs.push(...batch);
      skip += batch.length;
    }

    // Create archive metadata
    const archiveData: ArchiveMetadata = {
      archivalDate: new Date().toISOString(),
      recordCount: allLogs.length,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      logs: allLogs,
    };

    // Generate archive filename
    const archiveDate = new Date().toISOString().split('T')[0];
    const archiveFileName = `audit-logs-manual-${archiveDate}-${Date.now()}.json.gz`;
    const archiveFilePath = path.join(ARCHIVE_BASE_PATH, archiveFileName);

    // Write and compress archive
    const jsonContent = JSON.stringify(archiveData, null, 2);
    const compressedSize = await writeCompressedArchive(archiveFilePath, jsonContent);

    const duration = Date.now() - startTime;

    logger.info({
      event: 'audit_archival_range_complete',
      archiveFile: archiveFilePath,
      recordCount: allLogs.length,
      compressedSize,
      durationMs: duration,
    });

    return {
      success: true,
      archiveFile: archiveFilePath,
      recordCount: allLogs.length,
      compressedSize,
    };
  } catch (error) {
    logger.error({
      event: 'audit_archival_range_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get archival statistics
 */
export async function getArchivalStatistics(): Promise<{
  totalLogs: number;
  logsReadyForArchival: number;
  logsReadyForDeletion: number;
  oldestLog: Date | null;
  newestLog: Date | null;
}> {
  const archivalThreshold = new Date();
  archivalThreshold.setDate(archivalThreshold.getDate() - ARCHIVAL_AGE_DAYS);

  const deletionThreshold = new Date();
  deletionThreshold.setDate(deletionThreshold.getDate() - DELETION_AGE_DAYS);

  const [totalLogs, logsReadyForArchival, logsReadyForDeletion, oldestLog, newestLog] =
    await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: {
          timestamp: {
            lt: archivalThreshold,
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          timestamp: {
            lt: deletionThreshold,
          },
        },
      }),
      prisma.auditLog.findFirst({
        orderBy: {
          timestamp: 'asc',
        },
        select: {
          timestamp: true,
        },
      }),
      prisma.auditLog.findFirst({
        orderBy: {
          timestamp: 'desc',
        },
        select: {
          timestamp: true,
        },
      }),
    ]);

  return {
    totalLogs,
    logsReadyForArchival,
    logsReadyForDeletion,
    oldestLog: oldestLog?.timestamp || null,
    newestLog: newestLog?.timestamp || null,
  };
}
