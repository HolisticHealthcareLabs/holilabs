# 🚨 SECURITY INCIDENT: SENTRY AUTH TOKEN EXPOSURE
## Immediate Revocation Required

**Incident ID:** HOLILABS-SEC-2025-001
**Severity:** HIGH
**Date Detected:** 2025-11-20
**Status:** AWAITING REVOCATION

---

## THREAT SUMMARY

A Sentry authentication token was found in the local development environment file `.env.sentry-build-plugin`. While this file was **never committed to git** (verified via history analysis), the token exists on disk and could be exposed through:
- Local development machine compromise
- Backup systems
- Log files
- Screen sharing during development

**Good News:** Git history is clean - no public exposure detected.

---

## EXPOSED CREDENTIAL

**Token (Partial):**
```
sntrys_eyJpYXQiOjE3NjM0OTEyNTkuMDM1MzA4...
(Full token: 185 characters)
```

**Organization:** `holistichealthcarelabs`
**Issued:** January 18, 2025 (iat: 1763491259)

---

## IMMEDIATE REVOCATION PROTOCOL

### Step 1: Access Sentry Dashboard

**Direct URL:**
```
https://sentry.io/settings/holistichealthcarelabs/auth-tokens/
```

**Navigation Path:**
1. Visit https://sentry.io/
2. Login to your account
3. Click on **Settings** (gear icon, bottom left)
4. Select **Organization: holistichealthcarelabs**
5. Navigate to **Developer Settings** → **Auth Tokens**

---

### Step 2: Identify & Revoke Token

**Search for:**
- Tokens created on **January 18, 2025** (iat: 1763491259)
- Tokens with prefix: `sntrys_eyJpYXQiOjE3NjM0OTEyNTkuMDM1MzA4`
- Tokens with scope: `project:releases` (source map upload)

**Actions:**
1. Click **Revoke** next to the identified token
2. Confirm revocation in modal dialog
3. Verify token no longer appears in active tokens list

---

### Step 3: Generate Replacement Token

**Create New Token:**
1. Click **Create New Token** button
2. Configure:
   - **Name:** `Holilabs Production Build (Nov 2025)`
   - **Scopes:**
     - ✅ `project:releases` (upload source maps)
     - ✅ `project:read` (read project metadata)
   - **Projects:** Select `holilabs-web` or all projects
3. Click **Create Token**
4. **COPY TOKEN IMMEDIATELY** (shown only once)

---

### Step 4: Secure Token Storage

**❌ DO NOT:**
- Commit token to git
- Store in `.env.sentry-build-plugin` (file is gitignored but risky)
- Share via Slack/email

**✅ DO:**
- Store in CI/CD secrets (GitHub Secrets, Vercel Environment Variables)
- Use environment variable injection on production server
- Add to password manager (1Password, LastPass) as backup

**Production Server Setup:**
```bash
# SSH to production server
ssh root@129.212.184.190

# Add to environment (persistent across reboots)
echo 'export SENTRY_AUTH_TOKEN="<new-token-here>"' >> ~/.bashrc
source ~/.bashrc

# Verify
echo $SENTRY_AUTH_TOKEN  # Should output new token
```

**CI/CD Setup (GitHub Actions):**
```yaml
# .github/workflows/deploy.yml
env:
  SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

**Vercel/Netlify Setup:**
1. Project Settings → Environment Variables
2. Add: `SENTRY_AUTH_TOKEN` = `<new-token>`
3. Select: Production + Preview + Development

---

### Step 5: Verify Build Pipeline

**Test source map upload:**
```bash
# Local test (with new token)
export SENTRY_AUTH_TOKEN="<new-token>"
cd apps/web
pnpm build

# Check for Sentry upload confirmation:
# Expected output: "Source maps uploaded to Sentry"
```

---

## CLEANUP PROTOCOL

### Local Development Machine

**Remove compromised token file:**
```bash
# Navigate to project root
cd /Users/nicolacapriroloteran/prototypes/holilabsv2

# Secure delete (prevents recovery)
shred -uvz .env.sentry-build-plugin || rm -f .env.sentry-build-plugin

# Verify removal
ls -la .env.sentry-build-plugin 2>&1
# Expected: "No such file or directory"
```

**Update .gitignore (already done):**
```bash
# Verify .env.sentry-build-plugin is ignored
grep "sentry-build-plugin" .gitignore
# Expected: ".env.sentry-build-plugin"
```

---

## VERIFICATION CHECKLIST

- [ ] **Step 1:** Accessed Sentry dashboard at https://sentry.io/settings/holistichealthcarelabs/auth-tokens/
- [ ] **Step 2:** Revoked old token (sntrys_eyJpYXQiOjE3NjM0OTEyNTkuMDM1MzA4...)
- [ ] **Step 3:** Generated new token with `project:releases` scope
- [ ] **Step 4:** Stored new token in production server environment (`~/.bashrc`)
- [ ] **Step 5:** Tested build with new token (`pnpm build` succeeds)
- [ ] **Cleanup 1:** Deleted `.env.sentry-build-plugin` from local machine
- [ ] **Cleanup 2:** Verified `.gitignore` includes `.env.sentry-build-plugin`
- [ ] **Cleanup 3:** Updated CI/CD secrets (GitHub/Vercel)
- [ ] **Audit:** Reviewed Sentry audit logs for unauthorized access (last 30 days)

---

## POST-INCIDENT MONITORING

**Check Sentry Audit Logs:**
```
https://sentry.io/settings/holistichealthcarelabs/audit-log/
```

**Look for:**
- Unauthorized source map uploads
- Unknown IP addresses accessing the organization
- Project configuration changes
- Token usage from unexpected locations

**Time Window:** January 18, 2025 → November 20, 2025 (10 months)

**Red Flags:**
- Source maps uploaded from non-CI/CD IP addresses
- API calls during non-business hours
- Geographic anomalies (e.g., requests from countries where team doesn't operate)

---

## RISK ASSESSMENT

**Likelihood of Exploitation:** LOW
- Token was never in git history (verified)
- File only exists on local development machine
- No evidence of unauthorized Sentry access

**Potential Impact:** MEDIUM
- Attacker could upload malicious source maps (supply chain attack)
- Could view project metadata and error reports
- Could NOT access production database or patient data (token is scoped to Sentry only)

**Overall Risk:** LOW-MEDIUM (Revocation recommended as precaution)

---

## PREVENTION MEASURES

**Implemented:**
- ✅ `.env.sentry-build-plugin` added to `.gitignore`
- ✅ Pre-commit hooks planned for secret scanning

**Recommended:**
1. **GitHub Secret Scanning:** Enable at repository level
2. **Pre-commit Hooks:** Install `git-secrets` or `detect-secrets`
   ```bash
   npm install -g @secretlint/quick-start
   secretlint --init
   ```
3. **Environment Audit:** Run quarterly audits of all API keys
4. **Token Rotation:** Rotate all secrets every 90 days
5. **Least Privilege:** Review Sentry token scopes (remove unused permissions)

---

## INCIDENT RESOLUTION

**Status:** ⏳ AWAITING REVOCATION
**Next Action:** Execute Steps 1-5 above
**Responsible:** Development Team Lead
**Deadline:** Within 24 hours of this advisory

**Once Complete:**
```bash
# Update this file with completion status
echo "✅ RESOLVED: $(date)" >> SECURITY_REVOCATION_ADVISORY.md
```

---

## REFERENCES

- Sentry Auth Token Documentation: https://docs.sentry.io/api/auth/
- Twelve-Factor App (Config): https://12factor.net/config
- OWASP Secrets Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

---

**Report Generated:** 2025-11-20
**Last Updated:** 2025-11-20
**Incident Commander:** SRE/SecOps Team
