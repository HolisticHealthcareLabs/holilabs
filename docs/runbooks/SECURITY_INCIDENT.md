# Incident Runbook: Security Incident

**Severity**: P1 (Critical) - P2 (High)
**Alert Name**: `SecurityAlert` / `UnauthorizedAccess` / `SuspiciousActivity`
**Alert Trigger**: Various security monitoring alerts
**PagerDuty**: Auto-pages on-call + security team
**Expected Response Time**: <15 minutes

---

## Overview

A security incident involves unauthorized access, suspicious activity, or potential compromise of the healthcare platform. Due to HIPAA requirements, all security incidents involving PHI must be treated as potential breaches until proven otherwise.

**CRITICAL**: 60-day HIPAA breach notification clock starts immediately if PHI is accessed, acquired, or disclosed improperly.

---

## Immediate Actions (0-10 minutes)

### 1. DO NOT PANIC - Follow Protocol

- [ ] Acknowledge alert
- [ ] Post in Slack `#security-incidents` (private channel)
- [ ] DO NOT discuss publicly or in `#general`
- [ ] Alert security team and compliance officer

### 2. Preserve Evidence

**CRITICAL: DO NOT delete logs or modify systems**

```bash
# Take snapshot of current state
docker ps > /security-logs/incident-$(date +%Y%m%d-%H%M%S)-containers.txt
docker logs holi-web > /security-logs/incident-$(date +%Y%m%d-%H%M%S)-api.log
docker logs holi-postgres > /security-logs/incident-$(date +%Y%m%d-%H%M%S)-db.log

# Export recent audit logs
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "COPY (SELECT * FROM audit_logs WHERE created_at > now() - interval '24 hours') 
   TO STDOUT CSV HEADER" > /security-logs/incident-$(date +%Y%m%d-%H%M%S)-audit.csv

# Capture network connections
netstat -an > /security-logs/incident-$(date +%Y%m%d-%H%M%S)-netstat.txt

# Copy all logs to secure S3 bucket (versioned, append-only)
aws s3 cp /security-logs/ s3://holi-security-logs/$(date +%Y%m%d-%H%M%S)/ --recursive
```

### 3. Initial Assessment

Answer these questions immediately:

- [ ] What triggered the alert?
- [ ] Is this a false positive?
- [ ] Is the system currently under active attack?
- [ ] Is PHI potentially compromised?
- [ ] Who is the suspected threat actor (IP address, user account)?

---

## Incident Classification

### Type A: Unauthorized Access Attempt (Failed)

**Symptoms**:
- Multiple failed login attempts
- Rate limiting triggered
- Audit logs show access denied entries
- No evidence of successful unauthorized access

**Severity**: P2 (High) - Monitoring required
**HIPAA Breach**: NO (no PHI accessed)

**Steps**:
```bash
# Check failed login attempts
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT user_email, ip_address, count(*), max(created_at)
   FROM audit_logs 
   WHERE action = 'LOGIN'
   AND success = false
   AND created_at > now() - interval '1 hour'
   GROUP BY user_email, ip_address
   HAVING count(*) > 10
   ORDER BY count(*) DESC;"

# Check if attacker tried multiple accounts
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT ip_address, count(DISTINCT user_email) as attempted_users
   FROM audit_logs
   WHERE action = 'LOGIN' 
   AND success = false
   AND created_at > now() - interval '1 hour'
   GROUP BY ip_address
   HAVING count(DISTINCT user_email) > 5;"
```

**Response**:
```bash
# Block attacking IP at application level
# Add to rate limit blacklist
redis-cli SADD blocked_ips "192.168.1.100"

# Or temporarily block at firewall level
# (depends on infrastructure)

# Force password reset for targeted accounts (if credential stuffing suspected)
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "UPDATE users SET password_reset_required = true 
   WHERE email IN (SELECT DISTINCT user_email FROM audit_logs 
                   WHERE action = 'LOGIN' AND success = false
                   AND created_at > now() - interval '1 hour');"
```

**Timeline**: 15-30 minutes
**Follow-up**: Monitor for 24 hours, review logs daily for 1 week

---

### Type B: Successful Unauthorized Access

**Symptoms**:
- Unusual login from unexpected location
- Access at unusual time (3 AM for 9-5 user)
- Multiple sessions from different IPs simultaneously
- Audit logs show successful login but suspicious activity

**Severity**: P1 (Critical)
**HIPAA Breach**: LIKELY (assume yes until proven otherwise)

**IMMEDIATE ACTIONS**:
```bash
# 1. Identify compromised account
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT user_id, user_email, ip_address, created_at, details
   FROM audit_logs
   WHERE user_id = '<suspicious-user-id>'
   AND created_at > now() - interval '24 hours'
   ORDER BY created_at DESC;"

# 2. IMMEDIATELY disable account
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "UPDATE users SET active = false, 
                    security_incident_flag = true,
                    security_incident_timestamp = now()
   WHERE id = '<user-id>';"

# 3. Terminate all sessions for that user
redis-cli KEYS "session:user:<user-id>:*" | xargs redis-cli DEL

# 4. Identify what PHI was accessed
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT action, resource, resource_id, created_at
   FROM audit_logs
   WHERE user_id = '<user-id>'
   AND action IN ('READ', 'VIEW', 'EXPORT')
   AND created_at > '<first-unauthorized-access-timestamp>'
   ORDER BY created_at ASC;"

# 5. Count affected patients
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT count(DISTINCT resource_id) as affected_patients
   FROM audit_logs
   WHERE user_id = '<user-id>'
   AND resource = 'Patient'
   AND action IN ('READ', 'VIEW', 'EXPORT')
   AND created_at > '<first-unauthorized-access-timestamp>';"
```

**Timeline**: URGENT - 10-20 minutes
**Escalation**: Immediate - notify legal counsel and compliance officer

---

### Type C: Data Exfiltration / Mass Export

**Symptoms**:
- Unusual export operations
- Large data transfers detected
- Multiple patient records accessed rapidly
- API endpoints called at high rate

**Severity**: P1 (Critical)
**HIPAA Breach**: YES - Assumed breach

**CRITICAL RESPONSE**:
```bash
# 1. Identify export operations
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT user_id, user_email, count(*) as export_count,
          count(DISTINCT resource_id) as unique_patients,
          min(created_at) as first_export,
          max(created_at) as last_export
   FROM audit_logs
   WHERE action = 'EXPORT'
   AND created_at > now() - interval '24 hours'
   GROUP BY user_id, user_email
   ORDER BY export_count DESC;"

# 2. IMMEDIATELY disable all export functionality
# (Emergency feature flag)
docker exec holi-redis redis-cli SET emergency:disable_exports "true"

# 3. Block API endpoints
# Add rate limit of 0 for export endpoints
# OR deploy emergency hotfix to disable routes

# 4. Identify if data left the system
# Check S3 access logs, email logs, API logs
aws s3api get-object --bucket holi-exports --key <suspicious-file>

# 5. Get list of all affected patients
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "COPY (
    SELECT DISTINCT p.id, p.first_name, p.last_name, p.date_of_birth
    FROM patients p
    JOIN audit_logs al ON al.resource_id::uuid = p.id
    WHERE al.user_id = '<suspicious-user-id>'
    AND al.action = 'EXPORT'
    AND al.created_at > '<incident-start-time>'
  ) TO STDOUT CSV HEADER" > /security-logs/affected-patients.csv
```

**Immediate Escalation**:
- CEO / Executive team
- Legal counsel
- HIPAA compliance officer
- Law enforcement (if criminal activity suspected)

**HIPAA Notification Clock**: STARTED - 60 days to notify patients

**Timeline**: 30-60 minutes for containment
**Investigation**: Days to weeks

---

### Type D: System Compromise / Malware

**Symptoms**:
- Unexpected processes running
- Unusual network traffic
- Files modified unexpectedly
- Backdoors discovered
- Ransomware indicators

**Severity**: P1 (Critical)
**HIPAA Breach**: ASSUME YES (complete system compromise)

**EMERGENCY RESPONSE**:
```bash
# 1. ISOLATE affected systems immediately
# Disconnect from network if necessary
docker network disconnect <network-name> <container-name>

# 2. DO NOT shut down - preserve evidence in memory
# Instead, take memory dump if possible

# 3. Check for suspicious processes
docker exec holi-web ps aux

# 4. Check for modified files
docker exec holi-web find /app -type f -mtime -1

# 5. Check for backdoors
docker exec holi-web netstat -tulpn

# 6. Check for unauthorized users
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT * FROM users WHERE created_at > now() - interval '24 hours';"
```

**CRITICAL DECISION**: 
- **Option A**: Take entire system offline (prevents further damage but disrupts care)
- **Option B**: Isolate compromised component (preserves some functionality)

**Decision Maker**: CTO + CISO + Clinical Leadership

**Next Steps**:
- Engage forensics team
- Preserve all evidence
- Prepare for potential ransomware demand
- Activate disaster recovery plan
- Consider law enforcement involvement

**Timeline**: Hours to days for containment
**Recovery**: Weeks

---

## HIPAA Breach Assessment

If PHI was potentially compromised, answer these questions:

### 1. Was PHI Accessed?
```bash
# Check audit logs for PHI access
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT count(*) FROM audit_logs
   WHERE user_id = '<suspicious-user-id>'
   AND resource IN ('Patient', 'Encounter', 'Prescription')
   AND action IN ('READ', 'VIEW', 'EXPORT')
   AND created_at BETWEEN '<incident-start>' AND '<incident-end>';"
```

### 2. How Many Patients Affected?
```bash
# Count distinct patients
docker exec holi-postgres psql -U holi -d holi_protocol -c \
  "SELECT count(DISTINCT resource_id) FROM audit_logs
   WHERE user_id = '<suspicious-user-id>'
   AND resource = 'Patient'
   AND created_at BETWEEN '<incident-start>' AND '<incident-end>';"
```

### 3. What PHI Was Accessed?
- [ ] Names
- [ ] Addresses
- [ ] Dates of birth
- [ ] Medical record numbers
- [ ] Diagnoses
- [ ] Lab results
- [ ] Prescriptions
- [ ] Social security numbers
- [ ] Financial information

### 4. Breach Threshold
- **<500 individuals**: Report to HHS within 60 days (annual report)
- **≥500 individuals**: Report to HHS within 60 days (immediate individual report)
- **Also notify patients within 60 days**

---

## Communication

### Internal (Immediate)
```
🔴 SECURITY INCIDENT
Classification: [Type A/B/C/D]
Severity: P1
PHI Compromised: [YES/NO/UNKNOWN]
Affected Patients: [Number or UNKNOWN]
Status: Under investigation
Next update: [Timestamp]
RESTRICTED - DO NOT SHARE OUTSIDE SECURITY TEAM
```

### External (If Breach Confirmed)
**HOLD EXTERNAL COMMUNICATION** until cleared by:
- Legal counsel
- Compliance officer
- Executive team

**DO NOT**:
- Post on social media
- Issue press releases
- Contact patients
Until breach assessment is complete and legal review is done

---

## Evidence Collection Checklist

- [ ] All system logs exported and secured
- [ ] Audit logs for last 30 days exported
- [ ] Database backup taken
- [ ] Screenshots of suspicious activity
- [ ] Network packet captures (if available)
- [ ] List of affected user accounts
- [ ] List of affected patient records
- [ ] Timeline of events documented
- [ ] All evidence stored in secure, tamper-proof location

---

## Post-Incident Actions

### Within 24 Hours
- [ ] Complete initial breach assessment
- [ ] Notify compliance officer
- [ ] Brief executive team
- [ ] Engage legal counsel
- [ ] Determine if law enforcement should be notified

### Within 3 Days
- [ ] Complete forensic investigation
- [ ] Determine breach notification requirements
- [ ] Draft patient notification letters (if needed)
- [ ] Prepare HHS breach report (if needed)
- [ ] Create detailed incident timeline

### Within 60 Days (If Breach)
- [ ] Notify affected individuals
- [ ] Submit breach report to HHS
- [ ] Notify media (if >500 individuals in single state)
- [ ] Complete post-mortem
- [ ] Implement security improvements

---

## Prevention Measures

### Access Controls
- Enforce MFA for all users
- Implement role-based access control (RBAC)
- Principle of least privilege
- Regular access reviews (quarterly)

### Monitoring
- 24/7 security monitoring
- Automated alerting on suspicious patterns
- Failed login attempt tracking
- Unusual access pattern detection

### Audit Trail
- Complete audit log for all PHI access (HIPAA requirement)
- Tamper-proof audit logs
- 6-year retention
- Regular audit log reviews

### Training
- Annual HIPAA security training
- Phishing awareness training
- Incident response drills (quarterly)

---

## Escalation Contacts

**Security Team**:
- On-Call Security Engineer: PagerDuty
- CISO: [Email/Phone]

**Legal/Compliance**:
- HIPAA Compliance Officer: [Email/Phone]
- Legal Counsel: [Email/Phone]

**Executive**:
- CTO: [Email/Phone]
- CEO: [Email/Phone]

**External**:
- Forensics Team: [Contact]
- Cyber Insurance: [Policy #, Phone]
- FBI Cyber Division: 1-800-CALL-FBI

---

**Last Updated**: 2026-01-02
**Last Security Incident**: N/A
**Average Resolution Time**: Varies by type (15 min - weeks)
**Last Security Audit**: [Date]
