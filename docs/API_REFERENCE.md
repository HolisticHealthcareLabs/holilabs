# Governance API Reference

> **Holi Labs Clinical Assurance Platform**
> API Version: 1.0.0

## Overview

The Governance API provides endpoints for monitoring, auditing, and managing AI safety governance within the Holi Labs Clinical Assurance Platform. This API is designed for the Mission Control dashboard and compliance tooling.

## HIPAA Compliance Notice

This API handles Protected Health Information (PHI) and is designed to comply with HIPAA regulations:

- All requests are logged with immutable hash chains for audit purposes
- Session tokens expire after 24 hours
- Failed authentication attempts are logged and may trigger account lockout
- TLS 1.2+ is required for all connections

---

## Authentication

All endpoints require Bearer token authentication via NextAuth session.

```bash
# Include the Authorization header in all requests
Authorization: Bearer <your-nextauth-session-token>
```

### Obtaining a Token

Tokens are obtained through the NextAuth signin flow. After successful authentication, the session token is available in cookies or can be extracted for API usage.

---

## Rate Limiting

| Limit Type | Value |
|------------|-------|
| Standard   | 100 requests/minute/user |
| Burst      | 20 requests/second |

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window

---

## Endpoints

### GET /api/governance/logs

Retrieves the last 50 governance audit logs with associated events.

#### Description

Returns governance audit logs ordered by timestamp (most recent first). Designed for the Mission Control dashboard audit view.

#### Request

```bash
curl -X GET "https://api.holilabs.com/api/governance/logs" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

#### Response

**Success (200)**

```json
{
  "data": [
    {
      "id": "log_abc123",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "provider": "gpt-4o-mini",
      "safetyScore": 98,
      "latencyMs": 245,
      "session": {
        "user": {
          "email": "doctor@clinic.com"
        },
        "patient": "patient_xyz789"
      },
      "events": [
        {
          "id": "evt_001",
          "ruleName": "medication-contraindication-check",
          "severity": "WARN",
          "actionTaken": "FLAGGED",
          "description": "Potential drug interaction detected"
        }
      ]
    }
  ]
}
```

**Empty Response (Tables Not Migrated)**

```json
{
  "data": [],
  "message": "Governance tables not yet migrated. Run prisma db push."
}
```

**Error (500)**

```json
{
  "data": [],
  "error": "Failed to fetch governance logs"
}
```

---

### GET /api/governance/stats

Returns aggregated safety statistics for the last 24 hours.

#### Description

Provides KPI metrics for the Mission Control dashboard including session counts, intervention counts, and average safety scores.

#### Request

```bash
curl -X GET "https://api.holilabs.com/api/governance/stats" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

#### Response

**Success (200)**

```json
{
  "data": {
    "sessionsAudited": 1247,
    "interventionsTriggered": 3,
    "avgSafetyScore": 97
  }
}
```

**Empty Response (Tables Not Migrated)**

```json
{
  "data": {
    "sessionsAudited": 0,
    "interventionsTriggered": 0,
    "avgSafetyScore": 0
  },
  "message": "Governance tables not yet migrated. Run prisma db push."
}
```

**Error (500)**

```json
{
  "data": {
    "sessionsAudited": 0,
    "interventionsTriggered": 0,
    "avgSafetyScore": 0
  },
  "error": "Failed to fetch safety stats"
}
```

---

### POST /api/governance/event

Logs governance events including overrides, impressions, and latency metrics.

#### Description

Supports multiple event types for comprehensive telemetry and liability tracking. Override events are immutably logged for compliance purposes.

#### Event Types

| Type | Purpose | Required Fields |
|------|---------|-----------------|
| `OVERRIDE` | Clinician override of AI safety recommendation | `type`, `ruleId`, `reason` |
| `IMPRESSION` | UI impression tracking | `type` |
| `LATENCY` | Performance metric recording | `type` |

#### Request: Override Event

```bash
curl -X POST "https://api.holilabs.com/api/governance/event" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "OVERRIDE",
    "sessionId": "session_abc123",
    "ruleId": "medication-contraindication-check",
    "reason": "Patient has documented tolerance to this combination",
    "userId": "user_doctor456"
  }'
```

**Response (200)**

```json
{
  "success": true,
  "message": "Override Logged"
}
```

#### Request: Impression Event

```bash
curl -X POST "https://api.holilabs.com/api/governance/event" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "IMPRESSION",
    "component": "safety-warning-banner",
    "sessionId": "session_abc123"
  }'
```

**Response (200)**

```json
{
  "success": true,
  "tracked": true
}
```

#### Request: Latency Event

```bash
curl -X POST "https://api.holilabs.com/api/governance/event" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "LATENCY",
    "operation": "ai-inference",
    "durationMs": 342
  }'
```

**Response (200)**

```json
{
  "success": true,
  "latency_metric_recorded": true
}
```

#### Error Responses

**Invalid Event Type (400)**

```json
{
  "success": false,
  "error": "Unknown event type"
}
```

**Internal Server Error (500)**

```json
{
  "success": false,
  "error": "Internal Server Error"
}
```

---

## TypeScript Interfaces

Use these interfaces when integrating with the Governance API in TypeScript applications.

```typescript
// ============================================
// Governance Logs Types
// ============================================

interface GovernanceEvent {
  id: string;
  ruleName: string;
  severity: 'PASS' | 'WARN' | 'SOFT_BLOCK' | 'HARD_BLOCK';
  actionTaken: 'NONE' | 'FLAGGED' | 'BLOCKED' | 'OVERRIDE';
  description: string;
}

interface GovernanceLog {
  id: string;
  createdAt: string; // ISO 8601 timestamp
  provider: string;
  safetyScore: number; // 0-100
  latencyMs: number;
  session: {
    user: {
      email: string;
    };
    patient: string | null;
  } | null;
  events: GovernanceEvent[];
}

interface GovernanceLogsResponse {
  data: GovernanceLog[];
  message?: string;
  error?: string;
}

// ============================================
// Governance Stats Types
// ============================================

interface GovernanceStats {
  sessionsAudited: number;
  interventionsTriggered: number;
  avgSafetyScore: number; // 0-100
}

interface GovernanceStatsResponse {
  data: GovernanceStats;
  message?: string;
  error?: string;
}

// ============================================
// Governance Event Types
// ============================================

type GovernanceEventType = 'OVERRIDE' | 'IMPRESSION' | 'LATENCY';

interface OverrideEventRequest {
  type: 'OVERRIDE';
  sessionId?: string;
  ruleId: string;
  reason: string;
  userId?: string;
}

interface ImpressionEventRequest {
  type: 'IMPRESSION';
  component?: string;
  sessionId?: string;
}

interface LatencyEventRequest {
  type: 'LATENCY';
  operation?: string;
  durationMs?: number;
}

type GovernanceEventRequest =
  | OverrideEventRequest
  | ImpressionEventRequest
  | LatencyEventRequest;

interface OverrideEventResponse {
  success: boolean;
  message: string;
}

interface ImpressionEventResponse {
  success: boolean;
  tracked: boolean;
}

interface LatencyEventResponse {
  success: boolean;
  latency_metric_recorded: boolean;
}

interface EventErrorResponse {
  success: false;
  error: string;
}
```

---

## Common Use Cases

### 1. Fetching Dashboard Data

Populate the Mission Control dashboard with logs and stats:

```typescript
async function loadDashboardData(token: string) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const [logsRes, statsRes] = await Promise.all([
    fetch('/api/governance/logs', { headers }),
    fetch('/api/governance/stats', { headers }),
  ]);

  const logs: GovernanceLogsResponse = await logsRes.json();
  const stats: GovernanceStatsResponse = await statsRes.json();

  return { logs: logs.data, stats: stats.data };
}
```

### 2. Recording a Clinician Override

When a clinician overrides an AI safety recommendation:

```typescript
async function logOverride(
  token: string,
  ruleId: string,
  reason: string,
  sessionId: string,
  userId: string
): Promise<void> {
  const response = await fetch('/api/governance/event', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'OVERRIDE',
      sessionId,
      ruleId,
      reason,
      userId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to log override');
  }

  const result = await response.json();
  console.log('Override logged:', result.message);
}
```

### 3. Tracking UI Impressions

Track when safety warnings are displayed to users:

```typescript
async function trackImpression(
  token: string,
  component: string,
  sessionId: string
): Promise<void> {
  await fetch('/api/governance/event', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'IMPRESSION',
      component,
      sessionId,
    }),
  });
}
```

### 4. Recording Latency Metrics

Track performance metrics for AI operations:

```typescript
async function recordLatency(
  token: string,
  operation: string,
  startTime: number
): Promise<void> {
  const durationMs = Date.now() - startTime;

  await fetch('/api/governance/event', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'LATENCY',
      operation,
      durationMs,
    }),
  });
}

// Usage
const start = Date.now();
await performAIInference();
await recordLatency(token, 'ai-inference', start);
```

### 5. Filtering Logs by Severity

Filter governance logs to show only critical interventions:

```typescript
function filterCriticalLogs(logs: GovernanceLog[]): GovernanceLog[] {
  return logs.filter(log =>
    log.events.some(event =>
      event.severity === 'HARD_BLOCK' || event.severity === 'SOFT_BLOCK'
    )
  );
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 400  | Bad Request (invalid event type) |
| 401  | Unauthorized (missing or invalid token) |
| 403  | Forbidden (insufficient permissions) |
| 500  | Internal Server Error |

### Error Handling Example

```typescript
async function fetchGovernanceLogs(token: string): Promise<GovernanceLog[]> {
  const response = await fetch('/api/governance/logs', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    throw new Error('Session expired. Please log in again.');
  }

  if (response.status === 403) {
    throw new Error('You do not have permission to view governance logs.');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch governance logs');
  }

  const result: GovernanceLogsResponse = await response.json();

  // Check for migration message
  if (result.message) {
    console.warn('Governance notice:', result.message);
  }

  return result.data;
}
```

---

## Severity Levels

The governance system uses four severity levels:

| Severity | Description | User Impact |
|----------|-------------|-------------|
| `PASS` | Rule passed, no issues detected | None |
| `WARN` | Warning issued but action allowed | Warning displayed |
| `SOFT_BLOCK` | Action blocked but can be overridden | Requires clinician override |
| `HARD_BLOCK` | Action blocked, no override allowed | Action prevented |

---

## Action Types

| Action | Description |
|--------|-------------|
| `NONE` | No action taken |
| `FLAGGED` | Issue flagged for review |
| `BLOCKED` | Action was blocked |
| `OVERRIDE` | Clinician overrode the recommendation |

---

## Related Documentation

- [HIPAA Compliance Checklist](./HIPAA_COMPLIANCE_CHECKLIST.md)
- [Security Guidelines](./SECURITY_GUIDELINES.md)
- [Incident Response Plan](./INCIDENT_RESPONSE_PLAN.md)
- [PHI Handling](./PHI_HANDLING.md)
