# Health 3.0 — Final Architecture: Red Team Analysis & System Design
**Date**: March 18, 2026
**Author**: Cortex Boardroom System Design Session
**Status**: AUTHORITATIVE — supersedes all prior architecture docs
**Classification**: Internal strategic document

---

## PART 1: RED TEAM FINDINGS — What the Market Tells Us

### 1.1 The Brutal Truth About the Competitors

| Competitor | Their Moat | Their Structural Weakness | Your Window |
|-----------|------------|--------------------------|-------------|
| Epic | 2,000 hospital integrations | FHIR is plumbing, not product; ignores <200-bed facilities and LATAM entirely | The 95% of global care that Epic doesn't serve |
| Nuance DAX | Deep Epic/Cerner hooks | Documentation only; no clinical reasoning; US-centric | Scribe is table stakes; prevention is the category |
| Medplum | Open-source FHIR CDR | Developer tool, not clinician product | You build the UX layer on top of FHIR-native infra |
| Doctoralia/TuoTempo | LATAM network effects | Walled garden; no FHIR; no AI; appointment scheduling only | Full-stack clinical layer they can never build |
| AWS/GCP/Azure Health | Cloud infrastructure | No clinical workflow ownership; dependent on Epic data | They're pipes; you're the value layer |
| Canvas Medical | EHR SDK | No LATAM; no prevention; no blockchain; no patient-side | You can use their approach as pattern, not as competitor |

**Verdict**: The market has a $300B hole between "FHIR plumbing" (Medplum, cloud giants) and "walled-garden scheduling" (Doctoralia). Holi Labs' position at the intersection of AI-native clinical workflow + FHIR interop + prevention-first + LATAM-first is uncontested. That window is 18–24 months before a US player enters.

### 1.2 What the Market Punishes

Based on 50+ competitive intelligence sources, the following patterns consistently fail:

1. **Blockchain as product (not infrastructure)** — 95%+ pilot failure rate, GDPR/LGPD erasure conflict, no network effects, 3–5x cost. Holi's vision doc shows $HOLI token and DAO for 2026. **This must be repositioned as a 2028+ research track, not a product roadmap item.**

2. **Patient-controlled data marketplaces** — NHS Care.data collapse, Patientslikeme failure, Enclave shutdowns. Governance + trust unsolved at every attempt. **Kill the data marketplace from the roadmap.**

3. **AI pilot that doesn't reduce clinician burden** — 95% of AI healthcare pilots fail, primarily because they add burden rather than remove it. Nuance DAX succeeds specifically because it reduces documentation time. **Every AI feature must be framed as time saved, not intelligence added.**

4. **Federated learning as near-term bet** — Only 5.2% real-world clinical deployment. Requires governance across competing institutions. **Defer to 2028+ research track.**

5. **Building for the 200+ bed hospital first** — Consolidation trap. Epic owns that market and won't let you in. **Primary care and community clinics are your wedge. Always.**

### 1.3 What the Market Rewards

1. **FHIR R4-native data model** — Not an adapter, a native store. 71% of organizations now use FHIR. TEFCA exchanged 500M records in Feb 2026.

2. **Event-driven architecture** — Detects clinical risk 3–5 hours earlier than batch. Pub-sub > request-response for clinical alerts, prevention triggers, and AI inference.

3. **Offline-first edge deployment** — Non-negotiable for LATAM rural care. The community health toolkit and Simple.org both prove offline-first is the differentiator in emerging markets.

4. **AI agent orchestration (not LLM prompting)** — Multi-step clinical reasoning with tool-use + memory outperforms base LLMs by 53 percentage points. Holi's Cortex architecture is ahead of the market here.

5. **Regulatory-first architecture** — HIPAA MFA mandate (Jan 2027), ANVISA RDC 657 revision, LGPD enforcement acceleration. The winners will have compliance as a competitive moat, not a cost center.

6. **LATAM FHIR integration** — Brazil RNDS is live (2.8B records, 21 states). Mexico CURP biometric identity substrate exists. First mover to connect private clinical workflow to national health records wins the region.

### 1.4 Critical Vulnerabilities in Current holilabsv2 Architecture

| Vulnerability | Severity | Detail | Fix |
|--------------|----------|--------|-----|
| **Vision-Reality gap on blockchain** | 🔴 HIGH | 2026 roadmap promises $HOLI token, DAO governance, data marketplace. None built. Investor/customer trust risk. | Reframe as 2028 research track; remove from current roadmap |
| **Licensing contradiction** | 🔴 HIGH | Docs claim AGPLv3/open-source, but no LICENSE file, `private: true` in package.json, "All rights reserved" in sidecar | Decide: closed-source (honest) or true open-source (commit to it) |
| **Two competing brand narratives** | 🟡 MEDIUM | "Cortex" (clinical interception) vs "Holi Protocol" (open infrastructure). Confuses investors and clinicians | One brand, one message: "Health 3.0 for LATAM" |
| **SaMD classification not formalized** | 🔴 HIGH | Prevention alerts + clinical decision-support → likely Class II/III ANVISA. No compliance annotation in codebase | RUTH must annotate every SaMD-adjacent feature |
| **data-ingestion package tsconfig issue** | 🟡 MEDIUM | @holi/data-ingestion build fails on `../shared-kernel/index.d.ts(10,43): error TS1005` | Fix tsconfig or shared-kernel declaration file |
| **Event-driven architecture absent** | 🟡 MEDIUM | All API routes are request-response. No event bus. Clinical alerts are polling-based. | Introduce Redis pub-sub (already in stack) as event layer |
| **No RNDS integration** | 🟡 MEDIUM | Brazil RNDS FHIR R4 profiles exist on Simplifier.net. No connector built. | FhirConnector already exists; add RNDS profile configuration |
| **Offline-first not implemented** | 🟡 MEDIUM | Edge node exists (apps/edge) but no service worker strategy for web app | PWA service worker + IndexedDB local queue |
| **Blockchain roadmap creates regulatory exposure** | 🟡 MEDIUM | $HOLI token in roadmap could trigger securities law review in Brazil (CVM) and US (SEC) | Legal review + repositioning required |

---

## PART 2: FINAL HEALTH 3.0 SYSTEM ARCHITECTURE

### 2.1 Design Philosophy (4 Principles)

**Principle 1: FHIR is Plumbing, Prevention is Product**
Every architectural decision serves one goal: helping clinicians prevent harm before it happens. FHIR, event streaming, AI agents, edge nodes — these are the infrastructure. The product is: "We caught it before it became an emergency."

**Principle 2: Source-Agnostic Ingest, Canonical-Native Storage**
Data enters in any format (FHIR, CSV, HL7, REST, paper scan). It lives in canonical form internally. It exits as FHIR R4 for interoperability. No impedance mismatch at the boundary.

**Principle 3: Offline-First, Edge-Capable**
Clinical workflows must work with zero connectivity. Sync is a luxury, not a requirement. This is non-negotiable for LATAM.

**Principle 4: Compliance as Architecture**
LGPD, HIPAA, ANVISA are not checklists — they are structural constraints that shape every component. CYRUS, RUTH, and ELENA invariants are code, not documentation.

---

### 2.2 System Components Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HOLI HEALTH 3.0 PLATFORM                            │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        PRESENTATION LAYER                            │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│  │  │ Web App     │  │ Mobile App  │  │ Sidecar     │  │ WhatsApp  │  │   │
│  │  │ (Next.js)   │  │ (React Nat.)│  │ (Electron)  │  │ Bot       │  │   │
│  │  │ Clinician   │  │ Patient +   │  │ macOS amb.  │  │ Rural     │  │   │
│  │  │ Dashboard   │  │ Clinician   │  │ listening   │  │ Outreach  │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │   │
│  └─────────┼────────────────┼────────────────┼────────────────┼────────┘   │
│            │                │                │                │             │
│  ┌─────────▼────────────────▼────────────────▼────────────────▼────────┐   │
│  │                        API GATEWAY                                   │   │
│  │  Rate limiting · RBAC · Tenant isolation · Audit logging            │   │
│  │  (createProtectedRoute + verifyPatientAccess)                        │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                           │
│  ┌───────────────────────────────▼──────────────────────────────────────┐   │
│  │                      CORE SERVICES LAYER                             │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Clinical     │  │ AI Cortex    │  │ Ingestion    │               │   │
│  │  │ Records      │  │ Agent Layer  │  │ Pipeline     │               │   │
│  │  │ Service      │  │              │  │              │               │   │
│  │  │ • FHIR R4    │  │ • Scribe     │  │ • FHIR R4    │               │   │
│  │  │   native CDR │  │ • Prevention │  │ • CSV/Excel  │               │   │
│  │  │ • Patient    │  │   Alerts     │  │ • REST API   │               │   │
│  │  │   record     │  │ • Drug Int.  │  │ • HL7 v2     │               │   │
│  │  │ • Lab/Vitals │  │ • CDSS       │  │ • RNDS (BR)  │               │   │
│  │  │ • Imaging    │  │ • Scribe v2  │  │ • Manual     │               │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │   │
│  │         │                 │                  │                       │   │
│  │  ┌──────▼─────────────────▼──────────────────▼──────────────────┐   │   │
│  │  │                   EVENT BUS (Redis Streams)                   │   │   │
│  │  │  clinical.lab.received · clinical.alert.fired                 │   │   │
│  │  │  patient.admitted · medication.prescribed · prevention.gap    │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Compliance   │  │ Supply Chain │  │ Analytics    │               │   │
│  │  │ Engine       │  │ Simulation   │  │ & Research   │               │   │
│  │  │ • LGPD gate  │  │ (Mirofish    │  │ • Clean Room │               │   │
│  │  │ • HIPAA gate │  │  connector)  │  │ • Outcomes   │               │   │
│  │  │ • ANVISA SaMD│  │ • Inventory  │  │   tracking   │               │   │
│  │  │ • Audit log  │  │ • Transport  │  │ • Equity     │               │   │
│  │  │ • Consent    │  │ • Regional   │  │   metrics    │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      DATA LAYER                                      │   │
│  │                                                                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │   │
│  │  │ PostgreSQL │  │ Redis      │  │ pgvector   │  │ Helix-Ledger  │  │   │
│  │  │ (Prisma)   │  │ (Cache +   │  │ (Semantic  │  │ (Audit-only,  │  │   │
│  │  │ Primary    │  │  Events)   │  │  Search)   │  │  append-only) │  │   │
│  │  │ clinical   │  │            │  │            │  │               │  │   │
│  │  │ store      │  │            │  │            │  │               │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └───────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                   DEPLOYMENT TOPOLOGIES                              │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ TOPOLOGY A: Cloud SaaS (default)                            │    │   │
│  │  │ DigitalOcean / GCP · Multi-tenant · $25-149/mo clinician    │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ TOPOLOGY B: Hospital Edge Node (apps/edge)                  │    │   │
│  │  │ Hospital LAN · SQLite local · Sync when online              │    │   │
│  │  │ Raspberry Pi / NUC · <$500 hardware · offline-first         │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ TOPOLOGY C: Clinician Sidecar (apps/sidecar)                │    │   │
│  │  │ macOS desktop · Ambient listening · No EHR replacement      │    │   │
│  │  │ Works alongside Epic/other EHR                              │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.3 Package Architecture (Final Structure)

```
holilabsv2/
├── apps/
│   ├── web/                    # Next.js clinician dashboard + API routes
│   │   └── src/app/api/        # REST API surface (protected routes)
│   ├── mobile/                 # React Native (patient + clinician)
│   ├── edge/                   # Hospital LAN node (Express + SQLite)
│   │   └── offline-sync/       # NEW: Conflict resolution + delta sync
│   ├── sidecar/                # macOS ambient listening app (Electron)
│   └── network/                # Enterprise network app
│
├── packages/
│   ├── shared-types/           # Single source of truth for all types
│   ├── shared-kernel/          # Clinical governance engines (CYRUS/ELENA/RUTH)
│   ├── data-ingestion/         # ✅ BUILT: Source-agnostic ingestion pipeline
│   ├── fhir-canonical/         # NEW: FHIR R4 <→ CanonicalRecord bidirectional mapper
│   ├── event-bus/              # NEW: Redis Streams pub-sub (clinical events)
│   ├── prevention-engine/      # NEW: Rule-based prevention alert evaluator
│   ├── document-parser/        # ✅ BUILT: PDF/document extraction
│   ├── deid/                   # ✅ BUILT: De-identification (Presidio)
│   ├── dp/                     # ✅ BUILT: Differential privacy
│   ├── policy/                 # ✅ BUILT: OPA/Rego compliance rules
│   ├── schemas/                # ✅ BUILT: Zod validators
│   └── utils/                  # ✅ BUILT: Logger, crypto
│
├── prisma/
│   └── schema.prisma           # Single schema; SCHEMA_ADDITION.prisma to merge
│
└── docs/
    ├── HEALTH3_FINAL_ARCHITECTURE.md   # This document
    └── PARALLEL_DEV_RULES.md          # Session isolation rules
```

**New packages to build (priority order)**:

| Package | Priority | Description | Connects To |
|---------|----------|-------------|-------------|
| `packages/event-bus` | P0 | Redis Streams wrapper; typed clinical events; pub-sub | All services → prevention-engine |
| `packages/prevention-engine` | P0 | Evaluates clinical rules against CanonicalRecord stream | event-bus → web notifications |
| `packages/fhir-canonical` | P1 | Bidirectional FHIR R4 ↔ CanonicalHealthRecord mapper | data-ingestion ↔ RNDS |
| `packages/offline-sync` | P1 | Service worker + IndexedDB queue + delta sync for edge | apps/edge + apps/web PWA |

---

### 2.4 Data Flow Architecture

#### Flow A: Inbound Data (Any Source → Canonical → FHIR Export)

```
External Source
    │
    ▼ (via packages/data-ingestion)
RawData
    │
    ▼ Connector (FHIR / CSV / REST / HL7)
CanonicalHealthRecord[]
    │
    ├──▶ ValidationEngine (ELENA invariants)
    │         │ INSUFFICIENT_DATA → surface error, do not impute
    │         │ PHI fields → flag for encryption (CYRUS)
    │
    ▼ (passes validation)
Persist to PostgreSQL
    │
    ├──▶ Publish to event-bus: "clinical.record.ingested"
    │
    ▼ (async, via event-bus subscriber)
PreventionEngine.evaluate(record)
    │
    ├──▶ Rule matches → publish "prevention.alert.fired"
    │         │
    │         ▼ Push notification to clinician
    │
    └──▶ No match → record archived
```

#### Flow B: Clinical Encounter (Real-Time Scribe → SOAP → Prevention Check)

```
Patient Encounter
    │
    ▼ (apps/sidecar OR web recorder)
Audio Stream
    │
    ▼ Deepgram → Transcription
Transcript
    │
    ▼ Claude Sonnet → AI Scribe
SOAP Note Draft
    │
    ├──▶ Clinician review + edit + sign
    │
    ▼ Signed SOAP Note
Extract clinical entities
    │ (ICD-10 codes, medications, lab orders, vitals)
    │
    ▼
CanonicalHealthRecord[] (DIAGNOSIS, MEDICATION, VITAL_SIGN, LAB_RESULT)
    │
    ▼ → event-bus → PreventionEngine.evaluate()
    │
    ▼ Persist + FHIR export (if RNDS/Epic/interop required)
```

#### Flow C: Supply Chain → Clinical Outcomes (Health 3.0 Democratization)

```
Regional WMS / Inventory System
    │
    ▼ CSV export or REST API
data-ingestion: CsvConnector
    │
    ▼ CanonicalSupplyChainItem[]
    │
    ▼ event-bus: "supply.item.received" / "supply.stockout.detected"
    │
    ▼ Mirofish Integration Layer
Supply Chain Simulation
    │
    ├──▶ Stockout alert → clinical alert: "lab instrument unavailable at facility X"
    │
    └──▶ Dashboard: diagnostic completeness %, equity score, regional access gap
```

---

### 2.5 Event Bus Schema (Clinical Events)

```typescript
// packages/event-bus/src/events.ts

type ClinicalEvent =
  // Data ingestion events
  | { type: 'record.ingested';    payload: { ingestId: string; recordType: CanonicalRecordType; patientId?: string; tenantId: string } }
  | { type: 'record.invalid';     payload: { ingestId: string; errors: ValidationError[] } }

  // Clinical alerts
  | { type: 'prevention.gap.detected';  payload: { patientId: string; rule: string; severity: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL' } }
  | { type: 'drug.interaction.detected';payload: { patientId: string; drugs: string[]; severity: string } }
  | { type: 'lab.critical.result';      payload: { patientId: string; testName: string; value: number; unit: string } }

  // Supply chain events
  | { type: 'supply.stockout.detected'; payload: { facilityId: string; itemId: string; itemName: string } }
  | { type: 'supply.item.received';     payload: { facilityId: string; itemId: string; quantity: number } }

  // Encounter events
  | { type: 'encounter.started';  payload: { patientId: string; clinicianId: string; tenantId: string } }
  | { type: 'encounter.completed';payload: { patientId: string; noteId: string } }
  | { type: 'prescription.signed';payload: { patientId: string; medications: string[] } };
```

---

### 2.6 Prevention Engine Architecture

```
PreventionEngine
    │
    ├── RuleRegistry (loaded from packages/policy OPA rules + JSON rules)
    │       ├── ScreeningGaps: mammogram, colonoscopy, cervical, retina
    │       ├── LabValueAlerts: HbA1c >5.7, Creatinine >1.2, K <3.0
    │       ├── MedicationRisk: drug interactions, dosing, contraindications
    │       ├── VitalTrends: BP >140/90 sustained 3 visits, SpO2 <94
    │       └── SocialRisk: no-show pattern, chronic disease + no med refill
    │
    └── Evaluator
            ├── Input: CanonicalHealthRecord + PatientHistory
            ├── Rule matching: O(log n) via indexed rule trie
            ├── ELENA invariant: clinical rules require sourceAuthority + citationUrl
            ├── Output: PreventionAlert[]
            └── Action: publish to event-bus → clinician push notification
```

---

### 2.7 RNDS Integration (Brazil National Health Data Network)

```
RNDS Endpoint: https://ehr.saude.gov.br (production)
                https://ehr-auth.saude.gov.br (staging)

Authentication:
  - Certificate-based mTLS (ANVISA digital certificate required)
  - Client certificate: X.509 cert from ANVISA
  - Token endpoint: POST /oauth2/token (client_credentials flow)

FHIR Profiles (from simplifier.net/redenacionaldedadosemsaude):
  - Patient (CPF as identifier)
  - Composition (clinical document)
  - Observation (lab results, vitals)
  - Immunization (vaccination records)
  - MedicationRequest (prescriptions)

Integration pattern:
  FhirConnector (existing) → add RndsSourceConfig kind
  RndsConnector extends FhirConnector:
    - Fetches ANVISA certificate from environment
    - Adds mTLS to all requests
    - Maps CPF national identifier to local patientId
    - Validates against RNDS FHIR profiles (not generic R4)
```

---

### 2.8 Offline-First Architecture

```
ONLINE MODE:
  Web App → API Gateway → PostgreSQL (primary store)
                       ↘ Redis (event bus + cache)

OFFLINE MODE (edge / poor connectivity):
  Web App (PWA)
    ├── Service Worker intercepts API calls
    ├── Reads/writes to IndexedDB (local FHIR records)
    └── Queues mutations in "pending sync" list

SYNC ON RECONNECT:
  apps/edge (hospital node) or apps/web service worker:
    1. Pull delta from server: GET /api/sync?since={lastSyncedAt}
    2. Apply server changes to local (server wins on conflicts except clinical notes)
    3. Push local mutations: POST /api/sync/batch with pending queue
    4. Server merges: FHIR-compliant conflict resolution
       - Clinical notes: last-write-wins
       - Medications: server authoritative
       - Lab results: append (no overwrite)
    5. Acknowledge sync; clear pending queue

CONFLICT RESOLUTION RULES:
  - Lab result: Immutable once created (append only)
  - Medication: Server authoritative (prescription signing = server event)
  - Vital signs: Last write wins (measurement device is authoritative)
  - Clinical notes: Clinician offline version merges with server version (diff + merge)
  - Appointments: Server authoritative (prevents double-booking)
```

---

### 2.9 Technology Stack (Final Recommendations)

| Layer | Current | Recommendation | Rationale |
|-------|---------|----------------|-----------|
| Web framework | Next.js 14 | Keep | App Router + SSR + API routes is correct |
| Database | PostgreSQL (Prisma) | Keep | Add pgvector extension for semantic search |
| Cache / Event bus | Redis (cache) | Add Redis Streams | Upgrade Redis usage to event streaming |
| Mobile | React Native | Keep | Cross-platform, code share with web |
| AI inference | Claude via gateway | Add agent orchestration layer | Multi-step clinical reasoning vs. single call |
| FHIR server | Custom FHIR R4 adapters | Add Medplum as optional FHIR CDR | Option B: build own FHIR CDR on top of Prisma |
| De-identification | Presidio | Keep | Best-in-class for HIPAA/LGPD |
| Policy engine | OPA/Rego | Keep | Correct for compliance rules |
| Search | None | pgvector + semantic search | Already in DATA_SUPREMACY; execute it |
| Blockchain | Planned ($HOLI) | Defer to 2028 | See red team findings; regulatory + technical risk |
| Monitoring | Sentry + PostHog | Add OpenTelemetry | Distributed tracing across microservices |

---

### 2.10 API Design (New Endpoints Required)

```
POST   /api/ingest                ✅ BUILT  Source-agnostic record ingestion
GET    /api/ingest/sources        NEW       List configured data sources per tenant
POST   /api/ingest/sources        NEW       Create/configure new data source

GET    /api/events/stream         NEW       SSE stream of clinical events for clinician
POST   /api/events/subscribe      NEW       Subscribe to specific event types

GET    /api/prevention/alerts     NEW       Prevention gaps + alerts for patient/clinician
POST   /api/prevention/dismiss    NEW       Clinician acknowledges alert

GET    /api/rnds/patient/:cpf     NEW       Fetch patient records from Brazil RNDS
POST   /api/rnds/document         NEW       Publish clinical document to RNDS

GET    /api/sync/delta            NEW       Get changes since timestamp (offline sync)
POST   /api/sync/batch            NEW       Submit offline mutations batch

GET    /api/supply/dashboard      NEW       Supply chain KPIs (connects to Mirofish)
POST   /api/supply/ingest         NEW       Ingest inventory/transport data from WMS
```

---

## PART 3: TRADE-OFF ANALYSIS

### 3.1 Build Own FHIR CDR vs. Use Medplum

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Build own FHIR CDR** (current path via Prisma) | Full control, custom Brazilian data models, no third-party dependency, OSS-compatible | 12+ months to build compliant CDR, expensive validation, reinventing the wheel | **SHORT TERM: Build it** (you're already 70% there with Prisma schema) |
| **Use Medplum as CDR** | 2 years ahead technically, TypeScript-native, open-source Apache 2.0, actively maintained | Adds dependency, Medplum owns your clinical data model, migration risk later | **LONG TERM: Evaluate at Series A** when scale requires full FHIR compliance |

**Decision**: Continue custom CDR via Prisma for now. Add `packages/fhir-canonical` to enable bidirectional FHIR R4 conversion. Evaluate Medplum migration when >10,000 patients.

### 3.2 Monorepo vs. Polyrepo

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Monorepo (current)** | Shared types enforced, atomic commits, single CI, easier refactoring | Slower builds (pnpm Turbo mitigates), coupling risk, repo grows large | **Keep monorepo** — you're a 2-5 person team; coupling is a feature not a bug at this stage |
| **Polyrepo** | Independent deployments, team autonomy, cleaner boundaries | Shared-types treaty breaks (Law 2), cross-repo PRs, overhead | **Defer until Series A** and 10+ engineers |

### 3.3 Event-Driven vs. Request-Response for Clinical Alerts

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Event-driven (Redis Streams)** | 3–5h earlier risk detection, decoupled, scalable, audit-friendly | Additional complexity, learning curve, debugging harder | **Implement for prevention alerts only** (highest value path); keep request-response for CRUD |
| **Request-response (current)** | Simple, familiar, easy to debug | Polling lag, tight coupling, no real-time | **Keep for data reads**; augment with events for writes |

**Decision**: Hybrid. Events for: ingestion triggers, prevention alerts, supply chain updates. Request-response for: reads, patient data, scheduling.

### 3.4 Blockchain vs. Audit Ledger (Helix-Ledger)

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Blockchain ($HOLI, DAO)** | Vision alignment, patient data ownership narrative, token economics | GDPR/LGPD erasure conflict, 3-5x cost, regulatory risk (CVM, SEC), no network effects | **Defer to 2028 research track** |
| **Helix-Ledger (append-only, hash-chain)** | Tamper-evident audit trail, LGPD Art. 37 compliant, no blockchain overhead, already in architecture | Not "blockchain" for marketing purposes | **Build and ship Helix-Ledger now** — same audit guarantees, zero regulatory risk |

**Decision**: Ship Helix-Ledger as LGPD-compliant immutable audit trail. Position as "cryptographically verified audit chain" not "blockchain." Revisit token economics in 2028.

---

## PART 4: SCALE & RELIABILITY

### 4.1 Load Estimates

**MVP (Month 1–6): 500 clinicians, 50,000 patients**
- API: ~100 req/s peak (manageable on 2 GCP/DO nodes)
- PostgreSQL: ~200 concurrent connections (PgBouncer handles)
- Redis: ~500 events/minute (trivial)
- Storage: ~500MB/month (clinical notes, labs, vitals)

**Growth (Month 7–18): 5,000 clinicians, 500,000 patients**
- API: ~1,000 req/s peak → 4-8 nodes with load balancer
- PostgreSQL: Read replicas required (1 primary, 2 replicas)
- Redis: Cluster mode
- Storage: ~5GB/month → S3/GCS for document storage

**Scale (Month 19–36): 50,000 clinicians, 5M patients (LATAM)**
- API: ~10,000 req/s → Kubernetes, HPA
- PostgreSQL: Sharding by tenantId OR switch to CockroachDB for geo-distribution
- Redis: Redis Enterprise or managed Redis Cluster
- FHIR CDR: Evaluate Medplum at this point

### 4.2 Reliability Architecture

```
Multi-Region (Phase 2):
  Primary: Brazil (São Paulo) → regulatory data residency
  Secondary: Mexico (GCP us-east) → LATAM failover
  CDN: Cloudflare → edge caching for static assets

Failover:
  Database: Automated failover (PgBouncer + Patroni)
  API: Blue/green deployment via K8s
  Edge nodes: Autonomous operation (offline-first by design)

Monitoring:
  - OpenTelemetry → Grafana (distributed tracing)
  - Sentry (error tracking, already integrated)
  - PostHog (user behavior, already integrated)
  - Custom: clinical alert latency, prevention engine throughput
```

---

## PART 5: IMMEDIATE EXECUTION PRIORITIES

### Priority Matrix (MVP → Month 6)

**P0 — Must have for tomorrow's MVP launch**
1. ✅ Fix build (`pnpm build` → exit 0) — Session 1 handling
2. Merge `SCHEMA_ADDITION.prisma` → prisma/schema.prisma
3. Wire `@holi/data-ingestion` into apps/web package.json
4. Pass ingestion pipeline tests

**P1 — Must have for first 10 paying customers (Week 1-2)**
1. `packages/event-bus` — Redis Streams typed events (2 days)
2. Basic prevention alerts (HbA1c, BP) via event-bus (2 days)
3. RNDS connector config (FhirConnector extension for Brazil) (1 day)
4. Fix `@holi/data-ingestion` tsconfig (`shared-kernel` declaration issue) (1 hour)

**P2 — Must have for regional expansion (Month 1–3)**
1. `packages/fhir-canonical` — bidirectional FHIR R4 mapper
2. Offline-first PWA service worker for apps/web
3. Supply chain dashboard (connects to Mirofish simulation)
4. Full prevention engine with OPA rules

**P3 — Growth phase (Month 3–6)**
1. `packages/offline-sync` — delta sync for apps/edge
2. RNDS full integration (mTLS cert + national profiles)
3. OpenTelemetry distributed tracing
4. Multi-region deployment (BR primary, MX secondary)

**DEFER — Do not build yet**
- Blockchain / $HOLI token / DAO governance → 2028
- Healthcare data marketplace → Never (failed model)
- Federated learning → 2028
- FDA/ANVISA SaMD formal submission → When clinical decision support is explicitly classified

---

## PART 6: THE ONE-SENTENCE PITCH

**Before Red Team**: "Health 3.0 platform combining AI, blockchain, and patient data ownership for LATAM healthcare."

**After Red Team**: **"The clinical intelligence layer that connects Latin America's 200 million underserved patients to preventive care — source-agnostic, offline-first, and built on FHIR."**

The new pitch:
- **Source-agnostic** → directly addresses the data aggregation goal
- **Offline-first** → directly addresses LATAM rural reality
- **Built on FHIR** → signals interoperability credibility
- **Preventive care** → the category differentiator
- **200M underserved patients** → the market size is the mission

This replaces all competing narratives (Cortex vs. Holi Protocol) with a single coherent story that is both technically accurate and emotionally resonant.
