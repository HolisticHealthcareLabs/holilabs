# Sprint 6 — Agent Tooling Integration Decisions

Evaluated 2026-03-31 based on openclaude 10-tool research synthesis.

---

## Decision 1: Nx Plugin — INSTALLED

claude mcp add nx -- npx nx-mcp@latest

Exposes affected:test, nx graph, nx run-many. Agents scope validation to changed packages only. Cuts CI loops from minutes to seconds for single-package changes.

## Decision 2: wshobson Plugins — SKIP

accessibility-compliance, backend-api-security, data-validation-suite do not exist in any configured marketplace (verified 2026-03-31).

Existing coverage:
- security-compliance@claude-code-workflows v1.2.0 — compliance
- security-scanning@claude-code-workflows v1.3.1 — OWASP/API
- compound-engineering@every-marketplace v2.26.4 — engineering practices
- design:accessibility-review skill — WCAG 2.1 AA (PAUL invokes)

## Decision 3: barkain/workflow-orchestration — SKIP

Cortex Boardroom is superior for this codebase:
1. Domain specificity — 8 LATAM healthtech personas vs barkain's 8 generic engineering agents
2. Enforcement — CI/CD gates (QUINN/CYRUS) actually block vs barkain's broken PreToolUse hooks (GitHub #4362: approve:false only logs warnings)
3. Routing — explicit ROUTER.md DAG vs keyword matching with >=2 threshold
4. Latency — single [ACTIVATING] emit vs 2 extra LLM round-trips (orchestrator->specialist->orchestrator)

Cherry-picked into parent CLAUDE.md:
- Scratchpad pattern (write >200 lines to .scratchpad/, return DONE|path)
- Delegation enforcement (require [ACTIVATING] before Write/Edit to src/apps)

## Decision 4: ComposioHQ ao — NOT YET

Prerequisites before running ao start:
1. Create GitHub Issues backlog for Sprint 6
2. Pilot with openclaude on 1 non-critical issue (config ready: ao-holilabs.yaml)
3. Evaluate worktree-per-issue vs current branch strategy

## Decision 5: Medplum Deepening — YES

Sprint 6 dedicated agent mission:
- FHIR R4 mapping: Patient, Encounter, Observation, DiagnosticReport, MedicationRequest
- Medplum subscription webhooks for RNDS real-time sync
- FHIR validation via profiles in src/lib/fhir/rnds-profiles.ts
- ELENA owns clinical review; RUTH owns consent/data-sharing
- Reference: https://rnds-fhir.saude.gov.br/
