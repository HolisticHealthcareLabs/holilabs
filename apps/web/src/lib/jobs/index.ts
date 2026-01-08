/**
 * Jobs Index
 *
 * Central export point for all background jobs
 */

// Audit archival jobs (HIPAA compliance)
export {
  archiveOldAuditLogs,
  deleteExpiredAuditLogs,
  archiveAuditLogsByDateRange,
  getArchivalStatistics,
  type ArchiveMetadata,
  type ArchiveResult,
  type DeletionResult,
} from './audit-archival';

// Correction aggregation jobs (ML training)
export {
  aggregateDailyCorrections,
  aggregateCorrectionsRange,
} from './correction-aggregation';

// Appointment scheduler (cron-based)
export {
  startAppointmentScheduler,
  stopAppointmentScheduler,
  getSchedulerStatus,
  triggerManualReminders,
  executeDailyReminders,
} from './appointment-scheduler';
