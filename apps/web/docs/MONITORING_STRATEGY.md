# Monitoring Strategy

## Overview

This document outlines the comprehensive monitoring strategy for Holi Labs' production deployment. Our monitoring approach focuses on healthcare-specific metrics, system health, and proactive alerting to ensure 99.9% uptime and HIPAA compliance.

## Monitoring Stack

### Current Infrastructure

1. **Sentry** (Error Tracking & Performance Monitoring)
   - DSN: Configured via `NEXT_PUBLIC_SENTRY_DSN`
   - Sample Rate: 10% in production (tracesSampleRate: 0.1)
   - PII Protection: Enabled (sendDefaultPii: false)
   - Privacy: Headers and cookies stripped

2. **Pino Logger** (Structured Logging)
   - Format: JSON in production, pretty-printed in development
   - Levels: trace, debug, info, warn, error, fatal
   - Context: Request IDs, user IDs, operation metadata
   - Integration: Ready for BetterStack (Logtail) when configured

3. **Health Check Endpoints**
   - `/api/health` - Main health check with database status
   - `/api/health/live` - Kubernetes liveness probe
   - `/api/health/ready` - Kubernetes readiness probe (DB, Redis, Supabase)
   - `/api/health/rxnav` - External API health check

4. **CDSS Performance Metrics**
   - `/api/cds/metrics` - Real-time CDSS performance data
   - Cache hit rates, evaluation times, circuit breaker status

## Key Metrics to Track

### 1. Application Performance (SLIs)

#### Response Time
- **Target**: p50 < 500ms, p95 < 2s, p99 < 5s
- **Critical Threshold**: p95 > 3s
- **Endpoints to Monitor**:
  - `/api/patients` - Patient data access
  - `/api/ai/*` - AI-powered features
  - `/api/cds/*` - Clinical decision support
  - `/api/appointments` - Appointment management

#### Error Rate
- **Target**: < 0.1%
- **Warning**: > 0.5%
- **Critical**: > 1%
- **Categorization**:
  - 4xx errors (client errors) - track for UX issues
  - 5xx errors (server errors) - immediate alerts
  - Database errors - critical path failures

#### Throughput
- **Metrics**: Requests per minute (RPM)
- **Baseline**: Establish during first week of production
- **Alert**: 50% drop in RPM (possible outage)

### 2. Healthcare-Specific Metrics

#### CDSS Performance
- **Cache Hit Rate**: Target > 70%, Alert < 50%
- **Evaluation Time**: Target < 2s, Alert > 5s
- **Slow Evaluations**: Target < 5%, Alert > 10%
- **Circuit Breaker Status**: Alert when OPEN
- **Source**: `/api/cds/metrics`

#### Prescription Approval Latency
- **Target**: < 30 seconds (e-prescribing SLA)
- **Critical**: > 2 minutes
- **Events to Track**:
  - `prescription_created`
  - `prescription_signed`
  - `prescription_sent_to_pharmacy`

#### Patient Data Access
- **Target**: < 1s for patient record retrieval
- **Critical**: > 3s
- **Events to Track**:
  - `patient_record_accessed`
  - `patient_search_performed`
  - Database query latency

#### AI Review Queue
- **Metrics**: Queue depth, processing time, error rate
- **Target**: Queue processed within 1 hour
- **Critical**: Queue backlog > 100 items
- **Events to Track**:
  - `review_queue_item_added`
  - `review_queue_item_processed`
  - `review_queue_item_approved`
  - `review_queue_item_rejected`

### 3. Infrastructure Health

#### Database Performance
- **Connection Pool**: Track active/idle connections
- **Query Latency**: Target < 100ms, Alert > 500ms
- **Slow Queries**: Log queries > 1s
- **Connection Errors**: Alert on any connection failures
- **Source**: Health check endpoint + Prisma metrics

#### Redis/Upstash Performance
- **Hit Rate**: Target > 80%
- **Latency**: Target < 100ms
- **Connection Status**: Alert on disconnections
- **Memory Usage**: Alert at 80% capacity

#### External API Health
- **Supabase**: File storage availability
- **Twilio**: SMS/WhatsApp delivery status
- **RxNav**: Drug interaction API availability
- **AI Providers**: Gemini, Claude, OpenAI status
- **Email Provider**: Resend/SendGrid delivery rate

### 4. Security & Compliance

#### Authentication Events
- **Login Success Rate**: Track successful vs. failed logins
- **Failed Login Attempts**: Alert on > 5 failures/user in 5 min
- **Session Events**:
  - `auth_login_success`
  - `auth_login_failed`
  - `auth_invalid_password`
  - `auth_email_not_verified`

#### Access Control
- **Unauthorized Access Attempts**: Alert on any occurrence
- **RBAC Violations**: Track denied permissions
- **Events**:
  - `unauthorized_patient_access_attempt`
  - `unauthorized_join_attempt`
  - `auth_session_missing`

#### Audit Log Integrity
- **Log Volume**: Baseline expected volume
- **Missing Logs**: Alert on gaps in audit trail
- **Encryption Status**: Verify PHI encryption

### 5. Business Metrics

#### User Activity
- **Active Sessions**: Track concurrent users
- **Daily Active Users (DAU)**: Trend analysis
- **Feature Usage**: Track most/least used features

#### Appointment Metrics
- **Scheduled**: Appointments created per day
- **Completed**: Completion rate
- **No-shows**: Track and alert on high rates
- **Reminders Sent**: SMS/WhatsApp delivery success

#### AI Usage
- **Queries per Day**: Track AI feature usage
- **Token Consumption**: Monitor costs
- **Provider Distribution**: Gemini/Claude/OpenAI split
- **Cache Effectiveness**: Cost savings from caching

## Alert Thresholds

### Critical Alerts (Page Immediately)

| Metric | Threshold | Response Time |
|--------|-----------|---------------|
| Application Down | Health check fails | < 5 min |
| Database Down | Connection fails | < 5 min |
| Error Rate > 5% | 5xx errors spike | < 10 min |
| CDSS Circuit Breaker Open | Cache unavailable | < 15 min |
| Unauthorized Access | Any occurrence | < 10 min |
| Data Breach Indicators | PHI exposure | < 5 min |

### Warning Alerts (Slack Notification)

| Metric | Threshold | Response Time |
|--------|-----------|---------------|
| p95 Latency > 3s | Slow responses | < 30 min |
| Error Rate > 0.5% | Elevated errors | < 30 min |
| Cache Hit Rate < 50% | Cache degraded | < 1 hour |
| Queue Depth > 50 | Review queue backup | < 1 hour |
| Failed Logins > 5 | Potential attack | < 30 min |

### Info Alerts (Log Only)

| Metric | Threshold | Response Time |
|--------|-----------|---------------|
| Slow Query > 1s | Database optimization needed | Review daily |
| Low Cache Hit Rate | < 70% | Review weekly |
| High AI Costs | > 80% of budget | Review daily |

## Alert Destinations

### Production Environment

1. **PagerDuty** (Critical Alerts)
   - On-call engineer paging
   - Escalation after 15 minutes
   - Auto-resolve when metric recovers

2. **Slack** (#prod-alerts channel)
   - Warning and critical alerts
   - Automated incident channel creation
   - Integration with status page

3. **Email** (Engineering Team)
   - Daily digest of warnings
   - Weekly metrics summary
   - Monthly SLA reports

4. **Sentry** (Error Alerts)
   - Automatic error grouping
   - Stack traces and context
   - Release tracking

### Staging Environment

1. **Slack** (#staging-alerts channel)
   - All alerts route here
   - No paging for staging

## On-Call Rotation

### Schedule Template

```
Week 1: Engineer A (Primary), Engineer B (Secondary)
Week 2: Engineer B (Primary), Engineer C (Secondary)
Week 3: Engineer C (Primary), Engineer A (Secondary)
```

### Responsibilities

1. **Primary On-Call**
   - Respond to pages within 5 minutes
   - Investigate and mitigate critical issues
   - Escalate to secondary if needed
   - Document incident in post-mortem

2. **Secondary On-Call**
   - Backup for primary
   - Respond if primary doesn't acknowledge in 15 min
   - Provide support for complex issues

### Escalation Path

1. **Level 1**: On-Call Engineer (0-15 min)
2. **Level 2**: Engineering Lead (15-30 min)
3. **Level 3**: CTO (30+ min)
4. **Level 4**: External Vendor Support (if infrastructure issue)

## Monitoring Setup Instructions

### 1. Sentry Configuration

Already configured in `sentry.server.config.ts` and `sentry.edge.config.ts`.

**Required Environment Variables** (see `.env.example`):
```bash
NEXT_PUBLIC_SENTRY_DSN="https://52aaa16d91208b01661a802f8be429a0@o4510387452641280.ingest.us.sentry.io/4510387465879552"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="your-sentry-project"
```

**Sentry Features to Enable**:
- Performance Monitoring
- Release Tracking (via `NEXT_PUBLIC_APP_VERSION`)
- Custom Dashboards
- Alert Rules (configure in Sentry UI)

### 2. BetterStack (Logtail) Configuration

**Setup Steps**:
1. Create account at https://betterstack.com
2. Create log source and obtain token
3. Add to `.env`:
   ```bash
   LOGTAIL_SOURCE_TOKEN="your-token-here"
   ```
4. Logger automatically sends logs when token is configured

**BetterStack Dashboards**:
- Error rates by endpoint
- Authentication failures
- Slow queries
- CDSS performance

### 3. Uptime Monitoring

**Recommended Service**: UptimeRobot or Pingdom

**Endpoints to Monitor** (5-minute intervals):
- `https://holilabs.xyz/api/health`
- `https://holilabs.xyz/api/health/ready`
- `https://holilabs.xyz` (landing page)

**Alert Conditions**:
- 2 consecutive failures = warning
- 3 consecutive failures = critical

### 4. Database Monitoring

**Prisma Studio** (Development):
- Access database in real-time
- Query performance insights

**External Monitoring** (Production):
- Database provider dashboard (PostgreSQL metrics)
- Connection pool monitoring
- Query performance insights

### 5. Real-Time Dashboards

**Grafana or DataDog** (Optional but Recommended):
- Import health check metrics
- CDSS performance graphs
- Request rate and latency charts
- Alert rule visualization

## Log Aggregation Strategy

### Log Levels by Environment

| Environment | Level | Output |
|-------------|-------|--------|
| Development | debug | Pretty console |
| Staging | info | JSON + BetterStack |
| Production | info | JSON + BetterStack |

### Log Retention

- **Development**: No retention (console only)
- **Staging**: 7 days
- **Production**: 30 days (compliance requirement)
- **Audit Logs**: 7 years (HIPAA requirement)

### Structured Logging Format

All logs include:
```json
{
  "timestamp": "2025-12-15T10:30:00.000Z",
  "level": "info",
  "event": "patient_record_accessed",
  "requestId": "req_abc123",
  "userId": "user_xyz789",
  "patientId": "patient_def456",
  "duration": 245,
  "metadata": {}
}
```

### Critical Events to Log

1. **Authentication**
   - Login attempts (success/failure)
   - Session creation/expiration
   - Password resets
   - MFA challenges

2. **Data Access**
   - Patient record access (HIPAA audit)
   - PHI modifications
   - File uploads/downloads
   - Data exports

3. **Clinical Operations**
   - CDSS evaluations
   - Prescription approvals
   - Lab result reviews
   - Appointment scheduling

4. **System Events**
   - Deployment events
   - Configuration changes
   - Database migrations
   - External API failures

## Performance Baselines

To be established during first week of production:

1. **Baseline Collection Period**: 7 days
2. **Metrics to Baseline**:
   - Average requests per minute
   - p50/p95/p99 latency by endpoint
   - Error rate by endpoint
   - Database query distribution
   - Cache hit rates

3. **Alert Tuning**: Adjust thresholds based on baselines + 20% margin

## Incident Response Playbook

### 1. High Error Rate

**Symptoms**: Error rate > 1%, Sentry alerts firing

**Actions**:
1. Check `/api/health` endpoint
2. Review recent deployments (rollback if needed)
3. Check error patterns in Sentry
4. Verify external API status (Supabase, Twilio, etc.)
5. Scale infrastructure if traffic spike

### 2. Database Connection Issues

**Symptoms**: Health check fails, connection errors

**Actions**:
1. Check database provider status
2. Verify connection pool not exhausted
3. Check for long-running queries
4. Verify DATABASE_URL is correct
5. Restart application if pool exhausted

### 3. CDSS Performance Degraded

**Symptoms**: `/api/cds/metrics` shows degraded status

**Actions**:
1. Check Redis/Upstash connectivity
2. Review cache hit rate
3. Check for slow evaluations
4. Verify circuit breaker status
5. Clear cache if corrupted

### 4. Authentication Failures

**Symptoms**: Multiple login failures, auth events in logs

**Actions**:
1. Check if legitimate user issue (password reset needed)
2. Investigate for brute force attack
3. Verify NextAuth configuration
4. Check session store (Redis) health
5. Rate limit aggressive IPs

## Compliance & Privacy

### HIPAA Compliance

1. **Audit Logs**: All PHI access logged with user, timestamp, action
2. **Encryption**: PHI encrypted at rest and in transit
3. **Access Controls**: RBAC enforced and monitored
4. **Monitoring**: Unauthorized access attempts trigger alerts

### PII Protection in Monitoring

1. **Sentry**: `sendDefaultPii: false`, headers/cookies stripped
2. **Logs**: PHI never logged directly (use patient IDs)
3. **Metrics**: Aggregate only, no individual patient data
4. **Alerts**: No PHI in alert messages

### Data Retention

- **Operational Logs**: 30 days
- **Audit Logs**: 7 years (encrypted)
- **Metrics**: 90 days (aggregated)
- **Error Traces**: 30 days (PII stripped)

## Cost Monitoring

### AI Usage Tracking

**Environment Variables**:
```bash
AI_MONTHLY_BUDGET_USD="100"
AI_ALERT_THRESHOLD_PERCENT="80"
```

**Alerts**:
- Warning at 80% of budget
- Critical at 95% of budget
- Daily cost reports

### Infrastructure Costs

**Monthly Budget Allocation**:
- Database (PostgreSQL): $50
- Redis (Upstash): $10
- File Storage (Supabase): $25
- AI APIs: $100
- Monitoring (Sentry + BetterStack): $30
- **Total**: ~$215/month (starter plan)

**Cost Alerts**:
- Weekly cost review
- Alert if 20% over budget
- Automatic scaling limits

## Testing Monitoring

### Synthetic Tests

Create synthetic monitoring tests:

1. **Health Check Test**
   ```bash
   curl https://holilabs.xyz/api/health
   # Expected: 200 OK with database: true
   ```

2. **Authentication Test**
   ```bash
   # Login with test account
   # Expected: 200 OK with session token
   ```

3. **CDSS Performance Test**
   ```bash
   curl https://holilabs.xyz/api/cds/metrics
   # Expected: 200 OK with metrics
   ```

### Load Testing

**Tools**: k6 or Artillery

**Test Scenarios**:
1. Steady state: 10 req/s for 10 minutes
2. Ramp up: 0 to 50 req/s over 5 minutes
3. Spike: 100 req/s for 1 minute
4. Stress: Increase until failure

**Performance Targets**:
- No errors under steady state
- Graceful degradation under load
- Recovery within 2 minutes after spike

## Maintenance Windows

### Scheduled Maintenance

**Schedule**: Sundays 2:00 AM - 4:00 AM EST (lowest traffic)

**Communication**:
1. Announce 7 days in advance
2. Status page notification
3. Email to all users
4. In-app banner 24 hours before

**Monitoring During Maintenance**:
- Disable non-critical alerts
- Keep critical health checks active
- Manual verification post-maintenance

## References

- [Sentry Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [BetterStack Logs](https://betterstack.com/logs)
- [Prisma Monitoring](https://www.prisma.io/docs/concepts/components/prisma-client/metrics)
- [Next.js Monitoring Best Practices](https://nextjs.org/docs/app/building-your-application/optimizing/monitoring)

## Monitoring Checklist

- [x] Sentry configured with PII protection
- [x] Health check endpoints created
- [x] CDSS metrics endpoint created
- [x] Structured logging with Pino
- [ ] BetterStack (Logtail) token configured
- [ ] Uptime monitoring configured (UptimeRobot/Pingdom)
- [ ] Alert rules configured in Sentry
- [ ] Slack integration configured
- [ ] PagerDuty configured for critical alerts
- [ ] On-call rotation scheduled
- [ ] Performance baselines established
- [ ] Incident response playbook tested
- [ ] Cost monitoring alerts configured
- [ ] Synthetic tests deployed
