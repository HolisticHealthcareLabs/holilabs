#!/usr/bin/env tsx
/**
 * Database Backup Script
 *
 * Creates automated PostgreSQL backups and uploads to S3/Cloudflare R2
 * Implements retention policies: 7 daily, 4 weekly, 12 monthly
 *
 * Usage:
 *   tsx scripts/backup-database.ts [options]
 *
 * Options:
 *   --type=daily|weekly|monthly  Backup type (default: daily)
 *   --upload                     Upload to cloud storage
 *   --local-only                 Keep backup local only
 *   --cleanup                    Clean up old backups based on retention policy
 *
 * Environment Variables Required:
 *   DATABASE_URL                 PostgreSQL connection string
 *   R2_ACCESS_KEY_ID            Cloudflare R2 or AWS S3 access key
 *   R2_SECRET_ACCESS_KEY        Cloudflare R2 or AWS S3 secret key
 *   R2_ENDPOINT                 Cloudflare R2 or AWS S3 endpoint
 *   R2_BUCKET                   Bucket name for backups
 */

import { execSync } from 'child_process';
import { readFileSync, unlinkSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';

// Configuration
const BACKUP_DIR = join(process.cwd(), 'backups');
const RETENTION_POLICY = {
  daily: 7,    // Keep 7 daily backups
  weekly: 4,   // Keep 4 weekly backups (1 month)
  monthly: 12, // Keep 12 monthly backups (1 year)
};

interface BackupOptions {
  type: 'daily' | 'weekly' | 'monthly';
  upload: boolean;
  localOnly: boolean;
  cleanup: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): BackupOptions {
  const args = process.argv.slice(2);

  const options: BackupOptions = {
    type: 'daily',
    upload: false,
    localOnly: false,
    cleanup: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      const type = arg.split('=')[1] as 'daily' | 'weekly' | 'monthly';
      if (['daily', 'weekly', 'monthly'].includes(type)) {
        options.type = type;
      }
    } else if (arg === '--upload') {
      options.upload = true;
    } else if (arg === '--local-only') {
      options.localOnly = true;
    } else if (arg === '--cleanup') {
      options.cleanup = true;
    }
  }

  return options;
}

/**
 * Get S3 client
 */
function getS3Client(): S3Client | null {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT || process.env.S3_ENDPOINT;

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    console.warn('⚠️  Cloud storage credentials not configured. Skipping upload.');
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
 * Create backup filename
 */
function getBackupFilename(type: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
  const timeStr = now.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');

  return `backup-${type}-${timestamp}-${timeStr}.sql.gz`;
}

/**
 * Create PostgreSQL backup using pg_dump
 */
function createBackup(filename: string): string {
  console.log('📦 Creating database backup...');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const backupPath = join(BACKUP_DIR, filename);

  try {
    // Use pg_dump to create backup and gzip to compress
    // --no-owner: Don't output commands to set ownership
    // --no-acl: Don't output access control list commands
    // --clean: Clean (drop) database objects before recreating
    // --if-exists: Use IF EXISTS when dropping objects
    const command = `pg_dump "${databaseUrl}" --no-owner --no-acl --clean --if-exists | gzip > "${backupPath}"`;

    execSync(command, { stdio: 'inherit' });

    const stats = statSync(backupPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`✅ Backup created: ${filename} (${sizeMB} MB)`);

    return backupPath;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

/**
 * Calculate file checksum (SHA-256)
 */
function calculateChecksum(filePath: string): string {
  const fileBuffer = readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Upload backup to S3/R2
 */
async function uploadBackup(filePath: string, filename: string): Promise<void> {
  console.log('☁️  Uploading backup to cloud storage...');

  const s3Client = getS3Client();

  if (!s3Client) {
    throw new Error('Cloud storage not configured');
  }

  const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET || 'holi-labs-backups';
  const fileBuffer = readFileSync(filePath);
  const checksum = calculateChecksum(filePath);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `database/${filename}`,
        Body: fileBuffer,
        ContentType: 'application/gzip',
        Metadata: {
          checksum: checksum,
          createdAt: new Date().toISOString(),
          size: fileBuffer.length.toString(),
        },
        ServerSideEncryption: 'AES256',
      })
    );

    console.log(`✅ Uploaded to cloud storage: ${filename}`);
    console.log(`   Checksum: ${checksum}`);
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

/**
 * Clean up old local backups
 */
function cleanupLocalBackups(type: string): void {
  console.log(`🧹 Cleaning up old ${type} backups...`);

  if (!existsSync(BACKUP_DIR)) {
    return;
  }

  const files = readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith(`backup-${type}-`) && file.endsWith('.sql.gz'))
    .map(file => ({
      name: file,
      path: join(BACKUP_DIR, file),
      time: statSync(join(BACKUP_DIR, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time); // Sort by newest first

  const retention = RETENTION_POLICY[type as keyof typeof RETENTION_POLICY];
  const toDelete = files.slice(retention); // Keep only the retention number

  if (toDelete.length === 0) {
    console.log('✅ No old backups to clean up');
    return;
  }

  for (const file of toDelete) {
    try {
      unlinkSync(file.path);
      console.log(`🗑️  Deleted old backup: ${file.name}`);
    } catch (error) {
      console.error(`❌ Failed to delete ${file.name}:`, error);
    }
  }

  console.log(`✅ Cleaned up ${toDelete.length} old backup(s)`);
}

/**
 * Clean up old cloud backups
 */
async function cleanupCloudBackups(type: string): Promise<void> {
  console.log(`🧹 Cleaning up old ${type} backups from cloud...`);

  const s3Client = getS3Client();

  if (!s3Client) {
    console.log('⚠️  Cloud storage not configured. Skipping cloud cleanup.');
    return;
  }

  const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET || 'holi-labs-backups';

  try {
    // List all backups of this type
    const listResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `database/backup-${type}-`,
      })
    );

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('✅ No old cloud backups to clean up');
      return;
    }

    // Sort by last modified (newest first)
    const backups = listResponse.Contents
      .filter(obj => obj.Key && obj.Key.endsWith('.sql.gz'))
      .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));

    const retention = RETENTION_POLICY[type as keyof typeof RETENTION_POLICY];
    const toDelete = backups.slice(retention);

    if (toDelete.length === 0) {
      console.log('✅ No old cloud backups to clean up');
      return;
    }

    // Delete old backups
    for (const backup of toDelete) {
      if (!backup.Key) continue;

      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: backup.Key,
          })
        );
        console.log(`🗑️  Deleted old cloud backup: ${backup.Key}`);
      } catch (error) {
        console.error(`❌ Failed to delete ${backup.Key}:`, error);
      }
    }

    console.log(`✅ Cleaned up ${toDelete.length} old cloud backup(s)`);
  } catch (error) {
    console.error('❌ Cloud cleanup failed:', error);
    throw error;
  }
}

/**
 * Main backup function
 */
async function main() {
  const options = parseArgs();

  console.log('🚀 Database Backup Script');
  console.log(`   Type: ${options.type}`);
  console.log(`   Upload: ${options.upload || !options.localOnly}`);
  console.log(`   Cleanup: ${options.cleanup}`);
  console.log('');

  try {
    // Create backup
    const filename = getBackupFilename(options.type);
    const backupPath = createBackup(filename);

    // Upload to cloud (unless local-only)
    if (!options.localOnly) {
      try {
        await uploadBackup(backupPath, filename);
      } catch (uploadError) {
        console.warn('⚠️  Upload failed, but backup is saved locally');
      }
    }

    // Cleanup old backups
    if (options.cleanup) {
      cleanupLocalBackups(options.type);

      if (!options.localOnly) {
        try {
          await cleanupCloudBackups(options.type);
        } catch (cleanupError) {
          console.warn('⚠️  Cloud cleanup failed');
        }
      }
    }

    console.log('');
    console.log('✅ Backup completed successfully!');
    console.log(`   Backup file: ${backupPath}`);

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

// Run main function
main();
