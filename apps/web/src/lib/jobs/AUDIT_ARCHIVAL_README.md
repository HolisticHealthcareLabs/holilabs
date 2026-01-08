# HIPAA-Compliant Audit Log Archival System

## Overview

This system provides automated archival and retention management for audit logs in compliance with HIPAA requirements (45 CFR § 164.316(b)(2)(i)), which mandates a 6-year retention period for audit logs.

## Features

1. **Daily Archival**: Automatically archives logs older than 1 year to compressed JSON files
2. **Annual Deletion**: Automatically deletes logs older than 6 years
3. **GZIP Compression**: Reduces storage requirements by compressing archives
4. **Atomic Operations**: Uses database transactions to ensure data integrity
5. **Batch Processing**: Handles large datasets efficiently without memory issues
6. **Manual Triggers**: Allows admin users to manually trigger archival or deletion

## Architecture

### Components

1. **Job Logic** (`audit-archival.ts`)
   - Core archival and deletion functions
   - File system management
   - Compression handling

2. **BullMQ Worker** (`audit-archival.worker.ts`)
   - Processes background jobs
   - Handles job retries and failures
   - Provides progress tracking

3. **Scheduler** (`scheduler.ts`)
   - Schedules recurring jobs using cron expressions
   - Manages job triggers

4. **Queue Configuration** (`config.ts`, `queues.ts`)
   - Defines queue names and settings
   - Manages Redis connections

## Job Schedules

### Daily Archival Job
- **Schedule**: Every day at 2:00 AM
- **Cron**: `0 2 * * *`
- **Action**: Archives logs older than 1 year (default: 365 days)
- **Output**: Compressed JSON files in `/var/log/audit-archives/`

### Annual Deletion Job
- **Schedule**: January 1st at 3:00 AM every year
- **Cron**: `0 3 1 1 *`
- **Action**: Permanently deletes logs older than 6 years (default: 2190 days)
- **Warning**: This is an irreversible operation

## Archive Format

Archives are stored as GZIP-compressed JSON files with the following structure:

```json
{
  "archivalDate": "2026-01-07T00:00:00Z",
  "recordCount": 1000,
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2025-01-01T00:00:00Z",
  "logs": [
    {
      "id": "cuid_12345",
      "userId": "user_123",
      "action": "READ",
      "resource": "Patient",
      "resourceId": "patient_456",
      "timestamp": "2024-06-15T10:30:00Z",
      ...
    }
  ]
}
```

### File Naming Convention

- **Daily Archives**: `audit-logs-YYYY-MM-DD-timestamp.json.gz`
- **Manual Archives**: `audit-logs-manual-YYYY-MM-DD-timestamp.json.gz`

## Configuration

### Environment Variables

```bash
# Archive directory (default: /var/log/audit-archives)
AUDIT_ARCHIVE_PATH=/var/log/audit-archives

# Age threshold for archival in days (default: 365 = 1 year)
AUDIT_ARCHIVAL_AGE_DAYS=365

# Age threshold for deletion in days (default: 2190 = 6 years)
AUDIT_DELETION_AGE_DAYS=2190

# Batch size for processing (default: 1000)
AUDIT_BATCH_SIZE=1000

# Redis configuration (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
REDIS_TLS=true

# Queue concurrency (default: 5)
QUEUE_CONCURRENCY=5
```

### Directory Setup

Ensure the archive directory exists with proper permissions:

```bash
# Create archive directory
sudo mkdir -p /var/log/audit-archives

# Set ownership (replace with your app user)
sudo chown -R app-user:app-user /var/log/audit-archives

# Set permissions (owner read/write/execute only)
sudo chmod 700 /var/log/audit-archives
```

## Usage

### Automatic Initialization

The system is automatically initialized when the application starts. Add this to your application startup:

```typescript
import { initializeScheduledJobs } from '@/lib/queue/scheduler';
import { startAllWorkers } from '@/lib/queue/workers';

// Initialize scheduled jobs
await initializeScheduledJobs();

// Start background workers
startAllWorkers();
```

### Manual Triggers

#### Trigger Immediate Archival

```typescript
import { triggerImmediateAuditArchival } from '@/lib/queue/scheduler';

// Archive all logs older than 1 year
const jobId = await triggerImmediateAuditArchival();
console.log(`Archival job started: ${jobId}`);

// Archive specific date range
const jobId = await triggerImmediateAuditArchival(
  new Date('2023-01-01'),
  new Date('2024-01-01')
);
```

#### Trigger Immediate Deletion

```typescript
import { triggerImmediateAuditDeletion } from '@/lib/queue/scheduler';

// Delete all logs older than 6 years
const jobId = await triggerImmediateAuditDeletion();
console.log(`Deletion job started: ${jobId}`);
```

#### Direct Function Calls (for testing)

```typescript
import {
  archiveOldAuditLogs,
  deleteExpiredAuditLogs,
  archiveAuditLogsByDateRange,
  getArchivalStatistics,
} from '@/lib/jobs/audit-archival';

// Archive old logs directly
const result = await archiveOldAuditLogs();
if (result.success) {
  console.log(`Archived ${result.recordCount} logs to ${result.archiveFile}`);
}

// Delete expired logs directly
const deletionResult = await deleteExpiredAuditLogs();
if (deletionResult.success) {
  console.log(`Deleted ${deletionResult.deletedCount} logs`);
}

// Archive specific date range
const rangeResult = await archiveAuditLogsByDateRange(
  new Date('2023-01-01'),
  new Date('2024-01-01')
);

// Get statistics
const stats = await getArchivalStatistics();
console.log(`Total logs: ${stats.totalLogs}`);
console.log(`Ready for archival: ${stats.logsReadyForArchival}`);
console.log(`Ready for deletion: ${stats.logsReadyForDeletion}`);
```

## Admin API Endpoints (Optional Implementation)

Consider adding these API endpoints for admin control:

### GET `/api/admin/audit/stats`

Returns archival statistics:

```typescript
// apps/web/src/app/api/admin/audit/stats/route.ts
import { NextResponse } from 'next/server';
import { getArchivalStatistics } from '@/lib/jobs/audit-archival';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  // Verify admin authentication
  await requireAdmin(request);

  const stats = await getArchivalStatistics();
  return NextResponse.json(stats);
}
```

### POST `/api/admin/audit/archive`

Manually trigger archival:

```typescript
// apps/web/src/app/api/admin/audit/archive/route.ts
import { NextResponse } from 'next/server';
import { triggerImmediateAuditArchival } from '@/lib/queue/scheduler';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  await requireAdmin(request);

  const body = await request.json();
  const { startDate, endDate } = body;

  const jobId = await triggerImmediateAuditArchival(
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  );

  return NextResponse.json({ jobId });
}
```

### POST `/api/admin/audit/delete`

Manually trigger deletion (use with extreme caution):

```typescript
// apps/web/src/app/api/admin/audit/delete/route.ts
import { NextResponse } from 'next/server';
import { triggerImmediateAuditDeletion } from '@/lib/queue/scheduler';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  await requireAdmin(request);

  // Add additional confirmation check
  const body = await request.json();
  if (body.confirmation !== 'DELETE_EXPIRED_AUDIT_LOGS') {
    return NextResponse.json(
      { error: 'Invalid confirmation' },
      { status: 400 }
    );
  }

  const jobId = await triggerImmediateAuditDeletion();

  return NextResponse.json({
    jobId,
    warning: 'Logs older than 6 years will be permanently deleted'
  });
}
```

## Monitoring and Logging

All operations are logged using the application logger. Monitor these events:

### Success Events

- `audit_archival_start`: Archival job started
- `audit_archival_complete`: Archival completed successfully
- `audit_deletion_start`: Deletion job started
- `audit_deletion_complete`: Deletion completed successfully

### Error Events

- `audit_archival_error`: Archival failed
- `audit_deletion_error`: Deletion failed
- `worker_job_failed`: Background job failed

### Example Log Queries

```bash
# Monitor archival jobs
grep "audit_archival" /var/log/app.log

# Check for errors
grep "audit.*error" /var/log/app.log

# View archival statistics
grep "audit_archival_complete" /var/log/app.log | tail -10
```

## Backup and Disaster Recovery

### Backup Strategy

1. **Primary Storage**: Audit logs in PostgreSQL database
2. **Secondary Storage**: Compressed archives in filesystem (`/var/log/audit-archives/`)
3. **Optional Tertiary Storage**: Upload archives to cloud storage (S3, Azure Blob, etc.)

### Cloud Storage Upload (Optional Enhancement)

To implement S3 upload for additional redundancy:

```typescript
// Add to audit-archival.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream } from 'fs';

async function uploadArchiveToS3(filePath: string): Promise<void> {
  const s3Client = new S3Client({ region: process.env.AWS_REGION });
  const fileStream = createReadStream(filePath);
  const fileName = path.basename(filePath);

  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.AUDIT_ARCHIVE_BUCKET,
    Key: `audit-archives/${fileName}`,
    Body: fileStream,
    ServerSideEncryption: 'AES256',
    StorageClass: 'GLACIER', // Long-term, low-cost storage
  }));

  logger.info({
    event: 'audit_archive_uploaded_to_s3',
    file: fileName,
  });
}
```

### Archive Restoration

To restore archived logs:

```bash
# Decompress archive
gunzip audit-logs-2024-01-01-1234567890.json.gz

# Import into database (example)
cat audit-logs-2024-01-01-1234567890.json | \
  jq -r '.logs[] | @json' | \
  psql -U postgres -d mydb -c "COPY audit_logs FROM STDIN WITH (FORMAT csv)"
```

## Compliance Notes

### HIPAA Requirements

- **45 CFR § 164.316(b)(2)(i)**: Requires retention of audit logs for at least 6 years
- **45 CFR § 164.312(b)**: Requires audit controls to record and examine activity
- **45 CFR § 164.530(j)**: Requires documentation retention

### Audit Trail

All archival and deletion operations are themselves logged, creating a complete audit trail:

- Who triggered the operation (user ID)
- When it was triggered (timestamp)
- What was affected (record count, date range)
- Result (success/failure)

### Data Integrity

- Archives use GZIP compression, which includes CRC32 checksums
- Consider adding SHA-256 hash of archive contents to metadata
- Store archive metadata in database for verification

## Troubleshooting

### Common Issues

#### Archive Directory Permission Denied

```bash
# Fix permissions
sudo chown -R app-user:app-user /var/log/audit-archives
sudo chmod 700 /var/log/audit-archives
```

#### Redis Connection Failed

```bash
# Check Redis status
redis-cli ping

# Check connection from app
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

#### Worker Not Processing Jobs

```typescript
// Check worker status
import { getSchedulerStatus } from '@/lib/jobs/appointment-scheduler';

const status = getSchedulerStatus();
console.log(status);
```

#### Out of Disk Space

```bash
# Check disk usage
df -h /var/log/audit-archives

# Find old archives to remove or upload to cloud storage
find /var/log/audit-archives -name "*.json.gz" -mtime +365 -ls
```

## Testing

### Unit Tests

```typescript
// apps/web/src/lib/jobs/__tests__/audit-archival.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { archiveOldAuditLogs, getArchivalStatistics } from '../audit-archival';

describe('Audit Archival', () => {
  it('should archive old logs', async () => {
    const result = await archiveOldAuditLogs();
    expect(result.success).toBe(true);
    expect(result.recordCount).toBeGreaterThanOrEqual(0);
  });

  it('should get archival statistics', async () => {
    const stats = await getArchivalStatistics();
    expect(stats.totalLogs).toBeGreaterThanOrEqual(0);
    expect(stats.logsReadyForArchival).toBeGreaterThanOrEqual(0);
  });
});
```

### Manual Testing

```bash
# Set short retention for testing
export AUDIT_ARCHIVAL_AGE_DAYS=1
export AUDIT_DELETION_AGE_DAYS=7

# Run archival manually
npm run test:audit-archival

# Check archives
ls -lh /var/log/audit-archives/
```

## Security Considerations

1. **Access Control**: Archive directory is readable only by the application user (chmod 700)
2. **Encryption at Rest**: Consider encrypting the filesystem where archives are stored
3. **Encryption in Transit**: If uploading to cloud storage, use HTTPS/TLS
4. **Audit the Auditors**: All archival operations are logged
5. **Backup Verification**: Regularly verify archive integrity and recoverability

## Maintenance

### Regular Tasks

1. **Weekly**: Monitor disk space usage in `/var/log/audit-archives/`
2. **Monthly**: Verify that archival jobs are running successfully
3. **Quarterly**: Test archive restoration process
4. **Annually**: Review retention policies and adjust if needed

### Performance Optimization

If archival jobs are taking too long:

1. Increase `AUDIT_BATCH_SIZE` (default: 1000)
2. Reduce `QUEUE_CONCURRENCY` to avoid database overload
3. Run archival during off-peak hours
4. Consider partitioning the audit_logs table by timestamp

## Future Enhancements

- [ ] Add S3/Azure Blob storage integration
- [ ] Implement archive integrity verification (SHA-256 hashing)
- [ ] Add archive search and query capabilities
- [ ] Create admin dashboard for monitoring
- [ ] Implement archive encryption
- [ ] Add compliance report generation
- [ ] Support for archive rotation policies
- [ ] Automated testing of restoration process

## References

- [HIPAA Administrative Safeguards](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [45 CFR § 164.316](https://www.law.cornell.edu/cfr/text/45/164.316)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [GZIP File Format](https://www.ietf.org/rfc/rfc1952.txt)
