/**
 * Audit Log Hash Chain
 *
 * Creates tamper-evident audit logs using hash chaining.
 * Each log entry includes the hash of the previous entry, making
 * tampering detectable through chain verification.
 *
 * HIPAA/Compliance Requirement: Audit trails must be immutable and
 * any tampering must be detectable.
 *
 * How it works:
 * 1. Each entry stores previousHash (hash of prior entry)
 * 2. Each entry stores entryHash (hash of current entry data + previousHash)
 * 3. Verification walks the chain and recomputes hashes
 * 4. Any mismatch indicates tampering
 */

import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type { AuditLog, AuditAction, AccessReason } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ChainedAuditData {
  userId?: string | null;
  userEmail?: string | null;
  ipAddress: string;
  userAgent?: string | null;
  action: AuditAction;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown> | null;
  dataHash?: string | null;
  accessReason?: AccessReason | null;
  accessPurpose?: string | null;
  success?: boolean;
  errorMessage?: string | null;
}

export interface ChainVerificationResult {
  valid: boolean;
  totalEntries: number;
  verifiedEntries: number;
  brokenAt?: {
    entryId: string;
    timestamp: Date;
    reason: 'previousHash_mismatch' | 'entryHash_mismatch' | 'missing_hash';
  };
}

// ═══════════════════════════════════════════════════════════════
// HASH CHAIN CREATION
// ═══════════════════════════════════════════════════════════════

/**
 * Create a hash-chained audit log entry.
 *
 * This should be used instead of direct prisma.auditLog.create()
 * for HIPAA compliance.
 *
 * SECURITY FIX (H2): Uses transaction with row locking to prevent
 * race conditions where two concurrent entries get the same previousHash.
 *
 * @param data Audit log data
 * @returns Created audit log with hash chain
 */
export async function createChainedAuditEntry(
  data: ChainedAuditData
): Promise<AuditLog> {
  // SECURITY FIX (H2): Wrap in transaction with FOR UPDATE to prevent race conditions
  const entry = await prisma.$transaction(async (tx) => {
    // Get hash of last entry with row lock to prevent concurrent reads
    // Using raw query with FOR UPDATE to acquire lock
    const lastEntries = await tx.$queryRaw<Array<{ entryHash: string }>>`
      SELECT "entryHash"
      FROM "AuditLog"
      WHERE "entryHash" IS NOT NULL
      ORDER BY "timestamp" DESC
      LIMIT 1
      FOR UPDATE
    `;

    const previousHash = lastEntries.length > 0 ? lastEntries[0].entryHash : 'GENESIS';

    // Create hash of current entry + previous hash
    const timestamp = new Date();
    const entryData = {
      userId: data.userId,
      userEmail: data.userEmail,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      details: data.details,
      dataHash: data.dataHash,
      accessReason: data.accessReason,
      accessPurpose: data.accessPurpose,
      success: data.success ?? true,
      errorMessage: data.errorMessage,
      previousHash,
      timestamp: timestamp.toISOString(),
    };

    const entryHash = createHash('sha256')
      .update(JSON.stringify(entryData))
      .digest('hex');

    // Create the entry with hash chain (now safe from race conditions)
    const newEntry = await tx.auditLog.create({
      data: {
        userId: data.userId,
        userEmail: data.userEmail,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        details: data.details ? JSON.parse(JSON.stringify(data.details)) : undefined,
        dataHash: data.dataHash,
        accessReason: data.accessReason,
        accessPurpose: data.accessPurpose,
        success: data.success ?? true,
        errorMessage: data.errorMessage,
        previousHash,
        entryHash,
        timestamp,
      },
    });

    return newEntry;
  }, {
    // Serializable isolation level for maximum consistency
    isolationLevel: 'Serializable',
    timeout: 10000, // 10 second timeout
  });

  logger.debug({
    event: 'audit_chain_entry_created',
    entryId: entry.id,
    previousHash: entry.previousHash?.substring(0, 12) + '...',
    entryHash: entry.entryHash?.substring(0, 12) + '...',
  });

  return entry;
}

// ═══════════════════════════════════════════════════════════════
// HASH CHAIN VERIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Verify integrity of audit chain.
 *
 * Returns first broken link if tampering detected.
 * Should be run periodically as a compliance check.
 *
 * @param startDate Optional start date for verification window
 * @param endDate Optional end date for verification window
 * @returns Verification result
 */
export async function verifyAuditChain(
  startDate?: Date,
  endDate?: Date
): Promise<ChainVerificationResult> {
  logger.info({
    event: 'audit_chain_verification_start',
    startDate,
    endDate,
  });

  const entries = await prisma.auditLog.findMany({
    where: {
      timestamp: {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      },
      // Only verify entries with hash chain (new entries)
      entryHash: { not: null },
    },
    orderBy: { timestamp: 'asc' },
    select: {
      id: true,
      userId: true,
      userEmail: true,
      ipAddress: true,
      userAgent: true,
      action: true,
      resource: true,
      resourceId: true,
      details: true,
      dataHash: true,
      accessReason: true,
      accessPurpose: true,
      success: true,
      errorMessage: true,
      timestamp: true,
      previousHash: true,
      entryHash: true,
    },
  });

  if (entries.length === 0) {
    return {
      valid: true,
      totalEntries: 0,
      verifiedEntries: 0,
    };
  }

  let verifiedCount = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Check if hashes exist
    if (!entry.entryHash || !entry.previousHash) {
      logger.warn({
        event: 'audit_chain_missing_hash',
        entryId: entry.id,
        timestamp: entry.timestamp,
      });

      return {
        valid: false,
        totalEntries: entries.length,
        verifiedEntries: verifiedCount,
        brokenAt: {
          entryId: entry.id,
          timestamp: entry.timestamp,
          reason: 'missing_hash',
        },
      };
    }

    // Verify previous hash links correctly
    if (i === 0) {
      // First entry should link to GENESIS or last entry before our window
      // We can't verify the link if we're not starting from the beginning
      if (startDate) {
        // Skip previousHash verification for first entry when windowed
        verifiedCount++;
        continue;
      }

      if (entry.previousHash !== 'GENESIS') {
        // Check if there's an entry before our first one
        const priorEntry = await prisma.auditLog.findFirst({
          where: {
            timestamp: { lt: entry.timestamp },
            entryHash: { not: null },
          },
          orderBy: { timestamp: 'desc' },
          select: { entryHash: true },
        });

        if (priorEntry && entry.previousHash !== priorEntry.entryHash) {
          logger.warn({
            event: 'audit_chain_broken',
            entryId: entry.id,
            expectedPreviousHash: priorEntry.entryHash,
            actualPreviousHash: entry.previousHash,
          });

          return {
            valid: false,
            totalEntries: entries.length,
            verifiedEntries: verifiedCount,
            brokenAt: {
              entryId: entry.id,
              timestamp: entry.timestamp,
              reason: 'previousHash_mismatch',
            },
          };
        }
      }
    } else {
      // Subsequent entries must link to previous entry's hash
      const expectedPreviousHash = entries[i - 1].entryHash;
      if (entry.previousHash !== expectedPreviousHash) {
        logger.warn({
          event: 'audit_chain_broken',
          entryId: entry.id,
          expectedPreviousHash,
          actualPreviousHash: entry.previousHash,
        });

        return {
          valid: false,
          totalEntries: entries.length,
          verifiedEntries: verifiedCount,
          brokenAt: {
            entryId: entry.id,
            timestamp: entry.timestamp,
            reason: 'previousHash_mismatch',
          },
        };
      }
    }

    // Verify entry hash matches computed hash
    const entryData = {
      userId: entry.userId,
      userEmail: entry.userEmail,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      details: entry.details,
      dataHash: entry.dataHash,
      accessReason: entry.accessReason,
      accessPurpose: entry.accessPurpose,
      success: entry.success,
      errorMessage: entry.errorMessage,
      previousHash: entry.previousHash,
      timestamp: entry.timestamp.toISOString(),
    };

    const recomputedHash = createHash('sha256')
      .update(JSON.stringify(entryData))
      .digest('hex');

    if (entry.entryHash !== recomputedHash) {
      logger.warn({
        event: 'audit_chain_tampered',
        entryId: entry.id,
        expectedHash: recomputedHash,
        actualHash: entry.entryHash,
      });

      return {
        valid: false,
        totalEntries: entries.length,
        verifiedEntries: verifiedCount,
        brokenAt: {
          entryId: entry.id,
          timestamp: entry.timestamp,
          reason: 'entryHash_mismatch',
        },
      };
    }

    verifiedCount++;
  }

  logger.info({
    event: 'audit_chain_verification_complete',
    valid: true,
    totalEntries: entries.length,
    verifiedEntries: verifiedCount,
  });

  return {
    valid: true,
    totalEntries: entries.length,
    verifiedEntries: verifiedCount,
  };
}

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get audit chain statistics for compliance dashboard
 */
export async function getAuditChainStats(): Promise<{
  totalEntries: number;
  chainedEntries: number;
  unchainedEntries: number;
  oldestChainedEntry: Date | null;
  latestChainedEntry: Date | null;
}> {
  const [total, chained, oldest, latest] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { entryHash: { not: null } } }),
    prisma.auditLog.findFirst({
      where: { entryHash: { not: null } },
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    }),
    prisma.auditLog.findFirst({
      where: { entryHash: { not: null } },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    }),
  ]);

  return {
    totalEntries: total,
    chainedEntries: chained,
    unchainedEntries: total - chained,
    oldestChainedEntry: oldest?.timestamp ?? null,
    latestChainedEntry: latest?.timestamp ?? null,
  };
}

/**
 * Export audit chain verification report for compliance
 */
export async function generateComplianceReport(
  startDate: Date,
  endDate: Date
): Promise<{
  period: { start: Date; end: Date };
  verification: ChainVerificationResult;
  stats: Awaited<ReturnType<typeof getAuditChainStats>>;
  generatedAt: Date;
}> {
  const [verification, stats] = await Promise.all([
    verifyAuditChain(startDate, endDate),
    getAuditChainStats(),
  ]);

  return {
    period: { start: startDate, end: endDate },
    verification,
    stats,
    generatedAt: new Date(),
  };
}
