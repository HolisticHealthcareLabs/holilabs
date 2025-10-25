# 📚 Environment Setup Documentation - Quick Reference

**Generated:** October 25, 2025
**Status:** ✅ Complete
**Purpose:** Quick reference guide for all environment setup documentation

---

## 🎯 What Was Created

This environment setup includes **8 comprehensive documents** and **2 automation scripts** to help you configure production environment variables for Holi Labs.

---

## 📁 Documentation Index

### 1. Environment Audit Script ✅
**File:** `apps/web/scripts/audit-environment.ts`
**Purpose:** Check which environment variables are configured, missing, or have placeholder values
**Usage:**
```bash
cd apps/web
npx tsx scripts/audit-environment.ts
```
**Output:**
- Colored terminal output showing status of all 40 variables
- JSON report: `environment-audit-report.json`
- Exit code 1 if critical variables missing

---

### 2. Environment Status Report ✅
**File:** `ENVIRONMENT_STATUS.md`
**Purpose:** Comprehensive status report of all environment variables
**Contents:**
- Executive summary with completion rate (18%)
- Detailed breakdown of all 40 variables by priority
- Action checklist by phase (Critical, High, Medium, Low)
- Time estimates (~90 minutes to production ready)
- Security notes and exposed secrets list
- Related documentation links

**Quick stats:**
- 7/40 variables configured (18%)
- 31 placeholder values (77%)
- 2 missing variables (5%)
- 9 CRITICAL variables need attention

---

### 3. Environment Comparison Matrix ✅
**File:** `ENVIRONMENT_COMPARISON_MATRIX.md`
**Purpose:** Visual comparison of required vs configured variables
**Contents:**
- Quick status overview with progress bars
- Detailed matrix by priority (Critical, High, Medium, Low)
- Priority-based action plan with time estimates
- Service provider quick links
- Configuration checklist by service
- Timeline estimates (MVP: ~90 min, Full: ~160 min)
- Risk assessment (High/Medium/Low)
- Validation commands

**Use when:** You need a quick overview of what's configured and what's missing

---

### 4. Master Production .env Template ✅
**File:** `apps/web/.env.production`
**Purpose:** Complete production environment variables template with inline documentation
**Contents:**
- All 40 variables with detailed inline comments
- Organized by category (Database, Auth, AI, etc.)
- Priority markers (CRITICAL, HIGH, MEDIUM, LOW)
- Instructions on where to get each value
- Security best practices
- HIPAA compliance notes
- Cost estimates for services

**Use when:** Setting up environment variables for the first time

---

### 5. Production Secrets Generated ✅
**File:** `PRODUCTION_SECRETS_GENERATED.md`
**Purpose:** All generated secrets in one place
**Contents:**
- 6 generated secrets (ready to use):
  - SESSION_SECRET
  - NEXTAUTH_SECRET
  - ENCRYPTION_KEY
  - CRON_SECRET
  - DEID_SECRET
  - VAPID keys (public + private)
- List of secrets to obtain from services
- Copy-paste ready format for DigitalOcean
- Deployment checklist
- Secret rotation schedule
- Security best practices

**⚠️  SECURITY:** Delete this file after copying to DigitalOcean and password manager

---

### 6. Deployment Secrets Checklist ✅
**File:** `DEPLOYMENT_SECRETS_CHECKLIST.md`
**Purpose:** Step-by-step checklist for adding secrets to DigitalOcean
**Contents:**
- Prerequisites checklist
- Phase-by-phase deployment steps:
  - Phase 1: Access DigitalOcean (5 steps)
  - Phase 2: Add CRITICAL variables (10 variables)
  - Phase 3: Add HIGH priority variables (~20 variables)
  - Phase 4: Add MEDIUM priority variables (optional)
  - Phase 5: Review and save
  - Phase 6: Wait for redeployment
- Post-deployment verification (8 tests)
- Troubleshooting guide (5 common issues)
- Variables summary table
- Security checklist
- Completion checklist

**Use when:** Ready to deploy to DigitalOcean

---

### 7. Environment Validation Script ✅
**File:** `apps/web/scripts/validate-production.ts`
**Purpose:** Validate production environment after deployment
**Usage:**
```bash
cd apps/web
npx tsx scripts/validate-production.ts
```
**Checks:**
- Database URL format and SSL mode
- Authentication secrets (length, format, not placeholders)
- Supabase configuration
- PHI encryption key
- NODE_ENV is production
- AI services configuration
- Monitoring setup (Sentry, PostHog)
- VAPID keys for push notifications
- Health endpoint (if app URL is set)

**Exit codes:**
- 0: All checks passed ✅
- 1: Critical checks failed ❌
- 2: Some warnings ⚠️

---

### 8. Production Deployment Guide ✅
**File:** `PRODUCTION_DEPLOYMENT_GUIDE.md` (existing, enhanced)
**Purpose:** High-level deployment guide
**Contents:**
- Deployment architecture diagram
- Prerequisites checklist
- Pre-deployment checklist
- Deployment steps (database, env vars, deploy)
- Post-deployment validation
- Monitoring setup
- Rollback procedure
- Troubleshooting

---

## 🚀 Quick Start Guide

### For First-Time Setup (Complete Guide)

Follow these steps in order:

1. **Understand current state** (5 min)
   ```bash
   cd apps/web
   npx tsx scripts/audit-environment.ts
   ```
   Read: `ENVIRONMENT_STATUS.md`

2. **Review what's needed** (10 min)
   - Read: `ENVIRONMENT_COMPARISON_MATRIX.md`
   - Understand priority levels
   - Note time estimates

3. **Gather all secrets** (30 min)
   - Open: `PRODUCTION_SECRETS_GENERATED.md`
   - Copy generated secrets to password manager
   - Obtain API keys from service providers:
     - Supabase (3 values)
     - Anthropic (1 value)
     - Resend (1 value)
     - Sentry (1 value)
     - PostHog (1 value)

4. **Deploy to DigitalOcean** (20 min)
   - Follow: `DEPLOYMENT_SECRETS_CHECKLIST.md`
   - Add all variables to DigitalOcean
   - Wait for redeployment (5-10 min)

5. **Validate deployment** (5 min)
   ```bash
   cd apps/web
   npx tsx scripts/validate-production.ts
   ```

6. **Test application** (15 min)
   - Follow post-deployment tests in checklist
   - Verify all critical features work

**Total time:** ~90 minutes

---

### For Quick Reference (Already Familiar)

**Check status:**
```bash
npx tsx scripts/audit-environment.ts
```

**View comparison:**
Open: `ENVIRONMENT_COMPARISON_MATRIX.md`

**Get secrets:**
Open: `PRODUCTION_SECRETS_GENERATED.md`

**Deploy:**
Follow: `DEPLOYMENT_SECRETS_CHECKLIST.md`

**Validate:**
```bash
npx tsx scripts/validate-production.ts
```

---

## 📊 Environment Variables Overview

### By Priority

| Priority | Count | Time | Examples |
|----------|-------|------|----------|
| 🔴 CRITICAL | 10 | 20 min | DATABASE_URL, SESSION_SECRET, Supabase keys |
| 🟡 HIGH | 11 | 30 min | ANTHROPIC_API_KEY, RESEND_API_KEY, VAPID keys |
| 🔵 MEDIUM | 12 | 45 min | Stripe, Twilio, Upstash, R2 storage |
| ⚪ LOW | 7 | Variable | CFDI (Mexico), Blockchain (optional) |
| **TOTAL** | **40** | **~90 min** | |

### By Status (Current)

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Configured | 7 | 18% |
| ⚠️  Placeholder | 31 | 77% |
| ❌ Missing | 2 | 5% |

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] All secrets generated and stored in password manager
- [ ] No placeholder values (your-, test-, etc.)
- [ ] All CRITICAL variables have real values
- [ ] DATABASE_URL includes `?sslmode=require`
- [ ] NODE_ENV is set to `production`
- [ ] NEXTAUTH_URL and NEXT_PUBLIC_APP_URL match production URL
- [ ] PostHog using US region for HIPAA
- [ ] Sentry PHI scrubbing configured
- [ ] All sensitive env vars marked as ENCRYPTED in DigitalOcean
- [ ] `PRODUCTION_SECRETS_GENERATED.md` deleted after deployment

---

## ⚠️  Common Mistakes to Avoid

1. **Using development secrets in production**
   - Always generate new secrets for production
   - Never reuse dev/staging secrets

2. **Forgetting SSL mode for database**
   - DATABASE_URL must include `?sslmode=require`
   - Required for HIPAA compliance

3. **Using localhost URLs**
   - NEXTAUTH_URL must be production URL
   - NEXT_PUBLIC_APP_URL must be production URL

4. **Wrong PostHog region**
   - Must use `https://us.i.posthog.com` for HIPAA
   - Do NOT use `https://eu.i.posthog.com`

5. **Skipping validation**
   - Always run validation script after deployment
   - Don't assume everything works

6. **Not marking secrets as encrypted**
   - Mark all sensitive values as ENCRYPTED in DigitalOcean
   - Only public values should be plain text

---

## 📞 Need Help?

### If Something Goes Wrong

1. **Check the logs**
   - DigitalOcean: Apps → holilabs-lwp6y → Runtime Logs

2. **Run validation script**
   ```bash
   npx tsx scripts/validate-production.ts
   ```

3. **Check troubleshooting sections**
   - `DEPLOYMENT_SECRETS_CHECKLIST.md` has troubleshooting guide
   - `PRODUCTION_DEPLOYMENT_GUIDE.md` has rollback procedure

4. **Review error messages**
   - Database connection errors → Check DATABASE_URL
   - Session errors → Check SESSION_SECRET, NEXTAUTH_SECRET
   - Supabase errors → Check all 3 Supabase variables

---

## 🎉 Success Criteria

Your environment is production-ready when:

- [ ] Audit script shows 100% completion for CRITICAL variables
- [ ] Validation script passes all checks (exit code 0)
- [ ] Health endpoint returns `{"status":"healthy","database":true}`
- [ ] Can log in successfully
- [ ] All critical features work (tested)
- [ ] No errors in Sentry
- [ ] Analytics working in PostHog
- [ ] BAA signing initiated (DigitalOcean, Supabase, PostHog, Anthropic)

---

## 📚 Documentation Tree

```
holilabs/
├── ENVIRONMENT_SETUP_README.md                 ← You are here
├── ENVIRONMENT_STATUS.md                       ← Current status report
├── ENVIRONMENT_COMPARISON_MATRIX.md            ← What's configured vs needed
├── PRODUCTION_SECRETS_GENERATED.md            ← All generated secrets
├── DEPLOYMENT_SECRETS_CHECKLIST.md            ← Step-by-step deployment
├── PRODUCTION_DEPLOYMENT_GUIDE.md             ← High-level guide
└── apps/web/
    ├── .env.production                        ← Master template
    └── scripts/
        ├── audit-environment.ts               ← Check current status
        └── validate-production.ts             ← Validate after deployment
```

---

## 🔄 Maintenance

### After Deployment

1. **Monitor for 24 hours**
   - Watch Sentry for errors
   - Watch PostHog for usage
   - Check database performance

2. **Schedule secret rotation**
   - Session secrets: Every 30 days
   - API keys: Every 90 days
   - Encryption key: Every 180 days

3. **Update documentation**
   - Mark environment as configured
   - Document any issues encountered
   - Update team on changes

---

## ✅ Completion Checklist

- [ ] Read all documentation
- [ ] Understood priority levels
- [ ] Generated all secrets
- [ ] Obtained all API keys
- [ ] Deployed to DigitalOcean
- [ ] Validated with scripts
- [ ] Tested all features
- [ ] Monitoring configured
- [ ] BAAs initiated
- [ ] Team notified
- [ ] Documentation updated

**When all checked:** 🎉 **ENVIRONMENT SETUP COMPLETE!**

---

**Document Version:** 1.0
**Last Updated:** October 25, 2025
**Maintainer:** DevOps Team
**Next Review:** After first production deployment

---

## 💡 Tips

- Take your time - rushing leads to mistakes
- Double-check variable names - they must match exactly
- Test after each major change
- Keep backups of all secrets
- Document any deviations from this guide
- Ask for help if uncertain

---

**Questions?** Review the detailed documentation in each file above.
