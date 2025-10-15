# 🚀 Deployment Guide

Comprehensive deployment guide for Holi Labs Healthcare Platform.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [GitHub Secrets Setup](#github-secrets-setup)
- [Environment Configuration](#environment-configuration)
- [Deployment Workflows](#deployment-workflows)
- [Database Migrations](#database-migrations)
- [Monitoring & Rollback](#monitoring--rollback)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

1. ✅ GitHub repository with appropriate branch structure
2. ✅ DigitalOcean account with App Platform access
3. ✅ PostgreSQL database (managed or self-hosted)
4. ✅ Supabase project for auth and storage
5. ✅ Domain name configured (optional for staging)
6. ✅ API keys for third-party services

### Branch Strategy

\`\`\`
main        → Production (https://holilabs.com)
staging     → Staging (https://staging.holilabs.com)
develop     → Development builds + Staging auto-deploy
feature/*   → Feature branches (PR checks only)
\`\`\`

---

## GitHub Secrets Setup

Navigate to **Settings → Secrets and variables → Actions** and add all required secrets.

See [.env.example](../.env.example) for complete list.

---

## Deployment Workflows

### Automatic Deployments

| Branch | Trigger | Environment | URL |
|--------|---------|-------------|-----|
| \`main\` | Push | Production | holilabs.com |
| \`develop\` | Push | Staging | staging.holilabs.com |
| \`feature/*\` | PR | None (checks only) | - |

### Deployment Steps (Automated)

1. ✅ Run linting and type checks
2. ✅ Execute test suite with PostgreSQL
3. ✅ Build application
4. ✅ Run security scans (Trivy, npm audit)
5. ✅ Deploy to DigitalOcean App Platform
6. ✅ Run database migrations
7. ✅ Create Sentry release
8. ✅ Send notifications

---

## Database Migrations

### Automatic Migrations (CI/CD)

Migrations run automatically during deployment via:
\`\`\`bash
pnpm --filter web prisma migrate deploy
\`\`\`

### Manual Migrations

\`\`\`bash
# Create new migration locally
pnpm --filter web prisma migrate dev --name add_cfdi_fields

# Deploy to production
DATABASE_URL="<production-url>" pnpm --filter web prisma migrate deploy
\`\`\`

---

## Monitoring & Rollback

### Health Checks

\`\`\`bash
# Check application health
curl https://holilabs.com/api/health
\`\`\`

### Rollback Procedure

1. Revert last commit on main
2. CI/CD will automatically deploy reverted version
3. Or use DigitalOcean UI → Deployments → Rollback

---

For detailed instructions, see full documentation.
