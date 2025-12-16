# DAST Security Scanning Guide

**Dynamic Application Security Testing with OWASP ZAP**

---

## 📊 Overview

This guide covers DAST (Dynamic Application Security Testing) implementation for HoliLabs using OWASP ZAP (Zed Attack Proxy). DAST tests the running application for security vulnerabilities by simulating real-world attacks.

### What is DAST?

- **Dynamic testing** of running applications
- **Black-box security testing** (no source code access)
- **Real-world attack simulation**
- **Runtime vulnerability detection**
- Complements SAST (Static Application Security Testing)

### Why DAST for Healthcare?

- ✅ Detects runtime vulnerabilities missed by SAST
- ✅ Tests authentication and session management
- ✅ Validates security headers and configurations
- ✅ Identifies information disclosure (PHI exposure)
- ✅ Required for HIPAA security compliance
- ✅ Tests API endpoints and integrations

---

## 🎯 Quick Start

### Prerequisites

```bash
# Install Docker
brew install docker  # macOS
# or visit https://docs.docker.com/get-docker/

# Install jq (for JSON parsing)
brew install jq  # macOS
apt-get install jq  # Ubuntu/Debian
```

### Run Your First Scan

```bash
# 1. Start your application
pnpm dev

# 2. Run baseline scan (5-10 minutes)
./scripts/run-dast-scan.sh baseline http://localhost:3000

# 3. View results
open dast-reports/baseline_report_*.html
```

---

## 🔍 Scan Types

### 1. Baseline Scan (Recommended for CI/CD)

**What it does:**
- Passive scanning only
- No active attacks
- Safe for production
- Fast (5-10 minutes)
- Detects common issues

**When to use:**
- ✅ Continuous integration
- ✅ Staging environment
- ✅ Production environment
- ✅ Regular scheduled scans

**How to run:**
```bash
./scripts/run-dast-scan.sh baseline https://staging.holilabs.xyz
```

### 2. Full Scan (Active Testing)

**What it does:**
- Active + passive scanning
- Simulates real attacks
- May modify data
- Thorough (30-60 minutes)
- Detects complex vulnerabilities

**When to use:**
- ✅ Pre-production testing
- ✅ Major releases
- ✅ Staging environment only
- ❌ Never on production

**How to run:**
```bash
# Only run on staging!
./scripts/run-dast-scan.sh full https://staging.holilabs.xyz
```

### 3. API Scan

**What it does:**
- Tests API endpoints
- OpenAPI/Swagger support
- GraphQL support
- API-specific attacks
- Fast (10-20 minutes)

**When to use:**
- ✅ API-first applications
- ✅ Microservices testing
- ✅ Backend testing
- ✅ Integration testing

**How to run:**
```bash
./scripts/run-dast-scan.sh api http://localhost:3000/api
```

### 4. Authenticated Scan

**What it does:**
- Tests authenticated pages
- Session management testing
- Authorization testing
- Comprehensive coverage
- Thorough (45-90 minutes)

**When to use:**
- ✅ Testing protected features
- ✅ User role testing
- ✅ Healthcare portal testing
- ✅ Pre-release validation

**How to run:**
```bash
# Set test credentials
export TEST_USER_EMAIL="test@holilabs.xyz"
export TEST_USER_PASSWORD="your-test-password"

./scripts/run-dast-scan.sh authenticated https://staging.holilabs.xyz
```

---

## 🤖 Automated DAST Scanning

### GitHub Actions Workflow

DAST scans run automatically:

**Weekly Schedule:**
- Every Saturday at 2 AM UTC
- Baseline scan on staging
- Results posted to GitHub Issues

**Manual Trigger:**
```bash
# Via GitHub UI
# Actions → DAST Security Scan → Run workflow

# Via GitHub CLI
gh workflow run dast-scan.yml \
  -f target_url=staging \
  -f scan_type=baseline
```

**Configuration:**
- File: `.github/workflows/dast-scan.yml`
- Scans: staging and production (baseline only)
- Reports: Uploaded as artifacts
- Alerts: GitHub Issues for findings

### Workflow Features

✅ **Automated scheduling** (weekly)
✅ **Multiple scan types** (baseline, full, api)
✅ **Multiple environments** (staging, production)
✅ **Health check verification**
✅ **Vulnerability reporting**
✅ **Healthcare-specific checks**
✅ **Rate limiting tests**
✅ **Security header validation**
✅ **Information disclosure checks**

---

## 📋 Understanding Results

### Risk Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| 🔴 **High** | Critical vulnerability | Fix immediately |
| 🟠 **Medium** | Important security issue | Fix before release |
| 🟡 **Low** | Best practice violation | Fix when possible |
| ℹ️ **Info** | Informational | Review and document |

### Common Findings

#### 1. Missing Security Headers

**Finding:**
```
X-Content-Type-Options Header Missing
Risk: MEDIUM
```

**Fix:**
```typescript
// apps/web/src/middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
```

#### 2. Content Security Policy Issues

**Finding:**
```
Content Security Policy (CSP) Header Not Set
Risk: HIGH
```

**Fix:**
```typescript
// apps/web/next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline';"
  }
];
```

#### 3. Cookie Security

**Finding:**
```
Cookie Without SameSite Attribute
Risk: MEDIUM
```

**Fix:**
```typescript
// Set cookie options
res.setHeader('Set-Cookie', serialize('token', value, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600
}));
```

#### 4. Information Disclosure

**Finding:**
```
Server Leaks Version Information
Risk: LOW
```

**Fix:**
```typescript
// Hide framework information
response.headers.delete('X-Powered-By');
```

---

## 🏥 Healthcare-Specific Checks

### PHI Protection Verification

The DAST workflow includes healthcare-specific security checks:

#### 1. HIPAA Security Headers

```bash
✅ Content-Security-Policy
✅ X-Frame-Options: DENY
✅ Strict-Transport-Security
✅ X-Content-Type-Options: nosniff
```

#### 2. Authentication Security

```bash
✅ Rate limiting on auth endpoints
✅ Secure session management
✅ Password complexity enforcement
✅ MFA support verification
```

#### 3. Information Disclosure

```bash
✅ No PHI in error messages
✅ No PHI in URLs
✅ No PHI in logs
✅ No stack traces exposed
```

#### 4. Authorization Testing

```bash
✅ RBAC enforcement
✅ Patient data isolation
✅ Provider-only access controls
✅ Admin privilege separation
```

---

## ⚙️ Configuration

### ZAP Rules Configuration

**File:** `.zap/rules.tsv`

Configure scan behavior:

```tsv
# Ignore false positives
10049	IGNORE	# Cacheable content (expected for static assets)

# High priority vulnerabilities
10021	HIGH	# X-Content-Type-Options missing
10038	HIGH	# CSP header not set
90018	HIGH	# SQL injection

# Healthcare-specific
10062	HIGH	# PII disclosure (HIPAA compliance)
10027	HIGH	# Information disclosure in comments
```

### Scan Exclusions

Exclude paths from scanning:

```bash
# In workflow cmd_options
-I "https://holilabs.xyz/logout"        # Prevent logout during scan
-I "https://holilabs.xyz/api/auth/.*"   # Skip auth endpoints
-I "https://holilabs.xyz/admin/.*"      # Skip admin (requires special auth)
```

### Authentication Context

**File:** `.zap/context.yaml`

Configure authenticated scanning:

```yaml
env:
  contexts:
    - name: "HoliLabs"
      urls:
        - "https://staging.holilabs.xyz"
      authentication:
        method: "form"
        parameters:
          loginUrl: "https://staging.holilabs.xyz/signin"
          loginRequestData: "email={%username%}&password={%password%}"
        verification:
          loggedInRegex: "\\Qdashboard\\E"
          loggedOutRegex: "\\Qsignin\\E"
```

---

## 🔧 Troubleshooting

### Scan Fails to Start

**Issue:** "Target URL is not accessible"

**Solution:**
```bash
# Check application is running
curl -I http://localhost:3000

# Check Docker is running
docker ps

# Check firewall/network
ping localhost
```

### Authentication Fails

**Issue:** "Could not authenticate user"

**Solution:**
```bash
# Verify credentials
echo $TEST_USER_EMAIL
echo $TEST_USER_PASSWORD

# Test login manually
curl -X POST https://staging.holilabs.xyz/api/auth/signin \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}"

# Check auth context configuration
cat .zap/context.yaml
```

### False Positives

**Issue:** Too many low-priority alerts

**Solution:**
```bash
# Update .zap/rules.tsv
# Set specific rule to IGNORE

# Example: Ignore timestamp disclosure
echo "10096	IGNORE	# Timestamp Disclosure" >> .zap/rules.tsv

# Re-run scan
./scripts/run-dast-scan.sh baseline http://localhost:3000
```

### Scan Takes Too Long

**Issue:** Full scan running for hours

**Solution:**
```bash
# Use baseline scan instead
./scripts/run-dast-scan.sh baseline http://localhost:3000

# Reduce scan scope
./scripts/run-dast-scan.sh baseline http://localhost:3000/portal

# Increase timeout (workflow)
cmd_options: '-T 180'  # 180 minutes
```

---

## 📊 Best Practices

### 1. Regular Scanning Schedule

```yaml
Weekly:
  - Saturday: Full DAST scan on staging
  - Sunday: Baseline scan on production

Before Releases:
  - Full authenticated scan
  - API security scan
  - Healthcare-specific checks

After Critical Changes:
  - Baseline scan immediately
  - Full scan within 24 hours
```

### 2. Scan Targets

```bash
✅ Always scan staging
✅ Baseline scan production weekly
❌ Never full scan production
❌ Never scan without authorization
```

### 3. Results Review

```bash
Daily:
  - Check for new high-risk findings
  - Review GitHub Issues from scans

Weekly:
  - Review all findings
  - Update rules.tsv for false positives
  - Document remediation plans

Monthly:
  - Analyze trends
  - Update security baselines
  - Review scan coverage
```

### 4. Remediation Priority

```bash
High-Risk:
  - Fix immediately (< 24 hours)
  - Deploy emergency patch if needed
  - Notify security team

Medium-Risk:
  - Fix before next release
  - Include in sprint planning
  - Document in security log

Low-Risk:
  - Fix when convenient
  - Batch with other improvements
  - Track in backlog
```

---

## 🔐 Security Considerations

### Test Credentials

```bash
# Create dedicated test account
# - Minimal privileges
# - No real PHI access
# - Isolated test data
# - Separate from production

# Store securely
# - GitHub Secrets (CI/CD)
# - .env.local (local dev)
# - Never commit to repo
# - Rotate regularly
```

### Scan Safety

```bash
Production:
  ✅ Baseline scan only (passive)
  ✅ Off-peak hours
  ✅ Monitor during scan
  ❌ Never active scanning

Staging:
  ✅ All scan types allowed
  ✅ Use test data only
  ✅ Isolated environment
  ✅ Can reset if needed
```

### Compliance

```yaml
HIPAA:
  - Ensure no PHI in scan results
  - Log all security scans
  - Review findings monthly
  - Document remediation

BAA Requirements:
  - OWASP ZAP: Open source (no BAA needed)
  - Results stored in GitHub (covered by BAA)
  - No third-party scanning services
```

---

## 📚 Resources

### OWASP ZAP Documentation

- [ZAP Getting Started](https://www.zaproxy.org/getting-started/)
- [ZAP Scanning](https://www.zaproxy.org/docs/docker/baseline-scan/)
- [ZAP Authentication](https://www.zaproxy.org/docs/authentication/)
- [ZAP API](https://www.zaproxy.org/docs/api/)

### Healthcare Security

- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [NIST Healthcare Guidance](https://www.nist.gov/healthcare)
- [OWASP Healthcare](https://owasp.org/www-project-medical-device-security/)

### DAST Best Practices

- [OWASP DAST](https://owasp.org/www-community/Vulnerability_Scanning_Tools)
- [NIST Testing Guide](https://csrc.nist.gov/publications/detail/sp/800-115/final)
- [Security Testing Handbook](https://owasp.org/www-project-web-security-testing-guide/)

---

## 🆘 Support

### Getting Help

```bash
# View scan logs
docker logs [container-id]

# Check ZAP documentation
open https://www.zaproxy.org/docs/

# GitHub Issues
# Label: security, dast

# Emergency Security Issues
# Contact: security@holilabs.xyz
# On-call: See MONITORING_QUICK_REFERENCE.md
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Scan won't start | Check Docker, target URL |
| Authentication fails | Verify credentials, check context.yaml |
| Too many false positives | Update rules.tsv |
| Scan too slow | Use baseline, reduce scope |
| Missing in report | Check scan completed, verify file paths |

---

## ✅ Checklist

### Initial Setup

- [ ] Docker installed and running
- [ ] Test credentials created
- [ ] ZAP rules configured (.zap/rules.tsv)
- [ ] Authentication context set up (.zap/context.yaml)
- [ ] Local scan tested successfully
- [ ] GitHub Actions workflow enabled
- [ ] Team trained on DAST process

### Before Each Release

- [ ] Full DAST scan on staging
- [ ] All high-risk findings resolved
- [ ] Medium-risk findings documented
- [ ] Baseline scan on production passed
- [ ] Security headers verified
- [ ] Healthcare-specific checks passed
- [ ] Results reviewed by security team

### Regular Maintenance

- [ ] Weekly automated scans running
- [ ] Results reviewed within 24 hours
- [ ] False positives documented in rules.tsv
- [ ] Test credentials rotated quarterly
- [ ] Scan coverage reviewed monthly
- [ ] Team trained on new vulnerabilities

---

**Status:** ✅ Production Ready
**Last Updated:** December 15, 2025
**Version:** 1.0.0
**Next Review:** Quarterly

---

**Run your first scan:**
```bash
./scripts/run-dast-scan.sh baseline http://localhost:3000
```
