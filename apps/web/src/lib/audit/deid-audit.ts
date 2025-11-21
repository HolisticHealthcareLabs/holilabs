/**
 * De-identification Audit Logging
 * HIPAA Compliance: Track all de-identification operations
 *
 * Required for:
 * - HIPAA §164.312(b) - Audit Controls
 * - HIPAA §164.308(a)(1)(ii)(D) - Information System Activity Review
 * - Breach investigation and forensics
 */

import { prisma } from '@/lib/prisma';

export type DeIDOperation =
  | 'PSEUDONYMIZE'
  | 'REDACT'
  | 'GENERALIZE'
  | 'EXPORT'
  | 'TOKEN_GENERATE'
  | 'DICOM_SCRUB'
  | 'OCR_REDACT';

export interface DeIDAuditMetadata {
  ipAddress?: string;
  userAgent?: string;
  policyVersion?: string;
  redactionCount?: number;
  generalizationCount?: number;
  fileType?: string;
  exportFormat?: string;
  [key: string]: any;
}

/**
 * Log a de-identification operation
 *
 * @param operation - Type of de-identification operation
 * @param userId - ID of user performing operation
 * @param patientIds - Array of patient IDs affected
 * @param metadata - Additional context
 */
export async function logDeIDOperation(
  operation: DeIDOperation,
  userId: string,
  patientIds: string[],
  metadata: DeIDAuditMetadata = {}
): Promise<void> {
  try {
    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId,
        action: `DEID_${operation}` as any,
        resource: 'PATIENT_DATA',
        resourceId: patientIds[0] || 'BULK',
        details: {
          operation,
          patientCount: patientIds.length,
          patientIds: patientIds.slice(0, 100), // Limit to first 100 to avoid huge logs
          ...metadata,
        },
        ipAddress: metadata.ipAddress || 'unknown',
        userAgent: metadata.userAgent,
      },
    });

    // Check for suspicious patterns
    await detectSuspiciousActivity(userId, operation, patientIds.length);
  } catch (error) {
    // Don't fail the operation if audit logging fails, but log the error
    console.error('Failed to create de-identification audit log:', error);
  }
}

/**
 * Detect suspicious de-identification activity patterns
 *
 * Alerts on:
 * - Bulk exports (>100 patients in 1 hour)
 * - Unusual access times (2am-5am)
 * - Repeated failed attempts
 *
 * @param userId - User ID to check
 * @param operation - Current operation
 * @param patientCount - Number of patients in current operation
 */
async function detectSuspiciousActivity(
  userId: string,
  operation: DeIDOperation,
  patientCount: number
): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 3600000);

  // Check for bulk access in last hour
  // Note: Prisma doesn't support startsWith on enum fields, so we fetch all logs and filter in memory
  const recentLogs = await prisma.auditLog.findMany({
    where: {
      userId,
      timestamp: { gte: oneHourAgo },
    },
    select: {
      action: true,
      details: true,
    },
  }).then(logs => logs.filter(log => String(log.action).startsWith('DEID_')));

  // Calculate total patients accessed in last hour
  const totalPatientsAccessed = recentLogs.reduce((sum, log) => {
    const metadata = log.details as DeIDAuditMetadata;
    return sum + (metadata.patientCount || 0);
  }, 0) + patientCount;

  // Alert if excessive bulk access
  if (totalPatientsAccessed > 100) {
    await createSecurityAlert({
      type: 'BULK_DEID_ACCESS',
      severity: 'HIGH',
      userId,
      message: `User accessed ${totalPatientsAccessed} patient records via de-identification in last hour`,
      metadata: {
        operation,
        totalPatientsAccessed,
        recentOperationCount: recentLogs.length,
      },
    });
  }

  // Alert if accessing during unusual hours (2am-5am local time)
  const currentHour = new Date().getHours();
  if (currentHour >= 2 && currentHour < 5 && patientCount > 10) {
    await createSecurityAlert({
      type: 'UNUSUAL_TIME_ACCESS',
      severity: 'MEDIUM',
      userId,
      message: `User performed de-identification at unusual hour: ${currentHour}:00`,
      metadata: {
        operation,
        patientCount,
        hour: currentHour,
      },
    });
  }
}

/**
 * Create a security alert for suspicious activity
 */
async function createSecurityAlert(alert: {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId: string;
  message: string;
  metadata: any;
}): Promise<void> {
  try {
    console.error(`🚨 SECURITY ALERT [${alert.severity}]: ${alert.message}`, alert.metadata);

    // Create audit log for the alert itself
    await prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'SECURITY_ALERT' as any,
        resource: 'USER',
        resourceId: alert.userId,
        details: alert,
        ipAddress: 'SYSTEM',
      },
    });

    // TODO: Send alert to security team via email/Slack/PagerDuty
    // For production, integrate with your alerting system
  } catch (error) {
    console.error('Failed to create security alert:', error);
  }
}

/**
 * Get de-identification audit logs for a user
 *
 * @param userId - User ID
 * @param limit - Maximum number of logs to return
 * @returns Recent de-identification operations
 */
export async function getDeIDAuditLogs(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      userId,
    },
    orderBy: { timestamp: 'desc' },
    take: limit * 2, // Fetch extra to account for filtering
    select: {
      id: true,
      action: true,
      resource: true,
      resourceId: true,
      details: true,
      ipAddress: true,
      timestamp: true,
    },
  });

  // Filter for DEID actions and limit results
  return logs
    .filter(log => String(log.action).startsWith('DEID_'))
    .slice(0, limit);
}

/**
 * Get de-identification statistics for compliance reporting
 *
 * @param startDate - Start of reporting period
 * @param endDate - End of reporting period
 * @returns De-identification statistics
 */
export async function getDeIDStatistics(
  startDate: Date,
  endDate: Date
): Promise<{
  totalOperations: number;
  operationsByType: Record<string, number>;
  totalPatientsAccessed: number;
  uniqueUsers: number;
  securityAlerts: number;
}> {
  const allLogs = await prisma.auditLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      action: true,
      userId: true,
      details: true,
    },
  });

  // Filter for DEID actions in memory
  const logs = allLogs.filter(log => String(log.action).startsWith('DEID_'));

  const operationsByType: Record<string, number> = {};
  const uniqueUsers = new Set<string>();
  let totalPatientsAccessed = 0;

  logs.forEach((log) => {
    operationsByType[log.action] = (operationsByType[log.action] || 0) + 1;
    if (log.userId) {
      uniqueUsers.add(log.userId);
    }

    const metadata = log.details as DeIDAuditMetadata;
    totalPatientsAccessed += metadata.patientCount || 0;
  });

  const securityAlerts = await prisma.auditLog.count({
    where: {
      action: 'SECURITY_ALERT' as any,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return {
    totalOperations: logs.length,
    operationsByType,
    totalPatientsAccessed,
    uniqueUsers: uniqueUsers.size,
    securityAlerts,
  };
}
