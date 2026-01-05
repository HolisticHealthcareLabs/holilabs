# Security Headers Implementation Guide

**Status**: ✅ Production-Ready
**Last Updated**: 2026-01-03
**Security Rating Target**: A+ on securityheaders.com

---

## Overview

This guide documents the comprehensive security headers implemented in the HOLI Labs platform to protect against common web vulnerabilities and achieve industry-leading security ratings.

**All security headers are configured in** `/apps/web/next.config.js`

---

## Implemented Security Headers

### 1. X-Frame-Options: DENY

**Purpose**: Prevents clickjacking attacks by preventing the site from being embedded in iframes.

**Value**: `DENY`

**HIPAA Relevance**: Prevents attackers from overlaying malicious UI elements on top of PHI forms.

**References**:
- [MDN: X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
- [OWASP: Clickjacking](https://owasp.org/www-community/attacks/Clickjacking)

---

### 2. X-Content-Type-Options: nosniff

**Purpose**: Prevents MIME type sniffing attacks.

**Value**: `nosniff`

**Security Impact**: Browsers will not try to guess content types, preventing script execution from non-script resources.

**References**:
- [MDN: X-Content-Type-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options)

---

### 3. Referrer-Policy: strict-origin-when-cross-origin

**Purpose**: Controls how much referrer information is sent with requests.

**Value**: `strict-origin-when-cross-origin`

**Privacy Impact**:
- Same-origin requests: Send full URL
- Cross-origin requests: Send only origin (no path/query)
- HTTP to HTTPS: Send nothing

**HIPAA Relevance**: Prevents PHI from leaking via referrer headers to external sites.

**References**:
- [MDN: Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy)

---

### 4. Permissions-Policy (Comprehensive)

**Purpose**: Disables access to sensitive browser APIs that are not needed for healthcare operations.

**Disabled APIs**:
- `camera=()` - No camera access (not needed for web app)
- `microphone=()` - No microphone access (Deepgram handles recording separately)
- `geolocation=()` - No geolocation tracking (privacy)
- `usb=()` - No USB device access
- `bluetooth=()` - No Bluetooth access
- `payment=()` - No Payment Request API (Stripe handles payments)
- `midi=()` - No MIDI devices
- `sync-xhr=()` - No synchronous XMLHttpRequest (performance best practice)
- `display-capture=()` - No screen capture
- `speaker-selection=()` - No speaker selection
- `magnetometer=()`, `accelerometer=()`, `gyroscope=()` - No motion sensors
- `web-share=()` - No Web Share API
- `screen-wake-lock=()` - No screen wake lock
- `interest-cohort=()` - Disable FLoC tracking (privacy)

**Allowed APIs**:
- `fullscreen=(self)` - Fullscreen only from same origin (needed for document viewing)

**Privacy Impact**: Significantly reduces attack surface and prevents browser fingerprinting.

**References**:
- [MDN: Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy)
- [Chrome: Permissions Policy](https://developer.chrome.com/docs/privacy-sandbox/permissions-policy/)

---

### 5. Strict-Transport-Security (HSTS)

**Purpose**: Forces HTTPS connections and prevents SSL stripping attacks.

**Value**: `max-age=63072000; includeSubDomains; preload`

**Configuration**:
- `max-age=63072000` - 2 years (recommended for preload)
- `includeSubDomains` - Apply to all subdomains
- `preload` - Submit to HSTS preload list

**Security Impact**:
- Prevents man-in-the-middle attacks
- Prevents SSL stripping
- Prevents protocol downgrade attacks

**HIPAA Relevance**: Ensures PHI is always transmitted over encrypted connections.

**References**:
- [MDN: Strict-Transport-Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [HSTS Preload List](https://hstspreload.org/)

**IMPORTANT**: Only enable after confirming HTTPS works correctly in production!

---

### 6. Content-Security-Policy (CSP)

**Purpose**: Prevents XSS attacks, code injection, and unauthorized resource loading.

**Directives**:

```csp
default-src 'self';
script-src 'self' 'unsafe-inline' (prod: no unsafe-eval);
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' https://api.holilabs.xyz https://*.anthropic.com https://*.deepgram.com https://*.upstash.io;
frame-ancestors 'none';
form-action 'self';
upgrade-insecure-requests;
base-uri 'self';
object-src 'none';
report-uri https://api.holilabs.xyz/security-reports;
report-to default;
```

**Directive Explanations**:

- **`default-src 'self'`**: By default, only allow resources from same origin
- **`script-src`**: Allow scripts from self + inline (Next.js requirement)
  - `'unsafe-inline'` needed for Next.js inline scripts
  - `'unsafe-eval'` allowed in dev only (Next.js Hot Module Replacement)
- **`style-src`**: Allow styles from self + inline (Tailwind CSS requirement)
- **`img-src`**: Allow images from self, data URLs, and any HTTPS origin (for external images)
- **`font-src`**: Allow fonts from self and data URLs
- **`connect-src`**: Allow API calls to trusted endpoints only
  - Own API: `https://api.holilabs.xyz`
  - Anthropic: `https://*.anthropic.com` (Claude AI)
  - Deepgram: `https://*.deepgram.com` (transcription)
  - Upstash: `https://*.upstash.io` (Redis cache)
- **`frame-ancestors 'none'`**: Prevent embedding in iframes (redundant with X-Frame-Options, defense in depth)
- **`form-action 'self'`**: Only allow form submissions to same origin
- **`upgrade-insecure-requests`**: Automatically upgrade HTTP to HTTPS
- **`base-uri 'self'`**: Prevent base tag injection
- **`object-src 'none'`**: Block Flash, Java applets, and other plugins
- **`report-uri`**: Send violation reports to monitoring endpoint
- **`report-to`**: Modern reporting API (replaces report-uri)

**Known Limitations**:
- `'unsafe-inline'` for scripts and styles is required by Next.js
- To remove `'unsafe-inline'`, would need to implement nonces/hashes (complex)
- Trade-off: Moderate CSP vs breaking Next.js functionality

**HIPAA Relevance**: Prevents XSS attacks that could steal PHI from the DOM.

**References**:
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Report URI](https://report-uri.com/)

---

### 7. Cross-Origin-Embedder-Policy (COEP)

**Purpose**: Prevents cross-origin resources from being loaded without explicit permission.

**Value**: `require-corp`

**Security Impact**: Requires all cross-origin resources to opt-in via CORS or CORP headers.

**References**:
- [MDN: Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy)

---

### 8. Cross-Origin-Opener-Policy (COOP)

**Purpose**: Isolates browsing context from cross-origin windows.

**Value**: `same-origin`

**Security Impact**: Prevents cross-origin windows from accessing the window object (defends against Spectre-like attacks).

**References**:
- [MDN: Cross-Origin-Opener-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy)

---

### 9. Cross-Origin-Resource-Policy (CORP)

**Purpose**: Prevents cross-origin no-cors requests from loading resources.

**Value**: `same-origin`

**Security Impact**: Only same-origin requests can load resources (prevents side-channel attacks).

**References**:
- [MDN: Cross-Origin-Resource-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy)

---

### 10. Report-To API

**Purpose**: Defines endpoint for security violation reports.

**Value**:
```json
{
  "group": "default",
  "max_age": 31536000,
  "endpoints": [{ "url": "https://api.holilabs.xyz/security-reports" }]
}
```

**Reports Collected**:
- CSP violations
- COEP violations
- COOP violations
- NEL (Network Error Logging)
- Crash reports

**Endpoint**: `/apps/web/src/app/api/security-reports/route.ts`

**References**:
- [MDN: Report-To](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-to)
- [W3C: Reporting API](https://w3c.github.io/reporting/)

---

### 11. Network Error Logging (NEL)

**Purpose**: Reports network failures to detect attacks and infrastructure issues.

**Value**:
```json
{
  "report_to": "default",
  "max_age": 31536000,
  "include_subdomains": true
}
```

**Use Cases**:
- Detect DNS hijacking
- Detect TLS interception
- Detect connection failures
- Monitor CDN reliability

**References**:
- [MDN: NEL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/NEL)

---

### 12. Additional Headers

**X-XSS-Protection**: `1; mode=block`
- Legacy header for older browsers
- Modern browsers rely on CSP instead

**X-DNS-Prefetch-Control**: `off`
- Disable DNS prefetching for privacy
- Prevents leaking visited domains

**X-Permitted-Cross-Domain-Policies**: `none`
- Prevents Adobe Flash/PDF from loading cross-domain content
- Legacy security measure (Flash is deprecated)

---

## Security Violation Monitoring

### Endpoint: `/api/security-reports`

**Purpose**: Receives and stores security violation reports from browsers.

**Reports Stored**:
- Content Security Policy violations
- Cross-Origin policy violations
- Network errors
- Crash reports

**Database Schema**: `SecurityReport` model in `/apps/web/prisma/schema.prisma`

**Monitoring Dashboard**: (TODO: Create Grafana dashboard)

**Alert Thresholds**:
- ⚠️ Warning: >50 reports/hour
- 🚨 Critical: >100 reports/hour (possible attack)

**Common False Positives**:
- Browser extensions injecting scripts (expected, not a security issue)
- Third-party analytics blocked by ad blockers
- Users on corporate networks with SSL inspection

---

## Testing & Verification

### 1. Security Headers Scan

**Tool**: [securityheaders.com](https://securityheaders.com)

**Steps**:
1. Deploy to production
2. Visit https://securityheaders.com
3. Enter your production URL
4. Verify A+ rating

**Expected Score**: A+

**Score Breakdown**:
- X-Frame-Options: ✅
- X-Content-Type-Options: ✅
- Referrer-Policy: ✅
- Permissions-Policy: ✅
- Strict-Transport-Security: ✅ (if HTTPS enabled)
- Content-Security-Policy: ⚠️ (deducted for 'unsafe-inline', but acceptable)

---

### 2. CSP Validator

**Tool**: [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

**Steps**:
1. Copy CSP header from next.config.js
2. Paste into CSP Evaluator
3. Review findings

**Expected Findings**:
- ⚠️ `'unsafe-inline'` in script-src (expected for Next.js)
- ⚠️ `'unsafe-inline'` in style-src (expected for Tailwind)
- ✅ No high-severity issues

---

### 3. Manual Browser Testing

**Test CSP Violations**:
1. Open browser DevTools Console
2. Navigate to your site
3. Check for CSP violation errors
4. Verify violations are sent to `/api/security-reports`

**Test HSTS**:
1. Access site via HTTP
2. Verify automatic redirect to HTTPS
3. Verify HTTPS is enforced on subsequent visits

**Test Permissions-Policy**:
1. Try accessing camera: `navigator.mediaDevices.getUserMedia({ video: true })`
2. Should be blocked with permission error
3. Verify geolocation is blocked: `navigator.geolocation.getCurrentPosition()`

---

### 4. Penetration Testing

**Recommended Tests**:
- XSS injection attempts (should be blocked by CSP)
- Clickjacking attempts (should be blocked by X-Frame-Options)
- MIME sniffing attacks (should be blocked by X-Content-Type-Options)
- SSL stripping attempts (should fail with HSTS)

**Tools**:
- [OWASP ZAP](https://www.zaproxy.org/)
- [Burp Suite](https://portswigger.net/burp)
- [Nuclei](https://github.com/projectdiscovery/nuclei)

---

## Maintenance & Updates

### When to Update CSP

**Add to `connect-src`** when:
- Adding new API endpoints
- Integrating new third-party services
- Using new CDNs

**Add to `img-src`** when:
- Loading images from new domains
- Using new CDNs for images

**Add to `script-src`** when:
- Adding analytics scripts (e.g., Google Analytics)
- Adding chat widgets (e.g., Intercom)
- Using new third-party JavaScript libraries

**Add to `style-src`** when:
- Using CSS from new CDNs
- Adding font providers (e.g., Google Fonts)

### Monitoring CSP Violations

**Weekly Review**:
1. Check `/api/security-reports` logs
2. Identify top 10 blocked URLs
3. Determine if legitimate or attack
4. Update CSP if needed

**Monthly Review**:
1. Run security headers scan
2. Verify A+ rating maintained
3. Review NEL reports for network issues
4. Update documentation

---

## Troubleshooting

### Issue: CSP blocks legitimate resource

**Symptoms**: Resource fails to load, CSP violation in console

**Fix**:
1. Identify blocked URL in console
2. Determine appropriate CSP directive (script-src, img-src, etc.)
3. Add domain to directive in next.config.js
4. Test in dev environment
5. Deploy to production

**Example**:
```javascript
// Before
"connect-src 'self' https://api.holilabs.xyz",

// After (adding new API)
"connect-src 'self' https://api.holilabs.xyz https://api.newservice.com",
```

---

### Issue: HSTS prevents access during TLS misconfiguration

**Symptoms**: Browser shows "cannot connect" error, no bypass option

**Fix**:
1. Fix TLS certificate issue on server
2. If cannot fix immediately, users must clear HSTS cache:
   - Chrome: `chrome://net-internals/#hsts` → Delete domain
   - Firefox: Delete `SiteSecurityServiceState.txt` file

**Prevention**: Test HTTPS thoroughly before enabling HSTS

---

### Issue: COEP/COOP breaks third-party embeds

**Symptoms**: iframes, images, or scripts from cross-origin fail to load

**Fix**:
1. Identify which resource needs cross-origin access
2. Options:
   - **Option A**: Host resource on same origin
   - **Option B**: Ensure cross-origin resource sends `Cross-Origin-Resource-Policy: cross-origin` header
   - **Option C**: Relax COEP to `credentialless` (less secure)

---

## Compliance Mapping

### HIPAA Requirements

- **§164.312(a)(1) - Access Control**: ✅ Permissions-Policy disables unnecessary APIs
- **§164.312(c)(2) - Integrity**: ✅ CSP prevents unauthorized code injection
- **§164.312(e)(1) - Transmission Security**: ✅ HSTS enforces encrypted transmission

### OWASP Top 10 (2021)

- **A03:2021 - Injection**: ✅ CSP prevents XSS and code injection
- **A05:2021 - Security Misconfiguration**: ✅ Security headers properly configured
- **A07:2021 - Identification and Authentication Failures**: ✅ HSTS prevents session hijacking
- **A08:2021 - Software and Data Integrity Failures**: ✅ CSP enforces resource integrity

### SOC 2 Controls

- **CC6.1 - Logical Access Security**: ✅ Permissions-Policy restricts browser capabilities
- **CC7.1 - System Operations**: ✅ NEL/Report-To monitors security violations

---

## Additional Resources

**Security Headers**:
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [Security Headers Scanner](https://securityheaders.com/)

**Content Security Policy**:
- [CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [CSP Level 3 Spec](https://www.w3.org/TR/CSP3/)
- [Google CSP Guide](https://developers.google.com/web/fundamentals/security/csp)

**Cross-Origin Policies**:
- [Cross-Origin Isolation Guide](https://web.dev/coop-coep/)
- [Understanding CORP, COEP, COOP](https://web.dev/why-coop-coep/)

---

**Document Control:**
- **Version**: 1.0
- **Created**: 2026-01-03
- **Last Reviewed**: 2026-01-03
- **Next Review**: 2026-04-03 (quarterly)
- **Owner**: Security Team
- **Classification**: Internal - Technical
