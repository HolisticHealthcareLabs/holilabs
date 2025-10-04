# Getting Started with VidaBanq Health AI Platform

Welcome! This guide will help you set up and run the VidaBanq Health AI Platform locally and deploy it to production.

## 📋 Prerequisites

- **Docker** 20.10+ and **Docker Compose** 2.0+
- **Node.js** 20+ and **pnpm** 8+
- **Git**
- 8GB RAM minimum (16GB recommended)

## 🚀 Quick Start (Local Development)

### 1. Clone and Install

```bash
cd vidabanq-health-ai
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env

# Edit .env and set at minimum:
# - DATABASE_URL
# - REDIS_URL
# - S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY
# - JWT_PRIVATE_KEY (generate with: openssl rand -base64 32)
# - SALT_ROTATION_KEY (generate with: openssl rand -hex 32)
```

### 3. Start Infrastructure

```bash
# Start Postgres, Redis, MinIO, OPA
cd infra/docker
docker-compose up -d

# Wait for health checks (30-60 seconds)
docker-compose ps
```

### 4. Initialize Database

```bash
# Run Prisma migrations
cd ../../apps/api
pnpm prisma migrate dev --name init

# Apply RLS policies and triggers
psql $DATABASE_URL < ../../infra/migrations/001_init_rls_and_audit.sql

# Seed demo data (optional)
cd ../..
pnpm db:seed
```

### 5. Start Development Servers

```bash
# Terminal 1: Start API (Fastify)
cd apps/api
pnpm dev
# API running on http://localhost:3001

# Terminal 2: Start Web (Next.js)
cd apps/web
pnpm dev
# Web running on http://localhost:3000
```

### 6. Access the Platform

Open http://localhost:3000 in your browser.

**Demo Credentials** (if seeded):
- Email: admin@demo.com
- Password: Demo1234!

---

## 🧪 Running Tests

```bash
# Unit tests
pnpm test

# E2E tests (Playwright)
cd apps/web
pnpm test:e2e

# Performance tests (K6)
k6 run perf/k6-ingest.js
```

---

## 🏥 Using the Platform

### Upload Patient Data

1. Navigate to **Dashboard → Subir Datos**
2. Drag & drop CSV, DICOM, or PDF files
3. System automatically de-identifies per HIPAA Safe Harbor
4. View de-ID summary (policy version, transformed counts, SHA-256)

### Search for Patients

1. Use global search bar: "Buscar paciente por dni, nombre..."
2. Enter pseudonymous token ID or generalized attributes
3. Click patient to view profile

### View Patient Profile

- **Datos Personales**: Pseudonymized demographics
- **Ficha Clínica**: Medical history, medications, alerts
- **Historial**: Timeline of clinical notes (Dentalink-style)
- **IA**: AI chat interface with model selection

### AI Clinical Support

1. Navigate to patient → **IA** tab
2. Select LLM model (GPT-4, Claude 3, Gemini Pro, Local)
3. Patient context auto-loaded
4. Ask clinical questions
5. **Acknowledge CDS disclaimer** (not diagnostic)
6. Review guardrail logs in Admin panel

### Research Exports (DP-Protected)

1. Navigate to **Dashboard → Administración → Exports**
2. Select dataset + subject ID
3. Request epsilon (default 1.0)
4. System checks:
   - Consent allows RESEARCH
   - Epsilon budget not exhausted
   - Cooldown period elapsed
5. Approve request → Download DP-noised data + receipt PDF

### Audit & Compliance

1. **Admin → Audit Events**: View immutable hash-chained log
2. **Admin → Consents**: Manage consent states
3. **Admin → Reports**:
   - DP Usage (ε consumed per org/subject)
   - Access Activity
   - Cost Estimates

---

## 🌍 Multi-Language Support

The platform supports Spanish (default), Portuguese, and English.

**Change Language:**
- UI: Click language selector in header
- API: Set `Accept-Language` header

**Add New Locale:**
1. Add translations in `apps/web/messages/{locale}.json`
2. Update `next.config.js` to include new locale
3. Restart Next.js server

---

## 🔐 Security Hardening

### Before Production:

1. **Generate Production Keys**
```bash
# JWT signing key (ES256)
openssl ecparam -genkey -name prime256v1 -noout -out jwt-private.pem
openssl ec -in jwt-private.pem -pubout -out jwt-public.pem

# Salt rotation key
openssl rand -hex 32 > salt-rotation.key
```

2. **Enable TLS**
- Configure Nginx/CloudFront with TLS 1.3
- Use Let's Encrypt for certificates

3. **Configure Secrets Management**
- Use AWS Secrets Manager / GCP Secret Manager
- Never commit secrets to git

4. **Enable MFA**
- Set `MFA_ENABLED=true` in .env
- Configure TOTP provider

5. **Deploy Honeytokens**
```bash
pnpm db:seed --honeytokens
```

6. **Configure SIEM Alerts**
- AWS GuardDuty / Datadog for anomaly detection
- Webhook alerts for:
  - Failed login attempts (>5/min)
  - Honeytoken access
  - DP budget exhaustion

7. **Backup & Disaster Recovery**
```bash
# Daily encrypted backups
./scripts/backup.sh

# Monthly restore drill
./scripts/restore-drill.sh
```

---

## 🐳 Production Deployment (Docker)

### Option 1: Docker Compose (Single Server)

```bash
cd infra/docker
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Kubernetes (Multi-Server)

```bash
# Coming soon: Helm charts
helm install vidabanq ./charts/vidabanq
```

### Option 3: Managed Cloud (AWS/GCP)

**AWS:**
- ECS Fargate (API + Web)
- RDS Postgres (with encryption)
- ElastiCache Redis
- S3 (with versioning + Object Lock)

**GCP:**
- Cloud Run (API + Web)
- Cloud SQL Postgres
- Memorystore Redis
- Cloud Storage (with retention policies)

See `infra/terraform/` for IaC templates.

---

## 📊 Monitoring

### Metrics to Track

- **Ingest latency** (p50/p95)
- **De-ID latency** (p95)
- **DICOM scrub latency** (p95)
- **Queue depth** (BullMQ)
- **DP denials** (budget exhausted)
- **Epsilon usage** (per org/subject)
- **Error rates** (4xx/5xx)

### Dashboards

Import Grafana dashboards from `monitoring/grafana/`.

### Alerts

Configure alerts for:
- API latency >2s (p95)
- Error rate >1%
- Epsilon usage >80%
- Disk usage >80%
- Failed backups

---

## 🆘 Troubleshooting

### API won't start
```bash
# Check logs
docker logs vidabanq-api

# Common issues:
# 1. Database not ready → Wait for healthcheck
# 2. Missing env vars → Check .env
# 3. Port conflict → Change API_PORT
```

### Database migration failed
```bash
# Reset database (CAUTION: destroys data)
pnpm prisma migrate reset

# Or manually:
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pnpm prisma migrate deploy
```

### De-identification not working
```bash
# Check policy version
curl http://localhost:3001/health

# Verify policy files in configs/
ls -la configs/policy-*.yaml

# Test de-ID library
cd packages/deid
pnpm test
```

### DP export denied
- Check epsilon budget: `/admin/reports/dp-usage`
- Verify consent state: `/admin/consent/{patient_token_id}`
- Check cooldown: Wait 60min after last export

---

## 📚 Next Steps

- [ ] Read [SECURITY.md](./SECURITY.md) for security best practices
- [ ] Review [COMPLIANCE/](./COMPLIANCE/) templates
- [ ] Configure country-specific policies in `configs/`
- [ ] Set up monitoring dashboards
- [ ] Schedule quarterly key rotation
- [ ] Conduct DPIA review
- [ ] Train clinical staff on CDS disclaimers

---

## 🤝 Support

- **Documentation:** https://docs.vidabanq.xyz
- **GitHub Issues:** https://github.com/vidabanq/health-ai/issues
- **Email:** support@vidabanq.xyz
- **Security:** security@vidabanq.xyz (PGP required)

---

**Built with ❤️ for Latin American healthcare providers.**
