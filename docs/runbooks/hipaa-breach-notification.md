# Runbook: HIPAA Breach Notification

**Severity:** Critical (P0) - Legal and compliance requirement
**Expected Resolution Time:** 60 days (legally mandated)
**On-Call Required:** Yes + Legal/Compliance Team + Executive Leadership

⚠️ **CRITICAL**: HIPAA requires breach notification within **60 days** of discovery. Failure results in fines up to $1.5M per violation.

---

## What Constitutes a HIPAA Breach?

### Legal Definition (45 CFR §164.402)

A breach is an **impermissible use or disclosure** of protected health information (PHI) that:
1. Compromises the security or privacy of the PHI
2. Is NOT covered by an exception

### Breach vs. Non-Breach

#### ✅ These ARE Breaches:
- Database compromised, PHI exposed to unauthorized parties
- Stolen/lost laptop with unencrypted patient data
- Misdirected email containing PHI to wrong recipient
- Employee accessing patient records without authorization
- Ransomware encrypting patient database
- PHI exposed on public website or misconfigured S3 bucket

#### ❌ These are NOT Breaches (Exceptions):
- Unintentional disclosure to another authorized person at same organization
- Accidental disclosure where information cannot be retained
- Disclosure where covered entity has good faith belief recipient couldn't retain the information
- Encrypted PHI accessed (if encryption key not compromised)

---

## Breach Risk Assessment (First 30 Minutes)

Use this 4-factor test to determine if notification is required:

### 1. Nature and Extent of PHI Involved

```sql
-- Identify what PHI was exposed
SELECT
  COUNT(DISTINCT patient_id) AS affected_patients,
  COUNT(*) AS total_records_exposed,
  array_agg(DISTINCT data_type) AS phi_types_exposed
FROM breach_assessment
WHERE incident_id = '<incident-id>';
```

**PHI Types - Risk Level:**
- **High Risk**: SSN, financial info, diagnosis (HIV/mental health/substance abuse)
- **Medium Risk**: Name, address, DOB, medical record numbers
- **Low Risk**: Appointment dates only (no diagnosis/treatment)

### 2. Who Accessed the PHI?

**Risk Assessment:**
- **High Risk**: Public internet, malicious actor, competitor
- **Medium Risk**: Unauthorized employee, business associate
- **Low Risk**: Authorized employee at same organization (wrong patient)

```sql
-- Check who accessed the compromised data
SELECT
  "userId",
  u.email,
  u.role,
  COUNT(*) AS access_count,
  MIN(a.timestamp) AS first_access,
  MAX(a.timestamp) AS last_access
FROM "AuditLog" a
JOIN "User" u ON a."userId" = u.id
WHERE a."resourceId" IN (<list-of-affected-patient-ids>)
AND a.timestamp BETWEEN '<incident-start>' AND '<incident-end>'
GROUP BY "userId", u.email, u.role
ORDER BY access_count DESC;
```

### 3. Was PHI Actually Acquired/Viewed?

**Evidence to Collect:**
- Audit logs showing READ operations
- Server access logs showing data download
- Network traffic analysis
- Email logs (if PHI sent via email)

```sql
-- Check if data was actually accessed (not just exposed)
SELECT
  action,
  COUNT(*) AS action_count,
  array_agg(DISTINCT "userId") AS users_who_accessed
FROM "AuditLog"
WHERE "resourceId" IN (<affected-patient-ids>)
AND timestamp BETWEEN '<incident-start>' AND '<incident-end>'
AND action IN ('READ', 'EXPORT', 'DOWNLOAD')
GROUP BY action;
```

**Risk Assessment:**
- **High Risk**: Evidence of data acquisition (downloaded, copied, emailed)
- **Medium Risk**: Data was accessible but no evidence of acquisition
- **Low Risk**: Data exposed briefly, system logs show no access

### 4. Extent of Risk Mitigation

**Mitigating Factors:**
- Encryption: Was PHI encrypted at rest and in transit?
- Access controls: Were proper access controls in place?
- Response time: How quickly was breach contained?
- Data recovery: Was exposed data retrieved/deleted?

```markdown
**Mitigation Checklist:**
- [ ] PHI was encrypted (AES-256 or equivalent)
- [ ] Exposed data was quickly contained (<1 hour)
- [ ] Unauthorized party deleted/returned data
- [ ] Malicious actor was identified and prosecuted
- [ ] Technical safeguards were functioning properly
```

---

## Breach Determination Matrix

| Factor | Low Risk | Medium Risk | High Risk |
|--------|----------|-------------|-----------|
| **PHI Type** | Appointment dates only | Name, DOB, address | SSN, diagnosis, financial |
| **Who Accessed** | Authorized employee | Unauthorized employee | Public/malicious actor |
| **Actually Viewed?** | No evidence | Possibly viewed | Confirmed viewed/downloaded |
| **Mitigation** | Strong encryption | Some controls | No encryption |

### Decision:

**No Notification Required** (Low Risk - all factors):
- Limited PHI exposed
- No evidence of acquisition
- Strong encryption/controls in place
- Quickly contained

**Notification Required** (Any High Risk factor):
- Proceed with breach notification process
- Document decision with legal team

**Uncertain** (Medium Risk):
- Consult with legal counsel
- Consider breach notification to be safe
- Document risk assessment thoroughly

---

## Breach Notification Timeline

### Legally Mandated Deadlines (45 CFR §164.404-§164.408)

```markdown
## Breach Notification Timeline

**Day 0: Breach Discovery**
- Breach discovered or should have been discovered
- Clock starts ticking

**Day 0-1: Immediate Actions**
- [ ] Contain breach (stop data exposure)
- [ ] Preserve evidence (forensic snapshots, logs)
- [ ] Assemble breach response team
- [ ] Begin risk assessment

**Day 1-10: Investigation**
- [ ] Complete 4-factor risk assessment
- [ ] Determine breach scope (affected individuals)
- [ ] Consult legal counsel on notification requirement
- [ ] Draft breach notification content

**Day 10-30: Preparation**
- [ ] Identify all affected individuals (names, addresses)
- [ ] Prepare individual notification letters
- [ ] Prepare media notification (if >500 in state/jurisdiction)
- [ ] Prepare HHS notification

**Day 30-60: Notification (DEADLINE)**
- [ ] Send individual notifications (mail or email)
- [ ] Submit HHS notification via portal
- [ ] Media notification (if required)
- [ ] Document all notifications sent

**After Day 60: Documentation**
- [ ] Retain all breach documentation (6 years)
- [ ] Implement corrective actions
- [ ] Update policies/procedures
```

⚠️ **CRITICAL**: Missing the 60-day deadline can result in fines of **$100 - $50,000 per violation** (up to $1.5M per year).

---

## Required Notifications

### 1. Individual Notification (45 CFR §164.404)

**Who to Notify:**
- All individuals whose PHI was breached
- Next of kin or personal representative (if individual deceased/incapacitated)

**How to Notify:**
- **First choice**: Written notice by first-class mail
- **If <10 outdated addresses**: Phone call
- **If >10 outdated addresses**: Substitute notice (website + major media)
- **Imminent harm**: Expedited notice by phone

**Required Content:**
```markdown
## Breach Notification Letter Template

[Your Organization Letterhead]
[Date]

[Patient Name]
[Patient Address]

Re: Notice of Data Breach

Dear [Patient Name],

We are writing to inform you of a data breach that may have affected your protected health information (PHI).

**What Happened:**
[Brief description of breach incident]
On [date], we discovered that [description of what occurred, e.g., "an unauthorized individual gained access to our patient database"].

**What Information Was Involved:**
The following types of your information may have been accessed or acquired:
- [X] Name
- [X] Date of birth
- [X] Medical record number
- [X] Diagnosis/treatment information
- [ ] Social Security number
- [ ] Financial information
- [ ] Other: [specify]

**What We Are Doing:**
Upon discovery, we immediately:
- Contained the breach by [specific actions taken]
- Engaged cybersecurity experts to investigate
- Notified law enforcement [if applicable]
- Implemented additional security measures: [list measures]

**What You Can Do:**
We recommend you take the following steps to protect yourself:
1. Review your medical records for any unauthorized access
2. Monitor your Explanation of Benefits (EOB) statements
3. Review credit reports for suspicious activity
4. Consider placing a fraud alert or credit freeze [if SSN exposed]
5. Report any suspicious activity to us immediately

**Resources Available to You:**
- Free credit monitoring for [X] months [if applicable]
- Identity theft restoration services [if applicable]
- Dedicated call center: 1-800-XXX-XXXX (M-F 9am-5pm)

**For More Information:**
If you have questions, please contact our Privacy Officer:
- Phone: [phone number]
- Email: privacy@holilabs.xyz
- Mail: [mailing address]

You also have the right to file a complaint with:
- U.S. Department of Health and Human Services
  Office for Civil Rights
  Phone: 1-800-368-1019
  Website: https://www.hhs.gov/ocr/privacy/hipaa/complaints/

We sincerely apologize for this incident and any concern it may cause. We take the privacy and security of your information very seriously and are committed to protecting it.

Sincerely,

[Name]
[Title]
Holi Labs

---
This notice is required by the Health Insurance Portability and Accountability Act (HIPAA).
```

### 2. HHS Notification (45 CFR §164.408)

#### Breach Affecting ≥500 Individuals (Major Breach)
- **When**: Within **60 days** of breach discovery
- **How**: Online via HHS Breach Portal
- **Website**: https://ocrportal.hhs.gov/ocr/breach/wizard_breach.jsf

**Required Information:**
```markdown
## HHS Breach Report

**1. Covered Entity Information:**
- Name: Holi Labs Inc.
- Address: [address]
- Contact: [name, phone, email]

**2. Breach Discovery Date:** [MM/DD/YYYY]

**3. Breach Occurrence Date(s):** [MM/DD/YYYY - MM/DD/YYYY]

**4. Number of Individuals Affected:** [exact number]

**5. Type of Breach:**
- [ ] Theft
- [ ] Loss
- [ ] Improper disposal
- [ ] Unauthorized access/disclosure
- [ ] Hacking/IT incident
- [ ] Other: [specify]

**6. Location of Breach:**
- [ ] Desktop computer
- [ ] Laptop
- [ ] Network server
- [ ] Email
- [ ] Paper/films
- [ ] Other portable electronic device

**7. Type of PHI Involved:**
- [ ] Name
- [ ] Social Security number
- [ ] Date of birth
- [ ] Address
- [ ] Medical record number
- [ ] Diagnosis
- [ ] Treatment information
- [ ] Financial information
- [ ] Other: [specify]

**8. Safeguards in Place:**
[Description of encryption, access controls, etc.]

**9. Cause of Breach:**
[Detailed description of how breach occurred]

**10. Actions Taken:**
[Description of response, containment, mitigation]

**11. Business Associate Involved:** [Yes/No]
If yes: [BA name and contact information]
```

#### Breach Affecting <500 Individuals (Minor Breach)
- **When**: Annual report due by **March 1st** (for breaches in previous year)
- **How**: Online via HHS Breach Portal
- **Maintain log**: Keep internal log of all breaches <500 individuals

```sql
-- Maintain internal breach log
CREATE TABLE "BreachLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "discoveryDate" TIMESTAMP NOT NULL,
  "occurrenceDate" TIMESTAMP NOT NULL,
  "affectedIndividuals" INTEGER NOT NULL,
  "breachType" TEXT NOT NULL,
  "phiInvolved" JSONB NOT NULL,
  "description" TEXT NOT NULL,
  "mitigationActions" TEXT NOT NULL,
  "notificationDate" TIMESTAMP,
  "hHSReported" BOOLEAN DEFAULT false,
  "hHSReportDate" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

### 3. Media Notification (45 CFR §164.406)

**Required if:** ≥500 individuals in same state or jurisdiction

**How to Notify:**
- Prominent media outlet serving the affected state/jurisdiction
- Press release to major newspapers, TV stations
- Post on company website

**Timing:** Within **60 days** of breach discovery (same as individual notification)

**Content:**
```markdown
## Media Notification - Press Release

FOR IMMEDIATE RELEASE

**Holi Labs Announces Data Breach Affecting [Number] Individuals**

[City, State] - [Date] - Holi Labs Inc. today announced a data security incident that may have affected the protected health information (PHI) of approximately [number] individuals.

**What Happened:**
On [date], Holi Labs discovered that [brief description of incident]. The company immediately launched an investigation and engaged leading cybersecurity experts to determine the scope of the incident.

**Information Involved:**
The investigation determined that the following types of information may have been accessed:
- [List PHI types]

**Actions Taken:**
Upon discovery, Holi Labs took immediate action to:
- [Contain the breach]
- [Enhance security measures]
- [Notify affected individuals]

**Notification to Affected Individuals:**
Holi Labs is notifying all affected individuals by mail and is offering [credit monitoring/identity protection services] at no cost.

**Additional Information:**
Affected individuals can contact Holi Labs' dedicated call center:
- Phone: 1-800-XXX-XXXX
- Email: breach-response@holilabs.xyz
- Hours: Monday-Friday, 9:00 AM - 5:00 PM EST

Individuals also have the right to file a complaint with the U.S. Department of Health and Human Services Office for Civil Rights.

**Contact:**
[Name], [Title]
Holi Labs Inc.
[Phone]
[Email]
```

### 4. Business Associate Notification

**If breach caused by business associate:**
- BA must notify covered entity within **60 days**
- Covered entity then notifies individuals/HHS

**If Holi Labs is the covered entity and BA caused breach:**
```bash
# Request breach details from BA
cat > ba-breach-inquiry.txt <<EOF
Subject: Breach Notification Required

[Business Associate Name],

We have been informed of a potential data breach involving protected health information (PHI) for which you are a business associate under our Business Associate Agreement dated [date].

Under 45 CFR §164.410, you are required to notify us of this breach within 60 days of discovery.

Please provide the following information immediately:
1. Date of breach discovery
2. Date(s) of breach occurrence
3. Number of individuals affected
4. Types of PHI involved
5. Description of how breach occurred
6. Actions taken to mitigate and prevent future breaches

We need this information by [date] to comply with our HIPAA breach notification obligations.

[Your Name]
Privacy Officer
Holi Labs
EOF
```

---

## Breach Response Procedures

### Step 1: Immediate Containment (Day 0)
```bash
# See: Security Incident Response runbook for detailed procedures

# 1. Stop data exposure
# 2. Preserve forensic evidence
# 3. Assemble response team
# 4. Begin evidence collection
```

### Step 2: Risk Assessment (Days 1-10)
```bash
# Complete 4-factor risk assessment
# Consult with legal counsel
# Document decision to notify (or not notify)

# Generate breach assessment report
cat > breach-assessment-$(date +%Y%m%d).md <<EOF
# Breach Risk Assessment

**Incident ID:** INC-$(date +%Y%m%d-%H%M)
**Discovery Date:** $(date)
**Assessment Date:** $(date)

## 1. Nature and Extent of PHI

**PHI Types Involved:**
- [ ] Names
- [ ] Addresses
- [ ] Dates of birth
- [ ] Social Security numbers
- [ ] Medical record numbers
- [ ] Diagnosis/treatment information
- [ ] Financial information

**Number of Individuals Affected:** [count]

**Risk Level:** [Low / Medium / High]

## 2. Who Accessed PHI

**Unauthorized Party:**
- Type: [Employee / External malicious actor / Unknown]
- Identity: [If known]
- Access method: [Description]

**Risk Level:** [Low / Medium / High]

## 3. Actual Acquisition

**Evidence of Data Acquisition:**
- [ ] Audit logs show READ operations
- [ ] Data downloaded/exported
- [ ] Data sent via email
- [ ] No evidence of acquisition

**Risk Level:** [Low / Medium / High]

## 4. Mitigation

**Safeguards in Place:**
- [ ] PHI encrypted (AES-256)
- [ ] Access controls functioning
- [ ] Audit logging enabled

**Response Actions:**
- [ ] Breach contained within [X] hours
- [ ] Enhanced security measures implemented
- [ ] Law enforcement notified

**Risk Level:** [Low / Medium / High]

## Overall Risk Determination

**Combined Risk:** [Low / Medium / High]

**Breach Notification Required:** [YES / NO]

**Rationale:**
[Detailed explanation of decision]

**Legal Review:**
Reviewed by: [Attorney name]
Date: [Date]
Signature: __________________

EOF
```

### Step 3: Identify Affected Individuals (Days 10-20)
```sql
-- Query to identify all affected patients
SELECT
  p.id,
  p."firstName",
  p."lastName",
  p."dateOfBirth",
  p.email,
  p.phone,
  -- Decrypt address for mailing
  decrypt_phi(p.address) AS address
FROM "Patient" p
WHERE p.id IN (
  -- List of patient IDs involved in breach
  SELECT DISTINCT "resourceId"
  FROM "AuditLog"
  WHERE "userId" = '<unauthorized-user-id>'
  AND timestamp BETWEEN '<breach-start>' AND '<breach-end>'
  AND resource = 'Patient'
)
ORDER BY p."lastName", p."firstName";

-- Export to CSV for mail merge
\copy (SELECT * FROM affected_patients) TO '/tmp/affected-patients.csv' CSV HEADER;
```

### Step 4: Prepare Notifications (Days 20-30)
```bash
# Generate individual notification letters
python3 scripts/generate-breach-letters.py \
  --template breach-notification-template.docx \
  --data /tmp/affected-patients.csv \
  --output /tmp/breach-letters/

# Generate HHS report
# Fill out online form at: https://ocrportal.hhs.gov/ocr/breach/wizard_breach.jsf

# Prepare media notification (if >500 affected)
cat > media-notification.md <<EOF
[Press release content from template above]
EOF
```

### Step 5: Send Notifications (Days 30-60)
```bash
# Mail individual notifications
# Use certified mail with return receipt for documentation

# Submit HHS notification
# Via online portal: https://ocrportal.hhs.gov/ocr/breach/wizard_breach.jsf
# Save confirmation number and screenshot

# Post media notification (if required)
# - Send to local newspapers, TV stations
# - Post on company website
# - Email to industry publications

# Document all notifications
cat >> breach-notification-log.txt <<EOF
$(date): Individual notifications mailed ($(wc -l < affected-patients.csv) letters)
$(date): HHS notification submitted (Confirmation #: [number])
$(date): Media notification posted
EOF
```

---

## Post-Breach Actions

### 1. Offer Support Services

**For SSN Exposure:**
- 12 months free credit monitoring (e.g., Experian, TransUnion)
- Identity theft restoration services
- Dedicated call center for questions

**For Medical Identity Theft:**
- Medical record monitoring
- Assistance resolving fraudulent medical claims
- Help correcting medical records

### 2. Document Everything

**Required Documentation (Retain 6 years):**
- Risk assessment report
- List of affected individuals
- Copy of individual notification letters
- Proof of mailing (certified mail receipts)
- HHS submission confirmation
- Media notification proof
- Call center logs (affected individual inquiries)
- Corrective action plan

```bash
# Archive all breach documentation
mkdir -p /secure/breach-incidents/$(date +%Y%m%d)-incident/
cp -r /tmp/breach-letters/ /secure/breach-incidents/$(date +%Y%m%d)-incident/
cp breach-assessment-*.md /secure/breach-incidents/$(date +%Y%m%d)-incident/
cp /tmp/affected-patients.csv /secure/breach-incidents/$(date +%Y%m%d)-incident/

# Encrypt archive
tar -czf breach-incident-$(date +%Y%m%d).tar.gz /secure/breach-incidents/$(date +%Y%m%d)-incident/
gpg --symmetric --cipher-algo AES256 breach-incident-$(date +%Y%m%d).tar.gz

# Upload to secure storage
aws s3 cp breach-incident-$(date +%Y%m%d).tar.gz.gpg \
  s3://holi-compliance-archives/breach-incidents/
```

### 3. Implement Corrective Actions

```markdown
## Corrective Action Plan

**Incident:** [Brief description]
**Root Cause:** [Detailed analysis]

**Immediate Actions Taken:**
1. [Action 1]
2. [Action 2]

**Long-Term Preventive Measures:**
1. [ ] Implement additional encryption
2. [ ] Enhance access controls
3. [ ] Increase security training
4. [ ] Deploy additional monitoring tools
5. [ ] Update policies and procedures
6. [ ] Conduct security audit

**Responsible Party:** [Name, Title]
**Target Completion:** [Date]
**Status:** [In Progress / Complete]
```

### 4. Update Policies

```markdown
**Policy Updates Required:**
- [ ] Breach response plan
- [ ] Security policies
- [ ] Access control procedures
- [ ] Training materials
- [ ] Business associate agreements
```

---

## Penalties for Non-Compliance

### HIPAA Violation Penalty Tiers

| Tier | Violation Level | Penalty Per Violation | Annual Maximum |
|------|----------------|----------------------|----------------|
| 1 | Individual did not know (and could not have known) | $100 - $50,000 | $1,500,000 |
| 2 | Reasonable cause | $1,000 - $50,000 | $1,500,000 |
| 3 | Willful neglect (corrected) | $10,000 - $50,000 | $1,500,000 |
| 4 | Willful neglect (not corrected) | $50,000 per violation | $1,500,000 |

**Additional Consequences:**
- Criminal penalties (up to 10 years prison for wrongful disclosure)
- State attorney general lawsuits
- Private lawsuits from affected individuals
- Reputation damage
- Loss of business

---

## Resources

### HHS Office for Civil Rights
- Breach Portal: https://ocrportal.hhs.gov/ocr/breach/breach_report_index.jsf
- Guidance: https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html
- Phone: 1-800-368-1019

### Legal Counsel
- HIPAA breach attorney: [Contact information]
- Cyber insurance carrier: [Contact information]

### Breach Response Services
- Forensic investigation: [Provider]
- Credit monitoring: [Provider]
- Call center: [Provider]
- Legal notification services: [Provider]

---

## Related Runbooks
- [Security Incident Response](./security-incident-response.md)
- [Audit Log Review](./audit-log-review.md)
- [Backup Restoration](./backup-restoration.md)

---

## Changelog
- **2024-01-07**: Initial version created
