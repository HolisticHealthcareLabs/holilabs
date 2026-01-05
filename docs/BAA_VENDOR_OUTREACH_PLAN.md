# BAA Vendor Outreach Action Plan
**CRITICAL PRIORITY - Production Blocker**

**Status**: Ready to Execute
**Target Completion**: 2-4 weeks (vendor-dependent)
**Owner**: Legal/Compliance Team
**Last Updated**: 2026-01-03

---

## 🚨 CRITICAL CONTEXT

**You CANNOT launch with real patient data until ALL Business Associate Agreements (BAAs) are signed.**

Operating without signed BAAs = **automatic HIPAA violation** punishable by fines up to **$1.5M per year per violation category**.

---

## Priority 1: Immediate Outreach Required (8 Vendors)

These vendors handle PHI and must have signed BAAs before production launch.

### 1. DigitalOcean (Database & Hosting)
- **Service**: App Platform, Managed PostgreSQL
- **PHI Exposure**: Hosts all patient data in database
- **Contact**: legal@digitalocean.com, hipaa@digitalocean.com
- **Known BAA Status**: DigitalOcean offers HIPAA-compliant managed databases with BAA
- **Action**: Request BAA through DigitalOcean support portal or email legal team
- **Resources**: https://docs.digitalocean.com/products/platform/hipaa/

**Email Draft:**
```
Subject: BAA Request - HIPAA-Compliant Managed PostgreSQL

Dear DigitalOcean Legal Team,

We are HOLI Labs, a HIPAA-covered entity providing healthcare technology services. We are using DigitalOcean Managed PostgreSQL (Cluster ID: [YOUR_CLUSTER_ID]) and App Platform to host our application that processes Protected Health Information (PHI).

Per HIPAA §164.502(e)(2), we require a signed Business Associate Agreement (BAA) for our production environment.

Please provide:
1. Your standard HIPAA Business Associate Agreement
2. Confirmation that our database cluster is configured for HIPAA compliance
3. Any compliance certifications (SOC 2, ISO 27001)

Account Details:
- Account Email: [YOUR_ACCOUNT_EMAIL]
- Database Cluster ID: [YOUR_CLUSTER_ID]
- App Platform Project: [YOUR_PROJECT_NAME]

Target signature date: [DATE - 2 weeks from now]

Please send the BAA to: legal@holilabs.com

Thank you for your prompt attention.

Best regards,
[Your Name]
[Title]
HOLI Labs
```

---

### 2. Upstash (Redis Cache)
- **Service**: Redis for caching, sessions, rate limiting
- **PHI Exposure**: May cache patient data temporarily
- **Contact**: hello@upstash.com, support@upstash.com
- **Known BAA Status**: Check if Upstash offers BAA (may need alternative if not HIPAA-compliant)
- **Action**: Email support to request BAA or confirm HIPAA compliance
- **Alternative**: If Upstash does not provide BAA, consider AWS ElastiCache (HIPAA-eligible with BAA)

**Email Draft:**
```
Subject: HIPAA Compliance & BAA Request

Dear Upstash Team,

We are HOLI Labs, a healthcare technology company subject to HIPAA regulations. We currently use Upstash Redis for caching in our application that processes Protected Health Information (PHI).

HIPAA requires us to have a signed Business Associate Agreement (BAA) with vendors who may access PHI.

Questions:
1. Does Upstash offer HIPAA-compliant services?
2. Do you provide a Business Associate Agreement (BAA)?
3. If yes, what security certifications do you hold (SOC 2, ISO 27001)?

If Upstash does not currently support HIPAA compliance, we will need to migrate to a HIPAA-eligible alternative before our production launch.

Account Details:
- Account Email: [YOUR_EMAIL]
- Database ID: [YOUR_DATABASE_ID]

Please respond within 7 days so we can plan accordingly.

Thank you,
[Your Name]
[Title]
HOLI Labs
legal@holilabs.com
```

---

### 3. Anthropic (Claude AI)
- **Service**: Claude API for clinical note generation, co-pilot features
- **PHI Exposure**: Processes clinical notes, patient encounters
- **Contact**: privacy@anthropic.com, sales@anthropic.com
- **Known BAA Status**: Anthropic offers BAA for enterprise customers
- **Action**: Contact sales or privacy team to request BAA
- **Resources**: https://www.anthropic.com/legal

**Email Draft:**
```
Subject: BAA Request - Claude API Enterprise Customer

Dear Anthropic Legal/Privacy Team,

We are HOLI Labs, a HIPAA-covered entity using Claude API (claude-3-5-sonnet) for clinical documentation and AI-powered clinical note generation.

Our use case involves processing Protected Health Information (PHI), including:
- Patient clinical notes
- SOAP note generation
- Medical documentation assistance

Per HIPAA §164.502(e)(2), we require a signed Business Associate Agreement (BAA).

Please provide:
1. Your standard Business Associate Agreement
2. Confirmation of HIPAA compliance for Claude API
3. SOC 2 Type II report (if available)
4. Data residency information (where PHI is processed/stored)

Account Details:
- Organization: HOLI Labs
- API Key: [FIRST 8 CHARACTERS]
- Monthly Volume: ~[X] tokens/month

Target signature date: [DATE - 2 weeks from now]

Please send the BAA to: legal@holilabs.com

Thank you for your support.

Best regards,
[Your Name]
[Title]
HOLI Labs
```

---

### 4. Deepgram (Speech-to-Text)
- **Service**: Audio transcription for patient encounters
- **PHI Exposure**: Transcribes patient-clinician conversations
- **Contact**: support@deepgram.com, legal@deepgram.com
- **Known BAA Status**: Deepgram offers HIPAA-compliant transcription with BAA
- **Action**: Request BAA through support or legal team
- **Resources**: https://deepgram.com/learn/hipaa-compliant-speech-recognition

**Email Draft:**
```
Subject: BAA Request - HIPAA-Compliant Transcription

Dear Deepgram Team,

We are HOLI Labs, a healthcare technology provider using Deepgram's speech-to-text API to transcribe patient-clinician encounters.

Our transcription use cases include:
- Medical visit transcriptions
- Patient intake interviews
- Clinical documentation

All transcribed content contains Protected Health Information (PHI) subject to HIPAA regulations.

Please provide:
1. Your standard HIPAA Business Associate Agreement (BAA)
2. Confirmation of HIPAA compliance configuration
3. Security certifications (SOC 2, ISO 27001)

Account Details:
- Account Email: [YOUR_EMAIL]
- API Key: [FIRST 8 CHARACTERS]
- Project Name: [PROJECT_NAME]

Target signature date: [DATE - 2 weeks from now]

Please send the BAA to: legal@holilabs.com

Best regards,
[Your Name]
[Title]
HOLI Labs
```

---

### 5. Sentry (Error Tracking)
- **Service**: Application error monitoring
- **PHI Exposure**: Error logs may contain PHI in stack traces
- **Contact**: privacy@sentry.io, support@sentry.io
- **Known BAA Status**: Sentry offers BAA for Business/Enterprise plans
- **Action**: Upgrade to Business/Enterprise plan if on lower tier, request BAA
- **Resources**: https://sentry.io/security/#hipaa-compliance

**Email Draft:**
```
Subject: BAA Request - HIPAA Compliance for Error Monitoring

Dear Sentry Team,

We are HOLI Labs, a HIPAA-covered entity using Sentry for application error tracking. While we sanitize error messages to minimize PHI exposure, error logs may occasionally contain Protected Health Information in stack traces or request data.

HIPAA requires us to have a signed Business Associate Agreement (BAA) with Sentry.

Please provide:
1. Your standard Business Associate Agreement
2. Guidance on HIPAA-compliant Sentry configuration
3. Data scrubbing best practices for PHI
4. SOC 2 Type II report

Account Details:
- Organization Slug: [YOUR_ORG]
- Plan: [CURRENT_PLAN]
- Account Email: [YOUR_EMAIL]

If BAA requires plan upgrade, please advise on pricing and timeline.

Target signature date: [DATE - 2 weeks from now]

Please send the BAA to: legal@holilabs.com

Best regards,
[Your Name]
[Title]
HOLI Labs
```

---

### 6. Resend (Email Delivery)
- **Service**: Transactional email for appointment reminders, lab results
- **PHI Exposure**: Email content may include patient names, appointment times, lab results
- **Contact**: support@resend.com, legal@resend.com
- **Known BAA Status**: Unknown - must verify HIPAA compliance
- **Action**: Contact support to request BAA
- **Alternative**: If Resend does not provide BAA, migrate to SendGrid (HIPAA-eligible with BAA)

**Email Draft:**
```
Subject: HIPAA Compliance & BAA Request for Healthcare Use Case

Dear Resend Team,

We are HOLI Labs, a healthcare technology company planning to use Resend for transactional emails containing Protected Health Information (PHI), including:
- Appointment reminders (patient name, appointment time)
- Lab result notifications
- Prescription ready notifications

HIPAA regulations require a signed Business Associate Agreement (BAA) with email service providers handling PHI.

Questions:
1. Does Resend offer HIPAA-compliant email services?
2. Do you provide a Business Associate Agreement (BAA)?
3. What security measures are in place for PHI in email (encryption, access controls)?

Account Details:
- Account Email: [YOUR_EMAIL]
- API Key: [FIRST 8 CHARACTERS]

If Resend does not currently support HIPAA compliance, please let us know within 7 days so we can evaluate alternative providers.

Thank you,
[Your Name]
[Title]
HOLI Labs
legal@holilabs.com
```

---

### 7. Twilio (SMS/Voice)
- **Service**: SMS appointment reminders, voice notifications
- **PHI Exposure**: SMS content may include patient names, appointment times
- **Contact**: legal@twilio.com, compliance@twilio.com
- **Known BAA Status**: Twilio offers BAA for healthcare customers
- **Action**: Request BAA through Twilio support or account manager
- **Resources**: https://www.twilio.com/docs/usage/security-and-compliance/hipaa

**Email Draft:**
```
Subject: BAA Request - HIPAA-Compliant SMS/Voice Services

Dear Twilio Legal Team,

We are HOLI Labs, a HIPAA-covered entity using Twilio for SMS appointment reminders and voice notifications to patients.

Our SMS messages may contain:
- Patient first names
- Appointment dates and times
- Clinic location
- Brief health reminders

Per HIPAA §164.502(e)(2), we require a signed Business Associate Agreement (BAA).

Please provide:
1. Your standard HIPAA Business Associate Agreement
2. HIPAA compliance configuration guide for SMS
3. Recommendations for PHI minimization in SMS
4. SOC 2 Type II report

Account Details:
- Account SID: [YOUR_ACCOUNT_SID]
- Phone Number: [YOUR_TWILIO_NUMBER]
- Account Email: [YOUR_EMAIL]

Target signature date: [DATE - 2 weeks from now]

Please send the BAA to: legal@holilabs.com

Best regards,
[Your Name]
[Title]
HOLI Labs
```

---

### 8. Medplum (FHIR Server)
- **Service**: FHIR-based EHR integration, patient data storage
- **PHI Exposure**: Stores all patient FHIR resources (observations, conditions, medications)
- **Contact**: hello@medplum.com, support@medplum.com
- **Known BAA Status**: ✅ Medplum provides BAA as part of service
- **Action**: Request BAA if not already provided during onboarding
- **Resources**: https://www.medplum.com/docs/compliance/hipaa

**Status Check:**
- [ ] Verify if BAA was signed during Medplum onboarding
- [ ] If not, request immediately from hello@medplum.com
- [ ] Confirm BAA is stored securely in `/legal/signed-baas/`

---

## Tracking & Monitoring

### BAA Request Tracker

| Vendor | Email Sent Date | Follow-up Date | BAA Received | Signed Date | Status |
|--------|----------------|----------------|--------------|-------------|--------|
| DigitalOcean | - | - | - | - | ⏳ Pending |
| Upstash | - | - | - | - | ⏳ Pending |
| Anthropic | - | - | - | - | ⏳ Pending |
| Deepgram | - | - | - | - | ⏳ Pending |
| Sentry | - | - | - | - | ⏳ Pending |
| Resend | - | - | - | - | ⏳ Pending |
| Twilio | - | - | - | - | ⏳ Pending |
| Medplum | - | - | - | - | ✅ Verify existing |

**Legend:**
- ⏳ **Pending** - Initial request not yet sent
- 🔄 **In Progress** - Request sent, awaiting response
- ✅ **Signed** - BAA executed and stored
- ❌ **Refused** - Vendor does not offer BAA (must find alternative)

---

## Follow-Up Schedule

### Week 1 (Days 1-7)
- **Day 1**: Send initial BAA requests to all 8 vendors
- **Day 3**: Follow up with vendors who haven't acknowledged receipt
- **Day 5**: Escalate to sales/account managers for non-responsive vendors
- **Day 7**: Review responses, identify vendors requiring alternatives

### Week 2 (Days 8-14)
- **Day 8**: Legal review of any received BAAs
- **Day 10**: Negotiate any problematic BAA terms
- **Day 12**: Sign approved BAAs
- **Day 14**: Update vendor checklist with signed BAAs

### Week 3-4 (Days 15-28)
- Continue negotiations for slow-responding vendors
- Evaluate alternative vendors if any refuse BAA
- Final deadline: All BAAs signed by Day 28

---

## Risk Mitigation

### If Vendor Refuses BAA

**Immediate Actions:**
1. Identify alternative HIPAA-compliant vendor
2. Estimate migration timeline and effort
3. Delay production launch if necessary
4. Document decision and alternative evaluation

**Known HIPAA-Compliant Alternatives:**

| Service Type | Primary Vendor | Alternative (with BAA) |
|--------------|----------------|------------------------|
| Redis Cache | Upstash | AWS ElastiCache, Redis Enterprise Cloud |
| Email | Resend | SendGrid, AWS SES, Mailgun |
| SMS | Twilio | Bandwidth, Telnyx |
| Error Tracking | Sentry | Self-hosted Sentry, Rollbar, Bugsnag |

---

## Compliance Checkpoints

Before production launch, verify:

- [ ] All 8 vendors have signed BAAs (or alternatives identified)
- [ ] Signed BAAs stored in `/legal/signed-baas/` (encrypted)
- [ ] BAA register updated in `/legal/VENDOR_BAA_CHECKLIST.md`
- [ ] Calendar reminders set for BAA renewal dates
- [ ] Privacy Officer and HIPAA Security Officer have copies
- [ ] Legal counsel has reviewed all BAAs

**CRITICAL**: Do NOT launch with real patient data until this checklist is 100% complete.

---

## Success Metrics

- **Primary Goal**: 8/8 signed BAAs within 4 weeks
- **Acceptable**: 7/8 signed with alternative identified for 1 vendor
- **Unacceptable**: <7/8 signed (delays production launch)

---

## Next Steps

1. **Immediate (Today)**:
   - [ ] Customize email templates with actual account details
   - [ ] Send BAA request emails to all 8 vendors
   - [ ] Create calendar reminders for follow-ups

2. **Day 3**:
   - [ ] Check for vendor responses
   - [ ] Follow up with non-responsive vendors

3. **Week 2**:
   - [ ] Legal review of received BAAs
   - [ ] Begin negotiations if needed

4. **Week 4**:
   - [ ] Final push for any outstanding BAAs
   - [ ] Evaluate alternatives for refusing vendors

---

**Document Control:**
- **Owner**: Legal & Compliance Team
- **Last Updated**: 2026-01-03
- **Next Review**: Weekly until all BAAs signed
- **Classification**: Internal - Confidential
