/**
 * Data Retention Automation
 *
 * Automated enforcement of data retention policies per HIPAA and LGPD requirements
 *
 * @compliance HIPAA §164.530(j) - Audit logs retained for 6 years
 * @compliance LGPD Art. 15 - Data deleted after purpose fulfilled
 * @compliance LGPD Art. 16 - Right to deletion
 *
 * Schedule: Weekly (every Sunday at 2 AM)
 * Cron: "0 2 * * 0"
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

interface RetentionStats {
  auditLogsArchived: number;
  auditLogsDeleted: number;
  patientsInactivated: number;
  exportsDeleted: number;
  sessionsDeleted: number;
}

/**
 * Main data retention enforcement function
 * Run this weekly via cron job or scheduled task
 */
export async function enforceDataRetention(): Promise<RetentionStats> {
  const now = new Date();
  const stats: RetentionStats = {
    auditLogsArchived: 0,
    auditLogsDeleted: 0,
    patientsInactivated: 0,
    exportsDeleted: 0,
    sessionsDeleted: 0,
  };

  logger.info({
    event: 'data_retention_started',
    timestamp: now.toISOString(),
  });

  try {
    // 1. Archive old audit logs (>6 months)
    stats.auditLogsArchived = await archiveOldAuditLogs(now);

    // 2. Delete archived audit logs (>7 years per HIPAA)
    stats.auditLogsDeleted = await deleteArchivedAuditLogs(now);

    // 3. Mark inactive patients (no visits in 2 years)
    stats.patientsInactivated = await markInactivePatients(now);

    // 4. Delete expired de-identified exports (>30 days)
    stats.exportsDeleted = await deleteExpiredExports(now);

    // 5. Delete expired sessions (>30 days inactive)
    stats.sessionsDeleted = await deleteExpiredSessions(now);

    logger.info({
      event: 'data_retention_completed',
      stats,
      durationMs: Date.now() - now.getTime(),
    });

    return stats;
  } catch (error) {
    logger.error({
      event: 'data_retention_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Archive audit logs older than 6 months
 * Archival = mark as archived, move to cold storage
 */
async function archiveOldAuditLogs(now: Date): Promise<number> {
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  try {
    // TODO: Add 'archived' and 'archivedAt' fields to AuditLog schema
    // For now, we skip archiving since these fields don't exist
    logger.warn({
      event: 'audit_logs_archival_skipped',
      reason: 'archived/archivedAt fields not yet in schema',
    });

    return 0;

    /* Original code - requires schema update:
    const result = await prisma.auditLog.updateMany({
      where: {
        timestamp: { lt: sixMonthsAgo },
        archived: false, // Only archive non-archived logs
      },
      data: {
        archived: true,
        archivedAt: now,
      },
    });

    logger.info({
      event: 'audit_logs_archived',
      count: result.count,
      cutoffDate: sixMonthsAgo.toISOString(),
    });

    return result.count;
    */
  } catch (error) {
    logger.error({
      event: 'archive_audit_logs_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

/**
 * Delete archived audit logs older than 7 years
 * HIPAA §164.530(j) requires 6-year retention minimum
 * We retain for 7 years to be safe, then delete
 */
async function deleteArchivedAuditLogs(now: Date): Promise<number> {
  const sevenYearsAgo = new Date(now);
  sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

  try {
    // Delete audit logs older than 7 years (HIPAA compliance)
    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: sevenYearsAgo },
      },
    });

    logger.info({
      event: 'audit_logs_deleted',
      count: result.count,
      cutoffDate: sevenYearsAgo.toISOString(),
      compliance: 'HIPAA §164.530(j) - 6 year minimum met',
    });

    return result.count;
  } catch (error) {
    logger.error({
      event: 'delete_audit_logs_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

/**
 * Mark patients as inactive if no visits in 2 years
 * Does NOT delete patient records (must be retained per HIPAA)
 * Only marks as inactive for reporting purposes
 */
async function markInactivePatients(now: Date): Promise<number> {
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  try {
    // Find patients with no recent appointments
    const inactivePatients = await prisma.patient.findMany({
      where: {
        isActive: true,
        appointments: {
          every: {
            startTime: { lt: twoYearsAgo },
          },
        },
      },
      select: { id: true },
    });

    if (inactivePatients.length === 0) {
      return 0;
    }

    // Mark as inactive
    // TODO: Add 'inactivatedAt' and 'inactivationReason' fields to Patient schema
    const result = await prisma.patient.updateMany({
      where: {
        id: { in: inactivePatients.map(p => p.id) },
      },
      data: {
        isActive: false,
        // inactivatedAt: now,  // Field not yet in schema
        // inactivationReason: 'AUTO_INACTIVE_NO_VISITS_2Y',  // Field not yet in schema
      },
    });

    logger.info({
      event: 'patients_inactivated',
      count: result.count,
      cutoffDate: twoYearsAgo.toISOString(),
      note: 'Patient records retained per HIPAA, only marked inactive',
    });

    return result.count;
  } catch (error) {
    logger.error({
      event: 'mark_inactive_patients_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

/**
 * Delete expired de-identified exports (older than 30 days)
 * De-identified data exports are temporary and should be deleted
 */
async function deleteExpiredExports(now: Date): Promise<number> {
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    // TODO: Add 'DeIDExport' model to schema for de-identified data exports
    logger.warn({
      event: 'exports_deletion_skipped',
      reason: 'DeIDExport model not yet in schema',
    });

    return 0;

    /* Original code - requires DeIDExport model:
    const result = await prisma.deIDExport.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    logger.info({
      event: 'exports_deleted',
      count: result.count,
      cutoffDate: thirtyDaysAgo.toISOString(),
      type: 'deidentified_exports',
    });

    return result.count;
    */
  } catch (error) {
    logger.error({
      event: 'delete_exports_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

/**
 * Delete expired sessions (older than 30 days)
 * Clean up old session tokens and inactive sessions
 */
async function deleteExpiredSessions(now: Date): Promise<number> {
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    // TODO: Add 'PatientSession' and 'Session' models to schema
    logger.warn({
      event: 'sessions_deletion_skipped',
      reason: 'PatientSession and Session models not yet in schema',
    });

    return 0;

    /* Original code - requires PatientSession and Session models:
    // Delete patient sessions
    const patientSessions = await prisma.patientSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } }, // Expired
          { lastActiveAt: { lt: thirtyDaysAgo } }, // Inactive >30 days
        ],
      },
    });

    // Delete NextAuth sessions (if using database sessions)
    const authSessions = await prisma.session.deleteMany({
      where: {
        expires: { lt: now },
      },
    });

    const totalDeleted = patientSessions.count + authSessions.count;*/

    const totalDeleted = 0;

    logger.info({
      event: 'sessions_deleted',
      count: totalDeleted,
      note: 'Session models not yet in schema',
    });

    return totalDeleted;

    /* Original logging code:
    logger.info({
      event: 'sessions_deleted',
      count: totalDeleted,
      patientSessions: patientSessions.count,
      authSessions: authSessions.count,
      cutoffDate: thirtyDaysAgo.toISOString(),
    });
    */
  } catch (error) {
    logger.error({
      event: 'delete_sessions_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

/**
 * Generate data retention compliance report
 * Run monthly to review retention policies
 */
export async function generateRetentionReport(): Promise<{
  auditLogsTotal: number;
  auditLogsArchived: number;
  patientsTotal: number;
  patientsInactive: number;
  oldestAuditLog: Date | null;
  oldestPatient: Date | null;
}> {
  const [
    auditLogsTotal,
    auditLogsArchived,
    patientsTotal,
    patientsInactive,
    oldestAuditLog,
    oldestPatient,
  ] = await Promise.all([
    prisma.auditLog.count(),
    Promise.resolve(0), // TODO: Add 'archived' field to count archived logs
    prisma.patient.count(),
    prisma.patient.count({ where: { isActive: false } }),
    prisma.auditLog.findFirst({
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    }),
    prisma.patient.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ]);

  const report = {
    auditLogsTotal,
    auditLogsArchived,
    patientsTotal,
    patientsInactive,
    oldestAuditLog: oldestAuditLog?.timestamp || null,
    oldestPatient: oldestPatient?.createdAt || null,
  };

  logger.info({
    event: 'retention_report_generated',
    report,
  });

  return report;
}
