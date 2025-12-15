# Alerting Rules & Escalation Policy

## Overview

This document defines all alerting rules, severity classifications, and escalation procedures for Holi Labs production monitoring.

## Alert Severity Levels

### P0 - Critical (Page Immediately)
- **Response Time**: < 5 minutes
- **Destination**: PagerDuty + Slack (#incidents)
- **Escalation**: 15 minutes if not acknowledged
- **Examples**: Complete outage, data breach, database down

### P1 - High (Urgent Notification)
- **Response Time**: < 15 minutes
- **Destination**: Slack (#prod-alerts)
- **Escalation**: 30 minutes if not resolved
- **Examples**: High error rate, CDSS failure, authentication issues

### P2 - Warning (Standard Notification)
- **Response Time**: < 30 minutes
- **Destination**: Slack (#prod-alerts)
- **Escalation**: Review next business day
- **Examples**: Performance degradation, cache issues, queue backup

### P3 - Info (Log Only)
- **Response Time**: Review during business hours
- **Destination**: Logs + Weekly email digest
- **Escalation**: No escalation
- **Examples**: Slow queries, low cache hit rate, optimization opportunities

## Critical Alerts (P0)

### ALERT-001: Application Down
**Trigger**: Health check endpoint returns 503 or times out
- **Check**: `GET /api/health` fails 3 times in 2 minutes
- **Severity**: P0 - Critical
- **Destination**: PagerDuty + Slack
- **Response**:
  1. Check server status (DigitalOcean/Vercel)
  2. Review deployment logs
  3. Check database connectivity
  4. Rollback if caused by recent deployment
  5. Scale infrastructure if needed

**Auto-Resolution**: Health check passes 3 consecutive times

---

### ALERT-002: Database Connection Failure
**Trigger**: Database health check fails
- **Check**: `/api/health` shows `database: false`
- **Severity**: P0 - Critical
- **Destination**: PagerDuty + Slack
- **Response**:
  1. Verify DATABASE_URL is correct
  2. Check database provider status
  3. Review connection pool metrics
  4. Check for long-running queries blocking connections
  5. Restart application if pool exhausted

**Auto-Resolution**: Database health check passes

---

### ALERT-003: Critical Error Rate
**Trigger**: 5xx error rate > 5% over 5 minutes
- **Metric**: `(5xx_errors / total_requests) * 100 > 5`
- **Severity**: P0 - Critical
- **Destination**: PagerDuty + Slack
- **Response**:
  1. Check Sentry for error patterns
  2. Review recent deployments
  3. Check external API status (Supabase, Twilio, etc.)
  4. Verify database performance
  5. Consider rollback if deployment-related

**Auto-Resolution**: Error rate < 1% for 10 minutes

---

### ALERT-004: Data Breach Indicators
**Trigger**: Unauthorized access attempts spike
- **Check**: > 10 `unauthorized_patient_access_attempt` events in 5 minutes
- **Severity**: P0 - Critical
- **Destination**: PagerDuty + Slack + Email to Security Team
- **Response**:
  1. Block offending IP addresses
  2. Review access logs for compromised accounts
  3. Force password reset for affected users
  4. Notify security officer
  5. Document incident for compliance

**Auto-Resolution**: Manual only (requires security review)

---

### ALERT-005: CDSS Complete Failure
**Trigger**: CDSS circuit breaker opens (all evaluations failing)
- **Check**: `/api/cds/metrics` shows `circuitBreaker.state: "OPEN"`
- **Severity**: P0 - Critical
- **Destination**: PagerDuty + Slack
- **Response**:
  1. Check Redis/Upstash connectivity
  2. Review recent CDSS rule changes
  3. Check external API dependencies (RxNav)
  4. Clear Redis cache if corrupted
  5. Manually close circuit breaker after fixes

**Auto-Resolution**: Circuit breaker transitions to CLOSED

---

### ALERT-006: PHI Encryption Failure
**Trigger**: Encryption errors in logs
- **Check**: Log event `encryption_error` appears
- **Severity**: P0 - Critical
- **Destination**: PagerDuty + Slack + Email to Security Team
- **Response**:
  1. Stop processing PHI immediately
  2. Verify ENCRYPTION_MASTER_KEY is set
  3. Check for key rotation issues
  4. Review affected records
  5. Document for compliance audit

**Auto-Resolution**: Manual only (requires security review)

## High Priority Alerts (P1)

### ALERT-101: Elevated Error Rate
**Trigger**: 5xx error rate > 1% over 10 minutes
- **Metric**: `(5xx_errors / total_requests) * 100 > 1`
- **Severity**: P1 - High
- **Destination**: Slack (#prod-alerts)
- **Response**:
  1. Investigate error patterns in Sentry
  2. Check recent code changes
  3. Review external service health
  4. Monitor for escalation to P0

**Auto-Resolution**: Error rate < 0.5% for 15 minutes

---

### ALERT-102: Authentication Failure Spike
**Trigger**: Failed login attempts > 20 in 5 minutes
- **Check**: Count of `auth_login_failed` events
- **Severity**: P1 - High
- **Destination**: Slack (#prod-alerts)
- **Response**:
  1. Check if legitimate user issue (password reset campaign?)
  2. Investigate for brute force attack
  3. Rate limit aggressive IPs
  4. Review auth logs for patterns
  5. Consider temporary account lockout

**Auto-Resolution**: Failed login rate returns to normal

---

### ALERT-103: CDSS Performance Degraded
**Trigger**: CDSS evaluation time > 5s (p95)
- **Check**: `/api/cds/metrics` shows `avgProcessingTime > 5000`
- **Severity**: P1 - High
- **Destination**: Slack (#prod-alerts)
- **Response**:
  1. Check Redis performance
  2. Review cache hit rate
  3. Check for rule complexity issues
  4. Monitor database query times
  5. Consider disabling non-critical rules

**Auto-Resolution**: p95 latency < 2s for 10 minutes

---

### ALERT-104: Prescription Approval Timeout
**Trigger**: Prescription not approved within 5 minutes
- **Check**: Time between `prescription_created` and `prescription_signed` > 5 minutes
- **Severity**: P1 - High
- **Destination**: Slack (#prod-alerts)
- **Response**:
  1. Check e-prescribing API status
  2. Review prescription workflow
  3. Verify notification delivery
  4. Check for stuck transactions
  5. Contact pharmacy if delivery failed

**Auto-Resolution**: Prescription successfully processed

---

### ALERT-105: Redis Connection Lost
**Trigger**: Redis health check fails
- **Check**: `/api/health/ready` shows `redis: "unhealthy"`
- **Severity**: P1 - High
- **Destination**: Slack (#prod-alerts)
- **Response**:
  1. Check Upstash status
  2. Verify UPSTASH_REDIS_REST_URL is correct
  3. Check for connection pool exhaustion
  4. Application degrades gracefully (no caching)
  5. Monitor for performance impact

**Auto-Resolution**: Redis health check passes

---

### ALERT-106: External API Failure
**Trigger**: External API errors > 10% over 5 minutes
- **Services**: Supabase, Twilio, RxNav, AI providers
- **Severity**: P1 - High
- **Destination**: Slack (#prod-alerts)
- **Response**:
  1. Check external service status page
  2. Verify API credentials
  3. Implement fallback/retry logic
  4. Notify users if service degraded
  5. Contact vendor support if needed

**Auto-Resolution**: API error rate < 1%

## Warning Alerts (P2)

### ALERT-201: High Latency
**Trigger**: p95 response time > 3s over 10 minutes
- **Metric**: p95 latency across all endpoints
- **Severity**: P2 - Warning
- **Destination**: Slack (#prod-alerts)
- **Response**:
  1. Identify slow endpoints
  2. Check database query performance
  3. Review cache hit rates
  4. Monitor traffic patterns
  5. Consider scaling if traffic spike

**Auto-Resolution**: p95 latency < 2s for 15 minutes

---

### ALERT-202: Cache Hit Rate Low
**Trigger**: Redis cache hit rate < 50%
- **Check**: `/api/cds/metrics` shows `cacheMetrics.hitRate < 50`
- **Severity**: P2 - Warning
- **Destination**: Slack (#prod-alerts)
- **Response**:
  1. Review cache key strategy
  2. Check cache TTL settings
  3. Monitor cache eviction rate
  4. Consider increasing cache capacity
  5. Review caching patterns

**Auto-Resolution**: Cache hit rate > 70% for 30 minutes

---

### ALERT-203: Review Queue Backup
**Trigger**: AI review queue > 50 items
- **Check**: Count of unprocessed review queue items
- **Severity**: P2 - Warning
- **Destination**: Slack (#prod-alerts)
- **Response**:
  1. Check queue processing worker
  2. Review queue item age
  3. Notify clinicians of pending reviews
  4. Consider manual review if critical
  5. Investigate queue bottlenecks

**Auto-Resolution**: Queue depth < 20 items

---

### ALERT-204: Slow Database Queries
**Trigger**: Query time > 1s detected
- **Check**: Log events with `duration > 1000ms`
- **Severity**: P2 - Warning
- **Destination**: Slack (#prod-alerts)
- **Response**:
  1. Identify slow query patterns
  2. Review database indexes
  3. Check for N+1 query problems
  4. Optimize query or add index
  5. Document for performance review

**Auto-Resolution**: No slow queries for 1 hour

---

### ALERT-205: AI Cost Threshold
**Trigger**: AI costs > 80% of monthly budget
- **Check**: Total AI API costs vs `AI_MONTHLY_BUDGET_USD`
- **Severity**: P2 - Warning
- **Destination**: Slack (#prod-alerts) + Email to finance
- **Response**:
  1. Review AI usage patterns
  2. Check for abusive usage
  3. Verify cache effectiveness
  4. Consider rate limiting
  5. Adjust budget if needed

**Auto-Resolution**: Manual only (budget reset monthly)

---

### ALERT-206: Session Store Issues
**Trigger**: Session creation failures > 5%
- **Check**: Failed session creation rate
- **Severity**: P2 - Warning
- **Destination**: Slack (#prod-alerts)
- **Response**:
  1. Check Redis connectivity
  2. Review session store capacity
  3. Check for corrupt sessions
  4. Monitor user impact
  5. Clear old sessions if needed

**Auto-Resolution**: Session success rate > 98%

---

### ALERT-207: File Upload Failures
**Trigger**: Supabase upload errors > 10% over 10 minutes
- **Check**: Failed file upload rate
- **Severity**: P2 - Warning
- **Destination**: Slack (#prod-alerts)
- **Response**:
  1. Check Supabase status
  2. Verify storage quota not exceeded
  3. Review file size limits
  4. Check for corrupt uploads
  5. Retry failed uploads

**Auto-Resolution**: Upload success rate > 95%

## Info Alerts (P3)

### ALERT-301: Slow Query Detected
**Trigger**: Individual query > 1s (not frequent)
- **Severity**: P3 - Info
- **Destination**: Logs + Weekly email digest
- **Response**: Review during next optimization sprint

---

### ALERT-302: Cache Hit Rate Below Target
**Trigger**: Cache hit rate < 70% but > 50%
- **Severity**: P3 - Info
- **Destination**: Logs + Weekly email digest
- **Response**: Review cache strategy during next sprint

---

### ALERT-303: Moderate Latency
**Trigger**: p95 response time > 2s but < 3s
- **Severity**: P3 - Info
- **Destination**: Logs + Weekly email digest
- **Response**: Monitor trend, optimize if persistent

---

### ALERT-304: API Rate Limit Approaching
**Trigger**: Rate limit usage > 80% of limit
- **Severity**: P3 - Info
- **Destination**: Logs only
- **Response**: Monitor for abuse patterns

---

### ALERT-305: Deployment Success/Failure
**Trigger**: Deployment completes
- **Severity**: P3 - Info
- **Destination**: Slack (#deployments)
- **Response**: Monitor for post-deployment issues

## Alert Configuration by Service

### Sentry Alert Rules

Create these alerts in Sentry UI:

1. **Error Rate Alert**
   - Condition: Errors > 50 in 5 minutes
   - Action: Notify Slack #prod-alerts
   - Auto-resolve: Yes

2. **Performance Alert**
   - Condition: Transaction duration p95 > 3s
   - Action: Notify Slack #prod-alerts
   - Auto-resolve: Yes

3. **Issue Alert**
   - Condition: New issue seen
   - Action: Notify Slack #prod-alerts
   - Auto-resolve: No

### BetterStack Alert Rules

Create these alerts in BetterStack UI:

1. **Error Log Spike**
   - Query: `level:"error" count > 10 in 5m`
   - Action: Notify Slack #prod-alerts

2. **Authentication Failures**
   - Query: `event:"auth_login_failed" count > 20 in 5m`
   - Action: Notify Slack #prod-alerts

3. **Unauthorized Access**
   - Query: `event:"unauthorized_patient_access_attempt"`
   - Action: Notify PagerDuty + Slack

4. **Database Errors**
   - Query: `message:*"database"* level:"error"`
   - Action: Notify Slack #prod-alerts

### Custom Alert Rules (Application)

Implement these in application code:

1. **CDSS Circuit Breaker** (already implemented)
   - Location: `/lib/cds/engines/cds-engine.ts`
   - Triggers when error rate > 50% over 1 minute

2. **Rate Limit Exceeded**
   - Location: `/lib/rate-limit.ts`
   - Logs when user exceeds rate limit

3. **AI Budget Warning**
   - Location: `/lib/ai/usage-tracker.ts`
   - Checks daily against monthly budget

## Escalation Policy

### Level 1: On-Call Engineer (0-15 minutes)

**Responsibilities**:
- Acknowledge alerts within 5 minutes
- Begin investigation immediately
- Update Slack with status
- Resolve or escalate within 15 minutes

**Actions**:
- Check monitoring dashboards
- Review recent deployments
- Check service status pages
- Apply immediate fixes if possible

### Level 2: Engineering Lead (15-30 minutes)

**Triggers**:
- P0 alert not acknowledged in 15 minutes
- P0 alert not resolved in 30 minutes
- On-call engineer requests escalation

**Responsibilities**:
- Coordinate response team
- Make rollback decisions
- Communicate with stakeholders
- Update status page

### Level 3: CTO (30+ minutes)

**Triggers**:
- P0 alert not resolved in 1 hour
- Multiple P0 alerts simultaneously
- Data breach confirmed

**Responsibilities**:
- Executive decision making
- Customer communication
- Vendor escalation
- Post-mortem coordination

### Level 4: External Vendor Support

**Triggers**:
- Infrastructure issue beyond control
- Database provider issue
- External API critical failure

**Contacts**:
- DigitalOcean/Vercel Support
- PostgreSQL/Supabase Support
- Upstash Support
- Twilio Support

## Alert Notification Channels

### Slack Configuration

**Channels**:
- `#prod-alerts` - All P1, P2 alerts
- `#incidents` - P0 critical alerts only
- `#staging-alerts` - Staging environment alerts
- `#deployments` - Deployment notifications

**Integration Setup**:
```
1. Go to Slack App Directory
2. Add "Incoming Webhooks" app
3. Create webhook for each channel
4. Add webhook URLs to monitoring services
```

### PagerDuty Configuration

**Services**:
- "Holi Labs Production" - Primary service
- "Holi Labs Database" - Database-specific alerts

**Integration Keys**:
```
PAGERDUTY_INTEGRATION_KEY_PROD="your-key-here"
PAGERDUTY_INTEGRATION_KEY_DB="your-key-here"
```

**Escalation Policy**:
```
1. Notify on-call engineer immediately
2. Escalate to secondary after 15 minutes
3. Escalate to engineering lead after 30 minutes
4. Escalate to CTO after 1 hour
```

### Email Configuration

**Distribution Lists**:
- `eng-oncall@holilabs.com` - On-call engineer rotation
- `eng-team@holilabs.com` - All engineers (daily digests)
- `security@holilabs.com` - Security alerts only

## Alert Testing

### Test Critical Alerts (Monthly)

1. **Application Down**
   ```bash
   # Temporarily disable health endpoint
   # Verify PagerDuty page sent
   ```

2. **Database Failure**
   ```bash
   # Temporarily disconnect database
   # Verify alerts fire correctly
   ```

3. **Error Rate Spike**
   ```bash
   # Trigger intentional errors
   # Verify Sentry + Slack alerts
   ```

### Test Escalation (Quarterly)

1. Trigger P0 alert
2. Do not acknowledge as primary on-call
3. Verify secondary receives page after 15 minutes
4. Document response times

## Alert Tuning

### Weekly Review

- Review false positive rate
- Adjust thresholds if needed
- Remove noisy alerts
- Add missing coverage

### Monthly Metrics

- Alert frequency by severity
- Time to acknowledge
- Time to resolution
- False positive rate
- Alert fatigue indicators

### Quarterly Optimization

- Review all alert rules
- Consolidate redundant alerts
- Update thresholds based on baselines
- Improve runbook documentation

## Runbooks

Each alert should have a runbook in the wiki:

- **Symptoms**: How to identify the issue
- **Impact**: What users experience
- **Diagnosis**: How to investigate
- **Resolution**: Step-by-step fix procedure
- **Prevention**: How to prevent recurrence

### Example Runbook Format

```markdown
# Runbook: ALERT-001 Application Down

## Symptoms
- Health check endpoint returns 503
- Users cannot access application
- PagerDuty alert fired

## Impact
- Complete service outage
- All users affected

## Diagnosis
1. Check server status in hosting dashboard
2. Review deployment logs for recent changes
3. Check database connectivity
4. Review error logs in Sentry

## Resolution
1. If recent deployment: Rollback immediately
2. If database issue: Follow database recovery procedure
3. If infrastructure issue: Contact hosting support
4. If traffic spike: Scale infrastructure

## Prevention
- Improve deployment testing
- Implement blue-green deployments
- Add pre-deployment health checks
```

## Alert Acknowledgment

When acknowledging an alert:

1. **Acknowledge in PagerDuty** (if paged)
2. **Post status in Slack**:
   ```
   🚨 ALERT-001: Application Down - ACKNOWLEDGED
   👤 Owner: @engineer
   🔍 Investigating...
   ```
3. **Update every 15 minutes** with progress
4. **Mark resolved** when fixed:
   ```
   ✅ ALERT-001: Application Down - RESOLVED
   🛠️ Root cause: Database connection pool exhausted
   ⏱️ TTR: 12 minutes
   📋 Post-mortem: [link]
   ```

## Post-Incident Review

After every P0 or repeated P1 incident:

1. **Schedule post-mortem** within 48 hours
2. **Document**:
   - Timeline of events
   - Root cause analysis
   - Resolution steps
   - Action items to prevent recurrence
3. **Share with team** in Slack + wiki
4. **Track action items** to completion

## References

- [Monitoring Strategy](./MONITORING_STRATEGY.md)
- [Monitoring Dashboard](./MONITORING_DASHBOARD.md)
- [Incident Response Playbook](./MONITORING_STRATEGY.md#incident-response-playbook)
- [PagerDuty Documentation](https://support.pagerduty.com/)
- [Sentry Alerts](https://docs.sentry.io/product/alerts/)

## Alert Checklist

- [ ] Sentry alert rules configured
- [ ] BetterStack alert rules configured
- [ ] PagerDuty service created
- [ ] Slack channels created and integrated
- [ ] On-call rotation scheduled in PagerDuty
- [ ] Escalation policy configured
- [ ] Runbooks documented for critical alerts
- [ ] Alert testing procedure scheduled
- [ ] Post-incident review process established
- [ ] Weekly alert review scheduled
