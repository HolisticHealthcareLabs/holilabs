# Security: Production Hardening - Fix NordVPN Warning

## 🎯 Objective
Resolve NordVPN's "Potential scam detected" warning by fixing critical security misconfigurations and hardening production security posture.

## 🔴 Root Causes Identified
1. **Weak Content Security Policy** - `unsafe-inline` in production allowing XSS attacks
2. **Duplicate Security Headers** - 3 different configurations causing conflicts
3. **Outdated Dependencies** - Sentry 10.26.0 with known CVE (sensitive header leak)

## ✅ Changes Made

### 1. Security Headers Consolidation
**Problem**: Headers configured in 3 places (next.config.js, security-headers.ts, nginx.conf)
**Solution**: Single source of truth in middleware (security-headers.ts)

- ✅ Remove 140 lines of duplicate headers from `next.config.js`
- ✅ Establish `security-headers.ts` as authoritative source
- ✅ Eliminates header conflicts and malformed HTTP responses

### 2. Content Security Policy Hardening
**Problem**: Production CSP allows `unsafe-inline` scripts and external CDNs
**Solution**: Strict nonce-based CSP with no unsafe directives

**Before**:
```javascript
"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com"
```

**After**:
```javascript
"script-src 'self' 'nonce-...'  // No unsafe-inline, no external CDNs in production
```

Changes:
- ✅ Remove `unsafe-inline` from production script-src
- ✅ Remove external CDNs (jsdelivr.net, unpkg.com) in production
- ✅ Add Sentry monitoring domain: `https://*.sentry.io`
- ✅ Add CSP violation reporting: `/api/security/csp-report`

### 3. Dependency Security Updates
**Problem**: Sentry 10.26.0 has CVE (GHSA-6465-jgvq-jhgp) - sensitive headers leaked
**Solution**: Update to latest patched version

- ✅ Update `@sentry/nextjs`: 10.26.0 → **10.32.1**
- ✅ Add pnpm overrides for transitive deps:
  - `glob@>=9.0.0` (command injection fix)
  - `node-forge@>=1.3.2` (ASN.1 vulnerability fix)
  - `jws@>=4.0.1` (security fix)

### 4. Secret Management Improvements
**Problem**: Risk of accidentally committing production secrets
**Solution**: Comprehensive .gitignore patterns + secure generator

- ✅ Update `.gitignore` with secret file patterns
- ✅ Create production secrets generator script
- ✅ Add documentation for secret rotation workflow

### 5. New Security Monitoring
- ✅ CSP violation report endpoint: `/api/security/csp-report`
- ✅ Logs all CSP violations with context (browser, IP, violated directive)
- ✅ Helps identify and fix security policy issues

## 📊 Files Changed

| File | Lines Changed | Type |
|------|---------------|------|
| `.gitignore` | +9 | Security |
| `apps/web/next.config.js` | -140 | Security |
| `apps/web/src/lib/security-headers.ts` | +5 | Security |
| `apps/web/src/app/api/security/csp-report/route.ts` | +62 (new) | Security |
| `apps/web/scripts/generate-production-secrets.sh` | +100 (new) | DevOps |
| `apps/web/package.json` | +8 | Dependencies |

**Total**: -140 lines removed, +184 lines added (net: +44 lines)

## ✅ Verification Completed

### Pre-Deployment Tests
- ✅ Build test passed: 174/174 pages compiled successfully
- ✅ TypeScript compilation: 0 errors
- ✅ Dependency audit: 0 critical vulnerabilities in web app
- ✅ Security headers verified locally with curl

### Security Posture Improvements
| Check | Before | After |
|-------|--------|-------|
| **Next.js Version** | 14.2.35 ✅ | 14.2.35 ✅ |
| **jsPDF Version** | 4.0.0 ✅ | 4.0.0 ✅ |
| **Sentry Version** | 10.26.0 ⚠️ | 10.32.1 ✅ |
| **SQL Injection** | Fixed ✅ | Fixed ✅ |
| **CSP (Production)** | `unsafe-inline` ⚠️ | Nonce-based ✅ |
| **External CDNs** | jsdelivr, unpkg ⚠️ | None ✅ |
| **Header Conflicts** | 3 sources ⚠️ | 1 source ✅ |

### Expected Security Ratings (Post-Deployment)
- **securityheaders.com**: A or A+ (currently: B or C)
- **SSL Labs**: A or A+ (maintained)
- **Mozilla Observatory**: 80-100 (B+ to A+)
- **NordVPN Warning**: CLEARED (48-72 hours after deployment)

## ⚠️ Breaking Changes

### User Impact: Session Invalidation
**All user sessions will be invalidated** due to secret rotation.

**Impact**:
- Users will be logged out automatically
- Users must re-login with existing credentials
- No data loss, purely authentication refresh

**Mitigation**:
- Post maintenance notice 24 hours before deployment
- Schedule deployment during low-traffic period
- Monitor support channels for login issues

**Recommended Maintenance Window**: [Date/Time to be determined]

## 🔐 Pre-Deployment Requirements

**CRITICAL**: Must complete BEFORE merging/deploying:

### 1. Rotate Production Secrets ✋ REQUIRED
```bash
# Generate new secrets
./apps/web/scripts/generate-production-secrets.sh | pbcopy

# Update in DigitalOcean App Platform:
# Settings → Environment Variables → Update all secrets → Save
```

**Secrets to rotate**:
- [ ] SESSION_SECRET
- [ ] NEXTAUTH_SECRET
- [ ] ENCRYPTION_KEY
- [ ] ENCRYPTION_MASTER_KEY
- [ ] TOKEN_ENCRYPTION_KEY
- [ ] CRON_SECRET
- [ ] DEID_SECRET

### 2. Rotate External Service Secrets
- [ ] Sentry auth token (https://sentry.io/settings/auth-tokens/)
- [ ] Google OAuth secret (if applicable)
- [ ] Resend API key
- [ ] Twilio auth token (if applicable)

### 3. User Communication
- [ ] Draft and post maintenance notice
- [ ] Notify active users 24 hours before deployment

## 🧪 Testing Plan

### Staging Verification (Recommended)
1. Deploy to staging first
2. Test security headers: `curl -I https://staging.your-domain.com`
3. Verify CSP is strict (no unsafe-inline)
4. Test login flow and core workflows
5. Check browser console for CSP violations

### Production Verification (Post-Deployment)
- **Immediate** (0-15 min): Site accessible, login works, Sentry stable
- **24 hours**: Security header scores (A+ rating)
- **48-72 hours**: NordVPN warning cleared
- **1 week**: Monitor CSP violations, user feedback

See: `SECURITY_DEPLOYMENT_CHECKLIST.md` for detailed verification steps.

## 📚 Documentation

- **Security Audit**: `SECURITY_AUDIT_REPORT_2025-01-08.md`
- **Deployment Checklist**: `SECURITY_DEPLOYMENT_CHECKLIST.md`
- **Production Plan**: `.claude/plans/hidden-floating-quokka.md`

## 🎯 Success Criteria

**Immediate (Day 1)**:
- ✅ Deployment completes successfully
- ✅ Site is accessible and functional
- ✅ Users can login (after re-authentication)
- ✅ No spike in Sentry errors

**Short-term (Week 1)**:
- ✅ securityheaders.com: **A or A+**
- ✅ SSL Labs: **A or A+**
- ✅ NordVPN warning: **CLEARED**
- ✅ CSP violations: <10/day (legitimate only)

**Long-term (Month 1)**:
- ✅ Zero security incidents
- ✅ Maintained A+ ratings
- ✅ User satisfaction: No complaints

## 🔄 Rollback Plan

If critical issues occur:
1. DigitalOcean UI: Deployments → Rollback (fastest - 5 min)
2. Git: `git revert HEAD && git push` (auto-redeploys)

**Rollback triggers**:
- Login failure rate >10%
- Critical functionality broken
- 500 error spike >5%

**Note**: DO NOT rollback secrets if they were leaked!

## 📸 Screenshots

### Before: Weak CSP (next.config.js)
```javascript
"script-src 'self' 'unsafe-inline'"  // ⚠️ Allows XSS attacks
```

### After: Strong CSP (security-headers.ts)
```typescript
`script-src 'self' ${nonce ? `'nonce-${nonce}'` : ""}`  // ✅ Strict nonce-based
```

## 🔗 Related Issues

Fixes: #[issue-number] (NordVPN threat detection warning)
Closes: Security audit finding GHSA-6465-jgvq-jhgp (Sentry header leak)

## ✍️ Reviewer Notes

**Security Review Focus**:
- Verify CSP directives are correct (no typos in nonce syntax)
- Confirm external CDNs removed only in production (not dev)
- Check .gitignore patterns cover all secret file variants

**Testing Focus**:
- Deploy to staging first
- Test login flow thoroughly
- Monitor CSP violations in console
- Verify Sentry integration works

## 🤖 Generated By
[Claude Code](https://claude.com/claude-code) - AI-powered development assistant

---

**Ready to Merge**: ⬜ (Check after completing pre-deployment requirements)

**Deployment Scheduled**: _______________

**Deployed By**: _______________
