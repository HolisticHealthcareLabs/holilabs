# Security Audit Guide

**Purpose:** Comprehensive security audit procedures to identify vulnerabilities and ensure HIPAA compliance before production launch.

**Frequency:**
- Pre-production: Complete audit before launch
- Quarterly: Comprehensive audit every 3 months
- Ad-hoc: After major feature releases or security incidents

---

## Table of Contents

1. [Overview](#overview)
2. [Automated Security Scans](#automated-security-scans)
3. [Manual Security Review](#manual-security-review)
4. [HIPAA Compliance Checklist](#hipaa-compliance-checklist)
5. [Penetration Testing](#penetration-testing)
6. [Third-Party Security Assessment](#third-party-security-assessment)
7. [Vulnerability Remediation](#vulnerability-remediation)
8. [Security Audit Report](#security-audit-report)

---

## Overview

### Audit Scope

The security audit covers:

| Category | Scope | Tools |
|----------|-------|-------|
| **Code Security** | SQL injection, XSS, CSRF, injection attacks | Semgrep, npm audit, Snyk |
| **Dependency Security** | Known vulnerabilities in dependencies | npm audit, Dependabot |
| **Secret Scanning** | Exposed credentials in git history | Gitleaks, TruffleHog |
| **Infrastructure** | Misconfigurations, exposed services | Manual review, nmap |
| **Authentication** | MFA, session management, password policies | Manual testing |
| **Authorization** | RBAC, IDOR protection, privilege escalation | Manual testing |
| **Encryption** | TLS, PHI encryption, key management | Manual review |
| **HIPAA Compliance** | Technical safeguards, audit logs | Compliance checklist |

### Audit Timeline

**Pre-Production Audit (Week 1):**
- Day 1: Automated scans
- Day 2: Dependency audit
- Day 3: Secret scanning
- Day 4-5: Manual security review

**Quarterly Audit (Ongoing):**
- Week 1: Automated scans + dependency audit
- Week 2: Manual review of new features
- Week 3: Penetration testing (if applicable)
- Week 4: Remediation + report

---

## Automated Security Scans

### 1. SAST (Static Application Security Testing)

**Tool: Semgrep (Recommended)**

**Installation:**

```bash
# Install Semgrep
pip install semgrep

# Or via Homebrew
brew install semgrep
```

**Run Scan:**

```bash
# Full scan with auto-configuration
semgrep scan --config=auto apps/web/src

# Scan for specific vulnerabilities
semgrep scan --config "p/security-audit" apps/web/src

# Scan for OWASP Top 10
semgrep scan --config "p/owasp-top-ten" apps/web/src

# Output to JSON
semgrep scan --config=auto apps/web/src --json > security-scan-results.json
```

**Critical Rules to Check:**

```bash
# SQL Injection
semgrep scan --config "p/sql-injection" apps/web/src

# XSS (Cross-Site Scripting)
semgrep scan --config "p/xss" apps/web/src

# Command Injection
semgrep scan --config "p/command-injection" apps/web/src

# Insecure Cryptography
semgrep scan --config "p/crypto" apps/web/src

# Hardcoded Secrets
semgrep scan --config "p/secrets" apps/web/src
```

**Expected Results:**
- **0 critical vulnerabilities** before production
- **< 5 high vulnerabilities** (with documented exceptions)
- **< 20 medium vulnerabilities**

---

### 2. Dependency Vulnerability Scanning

**Tool: npm audit + Snyk**

**npm audit:**

```bash
# Check for vulnerabilities
pnpm audit

# Show only high and critical
pnpm audit --audit-level=high

# Generate detailed report
pnpm audit --json > dependency-audit.json
```

**Snyk (Recommended for production):**

```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Monitor project (alerts for new vulnerabilities)
snyk monitor

# Generate report
snyk test --json > snyk-report.json
```

**Remediation:**

```bash
# Auto-fix vulnerabilities (if available)
pnpm audit fix

# Update specific package
pnpm update <package-name>

# Check for breaking changes
pnpm outdated
```

**Acceptable Thresholds:**
- **0 critical vulnerabilities**
- **0 high vulnerabilities in direct dependencies**
- **< 5 high vulnerabilities in transitive dependencies** (with exceptions documented)

---

### 3. Secret Scanning

**Tool: Gitleaks**

**Installation:**

```bash
brew install gitleaks
```

**Scan Repository:**

```bash
# Scan entire git history
gitleaks detect --source . --verbose

# Scan specific commits
gitleaks detect --source . --since-commit HEAD~100

# Generate report
gitleaks detect --source . --report-path gitleaks-report.json
```

**Tool: TruffleHog (Alternative)**

```bash
# Install
pip install truffleHog

# Scan repository
truffleHog filesystem . --since-commit HEAD~500 --json > trufflehog-report.json
```

**Critical Secrets to Check:**

- [ ] DATABASE_URL (database credentials)
- [ ] SESSION_SECRET
- [ ] ENCRYPTION_KEY
- [ ] NEXTAUTH_SECRET
- [ ] API keys (RESEND_API_KEY, SENDGRID_API_KEY, TWILIO_AUTH_TOKEN)
- [ ] AWS credentials
- [ ] Private keys (.pem, .key files)

**If Secrets Found:**

1. **Immediate Actions:**
   - Revoke/rotate ALL exposed secrets immediately
   - Check for unauthorized access in logs
   - Change passwords for affected accounts

2. **Git History Cleanup (if in private repo):**
   ```bash
   # Use BFG Repo-Cleaner to remove secrets from history
   bfg --delete-files credentials.env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

3. **Prevention:**
   ```bash
   # Install pre-commit hook
   ./scripts/setup-git-secrets.sh
   ```

---

### 4. Container Security Scanning

**Tool: Trivy (if using Docker)**

```bash
# Install Trivy
brew install trivy

# Scan Docker image
trivy image holilabs/api:latest

# Scan with severity filtering
trivy image --severity HIGH,CRITICAL holilabs/api:latest

# Generate report
trivy image --format json --output trivy-report.json holilabs/api:latest
```

---

### 5. Web Application Scanning

**Tool: OWASP ZAP (Zed Attack Proxy)**

**Installation:**

```bash
brew install --cask owasp-zap
```

**Scan Staging Environment:**

```bash
# Start ZAP in daemon mode
zap.sh -daemon -port 8080 -config api.disablekey=true

# Run baseline scan (passive)
zap-baseline.py -t https://staging.holilabs.xyz -r zap-baseline-report.html

# Run full scan (active - more aggressive)
zap-full-scan.py -t https://staging.holilabs.xyz -r zap-full-report.html
```

**Critical Checks:**
- [ ] SQL Injection
- [ ] XSS (Reflected, Stored, DOM-based)
- [ ] CSRF protection
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] Cookie security (HttpOnly, Secure, SameSite)
- [ ] Authentication bypass
- [ ] Session management

**NEVER run active scans against production without authorization.**

---

## Manual Security Review

### 1. Authentication & Authorization

**Test Cases:**

#### MFA Enforcement
```bash
# Test: Create PHYSICIAN user without MFA
# Expected: Login should be blocked until MFA is set up

curl -X POST https://staging.holilabs.xyz/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "physician@example.com",
    "password": "test-password"
  }'

# Should return: { "error": "MFA_REQUIRED" }
```

#### RBAC (Role-Based Access Control)
```bash
# Test: NURSE tries to access PHYSICIAN-only endpoint
# Expected: 403 Forbidden

curl -X GET https://staging.holilabs.xyz/api/admin/users \
  -H "Authorization: Bearer <nurse-token>"

# Should return: HTTP 403
```

#### IDOR (Insecure Direct Object Reference) Protection
```bash
# Test: User A tries to access User B's patient data
# Expected: 403 Forbidden

curl -X GET https://staging.holilabs.xyz/api/patients/<patient-b-id> \
  -H "Authorization: Bearer <user-a-token>"

# Should return: HTTP 403 (if no DataAccessGrant exists)
```

#### Session Hijacking Protection
```bash
# Test: Reuse session token after logout
# Expected: 401 Unauthorized

# 1. Login
TOKEN=$(curl -X POST https://staging.holilabs.xyz/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.token')

# 2. Logout
curl -X POST https://staging.holilabs.xyz/api/auth/signout \
  -H "Authorization: Bearer $TOKEN"

# 3. Try to use token again
curl -X GET https://staging.holilabs.xyz/api/patients \
  -H "Authorization: Bearer $TOKEN"

# Should return: HTTP 401
```

---

### 2. Input Validation

**Test SQL Injection:**

```bash
# Test: SQL injection in search parameter
curl -X GET "https://staging.holilabs.xyz/api/patients?search='; DROP TABLE Patient; --" \
  -H "Authorization: Bearer <token>"

# Expected: Query should be safely escaped, no SQL execution
```

**Test XSS:**

```bash
# Test: Reflected XSS in patient name
curl -X POST https://staging.holilabs.xyz/api/patients \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "<script>alert(\"XSS\")</script>",
    "lastName": "Test",
    "email": "test@example.com",
    "dateOfBirth": "1990-01-01"
  }'

# Expected: Script should be escaped/sanitized in response
```

**Test Command Injection:**

```bash
# Test: Command injection in file upload
curl -X POST https://staging.holilabs.xyz/api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.txt; touch /tmp/pwned"

# Expected: Filename should be sanitized, command not executed
```

---

### 3. Encryption Verification

**Check TLS Configuration:**

```bash
# Test TLS version
openssl s_client -connect api.holilabs.xyz:443 -tls1_2

# Check certificate
openssl s_client -connect api.holilabs.xyz:443 -showcerts

# Test for weak ciphers
nmap --script ssl-enum-ciphers -p 443 api.holilabs.xyz
```

**Expected:**
- TLS 1.2 or higher only
- No SSL/TLS 1.0/1.1
- Strong cipher suites (ECDHE-RSA-AES256-GCM-SHA384, etc.)
- Valid certificate (not expired, correct domain)

**Check PHI Encryption:**

```sql
-- Connect to database and verify encrypted fields
SELECT
  "id",
  "firstName",  -- Should be base64-encoded ciphertext
  "email",      -- Should be base64-encoded ciphertext
  "dateOfBirth" -- Should be base64-encoded ciphertext
FROM "Patient"
LIMIT 5;
```

**Expected:**
- PHI fields should NOT be human-readable in database
- Should see base64-encoded ciphertext (e.g., `AES256:v1:dGhpcyBpcyBlbmNyeXB0ZWQ=`)

---

### 4. Security Headers

**Check Headers:**

```bash
curl -I https://api.holilabs.xyz/

# Check for required headers:
# - Strict-Transport-Security: max-age=31536000; includeSubDomains
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - Content-Security-Policy: (configured)
# - Permissions-Policy: (configured)
```

**Test CSP (Content Security Policy):**

```bash
# Verify inline scripts are blocked
curl -s https://api.holilabs.xyz/ | grep -i "content-security-policy"

# Should NOT contain: 'unsafe-inline' or 'unsafe-eval'
```

---

## HIPAA Compliance Checklist

### Technical Safeguards (§164.312)

**Access Control (§164.312(a)):**
- [ ] Unique user identification (email-based auth)
- [ ] Emergency access procedure documented
- [ ] Automatic logoff after inactivity (session timeout)
- [ ] Encryption and decryption mechanism (AES-256-GCM)

**Audit Controls (§164.312(b)):**
- [ ] All PHI access logged to AuditLog table
- [ ] Logs include: userId, action, resource, timestamp, accessReason
- [ ] Logs retained for 6 years
- [ ] Regular audit log reviews (weekly/monthly)

**Integrity (§164.312(c)):**
- [ ] PHI field-level encryption prevents tampering
- [ ] Database backups verified regularly
- [ ] Checksums/hashes for file uploads

**Person or Entity Authentication (§164.312(d)):**
- [ ] Password-based authentication
- [ ] MFA enforced for privileged roles (ADMIN, PHYSICIAN)
- [ ] Session tokens expire after 7 days

**Transmission Security (§164.312(e)):**
- [ ] TLS 1.2+ for all external communications
- [ ] Database connections encrypted (sslmode=require)
- [ ] No PHI transmitted in URLs or query parameters

### Administrative Safeguards (§164.308)

**Security Management Process:**
- [ ] Risk assessment completed
- [ ] Risk management strategy documented
- [ ] Sanction policy for violations
- [ ] Information system activity review (audit logs)

**Security Incident Procedures:**
- [ ] Incident response plan documented (/docs/runbooks/security-incident-response.md)
- [ ] Breach notification procedure documented (/docs/runbooks/hipaa-breach-notification.md)

**Contingency Plan:**
- [ ] Data backup plan (/docs/disaster-recovery/disaster-recovery-plan.md)
- [ ] Disaster recovery plan documented
- [ ] Emergency mode operation plan
- [ ] Testing and revision procedures (quarterly DR drills)

---

## Penetration Testing

### Internal Penetration Test

**Scope:**
- Authentication bypass
- Privilege escalation
- IDOR exploitation
- SQL injection
- XSS exploitation
- CSRF exploitation
- API security testing

**Tools:**
- Burp Suite Professional
- OWASP ZAP
- Postman (API testing)
- Custom scripts

**Test Scenarios:**

1. **Privilege Escalation:**
   - Can NURSE role escalate to ADMIN?
   - Can PATIENT access other patients' data?

2. **Authentication Bypass:**
   - Can auth be bypassed with malformed tokens?
   - Can MFA be bypassed?

3. **IDOR:**
   - Can user access resources they shouldn't?
   - Are UUIDs predictable or enumerable?

4. **API Security:**
   - Rate limiting on authentication endpoints?
   - Mass assignment vulnerabilities?
   - Excessive data exposure?

### External Penetration Test (Recommended)

**When:** Before production launch, then annually

**Vendors:**
- [Cure53](https://cure53.de/) - Specialized in web app security
- [Bishop Fox](https://www.bishopfox.com/) - Full-spectrum security testing
- [NCC Group](https://www.nccgroup.com/) - Healthcare security specialists

**Cost:** $10,000 - $50,000 depending on scope

**Deliverables:**
- Comprehensive penetration testing report
- Executive summary
- Detailed findings with severity ratings
- Remediation recommendations
- Retest after fixes

---

## Vulnerability Remediation

### Severity Classification

| Severity | Criteria | Response Time |
|----------|----------|---------------|
| **Critical** | Remote code execution, SQL injection, authentication bypass | **Immediate** (24 hours) |
| **High** | XSS, CSRF, IDOR, privilege escalation | **1 week** |
| **Medium** | Information disclosure, weak crypto | **2 weeks** |
| **Low** | Security misconfigurations, informational | **1 month** |

### Remediation Process

**Step 1: Triage**
- Review finding
- Verify reproducibility
- Assess actual risk (not just theoretical)
- Assign severity

**Step 2: Fix**
- Develop fix
- Test fix thoroughly
- Code review

**Step 3: Deploy**
- Deploy to staging
- Verify fix
- Deploy to production

**Step 4: Verify**
- Retest vulnerability
- Confirm fix is effective
- Document resolution

**Step 5: Prevent**
- Add test case to prevent regression
- Update security guidelines if needed
- Train team if necessary

---

## Security Audit Report

### Report Template

```markdown
# Security Audit Report

**Date:** YYYY-MM-DD
**Auditor:** [Name]
**Version:** [Application Version]

## Executive Summary

- Total vulnerabilities found: X
- Critical: X | High: X | Medium: X | Low: X
- Overall risk assessment: [Low / Medium / High]
- Production readiness: [Ready / Not Ready]

## Audit Scope

- Code security scan (Semgrep)
- Dependency vulnerability scan (npm audit, Snyk)
- Secret scanning (Gitleaks)
- Manual security review
- HIPAA compliance review

## Findings

### Critical Vulnerabilities

1. **[CVE-YYYY-XXXXX] SQL Injection in Patient Search**
   - **Severity:** Critical
   - **Location:** apps/web/src/app/api/patients/route.ts:123
   - **Description:** Unsanitized user input in SQL query
   - **Impact:** Database compromise, data exfiltration
   - **Recommendation:** Use parameterized queries
   - **Status:** [Open / In Progress / Fixed]

### High Vulnerabilities

[List high severity findings]

### Medium Vulnerabilities

[List medium severity findings]

### Low / Informational

[List low severity findings]

## HIPAA Compliance

- **Access Control:** ✓ Compliant
- **Audit Controls:** ✓ Compliant
- **Integrity:** ✓ Compliant
- **Authentication:** ⚠ MFA not enforced for all users
- **Transmission Security:** ✓ Compliant

## Recommendations

1. Fix all critical vulnerabilities before production launch
2. Implement MFA for all users (not just privileged roles)
3. Conduct external penetration test
4. Increase password complexity requirements

## Conclusion

[Overall assessment and production readiness decision]

---

**Auditor Signature:** _________________  **Date:** _______
```

---

## Automated Security Audit Script

**File: `scripts/security-audit.sh`**

```bash
#!/bin/bash
# Automated Security Audit Script

set -e

echo "=========================================="
echo "  SECURITY AUDIT"
echo "=========================================="
echo "Date: $(date)"
echo ""

# Create report directory
REPORT_DIR="security-audit-$(date +%Y%m%d-%H%M)"
mkdir -p "$REPORT_DIR"

echo "Report directory: $REPORT_DIR"
echo ""

# 1. Code security scan
echo "1. Running code security scan (Semgrep)..."
if command -v semgrep &> /dev/null; then
  semgrep scan --config=auto apps/web/src --json > "$REPORT_DIR/semgrep-report.json" || true
  echo "✓ Semgrep scan complete"
else
  echo "⚠ Semgrep not installed, skipping"
fi

# 2. Dependency scan
echo ""
echo "2. Running dependency vulnerability scan..."
pnpm audit --json > "$REPORT_DIR/npm-audit.json" || true
echo "✓ npm audit complete"

# 3. Secret scanning
echo ""
echo "3. Running secret scan (Gitleaks)..."
if command -v gitleaks &> /dev/null; then
  gitleaks detect --source . --report-path "$REPORT_DIR/gitleaks-report.json" --no-git || true
  echo "✓ Gitleaks scan complete"
else
  echo "⚠ Gitleaks not installed, skipping"
fi

# 4. Summary
echo ""
echo "=========================================="
echo "  AUDIT COMPLETE"
echo "=========================================="
echo "Reports saved to: $REPORT_DIR/"
echo ""
echo "Review reports:"
echo "1. Code security: $REPORT_DIR/semgrep-report.json"
echo "2. Dependencies: $REPORT_DIR/npm-audit.json"
echo "3. Secret scan: $REPORT_DIR/gitleaks-report.json"
echo ""
```

---

## Production Readiness Checklist

- [ ] **Automated Scans**
  - [ ] Semgrep scan: 0 critical, < 5 high
  - [ ] npm audit: 0 critical/high vulnerabilities
  - [ ] Gitleaks: No secrets found
  - [ ] Container scan: 0 critical vulnerabilities (if using Docker)

- [ ] **Manual Security Review**
  - [ ] Authentication bypass testing
  - [ ] RBAC testing (all roles)
  - [ ] IDOR protection verified
  - [ ] Session management tested
  - [ ] Input validation (SQL injection, XSS)
  - [ ] Security headers verified

- [ ] **HIPAA Compliance**
  - [ ] All technical safeguards implemented
  - [ ] Audit logging comprehensive
  - [ ] PHI encryption verified
  - [ ] Access controls tested
  - [ ] Transmission security verified

- [ ] **Documentation**
  - [ ] Security audit report completed
  - [ ] Vulnerability remediation plan
  - [ ] Incident response plan
  - [ ] HIPAA compliance attestation

---

## Related Documents

- [Security Incident Response Runbook](../runbooks/security-incident-response.md)
- [HIPAA Breach Notification Runbook](../runbooks/hipaa-breach-notification.md)
- [Key Rotation Runbook](../runbooks/key-rotation.md)
- [Audit Log Review Runbook](../runbooks/audit-log-review.md)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-08 | Security | Initial version |
