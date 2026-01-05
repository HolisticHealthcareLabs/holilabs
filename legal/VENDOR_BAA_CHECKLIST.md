# Vendor BAA/DPA Checklist
**HIPAA & LGPD Compliance - Business Associate Agreements Required**

---

## ⚠️ CRITICAL: BAA/DPA Requirements

**HIPAA §164.502(e)(2) requires:**
> A covered entity may disclose protected health information to a business associate and may allow a business associate to create or receive protected health information on its behalf, if the covered entity obtains satisfactory assurances that the business associate will appropriately safeguard the information.

**Operating without a signed BAA is an automatic HIPAA violation, punishable by fines up to $1.5M per year per violation category.**

**DPA requirements apply for:**
- **LGPD (Brazil):** Processing personal data of Brazilian residents
- **GDPR (EU):** Processing personal data of EU/EEA residents
- **CCPA (California):** Selling or sharing personal information of California residents

---

## Vendor Classification

### Category 1: PHI Access (BAA REQUIRED)

These vendors create, receive, maintain, transmit, or have access to Protected Health Information (PHI). **BAA is mandatory.**

| Vendor | Service | PHI Access? | BAA Status | BAA Signed Date | Renewal Date | Contact | Notes |
|--------|---------|-------------|------------|-----------------|--------------|---------|-------|
| **DigitalOcean** | Cloud hosting (App Platform, PostgreSQL) | Yes - hosts database with PHI | ⚠️ REQUIRED | - | - | legal@digitalocean.com | Priority 1 |
| **Upstash** | Redis (cache, sessions, rate limiting) | Yes - may cache PHI | ⚠️ REQUIRED | - | - | hello@upstash.com | Priority 1 |
| **Anthropic** | Claude AI (clinical notes, co-pilot) | Yes - processes clinical notes | ⚠️ REQUIRED | - | - | privacy@anthropic.com | Priority 1 |
| **Deepgram** | Speech-to-text transcription | Yes - transcribes patient encounters | ⚠️ REQUIRED | - | - | support@deepgram.com | Priority 1 |
| **Medplum** | FHIR server (EHR integration) | Yes - stores patient FHIR resources | ✅ SIGNED | - | - | hello@medplum.com | Medplum provides BAA |
| **Sentry** | Error tracking (may log PHI in errors) | Possible - error messages may contain PHI | ⚠️ REQUIRED | - | - | privacy@sentry.io | Priority 2 |
| **Resend** | Email delivery (appointment reminders, lab results) | Yes - email content may include PHI | ⚠️ REQUIRED | - | - | support@resend.com | Priority 1 |
| **Twilio** | SMS/voice (appointment reminders, notifications) | Yes - SMS content may include PHI | ⚠️ REQUIRED | - | - | legal@twilio.com | Priority 1 |
| **Stripe** | Payment processing | No - does not handle PHI | N/A | - | - | - | Only payment data |
| **Vercel** | Hosting (if used) | Yes - if hosting web app with PHI | ⚠️ REQUIRED | - | - | privacy@vercel.com | If using Vercel |
| **AWS/S3** | Backup storage (if used) | Yes - if storing PHI backups | ⚠️ REQUIRED | - | - | aws-legal@amazon.com | If using AWS |

**Legend:**
- ✅ **SIGNED** - BAA signed and in effect
- ⚠️ **REQUIRED** - BAA required but not yet signed (COMPLIANCE GAP)
- 🔄 **IN PROGRESS** - BAA request sent, awaiting response
- ❌ **REFUSED** - Vendor refuses to sign BAA (must find alternative vendor)
- N/A - Not applicable (no PHI access)

---

### Category 2: No PHI Access (BAA NOT REQUIRED)

These vendors do not have access to PHI. BAA is not required, but data processing agreement (DPA) may be needed for LGPD/GDPR.

| Vendor | Service | PHI Access? | DPA Status | Notes |
|--------|---------|-------------|------------|-------|
| **GitHub** | Source code repository | No - code only, no PHI | N/A | No patient data in Git |
| **BetterStack** | Logging (application logs only) | No - if configured correctly | ✅ SIGNED | Ensure no PHI in logs |
| **Stripe** | Payment processing | No - payment data only | ✅ SIGNED | Stripe provides DPA |
| **Google Analytics** | Website analytics | No - anonymized only | ⚠️ REQUIRED | Must anonymize IPs, disable user IDs |
| **PostHog** | Product analytics | No - if no PHI sent | ⚠️ REQUIRED | Verify no PHI in events |
| **Intercom** | Customer support chat | No - support queries only | ⚠️ REQUIRED | Train staff not to share PHI |

---

## BAA Request Process

### Step 1: Identify Vendors Needing BAAs

Review all third-party vendors that:
- Host your application or database
- Process data on your behalf
- Have access to your systems (even temporarily)
- May see PHI in logs, error messages, or monitoring

**If in doubt, request a BAA.**

---

### Step 2: Contact Vendor

**Email Template:**

```
Subject: Business Associate Agreement (BAA) Request - HIPAA Compliance

Dear [Vendor Name] Legal/Compliance Team,

We are Holi Labs, a HIPAA-covered entity providing healthcare technology services.
Your services involve the processing of Protected Health Information (PHI) as defined
under HIPAA.

HIPAA §164.502(e)(2) requires us to enter into a written Business Associate Agreement
(BAA) with vendors who create, receive, maintain, transmit, or have access to PHI on
our behalf.

We kindly request that you provide us with:

1. Your standard HIPAA Business Associate Agreement (BAA)
2. Confirmation that your services are HIPAA-compliant
3. Any relevant compliance certifications (SOC 2, HITRUST, ISO 27001)

If you do not currently offer a BAA, please let us know so we can evaluate alternative
solutions.

Service Details:
- Service: [e.g., Cloud hosting, Email delivery]
- Account ID: [Your account ID]
- PHI Exposure: [Brief description of how PHI is accessed]

Please send the BAA to: legal@holilabs.com

We aim to have all BAAs signed within 30 days. Your prompt attention to this matter
is greatly appreciated.

Best regards,
[Your Name]
[Title]
Holi Labs
legal@holilabs.com
```

---

### Step 3: Review BAA

Before signing, ensure the BAA includes:

**Required Clauses (HIPAA §164.504(e)(2)):**
- [ ] Permitted uses and disclosures of PHI
- [ ] Prohibition on unauthorized use or disclosure
- [ ] Security safeguards (administrative, physical, technical)
- [ ] Reporting of security incidents and breaches
- [ ] Subcontractor requirements (downstream BAAs)
- [ ] Access to PHI for individuals
- [ ] Amendment of PHI
- [ ] Accounting of disclosures
- [ ] Return or destruction of PHI upon termination
- [ ] HHS audit cooperation

**Additional Important Terms:**
- [ ] Breach notification within 24-72 hours
- [ ] Liability and indemnification provisions
- [ ] Insurance requirements (cyber liability)
- [ ] Termination rights
- [ ] Governing law and jurisdiction

**Red Flags:**
- ❌ Vendor refuses to sign BAA → **Find alternative vendor**
- ❌ BAA limits liability below reasonable amounts
- ❌ BAA does not comply with HITECH Act amendments
- ❌ BAA lacks breach notification requirements
- ❌ BAA allows vendor to use PHI for marketing or other purposes

---

### Step 4: Legal Review

**Before signing any BAA:**
1. Have your legal counsel review the agreement
2. Ensure the BAA is compatible with your underlying service agreement
3. Verify the BAA complies with all HIPAA requirements
4. Negotiate any unacceptable terms

**Common negotiation points:**
- Breach notification timeline (push for 24 hours)
- Liability caps (push for $5M+ cyber liability insurance)
- Subcontractor approval process
- Data retention and deletion procedures
- Audit rights

---

### Step 5: Execute and Store

**After signing:**
1. Store signed BAA securely (encrypted storage)
2. Add to BAA register (this checklist)
3. Set calendar reminders for renewal dates
4. Provide copies to:
   - Privacy Officer
   - Compliance Officer
   - HIPAA Security Officer
   - Legal team

**Document management:**
- [ ] Original signed BAA stored in `/legal/signed-baas/[vendor-name]-baa-[date].pdf`
- [ ] Encrypted with GPG or stored in encrypted S3 bucket
- [ ] Backed up to multiple locations
- [ ] Access restricted to authorized personnel only

---

### Step 6: Ongoing Management

**Annual tasks:**
- [ ] Review BAA register (this checklist)
- [ ] Verify all BAAs are current and not expired
- [ ] Request updated BAAs if vendor changes services
- [ ] Audit vendor compliance (request SOC 2 reports, security certifications)

**When to update BAA:**
- Vendor adds new services that access PHI
- HIPAA regulations change
- Vendor changes subcontractors
- Vendor suffers a data breach
- Service agreement is renewed or amended

---

## BAA Renewal Calendar

| Vendor | BAA Signed Date | Renewal Date | Days Until Renewal | Action Required |
|--------|-----------------|--------------|-------------------|-----------------|
| [Example: AWS] | 2025-01-01 | 2026-01-01 | 0 | Renew BAA immediately |
| [Add vendors here] | | | | |

**Renewal Process:**
1. Contact vendor **90 days** before expiration
2. Request updated BAA
3. Review for any changes
4. Execute new BAA
5. Store old BAA in archive folder

---

## Vendor Risk Assessment

For each vendor with PHI access, conduct an annual risk assessment:

### Risk Factors

| Factor | Low Risk | Medium Risk | High Risk |
|--------|----------|-------------|-----------|
| **PHI Volume** | < 100 records | 100-10,000 records | > 10,000 records |
| **PHI Sensitivity** | Demographics only | Limited clinical data | Full medical records |
| **Access Level** | View only | Edit | Full database access |
| **Data Location** | On-premises | US-based cloud | International cloud |
| **Security Certification** | SOC 2 Type II, HITRUST | SOC 2 Type I | None |
| **Breach History** | No breaches | 1 breach > 5 years ago | Recent breaches |
| **Subcontractors** | None | 1-2 with BAAs | Many without BAAs |

**Action based on risk:**
- **High Risk:** Quarterly audits, penetration testing, strict access controls
- **Medium Risk:** Annual audits, regular monitoring
- **Low Risk:** Standard monitoring, annual review

---

## Vendor Alternatives (If No BAA Available)

If a vendor refuses to sign a BAA, consider these alternatives:

| Service Type | HIPAA-Compliant Alternative | Notes |
|--------------|---------------------------|-------|
| **Cloud Hosting** | AWS (with BAA), Google Cloud (with BAA), Microsoft Azure (with BAA) | Most major cloud providers offer BAAs |
| **Email Delivery** | Paubox (HIPAA-focused), Twilio SendGrid (with BAA), Amazon SES (with BAA) | Avoid Mailchimp (no BAA) |
| **SMS/Voice** | Twilio (with BAA), AWS SNS (with BAA) | Many SMS providers offer BAAs |
| **Error Tracking** | Sentry (with BAA), Rollbar (with BAA) | Ensure PHI is not logged in errors |
| **Analytics** | Self-hosted Plausible, Matomo (self-hosted) | Avoid Google Analytics if tracking PHI |
| **Support Chat** | Zendesk (with BAA), Freshdesk (with BAA) | Train staff not to share PHI in chat |

---

## Compliance Tracking

### Current Compliance Status

**Critical Vendors (Priority 1):**
- [ ] DigitalOcean - BAA required ⚠️
- [ ] Upstash - BAA required ⚠️
- [ ] Anthropic - BAA required ⚠️
- [ ] Deepgram - BAA required ⚠️
- [ ] Resend - BAA required ⚠️
- [ ] Twilio - BAA required ⚠️

**Total vendors with PHI access:** [Count]
**BAAs signed:** [Count]
**BAAs pending:** [Count]
**Compliance percentage:** [X%]

**Target:** 100% of vendors with PHI access must have signed BAAs

---

## Audit Trail

### BAA Request Log

| Date | Vendor | Action | Status | Follow-up Date | Notes |
|------|--------|--------|--------|----------------|-------|
| 2026-01-01 | DigitalOcean | Initial request sent | Pending | 2026-01-08 | Awaiting legal response |
| [Add entries] | | | | | |

---

## Escalation Process

### If Vendor Does Not Respond

**Day 0:** Initial BAA request sent via email
**Day 7:** Follow-up email sent
**Day 14:** Phone call to vendor support/legal
**Day 21:** Escalate to vendor account manager
**Day 30:** Final notice - service termination warning
**Day 45:** Begin migration to alternative vendor

**If vendor refuses to sign BAA:**
- Immediately cease using vendor for PHI processing
- Migrate to HIPAA-compliant alternative
- Document decision and justification
- Report to Privacy Officer

---

## Templates and Resources

### Useful Resources

**HIPAA Guidance:**
- HHS BAA Guidance: https://www.hhs.gov/hipaa/for-professionals/covered-entities/sample-business-associate-agreement-provisions/index.html
- HITECH Act: https://www.hhs.gov/hipaa/for-professionals/special-topics/hitech-act-enforcement-interim-final-rule/index.html

**Sample BAAs:**
- AWS BAA: https://aws.amazon.com/compliance/hipaa-compliance/
- Google Cloud BAA: https://cloud.google.com/security/compliance/hipaa-compliance
- Microsoft Azure BAA: https://azure.microsoft.com/en-us/support/legal/hipaa-baa/

**Compliance Certifications:**
- SOC 2: https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome.html
- HITRUST: https://hitrustalliance.net/
- ISO 27001: https://www.iso.org/isoiec-27001-information-security.html

---

## Quarterly Review Checklist

Conduct this review every 3 months:

- [ ] Review vendor list - any new vendors added?
- [ ] Verify all BAAs are current and signed
- [ ] Check for any vendor breaches or security incidents
- [ ] Request updated SOC 2 reports from vendors
- [ ] Verify subcontractor lists are current
- [ ] Update this checklist with any changes
- [ ] Report findings to Privacy Officer and Compliance Committee

**Next Review Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

**Document Version:** 1.0
**Last Updated:** 2026-01-01
**Next Review:** 2026-04-01
**Owner:** Privacy Officer & Legal Team

**⚠️ CRITICAL: This is a living document. Update immediately when vendors are added, removed, or changed.**
