# Cortex Demo Day Checklist

## Build Anchor
- Commit: b31e83a
- Tag: demo-cortex-2026-02-10

## Pre-Demo Gates
- [ ] pnpm -C apps/web typecheck passes
- [ ] Console filters render (country/site/unit/date)
- [ ] Dose check shows attestation_required when renal data missing/stale
- [ ] Override without reason is blocked
- [ ] Override with valid reason succeeds
- [ ] Governance event context visible
- [ ] Reminder no-consent path blocked
- [ ] Reminder consent path emits lifecycle telemetry

## Fallback Plan
- [ ] If reminder flow unstable, switch to dry-mode consent/lifecycle demonstration
- [ ] Keep deterministic + governance path as primary

## Demo Assets
- [ ] 5-8 screenshots captured
- [ ] 1 short walkthrough recording captured
- [ ] Board scorecard exported (PDF)
