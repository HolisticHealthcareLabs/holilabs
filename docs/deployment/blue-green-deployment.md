# Blue-Green Deployment Strategy

**Purpose:** Enable zero-downtime deployments with instant rollback capability for production releases.

**Benefits:**
- Zero-downtime deployments
- Instant rollback (< 30 seconds)
- Pre-production validation in production-like environment
- Reduced deployment risk
- Simplified disaster recovery

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [DigitalOcean App Platform Setup](#digitalocean-app-platform-setup)
4. [GitHub Actions Workflow](#github-actions-workflow)
5. [Deployment Process](#deployment-process)
6. [Rollback Procedure](#rollback-procedure)
7. [Database Migrations](#database-migrations)
8. [Health Checks](#health-checks)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Blue-Green Deployment?

Blue-green deployment is a release strategy that reduces downtime and risk by running two identical production environments called "Blue" and "Green":

- **Blue:** Currently active environment serving production traffic
- **Green:** Idle environment receiving new deployment

**Deployment Flow:**
1. Deploy new version to idle (green) environment
2. Run health checks and smoke tests on green
3. Switch traffic from blue to green
4. Blue becomes the new idle environment (instant rollback target)

### Key Benefits

| Benefit | Description | Impact |
|---------|-------------|--------|
| **Zero Downtime** | No service interruption during deployment | 100% uptime during releases |
| **Instant Rollback** | Switch back to previous version in < 30 seconds | Reduced MTTR (Mean Time To Recovery) |
| **Pre-Validation** | Test in production environment before switching | Catch issues before affecting users |
| **Reduced Risk** | Previous version always available | Safe deployment process |
| **Simplified DR** | Automated failover mechanism | Improved disaster recovery |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer / CDN                      │
│              (Routes 100% traffic to active env)             │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────▼─────┐               ┌─────▼────┐
    │   BLUE   │               │  GREEN   │
    │ (Active) │               │  (Idle)  │
    └────┬─────┘               └─────┬────┘
         │                           │
         │    ┌──────────────┐       │
         └────► Database     ◄───────┘
              │ (Shared)     │
              └──────────────┘
```

### Deployment States

**State 1: Before Deployment**
- Blue: Active (v1.2.0) - 100% traffic
- Green: Idle (v1.1.0) - 0% traffic

**State 2: During Deployment**
- Blue: Active (v1.2.0) - 100% traffic
- Green: Deploying (v1.3.0) - 0% traffic

**State 3: After Health Checks Pass**
- Blue: Active (v1.2.0) - 100% traffic
- Green: Ready (v1.3.0) - 0% traffic (smoke tests running)

**State 4: After Traffic Switch**
- Blue: Idle (v1.2.0) - 0% traffic (rollback ready)
- Green: Active (v1.3.0) - 100% traffic

**State 5: After Next Deployment**
- Blue: Deploying (v1.4.0) - 0% traffic
- Green: Active (v1.3.0) - 100% traffic

---

## DigitalOcean App Platform Setup

DigitalOcean App Platform doesn't have native blue-green deployment, but we can implement it using **multiple apps** with **load balancer routing**.

### Option 1: Multiple Apps (Recommended)

Create two separate DigitalOcean Apps:
- `holi-production-blue`
- `holi-production-green`

**Advantages:**
- True isolation between environments
- Independent scaling
- Clear separation of concerns

**Disadvantages:**
- Costs 2x resources (both environments always running)
- Requires external load balancer or DNS switching

### Option 2: App Platform Components (Cost-Effective)

Use a single app with multiple components:
- `api-blue` component
- `api-green` component
- Load balancer routes to active component

**Advantages:**
- Lower cost (can scale down idle component)
- Single app management

**Disadvantages:**
- Shared resources
- More complex configuration

### Implementation: Multiple Apps Approach

#### Step 1: Create Blue Environment

```bash
# Create blue environment app
doctl apps create --spec .do/app-blue.yaml

# Get app ID
BLUE_APP_ID=$(doctl apps list --format ID,Spec.Name | grep "holi-production-blue" | awk '{print $1}')

echo "Blue App ID: $BLUE_APP_ID"
```

**File: `.do/app-blue.yaml`**

```yaml
name: holi-production-blue
region: nyc
services:
  - name: api
    github:
      repo: yourusername/holilabsv2
      branch: main
      deploy_on_push: false  # Manual deployment via GitHub Actions
    build_command: pnpm install && pnpm build
    run_command: pnpm start
    instance_count: 2
    instance_size_slug: professional-s  # 1 vCPU, 2 GB RAM
    http_port: 3000
    routes:
      - path: /
    health_check:
      http_path: /api/health
      initial_delay_seconds: 30
      period_seconds: 10
      timeout_seconds: 5
      success_threshold: 1
      failure_threshold: 3
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        type: SECRET
        value: ${DATABASE_URL}
      - key: DEPLOYMENT_ENV
        value: blue  # Identifier for blue environment
    alerts:
      - rule: DEPLOYMENT_FAILED
      - rule: DOMAIN_FAILED
databases:
  - name: holi-db
    engine: PG
    version: "15"
```

#### Step 2: Create Green Environment

```bash
# Create green environment app
doctl apps create --spec .do/app-green.yaml

# Get app ID
GREEN_APP_ID=$(doctl apps list --format ID,Spec.Name | grep "holi-production-green" | awk '{print $1}')

echo "Green App ID: $GREEN_APP_ID"
```

**File: `.do/app-green.yaml`**

Same as `app-blue.yaml` but with:
- `name: holi-production-green`
- `DEPLOYMENT_ENV: green`

#### Step 3: Set Up Load Balancer

```bash
# Create load balancer
doctl compute load-balancer create \
  --name holi-production-lb \
  --region nyc3 \
  --forwarding-rules "entry_protocol:https,entry_port:443,target_protocol:http,target_port:80,tls_passthrough:false" \
  --health-check "protocol:http,port:80,path:/api/health,check_interval_seconds:10,response_timeout_seconds:5,healthy_threshold:3,unhealthy_threshold:3" \
  --tag-name holi-production-blue  # Initially route to blue

# Get load balancer ID
LB_ID=$(doctl compute load-balancer list --format ID,Name | grep "holi-production-lb" | awk '{print $1}')

echo "Load Balancer ID: $LB_ID"
```

#### Step 4: Configure DNS

```bash
# Get load balancer IP
LB_IP=$(doctl compute load-balancer get $LB_ID --format IP --no-header)

# Update DNS A record to point to load balancer
doctl compute domain records create holilabs.xyz \
  --record-type A \
  --record-name api \
  --record-data $LB_IP \
  --record-ttl 300  # 5 minutes TTL for faster switching
```

---

## GitHub Actions Workflow

### Blue-Green Deployment Workflow

**File: `.github/workflows/deploy-blue-green.yml`**

```yaml
name: Blue-Green Deployment

on:
  workflow_dispatch:
    inputs:
      target_environment:
        description: 'Target environment to deploy to'
        required: true
        type: choice
        options:
          - auto  # Automatically choose idle environment
          - blue
          - green
      auto_switch:
        description: 'Automatically switch traffic after health checks pass'
        required: true
        type: boolean
        default: false
      skip_smoke_tests:
        description: 'Skip smoke tests (not recommended)'
        required: false
        type: boolean
        default: false

env:
  BLUE_APP_ID: ${{ secrets.DO_APP_BLUE_ID }}
  GREEN_APP_ID: ${{ secrets.DO_APP_GREEN_ID }}
  LB_ID: ${{ secrets.DO_LOAD_BALANCER_ID }}

jobs:
  determine-target:
    name: Determine Target Environment
    runs-on: ubuntu-latest
    outputs:
      target_env: ${{ steps.determine.outputs.target_env }}
      target_app_id: ${{ steps.determine.outputs.target_app_id }}
      active_env: ${{ steps.determine.outputs.active_env }}
    steps:
      - name: Determine Active Environment
        id: determine
        run: |
          # Get current load balancer target tag
          ACTIVE_TAG=$(doctl compute load-balancer get ${{ env.LB_ID }} --format Tag --no-header)

          if [[ "$ACTIVE_TAG" == *"blue"* ]]; then
            ACTIVE_ENV="blue"
            IDLE_ENV="green"
            IDLE_APP_ID="${{ env.GREEN_APP_ID }}"
          else
            ACTIVE_ENV="green"
            IDLE_ENV="blue"
            IDLE_APP_ID="${{ env.BLUE_APP_ID }}"
          fi

          # Determine target based on input
          if [ "${{ inputs.target_environment }}" == "auto" ]; then
            TARGET_ENV=$IDLE_ENV
            TARGET_APP_ID=$IDLE_APP_ID
          elif [ "${{ inputs.target_environment }}" == "blue" ]; then
            TARGET_ENV="blue"
            TARGET_APP_ID="${{ env.BLUE_APP_ID }}"
          else
            TARGET_ENV="green"
            TARGET_APP_ID="${{ env.GREEN_APP_ID }}"
          fi

          echo "active_env=$ACTIVE_ENV" >> $GITHUB_OUTPUT
          echo "target_env=$TARGET_ENV" >> $GITHUB_OUTPUT
          echo "target_app_id=$TARGET_APP_ID" >> $GITHUB_OUTPUT

          echo "✓ Active: $ACTIVE_ENV"
          echo "✓ Target: $TARGET_ENV"

  deploy:
    name: Deploy to ${{ needs.determine-target.outputs.target_env }}
    needs: determine-target
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 8

      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_TOKEN }}

      - name: Deploy to DigitalOcean
        run: |
          echo "🚀 Deploying to ${{ needs.determine-target.outputs.target_env }} environment..."

          # Trigger deployment
          doctl apps create-deployment ${{ needs.determine-target.outputs.target_app_id }}

          # Wait for deployment to complete
          echo "⏳ Waiting for deployment to complete..."

          DEPLOYMENT_ID=$(doctl apps list-deployments ${{ needs.determine-target.outputs.target_app_id }} --format ID --no-header | head -1)

          # Poll deployment status
          for i in {1..60}; do
            STATUS=$(doctl apps get-deployment ${{ needs.determine-target.outputs.target_app_id }} $DEPLOYMENT_ID --format Phase --no-header)

            echo "Deployment status: $STATUS (attempt $i/60)"

            if [ "$STATUS" == "ACTIVE" ]; then
              echo "✅ Deployment successful!"
              exit 0
            elif [ "$STATUS" == "ERROR" ] || [ "$STATUS" == "FAILED" ]; then
              echo "❌ Deployment failed!"
              exit 1
            fi

            sleep 30
          done

          echo "⏰ Deployment timeout after 30 minutes"
          exit 1

      - name: Get Deployment URL
        id: get-url
        run: |
          APP_URL=$(doctl apps get ${{ needs.determine-target.outputs.target_app_id }} --format LiveURL --no-header)
          echo "url=$APP_URL" >> $GITHUB_OUTPUT
          echo "Deployment URL: $APP_URL"

  health-checks:
    name: Run Health Checks
    needs: [determine-target, deploy]
    runs-on: ubuntu-latest
    steps:
      - name: Wait for Application Startup
        run: |
          echo "⏳ Waiting 30 seconds for application to fully start..."
          sleep 30

      - name: Health Check - Basic
        run: |
          APP_URL=$(doctl apps get ${{ needs.determine-target.outputs.target_app_id }} --format LiveURL --no-header)

          echo "🏥 Running basic health check..."
          RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL/api/health)

          if [ "$RESPONSE" -eq 200 ]; then
            echo "✅ Basic health check passed"
          else
            echo "❌ Basic health check failed (HTTP $RESPONSE)"
            exit 1
          fi

      - name: Health Check - Database
        run: |
          APP_URL=$(doctl apps get ${{ needs.determine-target.outputs.target_app_id }} --format LiveURL --no-header)

          echo "🗄️  Running database health check..."
          RESPONSE=$(curl -s $APP_URL/api/health/db)

          if echo "$RESPONSE" | grep -q '"healthy":true'; then
            echo "✅ Database health check passed"
          else
            echo "❌ Database health check failed"
            echo "Response: $RESPONSE"
            exit 1
          fi

      - name: Health Check - Redis
        run: |
          APP_URL=$(doctl apps get ${{ needs.determine-target.outputs.target_app_id }} --format LiveURL --no-header)

          echo "💾 Running Redis health check..."
          RESPONSE=$(curl -s $APP_URL/api/health/redis)

          if echo "$RESPONSE" | grep -q '"healthy":true'; then
            echo "✅ Redis health check passed"
          else
            echo "❌ Redis health check failed"
            echo "Response: $RESPONSE"
            exit 1
          fi

  smoke-tests:
    name: Run Smoke Tests
    needs: [determine-target, deploy, health-checks]
    if: ${{ !inputs.skip_smoke_tests }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Dependencies
        run: |
          npm install -g @playwright/test
          npx playwright install chromium

      - name: Run Smoke Tests
        env:
          TEST_URL: ${{ needs.deploy.outputs.url }}
        run: |
          echo "🧪 Running smoke tests against ${{ needs.determine-target.outputs.target_env }}..."

          # Run critical path tests only
          npx playwright test tests/smoke/ --project=chromium

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: smoke-test-results
          path: test-results/

  traffic-switch:
    name: Switch Traffic to ${{ needs.determine-target.outputs.target_env }}
    needs: [determine-target, deploy, health-checks, smoke-tests]
    if: ${{ inputs.auto_switch == true }}
    runs-on: ubuntu-latest
    steps:
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_TOKEN }}

      - name: Switch Load Balancer Target
        run: |
          echo "🔄 Switching traffic from ${{ needs.determine-target.outputs.active_env }} to ${{ needs.determine-target.outputs.target_env }}..."

          # Update load balancer to point to new environment
          doctl compute load-balancer update ${{ env.LB_ID }} \
            --tag-name holi-production-${{ needs.determine-target.outputs.target_env }}

          echo "✅ Traffic switch complete!"
          echo "Active environment is now: ${{ needs.determine-target.outputs.target_env }}"

      - name: Verify Traffic Switch
        run: |
          echo "⏳ Waiting 30 seconds for traffic switch to propagate..."
          sleep 30

          # Verify production URL returns healthy response
          RESPONSE=$(curl -s https://api.holilabs.xyz/api/health)

          if echo "$RESPONSE" | grep -q '"status":"ok"'; then
            echo "✅ Production traffic verified"
          else
            echo "❌ Production traffic verification failed"
            echo "Response: $RESPONSE"
            exit 1
          fi

      - name: Post-Switch Monitoring
        run: |
          echo "📊 Monitoring new environment for 5 minutes..."

          for i in {1..10}; do
            RESPONSE=$(curl -s https://api.holilabs.xyz/api/health)

            if echo "$RESPONSE" | grep -q '"status":"ok"'; then
              echo "✓ Health check $i/10 passed"
            else
              echo "✗ Health check $i/10 failed"
              echo "⚠️  Consider rollback!"
              exit 1
            fi

            sleep 30
          done

          echo "✅ Post-switch monitoring complete - environment stable"

  notify:
    name: Send Deployment Notification
    needs: [determine-target, deploy, traffic-switch]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Send Slack Notification
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: |
          STATUS="${{ job.status }}"
          COLOR="good"

          if [ "$STATUS" != "success" ]; then
            COLOR="danger"
          fi

          curl -X POST $SLACK_WEBHOOK_URL \
            -H 'Content-Type: application/json' \
            -d '{
              "attachments": [{
                "color": "'"$COLOR"'",
                "title": "Blue-Green Deployment",
                "fields": [
                  {
                    "title": "Environment",
                    "value": "'"${{ needs.determine-target.outputs.target_env }}"'",
                    "short": true
                  },
                  {
                    "title": "Status",
                    "value": "'"$STATUS"'",
                    "short": true
                  },
                  {
                    "title": "Branch",
                    "value": "'"${{ github.ref_name }}"'",
                    "short": true
                  },
                  {
                    "title": "Commit",
                    "value": "'"${{ github.sha }}"'",
                    "short": true
                  }
                ]
              }]
            }'
```

---

## Deployment Process

### Manual Deployment (Recommended for First Few Releases)

**Step 1: Deploy to Idle Environment**

```bash
# Determine active environment
ACTIVE=$(./scripts/get-active-environment.sh)
echo "Active environment: $ACTIVE"

# Deploy to idle environment
if [ "$ACTIVE" == "blue" ]; then
  TARGET="green"
  TARGET_APP_ID=$GREEN_APP_ID
else
  TARGET="blue"
  TARGET_APP_ID=$BLUE_APP_ID
fi

echo "Deploying to $TARGET..."

# Trigger deployment
doctl apps create-deployment $TARGET_APP_ID

# Monitor deployment
./scripts/monitor-deployment.sh $TARGET_APP_ID
```

**Step 2: Run Health Checks**

```bash
# Get target environment URL
TARGET_URL=$(doctl apps get $TARGET_APP_ID --format LiveURL --no-header)

# Run health checks
./scripts/health-check.sh $TARGET_URL

# Output:
# ✅ Health check passed: /api/health
# ✅ Database check passed: /api/health/db
# ✅ Redis check passed: /api/health/redis
```

**Step 3: Run Smoke Tests**

```bash
# Run smoke tests against target environment
TEST_URL=$TARGET_URL npm run test:smoke

# Check results
if [ $? -eq 0 ]; then
  echo "✅ Smoke tests passed"
else
  echo "❌ Smoke tests failed - do not switch traffic!"
  exit 1
fi
```

**Step 4: Switch Traffic**

```bash
# Switch load balancer to target environment
./scripts/switch-traffic.sh $TARGET

# Output:
# 🔄 Switching traffic from blue to green...
# ✅ Traffic switched successfully
# 🌐 Production now serving from: green
```

**Step 5: Monitor New Environment**

```bash
# Monitor for 5-10 minutes
./scripts/monitor-production.sh

# Watch metrics:
# - Error rate
# - Response time
# - Active connections
# - Database queries
```

### Automated Deployment (After Confidence Built)

```bash
# Trigger automated blue-green deployment
gh workflow run deploy-blue-green.yml \
  -f target_environment=auto \
  -f auto_switch=true \
  -f skip_smoke_tests=false
```

---

## Rollback Procedure

### Instant Rollback (< 30 seconds)

Blue-green deployment provides instant rollback by switching traffic back to the previous environment:

```bash
#!/bin/bash
# File: scripts/rollback.sh

echo "🚨 INITIATING EMERGENCY ROLLBACK"

# Get current active environment
ACTIVE=$(./scripts/get-active-environment.sh)

# Determine rollback target
if [ "$ACTIVE" == "blue" ]; then
  ROLLBACK_TARGET="green"
else
  ROLLBACK_TARGET="blue"
fi

echo "Current: $ACTIVE"
echo "Rolling back to: $ROLLBACK_TARGET"

# Confirm rollback
read -p "Are you sure you want to rollback? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Rollback cancelled"
  exit 0
fi

# Switch traffic back
./scripts/switch-traffic.sh $ROLLBACK_TARGET

echo "✅ Rollback complete!"
echo "🌐 Production now serving from: $ROLLBACK_TARGET"

# Verify rollback
sleep 10
./scripts/health-check.sh https://api.holilabs.xyz

if [ $? -eq 0 ]; then
  echo "✅ Rollback verified - production is healthy"
else
  echo "⚠️  Rollback verification failed - manual intervention required!"
fi
```

**Usage:**

```bash
# Emergency rollback
./scripts/rollback.sh

# Output:
# 🚨 INITIATING EMERGENCY ROLLBACK
# Current: green
# Rolling back to: blue
# Are you sure you want to rollback? (yes/no): yes
# 🔄 Switching traffic from green to blue...
# ✅ Rollback complete!
# 🌐 Production now serving from: blue
# ✅ Rollback verified - production is healthy
```

---

## Database Migrations

### Challenge: Shared Database

Blue and green environments share the same database. Database migrations must be:
1. **Backward compatible** (old code can run with new schema)
2. **Forward compatible** (new code can run with old schema)

### Migration Strategy

**Phase 1: Additive Changes Only (Deploy)**
- Add new columns (nullable or with defaults)
- Add new tables
- Add new indexes
- Do NOT drop columns or change types

**Phase 2: Code Deployment**
- Deploy new code that uses new schema
- New code should handle both old and new schema

**Phase 3: Data Migration (After Traffic Switch)**
- Backfill data in new columns
- Migrate data to new format

**Phase 4: Cleanup (Next Release)**
- Remove old columns
- Drop old tables
- Update constraints

### Example: Adding New Column

**Bad (Breaking):**
```sql
-- ❌ This breaks old code immediately
ALTER TABLE "Patient" ADD COLUMN "middleName" VARCHAR(255) NOT NULL;
```

**Good (Backward Compatible):**
```sql
-- ✅ This allows old code to continue working
ALTER TABLE "Patient" ADD COLUMN "middleName" VARCHAR(255);
```

**Code Handling:**
```typescript
// New code handles both cases
const patient = await prisma.patient.create({
  data: {
    firstName: 'John',
    middleName: middleName || null, // ✅ Handles absence
    lastName: 'Doe',
  },
});
```

---

## Health Checks

Comprehensive health checks are critical for blue-green deployments.

### Health Check Endpoints

**File: `apps/web/src/app/api/health/route.ts`** (already exists)

```typescript
// Basic health check
GET /api/health
Response: { status: 'ok', version: '1.3.0', timestamp: '2024-01-08T10:00:00Z' }
```

**File: `apps/web/src/app/api/health/db/route.ts`** (already exists)

```typescript
// Database health check
GET /api/health/db
Response: { healthy: true, latency: 15 }
```

**File: `apps/web/src/app/api/health/redis/route.ts`** (already exists)

```typescript
// Redis health check
GET /api/health/redis
Response: { healthy: true, latency: 5 }
```

### Smoke Test Suite

**File: `tests/smoke/critical-paths.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

test.describe('Critical Path Smoke Tests', () => {
  test('Health check returns OK', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('Database connection is healthy', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health/db`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.healthy).toBe(true);
    expect(body.latency).toBeLessThan(1000);
  });

  test('Login page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveTitle(/Holi Labs/);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('API authentication works', async ({ request }) => {
    // Test with valid credentials
    const response = await request.post(`${BASE_URL}/api/auth/signin`, {
      data: {
        email: 'test@holilabs.xyz',
        password: 'test-password-123',
      },
    });

    expect(response.status).toBeLessThan(500); // Should not be server error
  });
});
```

---

## Monitoring

### Key Metrics During Switch

Monitor these metrics during and after traffic switch:

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| Error Rate | < 0.1% | > 1% | > 5% |
| Response Time (p95) | < 500ms | > 1s | > 2s |
| CPU Usage | < 70% | > 80% | > 90% |
| Memory Usage | < 80% | > 90% | > 95% |
| Active Connections | < 100 | > 200 | > 500 |

### Grafana Dashboard

Create a blue-green deployment dashboard:

```json
{
  "dashboard": {
    "title": "Blue-Green Deployment",
    "panels": [
      {
        "title": "Active Environment",
        "type": "stat",
        "targets": [{
          "expr": "deployment_active_environment"
        }]
      },
      {
        "title": "Request Rate by Environment",
        "targets": [{
          "expr": "rate(http_requests_total{environment=~\"blue|green\"}[5m])"
        }]
      },
      {
        "title": "Error Rate by Environment",
        "targets": [{
          "expr": "rate(http_requests_total{status=~\"5..\",environment=~\"blue|green\"}[5m]) / rate(http_requests_total{environment=~\"blue|green\"}[5m])"
        }],
        "alert": {
          "conditions": [
            { "query": "avg() > 0.01", "for": "5m" }
          ]
        }
      }
    ]
  }
}
```

---

## Troubleshooting

### Problem 1: Deployment Fails

**Symptoms:**
- Deployment status shows "ERROR" or "FAILED"
- Application won't start

**Diagnosis:**

```bash
# Check deployment logs
doctl apps logs $APP_ID --follow

# Check build logs
doctl apps logs $APP_ID --type BUILD
```

**Solutions:**
- Fix build errors in code
- Verify environment variables are set
- Check resource limits (memory, CPU)

---

### Problem 2: Health Checks Fail

**Symptoms:**
- Health check returns 500 or times out
- Database connection fails

**Diagnosis:**

```bash
# Test health check directly
curl -v https://green.holilabs.xyz/api/health

# Check database connectivity
curl -v https://green.holilabs.xyz/api/health/db
```

**Solutions:**
- Verify DATABASE_URL is correct
- Check firewall rules for database
- Increase health check timeout
- Check application logs for errors

---

### Problem 3: Traffic Switch Causes Errors

**Symptoms:**
- Error rate spikes after traffic switch
- Users report issues

**Diagnosis:**

```bash
# Monitor error rate
./scripts/monitor-production.sh

# Check application logs
doctl apps logs $APP_ID --follow --type RUN
```

**Solutions:**
- Immediate rollback:
  ```bash
  ./scripts/rollback.sh
  ```
- Investigate root cause
- Fix issue and redeploy

---

## Production Rollout Checklist

### Pre-Deployment

- [ ] Infrastructure
  - [ ] Create blue environment app
  - [ ] Create green environment app
  - [ ] Set up load balancer
  - [ ] Configure DNS with low TTL (5 minutes)

- [ ] Configuration
  - [ ] Set all environment variables in both apps
  - [ ] Verify database connections from both apps
  - [ ] Test health checks in both environments

- [ ] Automation
  - [ ] Deploy GitHub Actions workflow
  - [ ] Create deployment scripts
  - [ ] Create rollback scripts
  - [ ] Create monitoring scripts

- [ ] Testing
  - [ ] Create smoke test suite
  - [ ] Test smoke tests locally
  - [ ] Verify smoke tests pass in staging

### First Deployment

- [ ] **Day 1: Deploy to Idle (Manual)**
  - [ ] Deploy to idle environment (don't switch traffic)
  - [ ] Run health checks
  - [ ] Run smoke tests
  - [ ] Monitor for 1 hour

- [ ] **Day 2: Traffic Switch (Manual, Low Traffic Period)**
  - [ ] Schedule during low traffic (e.g., 2 AM)
  - [ ] Switch traffic manually
  - [ ] Monitor intensively for 4 hours
  - [ ] Verify all systems operational

- [ ] **Week 1: Build Confidence**
  - [ ] Perform 2-3 manual deployments
  - [ ] Practice rollback procedure
  - [ ] Refine health checks and smoke tests

- [ ] **Week 2: Automate**
  - [ ] Enable automated traffic switching
  - [ ] Reduce monitoring to 1 hour post-switch
  - [ ] Document lessons learned

### Post-Deployment

- [ ] Monitor active environment for 24 hours
- [ ] Document any issues encountered
- [ ] Update runbooks based on experience
- [ ] Train team on blue-green deployment process

---

## Related Documents

- [Deployment Rollback Runbook](../runbooks/deployment-rollback.md)
- [Database Migration Guide](./database-migrations.md)
- [Health Check Implementation](../api/health-checks.md)
- [Load Testing Guide](../performance/load-testing.md)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-08 | DevOps | Initial version |
