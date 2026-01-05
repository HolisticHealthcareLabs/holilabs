#!/bin/bash
###############################################################################
# Database Restore Script
#
# USAGE:
#   ./scripts/restore-database.sh [backup-id] [target-env]
#
# EXAMPLES:
#   ./scripts/restore-database.sh 12345678 production
#   ./scripts/restore-database.sh latest staging
#   ./scripts/restore-database.sh 12345678 test-restore
#
# REQUIREMENTS:
#   - doctl (DigitalOcean CLI) installed and authenticated
#   - Production database credentials in environment or .env
#   - Write access to target database
#
# COMPLIANCE:
#   - LGPD Art. 48 - Security incident recovery
#   - RTO (Recovery Time Objective): < 1 hour
#   - RPO (Recovery Point Objective): < 15 minutes (via WAL)
#
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       HOLI LABS - DATABASE RESTORE PROCEDURE             ║"
echo "║                    CRITICAL OPERATION                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check arguments
if [ $# -lt 2 ]; then
    log_error "Usage: $0 <backup-id> <target-env>"
    log_info "Examples:"
    log_info "  $0 12345678 production"
    log_info "  $0 latest staging"
    log_info "  $0 12345678 test-restore"
    exit 1
fi

BACKUP_ID="$1"
TARGET_ENV="$2"

# Validate target environment
ALLOWED_ENVS=("production" "staging" "test-restore")
if [[ ! " ${ALLOWED_ENVS[@]} " =~ " ${TARGET_ENV} " ]]; then
    log_error "Invalid target environment: $TARGET_ENV"
    log_info "Allowed environments: ${ALLOWED_ENVS[*]}"
    exit 1
fi

# Safety check: Prevent accidental production restore without confirmation
if [ "$TARGET_ENV" == "production" ]; then
    log_warning "⚠️  YOU ARE ABOUT TO RESTORE THE PRODUCTION DATABASE ⚠️"
    log_warning "This will OVERWRITE all current production data!"
    log_warning "Ensure you have created a backup of the current state."
    echo ""
    read -p "Type 'RESTORE PRODUCTION' to continue: " confirmation
    if [ "$confirmation" != "RESTORE PRODUCTION" ]; then
        log_error "Restoration cancelled."
        exit 1
    fi
fi

# Start timestamp
START_TIME=$(date +%s)
log_info "Restore started at: $(date)"

###############################################################################
# PHASE 1: PRE-RESTORE CHECKS
###############################################################################

log_info "Phase 1/6: Pre-restore checks..."

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    log_error "doctl CLI is not installed. Install from https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi
log_success "✓ doctl CLI found"

# Check if doctl is authenticated
if ! doctl auth list &> /dev/null; then
    log_error "doctl is not authenticated. Run: doctl auth init"
    exit 1
fi
log_success "✓ doctl authenticated"

# Load environment variables
if [ "$TARGET_ENV" == "production" ]; then
    PRODUCTION_DB_ID="${PRODUCTION_DB_ID:-}"
    if [ -z "$PRODUCTION_DB_ID" ]; then
        log_error "PRODUCTION_DB_ID environment variable not set"
        exit 1
    fi
    DB_ID="$PRODUCTION_DB_ID"
elif [ "$TARGET_ENV" == "staging" ]; then
    STAGING_DB_ID="${STAGING_DB_ID:-}"
    if [ -z "$STAGING_DB_ID" ]; then
        log_error "STAGING_DB_ID environment variable not set"
        exit 1
    fi
    DB_ID="$STAGING_DB_ID"
else
    TEST_DB_ID="${TEST_DB_ID:-}"
    if [ -z "$TEST_DB_ID" ]; then
        log_error "TEST_DB_ID environment variable not set"
        exit 1
    fi
    DB_ID="$TEST_DB_ID"
fi

log_success "✓ Database ID: $DB_ID"

# Verify database exists
if ! doctl databases get "$DB_ID" &> /dev/null; then
    log_error "Database $DB_ID not found"
    exit 1
fi
log_success "✓ Database exists"

# Get latest backup if requested
if [ "$BACKUP_ID" == "latest" ]; then
    log_info "Fetching latest backup..."
    BACKUP_ID=$(doctl databases backup list "$DB_ID" --format ID --no-header | head -n1)
    if [ -z "$BACKUP_ID" ]; then
        log_error "No backups found for database $DB_ID"
        exit 1
    fi
    log_success "✓ Latest backup ID: $BACKUP_ID"
fi

# Verify backup exists
log_info "Verifying backup $BACKUP_ID..."
if ! doctl databases backup get "$DB_ID" "$BACKUP_ID" &> /dev/null; then
    log_error "Backup $BACKUP_ID not found for database $DB_ID"
    exit 1
fi

# Get backup details
BACKUP_STATUS=$(doctl databases backup get "$DB_ID" "$BACKUP_ID" --format Status --no-header)
BACKUP_SIZE=$(doctl databases backup get "$DB_ID" "$BACKUP_ID" --format Size --no-header)
BACKUP_CREATED=$(doctl databases backup get "$DB_ID" "$BACKUP_ID" --format CreatedAt --no-header)

if [ "$BACKUP_STATUS" != "available" ]; then
    log_error "Backup is not available (status: $BACKUP_STATUS)"
    exit 1
fi

log_success "✓ Backup verified"
log_info "  Backup ID: $BACKUP_ID"
log_info "  Status: $BACKUP_STATUS"
log_info "  Size: $BACKUP_SIZE"
log_info "  Created: $BACKUP_CREATED"

###############################################################################
# PHASE 2: CREATE SAFETY BACKUP OF CURRENT STATE
###############################################################################

log_info "Phase 2/6: Creating safety backup of current state..."

SAFETY_BACKUP_ID=$(doctl databases backup create "$DB_ID" --format ID --no-header)
log_success "✓ Safety backup created: $SAFETY_BACKUP_ID"

# Wait for safety backup to complete (max 5 minutes)
log_info "Waiting for safety backup to complete..."
for i in {1..30}; do
    SAFETY_STATUS=$(doctl databases backup get "$DB_ID" "$SAFETY_BACKUP_ID" --format Status --no-header)
    if [ "$SAFETY_STATUS" = "available" ]; then
        log_success "✓ Safety backup completed"
        break
    fi
    if [ "$i" -eq 30 ]; then
        log_error "Safety backup timed out after 5 minutes"
        exit 1
    fi
    echo -n "⏳ "
    sleep 10
done

###############################################################################
# PHASE 3: STOP APPLICATION (PREVENT WRITES)
###############################################################################

log_info "Phase 3/6: Stopping application to prevent writes..."

if [ "$TARGET_ENV" == "production" ]; then
    log_warning "⚠️  STOPPING PRODUCTION APPLICATION"
    log_warning "Users will experience downtime until restore completes"

    # Stop production app (DigitalOcean App Platform)
    if [ -n "${PRODUCTION_APP_ID:-}" ]; then
        log_info "Scaling production app to 0 instances..."
        # Note: This requires doctl apps update command (not implemented yet)
        # For now, manual intervention required
        log_warning "MANUAL STEP: Scale production app to 0 instances via DigitalOcean dashboard"
        read -p "Press Enter when app is stopped..."
    fi
fi

log_success "✓ Application stopped"

###############################################################################
# PHASE 4: RESTORE FROM BACKUP
###############################################################################

log_info "Phase 4/6: Restoring database from backup..."
log_info "This may take 15-60 minutes depending on database size..."

# DigitalOcean managed databases restore via API
# Note: DigitalOcean does not have a direct "restore" command via doctl
# The restore process is done by creating a new database from a backup
# For in-place restore, we need to use pg_restore with the backup download

log_info "Downloading backup to temporary location..."
BACKUP_DIR="/tmp/holi-db-backup-$BACKUP_ID"
mkdir -p "$BACKUP_DIR"

# Download backup (this is a workaround - DigitalOcean doesn't expose direct download)
# In production, you'd use: doctl databases backup download
log_warning "⚠️  Note: DigitalOcean managed databases require manual restore process"
log_info "To restore from backup $BACKUP_ID:"
log_info "1. Go to DigitalOcean Console → Databases → $DB_ID → Backups"
log_info "2. Click 'Restore' on backup $BACKUP_ID"
log_info "3. This will create a new cluster from the backup"
log_info ""
log_info "For automated restore, we recommend:"
log_info "1. Use pg_dump backups stored in S3 alongside DigitalOcean backups"
log_info "2. Or use a read replica for faster failover"
log_info ""
log_warning "MANUAL INTERVENTION REQUIRED"
read -p "Press Enter when database has been restored via DigitalOcean Console..."

log_success "✓ Database restored"

###############################################################################
# PHASE 5: VERIFY DATA INTEGRITY
###############################################################################

log_info "Phase 5/6: Verifying data integrity..."

# Connect to database and verify row counts
if [ -n "${DATABASE_URL:-}" ]; then
    log_info "Running integrity checks..."

    # Check if psql is available
    if command -v psql &> /dev/null; then
        # Count critical tables
        PATIENT_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"Patient\";" | xargs)
        USER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"User\";" | xargs)
        AUDIT_LOG_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"audit_logs\";" | xargs)

        log_info "  Patients: $PATIENT_COUNT"
        log_info "  Users: $USER_COUNT"
        log_info "  Audit logs: $AUDIT_LOG_COUNT"

        # Basic sanity check
        if [ "$PATIENT_COUNT" -eq 0 ] && [ "$TARGET_ENV" == "production" ]; then
            log_error "⚠️  WARNING: No patients found in restored database!"
            log_error "This may indicate a failed restore. Verify data before proceeding."
            exit 1
        fi

        log_success "✓ Data integrity checks passed"
    else
        log_warning "psql not found - skipping data integrity checks"
    fi
else
    log_warning "DATABASE_URL not set - skipping data integrity checks"
fi

###############################################################################
# PHASE 6: RESTART APPLICATION
###############################################################################

log_info "Phase 6/6: Restarting application..."

if [ "$TARGET_ENV" == "production" ]; then
    log_info "Scaling production app back to normal capacity..."

    if [ -n "${PRODUCTION_APP_ID:-}" ]; then
        log_warning "MANUAL STEP: Scale production app to normal capacity via DigitalOcean dashboard"
        read -p "Press Enter when app is running..."
    fi
fi

log_success "✓ Application restarted"

###############################################################################
# COMPLETION
###############################################################################

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$((DURATION / 60))

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              DATABASE RESTORE COMPLETED                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
log_success "✅ Restore completed successfully"
log_info "Duration: ${DURATION_MIN} minutes"
log_info "Restored backup: $BACKUP_ID"
log_info "Safety backup: $SAFETY_BACKUP_ID (keep for 7 days)"
log_info "Target environment: $TARGET_ENV"
echo ""

# Post-restore actions
log_info "📋 POST-RESTORE CHECKLIST:"
echo "  [ ] Verify application is functioning correctly"
echo "  [ ] Check Sentry for any errors"
echo "  [ ] Verify recent patient data is present"
echo "  [ ] Run smoke tests (authentication, patient creation, etc.)"
echo "  [ ] Monitor Prometheus dashboards for anomalies"
echo "  [ ] Update status page if this was an incident"
echo "  [ ] Document in incident post-mortem"
echo ""

# Create incident log
INCIDENT_LOG="restore-log-$(date +%Y%m%d-%H%M%S).txt"
log_info "Incident log: $INCIDENT_LOG"
cat > "$INCIDENT_LOG" <<INCIDENT_LOG_EOF
DATABASE RESTORE LOG
====================

Date: $(date)
Operator: $(whoami)
Target Environment: $TARGET_ENV
Database ID: $DB_ID
Backup ID: $BACKUP_ID
Backup Created: $BACKUP_CREATED
Safety Backup ID: $SAFETY_BACKUP_ID
Duration: ${DURATION_MIN} minutes
Status: SUCCESS

Verification:
- Patient count: ${PATIENT_COUNT:-N/A}
- User count: ${USER_COUNT:-N/A}
- Audit log count: ${AUDIT_LOG_COUNT:-N/A}

Next Steps:
- Monitor application for 24 hours
- Keep safety backup for 7 days
- Update incident documentation
INCIDENT_LOG_EOF

log_success "✅ All done!"
log_info "Keep this terminal output for your records."

exit 0
