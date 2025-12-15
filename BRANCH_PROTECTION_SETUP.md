# Branch Protection Setup Guide

This guide walks you through setting up branch protection rules for the Holi Labs repository.

## Overview

Branch protection rules prevent accidental changes to important branches and enforce quality standards through required status checks and code reviews.

---

## Prerequisites

- Repository admin access
- GitHub repository settings access

---

## Configuration Steps

### 1. Access Branch Protection Settings

1. Go to your GitHub repository
2. Click **Settings** (top navigation)
3. Click **Branches** (left sidebar)
4. Under "Branch protection rules", click **Add rule**

---

## Main Branch Protection

### Branch name pattern
```
main
```

### Settings to Enable

#### Protect matching branches

- [x] **Require a pull request before merging**
  - [x] Require approvals: **1**
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners
  - [ ] Restrict who can dismiss pull request reviews (optional)

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - **Required status checks:** (Add these)
    - `lint-and-typecheck`
    - `build-test`
    - `test / Run Tests`
    - `security / Security Scan`
    - `coverage / Generate Coverage Report`

- [x] **Require conversation resolution before merging**

- [x] **Require signed commits** (Recommended for security)

- [x] **Require linear history**

- [x] **Include administrators** (Enforce rules for admins too)

#### Rules applied to everyone including administrators

- [x] **Allow force pushes**: **Specify who can force push** → Nobody
- [x] **Allow deletions**: **Disabled**

### Screenshot Example

```
┌────────────────────────────────────────────────┐
│ Branch name pattern: main                      │
├────────────────────────────────────────────────┤
│ ☑ Require a pull request before merging       │
│   ☑ Require approvals (1)                     │
│   ☑ Dismiss stale reviews                     │
│   ☑ Require review from Code Owners           │
│                                                │
│ ☑ Require status checks to pass before merging│
│   ☑ Require branches to be up to date         │
│   Required checks:                             │
│     • lint-and-typecheck                      │
│     • build-test                              │
│     • test / Run Tests                        │
│     • security / Security Scan                │
│     • coverage / Generate Coverage Report     │
│                                                │
│ ☑ Require conversation resolution             │
│ ☑ Require signed commits                      │
│ ☑ Require linear history                      │
│ ☑ Include administrators                      │
│ ☑ Restrict force pushes (Nobody)              │
│ ☑ Do not allow deletions                      │
└────────────────────────────────────────────────┘
```

---

## Develop Branch Protection

### Branch name pattern
```
develop
```

### Settings to Enable

#### Protect matching branches

- [x] **Require a pull request before merging**
  - [x] Require approvals: **1**
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [ ] Require review from Code Owners (optional)

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - **Required status checks:** (Add these)
    - `lint-and-typecheck`
    - `test / Run Tests`
    - `code-quality / Code Quality Check`

- [x] **Require conversation resolution before merging**

- [ ] **Require signed commits** (Optional)

- [x] **Require linear history**

- [x] **Include administrators**

#### Rules applied to everyone including administrators

- [x] **Allow force pushes**: **Disabled**
- [x] **Allow deletions**: **Disabled**

### Screenshot Example

```
┌────────────────────────────────────────────────┐
│ Branch name pattern: develop                   │
├────────────────────────────────────────────────┤
│ ☑ Require a pull request before merging       │
│   ☑ Require approvals (1)                     │
│   ☑ Dismiss stale reviews                     │
│                                                │
│ ☑ Require status checks to pass before merging│
│   ☑ Require branches to be up to date         │
│   Required checks:                             │
│     • lint-and-typecheck                      │
│     • test / Run Tests                        │
│     • code-quality / Code Quality Check       │
│                                                │
│ ☑ Require conversation resolution             │
│ ☑ Require linear history                      │
│ ☑ Include administrators                      │
│ ☑ Do not allow force pushes                   │
│ ☑ Do not allow deletions                      │
└────────────────────────────────────────────────┘
```

---

## Feature Branch Naming Pattern (Optional)

You can also add protection for feature branches:

### Branch name pattern
```
feature/*
```

### Minimal Protection

- [x] **Require status checks to pass before merging**
  - Required checks:
    - `lint-and-typecheck`
    - `test / Run Tests`

---

## CODEOWNERS File

Create a `.github/CODEOWNERS` file to automatically assign reviewers:

```
# CODEOWNERS for Holi Labs

# Default owners for everything in the repo
* @your-github-username

# Web application
/apps/web/ @your-github-username @lead-developer

# Infrastructure and CI/CD
/.github/workflows/ @your-github-username @devops-lead
/infra/ @your-github-username @devops-lead

# Database migrations
/apps/web/prisma/ @your-github-username @database-admin

# Security-related changes
/apps/web/src/lib/auth/ @your-github-username @security-lead
/apps/web/src/lib/security/ @your-github-username @security-lead

# API routes
/apps/web/src/app/api/ @your-github-username @backend-lead

# Documentation
*.md @your-github-username @tech-writer
```

---

## Status Checks Setup

### Finding Status Check Names

1. Create a test PR
2. Let CI/CD run
3. Go to PR → Checks tab
4. Note the exact names of checks (e.g., "lint-and-typecheck", "test / Run Tests")
5. Add these names to branch protection rules

### Common Status Checks

**Main Branch:**
- `lint-and-typecheck` - From ci.yml
- `build-test` - From ci.yml
- `test / Run Tests` - From test.yml
- `e2e / E2E Tests (Playwright)` - From test.yml
- `security / Security Scan` - From test.yml
- `coverage / Generate Coverage Report` - From coverage-report.yml
- `codeql / CodeQL Analysis` - From security-enhanced.yml

**Develop Branch:**
- `lint-and-typecheck`
- `test / Run Tests`
- `code-quality / Code Quality Check` - From pr-checks.yml

---

## Verification

After setting up branch protection:

1. **Test Protection Rules**
   ```bash
   # Try to push directly to main (should fail)
   git checkout main
   git commit --allow-empty -m "test: verify protection"
   git push origin main
   # Expected: Error - protected branch
   ```

2. **Test PR Workflow**
   - Create a test feature branch
   - Make a small change
   - Create PR to develop
   - Verify required checks run
   - Try to merge before checks complete (should fail)
   - Try to merge without approval (should fail)
   - Get approval and merge

3. **Verify Status Checks**
   - Check that all required status checks appear
   - Verify they must pass before merging
   - Test that outdated branches cannot merge

---

## Troubleshooting

### Issue: Status Check Not Appearing

**Solution:**
1. Create a PR to trigger workflows
2. Wait for workflows to complete
3. Return to branch protection settings
4. The check should now appear in the dropdown

### Issue: Can't Merge Even After Approval

**Possible Causes:**
- Status checks haven't completed
- Branch is not up to date with base branch
- Conversations not resolved
- Required checks failed

**Solution:**
```bash
# Update branch
git checkout your-branch
git fetch origin
git merge origin/main  # or origin/develop
git push
```

### Issue: Admin Can Bypass Rules

**Solution:**
- Ensure "Include administrators" is checked
- This enforces rules even for admins

### Issue: Too Restrictive for Hotfixes

**Solution:**
- Create separate hotfix branch pattern with relaxed rules
- Or temporarily disable protection for emergency (not recommended)
- Better: Use workflow_dispatch for emergency deployments

---

## Best Practices

### 1. Required Reviewers

- **Minimum 1 approval** for all PRs
- **2 approvals** for main branch (recommended)
- Use CODEOWNERS for automatic reviewer assignment

### 2. Status Checks

- Start with essential checks (lint, test, build)
- Add more checks gradually
- Keep checks fast (< 10 minutes when possible)

### 3. Linear History

- Enforces clean git history
- Prevents messy merge commits
- Makes rollbacks easier

### 4. Signed Commits

- Increases security
- Verifies commit author
- Required for compliance (HIPAA, SOC 2)

### 5. Force Push Protection

- Prevents accidental history rewrites
- Protects main and develop branches
- Allow only for feature branches (if needed)

---

## Configuration via GitHub API (Advanced)

You can also configure branch protection via API:

```bash
# Set branch protection for main
curl -X PUT \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/OWNER/REPO/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": [
        "lint-and-typecheck",
        "build-test",
        "test / Run Tests",
        "security / Security Scan"
      ]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "dismissal_restrictions": {},
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": true,
      "required_approving_review_count": 1
    },
    "restrictions": null,
    "required_linear_history": true,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "required_conversation_resolution": true
  }'
```

---

## Monitoring and Maintenance

### Regular Reviews

- **Monthly:** Review and update required status checks
- **Quarterly:** Review CODEOWNERS assignments
- **Annually:** Audit branch protection effectiveness

### Metrics to Track

- PR merge time
- Failed status checks rate
- Bypassed rules (should be 0)
- Code review coverage

### Adjustments

As your team grows:
- Increase required reviewers
- Add more specific CODEOWNERS
- Add more status checks
- Consider environment-specific checks

---

## Checklist

Use this checklist to ensure proper setup:

### Main Branch
- [ ] Branch protection rule created
- [ ] Require pull requests (1 approval)
- [ ] Dismiss stale reviews enabled
- [ ] Require Code Owners enabled
- [ ] All required status checks added
- [ ] Require branches to be up to date
- [ ] Require conversation resolution
- [ ] Require signed commits
- [ ] Require linear history
- [ ] Include administrators
- [ ] Force pushes disabled
- [ ] Deletions disabled

### Develop Branch
- [ ] Branch protection rule created
- [ ] Require pull requests (1 approval)
- [ ] Dismiss stale reviews enabled
- [ ] Required status checks added
- [ ] Require branches to be up to date
- [ ] Require conversation resolution
- [ ] Require linear history
- [ ] Include administrators
- [ ] Force pushes disabled
- [ ] Deletions disabled

### Additional Setup
- [ ] CODEOWNERS file created
- [ ] Code owners assigned
- [ ] Team members have correct permissions
- [ ] Protection rules tested
- [ ] Documentation updated
- [ ] Team trained on new workflow

---

## Support

If you encounter issues:

1. Check [GitHub Docs on Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
2. Review GitHub Actions logs
3. Contact DevOps team
4. Create issue in repository

---

**Last Updated:** 2025-12-15
**Next Review:** After first month of use
