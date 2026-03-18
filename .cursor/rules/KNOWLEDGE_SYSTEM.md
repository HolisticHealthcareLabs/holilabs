# Knowledge System — Three-Tier Architecture
## Nico Caprioli | JHU Carey MBA → Cortex Boardroom Integration

**Purpose:** This document defines how the Cortex Boardroom agents access, reason with, and apply the full body of Nico's MBA knowledge to product, strategy, clinical, legal, and operational decisions at Cortex Health.

---

## Architecture Overview

```
TIER 1 — Decision Protocols (always in context)
  └─ .cursor/rules/MBA_FRAMEWORKS.md        ← Compressed decision tests, always loaded
  └─ .cursor/rules/ROUTER.md                ← Agent routing + cross-agent rules
  └─ .cursor/rules/[PERSONA]_V2.md          ← Per-agent invariants and domain authority

TIER 2 — Knowledge Library (loaded on demand)
  └─ docs/knowledge/[TERM]_[Course].md      ← Full course content: 22 documents
  └─ .cursor/rules/KNOWLEDGE_INDEX.md       ← Domain → file mapping

TIER 3 — Session Context (injected per task)
  └─ Active working documents, current decisions, live data
```

**Core principle:** CLAUDE.md and rules files contain only decision protocols — what to do and when. The knowledge library contains what to know. Agents consult the library; they do not memorize it.

---

## TIER 1 — What Belongs in System Prompts

System prompt content must satisfy ALL three criteria:
1. **Reflexive** — Must be evaluated on every relevant decision automatically
2. **Compressed** — Fits in a decision-test format (apply when / test / threshold)
3. **Invariant** — Does not change based on the specifics of a situation

### The Compression Format (mandatory for all Tier 1 additions)

```markdown
## Framework: [Name] — [Source: Author, Course]

**Apply when:** [trigger condition — 1 sentence]
**Decision test:** [binary or scored evaluation — 2-4 bullets]
**Threshold:** [pass/fail or scoring rubric]
**Key metric:** [what to measure]
```

When a new MBA insight needs to become a Tier 1 decision protocol, compress it into this format before adding to `MBA_FRAMEWORKS.md`. Never add raw course content to system prompts.

---

## TIER 2 — Knowledge Library Specification

### Document Schema
Each of the 22 course documents in `docs/knowledge/` follows this structure:
- Course header (code, term, institution)
- Module sections (one H2 per module)
- Item subsections (one H3 per item with type label)
- Page content (learning objectives, frameworks, readings, case studies)

### Access Pattern
Agents access Tier 2 documents by reading the file when:
1. A Tier 1 decision test says "see full framework in docs/knowledge/"
2. A Board Meeting requires deep domain synthesis
3. An agent needs to cite academic authority for a recommendation

### Coverage
| Domain | Primary Document(s) | Content Depth |
|---|---|---|
| Strategy & Competitive Positioning | Strategic Management, Digital Transformation | Full — learning objectives, frameworks, cases |
| Finance & Microeconomics | Corporate Finance, Business Microeconomics | Full |
| Marketing & GTM | Marketing Management, Negotiation | Full |
| Operations & Projects | Operations Management, Managing Complex Projects | Full |
| Data, Analytics & ML | Business Analytics, Data Visualization, Machine Learning for Management | Full |
| Healthcare Systems | Fundamentals of HC Systems, Frameworks for HC Markets, Health Analytics | Full |
| Health Law & Compliance | Health Care Law and Regulation, Health Information Technology | Full |
| Leadership & Teams | Leadership & Org Behavior, Effective Teaming | Full |
| AI & Blockchain | AI Essentials, Cryptos & Blockchain | Module structure only (files-based) |
| Social Impact | CityLab Catalyst, City Lab Practicum | Full |

---

## TIER 3 — Session Context Rules

Session context is anything injected per task that is not persistent:
- The specific decision being evaluated (board memo, pricing model, partnership term sheet)
- Live data (burn rate, CAC, current safety firewall metrics)
- External inputs (regulatory filings, competitor announcements)

Rules for session context:
- It takes precedence over Tier 2 content for specific facts
- It does not override Tier 1 invariants
- It is discarded after the session

---

## How to Add New Knowledge

### Adding a new decision framework to Tier 1
1. Read the relevant Tier 2 document
2. Identify the framework that provides a binary or scored decision test
3. Compress to the format above
4. Add to `MBA_FRAMEWORKS.md` — no framework may exceed 20 lines in Tier 1
5. Add a reference: `Full synthesis: docs/knowledge/[file].md`

### Adding a new course to Tier 2
1. Create a markdown document in `docs/knowledge/`
2. Follow the existing schema (header → modules → items → content)
3. Add the domain mapping to `KNOWLEDGE_INDEX.md`
4. If the course contains a decision-critical framework, compress and add to Tier 1

### When NOT to add to Tier 1
- The insight is context-specific (applies to some decisions, not all)
- The insight requires more than 20 lines to express correctly
- The insight is already implied by an existing framework
- Rule of thumb: if you're unsure, keep it in Tier 2

---

## The Master Prompt for New Agent Sessions

Use this prompt when initializing any new agent that should have access to the full knowledge system:

```
You are operating within the Cortex Boardroom system for Cortex Health, a B2B healthtech
company building a CDSS (Clinical Decision Support System) for the Brazilian healthcare market.

The operator is Nico Caprioli, co-founder and CEO — a JHU Carey MBA candidate with
specializations in Healthcare Management, Technology & Innovation, AI, and Leadership.

## Your Knowledge Architecture

TIER 1 — Active decision protocols (read these first):
- .cursor/rules/MBA_FRAMEWORKS.md    — 5 compressed frameworks from Digital Transformation
- .cursor/rules/ROUTER.md            — routing table and cross-agent rules
- Your persona profile (_V2.md)      — domain authority, invariants, veto conditions

TIER 2 — Knowledge library (consult when Tier 1 is insufficient):
- .cursor/rules/KNOWLEDGE_INDEX.md   — domain → file mapping for 22 MBA courses
- docs/knowledge/[course].md         — full course content by domain

TIER 3 — This session's context (provided in the current prompt)

## Activation Protocol
1. Read ROUTER.md to confirm you are the correct agent for this task
2. Load your _V2.md profile
3. Apply Tier 1 decision tests from MBA_FRAMEWORKS.md
4. If deeper context is required, load 1-2 files from KNOWLEDGE_INDEX.md
5. Respond in character, citing frameworks by name and source
6. Emit the Session Snapshot at the end of non-trivial responses

## Non-Negotiable Constraints
- RUTH, ELENA, CYRUS hold supreme veto. Their invariants override all other reasoning.
- Never use RAW course content as a recommendation. Synthesize and apply it.
- Every strategic recommendation must trace to at least one named framework.
- Cite the knowledge source: "(MBA Knowledge Library: [Course], JHU Carey)"
```

---

## Design Rationale

**Why not RAG?** The MBA knowledge corpus is interconnected, conceptual, and static.
Embedding-based retrieval fragments the cross-framework relationships that produce analytical
value. A Porter Five Forces analysis that cannot "see" Shapiro & Varian lock-in theory
produces weaker strategy. Structured file reads preserve those connections.

**Why not pack everything into CLAUDE.md?** "To define is to limit." The Cortex Boardroom
CLAUDE.md is 270 lines of pure decision protocol. Adding 22 courses of raw content would
destroy signal-to-noise ratio. The three-tier architecture gives agents depth on demand
without degrading the reflexes that fire on every decision.

**Why 22 separate files?** Domain isolation. When ELENA evaluates a clinical analytics
decision, she loads `FA25_Health_Analytics.md` — not 750KB of combined course content.
Context windows are finite. Precision over completeness.
