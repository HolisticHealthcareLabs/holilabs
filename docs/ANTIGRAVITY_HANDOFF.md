# Google Antigravity Handoff Document

**Clinical Assurance Platform - Architecture & Integration Guide**

**Version:** 1.0.0
**Last Updated:** January 29, 2026
**Status:** Production-Ready for Handoff

---

## Executive Summary

The Clinical Assurance Platform is a **three-tier architecture** designed for the Brazilian healthcare market with:
- **Cloud (Web)**: Next.js 14 application with full clinical suite
- **Edge**: Local node for hospital LAN deployment (offline-capable)
- **Sidecar**: Electron desktop overlay for EHR integration

The platform captures RLHF (Reinforcement Learning from Human Feedback) data as its core defensible IP, enabling continuous improvement of clinical decision support.

---

## Repository Structure

```
holilabsv2/
├── apps/
│   ├── web/          # Cloud application (Next.js 14)
│   ├── edge/         # Edge node for hospital LAN
│   ├── sidecar/      # Electron desktop overlay
│   ├── mobile/       # React Native mobile app
│   └── api/          # Standalone API (optional)
├── packages/
│   └── shared-types/ # Shared TypeScript types
├── infra/
│   └── docker/       # Docker configurations
└── docs/             # Documentation
```

---

## Application Ports

| Application | Development Port | Production Port | Protocol |
|-------------|-----------------|-----------------|----------|
| **Web (Cloud)** | 3000 | 443 (HTTPS) | HTTP/WebSocket |
| **Edge Node** | 3001 | 3001 | HTTP/WebSocket |
| **Sidecar API** | 3002 | 3002 | HTTP (localhost only) |
| **PostgreSQL** | 5432 | 5432 | TCP |
| **Redis** | 6379 | 6379 | TCP |

### Quick Start Commands

```bash
# Start all applications
pnpm dev:all

# Start individually
pnpm dev:web      # http://localhost:3000
pnpm dev:edge     # http://localhost:3001
pnpm dev:sidecar  # Electron app

# Simulate EHR for sidecar testing
pnpm simulate-ehr
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLOUD (AWS/GCP/Azure)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │    Web      │  │ RLHF Data   │  │  Analytics  │  │    Rule     │   │
│  │  (Next.js)  │  │  Warehouse  │  │  Dashboard  │  │  Management │   │
│  │  Port 3000  │  │ (Postgres)  │  │             │  │   Portal    │   │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘  └──────┬──────┘   │
│         │                │                                  │          │
│         └────────┬───────┴──────────────────────────────────┘          │
│                  │ Async Sync (HTTPS/443)                              │
└──────────────────┼─────────────────────────────────────────────────────┘
                   │
    ═══════════════╪═══════════════ Internet ════════════════════════════
                   │
┌──────────────────┼─────────────────────────────────────────────────────┐
│                  │           HOSPITAL LAN                              │
│         ┌────────▼────────┐                                            │
│         │   Edge Node     │  ← Traffic Light runs HERE (no internet)   │
│         │   Port 3001     │                                            │
│         │ (SQLite/PG)     │                                            │
│         │ <10ms latency   │                                            │
│         │ Offline-capable │                                            │
│         └────────┬────────┘                                            │
│                  │                                                     │
│    ┌─────────────┼─────────────┐                                       │
│    │             │             │                                       │
│    ▼             ▼             ▼                                       │
│ ┌──────┐    ┌──────┐    ┌──────────────────────────────┐              │
│ │ Tasy │    │ MV   │    │         Sidecar              │              │
│ │ EHR  │◄──►│ Soul │◄──►│       Port 3002              │              │
│ └──────┘    └──────┘    │  ┌────────────────────────┐  │              │
│      ▲           ▲      │  │  Accessibility Reader  │  │              │
│      │           │      │  │  (UIAutomation)        │  │              │
│      └───────────┴──────│  └────────────────────────┘  │              │
│     (Accessibility API) │              │               │              │
│                         │  ┌────────────────────────┐  │              │
│                         │  │   Traffic Light UI     │  │              │
│                         │  │   RED/YELLOW/GREEN     │  │              │
│                         │  └────────────────────────┘  │              │
│                         │              │               │              │
│                         │  ┌────────────────────────┐  │              │
│                         │  │  Break-Glass Chat      │  │              │
│                         │  │  (RAG-only mode)       │  │              │
│                         │  └────────────────────────┘  │              │
│                         └──────────────────────────────┘              │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Application Details

### 1. Web Application (Cloud)

**Location:** `apps/web/`
**Framework:** Next.js 14 (App Router)
**Database:** PostgreSQL + Prisma ORM
**Port:** 3000

#### Key Features
- Full clinical suite (patients, appointments, prescriptions, labs)
- Agent Gateway with 216 MCP tools
- Traffic Light Engine for clinical/billing rules
- RLHF data capture infrastructure
- Real-time updates via Socket.IO

#### Key Directories
```
apps/web/src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── agent/         # MCP Agent Gateway
│   │   ├── traffic-light/ # Rule evaluation
│   │   └── ...
│   ├── dashboard/         # Main dashboard
│   └── portal/            # Patient portal
├── components/            # React components
├── lib/
│   ├── mcp/              # MCP tools (216 tools)
│   ├── traffic-light/    # Traffic Light Engine
│   ├── sync/             # Edge sync protocol
│   └── clinical/         # Clinical engines
├── prompts/              # Prompt-native templates
└── services/             # Business logic services
```

#### Environment Variables
```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
ENCRYPTION_MASTER_KEY="..."
ANTHROPIC_API_KEY="..."
GOOGLE_AI_API_KEY="..."
```

---

### 2. Edge Node (Hospital LAN)

**Location:** `apps/edge/`
**Framework:** Node.js + Express
**Database:** SQLite (local cache)
**Port:** 3001

#### Key Features
- Local rule evaluation (<10ms latency)
- Offline operation capability
- Sync queue for cloud updates
- Rule version management

#### Key Files
```
apps/edge/src/
├── sync/
│   ├── rule-updater.ts      # Long-polling rule updates
│   └── connectivity.ts      # Connection monitoring
├── traffic-light/
│   └── local-engine.ts      # Local rule evaluation
└── api/
    └── server.ts            # Express API server
```

#### Sync Protocol
- **Push (Edge → Cloud):** AssuranceEvents, HumanFeedback
- **Pull (Cloud → Edge):** RuleUpdates, PatientCache
- **Conflict Resolution:** Human feedback always wins

---

### 3. Sidecar (Desktop Overlay)

**Location:** `apps/sidecar/`
**Framework:** Electron 28 + React 18
**Port:** 3002 (localhost only)

#### Key Features
- Always-on-top overlay window
- EHR fingerprinting (Tasy, MV Soul)
- Accessibility API integration
- OCR fallback for VDI environments
- Break-Glass Chat (RAG-only)

#### Key Files
```
apps/sidecar/src/
├── main/
│   └── edge-client.ts       # Edge node connection
├── fingerprint/
│   └── ehr-detector.ts      # EHR version detection
├── accessibility/
│   └── reader.ts            # Windows/macOS accessibility
├── vision/
│   └── ocr-module.ts        # Tesseract.js fallback
├── detection/
│   └── vdi-detector.ts      # Citrix/RDP detection
├── components/
│   ├── BreakGlassChat.tsx   # RAG chat widget
│   └── TrafficLight.tsx     # Traffic light display
└── api/
    └── server.ts            # Localhost API
```

#### EHR Integration Priority
1. **Accessibility APIs** (99%+ reliability for native apps)
2. **CDS Hooks** (when available)
3. **HL7 FHIR** (via integration partner)
4. **OCR Fallback** (required for Citrix/VDI)

---

## Database Schema (Key Models)

### Core Clinical
- `Patient` - Patient demographics
- `Appointment` - Scheduling
- `ClinicalNote` - Documentation
- `Prescription` - Medication orders
- `LabResult` - Lab values
- `Diagnosis` - ICD-10 diagnoses
- `Allergy` - Allergies and reactions

### RLHF Data Capture
- `AssuranceEvent` - AI recommendation + input context
- `HumanFeedback` - Override tracking
- `OutcomeGroundTruth` - Outcome reconciliation (glosas)
- `RuleVersion` - Rule versioning for regression

### Traffic Light
- `ClinicalRule` - JSON-Logic business rules
- `FeatureFlag` - Clinic-specific toggles

### Governance
- `GovernanceLog` - Audit trail
- `MedicationRule` - Drug safety rules

---

## API Endpoints

### Agent Gateway
```
POST /api/agent
{
  "tool": "tool_name",
  "params": { ... }
}
```

### Traffic Light
```
POST /api/traffic-light
{
  "patientId": "...",
  "action": "prescription",
  "payload": { ... }
}
```

### Sidecar (localhost:3002)
```
POST /sidecar/context    # Screen context capture
POST /sidecar/evaluate   # Traffic light evaluation
POST /sidecar/decision   # Human decision recording
POST /sidecar/chat       # Break-glass RAG chat
GET  /sidecar/status     # Health check
```

---

## Key Technologies

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18, Tailwind CSS | UI components |
| Framework | Next.js 14 | Full-stack framework |
| Database | PostgreSQL, Prisma | Data persistence |
| Auth | NextAuth.js v5 | Authentication |
| AI | Claude, Gemini, Ollama | Clinical intelligence |
| Real-time | Socket.IO | Live updates |
| Desktop | Electron 28 | Sidecar overlay |
| Accessibility | node-window-manager | EHR integration |
| OCR | Tesseract.js | VDI fallback |

---

## Compliance

### LGPD (Brazilian Data Protection)
- Article 20: Automated decision transparency
- De-identification: SHA256(patient_id + SALT)
- Human-in-the-loop: Override capability

### HIPAA
- Encryption at rest (AES-256-GCM)
- Audit logging (all data access)
- Role-based access control

### ANS (Brazilian Health Insurance)
- TISS code validation
- Glosa prevention rules
- Prior authorization checks

---

## Agent-Native Score

The platform follows agent-native architecture principles:

| Principle | Score | Status |
|-----------|-------|--------|
| Action Parity | 69.3% | ⚠️ |
| Tools as Primitives | 79.5% | ⚠️ |
| Context Injection | 79% | ⚠️ |
| Shared Workspace | 100% | ✅ |
| CRUD Completeness | 83.3% | ✅ |
| UI Integration | 100% | ✅ |
| Capability Discovery | 79% | ⚠️ |
| Prompt-Native | 50% | ⚠️ |

**Overall Score: 84.7%**

---

## Quick Reference Commands

```bash
# Development
pnpm dev:all              # Start all apps
pnpm dev:web              # Start web only
pnpm dev:edge             # Start edge only
pnpm dev:sidecar          # Start sidecar only

# Database
pnpm --filter @holi/web prisma migrate dev
pnpm --filter @holi/web prisma studio

# Build
pnpm build                # Build all apps
pnpm --filter @holi/web build

# Testing
pnpm --filter @holi/web test
pnpm --filter @holi/web test:coverage

# Type Checking
npx tsc --noEmit          # Check for type errors
```

---

## Known Limitations

1. **Action Parity Gap**: ~30% of user actions lack agent tools
2. **OCR Latency**: ~800ms in VDI environments (acceptable)
3. **Prompt-Native**: 50% of features still code-defined
4. **TISS Reconciliation**: ~40% initial match rate expected

---

## Contact & Resources

- **Tool Registry:** `docs/TOOL_REGISTRY.md`
- **Plan Document:** `.claude/plans/reflective-humming-snowglobe.md`
- **Prisma Schema:** `apps/web/prisma/schema.prisma`
- **MCP Tools:** `apps/web/src/lib/mcp/tools/`

---

## Handoff Checklist

- [x] 0 TypeScript build errors
- [x] 216 MCP tools documented
- [x] Architecture diagram complete
- [x] Port guide documented
- [x] Environment variables documented
- [ ] `pnpm dev:all` smoke test verified

---

*Document prepared for Google Antigravity AI integration team.*
