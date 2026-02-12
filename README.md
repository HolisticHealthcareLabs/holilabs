# Cortex by Holi Labs

Clinical decision support platform for anticoagulation therapy management in Latin American healthcare.

## 30-Second Setup

```bash
docker compose -f docker-compose.dev.yml up -d
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
pnpm -C apps/web exec prisma migrate deploy
pnpm -C apps/web exec tsx ../../scripts/seed-master-data.ts
pnpm dev
```

## Architecture

```
holilabsv2/
├── apps/
│   ├── web/          # Next.js — main clinical UI + API routes
│   ├── api/          # Express — internal API services
│   ├── edge/         # Edge functions (Cloudflare Workers)
│   ├── sidecar/      # Sidecar agent service
│   ├── messages/     # Messaging service (WhatsApp, SMS)
│   └── mobile/       # React Native (Expo) mobile app
├── packages/
│   ├── schemas/      # Zod schemas (clinical, prescription, compliance)
│   ├── shared-types/ # TypeScript type definitions
│   ├── shared-kernel/# Domain primitives
│   ├── utils/        # Shared utilities
│   ├── deid/         # De-identification / PII stripping
│   ├── dp/           # Differential privacy
│   ├── policy/       # OPA policy engine bindings
│   └── document-parser/ # Sandboxed PDF/image parser (Python)
├── data/
│   ├── master/       # Validated master data (rules.json, tuss.json)
│   └── clinical/     # Source clinical rule files
├── scripts/          # Operational scripts (seed, reset, extract)
├── _archive/         # Pilot phase artifacts (frozen)
└── infra/            # Infrastructure configs (Docker, OPA)
```

## Prerequisites

- **Node.js** 20+
- **pnpm** 8+
- **Docker** and Docker Compose
- **PostgreSQL** 15 (via Docker or local)
- **Redis** 7 (via Docker or local)

## Development Setup

### 1. Start infrastructure

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts PostgreSQL (5432), Redis (6379), and MailHog (SMTP: 1025, UI: 8025).

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Default DATABASE_URL: `postgresql://holi:holi_dev_password@localhost:5432/holi_labs`

### 4. Run migrations

```bash
pnpm -C apps/web exec prisma migrate deploy
```

### 5. Seed master data

```bash
pnpm -C apps/web exec tsx ../../scripts/seed-master-data.ts
```

Seeds clinical rules (27), billing codes, ICD-10 codes, medication concepts, feature flags, and treatment protocols. Zero patients.

### 6. Start dev server

```bash
pnpm dev
```

## Key Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| **Seed Master Data** | `cd apps/web && pnpm exec tsx ../../scripts/seed-master-data.ts` | Seed clinical intelligence (rules, codes, flags) |
| **Extract Master Data** | `cd apps/web && pnpm exec tsx ../../scripts/extract-master-data.ts` | Consolidate rule sources + PII scan |
| **Nuclear Reset** | `cd apps/web && pnpm exec tsx ../../scripts/nuclear-reset.ts --force-nuclear` | Drop everything, re-migrate, re-seed |
| **SQL Reset (legacy)** | `psql $DATABASE_URL -f scripts/reset_db_for_prod.sql` | SQL-only data purge (fallback) |

## Air Gap Rules

1. **No raw PII in logs.** Patient identifiers are SHA-256 hashed before logging.
2. **NODE_ENV checks everywhere.** Production-destructive operations abort immediately.
3. **DATABASE_URL hostname gating.** Cloud provider hostnames are rejected by reset scripts.
4. **Human-only git commits.** Agents draft commit messages; humans execute `git commit` and `git push`.
5. **PII scan on master data.** `extract-master-data.ts` scans for patient name patterns, MRNs, emails, phone numbers, SSNs before writing output files.
6. **Synthetic data only in dev.** All pilot patient data was synthetic. See `_archive/DATA_DESTRUCTION_CERTIFICATE.md`.

## Project Status

**Phase 2: Production Hardening**

Pilot simulation complete (`v1.0.0-SIMULATION-COMPLETE`). Currently hardening for first production deployment in Bolivia.

## Team

| Agent | Role | Domain |
|-------|------|--------|
| **Archie** | CTO | Architecture, infrastructure, engineering |
| **Elena** | CMO | Clinical rules, safety engine, medical governance |
| **Ruth** | VP Legal | LGPD/HIPAA compliance, consent, audit trail |
| **Victor** | VP Finance | Billing codes, revenue, insurance integration |
| **Paul** | VP Design | UX, patient experience, clinician workflows |

## License

Proprietary. Not open-source.
