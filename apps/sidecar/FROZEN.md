# Sidecar — FROZEN

**Status:** Frozen as of 2026-03-02
**Decision:** Board memo 2026-03-01 — neither revenue track requires a desktop app.

## Why Frozen (Not Deleted)

| Factor | Assessment |
|--------|-----------|
| Track A (web-first API, $25-75/mo) | Clinics don't install desktop software — contradicts web-first mandate |
| Track B (Governance Console, $500+/mo) | Insurers use web dashboards, not desktop overlays |
| ANVISA Class I | `probabilistic-validator.ts` converts LLM output to RED/YELLOW/GREEN signals = clinical decision, violates deterministic-only mandate |
| Maintenance burden | Electron + electron-builder + macOS notarization + Windows Authenticode + Tesseract + better-sqlite3 = disproportionate |
| Future option value | Ghost Mode overlay + EHR fingerprinting IP is genuinely novel — worth preserving for future enterprise on-prem deals |

## Rules

1. **No new development.** Do not add features, fix bugs, or update dependencies.
2. **No CI builds.** Remove from any CI pipeline if present.
3. **No landing page presence.** The public website must not reference a desktop plugin or download.
4. **`/download` route remains gated to ADMIN-only** for existing pilot partners.
5. **Do not delete.** The codebase has IP value for future enterprise on-prem integrations.

## Reactivation Criteria

To unfreeze, ALL of the following must be true:
- A signed enterprise deal requires on-prem EHR integration
- `probabilistic-validator.ts` is refactored to be context-gathering only (no clinical decision output)
- ANVISA compliance review confirms Class I eligibility
- Board approves dedicated maintenance budget

## Contact

Questions about this freeze: @holilabs/clinical-engineering
