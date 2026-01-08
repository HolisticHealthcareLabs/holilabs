# Synthetic Monitoring Setup

**Purpose:** Proactively monitor critical user journeys from external locations to detect issues before users report them.

**Tools:** DataDog Synthetics, Pingdom, or self-hosted (Playwright + cron)

---

## Overview

Synthetic monitoring simulates real user behavior by running automated tests against production endpoints from multiple geographic locations.

**Benefits:**
- **Proactive Detection**: Find issues before users do
- **Global Coverage**: Test from multiple regions
- **SLA Monitoring**: Track uptime and response times
- **Alert on Failures**: Get notified when critical paths break

---

## Critical Paths to Monitor

### Priority 1 (Every 5 minutes)
1. **Health Check** - `GET /api/health`
2. **Login** - POST /api/auth/login
3. **Patient List** - GET /api/patients

### Priority 2 (Every 15 minutes)
4. **Appointment Booking** - POST /api/appointments
5. **Prescription Creation** - POST /api/prescriptions
6. **Patient Search** - GET /api/patients/search

### Priority 3 (Every hour)
7. **Patient Data Export** - POST /api/patients/export
8. **Invoice Generation** - POST /api/invoices
9. **Lab Results Upload** - POST /api/lab-results

---

## Option 1: DataDog Synthetic Tests (Recommended)

### Advantages
- ✅ Integrated with APM
- ✅ Multi-location monitoring
- ✅ Recording tool for complex flows
- ✅ Built-in alerting

### Setup Instructions

#### 1. API Test: Health Check

```json
{
  "name": "Health Check - API",
  "type": "api",
  "subtype": "http",
  "config": {
    "request": {
      "method": "GET",
      "url": "https://api.holilabs.xyz/api/health",
      "timeout": 10,
      "headers": {}
    },
    "assertions": [
      {
        "type": "statusCode",
        "operator": "is",
        "target": 200
      },
      {
        "type": "responseTime",
        "operator": "lessThan",
        "target": 500
      },
      {
        "type": "body",
        "operator": "contains",
        "target": "\"status\":\"ok\""
      }
    ]
  },
  "locations": ["aws:us-east-1", "aws:eu-west-1", "aws:ap-southeast-1"],
  "options": {
    "tick_every": 300,
    "min_failure_duration": 0,
    "min_location_failed": 1,
    "monitor_options": {
      "renotify_interval": 0
    }
  },
  "message": "Health check failed! @pagerduty-holi-ops",
  "tags": ["env:production", "service:holi-api", "priority:p0"]
}
```

#### 2. API Test: Login Flow

```json
{
  "name": "User Login - Authentication",
  "type": "api",
  "subtype": "http",
  "config": {
    "request": {
      "method": "POST",
      "url": "https://api.holilabs.xyz/api/auth/login",
      "timeout": 10,
      "headers": {
        "Content-Type": "application/json"
      },
      "body": "{\"email\":\"{{SYNTHETIC_USER_EMAIL}}\",\"password\":\"{{SYNTHETIC_USER_PASSWORD}}\"}"
    },
    "assertions": [
      {
        "type": "statusCode",
        "operator": "is",
        "target": 200
      },
      {
        "type": "responseTime",
        "operator": "lessThan",
        "target": 1000
      },
      {
        "type": "body",
        "operator": "contains",
        "target": "token"
      }
    ],
    "configVariables": [
      {
        "name": "SYNTHETIC_USER_EMAIL",
        "type": "text",
        "pattern": "synthetic-monitor@holilabs.xyz"
      },
      {
        "name": "SYNTHETIC_USER_PASSWORD",
        "type": "global",
        "id": "SYNTHETIC_USER_PASSWORD"
      }
    ]
  },
  "locations": ["aws:us-east-1", "aws:eu-west-1"],
  "options": {
    "tick_every": 300,
    "min_failure_duration": 300,
    "min_location_failed": 2
  },
  "message": "Login flow failed! Users cannot authenticate. @pagerduty-holi-ops",
  "tags": ["env:production", "service:auth", "priority:p0"]
}
```

#### 3. Browser Test: Complete Appointment Booking

```javascript
// DataDog Browser Test (JavaScript)
// Name: "Appointment Booking - End-to-End"

// Step 1: Navigate to login page
await $webDriver.get('https://app.holilabs.xyz/login');

// Step 2: Login
await $webDriver.findElement($driver.By.id('email')).sendKeys('synthetic-physician@holilabs.xyz');
await $webDriver.findElement($driver.By.id('password')).sendKeys(process.env.SYNTHETIC_USER_PASSWORD);
await $webDriver.findElement($driver.By.css('button[type="submit"]')).click();

// Step 3: Wait for dashboard
await $webDriver.wait($driver.until.urlContains('/dashboard'), 5000);

// Step 4: Navigate to appointments
await $webDriver.get('https://app.holilabs.xyz/appointments/new');

// Step 5: Fill appointment form
await $webDriver.findElement($driver.By.id('patientSearch')).sendKeys('Test Patient');
await $webDriver.sleep(1000);
await $webDriver.findElement($driver.By.css('.patient-result:first-child')).click();

await $webDriver.findElement($driver.By.id('appointmentDate')).sendKeys('2024-12-31');
await $webDriver.findElement($driver.By.id('appointmentTime')).sendKeys('10:00');
await $webDriver.findElement($driver.By.id('appointmentReason')).sendKeys('Routine checkup');

// Step 6: Submit appointment
await $webDriver.findElement($driver.By.css('button[type="submit"]')).click();

// Step 7: Verify success
await $webDriver.wait($driver.until.urlContains('/appointments/'), 5000);
const successMessage = await $webDriver.findElement($driver.By.css('.success-message')).getText();
assert.ok(successMessage.includes('Appointment created'), 'Success message not found');
```

---

## Option 2: Self-Hosted with Playwright

### Advantages
- ✅ Free, open-source
- ✅ Full control
- ✅ Can test internal services
- ❌ Requires infrastructure management

### Setup Instructions

#### Step 1: Install Dependencies

```bash
cd /path/to/holilabsv2
pnpm add -D @playwright/test
npx playwright install chromium
```

#### Step 2: Create Synthetic Tests

```typescript
// File: tests/synthetic/health-check.spec.ts

import { test, expect } from '@playwright/test';

test('Health Check - API responds within 500ms', async ({ request }) => {
  const startTime = Date.now();

  const response = await request.get('https://api.holilabs.xyz/api/health');

  const duration = Date.now() - startTime;

  // Assertions
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.status).toBe('ok');

  expect(duration).toBeLessThan(500);

  console.log(`✓ Health check passed in ${duration}ms`);
});

test('Database Health - Connection is active', async ({ request }) => {
  const response = await request.get('https://api.holilabs.xyz/api/health/database');

  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.status).toBe('connected');

  console.log('✓ Database health check passed');
});

test('Redis Health - Connection is active', async ({ request }) => {
  const response = await request.get('https://api.holilabs.xyz/api/health/redis');

  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.status).toBe('connected');

  console.log('✓ Redis health check passed');
});
```

```typescript
// File: tests/synthetic/login-flow.spec.ts

import { test, expect } from '@playwright/test';

test('User Login - Physician can authenticate', async ({ request }) => {
  const response = await request.post('https://api.holilabs.xyz/api/auth/login', {
    data: {
      email: 'synthetic-monitor@holilabs.xyz',
      password: process.env.SYNTHETIC_USER_PASSWORD,
    },
  });

  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.token).toBeDefined();
  expect(body.user).toBeDefined();
  expect(body.user.email).toBe('synthetic-monitor@holilabs.xyz');

  console.log('✓ Login flow passed');
});

test('User Login - Invalid credentials rejected', async ({ request }) => {
  const response = await request.post('https://api.holilabs.xyz/api/auth/login', {
    data: {
      email: 'synthetic-monitor@holilabs.xyz',
      password: 'wrong-password',
    },
  });

  expect(response.status()).toBe(401);

  console.log('✓ Invalid login correctly rejected');
});
```

```typescript
// File: tests/synthetic/patient-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Patient Management Flow', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const response = await request.post('https://api.holilabs.xyz/api/auth/login', {
      data: {
        email: 'synthetic-monitor@holilabs.xyz',
        password: process.env.SYNTHETIC_USER_PASSWORD,
      },
    });

    const body = await response.json();
    authToken = body.token;
  });

  test('Patient List - Can retrieve patients', async ({ request }) => {
    const response = await request.get('https://api.holilabs.xyz/api/patients', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBeTruthy();

    console.log(`✓ Retrieved ${body.data.length} patients`);
  });

  test('Patient Search - Can search by name', async ({ request }) => {
    const response = await request.get('https://api.holilabs.xyz/api/patients/search?q=Test', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.results).toBeDefined();

    console.log(`✓ Search returned ${body.results.length} results`);
  });

  test('Patient Detail - Can view individual patient', async ({ request }) => {
    // First get list of patients
    const listResponse = await request.get('https://api.holilabs.xyz/api/patients?limit=1', {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    const listBody = await listResponse.json();
    const patientId = listBody.data[0]?.id;

    if (!patientId) {
      test.skip();
      return;
    }

    // Get patient detail
    const response = await request.get(`https://api.holilabs.xyz/api/patients/${patientId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.id).toBe(patientId);
    expect(body.firstName).toBeDefined();

    console.log(`✓ Retrieved patient ${body.firstName}`);
  });
});
```

```typescript
// File: tests/synthetic/appointment-booking.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Appointment Booking Flow', () => {
  let authToken: string;
  let testPatientId: string;

  test.beforeAll(async ({ request }) => {
    // Login
    const loginResponse = await request.post('https://api.holilabs.xyz/api/auth/login', {
      data: {
        email: 'synthetic-monitor@holilabs.xyz',
        password: process.env.SYNTHETIC_USER_PASSWORD,
      },
    });

    const loginBody = await loginResponse.json();
    authToken = loginBody.token;

    // Get a test patient
    const patientsResponse = await request.get('https://api.holilabs.xyz/api/patients?limit=1', {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    const patientsBody = await patientsResponse.json();
    testPatientId = patientsBody.data[0]?.id;
  });

  test('Appointment Creation - Can book appointment', async ({ request }) => {
    if (!testPatientId) {
      test.skip();
      return;
    }

    const appointmentData = {
      patientId: testPatientId,
      scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      type: 'CONSULTATION',
      reason: 'Synthetic monitoring test - can be deleted',
      duration: 30,
    };

    const response = await request.post('https://api.holilabs.xyz/api/appointments', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: appointmentData,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.patientId).toBe(testPatientId);

    console.log(`✓ Created appointment ${body.id}`);

    // Cleanup: Delete the test appointment
    const deleteResponse = await request.delete(`https://api.holilabs.xyz/api/appointments/${body.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    expect(deleteResponse.ok()).toBeTruthy();
    console.log(`✓ Cleaned up test appointment`);
  });
});
```

#### Step 3: Create Monitoring Script

```bash
#!/bin/bash
# File: scripts/synthetic-monitoring.sh

# Run synthetic tests and report results

set -e

echo "=== Running Synthetic Monitoring Tests ==="
echo "Time: $(date)"

# Run tests with Playwright
npx playwright test tests/synthetic/ \
  --reporter=json \
  --output=test-results/synthetic-$(date +%Y%m%d-%H%M).json

# Check exit code
if [ $? -eq 0 ]; then
  echo "✓ All synthetic tests passed"

  # Send success metric to monitoring
  curl -X POST https://api.datadoghq.com/api/v1/series \
    -H "DD-API-KEY: $DD_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "series": [{
        "metric": "synthetic.tests.success",
        "points": [['$(date +%s)', 1]],
        "type": "count",
        "tags": ["env:production"]
      }]
    }'
else
  echo "✗ Synthetic tests failed!"

  # Send failure metric
  curl -X POST https://api.datadoghq.com/api/v1/series \
    -H "DD-API-KEY: $DD_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "series": [{
        "metric": "synthetic.tests.failure",
        "points": [['$(date +%s)', 1]],
        "type": "count",
        "tags": ["env:production"]
      }]
    }'

  # Send alert to Slack
  curl -X POST $SLACK_WEBHOOK_URL \
    -H "Content-Type: application/json" \
    -d '{
      "text": "🚨 Synthetic monitoring tests FAILED!",
      "blocks": [{
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Synthetic Test Failure*\n\nCritical user journeys are failing. Check test results immediately."
        }
      }]
    }'

  exit 1
fi
```

#### Step 4: Schedule Tests with Cron

```bash
# Add to crontab
crontab -e

# Run health checks every 5 minutes
*/5 * * * * cd /path/to/holilabsv2 && ./scripts/synthetic-monitoring.sh >> /var/log/synthetic-monitoring.log 2>&1

# Or use systemd timer
# File: /etc/systemd/system/synthetic-monitoring.timer
[Unit]
Description=Synthetic Monitoring Tests
Requires=synthetic-monitoring.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min
Unit=synthetic-monitoring.service

[Install]
WantedBy=timers.target

# Enable timer
sudo systemctl enable synthetic-monitoring.timer
sudo systemctl start synthetic-monitoring.timer
```

---

## Option 3: Pingdom (Simple HTTP Checks)

### Setup Instructions

```markdown
1. Sign up: https://www.pingdom.com
2. Add HTTP checks:
   - URL: https://api.holilabs.xyz/api/health
   - Check frequency: Every 1 minute
   - Alert after: 2 failed checks
   - Locations: Multiple regions
3. Configure alerts to PagerDuty/Slack
```

---

## Alert Thresholds

### Critical (PagerDuty)
- **Condition**: 2+ consecutive failures from same location
- **Affected**: Health check, login flow
- **Response**: Immediate investigation

### Warning (Slack)
- **Condition**: 5+ failures in 1 hour
- **Affected**: Patient search, appointment booking
- **Response**: Investigate during business hours

### Info (Email)
- **Condition**: Single failure
- **Affected**: Non-critical paths
- **Response**: Log for review

---

## Test Data Management

### Create Synthetic Test User

```sql
-- Create synthetic monitoring user
INSERT INTO "User" (
  id,
  email,
  "hashedPassword",
  role,
  "firstName",
  "lastName",
  "accountLocked"
) VALUES (
  gen_random_uuid(),
  'synthetic-monitor@holilabs.xyz',
  '<bcrypt-hash-of-synthetic-password>',
  'PHYSICIAN',
  'Synthetic',
  'Monitor',
  false
);

-- Create synthetic test patient
INSERT INTO "Patient" (
  id,
  "firstName",
  "lastName",
  "dateOfBirth",
  email,
  phone
) VALUES (
  gen_random_uuid(),
  'Test',
  'Patient - Synthetic',
  '1990-01-01',
  'synthetic-patient@example.com',
  '+15555555555'
);

-- Grant access
INSERT INTO "DataAccessGrant" (
  id,
  "userId",
  "patientId",
  "accessType",
  "grantedBy",
  "grantedAt"
) SELECT
  gen_random_uuid(),
  (SELECT id FROM "User" WHERE email = 'synthetic-monitor@holilabs.xyz'),
  (SELECT id FROM "Patient" WHERE email = 'synthetic-patient@example.com'),
  'FULL',
  (SELECT id FROM "User" WHERE email = 'synthetic-monitor@holilabs.xyz'),
  NOW();
```

### Cleanup Test Data

```sql
-- Delete test appointments created by synthetic monitoring
DELETE FROM "Appointment"
WHERE reason LIKE '%Synthetic monitoring test%'
AND "createdAt" < NOW() - INTERVAL '24 hours';
```

---

## Monitoring Dashboard

### DataDog Dashboard for Synthetic Tests

```json
{
  "title": "Synthetic Monitoring - Critical Paths",
  "widgets": [
    {
      "definition": {
        "title": "Test Success Rate (Last 24h)",
        "type": "query_value",
        "requests": [{
          "q": "sum:synthetics.test.runs{status:passed}.as_count() / sum:synthetics.test.runs{}.as_count() * 100",
          "aggregator": "avg"
        }],
        "precision": 2,
        "unit": "%"
      }
    },
    {
      "definition": {
        "title": "Test Failures by Endpoint",
        "type": "timeseries",
        "requests": [{
          "q": "sum:synthetics.test.runs{status:failed} by {test_name}.as_count()",
          "display_type": "bars"
        }]
      }
    },
    {
      "definition": {
        "title": "Response Time Trend",
        "type": "timeseries",
        "requests": [{
          "q": "avg:synthetics.http.response.time{} by {test_name}",
          "display_type": "line"
        }]
      }
    }
  ]
}
```

---

## Best Practices

### 1. Test from Multiple Locations

```markdown
Minimum 3 locations:
- US East (primary users)
- EU West (international users)
- Asia Pacific (if applicable)
```

### 2. Don't Create Noise

```markdown
- Use separate test accounts
- Tag test data for easy cleanup
- Don't send actual emails/SMS in tests
- Mock external services when possible
```

### 3. Keep Tests Fast

```markdown
Target: <30 seconds per test
- Use API tests over browser tests when possible
- Minimize wait times
- Run only critical assertions
```

### 4. Monitor Test Reliability

```markdown
If tests are flaky (>5% failure rate):
- Increase timeouts
- Add retries
- Investigate root cause
```

---

## Cost Optimization

### DataDog Synthetics Pricing
- API tests: $5/1000 test runs
- Browser tests: $12/1000 test runs

**Estimated Monthly Cost:**
```
Health check: 8,640 runs/month (every 5 min) = $43
Login flow: 2,880 runs/month (every 15 min) = $14
Appointment booking: 720 runs/month (every hour) = $9

Total: ~$66/month for basic coverage
```

### Self-Hosted (Free)
- Playwright tests: $0
- Server cost: $10-20/month (shared with other services)

---

## Related Documentation
- [APM Setup](./apm-setup.md)
- [Business Metrics Dashboard](./business-metrics-dashboard.md)
- [Performance Degradation Runbook](../runbooks/performance-degradation.md)

---

## Changelog
- **2024-01-07**: Initial version created
