# Developer Setup Guide
**Version:** 1.0
**Last Updated:** 2026-01-03
**Owner:** Engineering Team
**Classification:** Internal - Technical

---

## Overview

This guide provides step-by-step instructions for setting up the Holi Labs development environment. As a healthcare platform handling Protected Health Information (PHI), all developers must follow security best practices even in local development.

**⚠️ CRITICAL**: All developers must complete HIPAA training before accessing production systems. See `/docs/WORKFORCE_TRAINING_PLAN.md`.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Docker Infrastructure](#docker-infrastructure)
6. [Development Server](#development-server)
7. [Testing](#testing)
8. [Git Workflow](#git-workflow)
9. [Security Requirements](#security-requirements)
10. [IDE Configuration](#ide-configuration)
11. [Troubleshooting](#troubleshooting)
12. [HIPAA Compliance for Developers](#hipaa-compliance-for-developers)

---

## Prerequisites

### Required Software

**Node.js Environment:**
- **Node.js** 20+ (LTS recommended)
- **pnpm** 8+ (package manager)
- **TypeScript** 5+ (installed via pnpm)

**Databases:**
- **Docker Desktop** 4.24+ (for containerized services)
- **PostgreSQL** 15+ (via Docker or local install)
- **Redis** 7+ (via Docker)

**Development Tools:**
- **Git** 2.40+
- **Visual Studio Code** (recommended IDE) or IntelliJ IDEA
- **Postman** or **Insomnia** (API testing)

**Optional Tools:**
- **pgAdmin** or **TablePlus** (database GUI)
- **Redis Commander** (Redis GUI)
- **Docker Compose** (included in Docker Desktop)

### Required Accounts (Free Tier)

**Phase 1 - Required for Development:**
- [Anthropic API Key](https://console.anthropic.com/) (Claude AI)
- [Deepgram API Key](https://console.deepgram.com/) (Speech-to-Text)
- GitHub account (for repository access)

**Phase 2 - Required for Production Features:**
- [Resend API Key](https://resend.com/) (Email service)
- [Twilio Account](https://www.twilio.com/) (SMS/WhatsApp)
- [Upstash Redis](https://upstash.com/) (Serverless Redis for rate limiting)

**Phase 3 - Optional/Advanced:**
- [Medplum Account](https://www.medplum.com/) (FHIR server)
- [Alchemy API Key](https://www.alchemy.com/) (Ethereum RPC - if using Web3 features)

### System Requirements

**Minimum:**
- 8 GB RAM
- 50 GB free disk space
- macOS 12+, Ubuntu 20.04+, or Windows 10+ with WSL2

**Recommended:**
- 16 GB RAM
- 100 GB free disk space
- SSD storage

---

## Initial Setup

### 1. Clone Repository

```bash
# Clone via SSH (recommended)
git clone git@github.com:holi-labs/holilabsv2.git
cd holilabsv2

# Clone via HTTPS (alternative)
git clone https://github.com/holi-labs/holilabsv2.git
cd holilabsv2
```

### 2. Install Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm@latest

# Verify pnpm installation
pnpm --version  # Should output 8.x or higher

# Install project dependencies (monorepo)
pnpm install

# This will install all dependencies for:
# - Root workspace
# - apps/web (Next.js application)
# - packages/deid (De-identification library)
# - packages/dp (Differential privacy library)
# - packages/utils (Shared utilities)
```

**Expected Output:**
```
 WARN  Issues with peer dependencies found
.
├─┬ apps/web
│ └── ... (dependencies installing)
└─┬ packages/deid
  └── ... (dependencies installing)

Done in 45.2s
```

**Troubleshooting Dependencies:**
```bash
# If installation fails, clear cache and retry
pnpm store prune
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### 3. Verify Installation

```bash
# Check Node.js version
node --version  # Should be v20.x or higher

# Check pnpm workspace
pnpm list --depth=0

# Expected output:
# holilabsv2 workspace:*
# ├── @holi/web (apps/web)
# ├── @holi/deid (packages/deid)
# ├── @holi/dp (packages/dp)
# └── @holi/utils (packages/utils)
```

---

## Environment Configuration

### 1. Create Environment File

```bash
# Copy example environment file
cp .env.example .env

# ⚠️ NEVER commit .env to git (already in .gitignore)
```

### 2. Configure Required Variables

**Minimum Configuration for Local Development:**

```bash
# Edit .env file with your preferred editor
code .env  # VS Code
vim .env   # Vim
nano .env  # Nano
```

**Required Variables (Must Configure):**

```bash
# Database - Use default for local development
DATABASE_URL="postgresql://holi:holi_dev_password@localhost:5432/holi_protocol?schema=public"

# Redis - Use default for local development
REDIS_URL="redis://localhost:6379"

# Authentication - Generate new secrets!
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # Generate unique secret
JWT_SECRET="$(openssl rand -base64 32)"       # Generate unique secret

# AI Services - Add your API keys
ANTHROPIC_API_KEY="sk-ant-your-key-here"    # Get from console.anthropic.com
DEEPGRAM_API_KEY="your-deepgram-key-here"   # Get from console.deepgram.com

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
LOG_LEVEL="debug"
```

### 3. Generate Secure Secrets

**⚠️ SECURITY REQUIREMENT**: Never use example secrets in any environment.

```bash
# Generate NEXTAUTH_SECRET
echo "NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env

# Generate JWT_SECRET
echo "JWT_SECRET=\"$(openssl rand -base64 32)\"" >> .env

# Generate CRON_SECRET (for scheduled jobs)
echo "CRON_SECRET=\"$(openssl rand -hex 32)\"" >> .env
```

### 4. Optional Configuration

**Email Service (Required for production features):**
```bash
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_xxxxxxxxxxxxx"
FROM_EMAIL="noreply@holilabs.com"
FROM_NAME="Holi Labs"
```

**Twilio (SMS/WhatsApp notifications):**
```bash
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

**Feature Flags:**
```bash
ENABLE_BLOCKCHAIN="false"  # Web3 features (optional)
ENABLE_IPFS="false"        # IPFS storage (optional)
ENABLE_MEDPLUM="false"     # FHIR integration (optional)
```

---

## Database Setup

### 1. Start PostgreSQL via Docker

```bash
# Start Docker services (PostgreSQL, Redis, MinIO)
cd infra/docker
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# NAME            IMAGE                STATUS
# holi-postgres   postgres:15-alpine   Up (healthy)
# holi-redis      redis:7-alpine       Up (healthy)
# holi-minio      minio/minio          Up (healthy)
```

**Alternative: Local PostgreSQL**

If you prefer running PostgreSQL locally (not via Docker):

```bash
# macOS (via Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt install postgresql-15
sudo systemctl start postgresql

# Create database
psql postgres -c "CREATE DATABASE holi_protocol;"
psql postgres -c "CREATE USER holi WITH PASSWORD 'holi_dev_password';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE holi_protocol TO holi;"
```

### 2. Run Database Migrations

```bash
# Navigate to web app
cd apps/web

# Generate Prisma Client (TypeScript types)
pnpm db:generate

# Run migrations (create tables)
pnpm db:migrate

# Expected output:
# Applying migration `20250101000000_initial_schema`
# Applying migration `20250102000000_add_audit_logs`
# ... (more migrations)
# ✔ Generated Prisma Client to ./node_modules/@prisma/client
```

### 3. Seed Database (Optional)

```bash
# Seed with sample data (patients, appointments)
pnpm db:seed

# ⚠️ WARNING: Seed data is for DEVELOPMENT ONLY
# Never run seed script in production
```

### 4. Verify Database

```bash
# Open Prisma Studio (database GUI)
pnpm db:studio

# Opens at http://localhost:5555
# Browse tables: User, Patient, Appointment, Prescription, etc.
```

**Alternative: Connect via psql**

```bash
# Connect to database
psql postgresql://holi:holi_dev_password@localhost:5432/holi_protocol

# List tables
\dt

# Expected output:
# Schema | Name                | Type  | Owner
# -------+---------------------+-------+------
# public | User                | table | holi
# public | Patient             | table | holi
# public | Appointment         | table | holi
# public | AuditLog            | table | holi
# ... (more tables)

# Exit psql
\q
```

---

## Docker Infrastructure

### Services Overview

**holi-postgres** (PostgreSQL 15)
- Port: `5432`
- Health check: Every 10s
- Persistent volume: `./data/postgres`

**holi-redis** (Redis 7)
- Port: `6379`
- Health check: Every 10s
- Used for: Sessions, rate limiting, caching

**holi-minio** (MinIO S3)
- Port: `9000` (API), `9001` (Console)
- Health check: Every 30s
- Persistent volume: `./data/minio`
- Used for: Document storage, backups

### Docker Commands

```bash
# Start all services
cd infra/docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose stop

# Restart specific service
docker-compose restart holi-postgres

# Remove all services and data (⚠️ DESTRUCTIVE)
docker-compose down -v
```

### Health Checks

```bash
# Check PostgreSQL
docker exec -it holi-postgres pg_isready -U holi

# Check Redis
docker exec -it holi-redis redis-cli ping

# Check MinIO
curl http://localhost:9000/minio/health/live
```

---

## Development Server

### 1. Start Development Server

```bash
# From project root
pnpm dev

# Or navigate to specific app
cd apps/web
pnpm dev
```

**Expected Output:**
```
> @holi/web@0.1.0 dev /Users/you/holilabsv2/apps/web
> next dev

  ▲ Next.js 14.0.4
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.100:3000

 ✓ Ready in 3.2s
```

### 2. Access Application

**Main Application:**
- URL: http://localhost:3000
- Initial page: Login page (requires authentication)

**Landing Page (Static):**
- URL: http://localhost:3000/landing.html
- Public page, no authentication required

**Prisma Studio:**
- URL: http://localhost:5555
- Run: `pnpm db:studio`

**MinIO Console:**
- URL: http://localhost:9001
- Credentials: `holi` / `holi_dev_password`

### 3. Create Test User

**Option A: Via Prisma Studio**
1. Open Prisma Studio: `pnpm db:studio`
2. Navigate to `User` table
3. Click "Add record"
4. Fill in required fields:
   - `email`: your-email@example.com
   - `name`: Your Name
   - `role`: PHYSICIAN
   - `emailVerified`: (current timestamp)
5. Save

**Option B: Via Database Seed**
```bash
# Seed includes test users
pnpm db:seed

# Default test user:
# Email: test@holilabs.com
# Password: (OAuth only in production)
```

### 4. Hot Reload

Next.js automatically reloads when you save files:

```bash
# Edit any file in apps/web/src/
# Browser will auto-refresh

# Example: Edit landing page
code apps/web/public/landing.html
# Save and refresh browser
```

---

## Testing

### 1. Unit Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Target: >70% coverage (>90% for security layer)
```

### 2. Integration Tests

```bash
# Run integration tests (requires database)
pnpm test:integration

# Run specific test file
pnpm test apps/web/src/lib/security/__tests__/audit.test.ts
```

### 3. E2E Tests (End-to-End)

```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install

# Run E2E tests
pnpm test:e2e

# Run E2E tests in UI mode (interactive)
pnpm exec playwright test --ui
```

### 4. Type Checking

```bash
# Run TypeScript type checker
pnpm type-check

# Expected output: "✓ No type errors found"
```

### 5. Linting

```bash
# Run ESLint
pnpm lint

# Auto-fix linting issues
pnpm lint:fix
```

---

## Git Workflow

### Branch Strategy

**Main Branches:**
- `main` - Production-ready code (protected)
- `develop` - Integration branch (protected)

**Feature Branches:**
- `feature/short-description` - New features
- `fix/short-description` - Bug fixes
- `docs/short-description` - Documentation updates
- `refactor/short-description` - Code refactoring

### Workflow

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/add-patient-portal

# 2. Make changes and commit frequently
git add .
git commit -m "feat: add patient portal UI"

# 3. Push to remote
git push origin feature/add-patient-portal

# 4. Create Pull Request on GitHub
# - Base: develop
# - Compare: feature/add-patient-portal
# - Reviewers: 2+ engineers

# 5. After approval, merge via GitHub UI
# - Squash and merge (preferred)
# - Delete branch after merge
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>(<scope>): <description>

# Examples
feat(auth): add MFA support
fix(patients): resolve search pagination bug
docs(readme): update setup instructions
refactor(db): optimize query performance
test(api): add rate limiting tests
chore(deps): upgrade Next.js to 14.0.4
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

### Pre-Commit Hooks

**Install Pre-Commit Hook:**

```bash
# Install hook (one-time setup)
./scripts/install-pre-commit-hook.sh

# Hook runs automatically on git commit
```

**What the Hook Checks:**
1. ✅ Runs linter (ESLint)
2. ✅ Runs type checker (TypeScript)
3. ✅ Runs unit tests
4. ✅ Checks for secrets in code (GitLeaks)
5. ✅ Validates commit message format

**Bypass Hook (Emergency Only):**
```bash
# ⚠️ Use sparingly
git commit --no-verify -m "emergency fix"
```

---

## Security Requirements

### 1. Secret Management

**✅ DO:**
- Store secrets in `.env` (never commit)
- Use strong, random secrets (32+ characters)
- Rotate secrets quarterly
- Use environment-specific secrets

**❌ DON'T:**
- Hardcode secrets in code
- Share secrets via Slack/email
- Reuse secrets across environments
- Use example/default secrets

**Secret Storage:**
```bash
# Development secrets: .env (local)
# Staging secrets: GitHub Secrets
# Production secrets: DigitalOcean App Platform (encrypted)
```

### 2. PHI Handling in Development

**⚠️ CRITICAL RULE**: Never use real patient data in development.

**Allowed:**
- ✅ Synthetic data (generated via seed script)
- ✅ Faker.js generated data
- ✅ Test fixtures with fake PHI

**Forbidden:**
- ❌ Real patient names, MRNs, DOBs
- ❌ Production database dumps
- ❌ Screenshots with real PHI

**If You Accidentally Expose PHI:**
1. Immediately notify Security Team (security@holilabs.com)
2. Remove from code/commits
3. Rotate affected credentials
4. Document in incident log

### 3. Code Security Checklist

**Before Committing:**
- [ ] No hardcoded secrets (API keys, passwords)
- [ ] No console.log with PHI
- [ ] No commented-out code with sensitive data
- [ ] Input validation for all user inputs
- [ ] SQL injection prevention (use Prisma ORM)
- [ ] XSS prevention (React auto-escapes)
- [ ] CSRF tokens for state-changing operations

**Security Patterns to Use:**
```typescript
// ✅ GOOD: Parameterized query (Prisma)
const patients = await prisma.patient.findMany({
  where: { id: userId },
});

// ❌ BAD: String interpolation (SQL injection risk)
const patients = await prisma.$queryRaw`SELECT * FROM patients WHERE id = ${userId}`;

// ✅ GOOD: Use logger (scrubbed)
logger.info({ userId: user.id }, 'User logged in');

// ❌ BAD: console.log with PHI
console.log('Patient:', patient.name, patient.ssn);
```

### 4. Dependency Security

```bash
# Audit dependencies for vulnerabilities
pnpm audit

# Fix vulnerabilities automatically
pnpm audit --fix

# Update dependencies
pnpm update
```

**Check for Known Vulnerabilities:**
```bash
# Install Snyk (optional)
npm install -g snyk
snyk auth
snyk test
```

---

## IDE Configuration

### Visual Studio Code (Recommended)

**Required Extensions:**
- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- Prisma (`Prisma.prisma`)
- TypeScript and JavaScript Language Features (built-in)

**Recommended Extensions:**
- GitLens (`eamodio.gitlens`)
- Docker (`ms-azuretools.vscode-docker`)
- REST Client (`humao.rest-client`)
- Error Lens (`usernamehw.errorlens`)

**Settings (`.vscode/settings.json`):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### IntelliJ IDEA / WebStorm

**Plugins:**
- Prisma Support
- ESLint
- Prettier
- Docker

**Settings:**
- Enable ESLint: `Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint`
- Enable Prettier: `Settings → Languages & Frameworks → JavaScript → Prettier`
- TypeScript version: Use workspace version (`node_modules/typescript`)

---

## Troubleshooting

### Issue: Port 3000 Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Fix:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 pnpm dev
```

### Issue: Database Connection Error

**Error:**
```
Error: Can't reach database server at `localhost:5432`
```

**Fix:**
```bash
# Check if PostgreSQL is running
docker ps | grep holi-postgres

# If not running, start Docker services
cd infra/docker
docker-compose up -d

# Check logs
docker-compose logs holi-postgres
```

### Issue: Prisma Client Not Generated

**Error:**
```
Error: Cannot find module '@prisma/client'
```

**Fix:**
```bash
# Generate Prisma Client
cd apps/web
pnpm db:generate

# If still failing, clean and regenerate
rm -rf node_modules/.prisma
pnpm db:generate
```

### Issue: Module Not Found After pnpm install

**Error:**
```
Error: Cannot find module 'next'
```

**Fix:**
```bash
# Clear pnpm cache
pnpm store prune

# Remove all node_modules
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# Reinstall
pnpm install
```

### Issue: TypeScript Errors After Pull

**Error:**
```
Type error: Property 'foo' does not exist on type 'Bar'
```

**Fix:**
```bash
# Rebuild TypeScript
pnpm build

# Or run type checker
pnpm type-check

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Issue: Docker Permission Denied (Linux)

**Error:**
```
permission denied while trying to connect to the Docker daemon socket
```

**Fix:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and log back in
# Or reload groups
newgrp docker
```

---

## HIPAA Compliance for Developers

### Training Requirements

**Before Writing Code:**
1. ✅ Complete HIPAA training (see `/docs/WORKFORCE_TRAINING_PLAN.md`)
2. ✅ Read PHI Handling Guidelines (see `/docs/PHI_HANDLING.md`)
3. ✅ Review Security Guidelines (see `/docs/SECURITY_GUIDELINES.md`)
4. ✅ Sign Confidentiality Agreement

### Development Rules

**Rule 1: Minimum Necessary Access**
- Only access PHI required for your task
- Don't browse patient records out of curiosity
- All access is logged in audit trail

**Rule 2: Secure Development Environment**
- Encrypt laptop/workstation (FileVault, BitLocker)
- Use strong password + MFA
- Lock screen when away (auto-lock after 5 minutes)
- Never work on PHI in public WiFi

**Rule 3: No PHI in Logs**
- Use structured logging (Pino logger)
- Logger automatically scrubs sensitive fields
- Never use console.log with PHI

**Rule 4: Test Data Only**
- Use synthetic data in development
- Run seed script for test patients
- Never copy production database

**Rule 5: Code Review Required**
- All PHI-touching code must be reviewed
- Security team reviews authentication changes
- Pull requests require 2+ approvals

### Audit Logging Requirements

**All PHI Access Must Be Logged:**

```typescript
// ✅ GOOD: Log PHI access
import { createAuditLog } from '@/lib/audit';

const patient = await prisma.patient.findUnique({
  where: { id: patientId },
});

await createAuditLog({
  action: 'READ',
  resource: 'Patient',
  resourceId: patientId,
  userId: user.id,
  metadata: { source: 'patient_portal' },
});

// ❌ BAD: No audit log
const patient = await prisma.patient.findUnique({
  where: { id: patientId },
});
// Missing audit log = HIPAA violation
```

### Incident Reporting

**If You Discover a Security Issue:**
1. 🚨 **Immediately** notify Security Team (security@holilabs.com)
2. Don't discuss publicly (Slack, email)
3. Create private security issue on GitHub
4. Follow Incident Response Plan (see `/docs/INCIDENT_RESPONSE_PLAN.md`)

**What Counts as a Security Issue:**
- Exposed secrets in code
- SQL injection vulnerability
- PHI visible in logs
- Authentication bypass
- Unencrypted PHI storage

---

## Additional Resources

**Documentation:**
- [Production Readiness Status](/docs/PRODUCTION_READINESS_STATUS.md)
- [HIPAA Compliance Checklist](/docs/HIPAA_COMPLIANCE_CHECKLIST.md)
- [Security Guidelines](/docs/SECURITY_GUIDELINES.md)
- [PHI Handling Guidelines](/docs/PHI_HANDLING.md)
- [Deployment Guide](/docs/DEPLOYMENT_CHECKLIST.md)
- [Operations Manual](/docs/OPS_MANUAL.md)
- [On-Call Guide](/docs/ON_CALL_GUIDE.md)

**External Resources:**
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Deepgram API Docs](https://developers.deepgram.com/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [HHS HIPAA Guidance](https://www.hhs.gov/hipaa/for-professionals/index.html)

---

## Getting Help

**Technical Issues:**
- GitHub Issues: https://github.com/holi-labs/holilabsv2/issues
- Team Slack: #engineering
- Email: dev@holilabs.com

**Security Issues:**
- Email: security@holilabs.com (monitored 24/7)
- PagerDuty: For P1 incidents only

**HIPAA Compliance Questions:**
- Email: compliance@holilabs.com
- Privacy Officer: privacy@holilabs.com

---

**Document Version:** 1.0
**Last Updated:** 2026-01-03
**Next Review:** 2026-04-03 (quarterly)
**Owner:** Engineering Team
**Classification:** Internal - Technical
