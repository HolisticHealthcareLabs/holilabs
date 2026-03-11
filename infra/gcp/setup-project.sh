#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Holi Labs — GCP Project Bootstrap (Phase 0)
#
# Prerequisites:
#   1. gcloud CLI installed (https://cloud.google.com/sdk/docs/install)
#   2. Authenticated: gcloud auth login
#   3. Billing account linked
#
# Usage:
#   chmod +x infra/gcp/setup-project.sh
#   ./infra/gcp/setup-project.sh
# =============================================================================

PROJECT_ID="${GCP_PROJECT_ID:-holilabs-prod}"
REGION="southamerica-east1"
BILLING_ACCOUNT="${GCP_BILLING_ACCOUNT:-}"

echo "=== Holi Labs GCP Project Bootstrap ==="
echo "Project:  $PROJECT_ID"
echo "Region:   $REGION"
echo ""

# ---- 1. Create project (skip if exists) ----
if ! gcloud projects describe "$PROJECT_ID" &>/dev/null; then
  echo "[1/8] Creating project $PROJECT_ID..."
  gcloud projects create "$PROJECT_ID" --name="Holi Labs Production"
else
  echo "[1/8] Project $PROJECT_ID already exists."
fi

gcloud config set project "$PROJECT_ID"

# ---- 2. Link billing ----
if [ -n "$BILLING_ACCOUNT" ]; then
  echo "[2/8] Linking billing account..."
  gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"
else
  echo "[2/8] SKIP: Set GCP_BILLING_ACCOUNT to link billing."
fi

# ---- 3. Enable APIs ----
echo "[3/8] Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  compute.googleapis.com \
  vpcaccess.googleapis.com \
  healthcare.googleapis.com \
  aiplatform.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  billingbudgets.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  storage.googleapis.com \
  servicenetworking.googleapis.com

# ---- 4. Create Artifact Registry (container images) ----
echo "[4/8] Creating Artifact Registry..."
gcloud artifacts repositories create holilabs \
  --repository-format=docker \
  --location="$REGION" \
  --description="Holi Labs container images" \
  2>/dev/null || echo "  (already exists)"

# ---- 5. Create VPC + Serverless VPC connector ----
echo "[5/8] Setting up VPC..."
gcloud compute networks create holilabs-vpc \
  --subnet-mode=custom \
  2>/dev/null || echo "  (VPC already exists)"

gcloud compute networks subnets create holilabs-subnet \
  --network=holilabs-vpc \
  --range=10.0.0.0/24 \
  --region="$REGION" \
  2>/dev/null || echo "  (subnet already exists)"

gcloud compute networks vpc-access connectors create holilabs-connector \
  --region="$REGION" \
  --network=holilabs-vpc \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=3 \
  2>/dev/null || echo "  (connector already exists)"

# ---- 6. Service accounts (least-privilege) ----
echo "[6/8] Creating service accounts..."

create_sa() {
  local name="$1" desc="$2"
  gcloud iam service-accounts create "$name" \
    --display-name="$desc" \
    2>/dev/null || echo "  SA $name already exists"
}

create_sa "cloudrun-web" "Cloud Run — Web App"
create_sa "cloudsql-proxy" "Cloud SQL Proxy"
create_sa "github-deploy" "GitHub Actions Deployer"

WEB_SA="cloudrun-web@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOY_SA="github-deploy@${PROJECT_ID}.iam.gserviceaccount.com"

declare -a WEB_ROLES=(
  "roles/cloudsql.client"
  "roles/secretmanager.secretAccessor"
  "roles/storage.objectUser"
  "roles/aiplatform.user"
  "roles/healthcare.fhirResourceReader"
  "roles/healthcare.fhirResourceEditor"
  "roles/logging.logWriter"
  "roles/monitoring.metricWriter"
)

for role in "${WEB_ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$WEB_SA" \
    --role="$role" \
    --condition=None \
    --quiet 2>/dev/null || true
done

declare -a DEPLOY_ROLES=(
  "roles/run.admin"
  "roles/artifactregistry.writer"
  "roles/iam.serviceAccountUser"
  "roles/cloudsql.admin"
  "roles/secretmanager.admin"
  "roles/storage.admin"
)

for role in "${DEPLOY_ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$DEPLOY_SA" \
    --role="$role" \
    --condition=None \
    --quiet 2>/dev/null || true
done

# ---- 7. Budget alert ($500/mo warning, $1500/mo cap) ----
echo "[7/8] Budget alerts must be configured in the console:"
echo "  https://console.cloud.google.com/billing/budgets?project=$PROJECT_ID"
echo "  Recommended:"
echo "    - Alert at 50% ($750)"
echo "    - Alert at 80% ($1,200)"
echo "    - Alert at 100% ($1,500)"

# ---- 8. Summary ----
echo ""
echo "[8/8] === Bootstrap Complete ==="
echo ""
echo "Next steps:"
echo "  1. Set up Workload Identity Federation for GitHub Actions:"
echo "     gcloud iam workload-identity-pools create github-pool \\"
echo "       --location=global --display-name='GitHub Actions'"
echo ""
echo "  2. Create Cloud SQL instance:"
echo "     ./infra/gcp/setup-cloudsql.sh"
echo ""
echo "  3. Populate secrets:"
echo "     ./infra/gcp/setup-secrets.sh"
echo ""
echo "  4. Deploy to Cloud Run:"
echo "     gcloud run deploy holilabs-web \\"
echo "       --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/holilabs/web:latest \\"
echo "       --region=${REGION} \\"
echo "       --service-account=${WEB_SA}"
echo ""
