# Holi Labs - FHIR Integration Demo Video Recording Guide

Professional screencast guide for recording a demo video showcasing Holi's privacy-preserving FHIR integration with Medplum.

## Table of Contents

1. [Recording Setup](#recording-setup)
2. [Video Segments](#video-segments)
3. [Narration Script](#narration-script)
4. [Key Points to Highlight](#key-points-to-highlight)
5. [Editing Checklist](#editing-checklist)
6. [Publishing](#publishing)

---

## Recording Setup

### Equipment & Software

**Screen Recording**:
- **macOS**: QuickTime Player (Cmd+Shift+5) or ScreenFlow
- **Windows**: OBS Studio or Camtasia
- **Linux**: SimpleScreenRecorder or OBS Studio

**Settings**:
- Resolution: 1920x1080 (1080p)
- Frame rate: 30 fps
- Audio: 48kHz, stereo
- Format: MP4 (H.264 codec)

**Audio**:
- External microphone (Blue Yeti, Rode NT-USB, etc.)
- Quiet room with minimal echo
- Test audio levels before recording

**Terminal Setup**:
- Font: Menlo or Monaco, 14-16pt
- Colors: Solarized Dark or Tomorrow Night
- Window size: 120 columns x 35 rows
- Remove distractions (notifications off, clean desktop)

### Pre-Flight Checklist

```bash
# 1. Start all services
cd /path/to/holilabs
docker-compose up -d postgres redis
cd apps/api && pnpm dev

# 2. Start monitoring
cd infra/monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# 3. Open required browser tabs
open http://localhost:3000/health
open http://localhost:3001  # Grafana
open http://localhost:9090  # Prometheus

# 4. Test demo script
cd demos
./fhir-e2e-demo.sh  # Dry run

# 5. Reset demo data
psql $DATABASE_URL -c "DELETE FROM patient_tokens WHERE org_id = 'org_demo123';"

# 6. Set correlation ID for easy tracking
export CORRELATION_ID="video_demo_$(date +%s)"

# 7. Test audio
say "Testing microphone audio levels"
```

---

## Video Segments

### Segment 1: Introduction (60 seconds)

**Screen**: Terminal + Grafana dashboard side-by-side

**Shots**:
1. Terminal with ASCII banner (0:00-0:05)
2. Grafana dashboard overview (0:05-0:15)
3. Architecture diagram (0:15-0:30)
4. Terminal ready to start (0:30-0:60)

**Narration**: See [Narration Script - Introduction](#introduction)

### Segment 2: Patient Creation & Sync (90 seconds)

**Screen**: Terminal + Grafana dashboard

**Shots**:
1. Run demo script Step 1 (0:00-0:20)
2. Zoom in on "Patient created" success message (0:20-0:25)
3. Show Grafana queue metrics updating (0:25-0:40)
4. SQL query showing patient in database (0:40-0:60)
5. Show Medplum patient search (0:60-0:90)

**Narration**: See [Narration Script - Patient Creation](#patient-creation--sync)

### Segment 3: Clinical Data & External Ingestion (120 seconds)

**Screen**: Terminal + Grafana dashboard

**Shots**:
1. Run demo script Step 2 (create clinical data) (0:00-0:30)
2. Show observations table in database (0:30-0:45)
3. Run demo script Step 3 (ingest external FHIR) (0:45-0:75)
4. Show JSON bundle structure (0:75-0:90)
5. Show Grafana FHIR sync panel (0:90-0:120)

**Narration**: See [Narration Script - Clinical Data](#clinical-data--external-ingestion)

### Segment 4: Export & RBAC (90 seconds)

**Screen**: Terminal + Browser with JSON viewer

**Shots**:
1. Run demo script Step 4 (export bundle) (0:00-0:20)
2. Show exported FHIR Bundle in JSON viewer (0:20-0:50)
3. Explain RBAC tiers diagram (0:50-0:70)
4. Show consent validation code (0:70-0:90)

**Narration**: See [Narration Script - Export & RBAC](#export--rbac)

### Segment 5: Audit Trail & Monitoring (120 seconds)

**Screen**: Terminal + Grafana dashboard

**Shots**:
1. Run demo script Step 5 (audit trail) (0:00-0:30)
2. Show audit events table (0:30-0:50)
3. Show audit mirror stats (0:50-0:70)
4. Run demo script Step 7 (monitoring) (0:70-0:90)
5. Grafana dashboard deep dive (0:90-0:120)

**Narration**: See [Narration Script - Audit & Monitoring](#audit-trail--monitoring)

### Segment 6: Reconciliation & Validation (60 seconds)

**Screen**: Terminal + Grafana

**Shots**:
1. Run demo script Step 6 (reconciliation) (0:00-0:30)
2. Show reconciliation results (0:30-0:45)
3. Show Prometheus metrics (0:45-0:60)

**Narration**: See [Narration Script - Reconciliation](#reconciliation--validation)

### Segment 7: Summary & Next Steps (45 seconds)

**Screen**: Architecture diagram + Terminal

**Shots**:
1. Show complete data flow diagram (0:00-0:15)
2. Show success summary in terminal (0:15-0:30)
3. Show documentation link (0:30-0:45)

**Narration**: See [Narration Script - Summary](#summary--next-steps)

**Total Duration**: ~9 minutes

---

## Narration Script

### Introduction

**On-Screen Text**: "Holi Labs - Privacy-Preserving FHIR Integration"

**Narration**:
> Welcome to Holi Labs FHIR integration demo. Today, I'll show you our production-grade FHIR bridge with Medplum that maintains privacy while enabling full interoperability.
>
> Our architecture follows a "Data is Toxic" principle - we minimize PII exposure while still providing complete clinical data synchronization with external EHR systems.
>
> This demo covers seven key areas: patient creation, clinical data sync, external FHIR ingestion, secure data export, comprehensive audit trails, real-time monitoring, and automatic reconciliation.
>
> Let's start by verifying our environment is ready.

**Terminal Commands**:
```bash
curl -s http://localhost:3000/health | jq '.status'
# Output: "healthy"
```

### Patient Creation & Sync

**On-Screen Text**: "Step 1: Create Patient → Auto-Sync to Medplum"

**Narration**:
> First, we'll create a patient in Holi using our PatientToken model. Notice that the token ID - "pt_abc123" - contains no personally identifiable information. This is a critical privacy feature.
>
> Watch what happens when we create this patient. Our Prisma middleware automatically intercepts the database write and enqueues a FHIR sync job to BullMQ.
>
> [Run script Step 1]
>
> There - patient created in just 50 milliseconds. Now let's watch the queue metrics in Grafana. See that spike? That's our sync job being processed.
>
> [Switch to Grafana]
>
> The job completes in under 15 seconds. Let's verify the patient was created in Medplum. Notice the FHIR Patient resource contains only minimal demographics - the full PII stays encrypted in Holi's database.
>
> This is our privacy-preserving bridge in action.

**Terminal Commands**:
```bash
# Step 1 output
[SUCCESS] Patient created: pt_abc123def456
[INFO] Waiting for sync to Medplum (20s)...
[SUCCESS] Patient synced to Medplum (fhir_id: Patient/xyz789)
```

**Key Metrics to Show**:
- `holi_queue_jobs_active` spike from 0 to 1
- `holi_fhir_sync_operations_total{resource_type="Patient"}` increment
- `holi_fhir_sync_duration_seconds` histogram

### Clinical Data & External Ingestion

**On-Screen Text**: "Steps 2-3: Clinical Data + External EHR Ingestion"

**Narration**:
> Next, we'll create clinical data - one encounter and three observations for vital signs. Again, these are automatically synced to Medplum within 60 seconds.
>
> [Run script Step 2]
>
> Now here's where it gets interesting. In real healthcare workflows, data comes from external EHR systems - lab results from Quest Diagnostics, imaging from a radiology center, prescriptions from pharmacy systems.
>
> We'll ingest a FHIR Bundle containing five lab observations - a complete cholesterol panel. This bundle comes from an external EHR in standard FHIR R4 format with LOINC codes.
>
> [Show JSON bundle]
>
> Our FHIR ingress adapter parses this bundle, maps it to Holi's internal models, and preserves the original FHIR metadata in a JSONB field for future reference.
>
> [Run script Step 3]
>
> Five observations imported successfully. These are now part of the patient's longitudinal record and will be included in any future FHIR exports.

**Terminal Commands**:
```bash
# Step 2 output
[SUCCESS] Encounter created: enc_111222333
[SUCCESS] Observation created: obs_blood_pressure
[SUCCESS] Observation created: obs_heart_rate
[SUCCESS] Observation created: obs_weight

# Step 3 output
[SUCCESS] Bundle ingested: 5 observations processed
[SUCCESS] Lab results: Glucose, Cholesterol (Total, HDL, LDL), Triglycerides
```

**JSON to Show** (briefly):
```json
{
  "resourceType": "Observation",
  "status": "final",
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "2339-0",
      "display": "Glucose [Mass/volume] in Blood"
    }]
  },
  "valueQuantity": {"value": 95, "unit": "mg/dL"}
}
```

### Export & RBAC

**On-Screen Text**: "Step 4: FHIR Export with RBAC & Consent"

**Narration**:
> Now let's export the patient's complete FHIR record using the standard `$everything` operation. This is the endpoint that patient portals, mobile apps, and third-party EHR systems would call.
>
> [Run script Step 4]
>
> Before returning data, our API enforces a 4-tier RBAC model. Tier 1 is for platform admins - they can access everything. Tier 2 is for patients accessing their own data - they need an active consent record. Tier 3 is for clinicians accessing assigned patients. Tier 4 is for researchers getting de-identified aggregated data.
>
> [Show RBAC diagram]
>
> In this case, we're using an ADMIN role, so we get the complete bundle - one Patient resource, one Encounter, and eight Observations. That's our three vitals plus five lab results, all in standard FHIR R4 format.
>
> [Show JSON output]
>
> Any external EHR system can now consume this bundle without any custom integration. That's the power of FHIR interoperability.

**Terminal Commands**:
```bash
# Step 4 output
[SUCCESS] Bundle exported: 10 resources (1 Patient, 1 Encounter, 8 Observations)
```

**JSON to Show** (excerpt):
```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 10,
  "entry": [
    {"resource": {"resourceType": "Patient", ...}},
    {"resource": {"resourceType": "Encounter", ...}},
    {"resource": {"resourceType": "Observation", ...}},
    ...
  ]
}
```

**RBAC Diagram** (text):
```
Tier 1: ADMIN       → Everything
Tier 2: PATIENT     → Own data (with consent)
Tier 3: CLINICIAN   → Assigned patients (org-scoped)
Tier 4: RESEARCHER  → De-identified aggregated data
```

### Audit Trail & Monitoring

**On-Screen Text**: "Steps 5 & 7: HIPAA Audit Trail + Real-Time Monitoring"

**Narration**:
> HIPAA compliance requires a complete audit trail of all PHI access. Let's verify our audit events.
>
> [Run script Step 5]
>
> We've logged 15 audit events - patient creation, observations created, bundle export, and more. Each event includes a correlation ID for distributed tracing, the actor who performed the action, and a timestamp.
>
> But here's the critical part - these audit events are bidirectionally mirrored with Medplum. When Holi creates an event, it's sent to Medplum as a FHIR AuditEvent resource. When Medplum logs an event, our mirror service pulls it back to Holi's audit table.
>
> [Show audit mirror stats]
>
> This bidirectional sync ensures we have a complete, tamper-evident audit trail across both systems - essential for HIPAA compliance and incident investigation.
>
> Now let's look at monitoring. We're using Prometheus for metrics collection and Grafana for visualization.
>
> [Run script Step 7, switch to Grafana]
>
> Our dashboard has 21 panels across 10 categories. Here at the top, we see system health - API is up, database connected, queue processing normally. Below that, API performance - request rate, response times, error rates.
>
> [Scroll through dashboard]
>
> This panel shows queue health - zero failed jobs, which is what we want to see. This one shows FHIR sync operations - 10 successful syncs, zero errors. And here's the HIPAA compliance panel - 15 audit events logged, all consent validations passed.
>
> We've configured 23 production alerts across four severity tiers. P1 alerts - like API server down or HIPAA audit failure - page the on-call engineer immediately via PagerDuty. P2 and P3 alerts go to Slack. All alerts include runbook links for quick resolution.

**Terminal Commands**:
```bash
# Step 5 output
[SUCCESS] Holi audit events: 15 events logged
[SUCCESS] Audit mirror stats: 10 Medplum events mirrored to Holi
[SUCCESS] Bidirectional sync working correctly

# Step 7 output
[SUCCESS] Queue metrics: 0 active, 0 waiting, 0 failed, 10 completed
[SUCCESS] FHIR sync metrics: 10 operations, 0 errors
[SUCCESS] HIPAA audit metrics: 15 events logged
```

**Grafana Panels to Highlight**:
- System Health (top row)
- Queue Health (failed jobs = 0)
- FHIR Sync Operations (success count)
- HIPAA Compliance (audit events)

### Reconciliation & Validation

**On-Screen Text**: "Step 6: Automatic Drift Detection & Correction"

**Narration**:
> Even with automatic sync, network failures or API errors can cause drift - resources in Holi that aren't in Medplum, or vice versa. Our reconciliation job runs nightly to detect and fix this.
>
> [Run script Step 6]
>
> The reconciliation engine checks all resources, compares their `last_synced_at` timestamps, and identifies any that are stale - not synced in over an hour.
>
> In this demo, we have perfect sync - 10 resources checked, zero errors, zero corrections needed. Our `holi_fhir_sync_stale` metric shows zero for all resource types.
>
> If drift is detected, the reconciliation job automatically re-queues the resources for sync and alerts the team via Slack. This ensures long-term data consistency without manual intervention.

**Terminal Commands**:
```bash
# Step 6 output
[SUCCESS] Reconciliation complete: 10 resources checked, 0 errors, 0 corrected
[SUCCESS] No sync drift detected
```

**Prometheus Query to Show**:
```bash
curl -s http://localhost:3000/metrics | grep "holi_fhir_sync_stale"
# Output: holi_fhir_sync_stale{resource_type="Patient"} 0
```

### Summary & Next Steps

**On-Screen Text**: "Complete Privacy-Preserving FHIR Integration"

**Narration**:
> Let's recap what we've built. We have a complete privacy-preserving FHIR integration that:
>
> - Automatically syncs clinical data to Medplum within 60 seconds
> - Ingests external FHIR data from any EHR system
> - Enforces 4-tier RBAC with consent validation
> - Maintains a complete bidirectional audit trail
> - Monitors everything in real-time with Prometheus and Grafana
> - Detects and corrects sync drift automatically
>
> All while keeping PII encrypted and minimizing data exposure through our PatientToken pseudonymization model.
>
> This is production-grade, HIPAA-compliant, and ready to scale. Our North Star KPIs are 99.9% uptime, sub-300ms latency, 100% mirroring within 60 seconds, and zero unresolved sync failures.
>
> For more details, check out our comprehensive documentation at the link shown. Thanks for watching!

**Terminal Commands**:
```bash
# Show final success message
[INFO] ==========================================
[SUCCESS] DEMO COMPLETED SUCCESSFULLY! 🎉
[INFO] ==========================================
```

**On-Screen Text** (final slide):
```
Documentation: docs/MEDPLUM_INTEGRATION.md
GitHub: github.com/HolisticHealthcareLabs/holilabs
Contact: engineering@holilabs.xyz
```

---

## Key Points to Highlight

### Must-Mention Features

1. **Privacy-Preserving Architecture**:
   - PatientToken pseudonymization (no PII in token ID)
   - Encrypted PII stays in Holi database
   - Medplum gets minimal demographics
   - "Data is Toxic" principle

2. **Automatic Bidirectional Sync**:
   - Prisma middleware intercepts all writes
   - BullMQ queue for async processing
   - < 60 second sync latency
   - Exponential backoff retry logic

3. **FHIR Interoperability**:
   - Standard FHIR R4 format
   - LOINC codes for observations
   - `$everything` bundle export
   - Compatible with any EHR system

4. **RBAC & Consent**:
   - 4-tier role model (ADMIN, PATIENT, CLINICIAN, RESEARCHER)
   - Active consent required for Tier 2/3
   - Data class filtering
   - Org-scoped access control

5. **HIPAA Compliance**:
   - Complete audit trail (every access logged)
   - Bidirectional audit mirroring
   - Tamper-evident logging
   - Compliance-ready for BAA

6. **Production Monitoring**:
   - 60+ Prometheus metrics
   - 21-panel Grafana dashboard
   - 23 production alerts (P1-P4)
   - PagerDuty integration

7. **Automatic Reconciliation**:
   - Nightly drift detection
   - Automatic sync correction
   - Metrics for stale resources
   - Zero manual intervention

### Visual Cues to Include

- **Green checkmarks**: For successful operations
- **Colored terminal output**: Makes demo more engaging
- **JSON formatting**: Use JSON viewer for pretty-printed output
- **Grafana panels**: Zoom in on key metrics
- **Architecture diagrams**: Include for context
- **Code snippets**: Show key middleware/sync logic
- **Timestamps**: Highlight sync speed (<60s)

### Common Mistakes to Avoid

1. **Don't** go too fast - pause for 2-3 seconds after each success message
2. **Don't** skip error handling - mention retry logic and reconciliation
3. **Don't** ignore privacy features - emphasize PatientToken pseudonymization
4. **Don't** forget to show Grafana - monitoring is critical
5. **Don't** skip RBAC demo - show both authorized and unauthorized attempts
6. **Don't** overlook audit trail - HIPAA compliance is key differentiator

---

## Editing Checklist

### Post-Production Steps

- [ ] **Intro Slide** (0:00-0:05): Add title card with Holi Labs logo
- [ ] **Subtitles**: Add captions for accessibility (use Rev.com or Descript)
- [ ] **Annotations**: Add arrows/highlights for key terminal output
- [ ] **Music**: Add subtle background music (low volume, ~20%)
- [ ] **Transitions**: Add smooth transitions between segments (0.5s fade)
- [ ] **Zoom Effects**: Zoom in on key terminal output (success messages, metrics)
- [ ] **Lower Thirds**: Add text overlays for each step ("Step 1: Patient Creation")
- [ ] **Outro Slide** (9:00-9:15): Add contact info and documentation link

### Technical Checks

- [ ] **Audio Levels**: Normalize to -16 LUFS (YouTube standard)
- [ ] **Video Quality**: 1080p, 30fps, H.264 codec
- [ ] **Bitrate**: 5-8 Mbps for YouTube upload
- [ ] **File Size**: < 500 MB for easy distribution
- [ ] **Watermark**: Add Holi Labs logo (bottom-right, 50% opacity)

### Content Review

- [ ] **Accuracy**: Verify all metrics, timestamps, and success messages are correct
- [ ] **Pacing**: Ensure demo doesn't rush (9-10 minutes is ideal)
- [ ] **Clarity**: Confirm narration is clear and jargon is explained
- [ ] **Completeness**: All 7 steps are covered with adequate depth

---

## Publishing

### YouTube Upload

**Title**: "Holi Labs - Privacy-Preserving FHIR Integration with Medplum (Full Demo)"

**Description**:
```
Watch a complete demo of Holi Labs' production-grade FHIR integration with Medplum, showcasing privacy-preserving architecture, automatic bidirectional sync, and real-time monitoring.

🔒 Key Features:
• PatientToken pseudonymization (no PII exposure)
• Automatic sync to Medplum (< 60 seconds)
• External FHIR data ingestion (from any EHR)
• 4-tier RBAC with consent validation
• Complete HIPAA audit trail
• Real-time Prometheus monitoring
• Automatic drift reconciliation

📋 Timestamps:
0:00 - Introduction
1:00 - Patient Creation & Auto-Sync
2:30 - Clinical Data & External EHR Ingestion
5:00 - FHIR Export with RBAC
6:30 - Audit Trail & Monitoring
8:30 - Reconciliation & Summary

📖 Documentation:
https://github.com/HolisticHealthcareLabs/holilabs/blob/main/docs/MEDPLUM_INTEGRATION.md

💬 Contact:
engineering@holilabs.xyz

#FHIR #Healthcare #Interoperability #HIPAA #PrivacyByDesign
```

**Tags**:
FHIR, healthcare, interoperability, Medplum, HIPAA, privacy, EHR, HL7, LOINC, healthcare tech, medical software, patient portal

**Thumbnail**:
- High-contrast text: "Privacy-Preserving FHIR Integration"
- Screenshot of Grafana dashboard
- Holi Labs logo

### Additional Platforms

1. **LinkedIn**: Post with key takeaways and link to YouTube
2. **Twitter/X**: Thread breaking down each step
3. **Company Website**: Embed on "Solutions" page
4. **Documentation**: Link from MEDPLUM_INTEGRATION.md
5. **Sales Materials**: Include in pitch decks and demos

### Internal Distribution

1. **Engineering Team**: Share in Slack `#engineering`
2. **Sales Team**: Add to demo toolkit
3. **Customer Success**: Use for onboarding new customers
4. **Compliance Team**: Reference for HIPAA BAA discussions

---

## Additional Resources

### B-Roll Ideas

Consider recording additional footage for editing:

1. **Architecture Diagrams**: Animated flow of data through system
2. **Code Walkthrough**: Show key files (Prisma middleware, sync service)
3. **Database Queries**: SQL queries showing audit trail
4. **Medplum UI**: Show patient record in Medplum dashboard
5. **Alert Demo**: Trigger a test alert, show PagerDuty notification

### Shorter Clips

Create 1-2 minute clips for social media:

1. **"Privacy-Preserving Architecture"**: Focus on PatientToken model
2. **"Automatic Sync in Action"**: Show queue processing and Grafana metrics
3. **"FHIR Interoperability"**: Show bundle export and JSON structure
4. **"Production Monitoring"**: Grafana dashboard deep dive

### Live Demo Tips

If presenting live (not recorded):

1. **Have a backup**: Pre-record a video in case of live demo failure
2. **Test connectivity**: Verify Medplum API is reachable
3. **Seed data**: Have demo patients ready to avoid waiting for sync
4. **Practice timing**: Rehearse to fit in your time slot
5. **Q&A prep**: Prepare answers for common questions:
   - "How do you handle Medplum downtime?"
   - "What's the cost of Medplum hosting?"
   - "Can we use this with Epic/Cerner?"
   - "Is this HIPAA compliant?"
   - "What about FHIR R5?"

---

## Script Timing Breakdown

| Segment | Duration | Content |
|---------|----------|---------|
| Introduction | 60s | Architecture overview, environment check |
| Patient Creation | 90s | Create patient, show sync, verify in Medplum |
| Clinical Data | 60s | Create encounter and observations |
| External Ingestion | 60s | Ingest FHIR bundle from EHR |
| Export & RBAC | 90s | Export bundle, explain RBAC tiers |
| Audit Trail | 60s | Show audit events, mirror stats |
| Monitoring | 60s | Prometheus metrics, Grafana dashboard |
| Reconciliation | 60s | Run reconciliation, show drift detection |
| Summary | 45s | Recap features, next steps |
| **Total** | **9:45** | **Complete demo with buffer** |

---

## Recording Checklist

Before hitting record:

- [ ] All services running (API, Postgres, Redis, Medplum)
- [ ] Monitoring stack started (Prometheus, Grafana, Alertmanager)
- [ ] Terminal font size 14-16pt, colors configured
- [ ] Browser tabs open (Grafana, Prometheus, Medplum)
- [ ] Notifications disabled (Do Not Disturb mode on)
- [ ] Clean desktop (no sensitive files visible)
- [ ] Demo data reset (no leftover test patients)
- [ ] Environment variables set correctly
- [ ] Microphone tested, audio levels good
- [ ] Screen recording software tested
- [ ] Narration script printed/on second monitor
- [ ] Timer ready (to stay within 10 minutes)

During recording:

- [ ] Speak clearly and at moderate pace
- [ ] Pause 2-3 seconds after each success message
- [ ] Highlight key output (use mouse cursor to point)
- [ ] Explain jargon (FHIR, LOINC, BullMQ, etc.)
- [ ] Show enthusiasm (but stay professional)
- [ ] Avoid filler words ("um", "uh", "like")

After recording:

- [ ] Watch full video, note any mistakes
- [ ] Re-record sections if needed (edit together later)
- [ ] Backup raw footage (multiple locations)
- [ ] Export in multiple formats (1080p, 720p)
- [ ] Send for review before publishing

---

## License

Copyright © 2024 Holi Labs. All rights reserved.
