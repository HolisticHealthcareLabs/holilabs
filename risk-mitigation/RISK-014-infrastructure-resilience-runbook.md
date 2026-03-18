# RISK-014 Mitigation Runbook
## Infrastructure Resilience & Graceful Degradation for Simulation Service

**Risk ID:** RISK-014
**Category:** Financial / Operational
**Severity:** Low
**Owner:** ARCHIE (infrastructure reliability), CYRUS (monitoring)
**Effective Date:** March 2026
**Review Cadence:** Weekly during pilot, monthly post-launch

---

## Executive Summary

Self-hosted GPU infrastructure (or managed cloud GPU services) may suffer unplanned outages during hospital pilot operations, causing simulation unavailability. In a clinical context, a dashboard that intermittently fails has disproportionate trust damage relative to the actual downtime percentage. This runbook specifies graceful degradation patterns, health monitoring architecture, SLA definitions, and incident response procedures to minimize reputation damage during infrastructure failures.

**Key Principle:** The Cortex Swarm Layer is a *non-blocking, asynchronous service*. Core clinical workflows (CDSS dashboard, patient search, EHR) must remain fully functional even if simulation service is unavailable.

---

## 1. Graceful Degradation Specification

### 1.1 Simulation Service Availability States

The simulation service operates in four distinct states:

| State | Status | TLP Widget Display | CDRM Widget Display | DAS Widget Display |
|-------|--------|-------------------|-------------------|------------------|
| **Healthy** | 100% availability | Real-time predictions | Real-time risk maps | Real-time adherence data |
| **Degraded** | Partial (>80% uptime, intermittent latency >500ms) | "Updated [timestamp], next update pending..." | "Last computed [date]. Refreshing..." | "Data from [date]" |
| **Unavailable** | Down (<80% uptime, or >2 consecutive failures) | "Simulation unavailable — last updated [timestamp]" | "Simulation unavailable — last updated [timestamp]" | "Simulation unavailable — last updated [timestamp]" |
| **Critical** | Sustained outage >6 hours | Shows cached results from 72 hours ago + amber banner | Shows cached results from 72 hours ago + amber banner | Shows cached results from 72 hours ago + amber banner |

### 1.2 TLP Widget Degradation States (Example)

#### Healthy State
```
┌─────────────────────────────────────────┐
│ Triage Level Prediction (TLP)           │
├─────────────────────────────────────────┤
│ Expected P1 arrivals (4h forecast)      │
│                                         │
│ 25–35                                   │
│ [████████░░░░]                          │
│                                         │
│ 95% confidence interval                 │
│ Last computed: Just now                 │
│                                         │
│ [Explain this prediction] [Refresh]     │
└─────────────────────────────────────────┘
```

#### Degraded State (Latency Warning)
```
┌─────────────────────────────────────────┐
│ ⚠️ Triage Level Prediction (TLP)        │
├─────────────────────────────────────────┤
│ Expected P1 arrivals (4h forecast)      │
│                                         │
│ 25–35                                   │
│ [████████░░░░]                          │
│                                         │
│ Updated [2 min ago]                     │
│ Next update pending (service busy)...   │
│                                         │
│ [Explain this prediction] [Refresh]     │
└─────────────────────────────────────────┘
```

#### Unavailable State
```
┌─────────────────────────────────────────┐
│ 🔴 Triage Level Prediction (TLP)        │
├─────────────────────────────────────────┤
│                                         │
│ Simulation unavailable                  │
│ Last updated: 47 minutes ago            │
│                                         │
│ The simulation service is temporarily   │
│ offline for maintenance or recovery.    │
│ Core clinical workflows remain active.  │
│                                         │
│ If this persists >1 hour, contact       │
│ support@holilabs.xyz                    │
│                                         │
│ [Try again] [View historical data]      │
└─────────────────────────────────────────┘
```

#### Critical State (72-Hour Fallback)
```
┌─────────────────────────────────────────┐
│ 🔴 Triage Level Prediction (TLP)        │
├─────────────────────────────────────────┤
│ [This is cached data from 72h ago]      │
│                                         │
│ Expected P1 arrivals (historical avg)   │
│                                         │
│ 22–32                                   │
│ [████████░░░░] (72h cache)              │
│                                         │
│ Last fresh computation: 72 hours ago    │
│ Service Status: OFFLINE >6 hours        │
│                                         │
│ This is NOT a current prediction.       │
│ Use for historical context only.        │
│ Contact support immediately.            │
│                                         │
│ [Support contact] [Status page]         │
└─────────────────────────────────────────┘
```

### 1.3 Core Dashboard Behavior During Outage

**Patient Search, EHR, Medications, Lab Results:** FULLY FUNCTIONAL (no simulation layer dependency)

**CDSS Dashboard During Simulation Outage:**
- All TLP/CDRM/DAS widgets show "Unavailable" banner
- Clinician can still:
  - View patient demographics, past medical history, medications
  - Order labs, prescriptions, imaging
  - View appointment calendar
  - Access audit logs and compliance features
  - Perform all patient care tasks

**Workflow Example:**
```
ED Nurse uses CDSS dashboard to:
1. Search for patient "João Silva" → ✓ Works
2. View his medications, allergies → ✓ Works
3. Check if he has been triaged before (history) → ✓ Works
4. Check TLP prediction for expected P1 load → ⚠️ "Unavailable — last updated 1 hour ago"
5. Can still triage the patient manually based on clinical assessment → ✓ Works

The simulation outage does NOT block patient care.
```

### 1.4 Caching Strategy

**Cache Layer:**

```
┌─────────────────────────────────┐
│ Simulation Service              │
│ (when available)                │
└───────────┬─────────────────────┘
            │ Real-time predictions
            ↓
┌─────────────────────────────────┐
│ Redis Cache (5-min TTL)         │
│ - Latest P1/P2/P3/P4 forecasts  │
│ - Latest CDRM cohort risks       │
│ - Latest DAS adherence data      │
└───────────┬─────────────────────┘
            │ Cache miss → return
            │ stale data + warning
            ↓
┌─────────────────────────────────┐
│ PostgreSQL (72h archive)        │
│ - Last 72 hours of predictions  │
│ - Stored as JSON in prediction_ │
│   archive table (partitioned    │
│   by hospital_id, date)         │
└─────────────────────────────────┘
```

**Cache Lifecycle:**

- **0–5 min old:** Serve from Redis with "Just updated" label
- **5–60 min old:** Serve from Redis with "Updated 15 min ago" label
- **60 min – 72 hours old:** Serve from PostgreSQL with warning banner "Last updated [time ago]"
- **>72 hours old:** Serve oldest available (72h ago) with "Cached data from 72h ago" disclaimer

**Cache Invalidation:**

```typescript
// After each successful simulation run, cache result:

async function cacheSimulationResult(
  hospitalId: string,
  simulation: SimulationResult
) {
  const cacheKey = `sim:${hospitalId}:latest`;
  const ttlSeconds = 300; // 5 minutes

  // Write to Redis (hot cache)
  await redis.setex(
    cacheKey,
    ttlSeconds,
    JSON.stringify({
      ...simulation,
      cachedAt: new Date().toISOString(),
      source: 'live_simulation',
    })
  );

  // Archive to PostgreSQL (cold cache)
  await prisma.simulationArchive.create({
    data: {
      hospitalId,
      simulationResultJSON: simulation,
      computedAt: new Date(),
    },
  });

  // Emit cache update event
  await eventBus.emit('simulation:cached', { hospitalId, ttl: ttlSeconds });
}
```

---

## 2. Health Monitoring and Alerting Design

### 2.1 Health Check Endpoints

**Endpoint: `GET /health/simulation`**

```json
{
  "status": "healthy",
  "service": "simulation-engine",
  "uptime_seconds": 432000,
  "last_successful_run": "2026-04-15T14:32:00Z",
  "last_run_duration_ms": 1850,
  "error_rate_percent": 0.5,
  "cache_hit_rate_percent": 94.2,
  "gpu_utilization_percent": 65,
  "gpu_memory_used_gb": 18.4,
  "gpu_memory_total_gb": 24,
  "pending_queue_size": 3,
  "checks": {
    "gpu_connectivity": "healthy",
    "model_load": "healthy",
    "cache_layer": "healthy",
    "database_connection": "healthy"
  }
}
```

**Endpoint: `GET /health/dashboard`**

```json
{
  "status": "operational",
  "core_services": {
    "auth": "healthy",
    "patient_service": "healthy",
    "ehr": "healthy",
    "audit_log": "healthy"
  },
  "optional_services": {
    "simulation": "degraded",
    "simulation_status": "latency_warning",
    "simulation_last_update": "2026-04-15T14:28:00Z"
  },
  "overall_dashboard_status": "operational"
}
```

### 2.2 Monitoring Stack (PagerDuty Integration)

**Monitoring Infrastructure:**

```
┌─────────────────────────────────────────────────┐
│ Prometheus (metrics collection)                 │
│ - GPU utilization, temperature                  │
│ - Model load time, inference latency            │
│ - Cache hit/miss rate                           │
│ - Request queue depth                           │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ AlertManager (threshold + routing)              │
│ - CPU >80% for >5 min → warning                 │
│ - GPU temp >75°C for >2 min → warning           │
│ - Inference latency >1s for 5 consecutive runs  │
│   → alert                                        │
│ - Service Down for >10 min → critical alert     │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ PagerDuty                                       │
│ - Route alerts by severity & on-call schedule   │
│ - Escalation policies:                          │
│   * Warning (24h) → Slack #sim-warnings         │
│   * High (1h) → SMS + Slack                     │
│   * Critical (5m) → SMS + call escalation       │
└─────────────────────────────────────────────────┘
```

### 2.3 Alerting Rules

**Prometheus Alert Rules (yaml):**

```yaml
groups:
  - name: simulation_alerts
    interval: 30s
    rules:
      # GPU Health
      - alert: SimulationGPUTemperatureHigh
        expr: gpu_temperature_celsius > 75
        for: 2m
        labels:
          severity: warning
          service: simulation
        annotations:
          summary: "GPU temperature {{ $value }}°C (threshold: 75°C)"
          description: "GPU temperature has exceeded safe operating range for 2 minutes"
          runbook: "docs/runbook/gpu-thermal-management"

      # Inference Latency
      - alert: SimulationLatencyHigh
        expr: |
          histogram_quantile(0.95, rate(inference_duration_ms[5m])) > 1000
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "P95 inference latency {{ $value }}ms (threshold: 1000ms)"
          description: "Simulation inference is slower than expected. Check GPU utilization and queue depth."

      # Service Availability
      - alert: SimulationServiceDown
        expr: up{service="simulation"} == 0
        for: 5m
        labels:
          severity: critical
          page: true
        annotations:
          summary: "Simulation service is offline"
          description: "The simulation inference service has been unreachable for 5 minutes"
          runbook: "docs/runbook/simulation-service-recovery"

      # Cache Effectiveness
      - alert: SimulationCacheLowHitRate
        expr: cache_hit_rate_percent < 70
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Simulation cache hit rate low: {{ $value }}%"
          description: "Cache hit rate has dropped below 70%. Check for cache invalidation issues or increased request variance."

      # Model Load Failure
      - alert: SimulationModelLoadFailure
        expr: model_load_failures_total > 0
        for: 1m
        labels:
          severity: critical
          page: true
        annotations:
          summary: "Simulation model failed to load"
          description: "The simulation model loading process has failed. Manual intervention required."
          runbook: "docs/runbook/model-recovery"

      # Queue Buildup
      - alert: SimulationQueueBacklog
        expr: pending_queue_size > 20
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Simulation queue has {{ $value }} pending jobs (threshold: 20)"
          description: "The simulation request queue is backing up. Processing may be delayed."
```

### 2.4 PagerDuty Escalation Policy

**On-Call Schedule:**

```
Layer 1 (Tier 1 Support — Automated)
├─ Warning alerts → Slack #sim-warnings (no page)
├─ Auto-recovery attempted (restart service)
└─ If unresolved after 15 min → Layer 2

Layer 2 (Tier 2 Support — Manual)
├─ High/Critical alerts → SMS + Slack mention
├─ Engineer notified at 1-min SLA
├─ If unresolved after 30 min → escalate

Layer 3 (Tier 3 — Engineering Lead)
├─ Critical alerts ongoing >30 min
├─ Immediate phone call
├─ Manual intervention / rollback decision
└─ If unresolved after 60 min → escalate to ARCHIE

Layer 4 (ARCHIE — CTO Decision Point)
├─ Service down >60 min
├─ Activate disaster recovery (switch to fallback infrastructure)
├─ Notify CEO + hospital stakeholders
└─ Initiate post-incident review
```

---

## 3. SLA Definition (Service Level Agreement)

### 3.1 Simulation Service SLA

**Scope:** TLP, CDRM, DAS prediction services

**Service Hours:** 06:00–22:00 BRT (Monday–Sunday, excluding major Brazilian holidays)

**Availability Target:** 99.5% uptime during service hours

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Uptime** | 99.5% | Total downtime ÷ total service hours per month |
| **P95 Latency** | <800ms | 95th percentile of inference request latency |
| **Cache Hit Rate** | >85% | (Cache hits) ÷ (cache hits + misses) |
| **Model Accuracy** | <15% MAPE | Mean Absolute Percentage Error vs. actual outcomes (post-validation) |

**Downtime Budget (monthly):**
- 99.5% uptime = 0.5% downtime allowed
- At 16 service hours/day × 30 days = 480 hours/month
- **0.5% of 480 = 2.4 hours maximum downtime/month**

**Example:**
- If service is down from 14:00–15:00 on April 15 → 1 hour downtime
- Remaining budget: 2.4 - 1.0 = **1.4 hours allowed for rest of month**

### 3.2 Remediation Credits

If uptime falls below 99.5%, hospital partners receive service credits:

| Uptime | Credit |
|--------|--------|
| 99.0–99.5% | 5% of monthly service fee |
| 98.0–99.0% | 10% of monthly service fee |
| 95.0–98.0% | 25% of monthly service fee |
| <95% | 100% of monthly service fee (full refund) |

**Credit Request Process:**
1. Hospital submits credit claim within 15 days of month-end
2. ARCHIE validates uptime data from monitoring dashboard
3. Credit is applied to next month's invoice or refunded (if month is final month of contract)

### 3.3 Core Dashboard SLA (Separate)

**Scope:** Patient search, EHR, medications, labs, imaging, audit logs

**Availability Target:** 99.9% uptime 24/7/365

**Rationale:** Core clinical functions MUST be available at all times. Simulation is optional.

---

## 4. Auto-Restart and Recovery Procedures

### 4.1 Automatic Recovery Script

**Trigger:** Service detected as down for >5 minutes

**Script:** `/scripts/simulation-recovery.sh`

```bash
#!/bin/bash

set -e

LOG_FILE="/var/log/simulation-recovery.log"
ALERTING_SLACK_WEBHOOK="$SLACK_WEBHOOK_URL"
HEALTH_CHECK_URL="http://localhost:8080/health/simulation"
MAX_RESTART_ATTEMPTS=3

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

send_slack_alert() {
    local message=$1
    local severity=$2

    curl -X POST -H 'Content-type: application/json' \
        --data "{
            \"text\": \"$message\",
            \"attachments\": [{
                \"color\": $([ \"$severity\" = \"critical\" ] && echo '\"danger\"' || echo '\"warning\"')
            }]
        }" \
        "$ALERTING_SLACK_WEBHOOK"
}

attempt_restart() {
    local attempt=$1
    log "Restart attempt $attempt/$MAX_RESTART_ATTEMPTS"

    # Stop existing service
    systemctl stop simulation-engine || log "Service was not running"

    # Wait before restart
    sleep 5

    # Start service
    systemctl start simulation-engine
    sleep 10

    # Health check
    if curl -f "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        log "Service restarted successfully"
        send_slack_alert "✓ Simulation service recovered after restart" "success"
        return 0
    else
        log "Health check failed after restart attempt $attempt"
        return 1
    fi
}

# Main recovery logic
log "Starting automatic recovery procedure..."

for attempt in $(seq 1 $MAX_RESTART_ATTEMPTS); do
    if attempt_restart $attempt; then
        exit 0
    fi

    if [ $attempt -lt $MAX_RESTART_ATTEMPTS ]; then
        sleep 30
    fi
done

# If all restarts fail, escalate to manual intervention
log "All automatic recovery attempts failed. Escalating to PagerDuty."
send_slack_alert "🚨 Simulation service failed to recover after $MAX_RESTART_ATTEMPTS attempts. Manual intervention required." "critical"

# Trigger PagerDuty critical alert
curl -X POST "https://events.pagerduty.com/v2/enqueue" \
  -H 'Content-Type: application/json' \
  -d "{
    \"routing_key\": \"$PAGERDUTY_ROUTING_KEY\",
    \"event_action\": \"trigger\",
    \"dedup_key\": \"sim-recovery-failed-$(date +%s)\",
    \"payload\": {
      \"summary\": \"Simulation service failed to recover automatically\",
      \"severity\": \"critical\",
      \"source\": \"simulation-recovery-script\",
      \"custom_details\": {
        \"log_file\": \"$LOG_FILE\",
        \"timestamp\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\"
      }
    }
  }"

exit 1
```

**Cron Job Setup:**

```bash
# Check service health every 5 minutes and auto-restart if down
*/5 * * * * /usr/local/bin/check-simulation-health.sh && systemctl is-active --quiet simulation-engine || /scripts/simulation-recovery.sh >> /var/log/simulation-health-checks.log 2>&1
```

### 4.2 Manual Recovery Runbook (for ARCHIE)

**If automatic restart fails:**

1. **SSH into simulation server:**
   ```bash
   ssh gpu-server-1.sa-east-1.aws.internal
   ```

2. **Check service status:**
   ```bash
   systemctl status simulation-engine
   journalctl -u simulation-engine -n 50  # Last 50 log lines
   ```

3. **Diagnose the issue:**
   - GPU check: `nvidia-smi` (check for thermal throttling, memory exhaustion)
   - Disk space: `df -h` (model files + cache may have filled disk)
   - Network: `curl -I http://inference-api:8000/health`
   - Model load: Check `/var/log/simulation-engine/model-load.log`

4. **Recovery options:**

   **Option A: Restart with model reload**
   ```bash
   systemctl stop simulation-engine
   rm -f /var/cache/simulation-models/*.ckpt  # Force model reload
   systemctl start simulation-engine
   ```

   **Option B: Switch to fallback infrastructure**
   ```bash
   # If primary is unrecoverable, failover to secondary GPU instance
   # Update load balancer to route to gpu-server-2
   aws elb deregister-instances-from-load-balancer \
     --load-balancer-name simulation-lb \
     --instances i-0abc123def456
   ```

   **Option C: Enable degraded mode (serve cached data only)**
   ```bash
   # Set feature flag to disable live simulation, serve 72-hour cache instead
   curl -X POST http://localhost:3001/admin/feature-flags \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"flag": "SIMULATION_LIVE_MODE", "enabled": false}'
   ```

5. **Verify recovery:**
   ```bash
   curl -f http://localhost:8080/health/simulation
   # Expected: 200 OK with status: "healthy"
   ```

6. **Notify stakeholders:**
   ```bash
   # Send Slack message to #incidents channel
   curl -X POST "$SLACK_WEBHOOK" -d '{"text": "Simulation service recovered. Manual restart required at [timestamp]. Root cause: [diagnosis]. Impact: [describe]"}'
   ```

---

## 5. Managed Cloud vs. Raw GPU Instance Reliability Comparison

### 5.1 Option A: AWS SageMaker Managed Inference Endpoints

**Pros:**
- Auto-scaling (handles traffic spikes automatically)
- AWS handles patching, kernel updates, security
- Multi-AZ deployment available (99.99% SLA)
- Built-in monitoring and CloudWatch integration
- No ops overhead for ARCHIE's team

**Cons:**
- Cold start latency (15–30 sec for first inference)
- Higher per-inference cost (~$0.015–0.025 per inference vs. $0.002 self-hosted)
- Less control over model optimization and quantization
- Inference may route to shared GPU with other customers (noisy neighbor risk)

**Availability:** 99.99% SLA (4.3 min downtime/month)

**Cost (Brazil - São Paulo region):**
- Baseline: $50/day for ml.p3.2xlarge instance (1× V100 GPU) running 24/7
- Scaling: ~$0.03 per inference (includes API gateway, data transfer)
- Monthly: ~$1,500 (baseline) + variable inference cost

### 5.2 Option B: Azure ML Managed Endpoints

**Pros:**
- Enterprise Azure integration (if hospital uses Azure Stack)
- Auto-scaling with custom metrics
- Built-in A/B testing for model versions
- 99.95% SLA in Brazil (Brasília region)

**Cons:**
- Similar latency and per-inference pricing to SageMaker
- Requires Azure credential/identity setup for hospitals
- Less vendor flexibility if hospital prefers AWS

**Availability:** 99.95% SLA (21 min downtime/month)

**Cost (Brazil - Brasília region):**
- Baseline: $60/day for Standard_NC6 (1× K80 GPU)
- Inference: ~$0.035 per inference
- Monthly: ~$1,800 (baseline) + variable

### 5.3 Option C: Self-Hosted Raw GPU Instance (EC2)

**Pros:**
- Lowest per-inference cost (~$0.002, pure amortization)
- Full control over model optimization, quantization, batching
- No vendor lock-in or cold start latency
- Can use spot instances for massive cost savings (75% discount)

**Cons:**
- Requires dedicated ops (kernel patching, GPU driver updates, thermal management)
- No auto-scaling; capacity planning is manual
- Single instance = single point of failure (unless multi-instance setup is built)
- AWS SLA is 99.99% for infrastructure, but we own availability above that layer

**Availability (single instance):** 99.5% achievable (2.4 hr downtime/month with discipline)

**Availability (multi-instance + auto-failover):** 99.9% achievable (4.3 min downtime/month)

**Cost (Brazil - São Paulo region, single instance):**
- On-demand: $200/day for p3.2xlarge (1× A100 GPU)
- Spot (aggressive bidding): $50/day for same instance
- Monthly on-demand: ~$6,000
- Monthly spot: ~$1,500

### 5.4 Recommendation Matrix

| Scenario | Recommendation | Rationale |
|----------|----------------|-----------|
| **Pilot phase (3 hospitals, low volume)** | AWS SageMaker managed endpoint | Zero ops overhead; 99.99% availability; easy to turn off if pilot fails |
| **Early commercial (5–10 hospitals)** | Self-hosted spot instance + manual backup | Cost control; learn ops; failover playbook good enough for early stage |
| **Scale (50+ hospitals, 1000s of simulations/day)** | Multi-instance self-hosted + auto-failover | Cost amortization; operational excellence justified |
| **Enterprise customer (if requested)** | Multi-AZ managed endpoint (SageMaker) + on-demand | Customer may require SLA guarantees; margin supports managed cost |

### 5.5 Hybrid Strategy (Recommended)

**Phased approach:**

- **Months 1–3 (Pilot):** AWS SageMaker managed endpoint
  - Cost: ~$2,000/month (baseline + inference)
  - Reliability: 99.99% SLA
  - Ops: 0 (AWS-managed)
  - Benefit: De-risks pilot; if it fails, easy to shut down

- **Months 4–8 (Early commercial):** Self-hosted spot instance + manual failover playbook
  - Cost: ~$1,500/month (spot instance)
  - Reliability: 99.5% achievable (with disciplined ops)
  - Ops: 10–15 hrs/week (ARCHIE)
  - Benefit: Margin improves; learn operational patterns

- **Months 9+:** Multi-instance self-hosted + Kubernetes auto-failover
  - Cost: ~$3,000/month (2–3 instances, mix of on-demand + spot)
  - Reliability: 99.9% (multi-AZ failover)
  - Ops: 20–30 hrs/week (dedicated MLOps hire)
  - Benefit: Scale efficiently; higher gross margins

---

## 6. Incident Response Playbook for Simulation Service Outage

### 6.1 Incident Classification

| Severity | Downtime | Response Time | Escalation |
|----------|----------|---------------|------------|
| **P1 (Critical)** | >30 min | Immediate (5 min) | Page ARCHIE + CYRUS |
| **P2 (High)** | 15–30 min | 15 min | Slack alert to on-call engineer |
| **P3 (Medium)** | 5–15 min | 30 min | Log in dashboard; no page |
| **P4 (Low)** | <5 min | 1 hour | Log in dashboard; no page |

### 6.2 P1 Incident Response (>30 min outage)

**T+0 min: Alert Received**
- PagerDuty pages ARCHIE + CYRUS
- Slack alert in #incidents channel
- Automated recovery script starts (Section 4.1)

**T+5 min: Incident Commander (IC) Elected**
- ARCHIE (if available) = IC
- CYRUS (if ARCHIE unavailable) = IC
- IC creates incident channel: `#incident-sim-[date]-[time]`

**T+5–15 min: Diagnosis**
- IC reviews logs and metrics (Prometheus dashboard)
- Check: GPU health, model load status, database connectivity, queue depth
- Determine root cause: hardware failure, code bug, infrastructure issue, etc.
- IC updates #incidents with status: "Investigating GPU thermal issue — potential hardware failure"

**T+15–30 min: Mitigation Decision**
- IC chooses recovery path:
  - **Option A:** Auto-restart (if likely to work)
  - **Option B:** Manual restart (if specific fix needed)
  - **Option C:** Failover to secondary instance (if primary is unrecoverable)
  - **Option D:** Degrade to cached-only mode (if failure is fundamental)

**T+30 min: Escalation & Notification**
- If outage continues past 30 min, escalate to VP Engineering + VICTOR (GTM)
- IC sends notification to hospital stakeholders:

  ```
  Subject: [INCIDENT] Cortex Swarm Layer Simulation Service Outage

  We're currently experiencing an outage of the simulation service (TLP/CDRM/DAS widgets).

  Status: INVESTIGATING
  Impact: Simulation widgets unavailable; core clinical workflows (EHR, patient search, etc.) remain operational.

  Hospital Operations: You can continue using the CDSS dashboard for all patient care functions.
  The simulation service is optional; cached triage data from the last [X] hours is available via the degraded UI.

  ETA for recovery: [IC's best estimate]

  We'll send updates every 15 minutes.
  ```

**T+60 min: Decision Point**
- If still not recovered, IC convenes emergency call with ARCHIE + CYRUS + VP Eng
- Options:
  - Continue recovery efforts (continue for max 120 min total)
  - Trigger disaster recovery (switch to secondary infrastructure)
  - Accept sustained outage; transition to cached-only mode for rest of day

**T+120 min: Disaster Recovery Activation**
- If primary infrastructure is completely unrecoverable, activate secondary:
  - Switch DNS to backup instance in different AZ
  - Verify service availability on backup
  - Begin data sync to sync primary once recovered
  - Notify hospitals: "Service restored from backup infrastructure. Normal operations resumed."

**T+Recovery: Post-Incident Review**
- Once service is restored, IC schedules blameless post-incident review within 24 hours
- Participants: ARCHIE, on-call engineer, CYRUS, ELENA (if clinical impact)
- Document: root cause, timeline, mitigation steps, preventive actions
- Example post-mortem: "GPU thermal throttling due to ambient temperature spike in data center. Mitigation: Install secondary cooling unit + monitoring."

### 6.3 Communication Templates

**Initial Notification (sent immediately upon P1 alert)**

```
🚨 INCIDENT ALERT: Simulation Service Down

Time: 2026-04-15 16:47 BRT
Service: Cortex Swarm Layer (TLP/CDRM/DAS)
Status: INVESTIGATING
Impact: Simulation predictions unavailable; core clinical workflows operational

Hospitals Affected: Sírio-Libanês, Albert Einstein, Beneficência
Current Downtime: 0 min

Recovery ETA: 30–60 min estimated
We'll update every 15 minutes.

Clinical Note: Patient care is NOT impacted. EHR, medications, labs, imaging all available.
Simulation widgets will show "Unavailable — cached data from [timestamp]" fallback.

Support: support@holilabs.xyz | Urgent: call +55-11-XXXX-XXXX
```

**15-Minute Update (sent if still investigating)**

```
🔧 INCIDENT UPDATE: Simulation Service Down

Time: 2026-04-15 17:02 BRT (15 min elapsed)
Status: INVESTIGATING + AUTO-RECOVERY IN PROGRESS
Root Cause: GPU temperature > 75°C; thermal throttling detected

Action: Attempting service restart. Monitoring GPU temp recovery.
ETA: 15–30 min
```

**30-Minute Update (if escalation needed)**

```
⚠️ INCIDENT UPDATE: Simulation Service Down

Time: 2026-04-15 17:17 BRT (30 min elapsed)
Status: ESCALATION IN PROGRESS
Root Cause: Hardware thermal issue; requires manual intervention

Action: Senior engineer (ARCHIE) now on case. Evaluating:
1. Force GPU thermal recovery
2. If unsuccessful, failover to backup instance (2–5 min switchover)

ETA: 10–20 min

We apologize for the extended outage. Hospital operations are unaffected.
```

**Recovery Notification**

```
✅ INCIDENT RESOLVED: Simulation Service Restored

Time: 2026-04-15 17:32 BRT (45 min total downtime)
Status: SERVICE OPERATIONAL

Root Cause: GPU core temp spike (external ambient temperature spike in data center).
Recovery: Service restarted successfully; thermal monitoring activated.

Action: Data center secondary cooling unit being installed tomorrow.
Preventive: Uptime expected to improve to 99.9% SLA once cooling upgrade completes.

All hospitals: Simulation service is now live. TLP/CDRM/DAS widgets are updating in real-time.

Thank you for your patience.
```

---

## 7. Graceful Degradation Feature Flags

**Feature Flag System** (to control degradation behavior):

```yaml
# config/feature-flags.yaml

simulation:
  # If true, serve live predictions. If false, serve cached data only.
  liveMode: true

  # Cache freshness threshold. If cache is older than this, mark as "stale"
  maxCacheAgeMins: 60

  # Fallback cache if live is down. Store up to N days of archive data.
  archiveCacheMaxAgeDays: 72

  # If inference latency > this threshold, degrade to cached data
  latencyThresholdMs: 1000

  # If model load fails N times consecutively, disable live mode
  failureThresholdBeforeDegradation: 3

  # If queue depth exceeds this, reject new requests (avoid cascade failure)
  maxQueueDepth: 50
```

**Admin API to toggle degradation:**

```bash
# Disable live simulation (e.g., during emergency maintenance)
curl -X POST http://localhost:3001/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "flag": "SIMULATION_LIVE_MODE",
    "enabled": false,
    "reason": "emergency_maintenance_gpu_replacement"
  }'

# Response:
{
  "flag": "SIMULATION_LIVE_MODE",
  "enabled": false,
  "changedAt": "2026-04-15T17:32:00Z",
  "changedBy": "archie@holilabs.xyz"
}

# Core dashboard remains fully operational
# TLP/CDRM/DAS widgets show: "Simulation temporarily unavailable — serving cached data from [timestamp]"
```

---

## 8. Runbook: GPU Hardware Replacement (Planned Maintenance)

**Scenario:** GPU is end-of-life or needs replacement. Schedule planned 2-hour maintenance window.

**Steps:**

1. **Announce maintenance window** (48 hours prior):
   ```
   Hospital Notification:
   "Scheduled maintenance on Cortex Swarm Layer simulation infrastructure.
   Date/Time: [date] [time] BRT (2 hours)
   Impact: TLP/CDRM/DAS widgets will be unavailable; core EHR unaffected.
   ```

2. **Pre-maintenance (4 hours before):**
   - Disable live simulation mode (feature flag)
   - Verify all recent predictions are cached
   - Notify hospitals: "Maintenance begins [time]"

3. **Maintenance window:**
   - SSH into GPU server
   - `systemctl stop simulation-engine`
   - Physical GPU replacement (swap A100 with new A100)
   - BIOS check, driver reinstall if needed
   - `systemctl start simulation-engine`
   - Run full model load test: `python scripts/test-model-load.py`

4. **Post-maintenance (30 min after restart):**
   - Verify 10 simulation runs complete successfully
   - Re-enable live simulation mode (feature flag)
   - Hospitals see: "Simulation service restored. Live predictions now active."
   - Send post-maintenance report to ARCHIE + CYRUS

5. **SLA Impact:**
   - Planned maintenance window does NOT count toward uptime SLA
   - Hospitals are notified 48 hours in advance
   - Window is chosen during low-traffic hours (off-peak clinical time)

---

## 9. Monitoring Dashboard Configuration

**Grafana Dashboards (for ARCHIE to monitor 24/7):**

**Dashboard 1: Simulation Service Health**
- Uptime timeline (last 7 days)
- GPU utilization (%) + temperature (°C)
- Inference latency (P50, P95, P99)
- Cache hit rate (%)
- Queue depth (pending requests)
- Error rate (% of failed inferences)

**Dashboard 2: Hospital Impact**
- Which hospitals are affected by current issue
- Fallback to cached data (how old is cached data per hospital)
- Error count per hospital
- Prediction accuracy (vs. actual outcomes)

**Dashboard 3: Cost & Performance**
- GPU hours consumed
- Cost per inference (amortized)
- Inference throughput (predictions/sec)
- Model load time (cold start)

---

## 10. Recovery Time Objectives (RTOs)

| Scenario | Recovery Time | Method |
|----------|---------------|--------|
| Service down 5 min | Auto-recovery | Service auto-restart |
| Service down 15 min | Manual restart | SSH + systemctl restart |
| Service down 30 min | Failover | DNS switch to secondary instance |
| Hardware failure (GPU) | 2 hours | Physical GPU replacement |
| Data corruption in cache | 30 min | Purge Redis + reload from PostgreSQL archive |
| Catastrophic infrastructure loss | 4 hours | Provision new GPU instance, restore model, reconfigure |

---

## 11. Ownership & Review Cadence

| Task | Owner | Frequency |
|------|-------|-----------|
| Health check monitoring | CYRUS (alerts) | 24/7 automated |
| Incident response | ARCHIE (on-call) | On-demand |
| Monthly uptime review | ARCHIE | 1st Monday of month |
| SLA credit reconciliation | VICTOR (GTM) | Month-end |
| Disaster recovery drill | ARCHIE + ops team | Quarterly |
| Feature flag policy review | ARCHIE + CYRUS | Quarterly |

---

## 12. Checklist: Pre-Pilot Infrastructure Readiness

Before pilot launch, confirm:

- [ ] Managed cloud vs. self-hosted decision made + infrastructure provisioned
- [ ] Health check endpoints deployed (`/health/simulation`, `/health/dashboard`)
- [ ] Prometheus + AlertManager configured and tested
- [ ] PagerDuty escalation policies defined and on-call schedule published
- [ ] Automatic recovery script deployed and tested (manual restart not needed <5 min)
- [ ] Graceful degradation UI implemented (banner, cache fallback)
- [ ] SLA definition document reviewed with VICTOR (GTM)
- [ ] Crisis communication templates reviewed with RUTH
- [ ] Incident response playbook reviewed with ARCHIE + CYRUS
- [ ] Disaster recovery failover tested (at least once, before pilot)
- [ ] Hospital stakeholders notified of SLA and expected uptime

---

**Document Classification:** Internal / Engineering
**Last Updated:** 2026-03-17
**Next Review:** 2026-03-24 (post-first-pilot-kickoff)
