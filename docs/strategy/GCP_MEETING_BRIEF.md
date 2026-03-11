# Google Cloud Meeting Brief — Holi Labs

**Prepared for:** Meeting with Angimar Damas, Google Cloud Representative
**Date:** March 2026
**Objective:** Secure maximum startup credits + technical support + BAA/DPA for healthcare compliance

---

## 1. Company Pitch (2 minutes)

**Holi Labs / Cortex** is a clinical AI co-pilot for Latin American healthcare.

We help doctors in Brazil, Bolivia, and Argentina with:
- **Ambient clinical documentation** — AI listens during consultations, generates SOAP notes
- **Clinical Decision Support (CDSS)** — drug interaction checks, lab alerts, diagnostic suggestions
- **Medical billing compliance** — ICD-10/TUSS code suggestions, claim error reduction

We are NOT a medical device. We are clinical decision support (ANVISA Class I). The doctor always has the final say.

**Market:** 500K+ physicians in Brazil alone. No dominant AI co-pilot for LATAM healthcare.

**Stage:** Pre-revenue, working prototype, first A/B tests with clinicians planned for Q2 2026.

---

## 2. Why Google Cloud (Frame for Angimar)

We already use **Google Gemini as our primary AI model** for clinical notes, billing codes, and patient education. Gemini handles ~60% of our AI workload today.

Moving to GCP deepens this relationship:

| Current (API Key) | GCP (Vertex AI) | Benefit |
|--------------------|-----------------|---------|
| Public API endpoint | VPC-isolated | No PII risk via public internet |
| No data residency guarantee | southamerica-east1 | LGPD Art. 33 compliance |
| Standard rate limits | Dedicated capacity | Reliability for clinical use |
| No audit logging | Cloud Audit Logs | SOC 2 evidence |

We also need:
- **Cloud SQL** (PostgreSQL 15) in Sao Paulo for LGPD data residency
- **Cloud Healthcare API** for FHIR R4 interoperability with Brazilian hospitals (RNDS/TISS)
- **Cloud Run** for scalable, serverless deployment
- **Cloud KMS + Secret Manager** for encryption key management

---

## 3. Credit Ask

**Requested tier:** $200K-$350K over 24 months

**Justification:**
- Healthcare AI in underserved LATAM market (Google's strategic focus)
- Already a Gemini-first architecture — natural GCP fit
- FHIR interoperability via Cloud Healthcare API (showcase customer)
- 3-country expansion (Brazil, Bolivia, Argentina) using GCP regions

**Projected GCP spend:** $800-$1,500/month
- Cloud SQL: $100-200/mo
- Cloud Run: $30-100/mo
- Vertex AI: $200-500/mo
- Cloud Storage: $10-30/mo
- Cloud Healthcare API: $50-100/mo
- Secret Manager + KMS: $5-10/mo
- Networking/monitoring: $20-50/mo

At $1,500/mo, $200K in credits covers **133 months** (11 years). At $350K, practically unlimited for our stage.

---

## 4. What We Ask From Google (Beyond Credits)

1. **BAA (Business Associate Agreement)** — Required before any patient data touches GCP. Google Cloud offers this for HIPAA; we need confirmation it covers LGPD equivalents.
2. **Data Processing Addendum** — Must explicitly include LGPD Art. 33 compliance and Brazil data residency guarantee for `southamerica-east1`.
3. **Technical support hours** — Dedicated SE for Healthcare API onboarding.
4. **Co-marketing opportunity** — Feature Holi Labs as a LATAM healthcare reference customer for Cloud Healthcare API.
5. **Google for Startups Cloud Program** enrollment (if not already).

---

## 5. What We Do NOT Want

- **Exclusivity.** Our Terms of Service (Section 4.6) commits to AI model transparency and multi-provider choice. We will continue using Anthropic Claude for safety-critical clinical tasks alongside Gemini.
- **GKE/Kubernetes.** Cloud Run is the right fit for our single-container Next.js app.
- **Firestore/Spanner.** We use PostgreSQL via Prisma ORM and need Cloud SQL specifically.

---

## 6. Technical Stack Summary

| Layer | Technology | GCP Migration Target |
|-------|-----------|---------------------|
| Framework | Next.js 14 (App Router) | Cloud Run |
| Database | PostgreSQL 15 (DigitalOcean) | Cloud SQL (southamerica-east1) |
| AI | Gemini (primary), Claude, OpenAI | Vertex AI + direct APIs |
| FHIR | Medplum (self-hosted) | Cloud Healthcare API |
| Storage | Cloudflare R2 | Cloud Storage |
| Transcription | Deepgram Nova-3 (pt/es medical) | Keep Deepgram (no GCP LATAM STT) |
| Secrets | AWS Secrets Manager | Secret Manager |
| Auth | NextAuth v5 | Unchanged |
| CI/CD | GitHub Actions | Unchanged (deploy target: Cloud Run) |

---

## 7. Timeline

| Phase | Weeks | What |
|-------|-------|------|
| 0 | 1-2 | GCP project, IAM, VPC, networking |
| 1 | 3-4 | Cloud Run deployment (staging + production) |
| 2 | 5-6 | Cloud SQL migration + Secret Manager |
| 3 | 7-8 | Vertex AI integration |
| 4 | 9-12 | Cloud Storage + Healthcare API |

---

## 8. Questions for Angimar

1. What credit tier is available for healthcare AI startups in LATAM?
2. Is a BAA available for Google Cloud in the context of Brazilian healthcare (LGPD, ANVISA)?
3. Does the Google for Startups program include dedicated technical support for Healthcare API?
4. Is there a co-marketing or case study opportunity for LATAM healthcare customers?
5. What is the credit expiration timeline?
6. Can credits cover Vertex AI Gemini usage, or only infrastructure?
