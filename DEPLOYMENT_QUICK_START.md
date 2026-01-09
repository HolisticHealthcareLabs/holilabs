# 🚀 Quick Start: Security Deployment

**Status**: Ready to deploy
**Estimated Time**: 2-3 hours (including secret rotation)
**Risk Level**: LOW (rollback ready)

---

## ⚡ Quick Reference

### What Was Fixed?
✅ **Weak CSP** → Strict nonce-based (no unsafe-inline)
✅ **Duplicate headers** → Single source of truth
✅ **Outdated Sentry** → 10.32.1 (CVE fixed)
✅ **Secret management** → Comprehensive .gitignore

### Why It Matters?
NordVPN flagged your site due to weak security configuration. These fixes will:
- Clear the "Potential scam detected" warning (48-72 hours after deployment)
- Achieve A+ security rating on securityheaders.com
- Fix known CVEs in dependencies

---

## 🎯 Next Steps (In Order)

### 1️⃣ Commit Your Changes (5 min)

```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2

# Stage security files
git add .gitignore
git add apps/web/next.config.js
git add apps/web/package.json
git add apps/web/src/lib/security-headers.ts
git add apps/web/src/app/api/security/csp-report/route.ts
git add apps/web/scripts/generate-production-secrets.sh

# Also stage documentation
git add SECURITY_DEPLOYMENT_CHECKLIST.md
git add DEPLOYMENT_QUICK_START.md
git add .github/PULL_REQUEST_TEMPLATE_SECURITY.md

# Commit (see full commit message in previous chat)
git commit -m "security: production hardening to resolve NordVPN threat detection warning

This commit addresses critical security issues causing NordVPN's 'Potential scam detected' warning.

## Changes Made
- Remove duplicate security headers (140 lines from next.config.js)
- Strengthen CSP (no unsafe-inline, no external CDNs in production)
- Update Sentry 10.26.0 → 10.32.1 (fix header leak CVE)
- Add CSP violation reporting endpoint
- Improve secret management (.gitignore + generator script)

## Breaking Change
⚠️ Secret rotation required. All user sessions will be invalidated.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Create and push branch
git checkout -b security/production-hardening
git push origin security/production-hardening
```

### 2️⃣ Generate New Production Secrets (10 min) ⚠️ CRITICAL

```bash
# Generate secrets (output goes to clipboard)
./apps/web/scripts/generate-production-secrets.sh | pbcopy

# The script will output:
# - SESSION_SECRET
# - NEXTAUTH_SECRET
# - ENCRYPTION_KEY
# - ENCRYPTION_MASTER_KEY
# - TOKEN_ENCRYPTION_KEY
# - CRON_SECRET
# - DEID_SECRET

# DO NOT save output to a file! Use directly from clipboard.
```

### 3️⃣ Update Secrets in DigitalOcean (15 min) ⚠️ CRITICAL

#### For DigitalOcean App Platform:
1. Go to: https://cloud.digitalocean.com/apps
2. Select your app
3. Click **Settings** → **App-Level Environment Variables**
4. Update each secret from clipboard (paste one at a time)
5. Click **Save** (DO NOT deploy yet)

#### For Vercel:
1. Go to: https://vercel.com/dashboard
2. Select project → **Settings** → **Environment Variables**
3. Edit each secret for **Production** environment
4. Save changes

### 4️⃣ Rotate External Service Secrets (20 min)

#### Sentry (required if using):
```
1. Go to: https://sentry.io/settings/auth-tokens/
2. Find old token → Click "Revoke"
3. Click "Create New Token"
   - Name: "Production - Holi Labs"
   - Scopes: project:read, project:write, project:releases
4. Copy token
5. Update SENTRY_AUTH_TOKEN in DigitalOcean/Vercel
```

#### Google OAuth (if applicable):
```
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID
3. Click "Regenerate Secret"
4. Copy new secret
5. Update GOOGLE_CLIENT_SECRET in DigitalOcean/Vercel
```

#### Resend (email service):
```
1. Go to: https://resend.com/api-keys
2. Find old key → Click "Delete"
3. Click "Create API Key"
   - Name: "Production - Holi Labs"
   - Permission: Sending access
4. Copy key
5. Update RESEND_API_KEY in DigitalOcean/Vercel
```

### 5️⃣ Post Maintenance Notice (1 hour before deployment)

**Send to**:
- Email: All active users
- In-app: Banner notification
- Status page: If you have one

**Template** (customize as needed):
```
Subject: Scheduled Maintenance - [Date] at [Time]

We're performing critical security updates today.

Duration: 15-30 minutes
Impact: You'll be logged out and need to login again.

Your data is safe. Just login again after maintenance completes.

Questions? Email: support@holilabs.com

- Holi Labs Team
```

### 6️⃣ Create Pull Request (5 min)

```bash
# Option A: Using GitHub CLI (recommended)
gh pr create \
  --title "Security: Production Hardening - Fix NordVPN Warning" \
  --body-file .github/PULL_REQUEST_TEMPLATE_SECURITY.md

# Option B: Via GitHub Web UI
# 1. Go to: https://github.com/your-org/holilabsv2/pulls
# 2. Click "New pull request"
# 3. Select: base: main ← compare: security/production-hardening
# 4. Copy/paste from: .github/PULL_REQUEST_TEMPLATE_SECURITY.md
```

### 7️⃣ Review and Merge (10 min)

```bash
# Self-review checklist:
- [ ] All security files staged and committed
- [ ] Production secrets rotated in DigitalOcean
- [ ] External service secrets rotated
- [ ] Maintenance notice posted
- [ ] PR created and reviewed

# If all checks pass:
# 1. Merge PR to main
# 2. Delete feature branch
```

### 8️⃣ Deploy to Production (30 min)

#### Auto-Deploy (if enabled):
- DigitalOcean will auto-deploy after merge to `main`
- Watch: https://cloud.digitalocean.com/apps → Your App → Deployments

#### Manual Deploy:
```
1. Go to: https://cloud.digitalocean.com/apps → Your App
2. Click **Deployments** tab
3. Click **Create Deployment**
4. Select branch: main
5. Click **Deploy**
```

**Monitor deployment**:
- Status should change: BUILDING → DEPLOYING → ACTIVE
- Check logs for errors
- Expected time: 10-15 minutes

### 9️⃣ Verify Deployment (15 min)

```bash
# 1. Check site is accessible
curl -I https://your-domain.com
# Expected: HTTP/2 200

# 2. Check security headers
curl -I https://your-domain.com | grep -i "content-security-policy"
# Expected: script-src 'self' 'nonce-...' (NO unsafe-inline)

# 3. Test login
# - Visit https://your-domain.com
# - Should redirect to login (session invalidated)
# - Login with your account
# - Dashboard should load normally

# 4. Check Sentry for errors
# https://sentry.io/organizations/your-org/issues/
# Should be stable (no spike in errors)
```

### 🔟 Verify Security Scores (24 hours later)

```bash
# 1. Security Headers Score
# Go to: https://securityheaders.com/?q=your-domain.com
# Expected: A or A+ rating

# 2. SSL/TLS Test
# Go to: https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
# Expected: A or A+ rating

# 3. Mozilla Observatory
# Go to: https://observatory.mozilla.org/
# Expected: 80-100 (B+ to A+)
```

### 1️⃣1️⃣ Wait for NordVPN Warning Clearance (48-72 hours)

```
NordVPN's threat database updates are not instant.

After 48-72 hours:
1. Enable NordVPN (Threat Protection: ON)
2. Clear browser cache
3. Visit: https://your-domain.com
4. Expected: NO warning

If warning persists after 72 hours:
- Contact NordVPN Support
- Provide: securityheaders.com A+ screenshot
- Request: Manual domain whitelist
- Wait: 1-3 business days
```

---

## 🆘 Emergency Rollback

If something goes wrong:

### Quick Rollback (5 min):
```
1. Go to: https://cloud.digitalocean.com/apps → Your App
2. Click **Deployments** tab
3. Find previous deployment
4. Click **Rollback**
5. Confirm
```

### Git Rollback:
```bash
git revert HEAD
git push origin main
# DigitalOcean will auto-deploy the revert
```

### When to Rollback:
- Login failure rate >10%
- Critical features broken (patient creation, notes, etc.)
- 500 error spike >5% of requests
- Site down for >5 minutes

**Important**: DO NOT rollback secrets! Keep new secrets and fix the config issue.

---

## 📞 Support

### If You Get Stuck:
1. Check: `SECURITY_DEPLOYMENT_CHECKLIST.md` (detailed guide)
2. Check: Deployment logs in DigitalOcean
3. Check: Sentry for error details
4. Rollback if critical issue (see above)

### Common Issues:

**Users can't login**:
- This is expected! Users must re-login after secret rotation.
- Verify they're seeing login page (not errors)
- Have them clear browser cookies

**CSP violations in console**:
- Check browser console for blocked resources
- Review: /api/security/csp-report logs
- Whitelist legitimate resources if needed

**NordVPN warning still shows**:
- Wait 48-72 hours (database update lag)
- Verify A+ security rating first
- Contact NordVPN support if persists

---

## ✅ Success! What's Next?

After successful deployment:

### Immediate (Week 1):
- [ ] Monitor Sentry for errors
- [ ] Review CSP violation reports
- [ ] Collect user feedback
- [ ] Verify NordVPN warning cleared

### Short-term (Month 1):
- [ ] Submit HSTS preload request
- [ ] Enable GitHub secret scanning
- [ ] Schedule quarterly security audit
- [ ] Document secret rotation procedure

### Long-term (Ongoing):
- [ ] Monthly security header checks
- [ ] Quarterly dependency updates
- [ ] Annual penetration testing
- [ ] Consider bug bounty program

---

## 📚 Full Documentation

- **Detailed Checklist**: `SECURITY_DEPLOYMENT_CHECKLIST.md`
- **PR Template**: `.github/PULL_REQUEST_TEMPLATE_SECURITY.md`
- **Security Audit**: `SECURITY_AUDIT_REPORT_2025-01-08.md`
- **Implementation Plan**: `.claude/plans/hidden-floating-quokka.md`

---

**Good luck with your deployment! 🚀**

**Questions?** Review the documentation above or check deployment logs.

**Emergency?** Use the rollback procedure immediately.
