# Security Hardening Report

**Date:** 2026-04-03
**Branch:** `feat/security-hardening`
**Classification:** INTERNAL — CONFIDENTIAL

## Threat Context

On March 2026, CVE-2026-4747 demonstrated that autonomous AI agents can discover, analyze,
and exploit kernel-level vulnerabilities in ~4 hours for hundreds of dollars (the "Carlini Pipeline").
This collapses the window between CVE disclosure and exploit availability to near-zero.

For a healthcare SaaS handling PHI valued at $250-$1000/record, this means:
- **Speed asymmetry**: We must assume attacks within hours of any CVE disclosure
- **Cost collapse**: Script kiddies are now AI-augmented; nation-state capabilities at commodity prices
- **Depth of attack**: AI chains multi-step exploits across app → container → kernel layers
- **Regulatory exposure**: HIPAA, LGPD, ANVISA RDC 657/2022 impose tight breach notification timelines

## Changes Made

### A) Rate Limiting — ENABLED with Adaptive Detection

**File:** `apps/api/src/index.ts`
**Lines:** 54-93 (adaptive state), 115-175 (registration + hooks)

| Change | Detail |
|--------|--------|
| Global rate limit | 100 req/min per IP (was: DISABLED) |
| Adaptive max function | Dynamically reduces to 5 req/min for flagged IPs |
| Probing detection | 5+ distinct endpoints in 10s → rate reduced for 10 minutes |
| Error threshold | 3+ validation errors (400/422) in 1min → IP blocked for 5 minutes |
| Stale entry cleanup | Automatic pruning every 5 minutes (entries older than 15min) |

**Rationale:** Rate limiting was completely disabled (commented out with TODO). In the AI-era
threat landscape, this is the equivalent of leaving the front door open. The adaptive layer
detects automated scanning patterns that are characteristic of AI-driven reconnaissance.

### B) Security Headers — Hardened

**File:** `apps/api/src/index.ts`

| Header | Before | After |
|--------|--------|-------|
| CSP script-src | `'self'` | `'self'` (unchanged) |
| CSP style-src | `'self' 'unsafe-inline'` | `'self'` (removed unsafe-inline) |
| CSP frame-ancestors | Not set | `'none'` |
| CSP object-src | Not set | `'none'` |
| CSP base-uri | Not set | `'self'` |
| CSP form-action | Not set | `'self'` |
| HSTS | Not configured | max-age=31536000, includeSubDomains, preload |
| X-Frame-Options | Not set | DENY |
| Permissions-Policy | Not set | camera=(), microphone=(), geolocation=(), payment=() |
| Referrer-Policy | Default | strict-origin-when-cross-origin |
| COOP | Not set | same-origin |
| DNS Prefetch | Not set | Disabled |

**Rationale:** `unsafe-inline` in CSP allows XSS via injected style attributes. HSTS preload
prevents SSL stripping. Frame-ancestors + X-Frame-Options prevent clickjacking. Permissions-Policy
restricts sensor access that could be exploited for fingerprinting.

### C) Container Hardening

**Files:** `Dockerfile`, `apps/web/Dockerfile`, `apps/web/Dockerfile.prod`

| Change | Detail |
|--------|--------|
| Package managers in production | **Removed** — runner stages now use clean `node:20-alpine` instead of inheriting from `base` |
| Secret build ARGs | **Removed** from root Dockerfile — was passing DATABASE_URL, NEXTAUTH_SECRET, API keys as ARGs (visible in `docker history`) |
| SKIP_ENV_VALIDATION | Added to build stage — secrets injected at runtime only |
| Non-root user | Already present (nextjs:1001) — verified across all Dockerfiles |
| Multi-stage builds | Already present — verified across all Dockerfiles |

**Rationale:** Docker build ARGs are stored in image layer metadata and extractable via
`docker history --no-trunc`. Passing secrets as ARGs is equivalent to publishing them.
Package managers in production images expand the attack surface for supply chain attacks.

### D) CI Pipeline — Enhanced

**File:** `.github/workflows/security-enhanced.yml`

| New Job | Purpose |
|---------|---------|
| `npm-audit` | Runs `pnpm audit --audit-level=high` — blocks PR on high+ severity vulns |
| `version-pinning` | Checks security-critical packages (jose, argon2, @fastify/helmet, next-auth, prisma, @prisma/client, zod, bcryptjs) use exact versions (no `^`) |

Both jobs are included in the security-summary gate — PRs cannot merge if either fails.

**Existing coverage (verified):** CodeQL, OWASP Dependency Check, Trivy container scan,
TruffleHog + Gitleaks secret scanning, license compliance, HIPAA compliance checks, security headers.

### E) Dependency Lockdown

**File:** `.npmrc` (new)

```
save-exact=true
audit=true
engine-strict=true
```

All future `pnpm add` commands will pin to exact versions (no `^` or `~`).
`audit=true` runs vulnerability checks on every install.

### F) SECURITY.md — Updated

Added "AI-Era Hardening" section documenting the threat context and mitigations.

## STRIDE Threat Model Summary

Full STRIDE analysis available in `docs/THREAT_MODEL.md`. Key findings by severity:

### CRITICAL
- Rate limiting was disabled on all API endpoints (FIXED)
- Docker build ARGs exposed secrets in image history (FIXED)
- Edge/Electron sidecar has no authentication (RESIDUAL — requires network-level controls)

### HIGH
- CSP allowed `unsafe-inline` for styles (FIXED)
- Package managers present in production containers (FIXED)
- No automated npm audit in CI pipeline (FIXED)

### MEDIUM
- Security-critical dependency versions not enforced as exact (FIXED via .npmrc + CI check)
- No HSTS preload configured (FIXED)
- No Permissions-Policy header (FIXED)

## Residual Risks and Recommended Follow-ups

### Priority 1 (Next Sprint)
1. **Edge sidecar authentication** — apps/edge has NO auth on any endpoint. Relies entirely on
   network isolation (hospital LAN). Add mTLS or shared-secret auth.
2. **JWT refresh token rotation** — NextAuth handles JWT but single-use refresh tokens with
   device fingerprint binding should be implemented at the application layer.
3. **Pin Docker base images to SHA digests** — Currently using `node:20-alpine` tag which is
   mutable. Pin to `node:20-alpine@sha256:<digest>` for reproducible builds.
4. **Redis port exposure** — `docker-compose.prod.yml` exposes Redis on port 6379 to host.
   Should use `expose` (internal only) instead of `ports`.

### Priority 2 (Next Month)
5. **Audit log append-only enforcement** — The AuditLog model has hash chain integrity but
   needs a Prisma migration with `REVOKE DELETE, UPDATE ON audit_logs`.
6. **Canary/honeypot fields** — Add synthetic fields to Patient records that trigger alerts
   if accessed (indicates unauthorized data scraping).
7. **Input validation on Edge sidecar endpoints** — `/sidecar/evaluate`, `/sidecar/decision`,
   and `/sidecar/chat` lack Zod schema validation (unlike the `/api/*` routes).
8. **Token binding (JTI + deny list)** — Add JWT ID claims with Redis-backed revocation list
   to prevent stolen token replay.

### Priority 3 (Quarterly)
9. **Vendor BAA signatures** — 7/8 vendors still unsigned (DigitalOcean, Upstash, Anthropic,
   Deepgram, Sentry, Resend, Twilio).
10. **Annual penetration test** — OWASP Top 10 + API Top 10 + infrastructure CIS benchmarks.
11. **Differential privacy accountant persistence** — Currently in-memory; needs DB backing
    for multi-instance deployments.

## CVE-2026-4747 Specific Mitigations

| Attack Vector | Mitigation Implemented |
|---------------|----------------------|
| Automated endpoint scanning | Adaptive rate limiting detects 5+ endpoints in 10s |
| Fuzzing/validation probing | 3+ validation errors in 1min triggers IP block |
| Supply chain (dependency) | npm audit in CI + exact version pinning enforced |
| Container escape chain | Package managers removed from production, non-root user |
| Secret extraction from images | Build ARGs eliminated, runtime-only injection |
| XSS via style injection | Removed `unsafe-inline` from CSP style-src |
| Clickjacking | X-Frame-Options: DENY + CSP frame-ancestors: none |
| SSL stripping | HSTS preload with 1-year max-age |

## Files Modified

| File | Change Type |
|------|------------|
| `apps/api/src/index.ts` | Rate limiting, security headers, adaptive detection |
| `Dockerfile` | Removed secret ARGs, clean runner stage |
| `apps/web/Dockerfile` | Clean runner stage (no pnpm) |
| `apps/web/Dockerfile.prod` | Clean runner stage (no pnpm/turbo) |
| `.github/workflows/security-enhanced.yml` | Added npm-audit + version-pinning jobs |
| `.npmrc` | New — exact versioning + audit |
| `SECURITY.md` | Updated API security + AI-era hardening section |
| `docs/THREAT_MODEL.md` | New — full STRIDE analysis |
| `docs/SECURITY_HARDENING_REPORT.md` | This document |
