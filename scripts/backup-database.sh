#!/bin/bash
# ============================================================================
# PostgreSQL Database Backup Script
# Holi Labs Healthcare Platform
# ============================================================================

set -e

# Configuration
BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="holi_backup_${TIMESTAMP}.sql"
RETENTION_DAYS=30

# Database credentials from environment
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-holi_protocol}"
DB_USER="${POSTGRES_USER:-holi}"

echo "Starting database backup..."
echo "Timestamp: ${TIMESTAMP}"
echo "Database: ${DB_NAME}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Perform backup
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -F c \
  -b \
  -v \
  -f "${BACKUP_DIR}/${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_DIR}/${BACKUP_FILE}"

echo "Backup completed: ${BACKUP_FILE}.gz"

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.gz" | cut -f1)
echo "Backup size: ${BACKUP_SIZE}"

# Remove old backups (older than RETENTION_DAYS)
echo "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "holi_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

# Count remaining backups
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "holi_backup_*.sql.gz" -type f | wc -l)
echo "Total backups retained: ${BACKUP_COUNT}"

echo "Backup process completed successfully!"
