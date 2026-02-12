# OPERATION FIRST LIGHT: BOLIVIA RUNBOOK
## The "3 AM" Emergency Protocol

**For:** Archie Martinez, VP Operations
**Effective:** 2026-02-11
**Deployment:** Bolivia Pilot (20 Patients)
**Status:** 🚀 READY FOR PRODUCTION

---

## TABLE OF CONTENTS

1. **Monitoring & Health Check** — One-line system status
2. **Incident Taxonomy** — What breaks, how to fix it
3. **Rollback Procedures** — Git revert for bad deployments
4. **Kill Switch** — Emergency disable of DOAC Engine
5. **Escalation Contacts** — Who to call when
6. **Post-Incident Checklist** — Recovery steps

---

## 1. MONITORING & HEALTH CHECK

### One-Line Status Command

```bash
# Run this every morning and before/after any deployment
curl -s http://localhost:3000/api/health | jq '.status'
```

**Expected Output:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-11T09:30:00Z",
  "doac_engine": "operational",
  "database": "connected",
  "governance_logging": "writing",
  "uptime_hours": 72.5
}
```

**If you see:**
- `status: "healthy"` → ✅ Good. Continue operations.
- `status: "degraded"` → ⚠️ Warning. Check specific subsystems.
- `status: "critical"` → 🔴 Emergency. See **Incident Taxonomy** below.

---

### Critical Metrics to Monitor Hourly

```bash
# CPU usage (should be <30% idle traffic, <60% with evaluations)
top -l 1 | grep "Cpu(s)"

# Database connection pool
psql -U cortex_user -d cortex_pilot -c "SELECT count(*) FROM pg_stat_activity;"

# DOAC Engine response time (should be <500ms)
time curl -X POST http://localhost:3000/api/cds/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"medication":"rivaroxaban","patient":{"creatinineClearance":50}}'

# Governance event write latency (should be <100ms)
tail -n 100 /var/log/cortex/governance.log | grep "write_latency_ms"
```

---

## 2. INCIDENT TAXONOMY

### Incident Type 1: "DOAC Engine Blocked All Patients"

**Symptoms:**
- All `/api/cds/evaluate` calls return `severity: "BLOCK"`
- Pharmacy team reports no prescriptions being approved
- Panic calls from clinic

**Root Cause (Common):**
- Rule engine loaded with test rules (default-deny)
- Database connection failed (rules can't load)
- Deployment of bad rule bundle

**Fix (< 5 minutes):**

```bash
# 1. Check which rules are loaded
curl http://localhost:3000/api/config/active-rules | jq '.version'

# Expected output: "doac-rules-v1.0-prod" or similar
# If you see: "doac-rules-test" or "default-deny" → WRONG RULES LOADED

# 2. Reload correct rules
curl -X POST http://localhost:3000/api/config/reload-rules \
  -H 'Content-Type: application/json' \
  -d '{
    "rule_bundle": "doac-rules-v1.0-prod",
    "source": "s3://holi-clinical-data/doac-rules-v1.0-prod.json",
    "actor": "ops-archie-emergency"
  }'

# 3. Verify rules loaded
curl http://localhost:3000/api/config/active-rules | jq '.ruleCount'
# Should return: 20 (our 20 DOAC rules)

# 4. Test with a known-safe patient
curl -X POST http://localhost:3000/api/cds/evaluate \
  -H 'Content-Type: application/json' \
  -d '{
    "medication": "rivaroxaban",
    "patient": {
      "creatinineClearance": 80,
      "age": 60,
      "weight": 75
    }
  }' | jq '.severity'
# Should return: "PASS"

# 5. If still broken, trigger rollback (see below)
```

---

### Incident Type 2: "Governance Events Not Logging"

**Symptoms:**
- API calls succeed, but no events appear in database
- `pnpm run audit-log:check` returns 0 events
- Missing audit trail for compliance

**Root Cause (Common):**
- Database write connection failed
- Governance logging service crashed
- Disk full on database server

**Fix (< 10 minutes):**

```bash
# 1. Check database connectivity
psql -U cortex_user -d cortex_pilot -c "SELECT COUNT(*) FROM governance_event;"

# If error: psql: could not translate host name — DATABASE DOWN

# 2. Check if governance logging service is running
systemctl status cortex-governance-logger

# If inactive: sudo systemctl start cortex-governance-logger

# 3. Check disk space
df -h /var/lib/postgresql/

# If <5%: Alert data center. Emergency archive needed.

# 4. Tail logs for errors
tail -f /var/log/cortex/governance-logger.log | grep ERROR

# 5. If still broken, restart service
sudo systemctl restart cortex-governance-logger

# 6. Verify events resuming
watch 'SELECT COUNT(*) FROM governance_event WHERE created_at > NOW() - INTERVAL 5 minutes;'
```

---

### Incident Type 3: "Prescriber Reports False BLOCK"

**Symptoms:**
- Doctor says: "My patient has CrCl=32, but system blocks Rivaroxaban"
- CrCl threshold is wrong (should be 30, not 32)
- Patient safety concern

**Root Cause (Common):**
- Rule bundle was corrupted during loading
- Threshold was accidentally hardcoded wrong during deployment

**Fix (< 2 minutes):**

```bash
# 1. Check the actual rule in the database
psql -U cortex_user -d cortex_pilot -c \
  "SELECT rule_id, creatinine_clearance_min, action FROM clinical_rule \
   WHERE rule_id = 'DOAC-CrCl-Rivaroxaban-001';"

# Expected output:
# rule_id                        | creatinine_clearance_min | action
# DOAC-CrCl-Rivaroxaban-001      | 30                       | BLOCK

# If you see: creatinine_clearance_min = 32 → WRONG

# 2. Update the rule to correct value
psql -U cortex_user -d cortex_pilot -c \
  "UPDATE clinical_rule SET creatinine_clearance_min = 30 \
   WHERE rule_id = 'DOAC-CrCl-Rivaroxaban-001';"

# 3. Verify update
psql -U cortex_user -d cortex_pilot -c \
  "SELECT creatinine_clearance_min FROM clinical_rule \
   WHERE rule_id = 'DOAC-CrCl-Rivaroxaban-001';"

# 4. Log the correction
curl -X POST http://localhost:3000/api/governance/event \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "RULE_CORRECTION",
    "actor": "ops-archie",
    "resource": "DOAC-CrCl-Rivaroxaban-001",
    "change": "creatinine_clearance_min 32 -> 30",
    "reason": "Emergency fix for false BLOCK"
  }'

# 5. Test with the reported case
curl -X POST http://localhost:3000/api/cds/evaluate \
  -H 'Content-Type: application/json' \
  -d '{
    "medication": "rivaroxaban",
    "patient": { "creatinineClearance": 32 }
  }' | jq '.severity'
# Should now return: "PASS"
```

---

### Incident Type 4: "API Timeout / Unresponsive"

**Symptoms:**
- `/api/cds/evaluate` takes >30 seconds to respond
- Browser times out
- Prescribers can't get clinical decisions

**Root Cause (Common):**
- Database query taking too long (N+1 problem)
- Memory leak eating RAM
- Network latency to rule store

**Fix (< 5 minutes):**

```bash
# 1. Check server logs for slow query warnings
tail -n 50 /var/log/cortex/app.log | grep "SLOW_QUERY\|took.*ms"

# 2. Restart the API server (hard reset)
sudo systemctl restart cortex-api

# 3. Monitor response time
watch 'time curl -s http://localhost:3000/api/cds/evaluate \
  -H "Content-Type: application/json" \
  -d "{\"medication\":\"rivaroxaban\",\"patient\":{\"creatinineClearance\":50}}" > /dev/null'

# If still slow, check database
psql -U cortex_user -d cortex_pilot -c \
  "SELECT query, mean_exec_time FROM pg_stat_statements \
   ORDER BY mean_exec_time DESC LIMIT 5;"

# If a query is taking >1000ms, that's the problem.
# Post to Slack: #ops-emergency with slow query details.
```

---

## 3. ROLLBACK PROCEDURES

### Full Deployment Rollback (Nuclear Option)

**When to use:** System is severely broken and nothing else works

**Time to recover:** 5-15 minutes depending on data size

```bash
# 1. Identify the last good deployment tag
git tag --list | grep "mvp-cortex" | sort -V | tail -5

# Output should show:
# mvp-cortex-v1.0-0200-baseline
# mvp-cortex-v1.0-0201-safety-fix
# mvp-cortex-v1.0-0202-broken ← DON'T USE THIS ONE
# mvp-cortex-v1.0-0201-safety-fix ← GOOD ONE

# 2. Checkout the last good tag
git checkout mvp-cortex-v1.0-0201-safety-fix

# 3. Rebuild and restart
pnpm install && pnpm build
sudo systemctl restart cortex-api cortex-governance-logger

# 4. Verify health
curl http://localhost:3000/api/health | jq '.status'

# 5. Check that no events are lost
psql -U cortex_user -d cortex_pilot \
  -c "SELECT COUNT(*) as event_count FROM governance_event \
      WHERE created_at > NOW() - INTERVAL 1 hour;"

# 6. Post incident summary
echo "ROLLBACK COMPLETE: Reverted to mvp-cortex-v1.0-0201-safety-fix" | \
  curl -X POST -d @- https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

---

### Database Rollback (For Data Corruption)

**When to use:** Governance events were written incorrectly; patient data corrupted

**Warning:** This is destructive. Only do this if you have a recent backup.

```bash
# 1. Create backup of corrupted state (for forensics)
pg_dump -U cortex_user cortex_pilot > /backups/cortex_corrupted_$(date +%s).sql

# 2. Restore from backup
psql -U cortex_user cortex_pilot < /backups/cortex_pilot_2026-02-11_0800.sql

# 3. Verify restore
psql -U cortex_user -d cortex_pilot -c "SELECT COUNT(*) FROM patient;"

# 4. Restart app to clear caches
sudo systemctl restart cortex-api

# 5. Document incident
cat > /ops/incident_$(date +%Y%m%d_%H%M%S).log << 'EOF'
INCIDENT: Database Corruption
Rollback Source: cortex_pilot_2026-02-11_0800.sql
Data Loss: Events from 0800 to [now]
Root Cause: [Investigation in progress]
Contact: Ruth Delgado (Legal), Dr. Elena García (CMO)
EOF
```

---

## 4. KILL SWITCH: Emergency Disable DOAC Engine

### Scenario: System is Harming Patients (Catastrophic Failure)

**Time to execute:** < 30 seconds

**Do this if:**
- System blocks safe prescriptions (false positives)
- System passes contraindicated drugs (false negatives)
- Any unrecoverable clinical safety issue

```bash
# KILL SWITCH: Disable DOAC rule engine globally
psql -U cortex_user -d cortex_pilot << 'EOF'
-- Disable the DOAC Safety Engine (all rules return PASS)
UPDATE system_config
SET enabled = false
WHERE rule_engine = 'doac_safety_v1'
AND status = 'active';

-- Log the kill switch activation
INSERT INTO governance_event
(patient_id_hashed, event, action, actor, resource, legal_basis, timestamp, metadata)
VALUES
(
  'SYSTEM_EVENT_KILLSWITCH',
  'DOAC_ENGINE_DISABLED',
  'EMERGENCY_OVERRIDE',
  'ops-archie-emergency',
  'doac-safety-engine',
  'EMERGENCY_PATIENT_SAFETY',
  NOW(),
  jsonb_build_object(
    'reason', 'Clinical safety incident - system disabled for patient protection',
    'timestamp_activated', NOW(),
    'authorization', 'On-call CMO verbal authorization'
  )
);

-- Verify kill switch is active
SELECT enabled, modified_at FROM system_config
WHERE rule_engine = 'doac_safety_v1';
EOF

echo "🔴 KILL SWITCH ACTIVATED: DOAC Engine DISABLED"
echo "All /api/cds/evaluate calls will now return PASS (no blocking)"
echo "Contact: Dr. Elena García (CMO) - Emergency Response"
```

**After Kill Switch:**

1. **Immediately notify:**
   - Dr. Elena García (CMO): elena@holilab.bo | +591-2-XXXXX
   - Victor Mercado (CFO): victor@holilab.bo | +591-2-XXXXX
   - Ruth Delgado (Counsel): ruth@holilab.bo | +591-2-XXXXX

2. **Continue operations manually:**
   - Prescribers can still issue DOAC prescriptions (no blocking)
   - Every prescription must be manually reviewed by clinic pharmacist
   - Document all manual reviews in incident log

3. **Recovery steps:**
   ```bash
   # Only re-enable after Root Cause Analysis is complete
   # and fix is deployed (see Incident Type 1 above)

   psql -U cortex_user -d cortex_pilot << 'EOF'
   UPDATE system_config
   SET enabled = true
   WHERE rule_engine = 'doac_safety_v1';
   EOF
   ```

---

## 5. ESCALATION CONTACTS

### On-Call Rotation (2026-02-11 to 2026-02-18)

| Role | Name | Phone | Email | Slack |
|------|------|-------|-------|-------|
| **On-Call CMO** | Dr. Elena García | +591-2-4444-4444 | elena@holilab.bo | @elena |
| **On-Call CFO** | Victor Mercado | +591-2-5555-5555 | victor@holilab.bo | @victor |
| **On-Call Counsel** | Ruth Delgado | +591-2-6666-6666 | ruth@holilab.bo | @ruth |
| **On-Call Ops** | Archie Martinez | +591-2-7777-7777 | archie@holilab.bo | @archie |

---

### Escalation Decision Tree

```
START: Something is broken

├─ Is it a response time issue?
│  ├─ YES → Try restart API (Section 2, Incident Type 4)
│  └─ NO → Continue
│
├─ Are governance events not logging?
│  ├─ YES → Restart logging service (Section 2, Incident Type 2)
│  └─ NO → Continue
│
├─ Is the DOAC engine blocking all patients?
│  ├─ YES → Reload rules (Section 2, Incident Type 1)
│  └─ NO → Continue
│
├─ Is a single patient reporting a false BLOCK?
│  ├─ YES → Check rule threshold (Section 2, Incident Type 3)
│  └─ NO → Continue
│
└─ Is it something else?
   ├─ Post to #ops-emergency Slack channel
   ├─ Page on-call CMO (Elena)
   └─ Follow incident response checklist (Section 6)
```

---

## 6. POST-INCIDENT CHECKLIST

### After Any Outage / Incident

```bash
# 1. Confirm system is healthy
curl http://localhost:3000/api/health | jq '.status'  # Should be "healthy"

# 2. Count events lost (if any)
psql -U cortex_user -d cortex_pilot -c \
  "SELECT COUNT(*) as recent_events FROM governance_event \
   WHERE created_at > NOW() - INTERVAL 1 hour;"

# 3. Notify stakeholders
cat > /tmp/incident_summary.txt << 'EOF'
INCIDENT SUMMARY
Duration: [HH:MM to HH:MM]
Affected Patients: [N]
Events Lost: [N]
Root Cause: [Brief description]
Resolution: [What was done]
Post-Mortem: [Scheduled for YYYY-MM-DD HH:MM]
EOF

# Send to: elena@holilab.bo, victor@holilab.bo, ruth@holilab.bo

# 4. Document in incident log
cp /tmp/incident_summary.txt /ops/incidents/incident_$(date +%Y%m%d_%H%M%S).log

# 5. Schedule post-mortem meeting
# Attendees: CMO, CFO, Ops Lead, Engineering Lead
# Duration: 1 hour
# Topics:
#   - What failed?
#   - Why did it fail?
#   - How do we prevent it next time?

# 6. Create follow-up tickets for root cause fixes
# Example: "Add monitoring for slow queries (Incident 2026-02-11)"
```

---

## APPENDIX: Quick Reference Commands

### Health Check (Copy/Paste)
```bash
curl -s http://localhost:3000/api/health | jq .
```

### Test a Known-Safe Patient
```bash
curl -X POST http://localhost:3000/api/cds/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"medication":"rivaroxaban","patient":{"creatinineClearance":80,"age":60,"weight":75}}'
```

### Test a Known-Contraindicated Patient
```bash
curl -X POST http://localhost:3000/api/cds/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"medication":"rivaroxaban","patient":{"creatinineClearance":20,"age":70,"weight":50}}'
```

### Check Governance Events (Last Hour)
```bash
psql -U cortex_user -d cortex_pilot -c \
  "SELECT event, actor, COUNT(*) FROM governance_event \
   WHERE created_at > NOW() - INTERVAL 1 hour \
   GROUP BY event, actor ORDER BY COUNT(*) DESC;"
```

### Restart Everything (Hard Reset)
```bash
sudo systemctl restart cortex-api cortex-governance-logger
sleep 5
curl http://localhost:3000/api/health | jq '.status'
```

---

## SIGN-OFF

**Reviewed by:** Archie Martinez, VP Operations
**Date:** 2026-02-11
**Approval:** ✅ APPROVED FOR PRODUCTION

**This runbook is ready for deployment. Keep it close.**

*Last updated: 2026-02-11*
*Next review: 2026-03-11*
