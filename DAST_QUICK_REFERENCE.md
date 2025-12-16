# DAST Security Scanning - Quick Reference

**One-page guide for OWASP ZAP security testing**

---

## 🚀 Quick Commands

### Run Local Scans

```bash
# Baseline scan (5-10 min, safe for all environments)
./scripts/run-dast-scan.sh baseline http://localhost:3000

# Full scan (30-60 min, staging only!)
./scripts/run-dast-scan.sh full https://staging.holilabs.xyz

# API scan (10-20 min)
./scripts/run-dast-scan.sh api http://localhost:3000/api

# Authenticated scan (45-90 min)
export TEST_USER_EMAIL="test@holilabs.xyz"
export TEST_USER_PASSWORD="your-password"
./scripts/run-dast-scan.sh authenticated https://staging.holilabs.xyz
```

### Trigger GitHub Actions Scan

```bash
# Via GitHub UI
Actions → DAST Security Scan → Run workflow

# Via GitHub CLI
gh workflow run dast-scan.yml -f target_url=staging -f scan_type=baseline
```

---

## 📊 Scan Types Comparison

| Scan Type | Duration | Active? | Use Case | Safe for Prod? |
|-----------|----------|---------|----------|----------------|
| **Baseline** | 5-10 min | No | CI/CD, regular checks | ✅ Yes |
| **Full** | 30-60 min | Yes | Pre-release, thorough | ❌ No |
| **API** | 10-20 min | Partial | API testing | ✅ Yes |
| **Authenticated** | 45-90 min | Yes | Protected pages | ⚠️ Staging only |

---

## 🎯 Risk Levels & Actions

| Level | Icon | Priority | Action | Timeline |
|-------|------|----------|--------|----------|
| **High** | 🔴 | Critical | Fix immediately | < 24 hours |
| **Medium** | 🟠 | Important | Fix before release | < 1 week |
| **Low** | 🟡 | Nice-to-have | Fix when convenient | Next sprint |
| **Info** | ℹ️ | Informational | Review and document | As needed |

---

## 🔍 Common Findings & Quick Fixes

### 1. Missing X-Content-Type-Options

**Fix:**
```typescript
// apps/web/src/middleware.ts
response.headers.set('X-Content-Type-Options', 'nosniff');
```

### 2. Content Security Policy Not Set

**Fix:**
```typescript
// apps/web/next.config.js
headers: [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self';"
  }
]
```

### 3. Cookie Without SameSite

**Fix:**
```typescript
serialize('token', value, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
})
```

### 4. X-Frame-Options Missing

**Fix:**
```typescript
response.headers.set('X-Frame-Options', 'DENY');
```

### 5. Strict-Transport-Security Missing

**Fix:**
```typescript
response.headers.set(
  'Strict-Transport-Security',
  'max-age=31536000; includeSubDomains; preload'
);
```

---

## 🏥 Healthcare Security Checks

### Required Security Headers

```bash
✅ Content-Security-Policy (PHI exfiltration prevention)
✅ X-Frame-Options: DENY (clickjacking protection)
✅ Strict-Transport-Security (enforce HTTPS)
✅ X-Content-Type-Options: nosniff (MIME sniffing protection)
✅ Referrer-Policy (PHI in referrer protection)
```

### PHI Protection Validation

```bash
✅ No PHI in error messages
✅ No PHI in URLs
✅ No PHI in HTTP referrer headers
✅ No stack traces exposed
✅ Framework version hidden
```

### Authentication Security

```bash
✅ Rate limiting on auth endpoints (5/15min)
✅ Secure cookie flags (HttpOnly, Secure, SameSite)
✅ CSRF token validation
✅ Session timeout (30 min)
✅ MFA support verification
```

---

## 📋 Scan Schedule

### Automated (GitHub Actions)

```bash
Weekly: Saturday 2 AM UTC
  - Baseline scan on staging
  - Healthcare security checks
  - Results posted to GitHub Issues

Manual: On-demand via workflow_dispatch
  - Any scan type
  - Staging or production
  - Custom configuration
```

### Manual (Local/Development)

```bash
Before committing:
  - Baseline scan on localhost

Before PR:
  - Baseline scan on feature branch

Before merging:
  - Full scan on staging

After deployment:
  - Baseline scan on production
```

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `.github/workflows/dast-scan.yml` | GitHub Actions workflow |
| `.zap/rules.tsv` | ZAP scanning rules |
| `.zap/context.yaml` | Authentication context |
| `scripts/run-dast-scan.sh` | Local scan runner |
| `DAST_SECURITY_GUIDE.md` | Full documentation |

---

## 🆘 Troubleshooting

### Scan Won't Start

```bash
# Check application is running
curl -I http://localhost:3000/api/health

# Check Docker
docker ps
docker pull owasp/zap2docker-stable

# Check permissions
chmod +x scripts/run-dast-scan.sh
```

### Authentication Fails

```bash
# Verify credentials
echo $TEST_USER_EMAIL
echo $TEST_USER_PASSWORD

# Test login manually
curl -X POST https://staging.holilabs.xyz/api/auth/signin \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}"

# Check context configuration
cat .zap/context.yaml
```

### Too Many False Positives

```bash
# Add to .zap/rules.tsv
echo "10096	IGNORE	# Timestamp Disclosure" >> .zap/rules.tsv

# Re-run scan
./scripts/run-dast-scan.sh baseline http://localhost:3000
```

### Scan Takes Too Long

```bash
# Use baseline instead of full
./scripts/run-dast-scan.sh baseline http://localhost:3000

# Reduce scope
./scripts/run-dast-scan.sh baseline http://localhost:3000/portal

# Increase timeout in workflow
cmd_options: '-T 180'
```

---

## 📊 Viewing Results

### HTML Report (Recommended)

```bash
# Open latest report
open dast-reports/baseline_report_*.html

# View specific report
ls -lt dast-reports/
open dast-reports/baseline_report_20251215_143022.html
```

### JSON Report (For Automation)

```bash
# Parse with jq
cat dast-reports/baseline_report_*.json | jq '.site[].alerts[] | select(.riskcode=="3")'

# Count by risk level
jq '[.site[].alerts[] | select(.riskcode=="3")] | length' report.json  # High
jq '[.site[].alerts[] | select(.riskcode=="2")] | length' report.json  # Medium
jq '[.site[].alerts[] | select(.riskcode=="1")] | length' report.json  # Low
```

### Markdown Report (For Documentation)

```bash
# View in terminal
cat dast-reports/baseline_report_*.md

# Add to PR description
cat dast-reports/baseline_report_*.md >> pr-description.md
```

---

## ✅ Pre-Release Checklist

Before deploying to production:

- [ ] Full DAST scan on staging completed
- [ ] Zero high-risk vulnerabilities
- [ ] Medium-risk vulnerabilities documented
- [ ] Low-risk findings reviewed
- [ ] Healthcare security checks passed
- [ ] Security headers verified
- [ ] Authentication security validated
- [ ] PHI protection confirmed
- [ ] Rate limiting tested
- [ ] Information disclosure checked
- [ ] Results reviewed by security team
- [ ] Baseline scan on production passed

---

## 🔐 Security Best Practices

### Test Credentials

```bash
✅ Use dedicated test account
✅ Minimal privileges
✅ No real PHI access
✅ Store in GitHub Secrets
✅ Rotate quarterly
❌ Never commit to repo
❌ Never use production credentials
```

### Scan Safety

```bash
Production:
  ✅ Baseline scan only (passive)
  ✅ Off-peak hours preferred
  ❌ Never active scanning

Staging:
  ✅ All scan types allowed
  ✅ Use test data only
  ✅ Can reset environment
```

### Results Handling

```bash
✅ Review within 24 hours
✅ Document false positives
✅ Track remediation in tickets
✅ Store reports securely
❌ Never share publicly
❌ No PHI in scan results
```

---

## 📚 Quick Links

| Resource | URL |
|----------|-----|
| **ZAP Documentation** | https://www.zaproxy.org/docs/ |
| **OWASP Top 10** | https://owasp.org/www-project-top-ten/ |
| **HIPAA Security Rule** | https://www.hhs.gov/hipaa/for-professionals/security/ |
| **Full DAST Guide** | `DAST_SECURITY_GUIDE.md` |
| **GitHub Workflow** | `.github/workflows/dast-scan.yml` |

---

## 🎯 Key Metrics

Track these metrics monthly:

| Metric | Target | Current |
|--------|--------|---------|
| **High-Risk Findings** | 0 | Monitor |
| **Medium-Risk Findings** | < 5 | Monitor |
| **Scan Coverage** | > 90% | Monitor |
| **False Positive Rate** | < 10% | Monitor |
| **Mean Time to Remediate (High)** | < 24h | Monitor |
| **Mean Time to Remediate (Medium)** | < 7d | Monitor |

---

## 📞 Support

**For DAST issues:**
- Check: `DAST_SECURITY_GUIDE.md` (full guide)
- GitHub: Label issues with `security`, `dast`
- Security team: security@holilabs.xyz
- On-call: See `MONITORING_QUICK_REFERENCE.md`

**Emergency security issues:**
- High-risk vulnerabilities found in production
- Contact security team immediately
- Follow incident response procedures

---

**Status:** ✅ Production Ready
**Last Updated:** December 15, 2025
**Next Review:** Quarterly

**Run your first scan now:**
```bash
./scripts/run-dast-scan.sh baseline http://localhost:3000
```

**Print this page and keep it near your desk for quick reference!**
