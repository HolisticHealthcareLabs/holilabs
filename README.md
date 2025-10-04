# VidaBanq Health AI Platform

Production-ready, HIPAA/GDPR/LGPD-compliant healthcare AI platform for Latin America.

## Features

- **Auto De-identification**: HIPAA Safe Harbor + GDPR-aligned suppression, pseudonymization, and generalization
- **AI Integration**: Safe clinical decision support with input sanitization and output scrubbing
- **Differential Privacy**: Identity-level ε/δ accounting for research exports
- **Multi-language**: Spanish (default), Portuguese, and English
- **Audit Trail**: Immutable hash-chained audit log
- **Data Residency**: Per-org pinning with Row-Level Security

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js >=20
- pnpm >=8

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start infrastructure
pnpm docker:up

# Run database migrations
pnpm db:migrate

# Seed demo data
pnpm db:seed

# Start development servers
pnpm dev
```

Visit:
- Web UI: http://localhost:3000
- API: http://localhost:3001
- MinIO Console: http://localhost:9001

### Production Deployment

```bash
# Build all apps
pnpm build

# Start with Docker Compose
cd infra/docker
docker-compose -f docker-compose.prod.yml up -d
```

## Architecture

```
/apps
  /web                     # Next.js 14 frontend
  /api                     # Fastify backend
/packages
  /ui                      # Shared UI components (shadcn/ui)
  /schemas                 # Zod schemas
  /deid                    # De-identification engine
  /dp                      # Differential privacy utilities
  /utils                   # Logging, crypto, safety, i18n, CDR
  /policy                  # OPA/Rego policies
/configs                   # Country policy packs (BR/MX/AR)
/infra                     # Docker, migrations
/COMPLIANCE                # DPIA, SRA, ROPA templates
/RUNBOOKS                  # Incident response, DR drills
```

## Compliance

- HIPAA Safe Harbor de-identification
- GDPR-aligned data processing
- LGPD-inspired country packs for Brazil, Mexico, Argentina
- Immutable audit trail
- Cryptographic export receipts
- Purpose-binding via OPA policies

## Security

- Row-Level Security (RLS) for multi-tenancy
- Argon2id password hashing
- Short-TTL JWT with refresh rotation
- MFA-ready
- CSP hardening
- Quarterly key rotation
- SBOM + SAST/DAST gates

## Testing

```bash
# Unit tests
pnpm test

# E2E tests (Playwright)
cd apps/web && pnpm test:e2e

# Performance tests (K6)
k6 run perf/k6-ingest.js
```

## Documentation

- [Security Policy](./SECURITY.md)
- [Compliance Templates](./COMPLIANCE/)
- [Runbooks](./RUNBOOKS/)
- [API Documentation](./apps/api/README.md)

## License

Proprietary - VidaBanq © 2025
