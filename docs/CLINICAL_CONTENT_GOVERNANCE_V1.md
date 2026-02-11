# Clinical Content Governance Process v1

> Operator guide for proposing, reviewing, approving, and activating deterministic rule bundles.

## 1. Purpose

Cortex clinical decision support relies on **deterministic rule bundles** — serialised JSON-Logic rules evaluated at runtime. This document defines the governance process that ensures every rule change is traceable, clinically reviewed, and approved before activation.

## 2. Lifecycle States

| State | Description | Who can transition |
|---|---|---|
| **DRAFT** | Rule change proposed; not yet reviewed. | Any authorised contributor |
| **REVIEW** | Under clinical review by governance board. | Contributor submits for review |
| **APPROVED** | Reviewed and approved; ready for activation. | Clinical governance board |
| **ACTIVE** | Live in production; evaluated at runtime. | Deployment operator (after approval) |
| **DEPRECATED** | Retired from active evaluation. | Governance board / operator |

### Transition Rules

```
DRAFT  ──→  REVIEW  ──→  APPROVED  ──→  ACTIVE  ──→  DEPRECATED
              │                                        
              └───→  DRAFT  (returned for revision)
```

- Only **APPROVED** bundles may transition to **ACTIVE**.
- Activation requires a valid **clinical sign-off record** (see Section 5).
- Skipping states is **not permitted** (e.g., DRAFT → ACTIVE is blocked).

## 3. Change Proposal Process

1. **Author** creates a change request using the [Change Log Template](./CLINICAL_RULE_CHANGE_LOG_TEMPLATE.md).
2. **Author** updates the rule definition in the development environment.
3. **Author** runs local validation (unit tests + typecheck) and attaches evidence.
4. **Author** submits a pull request with the change log entry and sets the bundle state to `REVIEW`.

## 4. Review & Approval

1. **Reviewer** (minimum: one clinical governance board member) evaluates:
   - Clinical accuracy of the rule logic
   - Regulatory alignment (source authority, guideline year)
   - Severity classification appropriateness
   - Potential for false positives / false negatives
2. **Reviewer** may return the bundle to `DRAFT` with feedback.
3. **Reviewer** approves by signing the [Clinical Sign-Off Template](./CLINICAL_SIGNOFF_TEMPLATE.md) and transitioning the bundle to `APPROVED`.

## 5. Clinical Sign-Off Requirements

Every activation requires a signed-off record containing:

| Field | Description |
|---|---|
| `signedOffBy` | Identifier of the approving clinician/officer |
| `role` | Title at time of sign-off (e.g., Chief Medical Officer) |
| `signedOffAt` | ISO-8601 timestamp |
| `status` | Must be `SIGNED_OFF` for activation |
| `notes` | Optional evidence references or conditions |

The runtime policy module (`governance-policy.ts`) enforces that:
- `isBundleRuntimeActive()` returns `true` only when lifecycle is `ACTIVE` **and** signoff is `SIGNED_OFF`.
- If the bundle is not properly signed off, clinical primitives (e.g., validate-dose) return **degraded status**, never silent success.

## 6. Activation

1. **Operator** verifies the bundle is in `APPROVED` state with a valid sign-off.
2. **Operator** runs `canActivate()` from the governance-policy module.
3. **Operator** transitions the bundle to `ACTIVE` and deploys.
4. The manifest route (`/api/governance/manifest`) begins exposing the new bundle metadata.

## 7. Deprecation

1. A replacement bundle must be `ACTIVE` before deprecating the current one.
2. **Operator** transitions the old bundle to `DEPRECATED`.
3. Deprecated bundles are retained for audit purposes but are not evaluated at runtime.

## 8. Audit Trail

- Every lifecycle transition is logged with actor, timestamp, and reason.
- The manifest API exposes `contentBundle` and `signoff` metadata for board/audit consumption.
- Clinical primitives include `contentProvenance` in every response for per-request traceability.

## 9. Emergency Override

In an emergency (e.g., critical patient safety issue discovered in active rules):
1. The governance board may issue an **emergency deprecation** of the active bundle.
2. The system falls back to degraded mode (primitives return safe "unknown" status).
3. A new bundle must go through the full lifecycle (DRAFT → REVIEW → APPROVED → ACTIVE).

---

*Document version: 1.0 | Last updated: 2026-02-10*
