# ✅ Production Launch Checklist - Holi Labs

**Launch Target:** [Your target date]
**Status:** Pre-Launch Preparation

---

## 🔐 Phase 1: Security & Secrets (CRITICAL - Day 1)

- [ ] **Generate ALL production secrets** (run these commands):
  ```bash
  # Session secret
  openssl rand -hex 32

  # NextAuth secret
  openssl rand -hex 32

  # Encryption key
  openssl rand -base64 32

  # Cron secret
  openssl rand -hex 32

  # De-identification secret
  openssl rand -hex 32
  ```

- [ ] **Set environment variables in DigitalOcean**
  - [ ] Go to App Settings → Environment Variables
  - [ ] Add all secrets from commands above
  - [ ] Mark sensitive variables as "Encrypted"
  - [ ] Verify `NEXTAUTH_URL` matches production domain

- [ ] **Database security**
  - [ ] Connection string uses `sslmode=require`
  - [ ] Database firewall allows only DigitalOcean App IP
  - [ ] Strong database password (30+ characters)

---

## 🏥 Phase 2: HIPAA Compliance (REQUIRED - Week 1-2)

### Business Associate Agreements (BAAs)

- [ ] **DigitalOcean BAA** (Database hosting)
  - Upgrade to Premium Support plan
  - Request at: https://www.digitalocean.com/trust/compliance
  - Timeline: 2-3 business days

- [ ] **Supabase BAA** (File storage)
  - Contact Enterprise Sales
  - Request at: https://supabase.com/contact/enterprise
  - Timeline: 5-7 business days

- [ ] **PostHog BAA** (Analytics)
  - Email: hey@posthog.com
  - Request HIPAA BAA for US Cloud
  - Timeline: 1-2 business days

- [ ] **Anthropic BAA** (AI clinical notes)
  - Contact: https://www.anthropic.com/contact-sales
  - Mention healthcare use case
  - Timeline: 7-10 business days

- [ ] **Twilio BAA** (SMS/WhatsApp) - *Optional*
  - Self-service: https://www.twilio.com/legal/hipaa
  - Timeline: Immediate

### Compliance Documentation

- [ ] Create BAA tracking spreadsheet
- [ ] Store signed BAAs in secure folder
- [ ] Set calendar reminders for BAA renewals (60 days before expiration)
- [ ] Review HIPAA_BAA_REQUIREMENTS.md document

---

## 📊 Phase 3: Monitoring & Analytics (Week 1)

### PostHog Setup

- [ ] **Create production project**
  - Sign up: https://posthog.com/signup
  - Choose US Cloud (HIPAA compliance)
  - Name: "Holi Labs - Production"

- [ ] **Copy API keys**
  - [ ] Add `NEXT_PUBLIC_POSTHOG_KEY` to DigitalOcean
  - [ ] Add `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com`

- [ ] **Create feature flags** for A/B testing:
  - [ ] `new-dashboard-layout` (Boolean)
  - [ ] `ai-scribe-beta` (Boolean)
  - [ ] `voice-recording-v2` (Multivariate)

- [ ] **Set up funnels**:
  - [ ] Onboarding: Signup → First Patient → First Note
  - [ ] Activation: 5+ notes created within 7 days
  - [ ] Retention: Day 7, Day 30 active users

### Sentry Error Monitoring

- [ ] **Create Sentry project**
  - Sign up: https://sentry.io
  - Create project: "Holi Labs Production"

- [ ] **Configure DSN**
  - [ ] Add `NEXT_PUBLIC_SENTRY_DSN` to DigitalOcean
  - [ ] Add `SENTRY_AUTH_TOKEN`
  - [ ] Add `SENTRY_ORG` and `SENTRY_PROJECT`

- [ ] **Set up alert rules**:
  - [ ] Critical errors >10/hour
  - [ ] Database connection failures (any occurrence)
  - [ ] Authentication failures >50/hour

- [ ] **Configure data scrubbing**
  - Review sentry.config.ts
  - Test PHI sanitization with fake data
  - Verify no CPF/email in error logs

---

## 🚀 Phase 4: Deployment (Week 2)

### Database Setup

- [ ] **Run migrations on production**
  ```bash
  npx prisma migrate deploy
  ```

- [ ] **Verify tables created**
  ```bash
  npx prisma studio
  # Connect to production database
  # Check all 12 tables exist
  ```

- [ ] **Create first clinician account**
  - Use signup flow with real email
  - Verify email delivery works
  - Test login successful

### Deployment Verification

- [ ] **Push to production**
  ```bash
  git push origin main
  # Auto-deploys to DigitalOcean
  ```

- [ ] **Check build logs**
  - Go to DigitalOcean → Deployments
  - Verify "Build Successful"
  - No TypeScript errors
  - No environment variable warnings

- [ ] **Test health endpoint**
  ```bash
  curl https://holilabs-lwp6y.ondigitalocean.app/api/health
  ```
  - Expected: `{"status": "ok", "database": "connected"}`

### Critical Tests (Run in this order)

- [ ] **Authentication**
  - [ ] Signup with new email works
  - [ ] Login with password works
  - [ ] Logout clears session
  - [ ] Password reset email sends

- [ ] **Patient Management**
  - [ ] Create patient (no errors)
  - [ ] Patient appears in list
  - [ ] Search patient by name
  - [ ] View patient detail page

- [ ] **Clinical Notes**
  - [ ] Create SOAP note
  - [ ] AI generation works (Anthropic API)
  - [ ] Save note to database
  - [ ] View note in history

- [ ] **File Upload**
  - [ ] Upload document (Supabase)
  - [ ] File appears in patient record
  - [ ] Download file works
  - [ ] PDF preview works

- [ ] **PWA Installation**
  - [ ] Open on iPhone Safari
  - [ ] "Add to Home Screen" works
  - [ ] Holi Labs icon appears (not screenshot)
  - [ ] Opens without Safari UI
  - [ ] Test offline mode (airplane mode)

---

## 📱 Phase 5: iPhone Testing (Week 2)

### iOS Installation

- [ ] **Test on real iPhone**
  - Visit: https://holilabs-lwp6y.ondigitalocean.app
  - Safari → Share → Add to Home Screen
  - Icon shows correctly
  - App name: "Holi Labs"

- [ ] **Standalone Mode**
  - Open from home screen
  - No Safari address bar
  - Full-screen experience
  - Safe area handling (notch)

- [ ] **Offline Functionality**
  - Enable airplane mode
  - Open app
  - Navigate between pages
  - Service worker caching works

- [ ] **Touch Interactions**
  - Buttons ≥44px tap targets
  - No zoom on input focus
  - Smooth scrolling
  - Swipe gestures work

---

## 🔒 Phase 6: Security Audit (Week 3)

### Penetration Testing

- [ ] **SSL Certificate**
  ```bash
  curl -I https://holilabs-lwp6y.ondigitalocean.app | grep -i "strict-transport"
  ```
  - Expected: HSTS header present

- [ ] **Security Headers**
  ```bash
  curl -I https://holilabs-lwp6y.ondigitalocean.app
  ```
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Strict-Transport-Security
  - [ ] Content-Security-Policy

- [ ] **Rate Limiting**
  ```bash
  for i in {1..30}; do curl https://holilabs-lwp6y.ondigitalocean.app/api/patients; done
  ```
  - Expected: HTTP 429 after ~20 requests

### Dependency Audit

- [ ] **Run security scan**
  ```bash
  npm audit
  ```
  - 0 critical vulnerabilities
  - 0 high vulnerabilities

- [ ] **Update dependencies**
  ```bash
  npm audit fix
  ```

---

## 📈 Phase 7: Go-Live (Week 4)

### Pre-Launch

- [ ] **Final smoke tests**
  - [ ] All critical features work
  - [ ] No console errors in browser
  - [ ] Mobile responsive on iPhone
  - [ ] PostHog events tracking
  - [ ] Sentry catching errors

- [ ] **Backup verification**
  - [ ] Database auto-backup enabled (DigitalOcean)
  - [ ] Backup retention: 7 days minimum
  - [ ] Test database restore procedure

### Launch Day

- [ ] **Monitor dashboards**
  - [ ] Sentry dashboard (errors)
  - [ ] PostHog dashboard (user activity)
  - [ ] DigitalOcean metrics (uptime, CPU, memory)

- [ ] **Invite first beta users**
  - [ ] 3-5 friendly physicians
  - [ ] Send onboarding email
  - [ ] Schedule follow-up calls (Day 3, Day 7)

### Week 1 Goals

- [ ] **User Activation**
  - Target: 5+ active clinicians
  - Target: 20+ clinical notes created
  - Target: >50% complete onboarding

- [ ] **Technical Health**
  - Target: >99% uptime
  - Target: <2s average page load
  - Target: 0 critical errors in Sentry

---

## 🚨 Emergency Contacts

**Production Issues:**
- On-call Engineer: [Your phone/Slack]
- Database: DigitalOcean Premium Support
- AI API: Anthropic Status Page

**Compliance:**
- HIPAA Officer: [Contact]
- Legal: [Contact]

---

## 📚 Documentation Links

- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [HIPAA BAA Requirements](./HIPAA_BAA_REQUIREMENTS.md)
- [A/B Testing Guide](./AB_TESTING_GUIDE.md)
- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)

---

**Last Updated:** January 2025
**Next Review:** Weekly during first month, then monthly
