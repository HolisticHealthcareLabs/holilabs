# Security Policy

## Overview

VidaBanq Health AI Platform implements defense-in-depth security controls for healthcare data:

- **De-identification**: HIPAA Safe Harbor (18 identifiers) + GDPR-aligned processing
- **Access Control**: Row-Level Security (RLS), OPA policy enforcement, deny-by-default
- **Encryption**: TLS 1.3 in-transit, AES-256 at-rest (MinIO SSE-S3)
- **Authentication**: Argon2id password hashing, short-TTL JWT (15min), MFA-ready
- **Audit**: Immutable hash-chained log in Postgres, monthly partitions
- **Differential Privacy**: Identity-level ε/δ accounting with cooldowns

## Threat Model

**In Scope:**
- PHI exposure via application vulnerabilities
- Cross-org data access
- Re-identification attacks on de-identified data
- Privilege escalation
- Audit trail tampering

**Out of Scope (Deployment Responsibility):**
- Physical security
- DDoS at network layer
- Social engineering

## Reporting Vulnerabilities

**DO NOT** open public GitHub issues for security vulnerabilities.

Email: security@holilabs.xyz
PGP Key: [KEY_ID]

Expected response: 48 hours
Coordinated disclosure: 90 days

## Security Controls

### 1. De-Identification (packages/deid)

- Suppresses 18 HIPAA identifiers via regex + NLP stubs
- Generalizes: age→bands, dates→year/Q, geo→ZIP3/state
- Pseudonymizes: salted-hash patient tokens
- DICOM: scrubs metadata, preserves windowing
- OCR: CDR sanitization, adversarial robustness

**Validation**: PHI recall ≥0.95 on ES/PT/EN test corpora

### 2. Access Control

**RLS Policies** (Postgres):
```sql
CREATE POLICY org_isolation ON <table>
  USING (org_id = current_setting('app.current_org_id')::uuid);
```

**OPA/Rego Policies**:
- Purpose-binding: request.x-purpose must match consent
- Residency: bucket/region must match org.country
- Export-DP: epsilon budget + cooldown enforcement

### 3. Differential Privacy (packages/dp)

- Laplace/Gaussian noise mechanisms
- Advanced composition for sequential queries
- Identity-level accounting per (org, subject)
- Cooldown: 60min default between exports
- Receipt: cryptographic PDF with SHA-256 hash

### 4. Audit Trail (audit.audit_events)

- Hash chain: `row_hash = SHA256(prev_hash || payload || ts || event_type)`
- UPDATE/DELETE blocked via pg_rules
- Partitioned by month
- No PHI in logs (redacted via pino)

### 5. API Security (Fastify)

- **Rate limiting**: 100 req/min per IP (adaptive — reduced to 5 req/min for flagged IPs)
- **Adaptive probing detection**:
  - 5+ distinct endpoints in 10s → rate reduced for 10 minutes
  - 3+ validation errors in 1min → IP blocked for 5 minutes
- **Helmet CSP**: Strict — `default-src 'self'`, no `unsafe-inline`, no `unsafe-eval`
- **Security headers**: HSTS (preload, 1yr), X-Frame-Options DENY, Permissions-Policy, COOP, CORP
- Multipart size limit: 100MB
- JWT: ES256, 15min TTL, refresh rotation
- Input validation: Zod schemas

### 6. Secrets Management

- Docker secrets / KMS (not .env in prod)
- Quarterly key rotation (GH Actions workflow)
- SALT_ROTATION_KEY: 32-byte hex, rotated with re-pseudonymization

### 7. Dependencies

- SBOM generated in CI
- SAST: CodeQL
- DAST: OWASP ZAP
- Pinned versions in package-lock.json
- Renovate bot for security patches

## Production Checklist

- [ ] Enable TLS 1.3 at edge (CloudFront/Nginx)
- [ ] Rotate JWT signing keys
- [ ] Configure KMS for secrets
- [ ] Enable S3 Object Lock for audit logs (WORM)
- [ ] Deploy honeytokens (fake patient records)
- [ ] Configure SIEM alerts (AWS GuardDuty / Datadog)
- [ ] Schedule monthly restore drills (RPO/RTO validation)
- [ ] Enable MFA for admin users
- [ ] Configure OPA bundle signing
- [ ] Review firewall rules (allow-list only)

## Incident Response

See [RUNBOOKS/incident-breach.md](./RUNBOOKS/incident-breach.md)

1. Contain: Isolate affected systems
2. Assess: Determine PHI exposure scope
3. Notify: Legal/Compliance (HIPAA breach <60d)
4. Remediate: Patch vulnerability
5. Post-Mortem: RCA + controls improvement

## Compliance Frameworks

- **HIPAA**: Safe Harbor de-identification, audit controls, access controls
- **GDPR**: Art. 32 (security), Art. 25 (privacy by design), Art. 30 (ROPA)
- **LGPD** (Brazil): Art. 46 (security), Art. 48 (breach notification)
- **LFPDPPP** (Mexico): Art. 19 (security measures)
- **PDPA** (Argentina): Res. 11/2006 (security)

## Pentesting

Annual pentests recommended. Scope:
- Web app (OWASP Top 10)
- API (OWASP API Top 10)
- Infrastructure (AWS/GCP CIS Benchmarks)
- De-ID validation (re-identification attacks)

Report findings to security@holilabs.xyz.

## AI-Era Hardening (2026-04-03)

In response to CVE-2026-4747 (AI-automated FreeBSD kernel RCE), the following defense-in-depth
measures were implemented to address AI-speed, AI-depth attack vectors:

1. **Adaptive Rate Limiting**: Dynamic probing detection with automatic IP throttling/blocking
2. **Strict CSP**: Removed `unsafe-inline` from style-src, added `frame-ancestors: none`
3. **Container Hardening**: Removed package managers from production images, eliminated secret build ARGs
4. **CI Pipeline**: Added npm audit (high+ severity blocks PR) and version-pinning enforcement
5. **HSTS Preload**: max-age 31536000, includeSubDomains, preload
6. **Docker Build Security**: Secrets no longer passed as build ARGs (visible in image history)

See `docs/SECURITY_HARDENING_REPORT.md` for the complete change log.

## Known Limitations (MVP)

- OCR/DICOM de-ID are **stubs** (implement with Tesseract/dcmjs in prod)
- DP accountant in-memory (persist to DB for multi-instance)
- No federated learning or ZKPs (future roadmap)
- MFA not enforced (configurable)
- No automated key rotation (manual via script)

## Security Updates

Subscribe to security-announce@holilabs.xyz for CVE notifications.
