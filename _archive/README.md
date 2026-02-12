# Series B Pilot Archive

**DO NOT DELETE - Required for Due Diligence**

Artifacts from the February 2026 Investor Pilot (Operation Greenlight → Black Box → Ouroboros).

## Contents

### reports/
| File | Description |
|------|-------------|
| `CLINICAL_FRR_PHASE1.md` | Clinical safety validation (Dr. Elena Garcia, CMO) |
| `CLINICAL_FRR_v1.md` | Earlier clinical FRR draft |
| `REVENUE_AUDIT_PHASE1.md` | Revenue integrity audit (Victor Mercado, VP Finance) |
| `REVENUE_AUDIT.md` | Earlier revenue audit draft |
| `LEGAL_TRACE_PHASE1.json` | Governance log extraction with HIPAA/LGPD compliance proof |
| `LEGAL_TRACE.json` | Earlier legal trace draft |
| `WEEKLY_BUSINESS_REVIEW_v1.json` | Week 1 aggregate: 55.6x ROI, 447 interactions, 85% adherence |
| `VC_EMAIL_DRAFT.md` | Investor email to a16z/Kaszek (Series B: $5M ask) |
| `UX_COPY_REVIEW.md` | UX copy review for pilot interfaces |

### ops/
| File | Description |
|------|-------------|
| `RUNBOOK_BOLIVIA.md` | El Alto Clinic deployment runbook (Starlink, 4150m altitude) |

### scripts/
| File | Description |
|------|-------------|
| `seed-pilot-data.ts` | Root-level seed script (broken due to prod DB sync) |
| `seed-pilot-data-web.ts` | Working seed script (18/18 patients seeded via apps/web) |

## Key Metrics (Week 1)

- **Patients:** 18 synthetic (BLOCK: 3, FLAG: 4, ATTESTATION: 2, PASS: 9)
- **Revenue:** 487,500 BOB ($28,031 USD)
- **Cost Avoidance:** $425,000 USD (17 SAEs prevented)
- **ROI:** 55.6x
- **Safety Record:** Zero adverse events, 100% rule accuracy
- **Git Tag:** `v1.0.0-SIMULATION-COMPLETE`

## Compliance

- HIPAA: Passed
- LGPD: Passed
- Bolivia Law 1700: Passed
- All patient IDs are synthetic (no real PII)
