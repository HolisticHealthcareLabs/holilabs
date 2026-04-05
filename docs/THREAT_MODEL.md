# STRIDE Threat Model — Holi Labs Healthcare Platform

**Version:** 1.0
**Date:** 2026-04-03
**Author:** Security Engineering (automated analysis)
**Classification:** INTERNAL — CONFIDENTIAL

## Executive Summary

Holi Labs operates a healthcare SaaS platform handling PHI across multiple regulatory jurisdictions (HIPAA in the US, LGPD in Brazil, ANVISA RDC 657/2022 for SaMD). The platform processes data valued at $250-$1000 per record on the black market, making it a high-value target. The architecture spans a cloud-hosted Next.js application with 400+ API routes, a Fastify API gateway, a PostgreSQL database with field-level encryption, and critically, an unauthenticated edge sidecar deployed on hospital LANs.

The advent of AI-accelerated attacks (CVE-2026-4747: autonomous exploitation in 4 hours for $100) fundamentally changes the threat calculus. Automated vulnerability scanners can now chain low-severity findings into full compromise paths at machine speed. This platform's attack surface is broad: nine distinct user roles with varying privilege levels, real-time clinical decision support, audio transcription pipelines, file upload processing, FHIR interoperability endpoints, and an edge deployment model that places compute inside hospital networks with zero authentication.

Key findings: the edge sidecar (`apps/edge`) has NO authentication and NO rate limiting on clinical decision endpoints; Fastify API rate limiting is disabled in code (`apps/api/src/index.ts` lines 140-147); base container images use unpinned tags (`node:20-alpine`); `dateOfBirth`, `dnrStatus`, `dniStatus`, and `advanceDirectivesNotes` lack encryption; and the nginx CSP includes `unsafe-inline` and `unsafe-eval` for scripts. These gaps represent CRITICAL to HIGH severity findings in a healthcare context.

## System Architecture Overview

```
                    Internet
                       |
                   [Nginx :443]
                   TLS termination, rate limiting
                       |
              +--------+--------+
              |                 |
        [Next.js :3000]   [Fastify :3001]
        400+ API routes    FHIR sync, AI inference
        NextAuth v5        Multipart upload (100MB)
        Prisma ORM         BullMQ queue
              |                 |
              +--------+--------+
                       |
                  [PostgreSQL]
                  Field-level AES encryption
                  SHA-256 audit hash chain
                       |
                    [Redis]
                  Sessions, cache, BullMQ
                       
     Hospital LAN (air-gapped possible)
              |
        [Edge Sidecar :3001]
        Express + SQLite
        Traffic light CDS (<10ms)
        Offline queue + cloud sync
        NO AUTH on any endpoint
```

**Data Flows:**
1. Browser -> Nginx -> Next.js -> PostgreSQL (primary application flow)
2. Browser -> Nginx -> Fastify -> BullMQ -> Medplum (FHIR sync)
3. Edge Sidecar -> Cloud API (rule sync, assurance event upload)
4. Desktop Overlay -> Edge Sidecar (real-time clinical decisions)
5. Next.js -> Anthropic/Deepgram/Twilio/Resend (third-party AI/comms)

## Threat Analysis

### 1. Fastify API Server (apps/api)

| STRIDE Category | Threat | Severity | Current Mitigation | Gap |
|---|---|---|---|---|
| **Spoofing** | Auth routes are stubs forwarding to NextAuth; attacker bypasses Fastify to hit Next.js auth directly | HIGH | Auth route returns 410/redirect (`apps/api/src/routes/auth.ts`) | No independent token validation on Fastify routes; relies entirely on Next.js session |
| **Spoofing** | Forged `X-Forwarded-For` header spoofs IP for adaptive rate limiter (`apps/api/src/index.ts` line 69, `ipTrackers` Map) | HIGH | In-memory IP tracker with endpoint scanning detection | Trusts proxy headers without validation; no `trustProxy` configuration on Fastify instance |
| **Spoofing** | FHIR admin routes (`/fhir/admin`) accessible if `ENABLE_MEDPLUM=true` without per-request auth verification | MEDIUM | Conditional route registration (`index.ts` line 164) | No auth middleware visible on FHIR admin routes |
| **Tampering** | Multipart upload accepts 100MB files (`index.ts` line 135-138); no content-type validation or virus scanning | HIGH | Helmet CSP, file size limit | No MIME type validation, no antivirus scan, no file extension allowlist |
| **Tampering** | AI inference route (`/ai`) processes arbitrary prompts; prompt injection could alter clinical recommendations | CRITICAL | Logger redacts sensitive fields (`index.ts` lines 39-49) | No input sanitization or prompt injection detection on AI routes |
| **Tampering** | BullMQ FHIR jobs could be poisoned if Redis is compromised, causing corrupt data sync to Medplum | HIGH | Queue initialized conditionally (`index.ts` line 109) | No job payload signature verification; no Redis AUTH visible in config |
| **Repudiation** | Logger redacts authorization headers and PII (`index.ts` lines 39-49) but adaptive rate limiter actions not audited | MEDIUM | Structured Fastify logger with redaction | Rate limiter blocks/throttles not logged to audit trail; attacker probing leaves no forensic record |
| **Repudiation** | FHIR sync operations lack per-operation audit entries | HIGH | `fhir-audit-mirror.ts` exists | No hash-chained audit log for FHIR writes; reconciliation service (`fhir-reconciliation.ts`) may mask discrepancies |
| **Repudiation** | Telemetry endpoint (`/telemetry`) accepts sidecar data without sender authentication | MEDIUM | Endpoint registered at `index.ts` line 161 | Any host on the network can post fabricated telemetry data |
| **Information Disclosure** | Error responses may leak stack traces in non-production (`index.ts` line 175: `server.log.error(err)`) | MEDIUM | Production log level configurable via `env.LOG_LEVEL` | No explicit error sanitization for client-facing responses; Fastify default may expose internals |
| **Information Disclosure** | Monitoring routes (`/metrics`, `/health`) registered without auth prefix (`index.ts` line 152) | HIGH | No auth prefix on monitoring | Prometheus metrics and health data (DB status, queue stats) publicly accessible |
| **Information Disclosure** | CORS origin configured from env var (`index.ts` line 119); misconfiguration exposes API to arbitrary origins | MEDIUM | `@fastify/cors` with `credentials: true` | Single `CORS_ORIGIN` env var; wildcard misconfiguration would allow credential theft |
| **Denial of Service** | Rate limiting is DISABLED — commented out in code (`index.ts` lines 140-147, marked "TODO") | CRITICAL | Adaptive in-memory IP tracker (custom, lines 58-96) | Custom tracker is in-memory only (lost on restart), not distributed, and only catches scanning patterns — bulk single-endpoint abuse unmitigated |
| **Denial of Service** | 100MB multipart upload limit enables storage exhaustion attacks | HIGH | File size cap at 100MB | No per-user upload quota; no concurrent upload limit; single large file ties up worker |
| **Denial of Service** | `ipTrackers` Map grows unbounded in memory under distributed attack (many IPs) | MEDIUM | Pruning interval every 5 min (`index.ts` line 89-96) | No maximum Map size; botnet with 100K+ IPs could exhaust server memory before pruning fires |
| **Elevation of Privilege** | No RBAC enforcement at Fastify layer; all routes equally accessible if auth is bypassed | CRITICAL | Routes are stubs/proxies to Next.js | If Next.js auth is bypassed (e.g., direct Fastify access on exposed port), all routes including `/admin` and `/fhir/admin` are open |
| **Elevation of Privilege** | Admin routes (`/admin`) have no additional privilege verification beyond route registration | HIGH | Registered at `index.ts` line 158 | No middleware enforcing LICENSE_OWNER or ADMIN role at the Fastify layer |

### 2. Next.js Web Application (apps/web)

| STRIDE Category | Threat | Severity | Current Mitigation | Gap |
|---|---|---|---|---|
| **Spoofing** | Credential-based auth alongside OAuth; weak password policy or credential stuffing attacks | HIGH | NextAuth v5 with multiple providers (`apps/web/src/app/api/auth/[...nextauth]/route.ts`) | No visible account lockout policy; Argon2id hashing is good but brute force at login endpoint still viable |
| **Spoofing** | Demo/ephemeral user provisioning bypasses normal auth flow | MEDIUM | `isEphemeral` flag on User model (schema line 38) | Ephemeral users with real roles could access PHI if session is hijacked |
| **Spoofing** | WebAuthn challenge stored in Redis/Map fallback (`lib/auth/webauthn-challenge-store.ts`); Map fallback is per-process, not shared | MEDIUM | WebAuthn with `@simplewebauthn/server` v13 | In multi-instance deployment, Map fallback allows challenge replay across instances |
| **Tampering** | 400+ API routes with heterogeneous auth middleware; inconsistent `createProtectedRoute` usage | CRITICAL | `createProtectedRoute` wrapper in `lib/api/middleware.ts` | Historic bug: `compose()` missing `await` stripped response bodies from 421 routes (fixed per memory); pattern suggests additional unprotected routes may exist |
| **Tampering** | AI chat/generate-note routes accept arbitrary content that flows to Anthropic API | HIGH | De-identification service (Presidio) in pipeline | Not all AI routes may pass through de-identification; prompt injection could exfiltrate PHI through model responses |
| **Tampering** | Prisma schema has 6000+ lines with 100+ models; field validation relies on Zod at API boundary | HIGH | Zod validation on individual routes | No schema-level validation; malformed data bypassing a single route's validation corrupts the database |
| **Repudiation** | AuditLog with SHA-256 hash chain (`schema.prisma` lines 2276-2277: `previousHash`, `entryHash`) | LOW | Hash chain provides tamper evidence | Hash chain is application-level; DBA with direct DB access can rewrite chain from any point |
| **Repudiation** | LGPD `accessReason` tracking on audit logs | MEDIUM | Field exists in AuditLog model | No enforcement that `accessReason` is populated; null values defeat LGPD Article 7 compliance |
| **Repudiation** | Prescription signing supports WebAuthn biometric + PIN fallback; PIN signing is weaker non-repudiation | MEDIUM | Dual signing methods (`signatureMethod === 'webauthn'` branch) | PIN-signed prescriptions have weaker legal non-repudiation than biometric; no differentiation in audit trail weight |
| **Information Disclosure** | Sentry error monitoring may capture PHI in error context | HIGH | Sentry configured (`sentry.server.config.ts`, `sentry.edge.config.ts`) | No visible `beforeSend` scrubbing hook to strip PHI from error reports sent to Sentry (US-hosted SaaS) |
| **Information Disclosure** | Patient export endpoint (`/api/patients/[id]/export`) returns decrypted PHI | HIGH | RBAC on export route | Export produces decrypted bulk PHI; if access control fails, full patient record is exposed |
| **Information Disclosure** | Field-level encryption excludes `dateOfBirth` (DateTime type, `encryption-extension.ts` line 60), `mrn`/`externalMrn` (unique index, line 74), `dnrStatus`/`dniStatus` (Boolean), `advanceDirectivesNotes` (Text) | CRITICAL | AES encryption on 50+ string PHI fields via Prisma extension | `dateOfBirth` + `mrn` are HIPAA identifiers stored in plaintext; `advanceDirectivesNotes` is sensitive end-of-life PHI stored unencrypted; `dnrStatus`/`dniStatus` reveal critical clinical status without encryption |
| **Denial of Service** | 400+ API routes without consistent rate limiting at application layer | HIGH | Nginx rate limiting (auth: 10r/m, api: 60r/m, general: 100r/m) | Direct access to Next.js (port 3000) bypasses nginx rate limits entirely |
| **Denial of Service** | Prisma connection pool exhaustion via slow queries on large patient datasets | MEDIUM | PgBouncer connection pooling | No query timeout configured in Prisma schema; `driverAdapters` preview feature may have connection leak edge cases |
| **Denial of Service** | Audio transcription pipeline (Deepgram) processes large audio files synchronously | MEDIUM | Session-based audio upload (`/api/scribe/sessions/[id]/audio`) | No per-session audio size limit visible; large file could block worker |
| **Elevation of Privilege** | Nine roles (LICENSE_OWNER through RESEARCHER) with granular permissions array on User model (`schema.prisma` line 32) | HIGH | RBAC with `permissions String[]` array | Permissions stored as string array; no foreign key constraint means arbitrary permission strings can be injected if user update is compromised |
| **Elevation of Privilege** | RoleAssignment model with delegated RBAC (`schema.prisma` line 150: `RoleGrantor` relation) | HIGH | Delegated role assignment | A compromised ADMIN can grant LICENSE_OWNER permissions; no separation of privilege for role escalation |
| **Elevation of Privilege** | Workspace boundaries (`WorkspaceMember` model) may not be enforced on all 400+ routes | CRITICAL | Workspace model exists | Cross-workspace data access if any route omits workspace scoping in its Prisma query |

### 3. PostgreSQL Database

| STRIDE Category | Threat | Severity | Current Mitigation | Gap |
|---|---|---|---|---|
| **Spoofing** | Database connection string in `DATABASE_URL` env var; if leaked, grants full access | CRITICAL | Env var not committed (`.env` in gitignore) | No database user separation (single connection string for all operations); no row-level security policies |
| **Spoofing** | PgBouncer pooling may reuse connections across auth contexts | MEDIUM | PgBouncer in Docker stack | Connection pooling can leak session state (e.g., `SET ROLE`) between requests |
| **Tampering** | Direct SQL injection via raw queries (`prisma.$queryRaw`) if used with string interpolation | HIGH | Prisma ORM parameterizes by default | Any `$queryRaw` or `$executeRaw` with template literals (not tagged templates) is vulnerable; `prisma.$queryRaw\`SELECT 1\`` in edge health check (`apps/edge/src/index.ts` line 289) uses tagged template correctly |
| **Tampering** | Schema drift between `apps/web/prisma/schema.prisma` and `prisma/schema.prisma` (root) | MEDIUM | Both schemas exist in repo | Two schema files can diverge; `prisma db push` from wrong directory applies wrong schema |
| **Tampering** | AuditLog hash chain integrity depends on application code; no database-level trigger enforces chain | HIGH | SHA-256 `previousHash` -> `entryHash` chain (`schema.prisma` lines 2276-2277) | Direct INSERT bypassing application (migration scripts, admin tools) breaks chain silently |
| **Repudiation** | No database-level audit logging (PostgreSQL `pgaudit` extension) | HIGH | Application-level AuditLog model | DBA actions (ALTER TABLE, DELETE, UPDATE) leave no trace; critical for HIPAA breach investigation |
| **Repudiation** | Backup strategy (`database-backup.yml` workflow) but no verified restore testing | MEDIUM | GitHub Actions backup workflow exists | Backups without tested restores provide false confidence; encrypted backups need key escrow verification |
| **Information Disclosure** | `dateOfBirth` stored as plaintext DateTime — cannot be encrypted as string ciphertext | CRITICAL | Documented exclusion in `encryption-extension.ts` line 60 | HIPAA Safe Harbor requires removal/generalization of birth date; stored as exact date, queryable, and unencrypted |
| **Information Disclosure** | `advanceDirectivesNotes` stored as `@db.Text` without encryption | HIGH | Field exists in Patient model (`schema.prisma` line 868) | Contains sensitive end-of-life wishes; palliative care data is among the most sensitive PHI categories |
| **Information Disclosure** | `mrn` and `externalMrn` excluded from encryption because they are `@unique` indexed | HIGH | Documented exclusion in `encryption-extension.ts` line 74 | MRN is a HIPAA identifier; stored in plaintext to support unique lookups; needs deterministic encryption or HMAC-based indexing |
| **Information Disclosure** | Database query logs enabled in development (`index.ts` line 32: `['query', 'error', 'warn']`) | MEDIUM | Conditional on `NODE_ENV` | Dev database logs may contain PHI in query parameters if developer connects to staging/prod DB |
| **Denial of Service** | No connection limit per user/role; single PgBouncer pool serves all traffic | MEDIUM | PgBouncer connection pooling | Runaway query from one route exhausts pool for all users |
| **Denial of Service** | Schema has 100+ models with deep relations; unbounded `include` queries can trigger full table scans | HIGH | Prisma ORM | No `select` enforcement; a route using `include: { prescriptions: { include: { ... } } }` can generate massive joins |
| **Elevation of Privilege** | Single database user for all application operations | CRITICAL | Prisma single-connection model | No least-privilege separation; compromised app has full DDL/DML access including `DROP TABLE` |
| **Elevation of Privilege** | No row-level security (RLS); workspace isolation is application-enforced only | CRITICAL | Workspace model with `WorkspaceMember` | SQL injection or direct DB access bypasses all workspace boundaries; multi-tenant data fully accessible |

### 4. Edge/Electron Sidecar (apps/edge)

| STRIDE Category | Threat | Severity | Current Mitigation | Gap |
|---|---|---|---|---|
| **Spoofing** | NO authentication on ANY endpoint — all sidecar routes are open (`apps/edge/src/index.ts`) | CRITICAL | CORS limited to `localhost:3000` and `127.0.0.1:3000` (`index.ts` line 279) | CORS is browser-enforced only; any process on the LAN (or malware on the host) can call endpoints directly via curl/fetch with no auth |
| **Spoofing** | `CLINIC_ID` defaults to `'demo-clinic'` if env not set (`index.ts` line 575) | HIGH | Env var configuration | Unconfigured edge nodes create assurance events attributed to `demo-clinic`; events sync to cloud with wrong provenance |
| **Spoofing** | `EDGE_SECRET` used for telemetry defaults to `'smoke-test-secret'` (`index.ts` line 638) | CRITICAL | Env var configuration | Hardcoded default secret in production code; any attacker knowing this value can forge telemetry |
| **Tampering** | `/sidecar/evaluate` accepts arbitrary `patientHash`, `action`, and `payload` without auth (`index.ts` lines 417-490) | CRITICAL | No input validation on sidecar routes (Zod only on `/api/*` routes) | Attacker can submit fabricated clinical contexts, poisoning the traffic light evaluation logs and RLHF training data |
| **Tampering** | `/sidecar/decision` records physician override decisions without verifying physician identity (`index.ts` lines 497-593) | CRITICAL | No auth | Anyone on the LAN can record fake override decisions with arbitrary justifications; this data feeds RLHF training |
| **Tampering** | Rule cache in SQLite can be poisoned if cloud sync is MITM'd; no signature verification on downloaded rules | CRITICAL | HTTPS long polling to cloud (`CLOUD_URL` env var) | No code-signing or hash verification on rule payloads from `startSyncServices()`; compromised rule = wrong clinical decisions |
| **Tampering** | `/sidecar/chat` accepts arbitrary messages with no input sanitization (`index.ts` lines 600-627) | HIGH | RAG-only mode (no LLM hallucination) | Chat endpoint accessible without auth; could be used for reconnaissance about system rules and clinical protocols |
| **Repudiation** | Override decisions recorded without authenticated identity (`index.ts` line 546: `feedbackSource: 'physician'` hardcoded) | CRITICAL | `localHumanFeedback` table | All overrides attributed to generic `physician` source; no way to identify which clinician made the override decision |
| **Repudiation** | Traffic light logs contain `patientHash` but log truncates to 8 chars (`index.ts` line 475) | MEDIUM | Hash truncation in logs | Truncated hash cannot definitively identify which patient evaluation was for, weakening audit trail |
| **Repudiation** | Sync queue items (`QueueItem`, `LocalAssuranceEvent`) have no integrity seal; cloud cannot verify edge data authenticity | HIGH | `syncStatus` tracking | Tampered events synced to cloud are indistinguishable from legitimate ones |
| **Information Disclosure** | Patient cache endpoint (`/api/patient/:patientHash`) returns medications, allergies, diagnoses without auth (`api/index.ts` lines 361-391) | CRITICAL | Cache expiry check | Any process on LAN can enumerate patient hashes and retrieve full clinical summaries |
| **Information Disclosure** | Health endpoint (`/health`) exposes clinic ID, sync status, rule versions, database status (`index.ts` lines 286-334) | HIGH | No auth on health endpoint | Network reconnaissance reveals infrastructure details (sync staleness, rule versions, database health) |
| **Information Disclosure** | SQLite database file on local disk has no encryption at rest | HIGH | File system permissions | Physical access to edge device (common in hospital environments) exposes all cached patient data, rules, and logs |
| **Denial of Service** | NO rate limiting on any edge endpoint | CRITICAL | None | Unauthenticated flood on `/sidecar/evaluate` exhausts SQLite write capacity (single-writer lock), blocking clinical decisions for legitimate users |
| **Denial of Service** | Express `json({ limit: '10mb' })` body parser without request count limits (`index.ts` line 283) | HIGH | Body size limit | 10MB per request with no rate limit; moderate traffic saturates edge node bandwidth and memory |
| **Denial of Service** | SQLite single-writer bottleneck under concurrent traffic light evaluations | HIGH | SQLite via Prisma | High evaluation volume (busy clinic) causes write contention; `trafficLightLog.create` serializes all evaluations |
| **Elevation of Privilege** | All endpoints equally accessible — no role differentiation | CRITICAL | None | No distinction between clinical evaluation, admin rule access, patient data access, and feedback submission; any network actor has full system access |
| **Elevation of Privilege** | Edge node process likely runs as user with local filesystem access to SQLite DB | HIGH | Non-root expected but not enforced | No AppArmor/SELinux profile; compromised edge process has full access to cached patient data |

### 5. Redis

| STRIDE Category | Threat | Severity | Current Mitigation | Gap |
|---|---|---|---|---|
| **Spoofing** | Redis connection without AUTH if `REDIS_URL` lacks password | HIGH | URL-based configuration in env vars | No explicit `requirepass` enforcement visible; default Redis has no auth |
| **Spoofing** | WebAuthn challenge store uses Redis with Map fallback (`webauthn-challenge-store.ts`) | MEDIUM | Dual-store pattern | Map fallback in multi-process deployment allows challenge replay |
| **Tampering** | Session data in Redis modifiable if attacker gains Redis access; session hijack escalates to any user role | CRITICAL | NextAuth session management | No session signing/encryption at Redis layer; raw session objects stored |
| **Tampering** | BullMQ job payloads stored in Redis; tampering with FHIR sync jobs corrupts clinical data in Medplum | HIGH | BullMQ queue (`apps/api/src/services/fhir-queue.ts`) | No job payload signing; compromised Redis = compromised FHIR sync |
| **Tampering** | Workspace LLM config cached in Redis (`workspace_llm_config:{workspaceId}:{provider}`, TTL 300s) | HIGH | Cache with TTL | Attacker modifying cache can redirect AI requests to malicious endpoint; 5-minute TTL limits window but impact is CRITICAL |
| **Repudiation** | Redis operations not logged to audit trail | MEDIUM | Application-level audit for business operations | Cache poisoning or session manipulation leaves no forensic trace |
| **Repudiation** | No Redis slow log or access log in production configuration | LOW | Default Redis logging | Cannot reconstruct what operations were performed during an incident |
| **Information Disclosure** | PHI may be cached in Redis (patient context for AI, session data with user roles) | HIGH | TTL-based expiry | No at-rest encryption for Redis data; if Redis is exposed or dumped, PHI is in plaintext |
| **Information Disclosure** | AI prompt cache (`lib/ai/prompt-cache.ts`) may store clinical context | HIGH | Cache layer for AI gateway | Cached prompts containing patient data persist in Redis for TTL duration |
| **Information Disclosure** | Redis `MONITOR` command if enabled allows real-time inspection of all commands including PHI | MEDIUM | Expected to be disabled in production | No explicit `rename-command MONITOR ""` configuration visible |
| **Denial of Service** | No Redis memory limit configuration visible; unbounded growth crashes server | HIGH | Expected infrastructure-level config | Application-level `maxmemory` and eviction policy not enforced in code |
| **Denial of Service** | BullMQ job backlog during edge sync outage creates Redis memory pressure | MEDIUM | Queue-based architecture | No dead letter queue or job TTL visible for stale FHIR sync jobs |
| **Elevation of Privilege** | Single Redis instance serves sessions, cache, and queues; compromise of queue data = session access | HIGH | Shared Redis instance | No database/keyspace separation between session store and cache/queue data |

### 6. CI/CD Pipeline

| STRIDE Category | Threat | Severity | Current Mitigation | Gap |
|---|---|---|---|---|
| **Spoofing** | GitHub Actions workflows use third-party actions (e.g., `actions/checkout@v4`, `dependency-check/Dependency-Check_Action@main`) | HIGH | Version-pinned `@v4` for official actions | `Dependency-Check_Action@main` references mutable `main` branch, not SHA-pinned; supply chain attack vector |
| **Spoofing** | DAST scan workflow (`dast-scan.yml`) may authenticate against production endpoints | MEDIUM | Separate workflow file | DAST credentials in GitHub Secrets could be exfiltrated via PR from fork |
| **Spoofing** | Container image signing workflow exists (`sign-and-verify-images.yml`) but signature verification at deploy time is unconfirmed | MEDIUM | Signing workflow exists | Signing without mandatory verification at pull/deploy is incomplete |
| **Tampering** | `pnpm-lock.yaml` not explicitly integrity-checked beyond `--frozen-lockfile` | MEDIUM | `--frozen-lockfile` in Dockerfiles and CI | Lock file itself could be tampered in a PR; no post-merge integrity verification |
| **Tampering** | Multiple deployment workflows (VPS, GCP staging, GCP production, generic deploy) increase configuration drift risk | HIGH | Separate workflows per environment | Inconsistent security configurations across 5 deploy targets; one misconfigured target = breach |
| **Tampering** | Base image `node:20-alpine` not pinned to SHA digest in any Dockerfile | HIGH | Multi-stage builds with non-root user | Unpinned tag means a compromised Docker Hub image or tag reassignment silently enters the build |
| **Repudiation** | No signed commits requirement on protected branches | MEDIUM | GitHub Actions audit log | Developer impersonation via git config manipulation; no cryptographic proof of commit authorship |
| **Repudiation** | Disaster recovery test workflow (`disaster-recovery-test.yml`) runs without audit trail of test outcomes | LOW | Workflow exists | Cannot prove DR was tested on a specific date for compliance audits |
| **Information Disclosure** | TruffleHog and Gitleaks scan for secrets but only on push/PR; historical secrets may persist in git history | HIGH | `security-enhanced.yml` with secret scanning | Secrets committed before scanning was enabled remain in git history; no evidence of `git filter-branch` or BFG cleanup |
| **Information Disclosure** | Coverage reports (`coverage-report.yml`) may expose code structure and test patterns to unauthorized viewers | LOW | GitHub Actions artifact storage | Coverage HTML uploaded as artifact; accessible to anyone with repo read access |
| **Denial of Service** | No workflow concurrency limits; parallel PRs trigger redundant builds consuming Actions minutes | LOW | No concurrency configuration visible | Resource exhaustion of CI minutes; not a security risk but operational cost |
| **Denial of Service** | Load testing workflow (`load-testing.yml`) could be weaponized if triggered against production | MEDIUM | Separate workflow | No environment gate preventing load test execution against production URL |
| **Elevation of Privilege** | Workflows with `contents: read` and `security-events: write` permissions (`security-enhanced.yml` line 13-14) | MEDIUM | Minimal permissions declared | A compromised workflow with `security-events: write` could dismiss security alerts |
| **Elevation of Privilege** | Deploy workflows likely have production secrets (cloud credentials, database URLs) | CRITICAL | GitHub Secrets | Compromised CI runner with deploy secrets has production database access; no secret rotation policy visible |

### 7. Container Infrastructure

| STRIDE Category | Threat | Severity | Current Mitigation | Gap |
|---|---|---|---|---|
| **Spoofing** | Container images not verified at pull time; no admission controller enforces signed images | HIGH | Image signing workflow exists | Without admission controller (e.g., Cosign + Kyverno), unsigned/tampered images can be deployed |
| **Spoofing** | Nginx upstream trusts `Host` and `X-Forwarded-For` headers from any source | MEDIUM | Nginx proxy headers (`nginx.conf` lines 137-138) | No `set_real_ip_from` directive to restrict trusted proxy sources; IP spoofing via headers possible |
| **Tampering** | Package managers (`pnpm`, `turbo`) present in production runner stage (`Dockerfile.prod` line 7: `RUN npm install -g pnpm turbo`) | HIGH | Multi-stage build pattern | Attackers inside container can install arbitrary packages; production images should have NO package managers |
| **Tampering** | `COPY . .` in builder stage (`Dockerfile` line 63) copies entire repo including `.env`, `.git`, test fixtures | HIGH | `.dockerignore` expected but not verified | Without strict `.dockerignore`, secrets and git history end up in builder stage layer; extractable if builder image is pushed |
| **Tampering** | `corepack prepare pnpm@latest` in Dockerfile (`apps/api/Dockerfile` line 11) installs latest pnpm at build time | MEDIUM | Corepack management | `@latest` is mutable; compromised pnpm version silently enters build |
| **Repudiation** | Nginx access logs use default format without request body or response content | MEDIUM | `log_format main` configured (`nginx.conf` line 21-23) | Cannot reconstruct what data was accessed/modified in a breach; only request metadata logged |
| **Repudiation** | No container runtime audit logging (e.g., Falco, Sysdig) | MEDIUM | None visible | Cannot detect or investigate container escape, file system modification, or process execution anomalies |
| **Information Disclosure** | Nginx CSP allows `'unsafe-inline' 'unsafe-eval'` for scripts (`nginx.conf` line 114) | HIGH | CSP header present | `unsafe-inline` + `unsafe-eval` effectively defeats XSS protection from CSP; attacker-injected scripts execute freely |
| **Information Disclosure** | Nginx exposes server version by default (no `server_tokens off` directive) | LOW | Helmet on backend | Server version leaks aid version-specific exploit targeting |
| **Information Disclosure** | OCSP resolver points to `8.8.8.8` and `8.8.4.4` (`nginx.conf` line 103) | LOW | Google DNS for OCSP | DNS queries to external resolver can leak certificate status check patterns; use internal DNS in production |
| **Denial of Service** | Nginx `client_max_body_size 10M` (`nginx.conf` line 33) but Fastify accepts 100MB multipart | MEDIUM | Nginx caps at 10MB | Inconsistent limits: direct Fastify access allows 10x larger uploads than nginx-proxied requests |
| **Denial of Service** | `worker_connections 2048` with `keepalive_timeout 65` enables slowloris-style attacks | MEDIUM | `tcp_nodelay on`, `sendfile on` | No `limit_conn` directive; slow connections hold workers indefinitely |
| **Elevation of Privilege** | Non-root user `nextjs:1001` but no `readOnlyRootFilesystem` or dropped capabilities | HIGH | Non-root user in Dockerfile (`USER nextjs`) | Container escape to host via writable filesystem; no `--cap-drop ALL` or seccomp profile |
| **Elevation of Privilege** | No network policy visible; containers can communicate freely within Docker network | HIGH | Docker default bridge networking | Compromised web container can directly access PostgreSQL, Redis, PgBouncer without going through proxy |

## Data Classification

| Field | Model | Classification | Encryption | Notes |
|---|---|---|---|---|
| firstName/lastName | Patient | PHI | AES + key versioning | Covered by `encryption-extension.ts` |
| dateOfBirth | Patient | PHI | **NONE** (DateTime) | Gap: HIPAA Safe Harbor identifier; cannot be stored as ciphertext string per current architecture |
| email | Patient/User/PatientUser | CONFIDENTIAL | AES + key versioning | Encrypted at application layer |
| phone | Patient/PatientUser | PHI | AES + key versioning | Contact information classified as PHI when linked to patient |
| address | Patient | PHI | AES + key versioning | HIPAA identifier at geographic subdivision level |
| cpf | Patient | CONFIDENTIAL | AES + key versioning | Brazilian SSN equivalent; LGPD special category |
| cns | Patient | CONFIDENTIAL | AES + key versioning | Brazilian national health card number |
| rg | Patient | CONFIDENTIAL | AES + key versioning | Brazilian identity card number |
| mrn/externalMrn | Patient | PHI | **NONE** (unique index) | Gap: HIPAA identifier stored in plaintext; needs deterministic encryption or HMAC index |
| passwordHash | User | INTERNAL | Argon2id | Stored as one-way hash; acceptable |
| signingPinHash | User | INTERNAL | bcrypt | Prescription signing PIN; 4-6 digits is weak entropy |
| mfaPhoneNumber | User | CONFIDENTIAL | Noted in PHI config | Encrypted via extension |
| mfaBackupCodes | User | CONFIDENTIAL | **UNCLEAR** | Stored as `String[]`; array type may bypass Prisma extension encryption |
| walletAddress | User | INTERNAL | **NONE** | Web3 address; low sensitivity but links to identity |
| licenseNumber | User | INTERNAL | AES via extension | Medical license number; PII |
| npi | User | INTERNAL | AES via extension | National Provider Identifier |
| dnrStatus | Patient | PHI | **NONE** (Boolean) | Gap: Do Not Resuscitate status is critical clinical PHI; Boolean type prevents string encryption |
| dniStatus | Patient | PHI | **NONE** (Boolean) | Gap: Do Not Intubate status; same limitation as dnrStatus |
| advanceDirectivesNotes | Patient | PHI | **NONE** (@db.Text) | Gap: End-of-life wishes stored as unencrypted text; CRITICAL omission |
| advanceDirectivesStatus | Patient | PHI | **NONE** (Enum) | Gap: Enum type; reveals whether patient has advance directives |
| subjective/objective/assessment/plan | SOAPNote, ClinicalNote | PHI | AES + key versioning | Clinical encounter documentation; properly encrypted |
| rawText | Transcription | PHI | AES + key versioning | Full audio transcript; properly encrypted |
| chiefComplaint | ClinicalEncounter | PHI | AES + key versioning | Properly encrypted |
| medications/allergies/diagnoses | PatientCache (Edge) | PHI | **NONE** (SQLite) | Gap: Cached in plaintext in SQLite on edge device |
| patientHash | Edge models | PSEUDONYMIZED | SHA hash | Hash-based pseudonymization; reversible if hash function and inputs are known |

## AI-Era Specific Threats

### CVE-2026-4747 Implications

CVE-2026-4747 demonstrated an AI agent exploiting a FreeBSD kernel RCE in 4 hours for under $100. This has direct implications for each component:

**Automated API Fuzzing (Fastify + Next.js):** An AI agent can systematically probe all 400+ API routes, testing for auth bypass, injection, and business logic flaws. With rate limiting disabled on Fastify and only nginx-level limits on Next.js, an AI agent can complete a full API map in minutes. The adaptive IP tracker (`apps/api/src/index.ts` lines 58-96) detects 5+ distinct endpoints in 10s, but an AI agent can trivially throttle to 4 endpoints per 10s window and remain undetected.

**Edge Sidecar Exploitation:** The completely unauthenticated edge sidecar is the highest-risk target. An AI agent on the hospital LAN (via compromised IoT device, malware, or rogue wireless AP) can: (1) enumerate patient hashes via `/api/patient/:patientHash`, (2) extract clinical data (medications, allergies, diagnoses) from each cache entry, (3) poison RLHF training data via `/sidecar/decision` with fabricated overrides, and (4) manipulate clinical decision rules via traffic light evaluation injection. Total time to full compromise: estimated under 30 minutes with no authentication barriers.

**Supply Chain Attacks:** AI agents can identify dependency vulnerabilities faster than patch cycles. The unpinned `node:20-alpine` base images and `pnpm@latest` in Dockerfiles create a window where a compromised upstream package enters the build before any scan detects it. The `Dependency-Check_Action@main` reference (mutable branch) is itself a supply chain risk.

**Clinical Data Exfiltration:** An AI agent with database access (via SQL injection, leaked `DATABASE_URL`, or compromised Redis sessions) can selectively exfiltrate high-value records. The `dateOfBirth`, `mrn`, `dnrStatus`, and `advanceDirectivesNotes` fields in plaintext reduce the effort required -- no decryption needed for these fields.

**RLHF Training Poisoning:** The edge sidecar's `/sidecar/decision` and `/api/feedback` endpoints accept unauthenticated clinical feedback. An AI agent can submit thousands of fabricated "physician override" decisions with plausible justifications, systematically biasing the RLHF training pipeline. This is a novel attack vector specific to AI-augmented clinical platforms: poisoned training data degrades clinical decision quality over time, potentially causing patient harm months after the initial compromise.

## Residual Risks

Even with all identified gaps addressed, the following risks remain:

- **Insider threat with DBA access:** A privileged database administrator can bypass all application-level controls (encryption, audit chain, RBAC). Mitigated by pgaudit + separation of duties, but not eliminable.
- **Third-party SaaS compromise:** Anthropic, Deepgram, Sentry, Twilio, and Resend process data outside Holi Labs' control boundary. 7/8 BAAs remain unsigned per project memory. A breach at any vendor exposes data.
- **Sentry PHI leakage:** Error reports sent to Sentry (US-hosted) may contain PHI in stack traces, request bodies, or context objects. Even with scrubbing, novel error paths may leak data.
- **Hospital LAN compromise:** The edge sidecar's threat model assumes a trusted LAN. Hospital networks are notoriously porous (medical IoT, guest WiFi, vendor VPN). A compromised LAN device has full access to the sidecar.
- **Key management single point of failure:** `ENCRYPTION_KEY` env var is the sole key for all field-level encryption. Loss of this key makes all encrypted PHI irrecoverable. Key versioning exists but key escrow/HSM integration is not evident.
- **DateTime/Boolean PHI fields:** `dateOfBirth`, `dnrStatus`, `dniStatus` cannot be encrypted with the current string-based encryption approach. Architectural changes (e.g., epoch-based obfuscation, bucketed dates) are needed.
- **Regulatory divergence:** Operating across HIPAA (US context in code), LGPD (Brazil), and ANVISA creates overlapping and sometimes conflicting requirements. A configuration that satisfies one regime may violate another.
- **AI model behavior drift:** Anthropic model updates may change clinical recommendation patterns without notice. No model version pinning or output validation against a clinical ground truth baseline is visible.

## Recommendations

Ordered by severity and implementation feasibility:

### P0 — Immediate (block deployment)

1. **Authenticate edge sidecar endpoints.** Add mTLS or shared-secret bearer token auth to ALL `/sidecar/*` and `/api/*` routes in `apps/edge/src/index.ts`. The sidecar is the single highest-risk component.
2. **Remove hardcoded `EDGE_SECRET` default.** Replace `'smoke-test-secret'` (`index.ts` line 638) with a mandatory env var that fails startup if missing.
3. **Enable Fastify rate limiting.** Uncomment and configure Redis-backed rate limiting (`apps/api/src/index.ts` lines 140-147) or remove the Fastify server from production exposure.
4. **Encrypt `advanceDirectivesNotes`.** This `@db.Text` field can be encrypted with the existing string-based approach in `encryption-extension.ts`. Add it to `PHI_FIELDS_CONFIG.Patient` array.
5. **Pin base images to SHA digest.** Replace `node:20-alpine` with `node:20-alpine@sha256:<digest>` in all Dockerfiles. Pin `pnpm@latest` to a specific version.

### P1 — High Priority (within 2 weeks)

6. **Add rate limiting to edge sidecar.** Use `express-rate-limit` with conservative limits (e.g., 60 evaluations/min per source IP).
7. **Implement deterministic encryption for `mrn`/`externalMrn`.** Use HMAC-SHA256 for indexed lookups while keeping the value encrypted. This preserves `@unique` constraint functionality.
8. **Encrypt SQLite at rest on edge devices.** Use SQLCipher or OS-level full-disk encryption. Document as a deployment requirement.
9. **Remove package managers from production container stages.** Delete `pnpm`, `turbo`, `npm` from runner stages in all Dockerfiles.
10. **Fix nginx CSP.** Remove `'unsafe-inline'` and `'unsafe-eval'` from `script-src` in `nginx.conf` line 114. Use nonce-based CSP for inline scripts.
11. **Separate Redis instances/databases** for sessions, cache, and queues. At minimum, use different Redis databases (`SELECT 1`, `SELECT 2`).
12. **Pin third-party GitHub Actions to SHA.** Replace `dependency-check/Dependency-Check_Action@main` and any other `@main`/`@master` references with commit SHA pins.

### P2 — Standard Priority (within 30 days)

13. **Add `pgaudit` extension** for database-level audit logging independent of application code.
14. **Implement database user separation.** Create read-only, read-write, and DDL users with Prisma connection switching per operation type.
15. **Add Sentry `beforeSend` hook** to scrub PHI fields from error reports in `sentry.server.config.ts` and `sentry.edge.config.ts`.
16. **Enforce `accessReason` on audit logs.** Make the field non-nullable or add application-level validation rejecting empty values.
17. **Configure row-level security (RLS)** for workspace isolation at the PostgreSQL level as defense-in-depth.
18. **Add `server_tokens off`** to nginx.conf and configure `readOnlyRootFilesystem` + `--cap-drop ALL` for container security contexts.
19. **Implement job payload signing** for BullMQ FHIR sync jobs to detect Redis tampering.
20. **Address `dateOfBirth` exposure.** Evaluate epoch-based storage with application-level DateTime conversion, or implement bucketed date ranges for query purposes with encrypted exact dates.

### P3 — Ongoing

21. **Execute BAA signing** for the 7 remaining vendors (DigitalOcean, Upstash, Anthropic, Deepgram, Sentry, Resend, Twilio).
22. **Implement container runtime monitoring** (Falco or Sysdig) for anomaly detection.
23. **Regular penetration testing** of edge sidecar in simulated hospital LAN environment.
24. **AI model output validation** against clinical ground truth dataset before accepting model version updates.
25. **Network policy enforcement** (Kubernetes NetworkPolicy or Docker network isolation) restricting container-to-container communication to required paths only.
