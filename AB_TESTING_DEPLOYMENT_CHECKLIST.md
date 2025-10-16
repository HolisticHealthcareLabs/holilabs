# ✅ A/B Testing Deployment Checklist

**Purpose:** Ensure Holi Labs is production-ready for safe A/B testing with healthcare providers

**Target:** Deploy to production with confidence, no rollbacks

---

## 📋 Pre-Deployment Checklist

### 🔐 Security & Compliance

#### Environment Variables
- [ ] All API keys rotated (no exposed keys in git history)
- [ ] Production secrets generated with strong entropy
  ```bash
  openssl rand -base64 32  # NEXTAUTH_SECRET
  openssl rand -hex 32     # ENCRYPTION_KEY
  openssl rand -base64 64  # DEID_SECRET
  ```
- [ ] Environment variables set in DigitalOcean App Platform
- [ ] `.env.production.template` created (placeholders only, no real keys)
- [ ] Local `.env.local` added to `.gitignore`

**Verify:**
```bash
# Check no secrets in git
git log --all --full-history --source --grep="API_KEY\|SECRET\|PASSWORD"

# Should return nothing
```

#### HIPAA Compliance
- [ ] **Supabase BAA signed** (Pro plan required - $25/mo)
- [ ] **AssemblyAI BAA signed** (Enterprise plan)
- [ ] **Google Cloud BAA signed** (contact sales)
- [ ] **PostHog BAA reviewed** (self-hosted or cloud with BAA)
- [ ] **DigitalOcean HIPAA compliance verified**
- [ ] Data residency configured (US only)
- [ ] Encryption at rest enabled (PostgreSQL + Supabase Storage)
- [ ] Audit logging capturing all PHI access
- [ ] Privacy policy published and accessible
- [ ] Terms of service published
- [ ] User consent mechanism active

#### Authentication & Authorization
- [ ] Row-Level Security (RLS) enabled in Supabase
- [ ] Session timeout configured (15 minutes idle)
- [ ] Session warning before timeout
- [ ] Maximum session duration (8 hours)
- [ ] Password complexity requirements enforced
- [ ] Rate limiting on auth endpoints (5 attempts/15 min)
- [ ] RBAC roles configured (ADMIN, CLINICIAN, NURSE, STAFF)

#### API Security
- [ ] Rate limiting active on all public endpoints
- [ ] CORS configured correctly (whitelist only)
- [ ] CSRF protection enabled
- [ ] SQL injection prevention validated (Prisma ORM)
- [ ] XSS protection enabled
- [ ] Security headers configured (Helmet.js or equivalent)
- [ ] File upload validation (audio files only, size limits)

**Test:**
```bash
# Test rate limiting
for i in {1..10}; do curl -X POST https://holilabs.com/api/auth/login; done
# Should return 429 after 5 attempts

# Test CORS
curl -H "Origin: https://evil.com" https://holilabs.com/api/patients
# Should return CORS error
```

---

### 📊 Analytics & Feature Flags

#### PostHog Configuration
- [ ] PostHog project created (Production)
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` set in production environment
- [ ] `NEXT_PUBLIC_POSTHOG_HOST` configured
- [ ] Autocapture disabled (HIPAA compliance)
- [ ] Session recording disabled
- [ ] Property sanitization active (no PHI in events)
- [ ] PostHog accessible from production domain
- [ ] Test event tracked successfully

**Test:**
```typescript
// Run in production
analytics.track('deployment_test', {
  timestamp: new Date().toISOString(),
  environment: 'production',
});

// Verify in PostHog dashboard → Activity → Live Events
```

#### Feature Flags Setup
- [ ] All feature flags defined in `featureFlags.ts`
- [ ] Default values set in `defaultFeatureFlags`
- [ ] Feature flags created in PostHog dashboard
- [ ] Initial rollout set to 0% (disable all new features)
- [ ] Test flag toggling works (0% → 50% → 100%)

**Test Feature Flag:**
```bash
# In browser console (production)
posthog.isFeatureEnabled('ai-scribe-real-time')
# Should return boolean

# Toggle in PostHog dashboard
# Reload page and verify flag changes
```

#### Analytics Events
- [ ] All critical events tracked:
  - [ ] `user_login`
  - [ ] `patient_created`
  - [ ] `clinical_note_created`
  - [ ] `scribe_session_completed`
  - [ ] `feature_flag_evaluated`
- [ ] No PHI in event properties (double check!)
- [ ] Event naming consistent (snake_case)
- [ ] Events appearing in PostHog real-time

---

### 🗄️ Database & Infrastructure

#### Database
- [ ] PostgreSQL 15 production database provisioned on DigitalOcean
- [ ] Connection pooling configured (PgBouncer or built-in)
- [ ] Database backups enabled (daily, 30-day retention)
- [ ] Backup restoration tested (restore to staging)
- [ ] All migrations applied successfully
- [ ] Seed data NOT run on production (only dev/staging)
- [ ] Database indexes created for performance
- [ ] Slow query logging enabled

**Verify:**
```bash
# Check migrations
pnpm prisma migrate status --schema=packages/database/prisma/schema.prisma

# Should show all migrations applied
```

#### Storage (Supabase)
- [ ] Supabase Storage bucket created (audio files)
- [ ] Bucket policies configured (authenticated users only)
- [ ] File encryption enabled
- [ ] Signed URLs with expiration (24 hours)
- [ ] Storage quota sufficient (start with 10GB)
- [ ] Storage credentials in environment variables

#### Redis (Upstash)
- [ ] Upstash Redis database created
- [ ] `UPSTASH_REDIS_REST_URL` set
- [ ] `UPSTASH_REDIS_REST_TOKEN` set
- [ ] Rate limiting using Redis
- [ ] Connection tested

**Test:**
```typescript
import { redis } from '@/lib/redis';

await redis.set('health-check', 'ok');
const value = await redis.get('health-check');
// Should return 'ok'
```

#### Deployment Platform (DigitalOcean)
- [ ] App Platform app created
- [ ] Dockerfile optimized for production
- [ ] `.dockerignore` configured
- [ ] Build succeeds without errors
- [ ] Environment variables configured
- [ ] Auto-deploy from `main` branch enabled
- [ ] Health checks configured (`/api/health`)
- [ ] SSL certificate active
- [ ] Domain DNS configured
- [ ] CDN enabled (optional but recommended)

**Test Deployment:**
```bash
# Build locally
pnpm build

# Should complete without TypeScript errors
```

---

### 🔍 Monitoring & Logging

#### Error Monitoring (Sentry)
- [ ] Sentry project created (Production)
- [ ] `SENTRY_DSN` set in production environment
- [ ] Source maps uploaded to Sentry
- [ ] Error tracking active
- [ ] Test error captured successfully
- [ ] Alert rules configured
- [ ] Team notifications enabled

**Test:**
```typescript
// Trigger test error in production
Sentry.captureException(new Error('Deployment test error'));

// Verify in Sentry dashboard
```

#### Logging (BetterStack/Logtail)
- [ ] BetterStack account created
- [ ] `LOGTAIL_SOURCE_TOKEN` set (optional)
- [ ] Structured logging active (Pino)
- [ ] Log levels configured (INFO in production)
- [ ] Slow query logging enabled
- [ ] API performance logging active
- [ ] Dashboard created

#### Health Checks
- [ ] `/api/health` endpoint responding
- [ ] Health check includes:
  - [ ] Database connectivity
  - [ ] Supabase connectivity
  - [ ] Redis connectivity
  - [ ] Disk space check
- [ ] Uptime monitoring configured (DigitalOcean or Uptime Robot)

**Test:**
```bash
curl https://holilabs.com/api/health
# Should return 200 OK with health status
```

#### Alerts
- [ ] Database connection failures alert
- [ ] API error rate >5% alert
- [ ] High response time alert (>2s)
- [ ] Storage quota warning (>80%)
- [ ] SSL certificate expiration warning (30 days)
- [ ] Failed deployment alert

---

### 🧪 Testing

#### Unit Tests
- [ ] All unit tests passing
  ```bash
  pnpm test
  ```
- [ ] Test coverage >70% (target: >80%)
- [ ] No failing tests in CI/CD

#### Integration Tests
- [ ] API endpoints tested:
  - [ ] `/api/auth/*` (login, logout, signup)
  - [ ] `/api/patients/*` (CRUD operations)
  - [ ] `/api/clinical-notes/*` (create, update, view)
  - [ ] `/api/access-grants/*` (create, revoke)
- [ ] Database queries tested
- [ ] External API integration tested (mock responses)

#### End-to-End Tests (Playwright)
- [ ] Critical user flows tested:
  - [ ] Login → Dashboard → View Patient
  - [ ] Create Patient → Create Clinical Note
  - [ ] Start Scribe Session → Generate SOAP
  - [ ] Search Patients → View Details
- [ ] E2E tests passing on staging
- [ ] E2E tests run in CI/CD

**Run E2E Tests:**
```bash
pnpm playwright test --project=chromium
```

#### Performance Tests
- [ ] Lighthouse audit score >90
- [ ] Core Web Vitals passing:
  - [ ] LCP <2.5s
  - [ ] FID <100ms
  - [ ] CLS <0.1
- [ ] API response times <500ms (p95)
- [ ] Database queries <200ms (p95)
- [ ] Load testing completed (100 concurrent users)

**Run Lighthouse:**
```bash
lighthouse https://holilabs.com --view
```

#### Security Tests
- [ ] OWASP Top 10 vulnerability scan passed
- [ ] SQL injection tests passed
- [ ] XSS prevention validated
- [ ] CSRF protection validated
- [ ] Authentication bypass tests passed
- [ ] No sensitive data in client-side code

---

### 📱 Mobile & PWA

#### Mobile Responsiveness
- [ ] Tested on iOS (iPhone, iPad)
- [ ] Tested on Android (phone, tablet)
- [ ] Touch targets ≥44px
- [ ] No horizontal scrolling
- [ ] Forms usable on mobile keyboards
- [ ] Viewport configured correctly

#### PWA Features
- [ ] `manifest.json` configured
- [ ] Icons for all sizes (192x192, 512x512)
- [ ] Service worker registered
- [ ] Offline page displayed when offline
- [ ] Installable on iOS (Add to Home Screen)
- [ ] Installable on Android

**Test PWA:**
```bash
# Chrome DevTools → Lighthouse → PWA audit
# Should score >90
```

---

### 🎨 UI/UX

#### Loading States
- [ ] Skeleton loaders on all pages
- [ ] Loading spinners on async actions
- [ ] Optimistic UI updates where appropriate
- [ ] No blank screens during load

#### Error Handling
- [ ] Error boundaries on all pages
- [ ] User-friendly error messages
- [ ] Retry mechanisms for failed requests
- [ ] Network error handling
- [ ] Form validation errors clear

#### Accessibility (WCAG 2.1 Level AA)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader support (ARIA labels)
- [ ] Color contrast ≥4.5:1
- [ ] Focus indicators visible
- [ ] Form labels properly associated
- [ ] Alt text on all images

**Run Accessibility Audit:**
```bash
# Chrome DevTools → Lighthouse → Accessibility
# Should score >90
```

---

### 📝 Documentation

#### User Documentation
- [ ] Provider onboarding guide
- [ ] Feature documentation
- [ ] FAQ page
- [ ] Help center or knowledge base
- [ ] Video tutorials (optional)

#### Technical Documentation
- [ ] README.md up to date
- [ ] API documentation (if public API)
- [ ] Deployment runbook
- [ ] Incident response playbook
- [ ] Database schema documentation
- [ ] Environment variables documented

#### Compliance Documentation
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] HIPAA compliance documentation
- [ ] BAA documents filed
- [ ] Data retention policy documented
- [ ] Breach notification procedures documented

---

## 🚀 Deployment Steps

### Pre-Deployment

**1 Week Before:**
- [ ] Complete all checklist items above
- [ ] Run full test suite on staging
- [ ] Performance audit on staging
- [ ] Security audit on staging
- [ ] UAT with 3+ beta providers
- [ ] Document any known issues

**3 Days Before:**
- [ ] Freeze code (no new features)
- [ ] Final staging tests
- [ ] Notify team of deployment schedule
- [ ] Prepare rollback plan
- [ ] On-call schedule confirmed

**1 Day Before:**
- [ ] Verify all production credentials
- [ ] Test database backup/restore
- [ ] Verify monitoring alerts working
- [ ] Final smoke tests on staging
- [ ] Communication plan ready

### Deployment Day

**Step 1: Pre-Deployment (09:00)**
- [ ] Team standup - deployment readiness
- [ ] Verify all systems green
- [ ] Put status page in maintenance mode (optional)

**Step 2: Deploy to Production (10:00)**
- [ ] Push code to `main` branch (triggers auto-deploy)
- [ ] Monitor build logs for errors
- [ ] Wait for deployment to complete (~10 minutes)

**Step 3: Post-Deployment Verification (10:15)**
- [ ] Check `/api/health` endpoint
  ```bash
  curl https://holilabs.com/api/health
  ```
- [ ] Verify home page loads
- [ ] Login as test user
- [ ] Create test patient (then delete)
- [ ] Verify PostHog receiving events
- [ ] Verify Sentry not reporting errors
- [ ] Check database connectivity

**Step 4: Smoke Tests (10:30)**
Run critical user journeys:
- [ ] Login → Dashboard
- [ ] Search for patient
- [ ] View patient details
- [ ] Create clinical note
- [ ] Start scribe session
- [ ] Generate SOAP note
- [ ] Logout

**Step 5: Monitoring (10:45 - 12:00)**
- [ ] Watch error rates in Sentry (should be <1%)
- [ ] Watch response times in logs (should be <500ms)
- [ ] Monitor PostHog for user activity
- [ ] Check server resources (CPU, memory)
- [ ] Verify no alerts triggered

**Step 6: Gradual Rollout (12:00 onwards)**
- [ ] Invite 5 beta providers to test
- [ ] Monitor usage closely (first 2 hours)
- [ ] Collect feedback
- [ ] Fix any critical issues immediately

### Post-Deployment (First 24 Hours)

**Hour 1-2: Intensive Monitoring**
- [ ] Team member watching dashboards continuously
- [ ] Ready to rollback if needed
- [ ] Quick response to user issues

**Hour 2-6: Active Monitoring**
- [ ] Check dashboards every 30 minutes
- [ ] Respond to user feedback
- [ ] Document any issues

**Hour 6-24: Standard Monitoring**
- [ ] Check dashboards every 2 hours
- [ ] On-call person available
- [ ] Daily summary report

**Day 2-7: Post-Launch Review**
- [ ] Daily metrics review
- [ ] User feedback analysis
- [ ] Performance optimization opportunities
- [ ] Bug prioritization
- [ ] Plan next iteration

---

## 🔴 Rollback Plan

### When to Rollback

**Critical Issues (Rollback Immediately):**
- Database corruption or data loss
- HIPAA violation detected
- Security breach
- Authentication broken
- >20% error rate
- Complete service outage

**Major Issues (Consider Rollback):**
- >10% error rate
- Critical feature broken
- Performance degradation >50%
- Multiple user complaints

### Rollback Procedure

**Step 1: Decide to Rollback (< 5 minutes)**
- Team lead makes call
- Notify team in Slack

**Step 2: Rollback Code (< 10 minutes)**
```bash
# Option A: Revert to previous deployment in DigitalOcean
# Apps → [Your App] → Deployments → Previous → Redeploy

# Option B: Revert git commit
git revert HEAD
git push origin main
# Auto-deploy will trigger
```

**Step 3: Rollback Database (if needed) (< 30 minutes)**
```bash
# Only if database migrations were run
# Restore from backup
# Follow database rollback runbook
```

**Step 4: Verify Rollback (< 15 minutes)**
- [ ] `/api/health` responding
- [ ] Home page loads
- [ ] Login works
- [ ] Critical features work
- [ ] No errors in Sentry

**Step 5: Communicate (< 30 minutes)**
```
Subject: Holi Labs Maintenance Complete

We encountered a technical issue and have rolled back to the previous version.
All systems are now operational. We apologize for any inconvenience.

Thank you for your patience.
```

**Step 6: Post-Mortem (Next Day)**
- What went wrong?
- Why didn't we catch it?
- How do we prevent it?
- Update checklist

---

## 📊 Success Metrics

**Deployment Success:**
- [ ] Zero critical errors in first 24 hours
- [ ] <1% error rate
- [ ] API response time p95 <500ms
- [ ] All Core Web Vitals passing
- [ ] No security incidents
- [ ] No HIPAA violations

**A/B Testing Readiness:**
- [ ] PostHog tracking all events correctly
- [ ] Feature flags toggleable without deployment
- [ ] Feedback widget collecting responses
- [ ] Performance dashboards populated
- [ ] Analytics team can run queries

**User Adoption (First Week):**
- [ ] 10+ providers signed up
- [ ] 50+ patients created
- [ ] 100+ clinical notes created
- [ ] 10+ scribe sessions completed
- [ ] >80% user satisfaction (feedback widget)

---

## 📞 Contacts & Support

**Emergency Contacts:**
- Lead Developer: [Phone]
- DevOps: [Phone]
- On-Call: [Phone]

**Vendor Support:**
- DigitalOcean: cloud.digitalocean.com/support
- Supabase: support@supabase.com
- PostHog: support@posthog.com
- Sentry: support@sentry.io

**Internal:**
- Engineering Slack: #holi-labs-eng
- Incidents Slack: #holi-labs-incidents
- Email: engineering@holilabs.com

---

## ✅ Final Sign-Off

**Before checking this box, verify:**
- [ ] All items above completed
- [ ] Staging environment matches production
- [ ] Team is ready
- [ ] Rollback plan tested
- [ ] On-call schedule confirmed
- [ ] User communication prepared

**Deployment Lead Approval:**
- Name: _______________
- Date: _______________
- Signature: _______________

**Tech Lead Approval:**
- Name: _______________
- Date: _______________
- Signature: _______________

---

**Let's ship it! 🚀**

---

**Document Version:** 1.0
**Last Updated:** October 2025
**Next Review:** After first production deployment
