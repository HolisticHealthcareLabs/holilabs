# DigitalOcean Decommission Runbook

**When:** 30 days after the last GCP phase cutover (Phase 4).
**Who:** ARCHIE (CTO) + CYRUS (CISO) sign-off required.

---

## Pre-conditions (all must be true)

- [ ] Cloud Run production has been stable for 30+ days
- [ ] Cloud SQL has been the primary database for 30+ days
- [ ] All API routes respond correctly on GCP
- [ ] Audit logs confirm zero traffic to DigitalOcean endpoints
- [ ] DNS (holilabs.com) points to Cloud Run, not DO App Platform
- [ ] Final database backup exported from DO and imported to Cloud SQL
- [ ] All secrets migrated to GCP Secret Manager
- [ ] No active Sentry errors referencing DO infrastructure
- [ ] RUTH (CLO) confirms no legal obligation to retain DO data beyond backups

---

## Step 1: Verify zero traffic (Week 1 of decommission window)

```bash
# Check DO App Platform logs for any remaining traffic
doctl apps logs $PRODUCTION_APP_ID --type=run --follow

# Verify DNS is fully propagated
dig holilabs.com +short
# Should return Cloud Run IP, NOT DO App Platform IP
```

---

## Step 2: Export final backups (Week 2)

```bash
# Database backup
doctl databases backup create $PRODUCTION_DB_ID
doctl databases backup download $PRODUCTION_DB_ID $BACKUP_ID --output ./backups/do-final-backup.sql

# Upload to GCS for archival
gsutil cp ./backups/do-final-backup.sql gs://holilabs-backups/decommission/do-final-$(date +%Y%m%d).sql

# Container registry images (keep last 5 versions)
doctl registry repository list-tags holilabs/web --format Tag | head -5 > ./backups/do-image-tags.txt
```

---

## Step 3: Disable DigitalOcean services (Week 3)

```bash
# Scale App Platform to zero (stop billing, keep config)
doctl apps update $PRODUCTION_APP_ID --spec /dev/null || true

# Disable database (don't delete yet)
# DO does not support pausing — just note the date
echo "DO Database deactivation date: $(date)" >> ./backups/decommission-log.txt
```

---

## Step 4: Delete DigitalOcean resources (Week 4)

```bash
# DANGER ZONE — only after all verifications pass

# Delete App Platform app
doctl apps delete $PRODUCTION_APP_ID --force

# Delete staging app
doctl apps delete $STAGING_APP_ID --force

# Delete database (IRREVERSIBLE — ensure backup exists in GCS)
doctl databases delete $PRODUCTION_DB_ID --force

# Clean container registry
doctl registry garbage-collection start --include-untagged-manifests --force

# Delete the registry if empty
doctl registry delete --force
```

---

## Step 5: Clean up GitHub Secrets

Remove these GitHub Actions secrets (they are now unused):
- `DIGITALOCEAN_ACCESS_TOKEN`
- `PRODUCTION_APP_ID`
- `STAGING_APP_ID`
- `PRODUCTION_DB_ID`
- `REGISTRY_NAME`

Keep DO secrets for 90 days in a password manager as emergency fallback.

---

## Step 6: Archive and disable workflows

Rename or delete:
- `.github/workflows/deploy-production.yml` (DigitalOcean version)
- `.github/workflows/deploy-staging.yml` (DigitalOcean version)
- `.github/workflows/deploy-vps.yml`
- `.github/workflows/database-backup.yml` (DO-specific)

The GCP workflows (`deploy-gcp-staging.yml`, `deploy-gcp-production.yml`) are now primary.

---

## Step 7: Update documentation

- [ ] Update `docs/HANDOFF_PROMPT.md` — remove DO references, add GCP
- [ ] Update `LOCAL_DEVELOPMENT_SETUP.md` — update environment variables
- [ ] Update `.do/app.yaml` — archive or delete
- [ ] Update `docker-compose.prod.yml` — update for GCP if needed
- [ ] Update `infra/deploy/DEPLOYMENT_RUNBOOK.md` — GCP-focused

---

## Rollback procedure

If GCP fails catastrophically during the 30-day window:

1. Re-enable DO App Platform from the archived spec
2. Restore database from the final backup
3. Update DNS to point back to DO
4. Estimated recovery time: 2-4 hours

After decommission (resources deleted): Recovery is NOT possible.
You would need to set up DO from scratch using the archived backup in GCS.

---

## Cost impact

| Item | Monthly cost removed |
|------|---------------------|
| DO App Platform | ~$25-50 |
| DO Managed PostgreSQL | ~$50-100 |
| DO Container Registry | ~$5 |
| DO Spaces (if used) | ~$5-10 |
| **Total** | **~$85-165/mo** |

This cost is now covered by GCP credits.
