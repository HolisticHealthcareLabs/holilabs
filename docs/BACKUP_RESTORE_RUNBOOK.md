# Backup & Restore Runbook

**MAIMONIDES invariant BACKUP-001:** A backup that has not been restored does not exist.
Last verified restore: _pending first drill_
Next scheduled drill: _within 90 days of first deploy_

---

## 1. Backup Infrastructure

| Component | Provider | Schedule | Retention |
|-----------|----------|----------|-----------|
| **Database** | DigitalOcean Managed Postgres | Daily automated + PITR (7 days) | 7 days rolling |
| **Application** | Git (GitHub) | Every push | Permanent |
| **Env secrets** | DigitalOcean App Platform + VPS .env.production | Manual | N/A — rotate on compromise |
| **Audit logs** | Postgres (audit_logs table) | Continuous | LGPD Art. 37 minimum (5 years) |

---

## 2. Database Backup (DigitalOcean Managed Postgres)

DigitalOcean Managed Postgres provides:
- **Daily automated backups** retained for 7 days
- **Point-in-time recovery (PITR)** with WAL archiving (last 7 days)
- **Manual backups** via `pg_dump`

### Manual Backup (pg_dump)

```bash
# From local machine or VPS
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h holilabs-prod-db-do-user-*.db.ondigitalocean.com \
  -p 25060 \
  -U doadmin \
  -d defaultdb \
  --format=custom \
  --no-owner \
  --no-acl \
  -f "backup-$(date +%Y%m%d-%H%M%S).dump"

echo "Backup size: $(du -h backup-*.dump | tail -1)"
```

### Verify Backup Integrity

```bash
pg_restore --list backup-*.dump | head -20
echo "Exit code: $? (0 = valid)"
```

---

## 3. Restore Drill Procedure

**Frequency:** Every 90 days (BACKUP-001 invariant)
**Duration:** ~30 minutes
**Risk:** None — restores to a SEPARATE database, not production

### Step 1: Create a temporary database

```bash
# Via DigitalOcean CLI or Console
doctl databases create holilabs-restore-drill \
  --engine pg \
  --version 16 \
  --size db-s-1vcpu-1gb \
  --region nyc1 \
  --num-nodes 1
```

Or use the DigitalOcean Console: Databases → Create → PostgreSQL → name it `holilabs-restore-drill`.

### Step 2: Restore from backup

```bash
# Get the drill database connection string from DO Console
DRILL_DB_URL="postgresql://doadmin:PASSWORD@host:25060/defaultdb?sslmode=require"

# Restore the backup
pg_restore \
  --dbname="$DRILL_DB_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  backup-*.dump

echo "Restore exit code: $?"
```

### Step 3: Verify data integrity

```bash
psql "$DRILL_DB_URL" <<'SQL'
-- Core table row counts
SELECT 'users' as t, count(*) FROM users
UNION ALL SELECT 'patients', count(*) FROM patients
UNION ALL SELECT 'prescriptions', count(*) FROM prescriptions
UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs
UNION ALL SELECT 'clinical_notes', count(*) FROM clinical_notes
ORDER BY t;

-- Verify audit log hash chain integrity (spot check last 10)
SELECT id, entry_hash, previous_hash
FROM audit_logs
ORDER BY timestamp DESC
LIMIT 10;

-- Verify encrypted fields are present (not null/empty)
SELECT count(*) as encrypted_patients
FROM patients
WHERE first_name IS NOT NULL
  AND first_name != '';
SQL
```

### Step 4: Record the drill result

```bash
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | RESTORE DRILL | Status: PASS/FAIL | Rows: X | Duration: Xm" >> docs/BACKUP_DRILL_LOG.md
```

### Step 5: Destroy the drill database

```bash
doctl databases delete holilabs-restore-drill --force
```

---

## 4. Point-in-Time Recovery (PITR)

For recovering to a specific timestamp (e.g., before a bad migration):

1. Go to DigitalOcean Console → Databases → holilabs-prod-db
2. Click "Restore" → select date/time
3. This creates a NEW database cluster at that point in time
4. Update `.env.production` DATABASE_URL to point to restored cluster
5. Rebuild and restart: `pm2 restart holi-web`

**Warning:** PITR creates a new cluster with a new connection string. Update all references.

---

## 5. Disaster Recovery Scenarios

### Scenario A: Accidental data deletion

1. Identify the timestamp of deletion (check audit_logs)
2. Use PITR to restore to 1 minute before deletion
3. Extract the deleted records from the restored DB
4. Insert them back into production

### Scenario B: Database corruption

1. Stop the application: `pm2 stop holi-web`
2. Restore from latest daily backup (DO Console → Restore)
3. Update DATABASE_URL in .env.production
4. Rebuild and restart

### Scenario C: Complete server failure

1. Spin up new Droplet (same region for DB proximity)
2. Clone repo: `git clone https://github.com/HolisticHealthcareLabs/holilabs.git`
3. Copy `.env.production` from secure backup
4. Install deps, build, start: see deploy flow in CLAUDE.md
5. Update Cloudflare DNS to new server IP

---

## 6. Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| Database admin | Nico (nicola@holilabs.xyz) | Primary |
| DigitalOcean support | DO Dashboard → Support | If DB unresponsive |
| Compliance (LGPD DPO) | TBD | If PHI involved |

---

## 7. Quarterly Drill Schedule

| Quarter | Due Date | Status | Operator |
|---------|----------|--------|----------|
| Q2 2026 | 2026-07-13 | PENDING | — |
| Q3 2026 | 2026-10-13 | PENDING | — |
| Q4 2026 | 2027-01-13 | PENDING | — |
