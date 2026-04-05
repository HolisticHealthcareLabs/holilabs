# Observability Plan — Holi Labs Healthcare Platform

**Version:** 1.0
**Date:** 2026-04-03
**Status:** Target Architecture (implementation in progress)
**Owner:** DevOps / SRE

---

## Overview

This document defines the observability target state for Holi Labs. The system handles
PHI and operates under HIPAA/LGPD — observability must balance visibility with data
protection. No PHI appears in metrics, traces, or logs.

**Recommended Stack:** OpenTelemetry SDK + Grafana Cloud (metrics/traces/logs) + PagerDuty (alerting)

---

## 1. Application Metrics

### 1.1 Request Performance

| Metric | Source | Labels | Alert Threshold |
|--------|--------|--------|----------------|
| `http_request_duration_seconds` | OTel middleware | `method`, `route`, `status_code` | p95 > 500ms, p99 > 2s |
| `http_requests_total` | OTel middleware | `method`, `route`, `status_code` | Error rate > 5% over 5 min |
| `http_request_size_bytes` | OTel middleware | `method`, `route` | Informational |
| `http_response_size_bytes` | OTel middleware | `method`, `route` | Single response > 10MB |

### 1.2 Business Metrics

| Metric | Source | Labels | Alert Threshold |
|--------|--------|--------|----------------|
| `active_sessions_total` | Session store | `workspace_id` | > 10x baseline |
| `prescriptions_created_total` | Prescription service | `type`, `workspace_id` | Informational |
| `encounters_completed_total` | Encounter service | `workspace_id` | Informational |
| `ai_inference_duration_seconds` | AI provider | `provider`, `model` | p95 > 5s |
| `ai_token_usage_total` | AI provider | `provider`, `model`, `direction` | Cost > $50/hour |

### 1.3 Database Performance

| Metric | Source | Labels | Alert Threshold |
|--------|--------|--------|----------------|
| `prisma_query_duration_seconds` | Prisma middleware | `model`, `operation` | p95 > 200ms |
| `prisma_connection_pool_active` | Prisma engine | — | > 80% pool capacity |
| `prisma_query_errors_total` | Prisma middleware | `model`, `error_code` | > 10/min |

---

## 2. Security Metrics

### 2.1 Authentication & Authorization

| Metric | Source | Labels | Alert Threshold |
|--------|--------|--------|----------------|
| `auth_attempts_total` | Auth middleware | `result` (success/failure), `method` | Failed > 50/min → **PAGE** |
| `auth_mfa_challenges_total` | MFA service | `result`, `method` | Failure rate > 30% |
| `rbac_denials_total` | RBAC middleware | `role`, `resource`, `action` | > 20/min → investigate |
| `session_invalidations_total` | Session store | `reason` | Spike > 5x baseline |

### 2.2 Rate Limiting & Abuse

| Metric | Source | Labels | Alert Threshold |
|--------|--------|--------|----------------|
| `rate_limit_triggers_total` | Rate limit middleware | `route`, `client_ip_hash` | > 100/min single IP → **AUTO-BLOCK + ALERT** |
| `rate_limit_blocks_total` | Rate limit middleware | `route` | > 500/min global → investigate DDoS |
| `cors_rejections_total` | CORS middleware | `origin` | Any → investigate |

### 2.3 PHI Access Auditing

| Metric | Source | Labels | Alert Threshold |
|--------|--------|--------|----------------|
| `audit_log_entries_total` | Audit service | `action`, `resource_type` | Volume spike > 3x baseline → **ALERT** (possible exfiltration) |
| `audit_log_write_errors` | Audit buffer | — | Any → **PAGE** (compliance gap) |
| `phi_access_total` | Patient service | `access_reason`, `role` | Informational |
| `canary_field_access_total` | Canary service | `field_name`, `user_id_hash` | **Any > 0 → IMMEDIATE ALERT** |

### 2.4 Canary Fields

Deploy canary tokens in the database — synthetic records that should never be accessed
in normal operation. Any read triggers an immediate security alert.

| Canary Type | Description | Detection |
|-------------|-------------|-----------|
| Canary patient record | Synthetic patient with known `tokenId` | Any Prisma read on this record |
| Canary API key | Valid-format but unused API key in vault | Any authentication attempt |
| Canary file | File in S3 bucket that should never be fetched | S3 access log for this object |

---

## 3. Infrastructure Metrics

### 3.1 Compute

| Metric | Source | Labels | Alert Threshold |
|--------|--------|--------|----------------|
| `container_cpu_usage_percent` | cAdvisor / DO metrics | `service` | > 80% sustained 5 min |
| `container_memory_usage_bytes` | cAdvisor / DO metrics | `service` | > 85% of limit |
| `container_restarts_total` | Kubernetes / DO | `service` | > 3 in 10 min → **PAGE** |
| `container_oom_kills_total` | Kernel metrics | `service` | Any → **PAGE** |

### 3.2 Database

| Metric | Source | Labels | Alert Threshold |
|--------|--------|--------|----------------|
| `pg_connections_active` | pg_stat_activity | `state` | > 80% of max_connections |
| `pg_replication_lag_seconds` | pg_stat_replication | `replica` | > 30s → alert |
| `pg_disk_usage_bytes` | pg filesystem | `tablespace` | > 80% capacity |
| `pg_deadlocks_total` | pg_stat_database | — | > 5/hour |
| `pg_slow_queries_total` | pg_stat_statements | — | Duration > 1s |

### 3.3 Redis

| Metric | Source | Labels | Alert Threshold |
|--------|--------|--------|----------------|
| `redis_connected_clients` | INFO | — | > 80% maxclients |
| `redis_memory_used_bytes` | INFO | — | > 80% maxmemory |
| `redis_evicted_keys_total` | INFO | — | Any → review maxmemory policy |
| `redis_hit_rate` | INFO | — | < 80% → cache strategy review |

---

## 4. Alerting Rules

### 4.1 PagerDuty Escalation

| Alert | Severity | Routing | Escalation |
|-------|----------|---------|------------|
| Failed auth > 50/min | P1 | On-call engineer | → Security Lead (15 min) → CTO (30 min) |
| Rate limit > 100/min single IP | P1 | Auto-block + on-call | → Security Lead (15 min) |
| Audit log volume > 3x baseline | P1 | On-call + Security Lead | → CTO + Compliance (30 min) |
| Canary field access | P0 | On-call + Security Lead + CTO | Immediate war room |
| Container restart > 3/10min | P2 | On-call engineer | → Tech Lead (30 min) |
| API error rate > 5%/5min | P2 | On-call engineer | → Tech Lead (30 min) |
| Audit log write failure | P1 | On-call engineer | → Compliance (15 min) |
| p99 latency > 2s for 5 min | P2 | On-call engineer | → Tech Lead (30 min) |

### 4.2 Slack Notifications (Non-Paging)

- Deployment success/failure
- Security scan results (weekly summary)
- Coverage report on PR
- Bundle size changes

---

## 5. Anomaly Detection Baseline

### 5.1 Establishment Phase (First 2 Weeks)

During the first 2 weeks of production operation, collect baseline metrics without alerting
on anomaly thresholds. Record:

| Metric | Baseline Data Points |
|--------|---------------------|
| Request volume per hour (by route) | Mean, p50, p95, p99 |
| Auth failure rate per hour | Mean, standard deviation |
| Audit log volume per hour | Mean, p95 |
| API latency per route | Mean, p50, p95, p99 |
| Database query latency | Mean, p95 per model/operation |
| Rate limit trigger frequency | Mean per hour |

### 5.2 Detection Rules (Post-Baseline)

After baseline established, enable anomaly alerts:

| Anomaly | Detection Method | Threshold | Rationale |
|---------|-----------------|-----------|-----------|
| Traffic spike | Volume > 3x p95 baseline for 5 min | Dynamic | AI-speed probing often generates burst traffic patterns |
| Auth probing | Failed auth > 3 std deviations above mean | Dynamic | Credential stuffing detection |
| Data exfiltration | Audit log volume > 3x baseline + large response sizes | Dynamic | Bulk data access pattern |
| API scanning | 404 rate > 5x baseline from single IP hash | Dynamic | Endpoint enumeration |
| Timing attacks | Variance in auth response time > 2x normal | Dynamic | Side-channel attack indicator |
| Model abuse | AI token usage > 5x baseline per user/hour | Dynamic | Prompt injection / abuse |

### 5.3 Why This Matters (CVE-2026-4747 Context)

The FreeBSD kernel RCE demonstrated that AI systems can autonomously exploit vulnerabilities
at machine speed — far faster than human operators can detect and respond. Traditional
threshold-based alerting misses novel attack patterns. Anomaly detection catches deviations
from normal behavior regardless of the specific attack vector.

Key insight: An AI attacker will probe systematically and rapidly. The traffic pattern itself
is the signal — not any single request.

---

## 6. Implementation Priority

| Phase | Components | Timeline |
|-------|-----------|----------|
| **P0** | Health endpoints, error rate alerts, audit log monitoring | Week 1 |
| **P1** | OTel SDK integration, Grafana dashboards, PagerDuty routing | Week 2-3 |
| **P2** | Security metrics, canary fields, rate limit monitoring | Week 3-4 |
| **P3** | Anomaly baseline collection, database metrics | Week 4-6 |
| **P4** | Anomaly detection activation, full dashboard rollout | Week 6-8 |

---

## 7. Data Retention

| Data Type | Retention | Justification |
|-----------|----------|---------------|
| Metrics (time series) | 13 months | HIPAA requires 6 years for audit, but metrics are aggregate |
| Traces | 30 days | Performance debugging window |
| Logs (application) | 90 days hot, 6 years cold | HIPAA audit requirement |
| Audit logs | 6 years (minimum) | HIPAA §164.530(j) — maintain for 6 years from creation |
| Security alerts | 6 years | Part of audit record |

**PHI in observability data:** NEVER. All metrics use tokenized or hashed identifiers.
Patient IDs, names, and clinical data must never appear in metrics, traces, or log messages.
