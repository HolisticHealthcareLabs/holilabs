# Log Retention Policy
**HIPAA Compliance - 6-Year Retention Requirement**

---

## Regulatory Requirements

**HIPAA §164.316(b)(2)(i) requires:**
> "Retain the documentation required by paragraph (b)(1) of this section for 6 years from the date of its creation or the date when it last was in effect, whichever is later."

This applies to:
- Audit logs (access to ePHI)
- Security incident logs
- Configuration changes
- Policy and procedure documentation

**Additional Requirements:**
- **SOX (Sarbanes-Oxley):** 7 years for financial records
- **State Laws:** Some states require longer retention (e.g., California: 7 years)
- **Best Practice:** Retain logs for 6-7 years minimum

---

## Log Storage Architecture

### Overview

```
Application → Pino Logger → Multistream
                             ├─> Console (stdout)
                             └─> S3 Transport → AWS S3 Bucket
                                                  ├─> Lifecycle Policy (6 years)
                                                  ├─> Encryption (AES-256)
                                                  ├─> Versioning (enabled)
                                                  └─> Athena (queryable)
```

### S3 Bucket Structure

```
s3://holilabs-logs/
├── application-logs/
│   ├── 2026/
│   │   ├── 01/
│   │   │   ├── 01/
│   │   │   │   ├── 00/
│   │   │   │   │   ├── logs-1704067200000-abc123.json.gz
│   │   │   │   │   ├── logs-1704067260000-def456.json.gz
│   │   │   │   │   └── ...
│   │   │   │   ├── 01/
│   │   │   │   ├── 02/
│   │   │   │   └── ...
│   │   │   ├── 02/
│   │   │   └── ...
│   │   ├── 02/
│   │   └── ...
│   └── ...
├── audit-logs/ (optional: separate audit logs)
└── access-logs/ (S3 bucket access logs)
```

**File naming convention:**
- Format: `logs-{timestamp}-{uuid}.json.gz`
- Example: `logs-1704067200000-abc123.json.gz`
- Compressed with gzip (80% size reduction)

---

## Configuration

### Environment Variables

**Required:**
```bash
# S3 bucket for log storage
LOG_BUCKET_NAME=holilabs-logs

# AWS credentials (if not using IAM role)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

**Optional:**
```bash
# Log prefix (default: application-logs)
LOG_PREFIX=application-logs

# Batch size (default: 100 logs per upload)
LOG_BATCH_SIZE=100

# Flush interval in milliseconds (default: 60000 = 1 minute)
LOG_FLUSH_INTERVAL=60000

# Log level (default: info in production, debug in development)
LOG_LEVEL=info
```

---

## S3 Bucket Setup

### Step 1: Create S3 Bucket

```bash
# Via AWS CLI
aws s3 mb s3://holilabs-logs --region us-east-1

# Via Terraform
resource "aws_s3_bucket" "logs" {
  bucket = "holilabs-logs"

  tags = {
    Name        = "Holi Labs Application Logs"
    Environment = "Production"
    Compliance  = "HIPAA"
  }
}
```

### Step 2: Enable Server-Side Encryption

```bash
# Enable AES-256 encryption (HIPAA compliant)
aws s3api put-bucket-encryption \
  --bucket holilabs-logs \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

**Terraform equivalent:**
```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

### Step 3: Enable Versioning (Data Protection)

```bash
# Enable versioning to protect against accidental deletion
aws s3api put-bucket-versioning \
  --bucket holilabs-logs \
  --versioning-configuration Status=Enabled
```

**Terraform:**
```hcl
resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

### Step 4: Configure Lifecycle Policy (6-Year Retention)

```bash
# Create lifecycle policy JSON
cat > lifecycle-policy.json <<EOF
{
  "Rules": [
    {
      "Id": "archive-to-glacier-after-90-days",
      "Status": "Enabled",
      "Prefix": "application-logs/",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 2190
      }
    }
  ]
}
EOF

# Apply lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket holilabs-logs \
  --lifecycle-configuration file://lifecycle-policy.json
```

**Lifecycle stages:**
1. **Days 0-90:** Standard S3 (frequent access)
2. **Days 90-365:** Glacier (infrequent access, lower cost)
3. **Days 365-2190 (6 years):** Deep Archive (long-term retention, lowest cost)
4. **After 2190 days:** Automatically deleted

**Cost comparison:**
- Standard S3: $0.023/GB/month
- Glacier: $0.004/GB/month (83% cheaper)
- Deep Archive: $0.00099/GB/month (96% cheaper)

**Terraform:**
```hcl
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "archive-and-expire"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 2190  # 6 years
    }
  }
}
```

### Step 5: Block Public Access (Security)

```bash
# Block all public access
aws s3api put-public-access-block \
  --bucket holilabs-logs \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

**Terraform:**
```hcl
resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### Step 6: Enable S3 Access Logging (Audit the Auditor)

```bash
# Create logging bucket
aws s3 mb s3://holilabs-logs-access-logs --region us-east-1

# Enable access logging
aws s3api put-bucket-logging \
  --bucket holilabs-logs \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "holilabs-logs-access-logs",
      "TargetPrefix": "access-logs/"
    }
  }'
```

---

## AWS Athena Setup (Log Querying)

### Step 1: Create Athena Database

```sql
CREATE DATABASE holilabs_logs;
```

### Step 2: Create Athena Table

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS holilabs_logs.application_logs (
  timestamp STRING,
  level STRING,
  msg STRING,
  env STRING,
  app STRING,
  requestId STRING,
  method STRING,
  url STRING,
  userId STRING,
  userEmail STRING,
  action STRING,
  resource STRING,
  resourceId STRING,
  ipAddress STRING,
  duration INT,
  event STRING,
  err STRUCT<
    type: STRING,
    message: STRING,
    stack: STRING
  >
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://holilabs-logs/application-logs/'
TBLPROPERTIES ('has_encrypted_data'='true');
```

### Step 3: Partition by Date (Performance Optimization)

```sql
-- Create partitioned table for better query performance
CREATE EXTERNAL TABLE IF NOT EXISTS holilabs_logs.application_logs_partitioned (
  timestamp STRING,
  level STRING,
  msg STRING,
  requestId STRING,
  userId STRING,
  action STRING,
  resource STRING,
  resourceId STRING
)
PARTITIONED BY (
  year STRING,
  month STRING,
  day STRING,
  hour STRING
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://holilabs-logs/application-logs/'
TBLPROPERTIES ('has_encrypted_data'='true');

-- Load partitions
MSCK REPAIR TABLE holilabs_logs.application_logs_partitioned;
```

---

## Query Examples

### 1. Find All PHI Access by User

```sql
SELECT
  timestamp,
  userId,
  userEmail,
  action,
  resource,
  resourceId,
  ipAddress
FROM holilabs_logs.application_logs
WHERE
  userId = 'user-123'
  AND action IN ('READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT')
  AND timestamp >= '2026-01-01'
ORDER BY timestamp DESC
LIMIT 100;
```

### 2. Find Failed Authentication Attempts

```sql
SELECT
  timestamp,
  ipAddress,
  userEmail,
  msg
FROM holilabs_logs.application_logs
WHERE
  event = 'login_failed'
  AND timestamp >= date_format(current_timestamp - interval '24' hour, '%Y-%m-%d %H:%i:%s')
ORDER BY timestamp DESC;
```

### 3. Find Slow Database Queries

```sql
SELECT
  timestamp,
  msg,
  duration,
  requestId
FROM holilabs_logs.application_logs
WHERE
  event = 'database_query'
  AND duration > 1000  -- Slower than 1 second
  AND timestamp >= '2026-01-01'
ORDER BY duration DESC
LIMIT 50;
```

### 4. Find Errors and Exceptions

```sql
SELECT
  timestamp,
  level,
  msg,
  err.type AS error_type,
  err.message AS error_message,
  requestId,
  userId
FROM holilabs_logs.application_logs
WHERE
  level = 'error'
  AND timestamp >= '2026-01-01'
ORDER BY timestamp DESC
LIMIT 100;
```

### 5. Accounting of Disclosures (HIPAA Requirement)

```sql
-- Patient requests accounting of all PHI disclosures
SELECT
  timestamp AS disclosure_date,
  userEmail AS disclosed_to,
  action AS disclosure_type,
  resourceId AS patient_id,
  msg AS description
FROM holilabs_logs.application_logs
WHERE
  resourceId = 'patient-123'
  AND action IN ('READ', 'EXPORT', 'SHARE')
  AND timestamp BETWEEN '2025-01-01' AND '2026-01-01'
ORDER BY timestamp DESC;
```

### 6. Security Incident Investigation

```sql
-- Find all actions by suspicious IP address
SELECT
  timestamp,
  userId,
  userEmail,
  action,
  resource,
  resourceId,
  url
FROM holilabs_logs.application_logs
WHERE
  ipAddress = '203.0.113.45'  -- Suspicious IP
  AND timestamp >= '2026-01-01'
ORDER BY timestamp ASC;
```

---

## Cost Estimation

**Assumptions:**
- 1,000 requests/day
- 5 log entries per request (average)
- 500 bytes per log entry
- 6-year retention

**Storage:**
- Daily logs: 5,000 entries × 500 bytes = 2.5 MB/day
- Compressed (80% reduction): 0.5 MB/day
- Annual logs: 0.5 MB × 365 = 182.5 MB/year
- 6-year retention: 182.5 MB × 6 = 1,095 MB (~1.1 GB)

**AWS Costs:**
- Standard S3 (0-90 days): 45 MB × $0.023/GB = $0.001/month
- Glacier (90-365 days): 137 MB × $0.004/GB = $0.001/month
- Deep Archive (365-2190 days): 913 MB × $0.00099/GB = $0.001/month
- **Total storage:** ~$0.003/month (~$0.04/year)

**Athena Query Costs:**
- $5 per TB scanned
- 100 queries/month scanning 1 GB each = 0.1 TB
- Cost: $0.50/month

**Total estimated cost:** ~$0.50/month (~$6/year)

---

## Monitoring and Alerts

### CloudWatch Alarms

**1. S3 Upload Failures:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name logs-s3-upload-failures \
  --alarm-description "Alert when S3 log uploads fail" \
  --metric-name S3UploadFailures \
  --namespace HoliLabs/Logs \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

**2. High Error Rate:**
```sql
-- Athena query to monitor error rate
SELECT
  COUNT(*) AS error_count
FROM holilabs_logs.application_logs
WHERE
  level IN ('error', 'fatal')
  AND timestamp >= date_format(current_timestamp - interval '1' hour, '%Y-%m-%d %H:%i:%s');
```

---

## Backup and Disaster Recovery

**S3 Cross-Region Replication:**
```bash
# Enable replication to backup region
aws s3api put-bucket-replication \
  --bucket holilabs-logs \
  --replication-configuration '{
    "Role": "arn:aws:iam::ACCOUNT-ID:role/s3-replication-role",
    "Rules": [{
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {"Prefix": "application-logs/"},
      "Destination": {
        "Bucket": "arn:aws:s3:::holilabs-logs-backup-us-west-2",
        "ReplicationTime": {
          "Status": "Enabled",
          "Time": {"Minutes": 15}
        }
      }
    }]
  }'
```

---

## Compliance Checklist

- [ ] S3 bucket created with encryption (AES-256)
- [ ] Versioning enabled (data protection)
- [ ] Lifecycle policy configured (6-year retention)
- [ ] Public access blocked
- [ ] Access logging enabled (audit the auditor)
- [ ] Cross-region replication configured (disaster recovery)
- [ ] Athena database and tables created
- [ ] IAM policies configured (least privilege)
- [ ] CloudWatch alarms configured
- [ ] Tested log upload and querying
- [ ] Documented retention policy
- [ ] Trained staff on log querying

---

**Document Version:** 1.0
**Last Updated:** 2026-01-01
**Next Review:** 2027-01-01
**Owner:** Platform Engineering & Compliance Teams
