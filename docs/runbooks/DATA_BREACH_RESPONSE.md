# HIPAA Breach Notification Response Plan

**Regulation:** HIPAA §164.404-414 - Breach Notification Rule
**Severity:** P1 (Critical) - Legal and Regulatory Compliance
**Timeline:** 60-day notification requirement
**Penalties:** Up to $1.5M per violation category per year

---

## ⚠️ CRITICAL: 60-DAY CLOCK STARTS IMMEDIATELY

**A "breach" under HIPAA is:**
> An unauthorized acquisition, access, use, or disclosure of PHI that compromises the security or privacy of the PHI.

**The 60-day clock starts when the breach is DISCOVERED, not when it occurred.**

**Discovery = Date when:**
- Security incident detected AND
- Reasonable belief that PHI was compromised

---

## Immediate Actions (0-24 hours)

### 1. Activate Breach Response Team

- [ ] Incident Commander: ____________
- [ ] Privacy Officer: ____________
- [ ] Security Officer / CISO: ____________
- [ ] Legal Counsel: ____________
- [ ] Communications Lead: ____________
- [ ] Create dedicated Slack channel: `#breach-response-YYYY-MM-DD`
- [ ] **Record discovery date/time:** ____________ (60-day clock starts NOW)

### 2. Preliminary Assessment

**Answer these questions within 4 hours:**

#### Is this a HIPAA Breach?

**All 4 criteria must be met:**

| Criteria | Answer | Evidence |
|----------|--------|----------|
| 1. PHI involved? | YES / NO | ____________ |
| 2. Unauthorized access/disclosure? | YES / NO | ____________ |
| 3. Compromises security/privacy? | YES / NO | ____________ |
| 4. No exceptions apply? (see below) | YES / NO | ____________ |

**If YES to all 4:** This is a reportable breach → Continue with full notification procedures

**If NO to any:** Not a reportable breach → Document and monitor

---

#### HIPAA Breach Exceptions (Low Probability Rule)

**A security incident is NOT a breach if:**

| Exception | Applies? | Notes |
|-----------|----------|-------|
| **Unintentional acquisition** by workforce member acting in good faith within scope of authority | YES / NO | Example: Clinician accidentally views wrong patient |
| **Inadvertent disclosure** to another person authorized to access PHI at same covered entity | YES / NO | Example: Email to wrong doctor in same organization |
| **Disclosure where recipient couldn't reasonably retain PHI** | YES / NO | Example: PHI displayed but not captured |

**AND:**

**Low Probability of Compromise:**
- [ ] PHI not viewed or accessed by unauthorized party
- [ ] PHI not acquired by unauthorized party
- [ ] PHI not retained by unauthorized party
- [ ] PHI not further disclosed by unauthorized party

**If exception applies:** Document and close incident (no notification required)

**If exception does NOT apply:** Proceed with breach notification

---

### 3. Determine Breach Severity

**Based on number of individuals affected:**

| Tier | Individuals Affected | Notification Requirements | Timeline |
|------|---------------------|--------------------------|----------|
| **Tier 1** | < 500 | Individuals + Annual HHS report | 60 days + annual |
| **Tier 2** | ≥ 500 (single state) | Individuals + HHS + Media | 60 days |
| **Tier 3** | ≥ 500 (multiple states) | Individuals + HHS + Media + State AGs | 60 days |

**Document:**
- Number of individuals affected: ____________
- Tier classification: ____________
- Notification deadline: ____________ (60 days from today)

---

### 4. Establish Incident Timeline

**Create breach timeline document:** `/docs/incidents/YYYY-MM-DD-breach-timeline.md`

```markdown
# HIPAA Breach Timeline

**Breach ID:** BREACH-YYYY-MM-DD-001
**Discovery Date:** YYYY-MM-DD HH:MM:SS
**60-Day Deadline:** YYYY-MM-DD

## Timeline

| Date/Time | Event | Evidence |
|-----------|-------|----------|
| YYYY-MM-DD HH:MM | Incident first detected | [Alert name, monitoring system] |
| YYYY-MM-DD HH:MM | Breach determination made | [Privacy Officer assessment] |
| YYYY-MM-DD HH:MM | Containment actions taken | [System shutdown, access revoked] |
| YYYY-MM-DD HH:MM | Forensic investigation started | [Logs preserved, snapshots taken] |
| YYYY-MM-DD HH:MM | Patient impact determined | [X patients affected] |

## Breach Details

**What happened:**
[Detailed description of incident]

**How it happened:**
[Root cause analysis]

**What PHI was involved:**
- [ ] Names
- [ ] Addresses
- [ ] Dates of birth
- [ ] Social Security numbers
- [ ] Medical record numbers
- [ ] Diagnoses
- [ ] Treatment information
- [ ] Medications
- [ ] Lab results
- [ ] Insurance information
- [ ] Other: ____________

**Who was affected:**
- Number of individuals: ____________
- States represented: ____________
- Special populations (minors, disabled): ____________
```

---

## Risk Assessment (24-48 hours)

### 5. Conduct Formal Risk Assessment

**Required by HIPAA §164.402 to determine if breach occurred**

**Four-Factor Risk Assessment:**

#### Factor 1: Nature and Extent of PHI

| Question | Answer | Risk Level |
|----------|--------|------------|
| What types of PHI were involved? | ____________ | Low / Medium / High |
| Did it include sensitive information (SSN, diagnosis, treatment)? | YES / NO | Low / Medium / High |
| How much information was involved? | ____________ | Low / Medium / High |

**Scoring:**
- Low: Basic identifiers only (name, MRN)
- Medium: Identifiers + some clinical data
- High: Identifiers + sensitive clinical data + financial info

---

#### Factor 2: Unauthorized Person(s)

| Question | Answer | Risk Level |
|----------|--------|------------|
| Who obtained the PHI? | ____________ | Low / Medium / High |
| Was it a known malicious actor? | YES / NO | Low / Medium / High |
| Did they have prior relationship with patients? | YES / NO | Low / Medium / High |

**Scoring:**
- Low: Internal workforce member (accidental)
- Medium: Unknown external party
- High: Known criminal actor or competitor

---

#### Factor 3: Was PHI Actually Acquired or Viewed?

| Question | Answer | Risk Level |
|----------|--------|------------|
| Was PHI viewed by unauthorized person? | YES / NO / UNKNOWN | Low / Medium / High |
| Was PHI downloaded or copied? | YES / NO / UNKNOWN | Low / Medium / High |
| Is there evidence of exfiltration? | YES / NO / UNKNOWN | Low / Medium / High |

**Scoring:**
- Low: PHI exposed but no evidence of viewing
- Medium: PHI likely viewed
- High: PHI definitely acquired/exfiltrated

---

#### Factor 4: Extent of Risk Mitigation

| Question | Answer | Risk Level |
|----------|--------|------------|
| Was PHI encrypted? | YES / NO | Low / Medium / High |
| Was access immediately revoked? | YES / NO | Low / Medium / High |
| Was data recoverable (e.g., deleted email retrieved)? | YES / NO | Low / Medium / High |

**Scoring:**
- Low: PHI encrypted + access revoked + no evidence of use
- Medium: Partial mitigation (some encryption, delayed revocation)
- High: No mitigation possible (plaintext, widespread disclosure)

---

**Overall Risk Assessment:**

| Factor | Score (Low/Med/High) | Weight |
|--------|---------------------|---------|
| Nature of PHI | ____________ | 3x |
| Unauthorized person | ____________ | 2x |
| PHI acquired | ____________ | 3x |
| Risk mitigation | ____________ | 2x |

**Formula:**
```
Risk Score = (Factor1 × 3) + (Factor2 × 2) + (Factor3 × 3) + (Factor4 × 2)

Low = 1, Medium = 2, High = 3

Score 10-24 = High Risk (definite breach)
Score 15-19 = Medium Risk (likely breach)
Score 10-14 = Low Risk (possibly not breach, document and monitor)
```

**Final Determination:**
- [ ] **Breach confirmed** (proceed with notification)
- [ ] **Not a breach** (document and close)

**Documented by:** ____________ (Privacy Officer)
**Date:** ____________

---

## Patient Impact Analysis (48-72 hours)

### 6. Identify Affected Individuals

**Query audit logs:**
```sql
-- Get list of all patients accessed by unauthorized party
SELECT DISTINCT
  p.id,
  p.email,
  p."firstName",
  p."lastName",
  p."dateOfBirth",
  p.phone,
  p.address,
  p.city,
  p.state,
  p.zipCode
FROM "Patient" p
JOIN "AuditLog" a ON a."resourceId" = p.id
WHERE a."userId" IN (SELECT id FROM "User" WHERE id = 'unauthorized-user-id')
  AND a.resource = 'Patient'
  AND a.timestamp BETWEEN '[breach_start]' AND '[breach_end]'
ORDER BY p."lastName", p."firstName";
```

**Export to secure file:**
```sql
\copy (
  [above query]
) TO '/tmp/affected-patients-ENCRYPTED.csv' CSV HEADER;

# Encrypt file
gpg --encrypt --recipient privacy@holilabs.xyz /tmp/affected-patients-ENCRYPTED.csv

# Upload to secure location
aws s3 cp /tmp/affected-patients-ENCRYPTED.csv.gpg s3://holilabs-compliance/breaches/YYYY-MM-DD/
```

**Document patient count:**
- Total affected: ____________
- With valid email: ____________
- Without contact info: ____________
- Deceased patients: ____________
- Minors (< 18): ____________

---

### 7. Determine Notification Method

**Individual Notification (60 days):**

| Method | Use When | Timeline |
|--------|----------|----------|
| **First-class mail** | Default for all | 60 days from discovery |
| **Email** | If patient consented to electronic communication | 60 days from discovery |
| **Phone** | If insufficient/outdated written contact info | 60 days from discovery |
| **Substitute notice** | If contact info insufficient for 10+ individuals | See below |

**Substitute Notice (if < 10 individuals with insufficient contact info):**
- Telephone call OR
- Other written means

**Substitute Notice (if ≥ 10 individuals with insufficient contact info):**
- Conspicuous posting on website homepage for 90 days AND
- Notice in major print or broadcast media (if ≥ 500 individuals in jurisdiction)

---

## Notification Content (72 hours - 2 weeks)

### 8. Draft Individual Notification Letter

**HIPAA requires the following elements (§164.404(c)):**

```
[Company Letterhead]

[Date]

Dear [Patient Name],

We are writing to inform you of a data security incident that may have involved
some of your protected health information.

## What Happened

[Brief description of what happened - be clear and specific]

On [date], we discovered that [describe incident]. The incident occurred between
[start date] and [end date].

## What Information Was Involved

The following types of information may have been involved:
- [Check applicable items below]
- [ ] Name
- [ ] Address
- [ ] Date of birth
- [ ] Social Security number
- [ ] Medical record number
- [ ] Diagnoses
- [ ] Treatment information
- [ ] Medications
- [ ] Lab results
- [ ] Insurance information
- [ ] Other: ____________

## What We Are Doing

We have taken the following steps to address this incident and protect your
information:

- [List containment actions taken]
- [List security improvements implemented]
- [List ongoing monitoring]

We have reported this incident to the U.S. Department of Health and Human Services
as required by federal law.

## What You Can Do

We recommend that you:

1. **Monitor your accounts:** Review your medical and financial accounts for
   any unauthorized activity.

2. **Review your Explanation of Benefits (EOB):** Check statements from your
   health insurer for any services you did not receive.

3. **Contact your health insurer:** Report any suspicious activity on your
   health insurance account.

4. **Place a fraud alert:** Consider placing a fraud alert on your credit
   file if financial information was involved.

5. **Request your credit report:** You can obtain free credit reports from
   www.annualcreditreport.com or 1-877-322-8228.

6. **Consider a credit freeze:** You may place a security freeze on your
   credit file at no charge.

## Credit Monitoring Services

[If applicable] We are offering you [duration] of complimentary credit
monitoring and identity protection services through [service provider].

To enroll: [instructions]
Enrollment code: [code]
Deadline to enroll: [date]

## Contact Information

If you have questions about this incident, please contact us:

**HoliLabs Privacy Office**
Email: privacy@holilabs.xyz
Phone: 1-XXX-XXX-XXXX
Hours: Monday-Friday, 9 AM - 5 PM ET

Mailing address:
HoliLabs Privacy Office
[Address]
[City, State ZIP]

We sincerely apologize for this incident and any concern it may cause you.
Protecting your information is our top priority, and we are committed to
maintaining the security of your personal health information.

Sincerely,

[Name]
[Title]
Privacy Officer
HoliLabs Healthcare Platform

[Company Logo]
```

**Legal review required before sending**

---

### 9. Draft Media Notice (if ≥ 500 individuals)

**Required elements (§164.406):**

```
NOTICE OF DATA BREACH

HoliLabs Healthcare Platform

[Date]

HoliLabs is notifying individuals of a data security incident that may have
involved some protected health information.

On [date], we discovered that [brief description]. The incident affected
approximately [number] individuals.

The information potentially involved includes [list types of PHI].

We have taken steps to [brief description of response]. We have reported this
incident to the U.S. Department of Health and Human Services.

Affected individuals are being notified by mail and are being offered
[services, if applicable].

For more information, please contact:
HoliLabs Privacy Office
Email: privacy@holilabs.xyz
Phone: 1-XXX-XXX-XXXX

A detailed notice is available at: www.holilabs.xyz/breach-notice
```

**Publish in:**
- Major local newspaper(s) OR
- Major broadcast media in affected region(s)

---

### 10. Prepare HHS Notification

**Filing methods:**

**Tier 1 (< 500 individuals):**
- Submit via HHS Breach Portal: https://ocrportal.hhs.gov/ocr/breach/wizard_breach.jsf
- Deadline: **Within 60 days of end of calendar year**
- Submit annually with other small breaches

**Tier 2/3 (≥ 500 individuals):**
- Submit via HHS Breach Portal: https://ocrportal.hhs.gov/ocr/breach/wizard_breach.jsf
- Deadline: **Within 60 days of discovery**
- Notification posted to HHS "Wall of Shame"

**Required information:**
- Covered entity name and contact
- Date of breach discovery
- Date(s) of breach
- Number of individuals affected
- Type of breach (hacking, theft, loss, etc.)
- Location of breach
- Description of PHI involved
- Brief description of incident
- Actions taken in response

**Prepare documentation:**
- [ ] Breach notification form completed
- [ ] Risk assessment documentation
- [ ] Patient notification letters (proof of mailing)
- [ ] Media notice publication proof
- [ ] Timeline of discovery and response

---

## Execution (Days 10-60)

### 11. Send Individual Notifications

**Mailing process:**

```bash
# Generate personalized letters
# (Use mail merge with encrypted patient list)

# Track mailings:
# - Date sent: ____________
# - Total letters: ____________
# - Certified mail tracking numbers: ____________

# Document proof of mailing:
# - USPS receipt
# - List of tracking numbers
# - Date of mailing
```

**Email notifications:**
```bash
# Only if patient opted in for electronic communication
# Must include:
# - Subject line: "Important Privacy Notice from HoliLabs"
# - Plain text body (no HTML)
# - PDF attachment with full notice
```

**Track deliveries:**
- [ ] Mailed: ____________ patients
- [ ] Emailed: ____________ patients
- [ ] Called: ____________ patients
- [ ] Substitute notice published: YES / NO

---

### 12. Submit HHS Notification

**For breaches ≥ 500 individuals:**

1. Go to: https://ocrportal.hhs.gov/ocr/breach/wizard_breach.jsf
2. Create account (if first breach)
3. Complete breach notification form
4. Upload supporting documentation
5. Submit by **Day 60 deadline**
6. Save confirmation number: ____________

**HHS will post to public "breach portal" within 24 hours**

---

### 13. Submit Media Notice (if ≥ 500 individuals)

**Newspaper publication:**
- [ ] Contact major newspapers in affected regions
- [ ] Submit notice for publication
- [ ] Request proof of publication
- [ ] Save tear sheets / screenshots

**Broadcast media:**
- [ ] Contact local TV/radio stations
- [ ] Coordinate broadcast timing
- [ ] Request confirmation of broadcast

**Deadline:** Within 60 days of discovery

---

### 14. Notify State Attorneys General (if ≥ 500 in state)

**Required states:** Any state with ≥ 500 affected residents

**Notification method:** Written notice (mail or email)

**Sample letter:**
```
[Date]

Office of the Attorney General
[State]
[Address]

Re: Data Breach Notification - [Number] [State] Residents Affected

Dear Attorney General [Name],

Pursuant to [state breach notification law], I am writing to inform you of a
data security incident involving protected health information of [number]
residents of [state].

[Brief description of incident]

Please find attached:
- Copy of notice sent to affected individuals
- Timeline of incident and response
- Risk assessment documentation

If you have any questions, please contact:
[Privacy Officer]
[Contact information]

Sincerely,
[Privacy Officer]
```

**Deadline:** Same as individual notification (60 days)

---

## Post-Notification (Days 60-365)

### 15. Monitor and Respond to Inquiries

**Set up breach hotline:**
- [ ] Dedicated phone number: ____________
- [ ] Dedicated email: privacy@holilabs.xyz
- [ ] FAQ page: www.holilabs.xyz/breach-notice
- [ ] Staff trained on talking points

**Track inquiries:**
- Number of calls received: ____________
- Number of emails received: ____________
- Common questions: ____________

**Response time SLA:** < 24 hours

---

### 16. Monitor for Fraud

**For 12 months post-notification:**

- [ ] Monitor patient reports of fraud
- [ ] Track any identity theft reports
- [ ] Coordinate with credit monitoring service
- [ ] Report statistics to leadership monthly

---

### 17. Annual Report (if < 500 individuals)

**Deadline:** Within 60 days after end of calendar year

**Process:**
1. Compile all breaches < 500 from year
2. Submit via HHS Breach Portal
3. Include aggregate statistics

**Due:** March 1, [next year]

---

## Penalties for Non-Compliance

**HIPAA Breach Notification Penalties:**

| Violation | Penalty per Violation | Annual Maximum |
|-----------|---------------------|----------------|
| Did not know | $100 - $50,000 | $1,500,000 |
| Reasonable cause | $1,000 - $50,000 | $1,500,000 |
| Willful neglect (corrected) | $10,000 - $50,000 | $1,500,000 |
| Willful neglect (not corrected) | $50,000 | $1,500,000 |

**State breach notification penalties:** Vary by state

**Reputational damage:** Incalculable

---

## Checklist Summary

### Days 0-1 (Discovery)
- [ ] Activate breach response team
- [ ] Record discovery date/time (60-day clock starts)
- [ ] Preliminary assessment
- [ ] Establish incident timeline
- [ ] Preserve evidence

### Days 1-2 (Risk Assessment)
- [ ] Conduct four-factor risk assessment
- [ ] Determine if breach occurred
- [ ] Document determination
- [ ] Privacy Officer sign-off

### Days 2-3 (Impact Analysis)
- [ ] Identify all affected individuals
- [ ] Export patient list (encrypted)
- [ ] Determine notification tier (< 500 or ≥ 500)
- [ ] Calculate 60-day deadline

### Days 3-14 (Notification Preparation)
- [ ] Draft individual notification letter
- [ ] Legal review of notification
- [ ] Draft media notice (if ≥ 500)
- [ ] Prepare HHS notification
- [ ] Identify state AGs to notify (if applicable)

### Days 10-60 (Execution)
- [ ] Mail individual notifications (by Day 60)
- [ ] Submit HHS notification (by Day 60 if ≥ 500)
- [ ] Publish media notice (by Day 60 if ≥ 500)
- [ ] Notify state AGs (by Day 60 if ≥ 500)
- [ ] Set up breach hotline
- [ ] Monitor inquiries

### Days 60-365 (Post-Notification)
- [ ] Respond to patient inquiries (< 24 hours)
- [ ] Monitor for fraud (12 months)
- [ ] Track statistics
- [ ] Annual HHS report (if < 500, by March 1)

---

## Related Documents

- [SECURITY_INCIDENT.md](./SECURITY_INCIDENT.md) - Initial incident response
- [DISASTER_RECOVERY_PLAN.md](./DISASTER_RECOVERY_PLAN.md) - Data recovery procedures
- `/docs/HIPAA_COMPLIANCE_CHECKLIST.md` - Full HIPAA compliance guide
- `/legal/BAA_TEMPLATE.md` - Business Associate Agreements

---

## Contacts

**Internal:**
- Privacy Officer: [name, email, phone]
- Security Officer: [name, email, phone]
- Legal Counsel: [name, email, phone]

**External:**
- HHS Office for Civil Rights: (800) 368-1019
- HHS Breach Portal: https://ocrportal.hhs.gov/ocr/breach/
- Cyber Insurance: [policy #, contact]
- Forensics Firm: [contact]
- Credit Monitoring Service: [contact]

---

**Last Updated:** 2026-01-01
**Next Review:** 2026-04-01
**Owner:** Privacy Officer
