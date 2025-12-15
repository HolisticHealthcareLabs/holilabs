# Invitation System - Deployment Checklist

## Pre-Deployment Checklist

### Database & Data Protection ⏳
- [ ] **Verify backup system is operational**
  ```bash
  tsx scripts/verify-backups.ts
  ```
- [ ] **Check latest backup timestamp** (should be < 48 hours old)
  ```bash
  ls -lh backups/ | head -5
  ```
- [ ] **Test backup restore** (quarterly requirement)
  ```bash
  # Create test database
  createdb holi_labs_restore_test
  # Restore latest backup
  gunzip -c backups/backup-daily-*.sql.gz | psql postgresql://localhost:5432/holi_labs_restore_test
  # Verify data
  psql postgresql://localhost:5432/holi_labs_restore_test -c "SELECT COUNT(*) FROM users;"
  # Cleanup
  dropdb holi_labs_restore_test
  ```
- [ ] **Verify cloud backup connectivity**
  ```bash
  aws s3 ls s3://holi-labs-backups/database/ --endpoint-url=$R2_ENDPOINT
  ```
- [ ] **Review disaster recovery runbook** (`docs/runbooks/DISASTER_RECOVERY.md`)

### Code & Configuration ✅
- [x] InvitationCode model added to schema
- [x] BetaSignup model added to schema
- [x] SignupCounter model added to schema
- [x] User model updated with invitation relations
- [x] Prisma schema validated
- [x] Prisma client generated
- [x] Admin invitations API implemented
- [x] Beta signup API implemented
- [x] Validation schemas created
- [x] Migration SQL prepared
- [x] Documentation written
- [x] Quick start guide created

## Deployment Steps

### 1. Database Migration ⏳
**Status**: Pending database access

```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web
npx prisma migrate dev --name add-invitation-beta-models
```

**Alternative (if automated fails)**:
```bash
psql -U your_user -d holi_protocol -f prisma/migration_add_invitation_beta_models.sql
```

**Verify**:
```bash
npx prisma studio
# Check tables: invitation_codes, beta_signups, signup_counters
```

### 2. Environment Variables 🔧
**Status**: Needs configuration

Add to `.env`:
```env
ADMIN_API_KEY=your-secret-admin-key-change-me
```

**Verify**:
```bash
echo $ADMIN_API_KEY  # Should not be empty
```

### 3. Build & Test 🧪
**Status**: Ready to test

```bash
# TypeScript check
npm run type-check

# Build
npm run build

# Start dev server
npm run dev
```

### 4. API Testing 🧪
**Status**: Ready for testing

**Test Admin Endpoints**:
```bash
# List codes (should return empty array initially)
curl http://localhost:3000/api/admin/invitations \
  -H "Authorization: Bearer ${ADMIN_API_KEY}"

# Create a code
curl -X POST http://localhost:3000/api/admin/invitations \
  -H "Authorization: Bearer ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "createdBy": "YOUR_ADMIN_USER_ID",
    "email": "test@example.com",
    "maxUses": 1,
    "expiresInDays": 30
  }'

# Note the returned code, then test beta signup
```

**Test Beta Signup**:
```bash
# With invite code (should auto-approve)
curl -X POST http://localhost:3000/api/beta-signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "Test User",
    "role": "DOCTOR",
    "inviteCode": "HOLI-XXXXX-YYYY"
  }'

# Without invite code (should pend)
curl -X POST http://localhost:3000/api/beta-signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "fullName": "Test User 2",
    "role": "NURSE"
  }'
```

### 5. Prisma Studio Verification 🔍
**Status**: Ready to verify

```bash
npx prisma studio
```

**Check**:
- [ ] `invitation_codes` table has data
- [ ] `beta_signups` table has data
- [ ] `signup_counters` table has today's entry
- [ ] User table has `invitationCodeId` column
- [ ] Foreign keys are working

### 6. Production Deployment 🚀
**Status**: Ready for deployment

**Pre-deployment checks**:
- [ ] All tests pass
- [ ] Migration runs successfully
- [ ] Environment variables set in production
- [ ] Rate limiting configured (optional)
- [ ] Monitoring/alerting set up

**Deployment command**:
```bash
# Push schema to production database
npx prisma migrate deploy

# Restart application
# (varies by hosting provider)
```

## Post-Deployment

### 7. Backup Verification 🔐

**Immediately after deployment**:

```bash
# 1. Create immediate backup of post-deployment state
tsx scripts/backup-database.ts --type=daily --upload

# 2. Verify backup was created successfully
tsx scripts/verify-backups.ts --verbose

# 3. Test backup integrity
# Download and verify latest backup
aws s3 cp s3://holi-labs-backups/database/backup-daily-$(date +%Y-%m-%d).sql.gz . \
  --endpoint-url=$R2_ENDPOINT
# Check file size (should be > 1MB)
ls -lh backup-daily-*.sql.gz

# 4. Document backup in deployment log
echo "Post-deployment backup: backup-daily-$(date +%Y-%m-%d).sql.gz" >> deployment-log.txt
```

**Schedule backup verification cron job** (if not already configured):

```bash
# Add to crontab
crontab -e

# Add this line:
0 6 * * * cd /path/to/holilabsv2/apps/web && tsx scripts/verify-backups.ts --alert-on-failure >> /var/log/backup-verify.log 2>&1
```

### 8. Monitoring 👁️

**Check logs for**:
- `invitation_code_created`
- `invitation_code_deactivated`
- `beta_signup_success`
- `beta_signup_error`
- `backup_verification` (should run daily at 6 AM)

**Monitor metrics**:
```typescript
// Daily signup count
const today = new Date();
today.setHours(0, 0, 0, 0);
const stats = await prisma.signupCounter.findUnique({
  where: { date: today },
});
```

### 8. Admin Setup 🔐

**Create first invitation codes**:
1. Get your admin user ID from database
2. Use POST `/api/admin/invitations` with admin key
3. Share codes with beta testers

### 9. User Communication 📧

**Notify beta signups**:
```typescript
// Find approved but not notified
const toNotify = await prisma.betaSignup.findMany({
  where: {
    status: 'approved',
    notified: false,
  },
});

// Send emails and update
for (const signup of toNotify) {
  // Send welcome email
  await sendWelcomeEmail(signup.email);

  // Mark as notified
  await prisma.betaSignup.update({
    where: { id: signup.id },
    data: {
      notified: true,
      emailsSent: { increment: 1 },
      lastEmailAt: new Date(),
    },
  });
}
```

### 10. Analytics Dashboard 📊

**Queries to implement**:
```typescript
// Total signups
const total = await prisma.betaSignup.count();

// Pending approvals
const pending = await prisma.betaSignup.count({
  where: { status: 'pending' },
});

// Conversion rate
const approved = await prisma.betaSignup.count({
  where: { status: 'approved' },
});
const converted = await prisma.betaSignup.count({
  where: { status: 'converted' },
});
const conversionRate = converted / approved * 100;

// Daily trend
const last7Days = await prisma.signupCounter.findMany({
  where: {
    date: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  },
  orderBy: { date: 'desc' },
});
```

## Rollback Plan 🔄

**If issues occur during deployment, follow these steps in order:**

### Quick Rollback (Code Only)

**If application issues but database is intact:**

1. **Rollback application deployment**:
```bash
# Via DigitalOcean
doctl apps deployments list $DIGITALOCEAN_APP_ID
doctl apps deployments rollback $DIGITALOCEAN_APP_ID $PREVIOUS_DEPLOYMENT_ID

# Verify rollback
curl https://holilabs-lwp6y.ondigitalocean.app/api/health/ready
```

2. **Revert schema changes** (if needed):
```bash
git checkout HEAD^ apps/web/prisma/schema.prisma
npx prisma generate
```

3. **Restore API routes**:
```bash
git checkout HEAD^ apps/web/src/app/api/admin/invitations/route.ts
git checkout HEAD^ apps/web/src/app/api/beta-signup/route.ts
```

### Full Rollback (Database + Code)

**If database corruption or critical data issues:**

⚠️ **CRITICAL**: This will restore database to pre-deployment state. Data loss possible.

1. **STOP**: Review disaster recovery runbook first
   ```bash
   cat docs/runbooks/DISASTER_RECOVERY.md
   ```

2. **Create incident record**:
   ```bash
   INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"
   mkdir -p /tmp/incidents/$INCIDENT_ID

   # Preserve evidence
   doctl apps logs $DIGITALOCEAN_APP_ID --type=run --tail=1000 > /tmp/incidents/$INCIDENT_ID/app-logs.txt
   psql $DATABASE_URL -c "SELECT * FROM prisma_migrations ORDER BY finished_at DESC LIMIT 5;" \
     > /tmp/incidents/$INCIDENT_ID/migrations.txt
   ```

3. **Restore from backup**:

   **Option A: Use pre-deployment backup (RECOMMENDED)**
   ```bash
   # List available backups
   ls -lh backups/ | grep $(date +%Y-%m-%d)

   # Or from cloud
   aws s3 ls s3://holi-labs-backups/database/ --endpoint-url=$R2_ENDPOINT | grep $(date +%Y-%m-%d)

   # Download pre-deployment backup
   aws s3 cp s3://holi-labs-backups/database/backup-daily-[PRE_DEPLOYMENT_DATE].sql.gz . \
     --endpoint-url=$R2_ENDPOINT

   # Put app in maintenance mode
   doctl apps update $DIGITALOCEAN_APP_ID --set-env MAINTENANCE_MODE="true"

   # Restore backup
   gunzip -c backup-daily-[PRE_DEPLOYMENT_DATE].sql.gz | psql $DATABASE_URL

   # Verify restore
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   psql $DATABASE_URL -c "SELECT * FROM prisma_migrations ORDER BY finished_at DESC LIMIT 3;"
   ```

   **Option B: Point-in-Time Recovery (if available)**
   ```bash
   # Restore to 1 hour before deployment
   DEPLOYMENT_TIME="2025-12-15 14:00:00 UTC"

   # Fork database to point before deployment
   doctl databases fork $DATABASE_ID \
     --name "holi-labs-rollback-$(date +%Y%m%d-%H%M)" \
     --restore-from-timestamp "$(date -d "$DEPLOYMENT_TIME - 1 hour" --iso-8601=seconds)"

   # Get new database connection string
   NEW_DB_ID=$(doctl databases list --format ID,Name --no-header | grep rollback | awk '{print $1}')
   NEW_DATABASE_URL=$(doctl databases connection $NEW_DB_ID --format URI --no-header)

   # Update application
   doctl apps update $DIGITALOCEAN_APP_ID \
     --set-env DATABASE_URL="$NEW_DATABASE_URL" \
     --set-env MAINTENANCE_MODE="false"
   ```

4. **Drop problematic tables** (if partial rollback needed):
   ```sql
   DROP TABLE IF EXISTS invitation_codes CASCADE;
   DROP TABLE IF EXISTS beta_signups CASCADE;
   DROP TABLE IF EXISTS signup_counters CASCADE;
   ALTER TABLE users DROP COLUMN IF EXISTS invitationCodeId;
   ```

5. **Rollback application code**:
   ```bash
   # Rollback to previous deployment
   doctl apps deployments rollback $DIGITALOCEAN_APP_ID $PREVIOUS_DEPLOYMENT_ID

   # Exit maintenance mode
   doctl apps update $DIGITALOCEAN_APP_ID --set-env MAINTENANCE_MODE="false"
   ```

6. **Verify rollback success**:
   ```bash
   # Health check
   curl https://holilabs-lwp6y.ondigitalocean.app/api/health/ready

   # Test login
   curl -X POST https://holilabs-lwp6y.ondigitalocean.app/api/auth/signin \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'

   # Check application logs
   doctl apps logs $DIGITALOCEAN_APP_ID --type=run --follow
   ```

7. **Create post-rollback backup**:
   ```bash
   # Backup rolled-back state
   tsx scripts/backup-database.ts --type=daily --upload

   # Tag as post-rollback
   aws s3api put-object-tagging \
     --bucket holi-labs-backups \
     --key database/backup-daily-$(date +%Y-%m-%d).sql.gz \
     --tagging 'TagSet=[{Key=type,Value=post-rollback},{Key=incident,Value='$INCIDENT_ID'}]' \
     --endpoint-url=$R2_ENDPOINT
   ```

8. **Document rollback**:
   ```bash
   cat > /tmp/incidents/$INCIDENT_ID/ROLLBACK_SUMMARY.md << EOF
   # Rollback Summary - $INCIDENT_ID

   ## Rollback Details
   - **Date**: $(date)
   - **Reason**: [Describe what went wrong]
   - **Method**: [Full restore / PITR / Code only]
   - **Data Loss**: [None / Describe any data loss]
   - **Downtime**: [Duration]

   ## Actions Taken
   1. [List each step taken]

   ## Verification
   - [x] Health checks passing
   - [x] Users can login
   - [x] Database accessible
   - [x] Data integrity verified

   ## Next Steps
   - [ ] Root cause analysis
   - [ ] Team debrief
   - [ ] Update deployment procedures
   EOF
   ```

### Emergency Contacts for Rollback

If rollback fails or you need assistance:

1. **Database Administrator**: [Contact info]
2. **CTO**: [Contact info]
3. **DigitalOcean Support**: https://cloud.digitalocean.com/support (Priority ticket)

See full disaster recovery procedures: `/docs/runbooks/DISASTER_RECOVERY.md`

## Success Criteria ✅

- [ ] All 3 tables created
- [ ] Foreign keys working
- [ ] Can create invitation codes via API
- [ ] Can signup with valid code (auto-approved)
- [ ] Can signup without code (pending)
- [ ] Counters update correctly
- [ ] Can list all codes
- [ ] Can deactivate codes
- [ ] No errors in logs
- [ ] Prisma Studio shows data

## Support & Documentation 📚

- **Implementation Details**: `INVITATION_SYSTEM_IMPLEMENTATION.md`
- **Quick Reference**: `INVITATION_QUICK_START.md`
- **Summary**: `AGENT17_IMPLEMENTATION_SUMMARY.md`
- **Migration SQL**: `prisma/migration_add_invitation_beta_models.sql`
- **Validation**: `src/lib/validations/invitation.ts`

## Files Modified/Created

### Modified (3)
- `/apps/web/prisma/schema.prisma`
- `/apps/web/src/app/api/admin/invitations/route.ts`
- `/apps/web/src/app/api/beta-signup/route.ts`

### Created (6)
- `/apps/web/prisma/migration_add_invitation_beta_models.sql`
- `/apps/web/src/lib/validations/invitation.ts`
- `/apps/web/INVITATION_SYSTEM_IMPLEMENTATION.md`
- `/apps/web/INVITATION_QUICK_START.md`
- `/apps/web/AGENT17_IMPLEMENTATION_SUMMARY.md`
- `/apps/web/DEPLOYMENT_CHECKLIST.md` (this file)

## Timeline Estimate

- **Migration**: 5 minutes
- **Testing**: 30 minutes
- **Production deployment**: 15 minutes
- **Monitoring setup**: 1 hour
- **Total**: ~2 hours

## Risk Assessment

**Low Risk**:
- New tables, no existing data affected
- Backward compatible
- Can rollback easily
- No breaking changes to existing APIs

**Potential Issues**:
- Database connection during migration
- Environment variable not set
- Admin user ID not available for first code

**Mitigations**:
- Manual SQL migration prepared
- Default value in code
- Documentation clear on requirements

## Contact

**Implementation**: AGENT 17 (Claude Sonnet 4.5)
**Date**: 2024-12-14
**Status**: Ready for deployment pending database access

---

**Next Action**: Run database migration when database connection is available.
