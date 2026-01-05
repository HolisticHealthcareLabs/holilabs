# Incident Runbook: Database Failure

**Severity**: P1 (Critical)
**Alert Name**: `DatabaseDown` / `DatabaseConnectionFailure`
**Alert Trigger**: Database health check fails OR connection errors >10/min
**PagerDuty**: Auto-pages on-call engineer + database team
**Expected Response Time**: <5 minutes

---

## Overview

The PostgreSQL database is not responding, causing all API operations that require data access to fail. This impacts patient records, prescriptions, clinical notes, and all core healthcare workflows.

**Patient Impact**: CRITICAL - Complete data access failure
**Data Loss Risk**: HIGH if not resolved quickly

---

## Immediate Actions (0-5 minutes)

### 1. Acknowledge and Assess

- [ ] Acknowledge PagerDuty alert
- [ ] Post in Slack `#incidents-critical`: "DATABASE FAILURE - Investigating"
- [ ] Check if this is partial or complete failure

### 2. Quick Health Check

```bash
# Check database container status
docker ps | grep postgres

# Test basic connectivity
psql -h localhost -U holi -d holi_protocol -c "SELECT 1;"

# Check if database process is running
docker exec holi-postgres ps aux | grep postgres

# Check database logs for errors
docker logs holi-postgres --tail 100
```

**Decision Matrix**:
- ✅ Database responds → Partial issue (slow queries, connection pool)
- ❌ Database not responding → Complete failure (crashed/corrupted)
- ⚠️ "Connection refused" → Port/networking issue
- ⚠️ "Authentication failed" → Credentials issue

---

## Triage Scenarios

### Scenario A: Database Container Crashed

**Symptoms**:
- `docker ps` doesn't show postgres container
- Or container status shows "Exited" or "Restarting"
- Logs show: "FATAL", "panic", "terminated"

**Immediate Steps**:
```bash
# Check why it crashed
docker logs holi-postgres --tail 200

# Common crash reasons:
# - Out of disk space
# - Memory limit reached
# - Corrupted data files
# - Failed checkpoint

# Check disk space
df -h

# Check if data directory is corrupted
docker exec holi-postgres ls -la /var/lib/postgresql/data
```

**Resolution**:
```bash
# If disk full: Free up space immediately
docker system prune -af --volumes  # BE CAREFUL - removes unused volumes
# Or manually delete old files

# If OOM: Increase memory limit
# Edit docker-compose.yml or deployment config

# Restart database
docker-compose restart postgres

# Monitor startup
docker logs -f holi-postgres

# Expected: "database system is ready to accept connections"
```

**Timeline**: 2-5 minutes (startup takes ~30-60 seconds)

---

### Scenario B: Connection Pool Exhausted

**Symptoms**:
- API logs: "Prisma Error: Can't reach database server"
- Database is running but won't accept new connections
- Logs show: "too many connections"
- `pg_stat_activity` shows 100+ connections

**Diagnosis**:
```bash
# Check active connections
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Check connection limit
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SHOW max_connections;"

# Find long-running queries (potential leaks)
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT pid, now() - query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE state = 'active' 
   ORDER BY duration DESC 
   LIMIT 10;"
```

**Resolution**:
```bash
# EMERGENCY: Kill idle connections
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle' 
   AND now() - state_change > interval '5 minutes';"

# Restart API (releases all connections)
docker-compose restart web

# Monitor connection count
watch -n 2 "docker exec holi-postgres psql -U holi -d holi_protocol -c \
  \"SELECT count(*) FROM pg_stat_activity;\""
```

**Permanent Fix** (post-incident):
- Increase `max_connections` in postgresql.conf
- Implement pgBouncer connection pooler
- Fix connection leaks in application code

**Timeline**: 5-10 minutes

---

### Scenario C: Corrupted Data / Failed Transaction

**Symptoms**:
- Database crashed during write operation
- Logs show: "could not read block", "invalid page header"
- Specific tables/queries fail with corruption errors

**Diagnosis**:
```bash
# Check for corruption
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT * FROM pg_stat_database;"

# Try to identify corrupted table
# (Look for specific table errors in API logs)

# Check database integrity
docker exec holi-postgres pg_checksums -D /var/lib/postgresql/data
```

**Resolution** (CRITICAL - Risk of data loss):

**Option 1: Restore from Backup** (RECOMMENDED)
```bash
# Stop API (prevent more corruption)
docker-compose stop web

# Backup current state (even if corrupted)
docker exec holi-postgres pg_dumpall -U holi > \
  /backup/corrupted-backup-$(date +%Y%m%d-%H%M%S).sql

# Restore from last good backup
# See DISASTER_RECOVERY_PLAN.md for detailed steps

# 1. Stop database
docker-compose stop postgres

# 2. Remove corrupted data
docker volume rm holi_postgres_data

# 3. Recreate volume
docker volume create holi_postgres_data

# 4. Start database
docker-compose up -d postgres

# 5. Wait for startup
sleep 30

# 6. Restore from backup (S3 or local)
aws s3 cp s3://holi-backups/latest.sql.gz - | \
  gunzip | \
  docker exec -i holi-postgres psql -U holi -d holi_protocol

# 7. Verify data integrity
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT count(*) FROM patients;"

# 8. Restart API
docker-compose up -d web
```

**Option 2: Repair Corruption** (Risky)
```bash
# ONLY if Option 1 fails or backup unavailable
# Use REINDEX to rebuild corrupted indexes

docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "REINDEX DATABASE holi_protocol;"

# If specific table is corrupted
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "REINDEX TABLE <table_name>;"
```

**Timeline**: 20-60 minutes (depends on backup size)

---

### Scenario D: Disk Full

**Symptoms**:
- Database won't start or crashes immediately
- Logs show: "No space left on device"
- Write operations fail

**Diagnosis**:
```bash
# Check disk usage
df -h

# Check Docker volume size
docker system df -v

# Find large files
du -sh /var/lib/docker/volumes/* | sort -h | tail -10
```

**Resolution**:
```bash
# EMERGENCY: Free up space immediately

# Option 1: Remove old Docker images
docker image prune -af

# Option 2: Remove old logs
docker logs holi-postgres --tail 0  # Clears logs

# Option 3: Remove unused volumes (CAREFUL!)
docker volume ls -qf dangling=true | xargs docker volume rm

# Option 4: Increase disk size (cloud provider)
# Scale up volume size in DigitalOcean/AWS

# Restart database after freeing space
docker-compose restart postgres
```

**Timeline**: 5-15 minutes

---

### Scenario E: Slow Queries / Performance Degradation

**Symptoms**:
- Database responding but very slow (>5s queries)
- API timeouts increasing
- High CPU usage on database container

**Diagnosis**:
```bash
# Find slow queries
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds';"

# Check table bloat
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT schemaname, tablename, 
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables 
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
   LIMIT 10;"

# Check missing indexes
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats
   WHERE schemaname = 'public'
   ORDER BY n_distinct DESC
   LIMIT 20;"
```

**Resolution**:
```bash
# EMERGENCY: Kill slow queries
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT pg_cancel_backend(pid)
   FROM pg_stat_activity
   WHERE query_start < now() - interval '30 seconds'
   AND state = 'active';"

# Run VACUUM to reclaim space
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "VACUUM ANALYZE;"

# Check query plan for slow query
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "EXPLAIN ANALYZE <your-slow-query>;"
```

**Permanent Fix** (post-incident):
- Add missing indexes
- Optimize queries
- Implement caching layer
- Set up query timeout limits

**Timeline**: 10-30 minutes

---

## Data Loss Prevention

### Before Any Recovery Action

1. **Take Snapshot** (if possible)
```bash
# Create emergency backup even if database is unstable
docker exec holi-postgres pg_dump -U holi holi_protocol \
  > /backup/emergency-$(date +%Y%m%d-%H%M%S).sql
```

2. **Document State**
- Screenshot error messages
- Copy logs to safe location
- Note exact time of failure
- Record what changed recently (deployments, migrations)

3. **Notify Stakeholders**
- Engineering lead
- Clinical operations team
- Compliance/security team (HIPAA breach notification clock starts)

---

## Recovery Verification

After database is restored:

- [ ] Database accepts connections
- [ ] Can read from all tables
- [ ] Can write to tables (test with non-critical data)
- [ ] Check data integrity:
```bash
# Verify record counts
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT 'patients' AS table, count(*) FROM patients
   UNION ALL SELECT 'encounters', count(*) FROM encounters
   UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs;"

# Check for gaps in audit trail (HIPAA requirement)
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT min(created_at), max(created_at), count(*) 
   FROM audit_logs 
   WHERE created_at > now() - interval '24 hours';"
```

- [ ] API can connect and query database
- [ ] Run integration tests
- [ ] Check for data loss (compare to last known state)

---

## Communication

### Initial Alert (0-5 min)
```
🚨 CRITICAL: DATABASE FAILURE
Severity: P1
Impact: All data access blocked
Status: Emergency response in progress
ETA: Update in 10 minutes
DO NOT attempt writes to database
```

### During Recovery
```
⚠️ DATABASE RECOVERY IN PROGRESS
Action: [Restarting | Restoring from backup | Repairing corruption]
ETA: [XX minutes]
Data Loss Risk: [None | Minimal | Unknown]
Next update: [Timestamp]
```

### Resolution
```
✅ DATABASE RECOVERED
Downtime: XX minutes
Data Loss: [None | X transactions | Under assessment]
Root Cause: [Brief explanation]
Recovery: [Restart | Backup restore | Repair]
Action Items: [Post-mortem link]
```

---

## Escalation

**Escalate immediately if**:
- Cannot restore database within 30 minutes
- Suspected data corruption or data loss
- Backup restore fails
- Multiple recovery attempts fail

**Contact**:
- CTO / Engineering Lead
- Database consultant (if available)
- Cloud provider support
- Consider hiring emergency PostgreSQL expert

---

## Post-Incident Actions

### Immediate (Within 4 Hours)

- [ ] Verify HIPAA audit log integrity
- [ ] Check if any PHI was lost (HIPAA breach assessment)
- [ ] Document data loss (if any) for compliance
- [ ] Notify affected users if data loss occurred

### Within 24 Hours

- [ ] Full post-mortem
- [ ] Test backup/restore procedure
- [ ] Review database monitoring
- [ ] Check backup frequency is adequate
- [ ] Assess if disaster recovery plan needs updates

### Within 1 Week

- [ ] Implement preventive measures
- [ ] Add database replication if not present
- [ ] Set up point-in-time recovery (WAL archiving)
- [ ] Schedule disaster recovery drill

---

## Related Runbooks

- [DISASTER_RECOVERY_PLAN.md](./DISASTER_RECOVERY_PLAN.md)
- [API_SERVER_DOWN.md](./API_SERVER_DOWN.md)
- [DATA_BACKUP_RESTORE.md](./DATA_BACKUP_RESTORE.md)

---

## Prevention Checklist

- [x] Daily automated backups to S3
- [ ] WAL archiving for point-in-time recovery
- [ ] Database replication (hot standby)
- [ ] Connection pooler (pgBouncer)
- [ ] Query timeout limits (30s)
- [ ] Automatic failover configuration
- [ ] Regular restore testing (monthly)
- [ ] Disk space monitoring (alert at 80%)

---

**Last Updated**: 2026-01-02
**Last Incident**: N/A
**Average Resolution Time**: Target <30 minutes
**RTO (Recovery Time Objective)**: <1 hour
**RPO (Recovery Point Objective)**: <15 minutes
