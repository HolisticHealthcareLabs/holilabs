# Production Deploy Checklist

Set these secrets in the DigitalOcean App Platform dashboard before the first deploy.

## Required Secrets (app will crash or return 503 if missing)

| Secret | Where to get it | Notes |
|--------|----------------|-------|
| `DATABASE_URL` | DigitalOcean Managed Database | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Auth fails entirely if missing |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` | PII encryption/decryption fails |
| `UPSTASH_REDIS_REST_URL` | [Upstash Console](https://console.upstash.com) | Hard 503 on ALL API requests if missing in production |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console | Same as above |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com) | All AI/CDSS features fail |
| `DEEPGRAM_API_KEY` | [Deepgram Console](https://console.deepgram.com) | Transcription fails |

## Required for Features (feature returns 503 if missing, app still runs)

| Secret | Feature | Notes |
|--------|---------|-------|
| `R2_ACCESS_KEY_ID` | File uploads | Cloudflare R2 credentials |
| `R2_SECRET_ACCESS_KEY` | File uploads | |
| `R2_ENDPOINT` | File uploads | e.g. `https://xyz.r2.cloudflarestorage.com` |
| `R2_BUCKET` | File uploads | Bucket name |
| `RESEND_API_KEY` | Transactional email | [Resend](https://resend.com) |
| `LIVEKIT_API_KEY` | Video consultations | [LiveKit Cloud](https://cloud.livekit.io) |
| `LIVEKIT_API_SECRET` | Video consultations | |
| `LIVEKIT_URL` | Video consultations | e.g. `wss://your-project.livekit.cloud` |
| `ELEVENLABS_API_KEY` | Voice narration (demo) | [ElevenLabs](https://elevenlabs.io) |
| `STRIPE_SECRET_KEY` | Billing/payments | [Stripe Dashboard](https://dashboard.stripe.com) |
| `STRIPE_WEBHOOK_SECRET` | Billing webhooks | Stripe > Webhooks > Signing secret |
| `CRON_SECRET` | Scheduled jobs | `openssl rand -base64 32` — same value in GitHub Actions secrets |

## Configuration Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://holilabs.xyz` | Already in .do/app.yaml |
| `USE_REAL_LLM` | `true` | Otherwise AI returns demo/mock responses |
| `NODE_ENV` | `production` | Already in .do/app.yaml |
| `MEILI_HOST` | Your Meilisearch URL | Defaults to `localhost:7700` — MUST override |
| `VAPID_SUBJECT` | `mailto:support@holilabs.com` | Note: .do/app.yaml uses `VAPID_EMAIL` but code reads `VAPID_SUBJECT` |

## Pre-Deploy Steps

1. [ ] Set all Required Secrets in DigitalOcean App Platform > Settings > App-Level Environment Variables
2. [ ] Set feature secrets for features you want live on launch
3. [ ] Set `CRON_SECRET` in both DigitalOcean AND GitHub Actions repository secrets
4. [ ] Run `npx prisma migrate deploy` against the production database
5. [ ] Push to `main` — only the DigitalOcean pipeline will trigger (GCP is disabled)
6. [ ] Verify `/demo/setup` returns 200 on production URL
7. [ ] Verify `/api/health/ready` returns `{ status: 'healthy' }`

## Known Limitations — Disclose to Users at Launch

These features work at the UI level but have backend stubs. Document these in your release notes.

| Feature | Limitation | Status |
|---------|-----------|--------|
| E-Prescribing → Pharmacy | Prescription is signed and saved, but NOT transmitted to a real pharmacy network (NCPDP/Surescripts). Patient must take the PDF to a pharmacy. | `@todo(pharmacy-integration)` |
| Clinician License Verification | UI shows "automatically verified" but no real CFM/CONFEMED/NPPES API call is made. License verification is manual/deferred. | `@todo(credentialing-apis)` |

## Post-Deploy Verification

- [ ] Demo flow: `/demo/setup` → select specialty → launch → dashboard loads with specialty data
- [ ] Patient portal: `/portal/login` → magic link or password login works
- [ ] Co-Pilot: `/dashboard/clinical-command` → recording + SOAP generation
- [ ] Claims Intelligence: `/dashboard/billing` → KPIs render
- [ ] File upload: upload a document → verify it appears (R2 storage)
- [ ] Email: trigger a password reset → email arrives
