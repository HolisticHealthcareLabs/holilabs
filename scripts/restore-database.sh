#!/bin/bash
# ============================================================================
# PostgreSQL Database Restore Script
# Holi Labs Healthcare Platform
# ============================================================================

set -e

# Configuration
BACKUP_DIR="/app/backups"

# Database credentials from environment
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-holi_protocol}"
DB_USER="${POSTGRES_USER:-holi}"

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file>"
  echo ""
  echo "Available backups:"
  ls -lh "${BACKUP_DIR}"/holi_backup_*.sql.gz 2>/dev/null || echo "No backups found"
  exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
  echo "Error: Backup file not found: ${BACKUP_DIR}/${BACKUP_FILE}"
  exit 1
fi

echo "============================================================================"
echo "WARNING: This will replace all data in the database: ${DB_NAME}"
echo "============================================================================"
echo ""
echo "Backup file: ${BACKUP_FILE}"
echo "Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo ""
echo "Starting database restore..."

# Decompress if needed
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  echo "Decompressing backup..."
  gunzip -c "${BACKUP_DIR}/${BACKUP_FILE}" > "${BACKUP_DIR}/temp_restore.sql"
  RESTORE_FILE="${BACKUP_DIR}/temp_restore.sql"
else
  RESTORE_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
fi

# Drop existing connections
echo "Dropping existing connections..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();"

# Restore database
echo "Restoring database..."
PGPASSWORD="${POSTGRES_PASSWORD}" pg_restore \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -c \
  -v \
  "${RESTORE_FILE}"

# Clean up temporary file
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  rm -f "${BACKUP_DIR}/temp_restore.sql"
fi

echo ""
echo "Database restore completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run database migrations: pnpm prisma migrate deploy"
echo "2. Restart the application: docker compose restart web"
