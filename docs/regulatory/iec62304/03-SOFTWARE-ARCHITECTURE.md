# Software Architecture Description

**Document ID:** SAD-HHL-001  
**IEC 62304 Reference:** Clause 5.3 — Software Architectural Design  
**Safety Classification:** Class A  
**Version:** 1.0  
**Date:** 2026-04-04  
**Author:** Holi Labs Engineering  
**Status:** Draft — Pending QA Review

---

## 1. System Context

The Holi Labs Clinical Platform operates as a cloud-hosted web application serving Brazilian healthcare providers. The system integrates with external services for storage, caching, and national health infrastructure.

### 1.1 System Context Diagram

```mermaid
C4Context
    title System Context — Holi Labs Clinical Platform

    Person(clinician, "Healthcare Provider", "Physician, nurse, or pharmacist")
    Person(patient, "Patient", "Accesses patient portal")
    Person(admin, "Administrator", "Manages clinic configuration")

    System(holilabs, "Holi Labs Platform", "Next.js 14 web application with deterministic CDS")

    System_Ext(postgres, "PostgreSQL", "Primary database — encrypted PHI storage")
    System_Ext(redis, "Redis", "Session cache, rule cache, rate limiting")
    System_Ext(s3, "Object Storage", "Document and image storage")
    System_Ext(anvisa, "ANVISA CATMAT", "Drug code registry reference data")
    System_Ext(icpbrasil, "ICP-Brasil", "Digital certificate infrastructure")

    Rel(clinician, holilabs, "Uses CDS, prescribes, documents encounters")
    Rel(patient, holilabs, "Views records, schedules appointments")
    Rel(admin, holilabs, "Manages users, roles, clinic settings")
    Rel(holilabs, postgres, "Reads/writes via Prisma ORM")
    Rel(holilabs, redis, "Caches sessions, rules, rate limits")
    Rel(holilabs, s3, "Stores documents, images, audio")
    Rel(holilabs, anvisa, "Drug code lookups")
    Rel(holilabs, icpbrasil, "Signature verification")
```

---

## 2. Component Architecture

### 2.1 High-Level Component Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        UI["Next.js Frontend<br/>(React Server Components)"]
    end

    subgraph "API Layer — apps/web/src/app/api/"
        MW["Middleware<br/>(Auth + Rate Limit + Zod)"]
        AUTH["Auth Subsystem<br/>NextAuth + Casbin RBAC"]
        CLIN["Clinical Subsystem<br/>Rule Engine + Traffic Light"]
        BILL["Billing Subsystem<br/>TUSS codes + Glosa risk"]
        SCHED["Scheduling Subsystem<br/>Appointments + Calendar"]
        PAT["Patient Subsystem<br/>Registration + Records"]
        AGENT["Agent Subsystem<br/>MCP + Orchestration"]
    end

    subgraph "Clinical Decision Support"
        RE["Hybrid Rule Engine<br/>rule-engine.ts"]
        TL["Traffic Light Engine<br/>engine.ts"]
        SE["Safety Envelope<br/>safety-envelope.ts"]
        SAL["Safety Audit Logger<br/>safety-audit-logger.ts"]
        DR["ANVISA Drug Registry<br/>anvisa-drug-registry.ts"]
    end

    subgraph "Security Layer"
        ENC["HIPAA Encryption<br/>hipaa-encryption.ts"]
        RBAC["Casbin RBAC<br/>casbin.ts"]
        ICP["ICP-Brasil Signer<br/>icp-brasil-signer.ts"]
        AUDIT["Audit Logger<br/>AuditLog model"]
    end

    subgraph "Data Layer"
        PRISMA["Prisma ORM"]
        PG["PostgreSQL"]
        REDIS["Redis"]
    end

    UI --> MW
    MW --> AUTH
    MW --> CLIN
    MW --> BILL
    MW --> SCHED
    MW --> PAT
    MW --> AGENT

    CLIN --> RE
    CLIN --> TL
    CLIN --> SE
    CLIN --> SAL
    CLIN --> DR

    RE --> PRISMA
    TL --> PRISMA
    SAL --> PRISMA
    AUTH --> RBAC
    AUTH --> ICP

    PAT --> ENC
    PAT --> AUDIT

    PRISMA --> PG
    AUTH --> REDIS
    RE --> REDIS
```

### 2.2 Subsystem Descriptions

| Subsystem | Location | Responsibility |
|-----------|----------|---------------|
| **Auth** | `apps/web/src/lib/auth/` | Authentication (NextAuth), authorization (Casbin RBAC), MFA, WebAuthn, ICP-Brasil signatures |
| **Clinical** | `apps/web/src/lib/clinical/` | Rule engine, safety envelope, audit logging, compliance rules |
| **Traffic Light** | `apps/web/src/lib/traffic-light/` | Unified CDS evaluation (clinical + billing + administrative rules) |
| **Security** | `apps/web/src/lib/security/` | PHI encryption (AES-256-GCM), key rotation, searchable hashes |
| **Brazil Interop** | `apps/web/src/lib/brazil-interop/` | ANVISA drug codes (CATMAT), controlled substance classification |
| **Billing** | `apps/web/src/lib/finance/` | TUSS code validation, ICD-10 mapping, glosa risk estimation |
| **Scheduling** | `apps/web/src/app/api/appointments/` | Appointment CRUD, calendar integration, waitlist management |
| **Patient** | `apps/web/src/app/api/patients/` | Patient registration, record access, LGPD data rights |
| **Agent** | `apps/web/src/app/api/agent/` | MCP agent orchestration, tool capabilities, event processing |

---

## 3. Clinical Decision Support Architecture

The CDS is the safety-critical component of the system. Its architecture is designed to ensure determinism, transparency, and clinician override at every step.

### 3.1 CDS Data Flow

```mermaid
sequenceDiagram
    participant C as Clinician
    participant API as API Route
    participant RE as Rule Engine
    participant TL as Traffic Light Engine
    participant SE as Safety Envelope
    participant SAL as Safety Audit Logger
    participant DB as PostgreSQL

    C->>API: Clinical action (e.g., prescribe medication)
    API->>RE: evaluateRules(context)
    RE->>RE: 1. Evaluate compliance rules (TypeScript)
    alt Compliance blocks
        RE-->>API: {allowed: false, blockedByRule: "..."}
    else Compliance passes
        RE->>DB: Load business rules (JSON-Logic, cached 60s)
        RE->>RE: 2. Validate JSON-Logic operations (allowlist)
        RE->>RE: 3. Evaluate business rules (jsonLogic.apply)
        RE-->>API: {allowed: true, outcomes, actions, warnings}
    end
    API->>TL: evaluate(context)
    TL->>TL: Evaluate rules in parallel
    TL->>TL: Determine worst color (RED > YELLOW > GREEN)
    TL->>TL: Calculate override requirements
    TL-->>API: {color, signals, canOverride, overrideRequires}
    API->>SE: wrapInSafetyEnvelope(data, options)
    SE-->>API: {data, processingMethod: "deterministic", disclaimer, provenance}
    API->>SAL: logSafetyEvent(context)
    SAL->>DB: Persist to GovernanceLog chain (transaction)
    API-->>C: Response with traffic light + safety envelope
    C->>C: Review, accept, or override with justification
```

### 3.2 Determinism Guarantees

| Layer | Mechanism | File Reference |
|-------|-----------|---------------|
| Compliance rules | TypeScript functions — compiled, immutable | `apps/web/src/lib/clinical/compliance-rules.ts` |
| Business rules | JSON-Logic with strict operation allowlist | `rule-engine.ts` lines 40–51 |
| Operation validation | Recursive allowlist check before execution | `rule-engine.ts` function `validateJsonLogicOperations()` |
| Traffic light | Color priority constant map, no randomness | `engine.ts` lines 57–62 |
| Override logic | Deterministic severity → requirement mapping | `engine.ts` lines 478–506 |

**Disallowed operations** (blocked by `validateJsonLogicOperations()`): `log`, `method`, `throw`, and any custom operations. Only safe, side-effect-free operations are permitted.

---

## 4. PHI Data Flow Architecture

### 4.1 Encryption Flow

```mermaid
sequenceDiagram
    participant U as User Input
    participant API as API Route
    participant ZOD as Zod Validator
    participant ENC as HIPAA Encryption
    participant DB as PostgreSQL
    participant DEC as Decryption
    participant VIEW as Clinician View

    U->>API: Submit patient data (plaintext)
    API->>ZOD: Validate input schema
    ZOD-->>API: Validated data
    API->>ENC: encryptField(value, fieldType)
    Note over ENC: PBKDF2 key derivation<br/>Random salt (32 bytes)<br/>Random IV (12 bytes)<br/>AES-256-GCM encrypt
    ENC-->>API: JSON{ciphertext, iv, authTag, salt, version}
    API->>DB: Store encrypted JSON string + keyVersion
    Note over DB: PHI stored as encrypted blob<br/>Key version tracked per field

    VIEW->>API: Request patient record
    API->>DB: Read encrypted fields
    DB-->>API: Encrypted JSON strings
    API->>DEC: decryptField(encryptedJson)
    Note over DEC: Parse JSON<br/>Derive key from salt<br/>AES-256-GCM decrypt<br/>Verify auth tag
    DEC-->>API: Plaintext value
    API-->>VIEW: Decrypted data (in-memory only)
```

### 4.2 Key Rotation

Key rotation is supported via the `rotateEncryption()` function (`hipaa-encryption.ts` lines 263–301):
1. Decrypt with old key
2. Generate new salt and IV
3. Re-encrypt with new key
4. Increment version number

Key versions are tracked per field in the Prisma schema (e.g., `firstNameKeyVersion`, `emailKeyVersion`).

---

## 5. Security Architecture

### 5.1 Authentication & Authorization

```mermaid
graph LR
    subgraph "Authentication"
        NA["NextAuth.js<br/>Session management"]
        MFA["MFA<br/>TOTP + WebAuthn"]
        ICP["ICP-Brasil<br/>Digital certificates"]
    end

    subgraph "Authorization — Casbin"
        POL["Policy Store<br/>(Prisma adapter)"]
        HIER["Role Hierarchy<br/>ADMIN > PHYSICIAN > ..."]
        ENF["Enforcer<br/>fail-closed"]
    end

    subgraph "Audit"
        AL["AuditLog<br/>accessReason + dataHash"]
        GL["GovernanceLog<br/>Flight recorder"]
    end

    NA --> ENF
    MFA --> NA
    ICP --> NA
    ENF --> POL
    ENF --> HIER
    ENF --> AL
    AL --> GL
```

### 5.2 RBAC Role Hierarchy

| Role | Inherits From | Key Permissions |
|------|--------------|-----------------|
| ADMIN | PHYSICIAN | Full system access + user management |
| PHYSICIAN | — | Patient CRUD, prescriptions, consultations, lab results |
| CLINICIAN | — | Patient read/write, consultations, prescription read |
| NURSE | — | Patient read, consultations read, prescriptions read, lab results read |
| RECEPTIONIST | — | Patient read/write, appointments CRUD |
| LAB_TECH | — | Patient read, lab results read/write |
| PHARMACIST | — | Patient read, prescriptions read/write |
| STAFF | — | Patient read only |

Reference: `casbin.ts` function `initializeDefaultPolicies()` lines 575–638.

### 5.3 Data Classification

| Level | Label | Handling | Examples |
|-------|-------|----------|----------|
| L1 | PUBLIC | No restrictions | Marketing content, public docs |
| L2 | INTERNAL | No external sharing | Internal metrics, workspace metadata |
| L3 | CONFIDENTIAL | Encrypted + audit logged | Billing, API keys, credentials |
| L4 | PHI | AES-256-GCM + audit + consent-gated | Patient names, CPF, CNS, clinical notes |

Reference: `.claude/rules/security.md` — Data Classification.

---

## 6. Deployment Architecture

| Component | Technology | Configuration |
|-----------|-----------|--------------|
| Application | Next.js 14 (Docker) | `Dockerfile.prod` |
| Database | PostgreSQL 15+ | Managed service with encryption at rest |
| Cache | Redis 7+ | Session store, rule cache |
| Object Storage | S3-compatible | Document and image storage |
| CI/CD | GitHub Actions | `.github/workflows/ci.yml`, `deploy.yml` |
| Monitoring | Structured logging | JSON log format with event codes |

---

## 7. Software of Unknown Provenance (SOUP)

| Component | Version | Purpose | Risk Mitigation |
|-----------|---------|---------|-----------------|
| Next.js | 14.x | Web framework | Pinned version, automated security scanning |
| Prisma | Latest | ORM | Parameterized queries prevent SQL injection |
| json-logic-js | Latest | Deterministic rule evaluation | Operation allowlist (REQ-CLIN-003) |
| casbin | Latest | RBAC policy engine | Fail-closed design (REQ-SEC-004) |
| @simplewebauthn | v13 | WebAuthn biometric auth | FIDO2 standard implementation |
| node:crypto | Built-in | AES-256-GCM, PBKDF2 | Node.js LTS, NIST-approved algorithms |

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-04-04 | Holi Labs Engineering | Initial release for ANVISA Class I notification |
