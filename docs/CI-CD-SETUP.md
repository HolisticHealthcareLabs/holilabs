# CI/CD Pipeline Setup Guide
## Holi Labs Healthcare Platform

Complete guide for setting up automated deployments using GitHub Actions.

---

## Overview

The Holi Labs platform uses GitHub Actions for continuous integration and deployment with three primary workflows:

1. **CI Pipeline** (`ci.yml`, `ci-cd.yml`) - Automated testing and validation
2. **Digital Ocean App Platform** (`deploy-production.yml`) - Managed PaaS deployment
3. **VPS Deployment** (`deploy-vps.yml`) - Traditional server deployment via SSH

---

## Available Workflows

### 1. CI/CD Pipeline (`ci-cd.yml`)

**Triggers:**
- Push to `main`, `develop`, or `staging` branches
- Pull requests to `main` or `develop`

**Jobs:**
- ✅ Lint and type checking
- ✅ Unit and integration tests with PostgreSQL
- ✅ Build application
- ✅ Security scanning (Trivy, npm audit)
- 🚀 Auto-deploy to staging (on `develop` push)
- 🚀 Auto-deploy to production (on `main` push)

### 2. Production Deployment (`deploy-production.yml`)

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch (requires typing "deploy" to confirm)

**Jobs:**
- ✅ Pre-flight checks (lint, type check, secret scanning)
- ✅ Full test suite
- ✅ Database migration validation
- 🚀 Deploy to Digital Ocean App Platform
- 📊 Post-deployment smoke tests
- 🔔 Slack notifications
- 🔄 Automatic rollback on failure

### 3. VPS Deployment (`deploy-vps.yml`)

**Triggers:**
- Manual workflow dispatch only (production safety)

**Jobs:**
- ✅ Pre-deployment validation
- ✅ Full test suite
- 🚀 Deploy via SSH to VPS using docker-compose
- 💾 Automatic database backup before deployment
- 🧪 Health monitoring (5 minutes)
- 🔄 Automatic rollback on failure

---

## Initial Setup

### 1. GitHub Repository Settings

Navigate to your repository: **Settings → Secrets and variables → Actions**

### 2. Required Secrets - Digital Ocean App Platform

```
DIGITALOCEAN_ACCESS_TOKEN
  Description: Digital Ocean API token
  How to get: https://cloud.digitalocean.com/account/api/tokens
  Required for: deploy-production.yml, ci-cd.yml

PRODUCTION_APP_ID
  Description: Digital Ocean App Platform app ID
  How to get: doctl apps list
  Required for: deploy-production.yml

STAGING_APP_ID
  Description: Digital Ocean staging app ID
  How to get: doctl apps list
  Required for: ci-cd.yml

REGISTRY_NAME
  Description: Digital Ocean Container Registry name
  How to get: Your registry name (e.g., holi-labs)
  Required for: deploy-production.yml

DATABASE_URL
  Description: Production database connection string
  Format: postgresql://user:pass@host:5432/dbname
  Required for: ci-cd.yml (build step)

PRODUCTION_DATABASE_URL
  Description: Production database URL for migrations
  Format: postgresql://user:pass@host:5432/dbname
  Required for: deploy-production.yml
```

### 3. Required Secrets - VPS Deployment

```
VPS_HOST
  Description: IP address or hostname of your VPS
  Example: 167.172.123.45 or vps.holilabs.com
  Required for: deploy-vps.yml

VPS_USERNAME
  Description: SSH username
  Example: ubuntu, root, deploy
  Required for: deploy-vps.yml

VPS_SSH_KEY
  Description: Private SSH key for authentication
  How to generate:
    ssh-keygen -t ed25519 -C "github-actions-deploy"
    # Copy contents of generated private key
    cat ~/.ssh/id_ed25519
  Required for: deploy-vps.yml
  ⚠️ Add public key to VPS ~/.ssh/authorized_keys

VPS_ENV_FILE
  Description: Complete .env.production file contents
  Format: Copy entire .env.production file
  Required for: deploy-vps.yml
  Example:
    POSTGRES_USER=holi
    POSTGRES_PASSWORD=secure_password
    POSTGRES_DB=holi_protocol
    REDIS_PASSWORD=redis_password
    NEXTAUTH_URL=https://holilabs.com
    NEXTAUTH_SECRET=your_secret
    # ... all other env vars
```

### 4. Optional Secrets - Enhanced Features

```
SLACK_WEBHOOK_URL
  Description: Slack webhook for deployment notifications
  How to get: https://api.slack.com/messaging/webhooks
  Required for: deploy-production.yml (notifications)

CODECOV_TOKEN
  Description: Codecov token for coverage reports
  How to get: https://codecov.io
  Required for: ci-cd.yml (coverage upload)

SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
  Description: Sentry integration for error tracking
  How to get: https://sentry.io/settings/account/api/auth-tokens/
  Required for: ci-cd.yml (release tracking)

SNYK_TOKEN
  Description: Snyk security scanning token
  How to get: https://app.snyk.io/account
  Required for: Security scanning jobs
```

---

## Setup Instructions

### Digital Ocean App Platform Setup

#### Step 1: Create Container Registry

```bash
# Install doctl CLI
brew install doctl  # macOS
# or
snap install doctl  # Linux

# Authenticate
doctl auth init

# Create registry
doctl registry create holi-labs --subscription-tier basic
```

#### Step 2: Configure App Platform

```bash
# Create app from configuration
doctl apps create --spec .do/app.yaml

# Get app ID (save this as PRODUCTION_APP_ID secret)
doctl apps list

# Update GitHub repository URL in .do/app.yaml
# Edit line 24: repo: YOUR_GITHUB_USERNAME/holilabsv2
```

#### Step 3: Configure Database

Digital Ocean App Platform will automatically:
- Create managed PostgreSQL database
- Set DATABASE_URL environment variable
- Handle SSL connections
- Configure automatic backups

#### Step 4: Add Secrets to App Platform

```bash
# Set secrets via doctl
doctl apps update <APP_ID> --env NEXTAUTH_SECRET=<value>
doctl apps update <APP_ID> --env ANTHROPIC_API_KEY=<value>

# Or use the Digital Ocean web dashboard:
# Apps → Your App → Settings → Environment Variables
```

### VPS Deployment Setup

#### Step 1: Prepare VPS

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Run initial setup
sudo apt-get update
sudo apt-get upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Configure firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

#### Step 2: Generate SSH Key for GitHub Actions

On your **local machine**:

```bash
# Generate deployment key
ssh-keygen -t ed25519 -f ~/.ssh/github-actions-deploy -C "github-actions"

# Display private key (add to VPS_SSH_KEY secret)
cat ~/.ssh/github-actions-deploy

# Display public key
cat ~/.ssh/github-actions-deploy.pub
```

On your **VPS**:

```bash
# Add public key to authorized_keys
echo "ssh-ed25519 AAAA... github-actions" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

#### Step 3: Prepare Environment File

Create `.env.production` with all required variables:

```bash
# Copy template
cp .env.example .env.production

# Edit with production values
nano .env.production

# Copy entire contents to VPS_ENV_FILE GitHub secret
cat .env.production
```

#### Step 4: Generate SSL Certificates

```bash
# SSH into VPS
ssh user@your-vps-ip

# Install Certbot
sudo apt-get install -y certbot

# Generate certificates
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos

# Certificates saved to:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

---

## Using the Workflows

### Automatic Deployments

#### Development Workflow

```bash
# Work on feature branch
git checkout -b feature/new-feature
git commit -m "Add new feature"
git push origin feature/new-feature

# Create pull request
# → CI pipeline runs automatically (lint, test, build)

# Merge to develop
# → Deploys to staging automatically
```

#### Production Workflow

```bash
# Merge develop to main
git checkout main
git merge develop
git push origin main

# → Automatically triggers:
#   1. Full CI pipeline
#   2. Security scans
#   3. Production deployment to Digital Ocean
#   4. Smoke tests
#   5. Slack notification
```

### Manual VPS Deployment

#### Via GitHub Web Interface

1. Go to **Actions** tab in GitHub
2. Select **Deploy to VPS** workflow
3. Click **Run workflow**
4. Select environment: `staging` or `production`
5. Type `deploy` to confirm
6. Click **Run workflow**

#### Via GitHub CLI

```bash
# Install gh CLI
brew install gh  # macOS
# or
apt install gh  # Linux

# Authenticate
gh auth login

# Trigger deployment
gh workflow run deploy-vps.yml \
  -f environment=production \
  -f confirm=deploy
```

#### Monitor Deployment

```bash
# Watch workflow run
gh run watch

# View logs
gh run view <run-id> --log
```

---

## Monitoring and Troubleshooting

### View Workflow Status

```bash
# List recent runs
gh run list --workflow=deploy-vps.yml

# View specific run
gh run view <run-id>

# Download logs
gh run download <run-id>
```

### Common Issues

#### Issue: SSH Connection Failed

**Error:** `Permission denied (publickey)`

**Solution:**
```bash
# Verify SSH key is correct
ssh -i ~/.ssh/github-actions-deploy user@vps-ip

# Check authorized_keys on VPS
cat ~/.ssh/authorized_keys

# Ensure proper permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

#### Issue: Docker Compose Fails

**Error:** `docker compose: command not found`

**Solution:**
```bash
# Update Docker to latest version (includes Compose V2)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify
docker compose version
```

#### Issue: Health Check Fails

**Error:** `Health check failed after deployment`

**Solution:**
```bash
# SSH into VPS
ssh user@vps-ip

# Check service logs
cd /opt/holilabs
docker compose -f docker-compose.prod.yml logs web

# Check service status
docker compose -f docker-compose.prod.yml ps

# Manually test health endpoint
curl http://localhost:3000/api/health
```

#### Issue: Database Migration Fails

**Error:** `Migration failed during deployment`

**Solution:**
```bash
# SSH into VPS
ssh user@vps-ip
cd /opt/holilabs

# Check migration status
docker compose -f docker-compose.prod.yml exec web pnpm prisma migrate status

# Manually run migrations
docker compose -f docker-compose.prod.yml exec web pnpm prisma migrate deploy

# If corrupted, reset migrations
docker compose -f docker-compose.prod.yml exec web pnpm prisma migrate resolve

# Restore from backup if needed
docker compose -f docker-compose.prod.yml exec postgres /app/scripts/restore-database.sh <backup-file>
```

---

## Rollback Procedures

### Automatic Rollback

Both production workflows include automatic rollback on failure:
- Database is automatically restored from latest backup
- Services are restarted
- Health checks verify rollback success

### Manual Rollback - Digital Ocean

```bash
# Rollback to previous deployment
doctl apps update <APP_ID> --image registry.digitalocean.com/holi-labs:previous

# Or rollback via web dashboard:
# Apps → Your App → Activity → Select previous deployment → Rollback
```

### Manual Rollback - VPS

```bash
# SSH into VPS
ssh user@vps-ip
cd /opt/holilabs

# List available backups
ls -lh backups/

# Restore from backup
docker compose -f docker-compose.prod.yml exec postgres \
  /app/scripts/restore-database.sh holi_backup_TIMESTAMP.sql.gz

# Checkout previous commit
git log --oneline  # Find commit hash
git checkout <previous-commit-hash>

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Verify
curl http://localhost:3000/api/health
```

---

## Security Best Practices

### Secrets Management

- ✅ Never commit secrets to repository
- ✅ Use GitHub Secrets for all sensitive data
- ✅ Rotate secrets quarterly
- ✅ Use different secrets for staging and production
- ✅ Limit secret access to specific workflows

### SSH Keys

- ✅ Use ed25519 keys (more secure than RSA)
- ✅ Use separate keys for different purposes
- ✅ Set passphrase on local keys
- ✅ Rotate keys annually
- ✅ Remove unused keys from authorized_keys

### Database Security

- ✅ Use strong passwords (32+ characters)
- ✅ Restrict database access to application only
- ✅ Enable SSL for database connections
- ✅ Automated encrypted backups
- ✅ Test restore procedures regularly

### HIPAA Compliance

- ✅ All traffic encrypted (HTTPS/TLS 1.2+)
- ✅ Audit logs enabled
- ✅ Automated backups (30-day retention)
- ✅ Access controls and authentication
- ✅ Regular security scanning
- ✅ Incident response procedures documented

---

## Performance Optimization

### Caching Strategy

The workflows use caching to speed up builds:

```yaml
# pnpm cache
- uses: actions/setup-node@v4
  with:
    cache: 'pnpm'

# Docker layer cache
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Parallel Jobs

Jobs run in parallel when possible:
- Lint, test, and build run concurrently
- Security scans run independently
- Deployment waits for all validation

### Deployment Speed

Typical deployment times:
- CI Pipeline: 5-10 minutes
- Digital Ocean deployment: 10-15 minutes
- VPS deployment: 15-20 minutes

---

## Monitoring and Alerts

### GitHub Actions Notifications

Enable notifications in GitHub:
**Settings → Notifications → Actions**

Options:
- ✅ Only failures
- ✅ All workflow runs
- ✅ Email notifications
- ✅ Web notifications

### Slack Integration

Add Slack webhook for team notifications:

```bash
# Get webhook URL from Slack
# Workspace Settings → Apps → Incoming Webhooks

# Add to GitHub Secrets
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Sentry Error Tracking

Configure Sentry for production monitoring:

```bash
# Install Sentry SDK
pnpm add @sentry/nextjs

# Configure in next.config.js
# Add SENTRY_* secrets to GitHub
```

---

## Advanced Configuration

### Custom Deployment Scripts

Add custom pre/post deployment scripts:

```yaml
# .github/workflows/deploy-vps.yml
- name: Custom pre-deployment
  run: |
    ssh user@host << 'EOF'
      # Your custom script
      echo "Running custom checks..."
    EOF
```

### Multi-Region Deployment

Deploy to multiple regions:

```yaml
strategy:
  matrix:
    region: [us-east, us-west, eu-central]
steps:
  - name: Deploy to ${{ matrix.region }}
    # ... deployment steps
```

### Canary Deployments

Gradual rollout strategy:

```yaml
- name: Deploy to 10% of servers
  # Deploy to subset

- name: Monitor for 10 minutes
  # Check metrics

- name: Deploy to 100%
  if: success()
  # Full rollout
```

---

## Support and Resources

### Documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Digital Ocean App Platform](https://docs.digitalocean.com/products/app-platform/)
- [Docker Compose](https://docs.docker.com/compose/)

### Getting Help
- Open an issue in the repository
- Check deployment logs in GitHub Actions
- Review VPS logs via SSH
- Contact DevOps team

### Useful Commands

```bash
# Test workflow locally (using act)
act -j deploy

# Validate workflow syntax
gh workflow view deploy-vps.yml

# Cancel running workflow
gh run cancel <run-id>

# Re-run failed jobs
gh run rerun <run-id>
```

---

## Changelog

Track deployment changes in `CHANGELOG.md`:

```markdown
## [1.2.0] - 2025-11-19

### Added
- VPS deployment workflow with automatic rollback
- Enhanced health monitoring (5-minute post-deployment)
- Database backup before every deployment

### Changed
- Increased deployment timeout to 30 minutes
- Improved error messages in rollback procedures

### Fixed
- SSH connection issues in workflow
- Docker Compose V2 compatibility
```

---

## Compliance and Audit

### Audit Trail

All deployments are tracked:
- ✅ Git commit SHA
- ✅ Deployer (GitHub username)
- ✅ Timestamp
- ✅ Environment (staging/production)
- ✅ Deployment status
- ✅ Full logs retained for 90 days

### Compliance Reports

Generate deployment reports:

```bash
# List all production deployments
gh run list --workflow=deploy-production.yml --limit 50

# Export deployment history
gh run list --workflow=deploy-production.yml --json | jq '.[] | {date, conclusion, headSha}' > deployments.json
```

---

## Conclusion

Your CI/CD pipeline is now configured for:
- ✅ Automated testing and validation
- ✅ Secure deployments to Digital Ocean App Platform
- ✅ Traditional VPS deployments via docker-compose
- ✅ Automatic rollback on failures
- ✅ Post-deployment health monitoring
- ✅ HIPAA-compliant security practices

For questions or issues, refer to the troubleshooting section or open a GitHub issue.
