# Runbook: Database Connection Failure

**Severity:** Critical (P1)
**Expected Resolution Time:** 10-20 minutes
**On-Call Required:** Yes

---

## Symptoms

### What Users See
- "Database connection error" messages
- Failed login attempts
- 500 Internal Server Error on all pages
- Data not loading in the application

### What Monitoring Shows
- Prisma connection errors in logs
- Health check endpoint failing with database errors
- Prometheus alert: `DatabaseConnectionFailed` firing
- Sentry errors: `PrismaClientInitializationError`, `P1001`, `P1002`
- Grafana showing 0 successful database queries

---

## Immediate Actions (First 5 Minutes)

### 1. Acknowledge the Incident
```bash
# Log incident start
echo "DB connection incident - $(whoami) - $(date)" >> /tmp/db-incident.log

# Notify team
# Post to Slack: "🚨 P1: Database connection failure. Investigating."
```

### 2. Verify Database Status
```bash
# Test direct connection to PostgreSQL
PGPASSWORD=holi_dev_password psql -h localhost -U holi -d holi_protocol -c "SELECT 1;"

# If using managed database (DigitalOcean, AWS RDS)
# Check cloud provider dashboard for database status

# Test from application server
ssh app-server
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT NOW();"
```

### 3. Check Application Logs
```bash
# Check for Prisma connection errors
tail -n 100 /var/log/holi-api/error.log | grep -i "prisma\|database\|connection"

# Common error codes:
# P1001: Can't reach database server
# P1002: Database server timeout
# P1008: Operations timed out
# P1017: Server has closed the connection
```

---

## Diagnosis (5-10 Minutes)

### Check Database Server Status

#### Managed Database (DigitalOcean, AWS RDS)
```bash
# DigitalOcean
doctl databases list
doctl databases get <database-id>
doctl databases connection <database-id>

# Check for maintenance windows
doctl databases maintenance-window get <database-id>

# Check metrics
doctl databases metrics <database-id> cpu
doctl databases metrics <database-id> memory
```

#### Self-Hosted PostgreSQL
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -n 100 /var/log/postgresql/postgresql-14-main.log

# Check if accepting connections
sudo -u postgres psql -c "SELECT 1;"
```

### Check Connection Pool Status

```bash
# Check active connections
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    count(*) FILTER (WHERE state = 'active') AS active,
    count(*) FILTER (WHERE state = 'idle') AS idle,
    count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
    count(*) AS total
  FROM pg_stat_activity
  WHERE datname = 'holi_protocol';
"

# Check max connections limit
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SHOW max_connections;"

# Check connection usage by application
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT application_name, state, count(*)
  FROM pg_stat_activity
  WHERE datname = 'holi_protocol'
  GROUP BY application_name, state
  ORDER BY count DESC;
"
```

### Check Network Connectivity

```bash
# Test network path to database
ping $DB_HOST

# Test port accessibility
nc -zv $DB_HOST 5432
telnet $DB_HOST 5432

# Check firewall rules (if applicable)
sudo iptables -L | grep 5432

# Check security group rules (cloud provider)
# Ensure application server IP is allowed
```

### Check Database Resource Usage

```bash
# Check disk space on database server
ssh db-server
df -h

# Check if database is out of disk space
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT pg_database.datname,
         pg_size_pretty(pg_database_size(pg_database.datname)) AS size
  FROM pg_database;
"

# Check for long-running queries blocking connections
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
  FROM pg_stat_activity
  WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state != 'idle';
"
```

---

## Resolution Steps

### Scenario 1: Connection Pool Exhausted

```bash
# Kill idle connections (>10 minutes old)
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'holi_protocol'
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
"

# Kill idle in transaction (connection leaks)
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'holi_protocol'
  AND state = 'idle in transaction'
  AND state_change < NOW() - INTERVAL '5 minutes';
"

# Restart application to reset connection pool
doctl apps create-deployment <app-id>
# or
pm2 restart api
```

**Root Cause Investigation:**
```typescript
// Check for connection leaks in code
// Ensure all Prisma queries properly close connections
// Check for forgotten transactions

// BAD: Connection leak
const result = await prisma.$queryRaw`SELECT * FROM patients`;
// Connection not released!

// GOOD: Proper usage
const result = await prisma.patient.findMany();
// Prisma automatically manages connection
```

### Scenario 2: Database Server Down

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Check logs for crash reason
sudo journalctl -u postgresql -n 100 --no-pager

# If managed database, check cloud provider
# May need to restore from backup or failover to replica
```

### Scenario 3: Max Connections Reached

```bash
# Temporarily increase max connections (requires restart)
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf
# Change: max_connections = 100 -> 200

# Restart PostgreSQL
sudo systemctl restart postgresql

# Better solution: Configure connection pooling in application
```

**Application-Level Fix:**
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add connection pooling parameters
  // DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30"
}

// Or use PgBouncer for connection pooling
// DATABASE_URL="postgresql://user:pass@pgbouncer:6432/db?pgbouncer=true"
```

### Scenario 4: Network/Firewall Issue

```bash
# Check if database server firewall allows connections
# DigitalOcean Managed Database
doctl databases firewalls list <database-id>

# Add application server IP to firewall whitelist
doctl databases firewalls append <database-id> --rule ip_addr:XXX.XXX.XXX.XXX

# AWS RDS: Update security group in AWS Console
# Add inbound rule for port 5432 from application server IP
```

### Scenario 5: SSL/TLS Certificate Issue

```bash
# Check SSL mode in connection string
echo $DATABASE_URL
# Should include: sslmode=require or sslmode=disable

# Test connection without SSL
PGPASSWORD=$DB_PASSWORD psql "postgresql://$DB_USER@$DB_HOST:5432/$DB_NAME?sslmode=disable" -c "SELECT 1;"

# If SSL cert expired, update database server certificates
# Managed databases: handled by provider
# Self-hosted: renew Let's Encrypt certificate
```

### Scenario 6: Database Disk Full

```bash
# Check database server disk usage
ssh db-server
df -h /var/lib/postgresql

# If >95% full, free up space:

# Option 1: Vacuum old data
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "VACUUM FULL;"

# Option 2: Delete old audit logs (if applicable)
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  DELETE FROM \"AuditLog\"
  WHERE timestamp < NOW() - INTERVAL '6 years';
"

# Option 3: Archive old data to cold storage
# See: audit-log-archival.ts

# Option 4: Increase disk size (cloud provider)
doctl databases resize <database-id> --size db-s-2vcpu-4gb
```

---

## Verification Steps

```bash
# 1. Test database connection from application
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT NOW();"

# 2. Test Prisma connection
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('✓ Connected'))
  .catch((err) => console.error('✗ Failed:', err))
  .finally(() => prisma.\$disconnect());
"

# 3. Check health endpoint
curl https://api.holilabs.xyz/api/health
# Should return: {"status":"ok","database":"connected"}

# 4. Test a simple query
curl https://api.holilabs.xyz/api/patients?limit=1

# 5. Monitor connection count
watch -n 5 'PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '\''holi_protocol'\'';"'

# 6. Check error rates
# Grafana: Database error rate should drop to 0%
# Sentry: No new PrismaClient errors
```

---

## Post-Incident Actions

### 1. Document Root Cause
```markdown
**Root Cause:** [e.g., Connection pool exhausted due to forgotten transaction in patient export endpoint]

**Why it happened:** [e.g., Code was not properly calling `prisma.$disconnect()` after raw queries]

**Fix applied:** [e.g., Fixed code to use Prisma ORM methods instead of raw queries]

**Preventive measures:** [e.g., Added connection pool monitoring, code review checklist]
```

### 2. Review Connection Pool Configuration
```typescript
// Check current settings
// DATABASE_URL should include:
// ?connection_limit=20&pool_timeout=30&connect_timeout=10
```

### 3. Add Monitoring
```yaml
# Prometheus alert for connection pool
- alert: DatabaseConnectionPoolHigh
  expr: sum(pg_stat_activity_count{state="active"}) / scalar(pg_settings{name="max_connections"}) > 0.8
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Database connection pool usage high"
    description: "Connection pool is at {{ $value | humanizePercentage }}"
```

---

## Prevention

### Connection Pooling Best Practices

```typescript
// Use PgBouncer for connection pooling
// docker-compose.yml
services:
  pgbouncer:
    image: edoburu/pgbouncer:latest
    environment:
      DATABASE_URL: "postgresql://user:pass@postgres:5432/holi_protocol"
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 20
    ports:
      - "6432:5432"

// Application connects to PgBouncer instead of PostgreSQL directly
// DATABASE_URL="postgresql://user:pass@pgbouncer:6432/holi_protocol?pgbouncer=true"
```

### Code-Level Prevention

```typescript
// Good: Use Prisma ORM (automatic connection management)
const patients = await prisma.patient.findMany();

// Bad: Raw queries (manual connection management needed)
const patients = await prisma.$queryRaw`SELECT * FROM patients`;
// Must ensure connection is released!

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Connection timeout configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connect_timeout=10&pool_timeout=30',
    },
  },
});
```

### Database-Level Prevention

```sql
-- Set connection limits per user
ALTER ROLE holi_app CONNECTION LIMIT 50;

-- Set statement timeout (prevent long-running queries)
ALTER DATABASE holi_protocol SET statement_timeout = '30s';

-- Set idle_in_transaction timeout (prevent connection leaks)
ALTER DATABASE holi_protocol SET idle_in_transaction_session_timeout = '5min';

-- Enable auto_explain for slow queries
ALTER DATABASE holi_protocol SET auto_explain.log_min_duration = '1000'; -- 1 second
```

---

## Escalation

### Escalation Path
1. **0-10 min**: On-call engineer attempts resolution
2. **10-20 min**: Escalate to Database Administrator
3. **20-30 min**: Escalate to Senior SRE + Cloud Provider Support
4. **30+ min**: Escalate to CTO + Consider failover to backup

### Emergency Contacts
- **DBA**: [Contact in internal docs]
- **DigitalOcean Database Support**: Premium support ticket
- **AWS RDS Support**: Create high-priority support case

---

## Related Runbooks
- [API Server Down](./api-server-down.md)
- [Performance Degradation](./performance-degradation.md)
- [Backup Restoration](./backup-restoration.md)

---

## Changelog
- **2024-01-07**: Initial version created
