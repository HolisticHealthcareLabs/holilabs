#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Holi Labs — Cloud SQL Setup (Phase 2)
#
# Creates a PostgreSQL 15 instance in southamerica-east1
# with private IP via VPC peering for LGPD data residency.
# =============================================================================

PROJECT_ID="${GCP_PROJECT_ID:-holilabs-prod}"
REGION="southamerica-east1"
INSTANCE_NAME="holilabs-db"
DB_NAME="holilabs_production"
DB_USER="holilabs_app"
TIER="db-custom-2-7680"  # 2 vCPU, 7.5 GB RAM (~$100/mo)

echo "=== Cloud SQL Setup ==="
echo "Instance: $INSTANCE_NAME"
echo "Region:   $REGION"
echo "Tier:     $TIER"
echo ""

# ---- 1. Allocate private IP range for VPC peering ----
echo "[1/5] Setting up private services access..."
gcloud compute addresses create google-managed-services-holilabs-vpc \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=holilabs-vpc \
  2>/dev/null || echo "  (IP range already exists)"

gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services-holilabs-vpc \
  --network=holilabs-vpc \
  2>/dev/null || echo "  (peering already exists)"

# ---- 2. Create Cloud SQL instance ----
echo "[2/5] Creating Cloud SQL instance (this takes 5-10 minutes)..."
gcloud sql instances create "$INSTANCE_NAME" \
  --database-version=POSTGRES_15 \
  --tier="$TIER" \
  --region="$REGION" \
  --network=holilabs-vpc \
  --no-assign-ip \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-point-in-time-recovery \
  --retained-backups-count=30 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4 \
  --database-flags=log_min_duration_statement=1000,log_connections=on,log_disconnections=on \
  --availability-type=REGIONAL \
  --root-password="$(openssl rand -base64 32)" \
  2>/dev/null || echo "  (instance already exists)"

# ---- 3. Create database ----
echo "[3/5] Creating database..."
gcloud sql databases create "$DB_NAME" \
  --instance="$INSTANCE_NAME" \
  2>/dev/null || echo "  (database already exists)"

# ---- 4. Create application user ----
echo "[4/5] Creating application user..."
APP_PASSWORD="$(openssl rand -base64 32)"

gcloud sql users create "$DB_USER" \
  --instance="$INSTANCE_NAME" \
  --password="$APP_PASSWORD" \
  2>/dev/null || echo "  (user already exists — password unchanged)"

# ---- 5. Store connection string in Secret Manager ----
echo "[5/5] Storing DATABASE_URL in Secret Manager..."

PRIVATE_IP=$(gcloud sql instances describe "$INSTANCE_NAME" \
  --format="get(ipAddresses[0].ipAddress)" 2>/dev/null || echo "PENDING")

CONNECTION_STRING="postgresql://${DB_USER}:${APP_PASSWORD}@${PRIVATE_IP}:5432/${DB_NAME}?sslmode=require"

printf "%s" "$CONNECTION_STRING" | gcloud secrets create DATABASE_URL \
  --data-file=- \
  --replication-policy=user-managed \
  --locations="$REGION" \
  2>/dev/null || {
    printf "%s" "$CONNECTION_STRING" | gcloud secrets versions add DATABASE_URL --data-file=-
    echo "  (secret updated with new version)"
  }

echo ""
echo "=== Cloud SQL Setup Complete ==="
echo ""
echo "Instance:   $INSTANCE_NAME"
echo "Database:   $DB_NAME"
echo "User:       $DB_USER"
echo "Private IP: $PRIVATE_IP"
echo ""
echo "Next: Run prisma migrate deploy via Cloud SQL Auth Proxy"
echo "  cloud-sql-proxy ${PROJECT_ID}:${REGION}:${INSTANCE_NAME} &"
echo "  DATABASE_URL='postgresql://${DB_USER}:***@127.0.0.1:5432/${DB_NAME}' pnpm prisma migrate deploy"
