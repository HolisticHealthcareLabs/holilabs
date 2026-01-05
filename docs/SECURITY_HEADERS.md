# Security Headers Configuration
**HIPAA Compliance & Production Hardening**

---

## Overview

Holi Labs implements comprehensive HTTP security headers to protect against common web vulnerabilities and meet HIPAA security requirements. All headers are configured in `/apps/web/next.config.js` and applied to all routes.

**Security Rating Target:** A+ on [securityheaders.com](https://securityheaders.com)

---

## Implemented Headers

### 1. X-Frame-Options: DENY

**Purpose:** Prevents clickjacking attacks by preventing the site from being embedded in iframes.

**Value:** `DENY`

**HIPAA Relevance:** Prevents attackers from embedding login pages in malicious sites to steal credentials.

**References:**
- [OWASP Clickjacking Defense](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)
- RFC 7034

**Testing:**
```bash
curl -I https://holilabs.xyz | grep X-Frame-Options
# Expected: X-Frame-Options: DENY
```

---

### 2. X-Content-Type-Options: nosniff

**Purpose:** Prevents browsers from MIME-sniffing responses away from the declared content-type.

**Value:** `nosniff`

**HIPAA Relevance:** Prevents attackers from injecting malicious content disguised as images or other file types.

**Attack Scenario:**
- Attacker uploads malicious JavaScript disguised as an image (e.g., `malware.jpg`)
- Without `nosniff`, browser might execute it as JavaScript
- With `nosniff`, browser respects `Content-Type: image/jpeg` and won't execute

**References:**
- [MDN X-Content-Type-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options)

---

### 3. Referrer-Policy: strict-origin-when-cross-origin

**Purpose:** Controls how much referrer information is sent with requests.

**Value:** `strict-origin-when-cross-origin`

**Behavior:**
- Same-origin requests: Send full URL (including path and query string)
- Cross-origin requests (HTTPS → HTTPS): Send origin only (no path/query)
- HTTPS → HTTP requests: Send no referrer (downgrade protection)

**HIPAA Relevance:** Prevents leaking PHI in URLs (e.g., `/patients/123?ssn=xxx`) to third-party sites.

**Example:**
```
User visits: https://holilabs.xyz/patients/123?reason=appointment
Clicks link to: https://external-site.com

Referrer sent: https://holilabs.xyz (origin only, no patient ID)
```

**References:**
- [MDN Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy)

---

### 4. Permissions-Policy

**Purpose:** Restricts access to browser APIs (camera, microphone, geolocation).

**Value:** `camera=(), microphone=(), geolocation=(), interest-cohort=()`

**Disables:**
- **camera=():** Prevents access to camera API (no video recording)
- **microphone=():** Prevents access to microphone API (no audio recording)
- **geolocation=():** Prevents access to geolocation API (no location tracking)
- **interest-cohort=():** Opts out of Google FLoC (privacy-invasive ad tracking)

**HIPAA Relevance:** Reduces attack surface by disabling unnecessary browser APIs.

**Note:** If you add telemedicine features requiring camera/microphone, update policy:
```
camera=(self), microphone=(self)
```

**References:**
- [MDN Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy)
- [W3C Permissions Policy](https://www.w3.org/TR/permissions-policy/)

---

### 5. Strict-Transport-Security (HSTS)

**Purpose:** Forces browsers to always use HTTPS connections.

**Value:** `max-age=63072000; includeSubDomains; preload`

**Parameters:**
- **max-age=63072000:** Cache policy for 2 years (730 days)
- **includeSubDomains:** Apply to all subdomains (api.holilabs.xyz, etc.)
- **preload:** Eligible for HSTS preload list (browsers hardcode HTTPS requirement)

**HIPAA Relevance:** HIPAA §164.312(e)(1) requires transmission security. HSTS ensures all PHI transmission uses TLS 1.2+.

**⚠️ IMPORTANT:** Only enable HSTS after confirming:
- [ ] HTTPS works correctly on production domain
- [ ] SSL/TLS certificate is valid and auto-renews
- [ ] All subdomains support HTTPS
- [ ] No HTTP-only resources (images, scripts, etc.)

**Rolling back HSTS is difficult** because browsers cache the policy for 2 years. Test thoroughly before enabling.

**HSTS Preload:**
To submit to Chrome's HSTS preload list (recommended for maximum security):
1. Verify HSTS header is present for 1 month
2. Submit domain: https://hstspreload.org/
3. Wait 2-3 months for inclusion in Chromium

**References:**
- [MDN Strict-Transport-Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [HSTS Preload](https://hstspreload.org/)

---

### 6. X-XSS-Protection: 1; mode=block

**Purpose:** Enables browser's XSS filter (legacy, but defense in depth).

**Value:** `1; mode=block`

**Behavior:**
- **1:** Enable XSS filter
- **mode=block:** Block page rendering if XSS detected (don't try to sanitize)

**Status:** Deprecated in modern browsers (Chrome, Edge removed it), but still supported in Safari and older browsers.

**Note:** CSP is the modern replacement for XSS protection. We include X-XSS-Protection for older browser compatibility.

**References:**
- [MDN X-XSS-Protection](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection)

---

### 7. Content-Security-Policy (CSP)

**Purpose:** Prevents XSS, data injection attacks, and unauthorized resource loading.

**Current Policy:**
```
default-src 'self';
script-src 'self' 'unsafe-inline' ('unsafe-eval' in dev only);
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' https://api.holilabs.xyz https://*.anthropic.com https://*.deepgram.com https://*.upstash.io;
frame-ancestors 'none';
form-action 'self';
upgrade-insecure-requests;
base-uri 'self';
object-src 'none';
```

**Directive Explanations:**

#### `default-src 'self'`
Default policy: only load resources from same origin. All other directives override this.

#### `script-src 'self' 'unsafe-inline'`
**Scripts:**
- `'self'`: Load scripts from same origin
- `'unsafe-inline'`: Allow inline `<script>` tags and `onclick` handlers (required for Next.js)

**Security Note:** `'unsafe-inline'` weakens XSS protection. Future improvement:
```javascript
// Generate nonce per request
const nonce = crypto.randomUUID();
`script-src 'self' 'nonce-${nonce}'`
```

**Production vs Development:**
- **Production:** `'self' 'unsafe-inline'`
- **Development:** `'self' 'unsafe-inline' 'unsafe-eval'` (allows React DevTools, hot reloading)

#### `style-src 'self' 'unsafe-inline'`
**Styles:**
- Allow stylesheets from same origin
- Allow inline `<style>` tags (required for Tailwind, styled-components)

#### `img-src 'self' data: https:`
**Images:**
- `'self'`: Same-origin images
- `data:`: Data URLs (base64-encoded images)
- `https:`: Any HTTPS image (allows CDN images, user avatars, etc.)

**Security Note:** `https:` is permissive. Tighten to specific domains if possible:
```
img-src 'self' data: https://cdn.holilabs.xyz https://s3.amazonaws.com
```

#### `font-src 'self' data:`
**Fonts:**
- Same-origin fonts
- Data URL fonts (base64-encoded)

#### `connect-src 'self' https://api.holilabs.xyz https://*.anthropic.com https://*.deepgram.com https://*.upstash.io`
**AJAX/WebSocket/Fetch:**
- `'self'`: Same-origin API calls
- `https://api.holilabs.xyz`: API server
- `https://*.anthropic.com`: Claude AI API
- `https://*.deepgram.com`: Speech-to-text API
- `https://*.upstash.io`: Redis cache

**When to Update:**
Add new domains when integrating new APIs (e.g., Twilio, Resend).

#### `frame-ancestors 'none'`
**Iframes:**
- Prevent site from being embedded in iframes (same as X-Frame-Options: DENY)

**Note:** Use `frame-ancestors 'self'` if you need to embed your own pages in iframes.

#### `form-action 'self'`
**Form Submissions:**
- Only allow forms to submit to same origin
- Prevents forms from submitting to attacker's server

#### `upgrade-insecure-requests`
**Mixed Content:**
- Automatically upgrade HTTP requests to HTTPS
- Prevents mixed content warnings

**Example:**
```html
<!-- Before: -->
<img src="http://example.com/image.jpg">

<!-- After CSP: -->
<img src="https://example.com/image.jpg">
```

#### `base-uri 'self'`
**Base Tag:**
- Restricts `<base>` tag to same origin
- Prevents attackers from changing base URL to redirect all relative URLs

#### `object-src 'none'`
**Plugins:**
- Disables Flash, Java applets, and other plugins
- Recommended for security (these plugins are deprecated and insecure)

---

### 8. X-DNS-Prefetch-Control: off

**Purpose:** Disables DNS prefetching for privacy.

**Value:** `off`

**HIPAA Relevance:** Prevents browser from leaking user activity to DNS servers by prefetching links.

**Note:** May slightly reduce performance (DNS resolution happens on-demand instead of proactively). Trade-off: privacy > performance for healthcare.

**References:**
- [MDN X-DNS-Prefetch-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control)

---

### 9. X-Permitted-Cross-Domain-Policies: none

**Purpose:** Prevents Adobe Flash and PDF from loading content from the domain.

**Value:** `none`

**Context:** Legacy header for Adobe Flash Player (deprecated). Included for defense in depth.

**References:**
- [Adobe Cross-Domain Policy](https://www.adobe.com/devnet-docs/acrobatetk/tools/AppSec/xdomain.html)

---

## CSP Violation Monitoring

### Enable CSP Reporting

**Current:** CSP violations are logged to browser console only.

**Recommended:** Send CSP violations to a reporting endpoint for monitoring.

**Implementation:**

1. Add `report-uri` or `report-to` directive to CSP:
```javascript
// In next.config.js headers():
"report-uri https://holilabs.report-uri.com/r/d/csp/enforce",
"report-to csp-endpoint",
```

2. Create reporting endpoint:
```typescript
// apps/web/src/app/api/csp-report/route.ts
export async function POST(request: Request) {
  const report = await request.json();

  logger.warn({
    event: 'csp_violation',
    report,
  }, 'CSP violation detected');

  // Send alert if violations exceed threshold
  if (shouldAlertOnViolation(report)) {
    await sendPagerDutyAlert({
      title: 'CSP Violation Detected',
      details: report,
    });
  }

  return new Response('OK', { status: 200 });
}
```

3. Configure `report-to` group in headers:
```javascript
{
  key: 'Report-To',
  value: JSON.stringify({
    group: 'csp-endpoint',
    max_age: 10886400,
    endpoints: [{ url: 'https://holilabs.xyz/api/csp-report' }],
  }),
},
```

**Alert on:**
- High-frequency violations (> 100/hour)
- Violations from production (may indicate XSS attack)
- Specific blocked resources (e.g., `script-src` violations)

---

## Testing Security Headers

### 1. Automated Scan

**SecurityHeaders.com:**
```bash
# Test your domain
https://securityheaders.com/?q=https://holilabs.xyz&hide=on&followRedirects=on
```

**Expected Grade:** A or A+

**Grading:**
- **A+:** All headers present, strict CSP
- **A:** All headers present
- **B:** Missing 1-2 headers
- **C or below:** Multiple missing headers (NOT ACCEPTABLE)

---

### 2. Manual Verification

**cURL:**
```bash
# Check all headers
curl -I https://holilabs.xyz

# Check specific header
curl -I https://holilabs.xyz | grep -i content-security-policy
```

**Browser DevTools:**
1. Open Chrome DevTools (F12)
2. Network tab → Reload page
3. Click first request (document)
4. Headers tab → Response Headers
5. Verify all security headers present

---

### 3. CSP Violation Testing

**Browser Console:**
1. Open DevTools Console
2. Look for CSP violation warnings:
```
Refused to load the script 'https://evil.com/malware.js' because it violates the following Content Security Policy directive: "script-src 'self'".
```

**Common Violations:**
- **Inline scripts without nonce:** Use nonce-based CSP or move scripts to external files
- **Third-party CDNs:** Add to `script-src` or `connect-src`
- **Google Fonts:** Add `https://fonts.googleapis.com` to `style-src` and `https://fonts.gstatic.com` to `font-src`

**Fix Violations:**
1. Identify blocked resource in console
2. Determine if resource is legitimate (internal tool) or malicious (attack)
3. If legitimate, update CSP to allow:
   - Add domain to appropriate directive
   - Use nonce for inline scripts/styles
4. If malicious, investigate how it was injected (XSS vulnerability)

---

## CSP Best Practices

### 1. Start Permissive, Tighten Gradually

**Current Policy:** Uses `'unsafe-inline'` for scripts/styles (required for Next.js).

**Progressive Hardening:**
1. **Phase 1 (Current):** `'unsafe-inline'` - Monitor violations
2. **Phase 2 (Next):** Move inline scripts to external files where possible
3. **Phase 3 (Future):** Implement nonce-based CSP - Zero inline scripts

**Nonce-Based CSP Example:**
```typescript
// Generate nonce per request
import { headers } from 'next/headers';

export async function GET() {
  const nonce = crypto.randomUUID();

  headers().set('Content-Security-Policy',
    `script-src 'self' 'nonce-${nonce}'`
  );

  return (
    <html>
      <head>
        {/* Inline script with nonce */}
        <script nonce={nonce}>
          console.log('Allowed');
        </script>
      </head>
    </html>
  );
}
```

---

### 2. Monitor CSP Violations

**Monitoring Strategy:**
- **Week 1-2:** Report-Only mode, log all violations, identify false positives
- **Week 3-4:** Enforce mode, send alerts on violations
- **Ongoing:** Review violations monthly, tighten policy

**CSP Report-Only Mode:**
```javascript
// Instead of 'Content-Security-Policy', use:
{
  key: 'Content-Security-Policy-Report-Only',
  value: '...'
}
```

This logs violations without blocking resources (testing mode).

---

### 3. HIPAA Compliance Notes

**Required by HIPAA §164.312(a)(1):**
> "Implement technical policies and procedures for electronic information systems that maintain electronic protected health information to allow access only to those persons or software programs that have been granted access rights."

**How Security Headers Help:**
- **XSS Prevention (CSP):** Prevents attackers from injecting malicious scripts to steal PHI
- **Clickjacking (X-Frame-Options):** Prevents credential theft via iframe overlays
- **HTTPS Enforcement (HSTS):** Ensures PHI transmission is encrypted (§164.312(e)(1))
- **Referrer Policy:** Prevents PHI leakage in URLs

**Audit Logging:**
Log all CSP violations and security header modifications:
```typescript
logger.warn({
  event: 'csp_violation',
  blocked_uri: report['blocked-uri'],
  violated_directive: report['violated-directive'],
  source_file: report['source-file'],
  user_id: user?.id,
  ip_address: request.ip,
}, 'CSP violation detected');
```

---

## Common Issues and Fixes

### Issue 1: CSP Blocks Next.js Hot Reloading

**Symptom:** Development server hot reloading doesn't work, console shows CSP violations.

**Cause:** Next.js dev server uses `eval()` for hot reloading.

**Fix:** Allow `'unsafe-eval'` in development only (already configured):
```javascript
process.env.NODE_ENV === 'production'
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
```

---

### Issue 2: Google Fonts Blocked by CSP

**Symptom:** Fonts don't load, console shows CSP violation for `fonts.googleapis.com`.

**Fix:** Add Google Fonts domains to CSP:
```javascript
"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
"font-src 'self' data: https://fonts.gstatic.com",
```

---

### Issue 3: Third-Party Analytics Blocked

**Symptom:** Google Analytics, PostHog, or other analytics don't load.

**Fix:** Add analytics domains to CSP:
```javascript
"script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
"connect-src 'self' https://www.google-analytics.com https://analytics.google.com",
```

**HIPAA Warning:** Do NOT send PHI to third-party analytics. Anonymize user IDs and disable tracking for patient-facing pages.

---

### Issue 4: Stripe Payment Form Blocked

**Symptom:** Stripe checkout iframe doesn't load.

**Fix:** Allow Stripe in CSP:
```javascript
"frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
"script-src 'self' 'unsafe-inline' https://js.stripe.com",
"connect-src 'self' https://api.stripe.com",
```

**Note:** Stripe does NOT require BAA (does not handle PHI). Only payment data.

---

## Maintenance

### Annual Review Checklist

- [ ] Verify all security headers are present (securityheaders.com scan)
- [ ] Review CSP violations log - tighten policy if possible
- [ ] Check for new security headers (IETF, W3C recommendations)
- [ ] Update CSP for new third-party integrations
- [ ] Test HSTS preload status: https://hstspreload.org/?domain=holilabs.xyz
- [ ] Verify no mixed content warnings (HTTPS-only)
- [ ] Document any policy exceptions with justification

---

### When to Update Security Headers

**Add new domain to CSP when:**
- Integrating new third-party service (analytics, support chat, etc.)
- Adding CDN for static assets
- Embedding third-party widgets (chat, scheduling)

**Update CSP immediately if:**
- XSS vulnerability discovered (tighten `script-src`, remove `'unsafe-inline'` if possible)
- New HIPAA guidance on transmission security
- Browser vendor deprecates security feature

---

## References

**Official Documentation:**
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [Content Security Policy Reference](https://content-security-policy.com/)

**HIPAA Guidance:**
- [HHS HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- §164.312(e)(1) - Transmission Security
- §164.312(a)(1) - Access Control

**Testing Tools:**
- [SecurityHeaders.com](https://securityheaders.com/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [HSTS Preload](https://hstspreload.org/)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-01
**Next Review:** 2027-01-01
**Owner:** Security Team & DevOps
