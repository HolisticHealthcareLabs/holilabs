# Holi Labs / Holi Protocol — Operational Functionality + Landing Page Truth Set
**Last updated:** 2026-02-06  
**Source basis:** Internal strategy/roadmap docs listed in the request **plus** this repo’s actual landing implementations (`apps/web/src/app/page.tsx`, `apps/web/src/components/landing/*`, `public/landing.html`), plus product packaging docs for `apps/sidecar`.

---

## Executive summary (what exists in this repo)
This repository currently contains **multiple “products” and narratives** that overlap but are not identical:

- **Holi Labs Web Application (`apps/web`)**: A Next.js app with clinician-facing and patient-facing surfaces plus many healthcare workflow APIs (scribe, scheduling, prevention, documents, DICOMweb, FHIR/HL7 endpoints, messaging, billing).
- **Holi Labs API (`apps/api`)**: A Fastify service (separate from the Next.js API routes) with Prisma, auth primitives, and supporting services.
- **Cortex Sidecar (`apps/sidecar`)**: A desktop application intended to run on clinical workstations; requires **Accessibility + Screen Recording** permissions and supports enterprise deployment (GPO/Jamf/Intune). Documentation explicitly states **“All rights reserved”**.
- **Edge Node (`apps/edge`)**: A hospital LAN sync server (Express + SQLite) referenced by the Sidecar deployment docs.
- **Two landing implementations**:
  - `apps/web/src/app/page.tsx`: The current Next.js “Holi Labs” landing focused on **clinical assurance / interception / governance** (“Cortex” positioning).
  - `public/landing.html`: A static “Holi Protocol” landing focused on **“open-source protocol”** claims and a different AI stack narrative.

Because the site and documents currently mix “Holi Labs”, “Holi Protocol”, and “Cortex” concepts, the landing page needs a **single, factual story** that is consistent with what is actually shippable and what is roadmap.

---

## Operational functionality (what the application does)
Below is the full operational surface area implied by the listed docs and corroborated by routes/packages present in this repo. Where implementation status is unclear, it’s marked **(verify)** and should not be marketed as “live in production” without evidence.

### 1) Identity, tenants, and access control
- **Multi-tenant org model (clinics/hospitals)** (verify): org setup, user provisioning, role-based access patterns.
- **Clinician auth**: email/password and/or OAuth patterns are described in docs; code contains auth endpoints and session handling.
- **Patient portal auth**: magic-link and OTP flows exist in the repo (`/api/portal/auth/*`).
- **RBAC & policy enforcement**: docs and code mention role-based access, governance rules, and access grants.
- **Audit logging & access rationale**: described in “Data Supremacy” + various governance/audit routes.

### 2) Core clinical record and workflows (EHR-like)
- **Patient management**: CRUD, search, import/export, consent preferences, deletion workflows.
- **Clinical notes**: create/read/update, versioning endpoints exist.
- **Medications, allergies, diagnoses, vitals**: endpoints exist for patient-level clinical primitives (routes present).
- **Orders/tasks**: task endpoints exist (patient tasks, prevention tasks, etc.).

### 3) AI-assisted clinical documentation (“scribe”)
- **Transcription sessions**: endpoints exist for scribe sessions and Deepgram tokens/health checks.
- **SOAP note generation**: described extensively in docs; codebase includes AI provider dependencies (Anthropic, OpenAI, Google) and scribe routes. Exact runtime behavior should be validated before making quantitative claims.
- **Human-in-the-loop editing**: docs and implementation patterns imply clinician review/edit prior to finalization.

### 4) Prevention and longitudinal care operations
- **Screening triggers & prevention hub**: numerous prevention endpoints exist (screenings, plans, hub actions, analytics, history).
- **Reminders & follow-ups**: reminder/notification cron endpoints exist; messaging integrations are referenced.
- **Clinical decision support (CDS)**: “decision support” routes exist (drug interactions, decision, diagnosis, treatment options, urgency evaluation).

### 5) Scheduling, appointments, waitlists
- **Appointments**: create/update/status routes exist.
- **Operational scheduling**: availability/time-off/recurring schedules/waiting list/no-show endpoints exist.
- **Appointment reminders**: cron endpoints exist for sending reminders.

### 6) Patient engagement and communications
- **Patient portal**: pages exist for records, documents, billing, messages, notifications, medications, appointments.
- **Messaging**: conversations/messages endpoints exist.
- **Notifications**: push subscription endpoints exist; WhatsApp/SMS/email are referenced in docs and dependencies (e.g., Twilio present in `apps/web`).

### 7) Labs and imaging
- **Lab results**: endpoints exist for lab results + monitoring.
- **Imaging**: DICOMweb endpoints exist (`/api/dicomweb/*`), and the web app includes DICOM tooling dependencies.
- **Document ingestion**: document upload + parsing endpoints exist; docs describe OCR and extraction patterns.

### 8) Interoperability and integrations
- **FHIR**:
  - SMART-on-FHIR style flows exist (`/api/fhir/launch`, `/api/fhir/callback`).
  - Sync endpoints exist (`/api/fhir/sync/*`).
  - FHIR R4 endpoints exist (`/api/fhir/r4/Patient/*`).
- **HL7**: ADT and ORU endpoints exist.
- **EHR providers**: provider routing endpoints exist (`/api/ehr/providers`, `/api/ehr/[provider]/*`) (verify supported vendors).

### 9) Analytics, research, and “data flywheel”
- **Behavior tracking + data quality events**: described in `DATA_SUPREMACY.md`.
- **Research/aggregate querying**: `/api/research/query` exists; docs specify Safe Harbor constraints and cell suppression.
- **Semantic search**: `/api/search/semantic` exists; docs mention embeddings and pgvector (verify in environment).

### 10) Enterprise desktop “interceptor” + edge deployment
This is the **most defensible “point-of-decision” claim**, because it’s supported by concrete packaging docs:
- **Cortex Sidecar** (`apps/sidecar`): a desktop app intended to run on macOS/Windows and overlay/assist in-workflow.
  - Requires **Accessibility + Screen Recording** permissions on macOS (explicit in `apps/sidecar/docs/INSTALLATION.md`).
  - Supports enterprise deployment (GPO/SCCM/Intune/Jamf) (explicit in `apps/sidecar/docs/ENTERPRISE_DEPLOYMENT.md`).
  - Release distribution via GitHub Releases is described as “coming soon” (explicit in `INSTALLATION.md`).
- **Edge Node** (`apps/edge`): local hospital LAN server the Sidecar can connect to (explicitly referenced in docs; package description says SQLite sync server).

**Important:** the current Next.js landing claims (“reads pixels”, “pre-signature intervention”) should be phrased carefully as “Sidecar-assisted, workstation-resident overlay” and must avoid hard numbers (latency/protocol counts) unless instrumented and verified.

---

## Value added (what’s credible to claim)
The docs are full of numeric outcomes (time savings %, cost savings %, protocol counts, latency, certifications). For landing-page truthfulness, split value into:

### A) Value we can claim qualitatively (low-risk, high-truth)
- **Reduce clinician administrative burden** through transcription + draft note generation with clinician review.
- **Improve safety and consistency** by enforcing policy/rules and capturing audit trails.
- **Enable prevention-first workflows** (screening triggers, reminders, longitudinal plans).
- **Improve patient experience** (portal access, reminders, messaging, document upload).
- **Interoperability readiness** using industry standards (FHIR/HL7/DICOMweb endpoints exist in the repo).
- **Enterprise rollout pathway** for a workstation app (Sidecar) and optional local edge node.

### B) Value that can be claimed only with evidence (high-impact, must verify first)
If you want any of these on the landing page, you need a **source of truth** (benchmarks, customer data, third-party audit, reproducible measurement):
- Documentation time reduction percentages (e.g., “70%”).
- AI cost savings claims (e.g., “97%”).
- Medical transcription accuracy percentages (e.g., “95%+”).
- “115,000+ protocols” count.
- Any performance/latency claims (“<10ms”, “10ms latency”).
- Any certification claims (SOC 2 Type II, ISO anything, HIPAA “certified”).
- Any medical outcome claims (“catches cancer early”, “prevents X events”) unless backed by study design and careful disclaimers.

---

## Fact check: “Are we open source?”
### What the repo **actually supports today**
- There is **no `LICENSE` file** at the repository root (none found by glob search for `LICENSE*` / `COPYING*`).
- Root `package.json` and `apps/web/package.json` both set `"private": true` and do **not** declare an OSI license field.
- `public/landing.html` and the root `README.md` include “open-source / MIT / see LICENSE” claims, but the referenced `LICENSE` file is not present.
- `AEGIS_ARCHITECTURE.md` claims “AGPLv3” and “public domain”, but this is not backed by a license file and conflicts with other docs.
- `apps/sidecar/docs/README.md` includes “All rights reserved” language, which is **incompatible with marketing the whole codebase as open source**.

### Truth-safe conclusion for the landing page
**Do not claim “open source” today.**  
You can safely say **“built on open standards (FHIR/HL7/DICOM)”** and **“supports multiple deployment models (cloud + optional edge)”**, but “open source” requires an explicit, published license and alignment across packages.

### If you want to be open source, the minimum steps
- Choose a licensing strategy:
  - **Single license for entire repo**, or
  - **Dual strategy** (e.g., open-source core + proprietary Sidecar).
- Add the correct license file(s) and ensure headers/docs match.
- Update landing copy and README to reflect the exact scope:
  - “Open-source core libraries (X/Y/Z)” vs “Proprietary Sidecar”.

---

## Landing page: what we are currently promising (and what must change)
You currently have **two competing landing narratives**:

### A) Next.js landing (`apps/web/src/app/page.tsx`)
Positioning: **Holi Labs / Cortex** as “clinical assurance / interception / governance”.
Risky claims currently present in components:
- **“115,000+ protocols”** (`Architecture.tsx`) — must verify or remove.
- **“Pre-signature intervention (<10ms)”** (`ParadigmShift.tsx`) — must verify or remove.
- **“10ms latency” + “SOC2 Type II”** (`DemoRequest.tsx`) — must verify or remove.
- **“ISO 27269”** (`Footer.tsx`) — likely incorrect; must verify or remove.
- **“100% mathematical certainty”** (`Architecture.tsx`) — should be softened; nothing in clinical software is truly “100%” end-to-end without strict scope.

### B) Static landing (`public/landing.html`)
Positioning: **Holi Protocol** as “Open-Source Healthcare Infrastructure” under “MIT License”, with an AI stack description (Whisper + Llama) that conflicts with this repo’s current dependency reality and licensing reality.

**Recommendation:** pick ONE primary landing and retire or clearly label the other as “concept/legacy”.

---

## “What is our play?” (recommended go-to-market story that stays true)
Your internal GTM positioning doc recommends leading with what’s credible now and sequencing bigger claims later. The repo aligns best with a **two-lane story**:

### Lane 1: Clinics / group practices (web platform)
- **Problem**: documentation burden + fragmented patient follow-up + prevention gaps.
- **Offer**: a clinician + patient platform with scribe, prevention workflows, scheduling, portal, messaging, and interoperability.
- **CTA**: “Request demo” / “Join beta” / “Pilot with your clinic”.

### Lane 2: Hospitals / enterprise (Cortex Sidecar + Console + Edge)
- **Problem**: “last mile” risk inside the workstation workflow and inconsistent adherence to SOPs.
- **Offer**: deployable Sidecar overlay + governance/audit stream + optional LAN edge node.
- **CTA**: “Request enterprise pilot” with a clear IT/security checklist.

### What to avoid until verified
- “Open-source” claims.
- Cert claims (SOC2 Type II, ISO) unless you can show an audit report or certificate.
- Hard performance and protocol-count numbers.
- Health outcome claims (“prevents X”) unless you have a study design, published methodology, and careful medical/regulatory review.

---

## Landing page content requirements (what needs to be added to onboard clinics/hospitals)
This is the checklist of content that should exist on the landing site so real clinics/hospitals can evaluate and start.

### 1) Clarify product boundaries and naming
- **Define**: Is the product “Holi Labs”, “Holi Protocol”, “Cortex”, or a suite?
- **Recommended**:
  - Brand the commercial product as **Holi Labs**.
  - Treat **Cortex Sidecar** as an enterprise module.
  - Keep “protocol” language as vision/architecture, not licensing.

### 2) Clear “Who it’s for” paths (two CTAs)
- **Clinics**: “Run Holi Labs in your practice” → demo/trial/pilot.
- **Hospitals/Systems**: “Deploy Cortex in your network” → enterprise pilot + IT deployment guide.

### 3) Implementation and onboarding detail (must be concrete)
For clinics:
- **Time to first value**: what happens in the first day/week (setup, training, first notes, first reminders).
- **Data onboarding**: CSV import, document upload, optional FHIR pull (describe supported workflows).
- **Staff roles**: clinician vs admin vs nurse roles.

For hospitals:
- **IT/security checklist**:
  - workstation OS support (macOS/Windows),
  - permissions required (screen recording/accessibility),
  - network egress requirements,
  - deployment tooling (Jamf/GPO/Intune/SCCM),
  - optional edge node architecture.
- **Pilot design**: 5–10 clinicians in one service line; success metrics defined.

### 4) Security, privacy, compliance pages (no hype; just facts)
You already have legal pages in the app routes (`/legal/*`). Ensure landing links to:
- **Privacy Policy**
- **Terms of Service**
- **BAA** (if offered)
- **DPA / Data Processing Agreement** (for non-US contexts)
- **Cookie Policy**
- **HIPAA notice**

Also add a “Security Overview” page that states only verifiable facts:
- encryption at rest/in transit (how/where),
- audit logging presence,
- access controls model,
- data residency options (if actually offered),
- whether vendors sign BAAs (only if you have executed templates).

### 5) Proof points that are safe
- **Case studies**: include as “examples / illustrative” unless tied to real signed customers.
- **Screenshots / product video**: safest conversion driver if it matches current UI.
- **Technical architecture**: FHIR/HL7/DICOM support, Sidecar + Edge concept.

### 6) Product disclaimers (healthcare-specific)
Add a short, visible disclaimer (site footer + security page):
- AI outputs are clinician-reviewed and **not a substitute for clinical judgment**.
- Clarify whether any module is intended as a “medical device” (regulatory review recommended).

---

## Claim-by-claim truth set (what can be on the landing page)
Use this as a copy review rubric.

### ✅ OK to claim now (grounded in repo/docs)
- “Clinician + patient portals”
- “AI-assisted documentation (transcription + draft notes) with clinician review”
- “Prevention workflows (screening triggers, reminders, plans)”
- “Scheduling, messaging, documents, labs, imaging support”
- “Interoperability endpoints: FHIR/HL7/DICOMweb (implementation present; scope varies)”
- “Enterprise Sidecar available for workstation deployment (macOS/Windows)”
- “Supports enterprise deployment tooling (Jamf/GPO/Intune/SCCM)”

### ⚠️ Only claim if you can cite evidence (otherwise remove/soften)
- Quantified time savings, ROI, accuracy, cost savings
- Hard performance numbers (latency)
- Protocol counts (e.g., “115,000+”)
- “Production deployment” or “production-ready” without a public status page or reference deployments
- “Blockchain verified records” unless you can show the feature in-product

### ❌ Do not claim today (currently contradicted / not verifiable)
- “Open-source” (until licensing is real and consistent)
- “MIT licensed” or “AGPL licensed” (until license file(s) exist and match)
- “SOC 2 Type II” (unless you have the report)
- “ISO 27269” (likely incorrect; replace with verified standards if any)
- “No BAA required” (unsafe for anything handling PHI; remove)
- “100% mathematical certainty” (overbroad; replace with scoped language like “deterministic rules where applicable”)

---

## Immediate landing page edits (fastest path to truth)
If you want the landing to be truthful *today* with minimal product work, do this:

- **Remove/replace**: “Open-source”, “MIT/AGPL”, “SOC2 Type II”, “ISO 27269”, “115,000+ protocols”, “<10ms / 10ms latency”, “100% certainty”.
- **Add**:
  - two primary CTAs (Clinics vs Hospitals),
  - a simple “How it works” section for each lane,
  - a “Security & Compliance” section that links to `/legal/*`,
  - an “Implementation” section (clinic onboarding and enterprise Sidecar rollout),
  - a “What’s live vs what’s coming” section (very short, but crucial for trust).

---

## Appendix: primary document signals (how they map to landing)
This repo’s strategy docs contain valuable narrative, but some are explicitly “marketing aspirational”. Use them as internal guidance, not as claim sources.

- `GTM_COMPETITIVE_POSITIONING.md`: great for sequencing messaging (lead with credible present, add prevention/outcomes later). Contains risky lines like “no BAA required” and “JAMA AI 2025” that must be verified.
- `MONETIZATION_STRATEGY.md`: pricing tiers are not consistent across docs; landing should avoid firm pricing unless product/legal agrees.
- `VISION_AND_ROADMAP.md`: includes “open source contributions” as an initiative (future); also contains token/blockchain plans (roadmap).
- `PRODUCT_ROADMAP_2025.md`: lists security/compliance gaps; do not overclaim compliance/certifications on landing.
- `DATA_SUPREMACY.md`: supports a credible data flywheel story, but avoid “OpenAI embeddings” claims unless you’re using them in prod.
- `HOLILABS_BRIEFING_DOCUMENT.md`: great for enterprise sales collateral; treat metrics as proposals unless you have customer proof.
- `CASE_STUDIES_HEALTH_3.0.md`: reads like marketing content; treat as “illustrative examples” unless tied to real customers and permissioned.
- `AEGIS_ARCHITECTURE.md`: includes explicit license claims (AGPL/public domain) that conflict with repo reality; do not surface as fact.

