# GCP Migration — Holi Labs

Infrastructure-as-code and runbooks for migrating Holi Labs from DigitalOcean to Google Cloud Platform.

## Architecture

```
Cloud Run (southamerica-east1)
  └─ holilabs-web (Next.js 14)
       ├─ Cloud SQL PostgreSQL 15 (private IP via VPC)
       ├─ GCP Secret Manager (all secrets)
       ├─ Vertex AI (Gemini, via IAM — no API key)
       ├─ Cloud Storage (uploads, backups)
       ├─ Cloud Healthcare API (FHIR R4 store)
       └─ External (unchanged):
            ├─ Deepgram (transcription)
            ├─ Anthropic Claude (safety-critical AI)
            ├─ Twilio (SMS/WhatsApp)
            ├─ Resend (email)
            └─ Sentry (error monitoring)
```

## Environment Variables for GCP

Add these to `.env.local` or Cloud Run secrets:

```bash
# GCP Core
GCP_PROJECT_ID=holilabs-prod
GOOGLE_CLOUD_PROJECT=holilabs-prod

# Secrets Provider: "env" (local), "aws" (current), "gcp" (target)
SECRETS_PROVIDER=gcp

# AI Backend: "direct" (API key) or "vertex" (GCP Vertex AI)
AI_GEMINI_BACKEND=vertex
VERTEX_AI_LOCATION=southamerica-east1
VERTEX_AI_MODEL=gemini-1.5-flash

# Storage Provider
STORAGE_PROVIDER=gcs
GCS_BUCKET=holilabs-uploads

# FHIR Provider: "medplum" (current) or "gcp" (Cloud Healthcare API)
FHIR_PROVIDER=gcp
GCP_HEALTHCARE_LOCATION=southamerica-east1
GCP_HEALTHCARE_DATASET=holilabs-clinical
GCP_FHIR_STORE=holilabs-fhir-r4
```

## Scripts

| Script | Phase | Purpose |
|--------|-------|---------|
| `setup-project.sh` | 0 | Create GCP project, enable APIs, IAM, VPC |
| `setup-cloudsql.sh` | 2 | Create Cloud SQL instance with private IP |
| `setup-secrets.sh` | 2 | Migrate secrets to GCP Secret Manager |

## GitHub Actions Workflows

| Workflow | Target | Trigger |
|----------|--------|---------|
| `deploy-gcp-staging.yml` | Cloud Run (staging) | Push to `develop` |
| `deploy-gcp-production.yml` | Cloud Run (production) | Push to `main` |

## Application Code Changes

| File | Change |
|------|--------|
| `src/lib/secrets/gcp-secrets.ts` | GCP Secret Manager client |
| `src/lib/secrets/index.ts` | Provider router (env/aws/gcp) |
| `src/lib/ai/vertex-ai-provider.ts` | Vertex AI Gemini provider |
| `src/lib/ai/factory.ts` | Updated to route through Vertex AI |
| `src/lib/storage/gcs-client.ts` | Google Cloud Storage client |
| `src/lib/fhir/gcp-healthcare.ts` | Cloud Healthcare API FHIR client |

## Decommission

See [DECOMMISSION_DIGITALOCEAN.md](./DECOMMISSION_DIGITALOCEAN.md) for the step-by-step DigitalOcean shutdown procedure.
