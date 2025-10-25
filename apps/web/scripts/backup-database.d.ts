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
export {};
//# sourceMappingURL=backup-database.d.ts.map