# Security Deployment Checklist
## Production Hardening - NordVPN Warning Resolution

**Created**: 2026-01-08
**Target Deployment Date**: _____________
**Maintenance Window**: _____________

---

## Pre-Deployment Checklist

### ✅ Code Changes (COMPLETED)
- [x] Remove duplicate security headers from next.config.js
- [x] Strengthen CSP in security-headers.ts (remove unsafe-inline in production)
- [x] Create CSP violation report endpoint
- [x] Update Sentry to 10.32.1 (fix header leak CVE)
- [x] Add pnpm overrides for transitive dependencies
- [x] Update .gitignore to prevent secret commits
- [x] Create production secrets generator script
- [x] Build test passed (174/174 pages)

### 🔐 Secret Rotation (REQUIRED BEFORE DEPLOYMENT)

#### Internal Secrets (Generated via Script)
- [ ] Run: `./apps/web/scripts/generate-production-secrets.sh`
- [ ] Copy output (DO NOT save to file!)
- [ ] Update in DigitalOcean App Platform:
  - [ ] SESSION_SECRET
  - [ ] NEXTAUTH_SECRET
  - [ ] ENCRYPTION_KEY
  - [ ] ENCRYPTION_MASTER_KEY
  - [ ] TOKEN_ENCRYPTION_KEY
  - [ ] CRON_SECRET
  - [ ] DEID_SECRET

#### External Service Secrets (Manual Rotation)
- [ ] **Sentry Auth Token**
  - Go to: https://sentry.io/settings/auth-tokens/
  - Revoke old token → Create new
  - Update: `SENTRY_AUTH_TOKEN` in DigitalOcean

- [ ] **Google OAuth Secret** (if using)
  - Go to: https://console.cloud.google.com/apis/credentials
  - Select OAuth 2.0 Client → Regenerate secret
  - Update: `GOOGLE_CLIENT_SECRET` in DigitalOcean

- [ ] **Resend API Key** (email service)
  - Go to: https://resend.com/api-keys
  - Revoke old key → Create new
  - Update: `RESEND_API_KEY` in DigitalOcean

- [ ] **Twilio** (if using SMS/WhatsApp)
  - Go to: https://console.twilio.com/
  - Create new Auth Token
  - Update: `TWILIO_AUTH_TOKEN` in DigitalOcean

### 📢 User Communication
- [ ] Draft maintenance notice (see template below)
- [ ] Post maintenance notice 24 hours before deployment
- [ ] Notify active users via:
  - [ ] Email
  - [ ] In-app banner
  - [ ] Status page (if applicable)

### 🧪 Staging Verification (RECOMMENDED)
- [ ] Deploy to staging environment first
- [ ] Test security headers:
  ```bash
  curl -I https://staging.your-domain.com | grep -i "content-security-policy"
  ```
- [ ] Verify CSP is strict (no unsafe-inline, no external CDNs)
- [ ] Test login flow (sessions should be fresh)
- [ ] Test core workflows:
  - [ ] Patient creation
  - [ ] SOAP note creation
  - [ ] Prescription creation
- [ ] Check browser console for CSP violations

---

## Deployment Steps

### Step 1: Git Commit and Push
```bash
# Stage security changes
git add .gitignore apps/web/next.config.js apps/web/package.json
git add apps/web/src/lib/security-headers.ts
git add apps/web/src/app/api/security/csp-report/route.ts
git add apps/web/scripts/generate-production-secrets.sh

# Commit (use the commit message from previous instructions)
git commit -m "security: production hardening to resolve NordVPN threat detection warning [see full message]"

# Create feature branch
git checkout -b security/production-hardening

# Push to remote
git push origin security/production-hardening
```

### Step 2: Create Pull Request
```bash
gh pr create --title "Security: Production Hardening - Fix NordVPN Warning" --body "See PR template below"
```

### Step 3: Review and Merge
- [ ] Code review completed (or self-review if solo)
- [ ] All checks passed (build, tests)
- [ ] Merge to `main` branch
- [ ] Delete feature branch after merge

### Step 4: Deploy to Production
- [ ] **Option A**: DigitalOcean App Platform UI
  - Settings → Environment Variables → Update secrets → Save
  - Deployments tab → Create Deployment from `main`

- [ ] **Option B**: Auto-deploy via GitHub
  - DigitalOcean will auto-deploy after merge to `main`

### Step 5: Monitor Deployment
- [ ] Watch deployment logs in DigitalOcean
- [ ] Verify deployment succeeded (status: ACTIVE)
- [ ] Check health endpoint: `https://your-domain.com/api/health`

---

## Post-Deployment Verification

### Immediate Checks (0-15 minutes)

- [ ] **Site Accessibility**
  ```bash
  curl -I https://your-domain.com
  # Expected: HTTP/2 200
  ```

- [ ] **Security Headers Verification**
  ```bash
  curl -I https://your-domain.com | grep -i "content-security-policy"
  # Expected: script-src 'self' 'nonce-...' (NO unsafe-inline, NO external CDNs)
  ```

- [ ] **Login Flow Test**
  - Visit: https://your-domain.com
  - Try to access dashboard (should redirect to login - sessions invalidated)
  - Login with test account
  - Verify dashboard loads correctly

- [ ] **Sentry Check**
  - Go to: https://sentry.io/organizations/your-org/issues/
  - Look for new errors (first 15 minutes)
  - Expected: No spike in 500 errors

- [ ] **CSP Violation Reports**
  - Check logs for: `/api/security/csp-report`
  - Expected: 0-5 violations initially (may be legitimate external resources)

### 1-Hour Monitoring

- [ ] Monitor Sentry error rate (should be stable or decreasing)
- [ ] Check DigitalOcean logs for any unexpected errors
- [ ] User feedback: Any login issues reported?
- [ ] Test core workflows as end-user:
  - [ ] Create patient record
  - [ ] Create SOAP note
  - [ ] View patient list

### 24-Hour Monitoring

- [ ] **Security Headers Score**
  - Go to: https://securityheaders.com/?q=your-domain.com
  - Expected rating: **A or A+**
  - Verify all headers present:
    - ✅ Content-Security-Policy
    - ✅ Strict-Transport-Security
    - ✅ X-Frame-Options: DENY
    - ✅ X-Content-Type-Options: nosniff
    - ✅ Referrer-Policy
    - ✅ Permissions-Policy

- [ ] **SSL/TLS Test**
  - Go to: https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
  - Expected rating: **A or A+**
  - Verify: TLS 1.2+, strong ciphers, HSTS present

- [ ] **Mozilla Observatory Scan**
  - Go to: https://observatory.mozilla.org/
  - Expected score: **80-100 (B+ to A+)**

- [ ] **CSP Violations Review**
  - Review all logged CSP violations
  - For each violation:
    - Is it legitimate (e.g., browser extension)?
    - Or does it indicate a real issue?
  - Whitelist legitimate resources if needed

### 48-72 Hour Verification (NordVPN Warning Clearance)

- [ ] **NordVPN Test**
  - Enable NordVPN (Threat Protection: ON)
  - Clear browser cache completely
  - Visit: https://your-domain.com
  - **Expected**: No "Potential scam detected" warning

- [ ] **If warning persists after 72 hours**:
  - Contact NordVPN Support: https://support.nordvpn.com/
  - Subject: "Request to whitelist domain - False positive threat detection"
  - Provide evidence:
    - securityheaders.com A+ rating screenshot
    - SSL Labs A+ rating screenshot
    - Explanation: "Fixed security issues, rotated secrets, strengthened CSP"
  - Expected response time: 1-3 business days

### 1-Week Monitoring

- [ ] Review aggregate metrics:
  - [ ] User login success rate (should be 95%+)
  - [ ] Error rate in Sentry (should be stable)
  - [ ] Performance metrics (should be unchanged)
  - [ ] CSP violation patterns (should be minimal)

- [ ] User feedback survey (optional):
  - Any issues with login?
  - Any functionality broken?
  - Any unexpected errors?

---

## Rollback Plan

### When to Rollback
Rollback immediately if:
- Login failure rate >10%
- Critical functionality broken (patient creation, notes, prescriptions)
- Spike in 500 errors (>5% of requests)
- Site inaccessible for >5 minutes

### Rollback Steps

**Option 1: DigitalOcean UI (fastest)**
```
1. Go to DigitalOcean App Platform → Your App
2. Deployments tab
3. Click "Rollback" on previous deployment
4. Confirm rollback
5. Wait for deployment to complete (~5 minutes)
```

**Option 2: Git Revert**
```bash
# Revert the security hardening commit
git revert HEAD
git push origin main

# DigitalOcean will auto-deploy the revert
```

**DO NOT** restore old secrets if they were leaked!
Instead, keep new secrets and investigate the configuration issue.

### Post-Rollback Actions
- [ ] Identify root cause of issue
- [ ] Fix the issue in a new branch
- [ ] Re-test in staging
- [ ] Schedule new deployment

---

## Troubleshooting Common Issues

### Issue: CSP Violations Breaking Functionality

**Symptoms**: Features not loading, console errors about blocked resources

**Solution**: Temporarily add the blocked resource to CSP
```typescript
// apps/web/src/lib/security-headers.ts
// Add to appropriate directive (script-src, connect-src, etc.)
"script-src 'self' 'nonce-...' https://trusted-cdn.example.com"
```

**Then**: Redeploy and verify fix

### Issue: Users Can't Login After Deployment

**Symptoms**: "Invalid session" errors, redirect loops

**Solution**: This is expected behavior after secret rotation!
- Verify users are seeing the login page (not errors)
- Clear browser cookies and try again
- If issue persists, check:
  - DATABASE_URL is correct
  - SESSION_SECRET and NEXTAUTH_SECRET were updated
  - Database is accessible from app

### Issue: NordVPN Warning Still Shows After 72 Hours

**Solution**: Manual whitelist request
1. Verify security headers are correct (A+ rating)
2. Contact NordVPN support with evidence
3. Request manual domain review
4. Wait 1-3 business days for whitelist

### Issue: Sentry Not Receiving Events

**Symptoms**: No errors in Sentry dashboard

**Solution**: Verify Sentry configuration
```bash
# Check Sentry DSN is set
curl https://your-domain.com/api/health | grep sentry

# Check Sentry auth token is valid (check deployment logs)
# Look for: "Sentry initialized successfully"
```

---

## Success Metrics

### Immediate Success (Day 1)
- ✅ Deployment completed successfully
- ✅ Site is accessible
- ✅ Users can login (after re-authentication)
- ✅ Core workflows function correctly
- ✅ No spike in errors

### Short-term Success (Week 1)
- ✅ securityheaders.com: **A or A+** rating
- ✅ SSL Labs: **A or A+** rating
- ✅ Mozilla Observatory: **80-100** score
- ✅ NordVPN warning **CLEARED**
- ✅ CSP violations: <10 per day (legitimate only)
- ✅ User satisfaction: No major complaints

### Long-term Success (Month 1)
- ✅ Zero security-related incidents
- ✅ Maintained A+ security ratings
- ✅ CSP policy refined based on violation logs
- ✅ All external service secrets rotated on schedule

---

## Maintenance Notice Template

**Subject**: Scheduled Maintenance - [Date] [Time]

**Body**:
```
Dear Holi Labs Users,

We will be performing critical security maintenance on [Date] at [Time] [Timezone].

Expected Duration: 15-30 minutes
Impact: All users will be logged out and must re-login after maintenance.

What we're doing:
- Enhancing security headers to improve protection
- Updating security components to latest versions
- Rotating encryption keys for enhanced security

What you need to do:
- No action required before maintenance
- After maintenance, simply login again with your existing credentials
- All your data will remain safe and accessible

We apologize for any inconvenience and thank you for your patience.

If you experience any issues after maintenance, please contact support at: support@holilabs.com

Best regards,
Holi Labs Team
```

---

## Sign-Off

**Deployment Completed By**: _______________________
**Date**: _______________________
**Time**: _______________________

**Post-Deployment Verification Completed**: _______________________
**Date**: _______________________

**NordVPN Warning Cleared**: _______________________
**Date**: _______________________

**Deployment Status**: ✅ SUCCESS / ⚠️ PARTIAL / ❌ ROLLBACK

**Notes**:
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

---

**Next Security Review Date**: _______________ (Recommended: 3 months)
