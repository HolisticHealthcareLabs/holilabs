# Immediate Security Actions - Hardcoded Secrets
**Priority:** P0 - CRITICAL
**Time Required:** 30-45 minutes
**Date:** December 14, 2025

---

## Checklist

### Step 1: Verify API Keys (5 minutes)

Check if the keys in `.env.local` are development or production keys:

```bash
# 1. Check Anthropic key
curl -H "x-api-key: YOUR_ANTHROPIC_KEY" \
  -H "anthropic-version: 2023-06-01" \
  https://api.anthropic.com/v1/messages \
  -d '{"model": "claude-3-5-sonnet-20241022", "max_tokens": 1, "messages": [{"role": "user", "content": "hi"}]}'

# 2. Check Deepgram key
curl -H "Authorization: Token YOUR_DEEPGRAM_KEY" \
  https://api.deepgram.com/v1/projects

# 3. Check Resend key
curl -H "Authorization: Bearer YOUR_RESEND_KEY" \
  https://api.resend.com/emails

# 4. Check Twilio
curl -u YOUR_TWILIO_ACCOUNT_SID:YOUR_TWILIO_AUTH_TOKEN \
  https://api.twilio.com/2010-04-01/Accounts/YOUR_TWILIO_ACCOUNT_SID.json
```

**If any keys work:** They are REAL and exposed → Proceed to Step 2
**If keys fail:** They are test keys → Lower priority, but still rotate as best practice

---

### Step 2: Revoke Exposed API Keys (15 minutes)

#### A. Resend API Key

- [ ] Visit: https://resend.com/api-keys
- [ ] Log in to your account
- [ ] Find key: `re_hvh5qDG6_MTrQWGJw38ZbifzRnaTf5JRu`
- [ ] Click "Revoke" or "Delete"
- [ ] Generate new API key
- [ ] Update `.env.local` with new key:
  ```bash
  RESEND_API_KEY="re_YOUR_NEW_KEY_HERE"
  ```

#### B. Anthropic API Key (if real)

- [ ] Visit: https://console.anthropic.com/settings/keys
- [ ] Log in to your account
- [ ] Find key starting with: `sk-ant-api03-EWTQVhNAL...`
- [ ] Click "Delete" or "Revoke"
- [ ] Generate new API key
- [ ] Update `.env.local`:
  ```bash
  ANTHROPIC_API_KEY="sk-ant-api03-YOUR_NEW_KEY"
  ```

#### C. Deepgram API Key (if real)

- [ ] Visit: https://console.deepgram.com/
- [ ] Go to: Project Settings → API Keys
- [ ] Find key: `70b3a1428255db754512e34eafad42a18c02311c`
- [ ] Click "Delete"
- [ ] Generate new API key
- [ ] Update `.env.local`:
  ```bash
  DEEPGRAM_API_KEY="YOUR_NEW_DEEPGRAM_KEY"
  ```

#### D. Twilio Credentials (if real)

- [ ] Visit: https://console.twilio.com/
- [ ] Go to: Account Info
- [ ] Reset Auth Token:
  - Click "View" next to Auth Token
  - Click "Reset Auth Token"
  - Confirm reset
- [ ] Update `.env.local`:
  ```bash
  TWILIO_AUTH_TOKEN="your_new_auth_token"
  ```

#### E. DEID Secret (Regenerate)

```bash
# Generate new 64-character hex secret
openssl rand -hex 32

# Update .env.local
# Replace old value:
# DEID_SECRET="0cf812898a2ed9a946fc4b1eb4747d428cb14ed9517dec6b43dee29869f495c4"
# With new value:
# DEID_SECRET="[paste new value here]"
```

#### F. BetterStack Token (if real)

- [ ] Visit: https://betterstack.com/logs
- [ ] Go to: Source Tokens
- [ ] Find token: `ppRsuAAsrT4hR8Uw8HAY4UCu`
- [ ] Click "Delete" or "Revoke"
- [ ] Generate new token (if needed)
- [ ] Update in test file or remove if not used

---

### Step 3: Clean Documentation Files (5 minutes)

#### A. Redact RED_TEAM_REPORT.md

```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2

# Edit RED_TEAM_REPORT.md
# Find lines 255-256:
# DEID_SECRET="0cf812898a2ed9a946fc4b1eb4747d428cb14ed9517dec6b43dee29869f495c4"
# RESEND_API_KEY="re_hvh5qDG6_MTrQWGJw38ZbifzRnaTf5JRu"

# Replace with:
# DEID_SECRET="[REDACTED - 64 hex characters]"
# RESEND_API_KEY="re_[REDACTED]"
```

#### B. Redact IMMEDIATE_ACTION_PLAN.md

```bash
# Edit IMMEDIATE_ACTION_PLAN.md
# Find line 61:
# RESEND_API_KEY="re_hvh5qDG6_MTrQWGJw38ZbifzRnaTf5JRu"

# Replace with:
# RESEND_API_KEY="re_[REDACTED]"
```

#### C. Update betterstack-logger.test.ts

```bash
# Edit apps/web/src/lib/__tests__/betterstack-logger.test.ts
# Find line 3:
# * Run: LOGTAIL_SOURCE_TOKEN="ppRsuAAsrT4hR8Uw8HAY4UCu" NODE_ENV=production...

# Replace with:
# * Run: LOGTAIL_SOURCE_TOKEN="your-logtail-token-here" NODE_ENV=production...
```

---

### Step 4: Remove Backup File (2 minutes)

```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web

# 1. Check if committed to git
git ls-files | grep ".env.local.backup"

# 2. If found, remove from git history (CAUTION: rewrites history)
# Only do this if absolutely necessary and coordinate with team
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch apps/web/.env.local.backup" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Delete local file
rm .env.local.backup

# 4. Add to .gitignore
echo ".env*.backup" >> .gitignore
```

---

### Step 5: Verify .gitignore (2 minutes)

```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2

# Check .gitignore includes:
cat .gitignore | grep -E "\.env"

# Should see:
# .env
# .env*.local
# .env.production (or similar)

# If missing, add:
echo ".env*.backup" >> .gitignore
echo ".env.sentry-build-plugin" >> .gitignore
```

---

### Step 6: Install git-secrets (15 minutes)

```bash
# Install git-secrets (macOS)
brew install git-secrets

# Setup for this repository
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
git secrets --install
git secrets --register-aws

# Add custom patterns
git secrets --add 'sk-ant-api03-[A-Za-z0-9_\-]+'
git secrets --add 're_[A-Za-z0-9_]+'
git secrets --add 'AC[a-z0-9]{32}'
git secrets --add '[0-9a-f]{32}'
git secrets --add '["\']eyJ[A-Za-z0-9_\-]*\.[A-Za-z0-9_\-]*\.[A-Za-z0-9_\-]*["\']'

# Add allowed patterns (false positives)
git secrets --add --allowed 'your-api-key-here'
git secrets --add --allowed 'sk-ant-api03-1234567890'
git secrets --add --allowed '\.env\.example'

# Test
git secrets --scan

# Scan history (optional, can be slow)
# git secrets --scan-history
```

Full guide: See `apps/web/GIT_SECRETS_SETUP.md`

---

### Step 7: Verify Changes (3 minutes)

```bash
# 1. Check that new keys work
# Test Anthropic
curl -H "x-api-key: YOUR_NEW_ANTHROPIC_KEY" \
  -H "anthropic-version: 2023-06-01" \
  https://api.anthropic.com/v1/messages \
  -d '{"model": "claude-3-5-sonnet-20241022", "max_tokens": 1, "messages": [{"role": "user", "content": "test"}]}'

# Test Resend
curl -H "Authorization: Bearer YOUR_NEW_RESEND_KEY" \
  https://api.resend.com/emails

# 2. Verify git-secrets is working
echo 'sk-ant-api03-FAKE123456' > test-secret.txt
git add test-secret.txt
git commit -m "Test commit"
# Should BLOCK the commit

# Clean up
rm test-secret.txt
git reset HEAD

# 3. Check documentation is redacted
grep -i "re_hvh5qDG6" RED_TEAM_REPORT.md IMMEDIATE_ACTION_PLAN.md
# Should return nothing

# 4. Verify .env.local.backup is gone
ls -la apps/web/.env.local.backup
# Should return "No such file or directory"
```

---

### Step 8: Document Changes (3 minutes)

Create a record of what was rotated:

```bash
# Create rotation log
cat > SECRETS_ROTATION_LOG.md << 'EOF'
# Secrets Rotation Log

## December 14, 2025 - Emergency Rotation

**Reason:** Hardcoded secrets found in documentation files

**Rotated Secrets:**
- [x] RESEND_API_KEY - Revoked and regenerated
- [x] ANTHROPIC_API_KEY - Revoked and regenerated
- [x] DEEPGRAM_API_KEY - Revoked and regenerated
- [x] TWILIO_AUTH_TOKEN - Reset
- [x] DEID_SECRET - Regenerated
- [x] LOGTAIL_SOURCE_TOKEN - Revoked (if was real)

**Files Cleaned:**
- [x] RED_TEAM_REPORT.md - Secrets redacted
- [x] IMMEDIATE_ACTION_PLAN.md - Secrets redacted
- [x] betterstack-logger.test.ts - Token placeholder added
- [x] .env.local.backup - Deleted

**Prevention Measures:**
- [x] git-secrets installed
- [x] .gitignore updated
- [x] Pre-commit hooks configured

**Next Rotation:** March 14, 2026 (90 days)
EOF

git add SECRETS_ROTATION_LOG.md
```

---

## Quick Command Summary

```bash
# 1. Revoke all exposed keys via provider dashboards (see Step 2)

# 2. Update .env.local with new keys
nano /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web/.env.local

# 3. Redact documentation
nano /Users/nicolacapriroloteran/prototypes/holilabsv2/RED_TEAM_REPORT.md
nano /Users/nicolacapriroloteran/prototypes/holilabsv2/IMMEDIATE_ACTION_PLAN.md

# 4. Delete backup file
rm /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web/.env.local.backup

# 5. Update .gitignore
echo ".env*.backup" >> /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web/.gitignore

# 6. Install git-secrets
brew install git-secrets
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
git secrets --install
git secrets --register-aws
git secrets --add 'sk-ant-api03-[A-Za-z0-9_\-]+'
git secrets --add 're_[A-Za-z0-9_]+'
git secrets --add 'AC[a-z0-9]{32}'

# 7. Test
git secrets --scan
```

---

## Emergency Contacts

If you encounter issues:

- **Anthropic Support:** https://support.anthropic.com
- **Resend Support:** support@resend.com
- **Deepgram Support:** support@deepgram.com
- **Twilio Support:** https://www.twilio.com/help/contact

---

## After Completion

- [ ] Update team about key rotation
- [ ] Test application with new keys
- [ ] Schedule next rotation (90 days)
- [ ] Review other security measures (see SECURITY_AUDIT_HARDCODED_SECRETS.md)
- [ ] Consider AWS Secrets Manager migration

---

**Estimated Time:** 30-45 minutes
**Impact:** Zero downtime (if done during low-traffic period)
**Risk Reduction:** HIGH → CRITICAL vulnerabilities mitigated

---

**Created:** December 14, 2025
**Status:** PENDING
**Owner:** Development Team
