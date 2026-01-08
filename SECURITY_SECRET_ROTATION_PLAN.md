# Secret Rotation Plan - CRITICAL

**Date:** 2025-01-08
**Status:** 🔴 IMMEDIATE ACTION REQUIRED
**Severity:** CRITICAL

---

## Executive Summary

**CRITICAL SECURITY BREACH IDENTIFIED**: Sensitive credentials were committed to git repository and remain in git history.

### Exposed Secrets Summary

| Secret | Exposure Type | Commit | Date Exposed | Status |
|--------|--------------|---------|--------------|---------|
| Sentry Auth Token | In git history | 591bc225 | Nov 21, 2025 | ⚠️ MUST ROTATE |
| Google OAuth Secret | In .gitignore (safe) | N/A | N/A | ⚠️ VERIFY & ROTATE |
| Token Encryption Key | In .gitignore (safe) | N/A | N/A | ⚠️ VERIFY |

### Timeline of Exposure

1. **November 21, 2025** - Sentry token committed to repository in commit `591bc225`
2. **December 28, 2025** - File deleted from repository in commit `522c1405`
3. **Duration of Exposure:** 37 days
4. **Current Status:** Token still exists in git history and can be accessed by anyone with repository access

---

## Phase 1: IMMEDIATE ACTIONS (Within 4 Hours)

### Priority 1: Rotate Sentry Authentication Token

**Risk:** Exposed Sentry token allows unauthorized access to error tracking, source maps, and application metadata.

**Steps:**

1. **Revoke Current Token**
   ```bash
   # Navigate to: https://sentry.io/settings/account/api/auth-tokens/
   # Or direct org settings: https://sentry.io/settings/holistichealthcarelabs/auth-tokens/

   # Find token ending in: ...IISL8
   # Click "Revoke" to immediately invalidate
   ```

2. **Generate New Token**
   ```bash
   # In Sentry Dashboard:
   # 1. Navigate to Settings > Auth Tokens
   # 2. Click "Create New Token"
   # 3. Name: "Build Plugin - Production (2025-01-08)"
   # 4. Scopes required:
   #    - project:read
   #    - project:releases
   #    - org:read
   # 5. Copy new token (starts with sntrys_...)
   ```

3. **Update Local .env.sentry-build-plugin**
   ```bash
   # Update the file with new token
   echo "SENTRY_AUTH_TOKEN=<new-token-here>" > .env.sentry-build-plugin
   ```

4. **Update Production Environment**
   ```bash
   # DigitalOcean App Platform
   doctl apps update <app-id> --env SENTRY_AUTH_TOKEN=<new-token>

   # OR manually in dashboard:
   # Settings > Environment Variables > Add/Update SENTRY_AUTH_TOKEN
   ```

5. **Verify New Token Works**
   ```bash
   # Test with a build
   pnpm build --filter @holi/web

   # Check Sentry dashboard for new source map upload
   ```

**Verification Checklist:**
- [ ] Old token revoked in Sentry dashboard
- [ ] New token generated and documented
- [ ] Local .env.sentry-build-plugin updated
- [ ] Production environment updated
- [ ] Build succeeds with new token
- [ ] Source maps uploading to Sentry

---

### Priority 2: Verify Google OAuth Secret

**Current Secret:** `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`

**Action Required:**

1. **Determine if this is production or development secret**
   ```bash
   # Check Google Cloud Console:
   # https://console.cloud.google.com/apis/credentials

   # Find OAuth 2.0 Client ID matching:
   # Client ID: 89566198697-u3np9tipjcnigop5j2ui8pcp8biajjtt.apps.googleusercontent.com

   # Check usage:
   # - Is this for development only?
   # - Is this for production holilabs.xyz?
   ```

2. **If Production Secret - Rotate Immediately**
   ```bash
   # In Google Cloud Console:
   # 1. Navigate to APIs & Services > Credentials
   # 2. Find the OAuth 2.0 Client ID
   # 3. Click "Reset Secret"
   # 4. Update .env with new secret
   # 5. Update production environment variables
   ```

3. **If Development Secret - Create Separate Production Secret**
   ```bash
   # Create new OAuth Client ID for production
   # Authorized redirect URIs: https://holilabs.xyz/api/auth/callback/google
   # Update production environment with new credentials
   ```

**Verification Checklist:**
- [ ] Determined if secret is production or development
- [ ] If production: rotated and tested
- [ ] If development: verified separate production secret exists
- [ ] Google OAuth login tested and working

---

### Priority 3: Verify Token Encryption Key

**Current Key:** `858e236612ffe4b52f6434fc593624dc5153da4e31cd51a5ac0fb63e83c76aed`

**Action Required:**

1. **Check if this key is in production**
   ```bash
   # Check production environment variable
   echo $TOKEN_ENCRYPTION_KEY

   # Or check DigitalOcean App Platform dashboard
   ```

2. **If Same Key in Production - Rotate with Care**

   ⚠️ **WARNING**: Rotating this key will invalidate all existing encrypted tokens. This requires a maintenance window.

   ```bash
   # Generate new key
   openssl rand -hex 32

   # Example output: f3a7b9c2d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1
   ```

3. **Migration Strategy**
   ```typescript
   // Support both old and new keys during transition
   // File: apps/web/src/lib/encryption/token-encryption.ts

   const OLD_KEY = process.env.TOKEN_ENCRYPTION_KEY_OLD;
   const NEW_KEY = process.env.TOKEN_ENCRYPTION_KEY;

   // Try new key first, fall back to old key for decryption
   // Only encrypt with new key
   ```

4. **Deployment Steps**
   ```bash
   # 1. Add both keys to production
   export TOKEN_ENCRYPTION_KEY_OLD=858e236612ffe4b52f6434fc593624dc5153da4e31cd51a5ac0fb63e83c76aed
   export TOKEN_ENCRYPTION_KEY=<new-key-here>

   # 2. Deploy migration code
   # 3. Wait 30 days for all old tokens to expire
   # 4. Remove TOKEN_ENCRYPTION_KEY_OLD
   ```

**Verification Checklist:**
- [ ] Verified if key is in production
- [ ] Generated new key if needed
- [ ] Migration strategy implemented
- [ ] Both keys working during transition
- [ ] Old key removed after transition period

---

## Phase 2: GIT HISTORY CLEANUP (Within 24 Hours)

**Risk:** Even though the file was deleted, the Sentry token remains in git history and can be accessed by:
- Anyone with repository access
- Anyone who has cloned the repository
- Anyone who pulls from before commit 522c1405

### Option A: BFG Repo-Cleaner (Recommended)

```bash
# 1. Install BFG
brew install bfg  # macOS
# OR download from: https://rtyley.github.io/bfg-repo-cleaner/

# 2. Backup repository
cd /Users/nicolacapriroloteran/prototypes
tar -czf holilabsv2-backup-$(date +%Y%m%d).tar.gz holilabsv2/

# 3. Create fresh clone
git clone --mirror git@github.com:holistichealthcarelabs/holilabsv2.git holilabsv2-mirror

# 4. Remove sensitive files from history
cd holilabsv2-mirror
bfg --delete-files .env.sentry-build-plugin

# 5. Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 6. Force push (⚠️ COORDINATE WITH TEAM)
git push --force

# 7. All team members must re-clone
# OLD CLONES ARE COMPROMISED
```

### Option B: git-filter-repo (Alternative)

```bash
# 1. Install git-filter-repo
pip3 install git-filter-repo

# 2. Backup repository
cd /Users/nicolacapriroloteran/prototypes
cp -r holilabsv2 holilabsv2-backup-$(date +%Y%m%d)

# 3. Remove file from history
cd holilabsv2
git filter-repo --invert-paths --path .env.sentry-build-plugin

# 4. Force push (⚠️ COORDINATE WITH TEAM)
git push --force --all
git push --force --tags

# 5. All team members must re-clone
```

### Post-Cleanup Actions

```bash
# 1. Verify file is gone from history
git log --all --full-history -- .env.sentry-build-plugin
# Should return no results

# 2. Notify all team members
# Subject: URGENT: Repository History Rewritten - Re-clone Required
#
# The git history has been rewritten to remove exposed secrets.
#
# ACTION REQUIRED:
# 1. Delete your current local clone
# 2. Fresh clone: git clone <repo-url>
# 3. Do NOT merge old branches
#
# Old clones are compromised and contain exposed secrets.

# 3. Invalidate CI/CD caches
# - Clear GitHub Actions caches
# - Clear any CI/CD system caches
# - Rebuild all Docker images
```

**Verification Checklist:**
- [ ] Repository backed up
- [ ] BFG or git-filter-repo executed successfully
- [ ] File no longer in git history (verified)
- [ ] Changes force-pushed to remote
- [ ] All team members notified
- [ ] All team members re-cloned
- [ ] CI/CD caches cleared

---

## Phase 3: PREVENT FUTURE EXPOSURES (Within 48 Hours)

### Pre-Commit Hook Setup

```bash
# Install pre-commit hook
./scripts/install-pre-commit-hook.sh

# Manual installation if script doesn't exist:
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook to prevent secret exposure

# Check if gitleaks is installed
if ! command -v gitleaks &> /dev/null; then
    echo "⚠️  WARNING: gitleaks not installed"
    echo "Install with: brew install gitleaks"
    exit 0
fi

# Run gitleaks
echo "🔍 Scanning for secrets..."
gitleaks protect --staged --verbose

if [ $? -eq 1 ]; then
    echo ""
    echo "❌ COMMIT BLOCKED: Secrets detected!"
    echo ""
    echo "To bypass this check (NOT RECOMMENDED):"
    echo "  git commit --no-verify"
    exit 1
fi

echo "✅ No secrets detected"
exit 0
EOF

chmod +x .git/hooks/pre-commit
```

### Secret Management Best Practices

1. **Use Secret Management Service**

   **Recommended Options:**
   - **Doppler** (easiest, $7/user/month)
   - **AWS Secrets Manager** (if using AWS)
   - **HashiCorp Vault** (enterprise)

   ```bash
   # Example: Doppler setup
   npm install -g @dopplerhq/cli
   doppler login
   doppler setup

   # Run app with Doppler
   doppler run -- pnpm dev
   ```

2. **Separate Environments**
   ```
   .env.local          # Local development (never commit)
   .env.development    # Shared dev (placeholders only)
   .env.test           # Test environment (fake data)
   .env.production     # Production (in secret manager only)
   ```

3. **Mandatory .gitignore Rules**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.*.local
   .env.sentry-build-plugin
   *.pem
   *.key
   *.p12
   credentials.json
   secrets.yaml
   ```

4. **CI/CD Secret Management**
   ```yaml
   # GitHub Actions example
   # Store in: Settings > Secrets and variables > Actions

   env:
     SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
     DATABASE_URL: ${{ secrets.DATABASE_URL }}
     NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
   ```

**Verification Checklist:**
- [ ] Pre-commit hook installed and tested
- [ ] Secret management service selected
- [ ] Environment separation configured
- [ ] .gitignore rules comprehensive
- [ ] CI/CD secrets migrated to secret manager

---

## Phase 4: AUDIT & MONITORING (Ongoing)

### Quarterly Secret Rotation Schedule

| Secret | Rotation Frequency | Next Due Date |
|--------|-------------------|---------------|
| Sentry Auth Token | Every 90 days | 2025-04-08 |
| Database Passwords | Every 90 days | 2025-04-08 |
| API Keys | Every 90 days | 2025-04-08 |
| OAuth Secrets | Every 180 days | 2025-07-08 |
| Encryption Keys | Every 365 days | 2026-01-08 |

### Automated Secret Scanning

1. **GitHub Secret Scanning** (if using GitHub)
   ```bash
   # Enable in repository settings:
   # Settings > Code security and analysis > Secret scanning
   # Enable: "Secret scanning"
   # Enable: "Push protection"
   ```

2. **Scheduled Gitleaks Scans**
   ```yaml
   # .github/workflows/secret-scan.yml
   name: Secret Scan
   on:
     schedule:
       - cron: '0 0 * * 0'  # Weekly on Sunday
     push:
       branches: [main, develop]

   jobs:
     scan:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
           with:
             fetch-depth: 0
         - uses: gitleaks/gitleaks-action@v2
   ```

3. **Monitoring & Alerts**
   ```bash
   # Set up alerts for:
   - Unauthorized Sentry access attempts
   - Failed OAuth attempts
   - Database connection failures
   - Encryption key errors

   # Integration points:
   - Sentry error tracking
   - DataDog / New Relic APM
   - PagerDuty for critical alerts
   ```

**Verification Checklist:**
- [ ] Rotation schedule created and documented
- [ ] Calendar reminders set for rotations
- [ ] GitHub secret scanning enabled
- [ ] Automated scans configured in CI/CD
- [ ] Monitoring alerts configured
- [ ] Team trained on secret management

---

## Risk Assessment

### Before Remediation
**Overall Risk:** 🔴 CRITICAL
- Exposed secrets in git history: HIGH
- Active Sentry token compromised: HIGH
- Potential unauthorized access: MEDIUM
- No prevention mechanisms: HIGH

### After Phase 1 (4 hours)
**Overall Risk:** 🟡 HIGH
- Active secrets rotated: ✅
- Git history still contains old secrets: ⚠️
- No prevention mechanisms: ⚠️

### After Phase 2 (24 hours)
**Overall Risk:** 🟡 MEDIUM
- Active secrets rotated: ✅
- Git history cleaned: ✅
- No prevention mechanisms: ⚠️

### After Phase 3 (48 hours)
**Overall Risk:** 🟢 LOW
- Active secrets rotated: ✅
- Git history cleaned: ✅
- Prevention mechanisms in place: ✅
- Secret management service: Pending

### After Phase 4 (Complete)
**Overall Risk:** 🟢 VERY LOW
- All phases complete: ✅
- Ongoing monitoring: ✅
- Regular rotation: ✅

---

## Communication Plan

### Internal Team Notification

**Subject:** SECURITY ALERT: Secret Rotation Required - Action by EOD

**Message:**
```
Team,

We've identified exposed credentials in our git repository history.

IMMEDIATE ACTIONS REQUIRED:

1. DO NOT pull or merge until further notice
2. Within 24 hours, you will need to:
   - Delete your local clone
   - Fresh clone from main branch
   - Update local .env files with new secrets (to be provided)

WHAT HAPPENED:
- Sentry authentication token was committed on Nov 21, 2025
- File was deleted Dec 28, 2025, but remains in git history
- We are rotating all potentially exposed secrets

WHAT WE'RE DOING:
1. Rotating all exposed secrets (IN PROGRESS)
2. Cleaning git history (SCHEDULED)
3. Installing pre-commit hooks to prevent future issues

Timeline:
- 4 hours: All secrets rotated
- 24 hours: Git history cleaned, safe to clone
- 48 hours: Prevention mechanisms in place

Questions? Contact security team.

- Security Team
```

### External Stakeholders (if applicable)

If the repository was public or shared with external parties:

**Subject:** Security Incident Notification - Credential Rotation

**Message:**
```
Dear [Stakeholder],

We are notifying you of a security incident that may affect our integration.

INCIDENT: API credentials were briefly exposed in our source code repository.

IMPACT: Minimal - credentials have been rotated and access logs reviewed.

ACTIONS TAKEN:
1. All exposed credentials rotated
2. Access logs reviewed (no unauthorized access detected)
3. Git history cleaned
4. Additional security controls implemented

ACTIONS REQUIRED FROM YOU:
- If you have cloned our repository, delete and re-clone
- Update integration credentials (new credentials attached)
- Test integration after credential update

We take security seriously and have implemented additional measures to prevent future incidents.

Questions? Contact: security@holilabs.com

- Holi Labs Security Team
```

---

## Success Criteria

### Phase 1: Immediate Actions
- [ ] Sentry token revoked and new token working
- [ ] Google OAuth secret verified/rotated
- [ ] Token encryption key status determined
- [ ] All production services operational with new secrets
- [ ] No downtime or service interruption

### Phase 2: Git History Cleanup
- [ ] Repository history rewritten successfully
- [ ] Exposed secrets no longer in git history (verified)
- [ ] All team members notified and re-cloned
- [ ] CI/CD systems updated and working

### Phase 3: Prevention
- [ ] Pre-commit hooks installed on all developer machines
- [ ] Secret management service selected and configured
- [ ] Team trained on secret management best practices
- [ ] .gitignore comprehensive and tested

### Phase 4: Ongoing
- [ ] Rotation schedule implemented
- [ ] Automated scanning configured
- [ ] Monitoring alerts functional
- [ ] Quarterly audit scheduled

---

## Lessons Learned

### What Went Wrong
1. Sentry plugin auto-generated .env.sentry-build-plugin
2. File was committed before .gitignore was updated
3. No pre-commit hooks to catch secrets
4. No regular secret scanning in CI/CD

### Process Improvements
1. Always add .env* to .gitignore before any development
2. Install pre-commit hooks on day 1 of project
3. Use secret management service from start
4. Regular security audits (quarterly)
5. Developer onboarding includes security training

### Technical Improvements
1. Secrets should never be in files, use environment variables
2. Local development should use different secrets than production
3. Automated secret scanning in CI/CD
4. Secret rotation should be automated and documented

---

## Additional Resources

### Tools
- **Gitleaks:** https://github.com/gitleaks/gitleaks
- **BFG Repo-Cleaner:** https://rtyley.github.io/bfg-repo-cleaner/
- **git-filter-repo:** https://github.com/newren/git-filter-repo
- **Doppler:** https://www.doppler.com/
- **AWS Secrets Manager:** https://aws.amazon.com/secrets-manager/

### Documentation
- **OWASP Secret Management:** https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- **GitHub Secret Scanning:** https://docs.github.com/en/code-security/secret-scanning
- **12-Factor App (Config):** https://12factor.net/config

### Training
- **Secure Coding Practices:** Internal training session scheduled
- **Git Security Best Practices:** Documentation in /docs/security/git-security.md
- **Incident Response Procedure:** Documentation in /docs/security/incident-response.md

---

## Contact

**Security Team Lead:** [Name]
**Email:** security@holilabs.com
**Emergency:** [Phone Number]

**For this incident:**
- Created by: Claude AI Security Audit
- Date: 2025-01-08
- Severity: CRITICAL
- Status: Phase 1 IN PROGRESS

---

## Document History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-01-08 | 1.0 | Security Audit | Initial creation, critical findings documented |

---

**Next Review Date:** 2025-01-15 (1 week after remediation complete)
