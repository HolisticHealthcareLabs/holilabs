#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Holi Labs — GCP Secret Manager Setup (Phase 2)
#
# Migrates secrets from AWS Secrets Manager / .env to GCP Secret Manager.
# All secrets stored in southamerica-east1 for LGPD compliance.
# =============================================================================

PROJECT_ID="${GCP_PROJECT_ID:-holilabs-prod}"
REGION="southamerica-east1"

echo "=== GCP Secret Manager Setup ==="

create_secret() {
  local name="$1"
  local value="$2"

  if [ -z "$value" ] || [ "$value" = "" ]; then
    echo "  SKIP: $name (empty value)"
    return
  fi

  if gcloud secrets describe "$name" --project="$PROJECT_ID" &>/dev/null; then
    printf "%s" "$value" | gcloud secrets versions add "$name" \
      --data-file=- --project="$PROJECT_ID"
    echo "  UPDATE: $name"
  else
    printf "%s" "$value" | gcloud secrets create "$name" \
      --data-file=- \
      --replication-policy=user-managed \
      --locations="$REGION" \
      --project="$PROJECT_ID"
    echo "  CREATE: $name"
  fi
}

echo ""
echo "Creating secrets from environment (source .env.local first)..."
echo ""

# Auth
create_secret "NEXTAUTH_SECRET" "${NEXTAUTH_SECRET:-}"
create_secret "NEXTAUTH_URL" "${NEXTAUTH_URL:-https://holilabs.com}"
create_secret "GOOGLE_CLIENT_ID" "${GOOGLE_CLIENT_ID:-}"
create_secret "GOOGLE_CLIENT_SECRET" "${GOOGLE_CLIENT_SECRET:-}"

# AI Providers
create_secret "ANTHROPIC_API_KEY" "${ANTHROPIC_API_KEY:-}"
create_secret "OPENAI_API_KEY" "${OPENAI_API_KEY:-}"
create_secret "GEMINI_API_KEY" "${GEMINI_API_KEY:-}"
create_secret "DEEPGRAM_API_KEY" "${DEEPGRAM_API_KEY:-}"

# Encryption
create_secret "ENCRYPTION_KEY" "${ENCRYPTION_KEY:-}"
create_secret "ENCRYPTION_KEY_PREVIOUS" "${ENCRYPTION_KEY_PREVIOUS:-}"

# Communications
create_secret "TWILIO_ACCOUNT_SID" "${TWILIO_ACCOUNT_SID:-}"
create_secret "TWILIO_AUTH_TOKEN" "${TWILIO_AUTH_TOKEN:-}"
create_secret "RESEND_API_KEY" "${RESEND_API_KEY:-}"

# Monitoring
create_secret "SENTRY_DSN" "${SENTRY_DSN:-}"

# Payments
create_secret "STRIPE_SECRET_KEY" "${STRIPE_SECRET_KEY:-}"

echo ""
echo "=== Secrets Setup Complete ==="
echo ""
echo "To reference in Cloud Run:"
echo '  --set-secrets="NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,..."'
