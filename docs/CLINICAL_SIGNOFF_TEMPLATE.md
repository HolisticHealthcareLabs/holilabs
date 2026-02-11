# Clinical Sign-Off Record

> This template is required for every rule bundle activation.
> The sign-off must be completed by an authorised member of the clinical governance board.

---

## Bundle Identification

| Field | Value |
|---|---|
| **Content Bundle Version** | _e.g., 1.3.0_ |
| **Content Checksum (SHA-256)** | _e.g., a1b2c3d4e5f6..._ |
| **Protocol Version** | _e.g., CORTEX-V1_ |
| **Change Log Reference** | _e.g., CRC-2026-001_ |
| **PR / Commit Reference** | _Link to pull request_ |

## Review Summary

- **Total rules in bundle:** _e.g., 26_
- **Rules added:** _e.g., 2_
- **Rules modified:** _e.g., 1_
- **Rules removed:** _e.g., 0_

## Clinical Review Checklist

- [ ] All rule logic has been reviewed for clinical accuracy
- [ ] Severity classifications are appropriate for each rule
- [ ] Source authorities and guideline years are current
- [ ] No rules conflict with existing active rules
- [ ] Edge cases and false-positive risk have been assessed
- [ ] Testing evidence (unit tests, manual validation) has been reviewed
- [ ] Rollback plan is documented and feasible

## Regulatory Compliance

- [ ] Rules comply with applicable regulatory requirements
- [ ] Patient safety impact has been assessed
- [ ] HIPAA/data privacy implications reviewed (if applicable)

## Sign-Off

| Field | Value |
|---|---|
| **Signed Off By** | _Name_ |
| **Role / Title** | _e.g., Chief Medical Officer_ |
| **Organisation** | _e.g., Holi Labs Clinical Governance Board_ |
| **Date** | _YYYY-MM-DD_ |
| **Time (UTC)** | _HH:MM_ |

### Decision

- [ ] **APPROVED** — Bundle may proceed to ACTIVE state
- [ ] **REJECTED** — Bundle returned to DRAFT with feedback below

### Conditions / Notes

_Any conditions for activation, observations, or feedback for the author._

---

### Signature

**Signature:** _________________________

**Date:** _________________________

---

*Template version: 1.0 | Governed by [Clinical Content Governance Process v1](./CLINICAL_CONTENT_GOVERNANCE_V1.md)*
