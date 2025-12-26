# Holi Labs - Deployment Guide

Quick reference guide for deploying Holi Labs FHIR integration to production.

## Quick Links

- **Deployment Script**: [`deploy-production.sh`](./deploy-production.sh) - Automated deployment
- **Runbook**: [`DEPLOYMENT_RUNBOOK.md`](./DEPLOYMENT_RUNBOOK.md) - Detailed step-by-step guide
- **Smoke Tests**: [`../../demos/smoke-tests.sh`](../../demos/smoke-tests.sh) - Post-deployment validation
- **Demo**: [`../../demos/fhir-e2e-demo.sh`](../../demos/fhir-e2e-demo.sh) - Full demo workflow

---

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

```bash
# Full production deployment with all checks
cd infra/deploy
./deploy-production.sh
```

**Features**:
- Pre-flight checks
- Automatic database backup
- Build and push Docker images
- Run migrations
- Deploy application
- Health checks
- Smoke tests
- Automatic rollback on failure

**Duration**: 15-20 minutes

### Method 2: Quick Deployment (Staging/Testing)

```bash
# Dry run (no changes made)
./deploy-production.sh --dry-run

# Skip smoke tests (not recommended for production)
./deploy-production.sh --skip-tests
```

### Method 3: Manual Deployment

Follow the step-by-step guide in [`DEPLOYMENT_RUNBOOK.md`](./DEPLOYMENT_RUNBOOK.md).

---

## Deployment Targets

### Local Development

```bash
cd /path/to/holilabs
docker-compose up -d
```

**URL**: http://localhost:3000

### Staging

```bash
export ENVIRONMENT=staging
export API_BASE_URL=https://api-staging.holilabs.xyz
./deploy-production.sh
```

**URL**: https://api-staging.holilabs.xyz

### Production

```bash
export ENVIRONMENT=production
export API_BASE_URL=https://api.holilabs.xyz
./deploy-production.sh
```

**URL**: https://api.holilabs.xyz

---

## Rollback

### Automated Rollback

```bash
./deploy-production.sh --rollback
```

### Manual Rollback (Docker Compose)

```bash
# Stop current version
docker-compose -f docker-compose.prod.yml down

# Start previous version
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Rollback (Kubernetes)

```bash
kubectl rollout undo deployment/holi-api
kubectl rollout status deployment/holi-api
```

---

## Monitoring

### Grafana Dashboard

- **URL**: http://localhost:3001 (local) or https://grafana.holilabs.xyz (prod)
- **Credentials**: See `.env` file
- **Dashboard**: "Holi Labs - FHIR Integration Monitoring"

### Prometheus

- **URL**: http://localhost:9090 (local) or https://prometheus.holilabs.xyz (prod)
- **Metrics Endpoint**: http://localhost:3000/metrics

### Key Metrics to Watch

```bash
# Queue health
curl -s http://localhost:3000/metrics | grep "holi_queue_jobs"

# FHIR sync status
curl -s http://localhost:3000/metrics | grep "holi_fhir_sync"

# API health
curl http://localhost:3000/health | jq '.'
```

---

## Smoke Tests

### Quick Validation (< 30s)

```bash
cd demos
./smoke-tests.sh --quick
```

### Full Validation (2-3 min)

```bash
./smoke-tests.sh --env production
```

### Expected Output

```
Total Tests: 25
Passed: 25
Failed: 0
Pass Rate: 100%
```

---

## Troubleshooting

### API Not Responding

```bash
# Check if container is running
docker ps | grep holi-api

# Check logs
docker logs holi-api-prod --tail 100

# Restart container
docker restart holi-api-prod
```

### Database Connection Failure

```bash
# Check database is running
docker ps | grep postgres

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Restart database
docker restart holi-postgres-prod
```

### Queue Not Processing

```bash
# Check Redis is running
docker ps | grep redis

# Check queue stats
curl http://localhost:3000/admin/queue/stats | jq '.'

# Resume queue
curl -X POST http://localhost:3000/admin/queue/resume
```

### High Error Rate

```bash
# Check recent errors
docker logs holi-api-prod --since 10m | grep ERROR

# Check metrics
curl -s http://localhost:3000/metrics | grep "holi_http_request_errors_total"

# Review Grafana dashboard
open http://localhost:3001/d/fhir-monitoring
```

---

## Pre-Deployment Checklist

### Required Environment Variables

```bash
# Core
DATABASE_URL
REDIS_URL
JWT_SECRET

# Medplum
MEDPLUM_BASE_URL
MEDPLUM_CLIENT_ID
MEDPLUM_CLIENT_SECRET
MEDPLUM_ENABLED=true

# Feature Flags
ENABLE_FHIR_SYNC=true
ENABLE_AUDIT_MIRROR=true

# Monitoring (optional)
PAGERDUTY_SERVICE_KEY_CRITICAL
PAGERDUTY_SERVICE_KEY_HIPAA
SLACK_WEBHOOK_URL
```

### Pre-Flight Checks

```bash
# 1. Database backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz

# 2. Verify Medplum credentials
curl -X POST ${MEDPLUM_BASE_URL}/oauth2/token \
  -d "grant_type=client_credentials" \
  -d "client_id=${MEDPLUM_CLIENT_ID}" \
  -d "client_secret=${MEDPLUM_CLIENT_SECRET}"

# 3. Run tests locally
cd apps/api
pnpm test

# 4. Build test
docker build -t holilabs/api:test -f apps/api/Dockerfile .

# 5. Check monitoring
curl -f http://prometheus.holilabs.xyz/-/healthy
curl -f http://grafana.holilabs.xyz/api/health
```

---

## Post-Deployment Validation

### Immediate (0-15 min)

- [ ] Health checks passing
- [ ] Smoke tests passing
- [ ] Error rate < 1%
- [ ] P95 latency < 300ms
- [ ] No P1/P2 alerts

### First Hour

- [ ] FHIR sync working (test patient creation)
- [ ] Queue processing normally
- [ ] Audit events logging
- [ ] No sync drift

### First 24 Hours

- [ ] Reconciliation job completed successfully
- [ ] Audit mirror sync working
- [ ] Performance within SLA
- [ ] No unexpected errors

---

## Emergency Procedures

### Immediate Rollback

```bash
# If deployment fails critically
./deploy-production.sh --rollback
```

### Emergency Maintenance Mode

```bash
# Enable maintenance page
cp nginx/maintenance.html nginx/active.html
docker exec holi-nginx-prod nginx -s reload
```

### Contact On-Call

- **Slack**: `#incidents` channel
- **PagerDuty**: https://holilabs.pagerduty.com
- **Email**: engineering@holilabs.xyz

---

## Deployment Architecture

### Docker Compose (Default)

```
┌─────────────────────────────────────────────────────────────┐
│                     Production Stack                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Nginx     │  │  Holi API   │  │ Prometheus  │        │
│  │   (443)     │─→│   (3000)    │←─│   (9090)    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                           │                                 │
│         ┌─────────────────┴─────────────────┐              │
│         │                                   │              │
│  ┌─────────────┐                    ┌─────────────┐        │
│  │  PostgreSQL │                    │    Redis    │        │
│  │   (5432)    │                    │   (6379)    │        │
│  └─────────────┘                    └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Services**:
- **Nginx**: Reverse proxy and SSL termination
- **Holi API**: Main application server
- **PostgreSQL**: Primary database
- **Redis**: Queue and cache
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Alertmanager**: Alert routing

### Kubernetes (Alternative)

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐           ┌─────────────────────┐         │
│  │   Ingress   │           │   StatefulSet       │         │
│  │  (nginx)    │──────────→│   - PostgreSQL      │         │
│  └─────────────┘           │   - Redis           │         │
│         │                  └─────────────────────┘         │
│         ↓                                                   │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │   Service           │   │   Service           │         │
│  │   holi-api          │   │   prometheus        │         │
│  └─────────────────────┘   └─────────────────────┘         │
│         │                           │                      │
│         ↓                           ↓                      │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │   Deployment        │   │   Deployment        │         │
│  │   - replicas: 3     │   │   - grafana         │         │
│  │   - holi-api pods   │   │   - alertmanager    │         │
│  └─────────────────────┘   └─────────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Resources**:
- **Deployments**: holi-api (3 replicas), grafana, alertmanager
- **StatefulSets**: PostgreSQL, Redis
- **Services**: Load balancing and discovery
- **Ingress**: External access with SSL

---

## Performance Targets (SLA)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Uptime | >99.9% | <99.5% (P1) |
| P95 Latency | <300ms | >500ms (P2) |
| Error Rate | <0.1% | >1% (P2) |
| FHIR Sync Latency | <60s | >120s (P3) |
| Queue Failed Jobs | 0 | >10 (P2) |
| Database Connections | <80% | >90% (P2) |

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets in environment variables (not hardcoded)
- [ ] SSL certificates valid (>30 days)
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] Security headers configured (Helmet)
- [ ] Database credentials rotated (if applicable)

### Post-Deployment

- [ ] Verify HTTPS enforcement
- [ ] Test rate limiting
- [ ] Verify CORS configuration
- [ ] Check audit logging
- [ ] Review security headers

---

## Compliance (HIPAA)

### Required Checks

- [ ] **Audit Trail**: All PHI access logged
- [ ] **Encryption**: Data encrypted at rest and in transit
- [ ] **Access Control**: RBAC enforced
- [ ] **Consent**: Consent validation working
- [ ] **Backup**: Database backup exists and tested
- [ ] **Incident Response**: On-call engineer available

### Audit Verification

```bash
# Verify audit events are logging
curl http://localhost:3000/admin/audit/events | jq '.data | length'

# Verify audit mirror is working
curl http://localhost:3000/fhir/admin/audit-mirror/stats | jq '.'
```

---

## Documentation

- **Architecture**: [`docs/MEDPLUM_INTEGRATION.md`](../../docs/MEDPLUM_INTEGRATION.md)
- **Compliance**: [`docs/compliance/HIPAA_BAA_COMPLIANCE.md`](../../docs/compliance/HIPAA_BAA_COMPLIANCE.md)
- **Monitoring**: [`infra/monitoring/README.md`](../monitoring/README.md)
- **API Docs**: https://api.holilabs.xyz/docs

---

## Support

- **Slack**: `#engineering` or `#platform`
- **Email**: engineering@holilabs.xyz
- **PagerDuty**: https://holilabs.pagerduty.com
- **Status Page**: https://status.holilabs.xyz

---

## License

Copyright © 2024 Holi Labs. All rights reserved.
