# Holi Labs - Monitoring Setup Guide

Production-grade observability stack for FHIR integration monitoring with Prometheus, Grafana, and PagerDuty.

## Table of Contents

1. [Quick Start (Local Development)](#quick-start-local-development)
2. [Architecture Overview](#architecture-overview)
3. [Metrics Reference](#metrics-reference)
4. [Alert Rules](#alert-rules)
5. [Production Deployment](#production-deployment)
6. [PagerDuty Integration](#pagerduty-integration)
7. [Runbook Links](#runbook-links)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start (Local Development)

### Prerequisites

- Docker and Docker Compose installed
- Holi API running locally (with Redis and PostgreSQL)
- Environment variables configured (see `.env.example`)

### Step 1: Start Monitoring Stack

```bash
cd infra/monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

This starts:
- **Prometheus** on `http://localhost:9090` (metrics collection)
- **Grafana** on `http://localhost:3001` (visualization)
- **Alertmanager** on `http://localhost:9093` (alert routing)
- **Node Exporter** on `http://localhost:9100` (system metrics)
- **Postgres Exporter** on `http://localhost:9187` (database metrics)
- **Redis Exporter** on `http://localhost:9121` (queue metrics)

### Step 2: Access Grafana Dashboard

1. Open `http://localhost:3001` in your browser
2. Login with default credentials: `admin` / `admin`
3. Navigate to **Dashboards** → **FHIR Monitoring** → **Holi Labs - FHIR Integration Monitoring**

The dashboard is automatically provisioned with all panels configured.

### Step 3: Verify Metrics Collection

1. Open Prometheus UI: `http://localhost:9090`
2. Go to **Status** → **Targets**
3. Verify all targets are **UP**:
   - `holi-api` (your API server)
   - `prometheus` (self-monitoring)
   - `node-exporter` (system metrics)
   - `postgres-exporter` (database metrics)
   - `redis-exporter` (queue metrics)

### Step 4: Test Alerts

Trigger a test alert:

```bash
# Simulate high queue backlog
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "HighQueueBacklog",
      "severity": "P2",
      "component": "fhir-sync"
    },
    "annotations": {
      "summary": "Test alert",
      "description": "This is a test alert"
    }
  }]'
```

Check Alertmanager UI: `http://localhost:9093`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     HOLI API SERVER                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /metrics Endpoint (Prometheus Format)              │  │
│  │  - HTTP request metrics                             │  │
│  │  - Queue health metrics                             │  │
│  │  - FHIR sync metrics                                │  │
│  │  - HIPAA audit metrics                              │  │
│  │  - Database metrics                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ▲                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP GET /metrics (15s interval)
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    PROMETHEUS                               │
│  - Scrapes metrics from API                                 │
│  - Stores time-series data (30 days retention)             │
│  - Evaluates alert rules every 15s                         │
│  - Sends alerts to Alertmanager                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
┌───────────▼────────────┐  ┌───────────▼────────────┐
│      GRAFANA           │  │    ALERTMANAGER        │
│  - Visualizes metrics  │  │  - Routes alerts       │
│  - Dashboards          │  │  - Groups alerts       │
│  - Queries Prometheus  │  │  - Deduplicates        │
└────────────────────────┘  │  - Sends to:           │
                            │    • PagerDuty         │
                            │    • Slack             │
                            │    • Email             │
                            └────────────────────────┘
```

---

## Metrics Reference

### HTTP Request Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `holi_http_requests_total` | Counter | `method`, `route`, `status_code` | Total HTTP requests |
| `holi_http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Request duration |
| `holi_http_request_errors_total` | Counter | `method`, `route`, `error_type` | Total request errors |

### Queue Metrics (BullMQ)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `holi_queue_jobs_active` | Gauge | `queue_name` | Active jobs count |
| `holi_queue_jobs_waiting` | Gauge | `queue_name` | Waiting jobs count |
| `holi_queue_jobs_failed` | Gauge | `queue_name` | Failed jobs count |
| `holi_queue_jobs_completed_total` | Counter | `queue_name` | Completed jobs total |
| `holi_queue_job_duration_seconds` | Histogram | `queue_name`, `job_type` | Job processing duration |
| `holi_queue_job_errors_total` | Counter | `queue_name`, `job_type`, `error_type` | Job errors total |

### FHIR Sync Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `holi_fhir_sync_operations_total` | Counter | `resource_type`, `operation`, `status` | FHIR sync operations |
| `holi_fhir_sync_duration_seconds` | Histogram | `resource_type`, `operation` | Sync operation duration |
| `holi_fhir_sync_errors_total` | Counter | `resource_type`, `error_type` | Sync errors |
| `holi_fhir_sync_not_synced` | Gauge | `resource_type` | Resources never synced |
| `holi_fhir_sync_stale` | Gauge | `resource_type` | Resources with stale sync (>1h) |

### HIPAA Audit Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `holi_hipaa_audit_events_total` | Counter | `event_type`, `org_id` | HIPAA audit events |
| `holi_hipaa_phi_access_total` | Counter | `user_role`, `access_type`, `org_id` | PHI access events |
| `holi_hipaa_consent_validations_total` | Counter | `status`, `org_id` | Consent validations |

### Database Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `holi_database_connections_active` | Gauge | - | Active DB connections |
| `holi_database_query_duration_seconds` | Histogram | `model`, `operation` | Query duration |
| `holi_database_errors_total` | Counter | `model`, `error_type` | Database errors |

---

## Alert Rules

### Severity Levels

- **P1 (Critical)**: Immediate response required - system down, data breach, HIPAA incident
- **P2 (High)**: Response within 30 minutes - degraded performance, excessive errors
- **P3 (Medium)**: Response within 2 hours - warnings, non-critical issues
- **P4 (Low)**: Response within 24 hours - informational alerts

### Alert Summary

| Alert | Severity | Condition | For | Escalation |
|-------|----------|-----------|-----|------------|
| API Server Down | P1 | `up{job="holi-api"} == 0` | 2m | PagerDuty Critical + Slack + Email |
| Database Connection Failure | P1 | `holi_database_connections_active == 0` | 1m | PagerDuty Critical + Slack + Email |
| HIPAA Audit Log Failure | P1 | `rate(holi_database_errors_total{model="auditEvent"}[5m]) > 0.1` | 2m | PagerDuty HIPAA + Compliance Team |
| Excessive Queue Failures | P2 | `holi_queue_jobs_failed{queue_name="fhir-sync"} > 10` | 5m | PagerDuty High + Slack |
| High API Error Rate | P2 | `5xx errors > 5%` | 3m | PagerDuty High + Slack |
| Unsynced FHIR Resources | P3 | `not_synced > 100` | 10m | Slack + Email |
| Queue Processing Slow | P4 | `p95 duration > 10s` | 30m | Email only |

Full alert definitions: [`alerts/fhir-alerts.yml`](./alerts/fhir-alerts.yml)

---

## Production Deployment

### Prerequisites

1. **Prometheus Server**: Managed Prometheus instance or self-hosted
2. **Grafana Cloud**: Or self-hosted Grafana instance
3. **PagerDuty Account**: With integration keys configured
4. **Slack Workspace**: With incoming webhooks enabled
5. **Email Provider**: SendGrid, AWS SES, or SMTP server

### Step 1: Deploy Prometheus

#### Option A: Managed Prometheus (Grafana Cloud, AWS Managed Prometheus)

Update `prometheus.yml` with remote write configuration:

```yaml
remote_write:
  - url: 'https://prometheus-prod-01-us-central-0.grafana.net/api/prom/push'
    basic_auth:
      username: '${GRAFANA_CLOUD_PROMETHEUS_USER}'
      password: '${GRAFANA_CLOUD_PROMETHEUS_PASSWORD}'
```

#### Option B: Self-Hosted Prometheus (Kubernetes)

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus with custom values
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values prometheus-values.yaml
```

### Step 2: Configure Scrape Targets

Update `prometheus.yml` with production API endpoints:

```yaml
scrape_configs:
  - job_name: 'holi-api'
    metrics_path: '/metrics'
    scrape_interval: 15s
    static_configs:
      - targets:
          - 'api.holilabs.xyz:443'
    scheme: https
    tls_config:
      insecure_skip_verify: false
```

### Step 3: Deploy Alertmanager

```bash
# Kubernetes deployment
kubectl apply -f alertmanager-deployment.yaml

# Configure secrets
kubectl create secret generic alertmanager-config \
  --from-file=alertmanager.yml=alertmanager.yml \
  --namespace monitoring
```

### Step 4: Import Grafana Dashboard

1. Login to Grafana
2. Go to **Dashboards** → **Import**
3. Upload `grafana-dashboard.json`
4. Select Prometheus datasource
5. Click **Import**

### Step 5: Configure PagerDuty Integration

1. In PagerDuty, go to **Services** → **Service Directory**
2. Create services:
   - "Holi API - Critical Incidents"
   - "Holi API - HIPAA Compliance"
   - "Holi API - High Priority"
3. For each service, add **Prometheus** integration
4. Copy the integration keys
5. Set environment variables in Alertmanager:
   ```bash
   export PAGERDUTY_SERVICE_KEY_CRITICAL="your-key-here"
   export PAGERDUTY_SERVICE_KEY_HIPAA="your-key-here"
   export PAGERDUTY_SERVICE_KEY_HIGH="your-key-here"
   ```

### Step 6: Configure Slack Webhooks

1. In Slack, go to **Apps** → **Incoming Webhooks**
2. Create webhooks for channels:
   - `#alerts-critical`
   - `#compliance-alerts`
   - `#engineering-alerts`
   - `#fhir-integration`
   - `#database-alerts`
3. Set environment variable:
   ```bash
   export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
   ```

### Step 7: Verify Deployment

```bash
# Check Prometheus targets
curl -s http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Check Alertmanager status
curl -s http://alertmanager:9093/api/v1/status | jq .

# Test alert delivery
curl -X POST http://alertmanager:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{"labels": {"alertname": "TestAlert", "severity": "P4"}}]'
```

---

## PagerDuty Integration

### Escalation Policies

**HIPAA Critical Incidents**:
1. On-call Security Lead (immediate)
2. CISO (after 5 minutes)
3. CTO (after 10 minutes)

**Infrastructure Critical**:
1. On-call Platform Team (immediate)
2. Platform Lead (after 15 minutes)

**FHIR Integration Alerts**:
1. On-call Backend Team (immediate)
2. Backend Lead (after 30 minutes)

### On-Call Schedule

Configure in PagerDuty:
- **Rotation**: Weekly
- **Handoff**: Monday 9:00 AM (local time)
- **Override**: Allow on-call engineer to override

### Incident Response

When paged:

1. **Acknowledge** the alert within SLA (see severity table)
2. **Check Grafana dashboard** for context
3. **Follow runbook** (see runbook URL in alert)
4. **Update PagerDuty** with status notes
5. **Resolve** when fixed
6. **Post-mortem** for P1/P2 incidents (within 48 hours)

---

## Runbook Links

All alerts include runbook URLs. Create runbooks at:

- **API Server Down**: `https://docs.holilabs.xyz/runbooks/api-server-down`
- **Database Down**: `https://docs.holilabs.xyz/runbooks/database-down`
- **Redis Down**: `https://docs.holilabs.xyz/runbooks/redis-down`
- **Audit Failure**: `https://docs.holilabs.xyz/runbooks/audit-failure`
- **Security Incident**: `https://docs.holilabs.xyz/runbooks/security-incident`
- **Queue Failures**: `https://docs.holilabs.xyz/runbooks/queue-failures`
- **FHIR Sync Errors**: `https://docs.holilabs.xyz/runbooks/fhir-sync-errors`
- **API Errors**: `https://docs.holilabs.xyz/runbooks/api-errors`
- **Slow API**: `https://docs.holilabs.xyz/runbooks/slow-api`
- **Sync Drift**: `https://docs.holilabs.xyz/runbooks/sync-drift`

Each runbook should include:
1. **Symptoms**: What the alert indicates
2. **Impact**: Who/what is affected
3. **Diagnosis**: How to investigate
4. **Resolution**: Step-by-step fix
5. **Prevention**: How to avoid in future

---

## Troubleshooting

### Metrics Not Showing in Grafana

**Problem**: Dashboard panels show "No data"

**Solution**:
1. Check Prometheus is scraping API:
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```
2. Verify API `/metrics` endpoint responds:
   ```bash
   curl http://localhost:3000/metrics
   ```
3. Check time range in Grafana (top-right)
4. Verify Prometheus datasource is configured correctly

### Alerts Not Firing

**Problem**: Conditions met but no alert

**Solution**:
1. Check Prometheus alert rules are loaded:
   ```bash
   curl http://localhost:9090/api/v1/rules
   ```
2. Verify Alertmanager is receiving alerts:
   ```bash
   curl http://localhost:9093/api/v1/alerts
   ```
3. Check Alertmanager logs:
   ```bash
   docker logs holi-alertmanager
   ```

### PagerDuty Notifications Not Received

**Problem**: Alerts firing but no PagerDuty page

**Solution**:
1. Verify PagerDuty integration key is correct
2. Check Alertmanager is configured with correct service key
3. Test PagerDuty integration:
   ```bash
   curl -X POST https://events.pagerduty.com/v2/enqueue \
     -H "Content-Type: application/json" \
     -d '{
       "routing_key": "YOUR_INTEGRATION_KEY",
       "event_action": "trigger",
       "payload": {
         "summary": "Test alert",
         "severity": "error",
         "source": "test"
       }
     }'
   ```

### High Cardinality Metrics

**Problem**: Prometheus running out of memory

**Solution**:
1. Drop high-cardinality labels in `prometheus.yml`:
   ```yaml
   metric_relabel_configs:
     - source_labels: [route]
       regex: '/api/v1/.*'
       action: drop
   ```
2. Reduce retention period:
   ```bash
   --storage.tsdb.retention.time=15d
   ```
3. Use remote write to offload storage

---

## Cost Optimization

### Grafana Cloud Free Tier

- 10,000 series
- 14 days retention
- 50 GB logs
- 3 users

**Recommended**: Use Grafana Cloud for visualization, self-host Prometheus for longer retention.

### PagerDuty Pricing

- **Starter**: $19/user/month (100 SMS, 500 emails, 1,000 push)
- **Professional**: $39/user/month (unlimited, advanced features)

**Recommended**: Professional tier for production (incident workflows, analytics).

### SendGrid Email

- **Free**: 100 emails/day
- **Essentials**: $19.95/month (100,000 emails/month)

**Recommended**: Free tier for development, Essentials for production.

---

## Support

For questions or issues with monitoring setup:

- **Slack**: `#engineering` or `#platform`
- **Email**: `platform@holilabs.xyz`
- **Documentation**: `https://docs.holilabs.xyz`
