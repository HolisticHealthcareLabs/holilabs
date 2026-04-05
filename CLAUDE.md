# CLAUDE.md — holilabsv2 (HHL Flagship)

## I. GLOBAL EXECUTIVE HEADER (Shared)
**Project:** holilabsv2 (HHL Flagship) (CGH Venture)
**Executive System:** MEGATRON (Orchestrated from `~/prototypes/openclaude/`)
**Ownership:** Nico (nicola@holilabs.xyz) — São Paulo, Brazil (BRT)

> **MANDATE:** This project is governed by the **MEGATRON SOPs**. 
> Read `~/prototypes/openclaude/MEGATRON.md` and `PROTOCOLS.md` before execution.

---

## II. THE 2.5x EFFICIENCY PROTOCOL (Shared)
To maximize credit leverage and minimize token waste:
1. **Model Routing:** Haiku/Flash for 80% (search, routine code). Opus/Pro for 20% (architecture, complex bugs).
2. **Context Pruning:** Use surgical `read_file` calls. Never read entire directories without a filter.
3. **Hybrid Fallback:** If cloud credits are < 5% or API is down, auto-switch to Local (Ollama) per `openclaude/scripts/setup-hybrid-llm.sh`.
4. **Autonomous Research:** Use `python3 ~/prototypes/openclaude/scripts/browser-agent.py "task"` for web tasks.
5. **Persistent Memory:** Use `python3 ~/prototypes/openclaude/memory/memory-brain.py [add|search] "content"` for long-term knowledge.

---

## III. LOCAL PROJECT SPECS (Personalized)
**Status:** Active / Flagship
**Tech Stack:** Next.js monorepo (pnpm), Prisma, Postgres, Redis, Jest, Playwright.
**Key Commands:**
- Install: `pnpm install`
- Dev: `pnpm dev`
- Test: `pnpm test`
- Typecheck: `pnpm typecheck`
- Database: `npx prisma db push`

**Domain Logic:**
- **Colombia:** CUPS/RIPS/EPS integration in `apps/web/src/lib/finance/`.
- **Brazil:** TUSS/ANS integration in `research/insurance-codes/`.
- **SaMD:** Any feature affecting clinical decision-making must be audited for ANVISA RDC 657/2022.

---

## IV. EXECUTION HOOKS (Shared)
1. **Morning Brief:** Surface KPI anomalies to the 06:20 BRT standup.
2. **Overnight Pipeline:** Queue long-form research or batch refactors for the 22:00 BRT cycle.
3. **Decision Matrix:** Budget > $1K or strategic hires require a 3-option brief.

---
**Protocol Version:** 1.0 (2026-04-02)
