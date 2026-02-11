# Clinical Rule Change Log Entry

> Use this template for every proposed change to a deterministic rule bundle.
> Attach this to your pull request and reference it in the sign-off template.

---

## Change Metadata

| Field | Value |
|---|---|
| **Change ID** | _e.g., CRC-2026-001_ |
| **Date** | _YYYY-MM-DD_ |
| **Author** | _Name / email_ |
| **Bundle Version** | _e.g., 1.2.0 → 1.3.0_ |
| **Protocol Version** | _e.g., CORTEX-V1_ |

## Summary

_One-paragraph description of what is changing and why._

## Rules Affected

| Rule ID | Rule Name | Change Type | Severity |
|---|---|---|---|
| _e.g., BSTH-001_ | _Non-Selective Beta-Blocker in Asthma_ | _Modified / Added / Removed_ | _HARD_BLOCK_ |
| | | | |

## Clinical Justification

_Explain the clinical reasoning for this change. Reference guidelines, evidence, or incident reports._

- **Source Authority:** _e.g., GINA Guidelines 2024_
- **Evidence Reference:** _URL or citation_
- **Risk Assessment:** _Impact if change is not made vs. risk of change_

## Testing Evidence

- [ ] Unit tests pass (`pnpm test`)
- [ ] Typecheck passes (`pnpm typecheck`)
- [ ] Manual validation against test cases
- [ ] No regressions in existing rule evaluations

### Test Cases

| Input Scenario | Expected Outcome | Actual Outcome | Pass? |
|---|---|---|---|
| _Patient with Asthma + Beta-blocker order_ | _HARD_BLOCK_ | _HARD_BLOCK_ | _Yes_ |
| | | | |

## Rollback Plan

_Describe how to revert this change if issues are discovered post-activation._

## Checksum Verification

- **Pre-change checksum:** _SHA-256 hex prefix_
- **Post-change checksum:** _SHA-256 hex prefix_

---

**Submitted by:** _________________________ **Date:** _____________

**PR Link:** _________________________
