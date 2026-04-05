# Demo Mode Guide

Run Holi Labs with synthetic data for investor demos and pilot onboarding.

## Quick Start

```bash
# 1. Set environment variables (add to .env.local)
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true

# 2. Ensure database is migrated
pnpm exec prisma db push

# 3. Seed demo data
pnpm seed:demo

# 4. Start the app
pnpm dev
```

Open `http://localhost:3000/auth/login` — demo account quick-login cards appear automatically.

## Seed Commands

| Command | Description |
|---------|-------------|
| `pnpm seed:demo` | Full seed: 3 orgs, 12 users, 25 patients, clinical data |
| `pnpm seed:demo:minimal` | Minimal seed: 3 orgs, 12 users, 3 patients, no clinical data |
| `pnpm seed:clean` | Wipe all DEMO- data and reseed from scratch |

## Demo Accounts

All demo accounts use the password: `DemoHoli2026!`

| Role | Email | Workspace |
|------|-------|-----------|
| Physician (owner) | `demo-physician@holilabs.demo` | Hospital DEMO Central |
| Nurse | `demo-nurse@holilabs.demo` | Hospital DEMO Central |
| Admin | `demo-admin@holilabs.demo` | Hospital DEMO Central |
| Receptionist | `demo-receptionist@holilabs.demo` | Hospital DEMO Central |
| Lab Tech | `demo-labtech@holilabs.demo` | Hospital DEMO Central |
| Pharmacist | `demo-pharmacist@holilabs.demo` | Hospital DEMO Central |
| Physician 2 | `demo-physician2@holilabs.demo` | Clinica DEMO Esperanca |
| Nurse 2 | `demo-nurse2@holilabs.demo` | Clinica DEMO Esperanca |
| Admin 2 | `demo-admin2@holilabs.demo` | Clinica DEMO Esperanca |
| Physician 3 | `demo-physician3@holilabs.demo` | Lab DEMO Diagnostica |
| Lab Tech 2 | `demo-labtech2@holilabs.demo` | Lab DEMO Diagnostica |
| Researcher | `demo-researcher@holilabs.demo` | Lab DEMO Diagnostica |

## Data Volumes

| Entity | Count | Notes |
|--------|-------|-------|
| Workspaces | 3 | Hospital, Clinic, Lab |
| Users | 12 | Across all workspaces |
| Patients | 25 | Fake CPFs (000.000.0XX-00) |
| Appointments | 50 | Past, today, and future |
| Clinical Notes (SOAP) | 30 | Portuguese content |
| Lab Results | 40 | LOINC-coded |
| Prescriptions | 20 | With medications |
| Diagnoses | 15 | ICD-10 coded |
| Allergies | 10 | MEDICATION, FOOD, ENVIRONMENTAL |
| Vital Signs | 100 | Realistic ranges |
| Imaging Studies | 5 | X-Ray, CT, Ultrasound, MRI |
| Preventive Care Reminders | 5 | Overdue screenings |
| Audit Logs | 200 | Hash-chained |

## Safety Guards

1. **Production block**: Seed scripts refuse to run if `DATABASE_URL` contains "prod" or "production".
2. **Opt-in only**: Requires `DEMO_MODE=true` environment variable.
3. **Destructive confirmation**: `--clean` requires `--confirm` flag.
4. **Fake identifiers**: All CPFs use invalid range `000.000.0XX-00`. All MRNs prefixed `DEMO-`.
5. **Idempotent**: Running `seed:demo` multiple times is safe (uses upsert for top-level records).

## Feature Flags

Control which features are visible in demo mode via environment variables:

| Flag | Default | Description |
|------|---------|-------------|
| `FEATURE_FHIR_SYNC` | `false` | FHIR R4 sync to external EHR |
| `FEATURE_TELEHEALTH` | `true` | LiveKit video consultations |
| `FEATURE_AI_SCRIBE` | `true` | Deepgram transcription + SOAP |
| `FEATURE_PRESCRIPTIONS` | `true` | e-Prescriptions module |
| `FEATURE_LAB_INTEGRATION` | `false` | HL7/LOINC lab ingest |
| `FEATURE_BILLING` | `false` | Insurance claims / TUSS |

Disabled features show "Coming Soon" badges in the UI. Server-side only — see `src/lib/demo-mode.ts`.

## UI Changes in Demo Mode

- **Login page**: Shows "Demo Accounts" card with one-click login buttons (replaces "Launch Interactive Demo" button).
- **Dashboard**: Persistent amber "DEMO MODE" banner at top. Non-dismissable.
- **Credentials banner**: `DemoCredentialsBanner` component available for embedding in other pages.

## Resetting Demo Data

```bash
# Full reset: wipe everything DEMO-prefixed and reseed
pnpm seed:clean

# Or manually clean without reseeding
DEMO_MODE=true tsx prisma/seeds/index.ts --clean --confirm
```

## Troubleshooting

**"ABORT: DEMO_MODE is not set"** — Add `DEMO_MODE=true` to `.env.local` or prefix the command.

**"Demo sign-in failed"** — Run `pnpm seed:demo` to create demo user accounts.

**"ABORT: DATABASE_URL appears to point at production"** — The seed script detected "prod" in your DATABASE_URL. Use a development database.
