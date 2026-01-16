# Synthea Demo Data (Docker) — Why This Is the Right Option

## Why Synthea (for Phase 1)
Synthea is the best “patient realism per integration effort” choice for an investor demo because:

- **Clinical realism (longitudinal)**: Generates full disease progressions over time (encounters, conditions, meds, labs, procedures), not just random fields.
- **FHIR-native output**: Exports **FHIR R4 Bundles**, which maps cleanly to Holi Labs’ interoperability direction and makes future integration (FHIR servers, Medplum, etc.) straightforward.
- **Safe-by-design**: Synthetic data (no real PHI), which reduces compliance risk for demos and local development.

## Why Docker for Synthea (avoid Java dependency hell)
Running Synthea inside Docker is the safest/repeatable option:

- **Reproducibility**: Same Java runtime, same invocation, same output structure across machines and CI.
- **No local Java install**: Avoids “Java 11 vs 17 vs 21” issues, PATH conflicts, and dev machine drift.
- **Fast onboarding**: New devs can run one command with Docker Desktop instead of setting up Java.

## One-command workflow (generate + seed)

### 1) Generate FHIR Bundles (Docker)
From repo root:

```bash
chmod +x scripts/generate-synthea-fhir-docker.sh
./scripts/generate-synthea-fhir-docker.sh 100 "Massachusetts"
```

By default, this script **cleans** `synthea-output/fhir` and `synthea-output/metadata` so you don’t accidentally mix cohorts across runs.
If you want to keep previous outputs, set `KEEP_OUTPUT=1`:

```bash
KEEP_OUTPUT=1 ./scripts/generate-synthea-fhir-docker.sh 100 "Massachusetts"
```

Output will be written to:
- `synthea-output/fhir/*.json`

### 2) Seed Holi Labs DB from FHIR

```bash
pnpm --filter @holi/web exec tsx ../../scripts/seed-patients.ts --input ./synthea-output/fhir --limit 100
```

### 3) Validate in the UI
- Start web app (if not already): `pnpm --filter @holi/web dev`
- Open `http://localhost:3000`
- Use **Cmd+K** and search for:
  - `MRN-SYN`
  - `PT-`

## End-to-end helper script
There is also an end-to-end helper:

```bash
chmod +x scripts/seed-synthea-demo.sh
./scripts/seed-synthea-demo.sh 100 "Massachusetts"
```

This runs:
1) Dockerized Synthea generation
2) Holi Labs ingestion + risk score seeding


