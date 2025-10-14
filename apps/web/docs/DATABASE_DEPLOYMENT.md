# Database Deployment Guide

This guide covers setting up and deploying the database for HoliLabs in production.

---

## 📋 Table of Contents

1. [Production Database Requirements](#production-database-requirements)
2. [Database URL Configuration](#database-url-configuration)
3. [Initial Deployment Steps](#initial-deployment-steps)
4. [Migration Management](#migration-management)
5. [Backup & Recovery](#backup--recovery)
6. [Troubleshooting](#troubleshooting)

---

## 🗄️ Production Database Requirements

### Database Provider
- **PostgreSQL 14+** required (15+ recommended)
- **Managed Database** recommended (DigitalOcean Managed Database, AWS RDS, Supabase, etc.)
- **Minimum Specs:**
  - 2GB RAM
  - 25GB storage
  - Connection pooling enabled (recommended 10-20 connections)

### Security Requirements
- ✅ SSL/TLS encryption enabled
- ✅ Firewall rules (allow only app servers)
- ✅ Automated backups enabled
- ✅ Point-in-time recovery (PITR) enabled
- ✅ Strong database password (use password manager)

---

## 🔐 Database URL Configuration

### Format

```bash
# Production DATABASE_URL format
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=require&connection_limit=10

# Example with DigitalOcean Managed Database
postgresql://doadmin:AVNS_xxxxxx@holilabs-db-do-user-123456-0.db.ondigitalocean.com:25060/holilabs?sslmode=require&connection_limit=10

# Example with Supabase
postgresql://postgres.xxxxxxxxxxxxx:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

### SSL Configuration

**IMPORTANT:** Production databases **MUST** use SSL.

For DigitalOcean Managed Database:
```bash
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
```

For self-hosted PostgreSQL:
```bash
# Download CA certificate and reference it
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=verify-full&sslrootcert=/path/to/ca-certificate.crt"
```

### Connection Pooling

Add connection limits to prevent exhausting database connections:

```bash
# Recommended for production
?connection_limit=10&pool_timeout=10
```

---

## 🚀 Initial Deployment Steps

### Step 1: Create Production Database

#### Option A: DigitalOcean Managed Database

1. Go to DigitalOcean Console → Databases → Create Database
2. Select **PostgreSQL 15**
3. Choose region (same as app server for low latency)
4. Select **Basic** plan (minimum 2GB RAM)
5. Name: `holilabs-production-db`
6. Create database

#### Option B: Using DigitalOcean CLI

```bash
# Create PostgreSQL cluster
doctl databases create holilabs-production-db \
  --engine postgres \
  --version 15 \
  --region nyc1 \
  --size db-s-2vcpu-4gb \
  --num-nodes 1

# Get connection details
doctl databases connection holilabs-production-db
```

### Step 2: Configure Database Access

#### DigitalOcean: Add Trusted Sources

```bash
# Allow app platform to access database
doctl databases firewalls append <database-id> \
  --rule type:app,value:<app-id>
```

Or via console:
1. Database → Settings → Trusted Sources
2. Add: "All App Platform apps" or specific app

### Step 3: Set Database Environment Variable in DigitalOcean

1. Go to App Platform → Your App → Settings → Environment Variables
2. Add/Update:

```bash
DATABASE_URL = postgresql://doadmin:PASSWORD@host:port/database?sslmode=require
```

**IMPORTANT:** Use the connection string from your database provider's console.

### Step 4: Run Database Migrations

#### Option A: Via DigitalOcean Console

1. App Platform → Your App → Console
2. Run migration command:

```bash
cd apps/web
npx prisma migrate deploy
```

#### Option B: Via Local Connection (if allowed)

```bash
# Set production DATABASE_URL locally (temporarily)
export DATABASE_URL="postgresql://..."

# Deploy migrations
cd apps/web
npx prisma migrate deploy
```

#### Option C: Add to Build Command

Update `.do/app.yaml` build command:

```yaml
build_command: |
  cd apps/web
  npx prisma migrate deploy
  pnpm build
```

**⚠️ Warning:** This runs migrations on every build. Use with caution.

### Step 5: Verify Migrations

```bash
# Check applied migrations
npx prisma migrate status

# Should output: "Database schema is up to date!"
```

### Step 6: Seed Production Data

**DO NOT** run the regular `pnpm db:seed` in production (that's test data).

Use the production seed script instead:

```bash
# Option A: Run interactively via console
cd apps/web
npx tsx prisma/seed-production.ts

# Option B: Run with environment variables
NODE_ENV=production \
ADMIN_EMAIL=your@email.com \
ADMIN_FIRST_NAME=Your \
ADMIN_LAST_NAME=Name \
ADMIN_SPECIALTY="Internal Medicine" \
ADMIN_LICENSE_NUMBER=12345678 \
npx tsx prisma/seed-production.ts
```

This will create:
- ✅ Admin clinician user
- ✅ Initial audit log

---

## 🔄 Migration Management

### Creating New Migrations (Development)

```bash
# Make changes to prisma/schema.prisma
# Generate migration
npx prisma migrate dev --name describe_your_change
```

### Deploying Migrations (Production)

```bash
# ALWAYS test migrations in staging first!
npx prisma migrate deploy
```

### Rolling Back Migrations

Prisma doesn't support automatic rollback. Manual process:

1. **Backup database** before migration
2. If migration fails:
   ```bash
   # Restore from backup
   # Or manually revert changes via SQL
   ```

3. Fix migration issue in code
4. Create new migration to fix
5. Deploy fixed migration

### Migration Safety Checklist

Before deploying migrations:

- [ ] Tested in local development
- [ ] Tested in staging environment
- [ ] Database backup completed
- [ ] Reviewed generated SQL (`migrations/.../migration.sql`)
- [ ] No breaking changes (e.g., dropping columns with data)
- [ ] Checked for data migrations (use Prisma seed or custom script)

---

## 💾 Backup & Recovery

### Automated Backups (DigitalOcean)

DigitalOcean Managed Databases automatically backup daily.

**Retention:** 7 days (Basic plan), 14-30 days (higher tiers)

### Manual Backup

```bash
# Using pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Restore from Backup

```bash
# Restore from SQL dump
psql $DATABASE_URL < backup-20241014.sql

# Restore from compressed backup
gunzip -c backup-20241014.sql.gz | psql $DATABASE_URL
```

### Point-in-Time Recovery (PITR)

DigitalOcean Managed Databases support PITR:

1. Database → Backups → Point-in-time Recovery
2. Select timestamp
3. Restore to new database
4. Update DATABASE_URL to new database

---

## 🐛 Troubleshooting

### Error: "TLS handshake: server does not support TLS"

**Cause:** Database URL missing `sslmode=require`

**Fix:**
```bash
# Add SSL mode to DATABASE_URL
postgresql://user:pass@host:port/db?sslmode=require
```

### Error: "Prisma schema not found"

**Cause:** Running prisma commands from wrong directory

**Fix:**
```bash
# Always run from apps/web directory
cd apps/web
npx prisma migrate deploy
```

### Error: "Connection pool timeout"

**Cause:** Too many concurrent connections

**Fix:**
```bash
# Add connection limit to DATABASE_URL
?connection_limit=10&pool_timeout=10
```

### Error: "Migration failed: relation already exists"

**Cause:** Migration applied manually or schema out of sync

**Fix:**
```bash
# Check migration status
npx prisma migrate status

# If needed, mark migration as applied (dangerous!)
npx prisma migrate resolve --applied 20241014_migration_name
```

### Database Connection Refused

**Cause:** Firewall blocking connection

**Fix (DigitalOcean):**
1. Database → Settings → Trusted Sources
2. Add: "All App Platform apps"
3. Or add specific app ID

### Slow Queries

**Debug:**
```sql
-- Check running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 📊 Post-Deployment Verification

### Check Database Connection

```bash
# Via app health endpoint
curl https://your-app.ondigitalocean.app/api/health

# Should return:
# {"status":"ok","database":"connected","timestamp":"..."}
```

### Verify Tables Created

```bash
# Connect to database
psql $DATABASE_URL

# List tables
\dt

# Expected tables: users, patients, medications, prescriptions, etc.
```

### Check Migration History

```sql
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;
```

---

## 🔐 Security Best Practices

1. **Never commit DATABASE_URL** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate database passwords** quarterly
4. **Enable SSL/TLS** for all connections
5. **Restrict database access** via firewall rules
6. **Monitor database logs** for suspicious activity
7. **Regular security audits** of database permissions

---

## 📞 Support

- **Prisma Docs:** https://www.prisma.io/docs
- **DigitalOcean Database Docs:** https://docs.digitalocean.com/products/databases/
- **HoliLabs Support:** your-support-email@holilabs.com

---

## 🔄 Database Updates Workflow

1. **Development:** Make schema changes → `prisma migrate dev`
2. **Commit:** Commit migration files to git
3. **Staging:** Deploy to staging → Test migrations
4. **Backup:** Backup production database
5. **Production:** Deploy to production → Run `prisma migrate deploy`
6. **Verify:** Check health endpoint and logs
7. **Monitor:** Watch for errors in first 24 hours

---

**Last Updated:** October 14, 2025
**Version:** 1.0.0
