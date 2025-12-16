# GitHub Branch Protection Rules Setup

Complete guide to configure branch protection rules for HoliLabs production repository.

---

## Why Branch Protection?

Branch protection prevents:
- Direct pushes to main/production branches
- Force pushes that rewrite history
- Merging code that fails tests
- Deploying code with security vulnerabilities
- Accidental deletion of important branches

---

## Quick Setup (5 Minutes)

1. **Go to Repository Settings**
   ```
   https://github.com/HolisticHealthcareLabs/holilabs/settings/branches
   ```

2. **Click "Add rule" or "Add branch protection rule"**

3. **Enter branch name pattern:** `main`

4. **Configure the rules below**

---

## Recommended Configuration for `main` Branch

### ✅ **Require pull request reviews before merging**
- [x] Require approvals: **1**
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require review from Code Owners
- [ ] Require approval of the most recent reviewable push

**Why:** Ensures code review before merging to production

---

### ✅ **Require status checks to pass before merging**
- [x] Require branches to be up to date before merging

**Required status checks:**
- `test / Run Tests`
- `test / E2E Tests (Playwright)`
- `test / Security Scan`
- `lint-and-typecheck / Lint & Type Check`
- `security-scan / Security Scan`

**Why:** Prevents merging broken or insecure code

---

### ✅ **Require conversation resolution before merging**
- [x] All conversations must be resolved

**Why:** Ensures all review comments are addressed

---

### ✅ **Require signed commits**
- [x] Require signed commits

**Why:** Verifies commit authenticity (prevents impersonation)

**Setup Instructions:**
```bash
# Configure GPG signing
git config --global user.signingkey YOUR_GPG_KEY_ID
git config --global commit.gpgsign true

# Or use SSH signing (simpler)
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

---

### ✅ **Require linear history**
- [x] Require linear history

**Why:** Prevents merge commits, keeps history clean (use rebase)

---

### ⚠️ **Do not allow bypassing the above settings**
- [x] Do not allow bypassing the above settings

**Why:** Enforces rules for everyone (including admins)

---

### ✅ **Restrict who can push to matching branches**
- [x] Restrict pushes that create matching branches

**Allowed to push:**
- Repository administrators only
- Or specific teams: `@HolisticHealthcareLabs/core-team`

**Why:** Only deployments via CI/CD, no direct pushes

---

### ✅ **Allow force pushes**
- [ ] Allow force pushes (**DISABLED**)

**Why:** Prevents history rewriting on main branch

---

### ✅ **Allow deletions**
- [ ] Allow deletions (**DISABLED**)

**Why:** Prevents accidental branch deletion

---

## Additional Branch Protection Rules

### For `develop` branch

```
Branch name pattern: develop

✅ Require pull request reviews (1 approval)
✅ Require status checks to pass
✅ Require conversation resolution
⚠️ Allow bypassing (for hotfixes)
✅ Restrict pushes (core team only)
❌ Require signed commits (optional)
❌ Require linear history (optional)
❌ Allow force pushes (for rebasing)
❌ Allow deletions
```

---

### For `feature/*` branches

```
Branch name pattern: feature/*

❌ No protection (developers can work freely)
```

---

### For `release/*` branches

```
Branch name pattern: release/*

✅ Require pull request reviews (2 approvals)
✅ Require status checks to pass
✅ Require conversation resolution
✅ Require signed commits
✅ Require linear history
❌ Do not allow bypassing
✅ Restrict pushes (release managers only)
❌ Allow force pushes
❌ Allow deletions
```

---

## Rulesets (Modern Alternative)

GitHub now supports **Rulesets** (more flexible than branch protection).

### Setting up Rulesets

1. Go to: `Settings → Rules → Rulesets`
2. Click "New ruleset" → "New branch ruleset"
3. Name: "Production Protection"
4. Target branches: `main`

**Configure:**
- ✅ Require pull request before merging
- ✅ Require status checks
- ✅ Block force pushes
- ✅ Require signed commits
- ✅ Require linear history

**Enforcement:** Active (not evaluate mode)

---

## CODEOWNERS File

Create `.github/CODEOWNERS` to automatically request reviews:

```
# HoliLabs Code Owners
# Auto-assigns reviewers based on file paths

# Default owners for everything
* @nicolacapriroloteran

# Backend/API
/apps/web/src/app/api/** @nicolacapriroloteran @backend-team

# Database schema
/apps/web/prisma/** @nicolacapriroloteran @database-team

# Security-critical files
/apps/web/src/lib/auth/** @nicolacapriroloteran @security-team
/apps/web/src/middleware/rbac.ts @nicolacapriroloteran @security-team
/.github/workflows/** @nicolacapriroloteran @devops-team

# CI/CD
/.github/workflows/** @nicolacapriroloteran @devops-team
/Dockerfile @nicolacapriroloteran @devops-team
/.do/** @nicolacapriroloteran @devops-team

# Documentation
/*.md @nicolacapriroloteran
```

---

## Required GitHub Secrets

Configure these secrets for CI/CD:

### Repository Secrets

```
Settings → Secrets and variables → Actions → New repository secret
```

**Required:**
- `DIGITALOCEAN_ACCESS_TOKEN` - DigitalOcean API token
- `PRODUCTION_DB_ID` - Database cluster ID
- `PRODUCTION_APP_ID` - App Platform app ID
- `REGISTRY_NAME` - Container registry name
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `ENCRYPTION_KEY` - AES-256 encryption key
- `DEID_SECRET` - De-identification secret
- `ANTHROPIC_API_KEY` - Anthropic API key
- `GOOGLE_AI_API_KEY` - Google AI API key
- `RESEND_API_KEY` - Resend email API key
- `VAPID_PRIVATE_KEY` - Push notification private key
- `SENTRY_AUTH_TOKEN` - Sentry authentication token
- `SENTRY_ORG` - Sentry organization
- `SENTRY_PROJECT` - Sentry project

**Optional:**
- `SLACK_WEBHOOK_URL` - Slack notifications
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_WHATSAPP_NUMBER` - Twilio WhatsApp number

---

## Environment Protection Rules

Protect production deployments:

### Setup

1. Go to: `Settings → Environments`
2. Click "New environment"
3. Name: `production`

**Configure:**
- ✅ **Required reviewers:** Add 1-2 people
  - Before production deploy, someone must approve

- ✅ **Wait timer:** 5 minutes
  - Grace period to catch mistakes

- ✅ **Deployment branches:** Selected branches only
  - Only allow deployments from `main`

---

## Commit Signing Setup

### Option 1: GPG Signing (Traditional)

```bash
# Install GPG
brew install gnupg

# Generate key
gpg --full-generate-key
# Choose: RSA and RSA, 4096 bits, no expiration

# List keys
gpg --list-secret-keys --keyid-format=long

# Get your key ID
gpg --armor --export YOUR_KEY_ID

# Add to GitHub: Settings → SSH and GPG keys → New GPG key

# Configure git
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
```

---

### Option 2: SSH Signing (Simpler, Recommended)

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add public key to GitHub
# Settings → SSH and GPG keys → New SSH key

# Configure git to use SSH signing
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true

# Add signing key to GitHub
# Settings → SSH and GPG keys → New signing key
# Paste contents of ~/.ssh/id_ed25519.pub
```

**Test:**
```bash
# Make a signed commit
git commit -S -m "test: signed commit"

# Verify signature
git log --show-signature -1
```

---

## Testing Branch Protection

### Test 1: Direct push should fail

```bash
git checkout main
echo "test" > test.txt
git add test.txt
git commit -m "test: direct push"
git push origin main

# Expected: ❌ [remote rejected] main -> main (protected branch hook declined)
```

---

### Test 2: PR without approvals should block merge

```bash
# Create feature branch
git checkout -b feature/test-protection
echo "test" > test.txt
git add test.txt
git commit -m "feat: test branch protection"
git push origin feature/test-protection

# Create PR on GitHub
# Try to merge without approval
# Expected: ❌ "Merging is blocked" due to required approvals
```

---

### Test 3: PR with failing tests should block merge

```bash
# Create branch with breaking change
git checkout -b feature/breaking-test
# Make a change that breaks tests
git push origin feature/breaking-test

# Create PR on GitHub
# Try to merge (even with approval)
# Expected: ❌ "Merging is blocked" due to failing status checks
```

---

## Enforcement Timeline

### Phase 1: Warning Mode (Week 1)
- Enable branch protection but allow bypassing
- Monitor for false positives
- Train team on new workflow

### Phase 2: Enforce Tests (Week 2)
- Require status checks to pass
- No bypassing allowed for CI/CD failures

### Phase 3: Full Protection (Week 3)
- Require approvals
- Require signed commits
- No direct pushes
- No bypassing for anyone

---

## Troubleshooting

### Issue: "Required status checks are failing"

**Solution:**
- Check GitHub Actions logs
- Fix failing tests locally first
- Push fix and wait for CI to pass

---

### Issue: "Changes requested in review"

**Solution:**
- Address feedback
- Push new commits to PR branch
- Request re-review

---

### Issue: "Branch is out of date"

**Solution:**
```bash
# Update your branch with main
git checkout feature/your-branch
git fetch origin
git rebase origin/main
git push --force-with-lease
```

---

### Issue: "Commit signature verification failed"

**Solution:**
```bash
# Verify GPG/SSH key is added to GitHub
git log --show-signature -1

# Re-sign last commit
git commit --amend --no-edit -S
git push --force-with-lease
```

---

## Best Practices

1. ✅ **Never bypass branch protection** (even for "quick fixes")
2. ✅ **Always use PRs** for code review
3. ✅ **Sign all commits** to prove authenticity
4. ✅ **Keep CI/CD green** - fix failing tests immediately
5. ✅ **Require 2 approvals** for database schema changes
6. ✅ **Test locally** before pushing
7. ✅ **Write clear PR descriptions** to help reviewers

---

## Quick Reference

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -S -m "feat: your feature"

# Push to remote
git push origin feature/your-feature

# Create PR on GitHub
# Wait for CI to pass
# Request review
# Address feedback
# Merge when approved
```

---

## Resources

- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Required Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
- [Signed Commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification)
- [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

---

**Setup Time:** 15-20 minutes
**Team Training:** 30 minutes
**Protection Level:** Enterprise-grade

**Last Updated:** December 15, 2025
