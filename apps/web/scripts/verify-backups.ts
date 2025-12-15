#!/usr/bin/env tsx
/**
 * Backup Verification Script
 *
 * Verifies integrity and availability of database backups.
 * Checks local and cloud storage for backup health.
 *
 * Usage:
 *   tsx scripts/verify-backups.ts [options]
 *
 * Options:
 *   --local-only         Check local backups only
 *   --cloud-only         Check cloud backups only
 *   --verbose            Show detailed output
 *   --alert-on-failure   Send alert to monitoring system
 *
 * Exit Codes:
 *   0 - All checks passed
 *   1 - Warnings detected (non-critical)
 *   2 - Errors detected (critical)
 *
 * Schedule in crontab:
 *   0 6 * * * cd /path/to/app && tsx scripts/verify-backups.ts --alert-on-failure
 */

import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';

// Configuration
const BACKUP_DIR = join(process.cwd(), 'backups');
const MAX_AGE_HOURS = 48; // Alert if latest backup is older than 48 hours
const MIN_SIZE_MB = 1; // Alert if backup is smaller than 1MB (likely corrupted)
const EXPECTED_RETENTION = {
  daily: 7,
  weekly: 4,
  monthly: 12,
};

interface VerificationOptions {
  localOnly: boolean;
  cloudOnly: boolean;
  verbose: boolean;
  alertOnFailure: boolean;
}

interface BackupInfo {
  name: string;
  path: string;
  size: number;
  ageHours: number;
  type: 'daily' | 'weekly' | 'monthly';
  checksum?: string;
}

interface VerificationResult {
  status: 'healthy' | 'warning' | 'error';
  localBackups: BackupInfo[];
  cloudBackups: { [key: string]: any[] };
  warnings: string[];
  errors: string[];
  summary: {
    totalLocal: number;
    totalCloud: number;
    oldestBackupAge: number;
    newestBackupAge: number;
    totalStorageUsed: number;
  };
}

/**
 * Parse command line arguments
 */
function parseArgs(): VerificationOptions {
  const args = process.argv.slice(2);

  return {
    localOnly: args.includes('--local-only'),
    cloudOnly: args.includes('--cloud-only'),
    verbose: args.includes('--verbose'),
    alertOnFailure: args.includes('--alert-on-failure'),
  };
}

/**
 * Get S3 client for cloud storage
 */
function getS3Client(): S3Client | null {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT || process.env.S3_ENDPOINT;

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    return null;
  }

  return new S3Client({
    region: process.env.R2_REGION || process.env.AWS_REGION || 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Calculate file checksum
 */
function calculateChecksum(filePath: string): string {
  const fileBuffer = readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Parse backup filename to extract metadata
 */
function parseBackupFilename(filename: string): { type: 'daily' | 'weekly' | 'monthly'; date: Date } | null {
  // Format: backup-{type}-YYYY-MM-DD-HH-MM-SS.sql.gz
  const regex = /backup-(daily|weekly|monthly)-(\d{4}-\d{2}-\d{2})-(\d{2}-\d{2}-\d{2})\.sql\.gz/;
  const match = filename.match(regex);

  if (!match) {
    return null;
  }

  const [, type, date, time] = match;
  const dateTimeStr = `${date}T${time.replace(/-/g, ':')}Z`;

  return {
    type: type as 'daily' | 'weekly' | 'monthly',
    date: new Date(dateTimeStr),
  };
}

/**
 * Verify local backups
 */
function verifyLocalBackups(verbose: boolean): {
  backups: BackupInfo[];
  warnings: string[];
  errors: string[];
} {
  const backups: BackupInfo[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (verbose) {
    console.log('\n🔍 Checking local backups...');
  }

  // Check if backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    errors.push(`Backup directory does not exist: ${BACKUP_DIR}`);
    return { backups, warnings, errors };
  }

  // Read all backup files
  const files = readdirSync(BACKUP_DIR).filter(
    (file) => file.endsWith('.sql.gz') && file.startsWith('backup-')
  );

  if (files.length === 0) {
    warnings.push('No backup files found in local directory');
  }

  // Analyze each backup
  for (const file of files) {
    const filePath = join(BACKUP_DIR, file);
    const stats = statSync(filePath);
    const parsed = parseBackupFilename(file);

    if (!parsed) {
      warnings.push(`Invalid backup filename format: ${file}`);
      continue;
    }

    const ageMs = Date.now() - parsed.date.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    const sizeMB = stats.size / (1024 * 1024);

    const backup: BackupInfo = {
      name: file,
      path: filePath,
      size: stats.size,
      ageHours,
      type: parsed.type,
    };

    // Calculate checksum for recent backups
    if (ageHours < 168) { // Last 7 days
      try {
        backup.checksum = calculateChecksum(filePath);
      } catch (error) {
        warnings.push(`Failed to calculate checksum for ${file}: ${error}`);
      }
    }

    backups.push(backup);

    // Check for issues
    if (sizeMB < MIN_SIZE_MB) {
      errors.push(`Backup file too small (possible corruption): ${file} (${sizeMB.toFixed(2)} MB)`);
    }

    if (verbose) {
      console.log(`  ✓ ${file} (${sizeMB.toFixed(2)} MB, ${ageHours.toFixed(1)} hours old)`);
    }
  }

  // Check retention policy compliance
  const backupsByType = {
    daily: backups.filter((b) => b.type === 'daily').length,
    weekly: backups.filter((b) => b.type === 'weekly').length,
    monthly: backups.filter((b) => b.type === 'monthly').length,
  };

  for (const [type, expected] of Object.entries(EXPECTED_RETENTION)) {
    const actual = backupsByType[type as keyof typeof backupsByType];
    if (actual < expected) {
      warnings.push(
        `Insufficient ${type} backups: expected ${expected}, found ${actual}`
      );
    }
  }

  // Check age of newest backup
  if (backups.length > 0) {
    const newestBackup = backups.reduce((prev, current) =>
      current.ageHours < prev.ageHours ? current : prev
    );

    if (newestBackup.ageHours > MAX_AGE_HOURS) {
      errors.push(
        `Latest backup is too old: ${newestBackup.name} (${newestBackup.ageHours.toFixed(1)} hours old)`
      );
    }
  }

  return { backups, warnings, errors };
}

/**
 * Verify cloud backups
 */
async function verifyCloudBackups(
  verbose: boolean
): Promise<{
  backupsByType: { [key: string]: any[] };
  warnings: string[];
  errors: string[];
}> {
  const backupsByType: { [key: string]: any[] } = {
    daily: [],
    weekly: [],
    monthly: [],
  };
  const warnings: string[] = [];
  const errors: string[] = [];

  if (verbose) {
    console.log('\n☁️  Checking cloud backups...');
  }

  const s3Client = getS3Client();

  if (!s3Client) {
    warnings.push('Cloud storage credentials not configured - skipping cloud verification');
    return { backupsByType, warnings, errors };
  }

  const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET || 'holi-labs-backups';

  try {
    // Test connectivity
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: 'database/',
    });

    const response = await s3Client.send(listCommand);

    if (!response.Contents || response.Contents.length === 0) {
      warnings.push('No backups found in cloud storage');
      return { backupsByType, warnings, errors };
    }

    // Analyze cloud backups
    for (const obj of response.Contents) {
      if (!obj.Key || !obj.Key.endsWith('.sql.gz')) {
        continue;
      }

      const filename = obj.Key.split('/').pop()!;
      const parsed = parseBackupFilename(filename);

      if (!parsed) {
        warnings.push(`Invalid cloud backup filename: ${filename}`);
        continue;
      }

      const ageMs = Date.now() - (obj.LastModified?.getTime() || 0);
      const ageHours = ageMs / (1000 * 60 * 60);
      const sizeMB = (obj.Size || 0) / (1024 * 1024);

      backupsByType[parsed.type].push({
        name: filename,
        key: obj.Key,
        size: obj.Size,
        sizeMB,
        ageHours,
        lastModified: obj.LastModified,
      });

      // Check for issues
      if (sizeMB < MIN_SIZE_MB) {
        errors.push(
          `Cloud backup file too small (possible corruption): ${filename} (${sizeMB.toFixed(2)} MB)`
        );
      }

      if (verbose) {
        console.log(`  ✓ ${filename} (${sizeMB.toFixed(2)} MB, ${ageHours.toFixed(1)} hours old)`);
      }
    }

    // Check retention policy compliance
    for (const [type, expected] of Object.entries(EXPECTED_RETENTION)) {
      const actual = backupsByType[type].length;
      if (actual < expected) {
        warnings.push(
          `Insufficient ${type} backups in cloud: expected ${expected}, found ${actual}`
        );
      }
    }

    // Verify checksums for recent backups (if metadata available)
    for (const type of ['daily', 'weekly', 'monthly']) {
      for (const backup of backupsByType[type]) {
        if (backup.ageHours < 168) { // Last 7 days
          try {
            const headCommand = new HeadObjectCommand({
              Bucket: bucket,
              Key: backup.key,
            });
            const headResponse = await s3Client.send(headCommand);

            if (headResponse.Metadata?.checksum) {
              backup.checksum = headResponse.Metadata.checksum;
              if (verbose) {
                console.log(`    Checksum: ${backup.checksum}`);
              }
            }
          } catch (error) {
            warnings.push(`Failed to get metadata for ${backup.name}`);
          }
        }
      }
    }
  } catch (error) {
    errors.push(`Cloud storage verification failed: ${error}`);
  }

  return { backupsByType, warnings, errors };
}

/**
 * Generate verification report
 */
function generateReport(result: VerificationResult): void {
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 Backup Verification Report');
  console.log('═'.repeat(60));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('');

  // Local backups summary
  console.log('📁 Local Backups:');
  if (result.localBackups.length === 0) {
    console.log('  ⚠️  No local backups found');
  } else {
    const dailyLocal = result.localBackups.filter((b) => b.type === 'daily').length;
    const weeklyLocal = result.localBackups.filter((b) => b.type === 'weekly').length;
    const monthlyLocal = result.localBackups.filter((b) => b.type === 'monthly').length;

    console.log(`  Total: ${result.localBackups.length}`);
    console.log(`  Daily: ${dailyLocal}/${EXPECTED_RETENTION.daily}`);
    console.log(`  Weekly: ${weeklyLocal}/${EXPECTED_RETENTION.weekly}`);
    console.log(`  Monthly: ${monthlyLocal}/${EXPECTED_RETENTION.monthly}`);

    if (result.localBackups.length > 0) {
      const newestLocal = result.localBackups.reduce((prev, current) =>
        current.ageHours < prev.ageHours ? current : prev
      );
      console.log(`  Newest: ${newestLocal.name} (${newestLocal.ageHours.toFixed(1)} hours old)`);
    }
  }

  console.log('');

  // Cloud backups summary
  console.log('☁️  Cloud Backups:');
  const totalCloud =
    result.cloudBackups.daily.length +
    result.cloudBackups.weekly.length +
    result.cloudBackups.monthly.length;

  if (totalCloud === 0) {
    console.log('  ⚠️  No cloud backups found (or cloud storage not configured)');
  } else {
    console.log(`  Total: ${totalCloud}`);
    console.log(`  Daily: ${result.cloudBackups.daily.length}/${EXPECTED_RETENTION.daily}`);
    console.log(`  Weekly: ${result.cloudBackups.weekly.length}/${EXPECTED_RETENTION.weekly}`);
    console.log(`  Monthly: ${result.cloudBackups.monthly.length}/${EXPECTED_RETENTION.monthly}`);

    // Find newest cloud backup
    const allCloudBackups = [
      ...result.cloudBackups.daily,
      ...result.cloudBackups.weekly,
      ...result.cloudBackups.monthly,
    ];
    if (allCloudBackups.length > 0) {
      const newestCloud = allCloudBackups.reduce((prev, current) =>
        current.ageHours < prev.ageHours ? current : prev
      );
      console.log(`  Newest: ${newestCloud.name} (${newestCloud.ageHours.toFixed(1)} hours old)`);
    }
  }

  console.log('');

  // Storage summary
  console.log('💾 Storage Summary:');
  const totalStorageGB = result.summary.totalStorageUsed / (1024 * 1024 * 1024);
  console.log(`  Total Storage Used: ${totalStorageGB.toFixed(2)} GB`);
  console.log(`  Oldest Backup: ${result.summary.oldestBackupAge.toFixed(1)} hours`);
  console.log(`  Newest Backup: ${result.summary.newestBackupAge.toFixed(1)} hours`);

  console.log('');

  // Warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    for (const warning of result.warnings) {
      console.log(`  • ${warning}`);
    }
    console.log('');
  }

  // Errors
  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    for (const error of result.errors) {
      console.log(`  • ${error}`);
    }
    console.log('');
  }

  // Overall status
  console.log('═'.repeat(60));
  if (result.status === 'healthy') {
    console.log('Overall Status: ✅ HEALTHY');
  } else if (result.status === 'warning') {
    console.log('Overall Status: ⚠️  WARNING (non-critical issues detected)');
  } else {
    console.log('Overall Status: ❌ ERROR (critical issues detected)');
  }
  console.log('═'.repeat(60));
  console.log('');
}

/**
 * Send alert to monitoring system
 */
async function sendAlert(result: VerificationResult): Promise<void> {
  // Send to Sentry if configured
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    try {
      // Dynamic import to avoid loading Sentry in environments where it's not needed
      const Sentry = await import('@sentry/node');

      if (result.status === 'error') {
        Sentry.captureMessage('Backup verification failed', {
          level: 'error',
          extra: {
            errors: result.errors,
            warnings: result.warnings,
            summary: result.summary,
          },
        });
      } else if (result.status === 'warning') {
        Sentry.captureMessage('Backup verification warnings', {
          level: 'warning',
          extra: {
            warnings: result.warnings,
            summary: result.summary,
          },
        });
      }

      console.log('✅ Alert sent to Sentry');
    } catch (error) {
      console.warn('⚠️  Failed to send alert to Sentry:', error);
    }
  } else {
    console.log('ℹ️  Sentry not configured - skipping alert');
  }

  // Log to stdout for centralized logging systems
  console.log(
    JSON.stringify({
      event: 'backup_verification',
      timestamp: new Date().toISOString(),
      status: result.status,
      errors: result.errors,
      warnings: result.warnings,
      summary: result.summary,
    })
  );
}

/**
 * Main verification function
 */
async function main() {
  const options = parseArgs();

  console.log('🚀 Backup Verification Script');
  console.log(`   Mode: ${options.localOnly ? 'Local Only' : options.cloudOnly ? 'Cloud Only' : 'Full'}`);
  console.log(`   Verbose: ${options.verbose}`);
  console.log(`   Alert on Failure: ${options.alertOnFailure}`);

  const result: VerificationResult = {
    status: 'healthy',
    localBackups: [],
    cloudBackups: {
      daily: [],
      weekly: [],
      monthly: [],
    },
    warnings: [],
    errors: [],
    summary: {
      totalLocal: 0,
      totalCloud: 0,
      oldestBackupAge: 0,
      newestBackupAge: 0,
      totalStorageUsed: 0,
    },
  };

  try {
    // Verify local backups
    if (!options.cloudOnly) {
      const localResult = verifyLocalBackups(options.verbose);
      result.localBackups = localResult.backups;
      result.warnings.push(...localResult.warnings);
      result.errors.push(...localResult.errors);
      result.summary.totalLocal = localResult.backups.length;
    }

    // Verify cloud backups
    if (!options.localOnly) {
      const cloudResult = await verifyCloudBackups(options.verbose);
      result.cloudBackups = cloudResult.backupsByType;
      result.warnings.push(...cloudResult.warnings);
      result.errors.push(...cloudResult.errors);
      result.summary.totalCloud =
        cloudResult.backupsByType.daily.length +
        cloudResult.backupsByType.weekly.length +
        cloudResult.backupsByType.monthly.length;
    }

    // Calculate summary statistics
    const allBackups = [
      ...result.localBackups.map((b) => ({ ageHours: b.ageHours, size: b.size })),
      ...(result.cloudBackups.daily || []).map((b: any) => ({ ageHours: b.ageHours, size: b.size })),
      ...(result.cloudBackups.weekly || []).map((b: any) => ({ ageHours: b.ageHours, size: b.size })),
      ...(result.cloudBackups.monthly || []).map((b: any) => ({ ageHours: b.ageHours, size: b.size })),
    ];

    if (allBackups.length > 0) {
      result.summary.oldestBackupAge = Math.max(...allBackups.map((b) => b.ageHours));
      result.summary.newestBackupAge = Math.min(...allBackups.map((b) => b.ageHours));
      result.summary.totalStorageUsed = allBackups.reduce((sum, b) => sum + b.size, 0);
    }

    // Determine overall status
    if (result.errors.length > 0) {
      result.status = 'error';
    } else if (result.warnings.length > 0) {
      result.status = 'warning';
    }

    // Generate report
    generateReport(result);

    // Send alerts if configured
    if (options.alertOnFailure && result.status !== 'healthy') {
      await sendAlert(result);
    }

    // Exit with appropriate code
    if (result.status === 'error') {
      process.exit(2);
    } else if (result.status === 'warning') {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('');
    console.error('❌ Verification failed with exception:', error);
    result.errors.push(`Unexpected error: ${error}`);
    result.status = 'error';

    if (options.alertOnFailure) {
      await sendAlert(result);
    }

    process.exit(2);
  }
}

// Run main function
main();
