# Runbook: Security Incident Response

**Severity:** Critical (P0) - Variable based on incident type
**Expected Resolution Time:** Variable (30 min - 72 hours)
**On-Call Required:** Yes + Security Team

⚠️ **HIPAA COMPLIANCE CRITICAL**: All security incidents involving PHI must be reported within 60 days

---

## Incident Classification

### Severity Levels

| Level | Description | Examples | Response Time |
|-------|-------------|----------|---------------|
| **P0 - Critical** | Active PHI breach or system compromise | Database breach, ransomware, active unauthorized access | Immediate (24/7) |
| **P1 - High** | Potential PHI exposure or vulnerability | SQL injection attempt, failed access control, suspicious login pattern | <15 minutes |
| **P2 - Medium** | Security control failure without PHI exposure | DDoS attack, failed encryption, audit log tampering | <1 hour |
| **P3 - Low** | Security anomaly requiring investigation | Unusual traffic pattern, failed login attempts | <4 hours |

---

## Immediate Actions (First 5 Minutes)

### 1. STOP - DO NOT PANIC
- **DO NOT** delete logs or evidence
- **DO NOT** restart systems before taking forensic snapshots
- **DO NOT** communicate about the incident via compromised systems
- **DO** use secure out-of-band communication (phone, personal device)

### 2. Declare Incident & Assemble Response Team
```bash
# Start incident timer
echo "Security Incident Start: $(date)" > /tmp/security-incident-$(date +%Y%m%d-%H%M%S).log

# Page security team
# PagerDuty: Escalate to "Security Incident" policy

# Secure communication channel
# Use: Personal phone, Signal, or dedicated war room
```

**Response Team:**
- Incident Commander (On-call engineer)
- Security Lead
- Database Administrator
- Legal/Compliance Officer (if PHI involved)
- CEO/CTO (for P0 incidents)

### 3. Preserve Evidence
```bash
# Take forensic snapshot of affected systems
# DigitalOcean
doctl compute snapshot create <droplet-id> --snapshot-name "forensic-$(date +%Y%m%d-%H%M%S)"

# AWS
aws ec2 create-snapshot --volume-id <volume-id> --description "Forensic snapshot $(date)"

# Copy critical logs immediately
tar -czf /tmp/forensic-logs-$(date +%Y%m%d-%H%M%S).tar.gz \
  /var/log/holi-api/*.log \
  /var/log/nginx/*.log \
  /var/log/auth.log \
  /var/log/syslog

# Upload to secure location
aws s3 cp /tmp/forensic-logs-*.tar.gz s3://holi-forensics/
```

---

## Incident Types & Response Procedures

### Type 1: Unauthorized Access to PHI

**Symptoms:**
- Unusual database queries accessing patient data
- Suspicious API calls to patient endpoints
- Failed authorization attempts followed by success
- Audit logs showing unauthorized access

**Immediate Response:**
```bash
# 1. Identify the breach scope
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    \"userId\",
    action,
    resource,
    \"resourceId\",
    timestamp,
    \"ipAddress\"
  FROM \"AuditLog\"
  WHERE resource = 'Patient'
  AND action = 'READ'
  AND timestamp > NOW() - INTERVAL '24 hours'
  ORDER BY timestamp DESC;
"

# 2. Identify affected patients
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT DISTINCT \"resourceId\", count(*)
  FROM \"AuditLog\"
  WHERE \"userId\" = '<suspicious-user-id>'
  AND resource = 'Patient'
  GROUP BY \"resourceId\";
"

# 3. Immediately revoke suspicious user access
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  UPDATE \"User\"
  SET \"accountLocked\" = true,
      \"lockReason\" = 'Security incident investigation'
  WHERE id = '<suspicious-user-id>';
"

# 4. Invalidate all sessions for the user
redis-cli DEL "session:user:<user-id>:*"

# 5. Block IP address at firewall level
sudo ufw deny from <suspicious-ip>
# or Cloudflare: Add IP to WAF block list
```

**HIPAA Breach Notification Requirements:**
If >500 patients affected OR highly sensitive PHI (HIV, mental health, substance abuse):
1. Notify HHS within **60 days**
2. Notify affected individuals within **60 days**
3. Notify media if >500 individuals in same state/jurisdiction

See: [HIPAA Breach Notification Runbook](./hipaa-breach-notification.md)

---

### Type 2: SQL Injection Attempt

**Symptoms:**
- Sentry alerts with SQL syntax in request parameters
- WAF (Cloudflare) blocking SQL injection patterns
- Database errors with unusual query syntax
- Audit logs showing failed queries with SQL keywords

**Immediate Response:**
```bash
# 1. Check recent SQL injection attempts
grep -i "union\|select\|drop\|insert\|--\|;--" /var/log/nginx/access.log | tail -20

# 2. Check if any succeeded
tail -100 /var/log/holi-api/error.log | grep -i "prisma\|sql\|query"

# 3. Block attacker IP immediately
ATTACKER_IP=$(grep -i "union\|select" /var/log/nginx/access.log | tail -1 | awk '{print $1}')
sudo ufw deny from $ATTACKER_IP

# Cloudflare: Add IP to firewall rules
# Dashboard > Security > WAF > Tools > IP Access Rules

# 4. Check if Prisma parameterized queries were used (should prevent SQL injection)
# Review code for any raw SQL queries

# 5. Verify no data was exfiltrated
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT query_start, query, state
  FROM pg_stat_activity
  WHERE query NOT LIKE '%pg_stat_activity%'
  AND query_start > NOW() - INTERVAL '1 hour';
"
```

**Code Review:**
```typescript
// BAD: SQL Injection vulnerable
const userId = req.query.id;
const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${userId}`;

// GOOD: Prisma parameterized query (safe)
const userId = req.query.id;
const result = await prisma.user.findUnique({ where: { id: userId } });
```

---

### Type 3: Ransomware / Malware

**Symptoms:**
- Files encrypted with unusual extensions (.locked, .encrypted)
- Ransom note file (README.txt, HOW_TO_DECRYPT.txt)
- High CPU usage from unknown processes
- Unusual network traffic to unknown IPs

**Immediate Response:**
```bash
# 1. ISOLATE IMMEDIATELY - disconnect from network
sudo ip link set eth0 down

# 2. DO NOT PAY RANSOM
# Contact FBI/local law enforcement

# 3. Identify patient data impact
# Check if database files are encrypted
ls -la /var/lib/postgresql/14/main/base/

# 4. Initiate disaster recovery
# See: Backup Restoration Runbook
```

**Recovery:**
1. Restore from clean backup (see Backup Restoration runbook)
2. Rotate ALL credentials
3. Rebuild affected systems from scratch
4. Conduct forensic analysis to determine entry point
5. Notify authorities and affected patients (if PHI compromised)

---

### Type 4: DDoS Attack

**Symptoms:**
- Massive traffic spike in monitoring
- High CPU/memory usage
- Application unresponsive
- Cloudflare showing high request rate

**Immediate Response:**
```bash
# 1. Enable Cloudflare "Under Attack Mode"
# Dashboard > Security > Settings > Under Attack Mode

# 2. Check attack patterns
# Cloudflare > Analytics > Security

# 3. Add rate limiting rules
# Cloudflare > Security > WAF > Rate Limiting Rules
# Example: Block IPs with >100 requests/minute

# 4. Enable DDoS mitigation
# Cloudflare > DDoS > HTTP DDoS attack protection

# 5. Monitor application recovery
watch -n 5 'curl -I https://api.holilabs.xyz/api/health'
```

---

### Type 5: Compromised Credentials

**Symptoms:**
- Unusual login from new location/device
- Failed login attempts followed by success
- API key usage from unexpected IP
- Alerts from password breach monitoring

**Immediate Response:**
```bash
# 1. Force logout all sessions for affected user
redis-cli KEYS "session:user:<user-id>:*" | xargs redis-cli DEL

# 2. Lock account
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  UPDATE \"User\"
  SET \"accountLocked\" = true,
      \"lockReason\" = 'Compromised credentials - contact security team'
  WHERE id = '<user-id>';
"

# 3. Force password reset
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  UPDATE \"User\"
  SET \"passwordResetRequired\" = true
  WHERE id = '<user-id>';
"

# 4. Review all actions by compromised account
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT * FROM \"AuditLog\"
  WHERE \"userId\" = '<user-id>'
  AND timestamp > '<suspected-compromise-time>'
  ORDER BY timestamp DESC;
"

# 5. Notify user via phone (not email - may be compromised)
```

---

## Forensic Analysis

### Collect Evidence

```bash
# System information
uname -a > /tmp/forensic/system-info.txt
uptime >> /tmp/forensic/system-info.txt

# Active processes
ps auxf > /tmp/forensic/processes.txt

# Network connections
netstat -tulpn > /tmp/forensic/network-connections.txt
ss -tulpn >> /tmp/forensic/network-connections.txt

# Recent logins
last -20 > /tmp/forensic/recent-logins.txt
lastlog > /tmp/forensic/lastlog.txt

# Audit logs
cp /var/log/holi-api/*.log /tmp/forensic/
cp /var/log/nginx/*.log /tmp/forensic/
cp /var/log/auth.log /tmp/forensic/
cp /var/log/syslog /tmp/forensic/

# Database query logs
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  COPY (
    SELECT * FROM \"AuditLog\"
    WHERE timestamp > NOW() - INTERVAL '7 days'
  ) TO STDOUT CSV HEADER
" > /tmp/forensic/audit-logs.csv

# Package forensics
tar -czf /tmp/forensic-evidence-$(date +%Y%m%d-%H%M%S).tar.gz /tmp/forensic/

# Calculate hash for integrity
sha256sum /tmp/forensic-evidence-*.tar.gz > /tmp/forensic-evidence.sha256
```

---

## Recovery Steps

### 1. Containment
- Isolate affected systems
- Block attacker access
- Revoke compromised credentials

### 2. Eradication
- Remove malware/backdoors
- Patch vulnerabilities
- Close security gaps

### 3. Recovery
- Restore from clean backups
- Rebuild compromised systems
- Verify data integrity

### 4. Lessons Learned
- Conduct post-mortem
- Update security controls
- Train team on new threats

---

## HIPAA Breach Assessment

Use this checklist to determine if HIPAA breach notification is required:

- [ ] Was PHI accessed, acquired, used, or disclosed?
- [ ] Was the access unauthorized?
- [ ] Is there significant risk of harm to individuals?
- [ ] How many individuals affected? (<500 or ≥500)
- [ ] Type of PHI: Identifiers (name, SSN, DOB, address, etc.)?
- [ ] Likelihood of PHI compromise?
- [ ] Mitigation measures in place? (encryption, etc.)

If YES to breach, follow: [HIPAA Breach Notification Runbook](./hipaa-breach-notification.md)

---

## Post-Incident Actions

### Required Documentation

```markdown
## Security Incident Report

**Incident ID:** SEC-YYYY-MM-DD-NNN
**Date/Time:** YYYY-MM-DD HH:MM UTC
**Severity:** P0/P1/P2/P3
**Type:** [Unauthorized Access/SQL Injection/DDoS/etc.]

### Summary
[Brief description of what happened]

### Timeline
- HH:MM: Incident detected
- HH:MM: Response team assembled
- HH:MM: Containment measures applied
- HH:MM: Incident resolved

### Impact Assessment
- Systems affected: [List]
- Data compromised: [YES/NO - if yes, describe]
- Patient records accessed: [Count]
- Duration of exposure: [Time]

### Root Cause
[Detailed analysis of how the incident occurred]

### Resolution
[Steps taken to resolve the incident]

### Preventive Measures
- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Action item 3]

### HIPAA Breach Determination
- [ ] Breach occurred: YES/NO
- [ ] Notification required: YES/NO
- [ ] HHS notification filed: [Date]
- [ ] Patient notification sent: [Date]
```

---

## Prevention

### Security Monitoring Alerts

```yaml
# Prometheus AlertManager
- alert: SuspiciousDatabaseAccess
  expr: rate(audit_log_patient_access_total[5m]) > 100
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Suspicious database access pattern"

- alert: FailedLoginSpike
  expr: rate(auth_failed_login_total[1m]) > 10
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "High rate of failed login attempts"
```

---

## Escalation

**Immediate Contacts (Security Incident):**
1. Security Lead: [Contact]
2. Legal/Compliance Officer: [Contact]
3. CEO/CTO (P0 incidents): [Contact]
4. HIPAA Privacy Officer: [Contact]
5. Cyber Insurance Provider: [Policy #, Contact]
6. FBI Cyber Division: (855) 292-3937
7. HHS OCR: (202) 690-7807

---

## Related Runbooks
- [HIPAA Breach Notification](./hipaa-breach-notification.md)
- [Backup Restoration](./backup-restoration.md)
- [Key Rotation](./key-rotation.md)
- [Audit Log Review](./audit-log-review.md)

---

## Changelog
- **2024-01-07**: Initial version created
