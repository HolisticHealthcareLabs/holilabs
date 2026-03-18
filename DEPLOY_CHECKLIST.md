# Deploy Checklist: Holi Protocol Production Release

**Date:** March 17, 2026
**Deployer:** _[Your name]_
**Release:** v0.1.0 + unit 10
**Environment:** Production (GCP)
**Deployment Method:** GitHub Actions (deploy-production.yml)

---

## ✅ PRE-DEPLOYMENT: Code & Quality Gates

### Code Review & Merging
- [ ] All PRs targeting `main` have ≥1 approved review
- [ ] No merge conflicts remain
- [ ] All feature branches are rebased on latest `main`
- [ ] Commit messages follow Conventional Commits spec

### Linting, Type Safety & Secrets
- [ ] ESLint passes: `pnpm lint`
- [ ] TypeScript type check passes: `pnpm type-check`
- [ ] No hardcoded secrets, API keys, or credentials in staging diff
- [ ] Trufflehog secret scan passes (part of CI)
- [ ] No `console.log`, `TODO`, or dead code in production files

### Test Suite & Coverage
- [ ] Full test suite passes: `pnpm test` (exit code 0)
- [ ] All unit tests in `apps/web` pass
- [ ] All API tests in `apps/api` pass
- [ ] Database tests pass with PostgreSQL 15 service
- [ ] Edge function tests pass (if modified)
- [ ] Sidecar integration tests pass

### Database & Migrations
- [ ] All pending Prisma migrations have been written: `pnpm db:migrate`
- [ ] Migration script has been reviewed for data safety
- [ ] Rollback script is prepared and tested locally
- [ ] No destructive migrations (ALTER TABLE DROP) without approval
- [ ] Database backup is scheduled before deploy

### Dependency Audit
- [ ] `pnpm install --frozen-lockfile` passes
- [ ] No critical security vulnerabilities in dependencies
- [ ] New dependencies have been reviewed for size/licensing

---

## ✅ PRE-DEPLOYMENT: Governance & Clinical Safety

### Legal & Compliance (RUTH's Gate)
- [ ] No new SaMD-regulated endpoints without ANVISA/COFEPRIS annotation
- [ ] Consent flows remain granular (no collapsed checkboxes)
- [ ] No cross-border data transfer outside LGPD Art. 33 scope
- [ ] Export/erasure routes include mandatory `legalBasis` field
- [ ] AuditLog records are preserved (not destroyed)

### Clinical Safety (ELENA's Gate)
- [ ] All new clinical rules have `sourceAuthority` metadata
- [ ] No Bro-Science (Tier 3) sources cited for rules
- [ ] Clinical recommendations still require human review before LLM output
- [ ] Missing lab values return `INSUFFICIENT_DATA` (not imputed)
- [ ] Biomarkers display both Pathological AND Functional ranges

### Security & Access Control (CYRUS's Gate)
- [ ] All new routes use `createProtectedRoute` RBAC guard
- [ ] Cross-tenant access verified with `verifyPatientAccess()`
- [ ] PII fields (CPF, CNS, RG) encrypted with `encryptPHIWithVersion`
- [ ] Audit trail hash-chain integrity is unbroken
- [ ] No RBAC weakening or permission scope widening

---

## ✅ DEPLOYMENT: Pre-Flight Checks

### Staging Verification (Rollout Pattern)
- [ ] Deploy to staging environment first: `deploy-staging.yml` workflow
- [ ] Wait for staging deployment to complete (typically 5–10 min)
- [ ] Verify staging health: `https://staging.holilabs.xyz/api/health` returns 200
- [ ] Run smoke test against staging: key user flows (login, create patient, order labs, view results)
- [ ] Check staging metrics for anomalies (error rate, latency, DB connections)
- [ ] Performance test suite passes: `cdss-performance-test.yml`

### Production Readiness
- [ ] Manual confirmation required in `deploy-production.yml` (type "deploy")
- [ ] On-call team has been notified via Slack/email
- [ ] Rollback plan is documented and accessible to team
- [ ] Incident response playbook is available
- [ ] Database backup completed and verified (automated in workflow)

---

## ✅ DEPLOYMENT: Production Deploy

### Deploy Execution
- [ ] Trigger production deploy: GitHub Actions → `deploy-production.yml` → Manual Trigger → Type "deploy"
- [ ] Pre-flight job passes:
  - [ ] Confirmation check passed
  - [ ] Linting passed
  - [ ] Type checking passed
  - [ ] Secrets scan passed
- [ ] Full test suite passes
- [ ] Build succeeds
- [ ] Prisma Client generation completes
- [ ] GCP deployment initiated (Cloud Run, Cloud SQL, IAM roles verified)
- [ ] Docker image built and pushed to GCP Artifact Registry

### Deployment Monitoring (First 15 Minutes)
- [ ] Health check passes: `https://holilabs.xyz/api/health` returns 200
- [ ] Metrics endpoint responds: `https://holilabs.xyz/api/health/metrics` (200 or 503 acceptable)
- [ ] Error rate remains **< 5%** (baseline: typically 0.1–0.5%)
- [ ] P50 latency stays **< 200ms** (baseline: typically 50–100ms)
- [ ] P95 latency stays **< 500ms** (baseline: typically 150–300ms)
- [ ] Database connection pool healthy (check Cloud SQL metrics)
- [ ] No unusual memory growth or CPU spikes

### Critical User Flows Verification
- [ ] User authentication works (login/logout)
- [ ] Patient creation works
- [ ] Encounter/visit creation works
- [ ] Clinical decision logic executes (biomarker rules, triage scoring)
- [ ] Lab result ordering works
- [ ] Report generation works
- [ ] Audit logging is recording all actions

---

## ✅ POST-DEPLOYMENT: Validation & Communication

### Metrics & Observability (First Hour)
- [ ] No spike in error logs
- [ ] No spike in slow query logs
- [ ] Database CPU utilization is normal (< 80%)
- [ ] Memory utilization is stable
- [ ] Network egress is normal
- [ ] Real User Monitoring (RUM) data is clean (if Lighthouse/Sentry configured)

### Stakeholder Communication
- [ ] Notify product team: "Deployment successful"
- [ ] Notify clinical team: "New clinical features live" (if applicable)
- [ ] Notify support team: "Changes to watch for"
- [ ] Update status page (if using statuspage.io)

### Changelog & Documentation
- [ ] Update CHANGELOG.md with release notes
- [ ] Tag release in Git: `git tag -a v0.1.1 -m "release: v0.1.1"`
- [ ] Update internal wiki/docs with breaking changes
- [ ] Close related tickets in project tracker

---

## 🚨 ROLLBACK TRIGGERS

**Auto-Rollback or Manual Rollback Immediately If:**

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | > 10% sustained | ROLLBACK |
| P50 Latency | > 500ms sustained | ROLLBACK |
| P95 Latency | > 1500ms sustained | ROLLBACK |
| Health Endpoint | Returns non-200 for > 2 min | ROLLBACK |
| Database Connection Pool | > 95% utilization | INVESTIGATE → possible ROLLBACK |
| Memory Leak Detected | Growing > 10MB/min | ROLLBACK |
| Critical Audit Log Failures | > 1% of writes failing | ROLLBACK |
| Patient Data Corruption | Any detected | ROLLBACK + INCIDENT |

**Rollback Procedure:**
1. Trigger `deploy-production.yml` with previous release SHA (or use GCP rollback)
2. Verify rollback completed and health checks pass
3. Post-incident review: determine root cause
4. Do NOT merge the problematic code back to `main` until root cause is fixed

---

## 📋 Checklists by Deployment Type

### If Database Migration is Included
- [ ] Dry-run migration in staging first
- [ ] Backup production database before migration
- [ ] Validate data integrity post-migration
- [ ] Rollback plan includes data restoration steps
- [ ] No long-running locks that would impact users

### If API Contract Changes (Breaking Change)
- [ ] All API consumers notified (internal teams, third-party integrations)
- [ ] Deprecation period followed (if applicable)
- [ ] Version number bumped (semantic versioning)
- [ ] Migration guide published
- [ ] Backward compatibility tested (if transitional)

### If Clinical Rules or Biomarker Logic Changed (ELENA's Oversight)
- [ ] Clinical team has reviewed and approved changes
- [ ] Test cases include edge cases (missing data, boundary values)
- [ ] Provenance & citations are documented
- [ ] No LLM outputs are used without human review
- [ ] Functional and Pathological ranges are both set

### If Security or Auth Changed (CYRUS's Oversight)
- [ ] RBAC changes tested against all user roles
- [ ] Cross-tenant isolation verified
- [ ] PII encryption keys rotated (if applicable)
- [ ] Audit trail integrity verified
- [ ] Secrets rotation completed

---

## 📞 Contacts & Escalation

| Role | Contact | Purpose |
|------|---------|---------|
| On-Call Engineer | _[Slack channel or phone]_ | Immediate issues |
| Product Lead | _[Email/Slack]_ | Feature validation |
| Clinical Lead (ELENA) | _[Email/Slack]_ | Clinical logic issues |
| Security Lead (CYRUS) | _[Email/Slack]_ | Security/audit issues |
| Compliance Officer (RUTH) | _[Email/Slack]_ | Legal/regulatory questions |

---

## ✅ Sign-Off

- [ ] **Deployed By:** __________________ **Date:** __________ **Time:** __________
- [ ] **Reviewed By:** __________________ **Date:** __________ **Time:** __________
- [ ] **Approved By:** __________________ **Date:** __________ **Time:** __________

---

## 📝 Notes & Observations

```
[Post-deploy observations, metrics, issues, and resolutions go here]
