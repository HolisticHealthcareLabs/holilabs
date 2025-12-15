# Monitoring Dashboard Configuration

## Overview

This document provides detailed specifications for creating comprehensive monitoring dashboards for Holi Labs. These dashboards provide real-time visibility into application health, performance, and business metrics.

## Dashboard Overview

We recommend creating 4 primary dashboards:

1. **System Health Dashboard** - Overall application health
2. **Performance Dashboard** - Response times, throughput, errors
3. **Clinical Operations Dashboard** - Healthcare-specific metrics
4. **Business Metrics Dashboard** - User activity, feature usage, costs

## Dashboard 1: System Health

**Purpose**: Quick overview of system status for on-call engineers

**Refresh Rate**: 30 seconds

**Time Range**: Last 1 hour (with option for 24h, 7d)

### Widgets

#### 1.1 Health Status Overview (Big Numbers)

**Type**: Stat Panel (4 metrics)

```
┌─────────────────────────────────────────────────────┐
│ APPLICATION    DATABASE     REDIS        CDSS       │
│    ✅ UP        ✅ UP        ✅ UP        ✅ HEALTHY │
│                                                      │
│ Uptime: 99.9%  Latency:     Hit Rate:   Eval Time: │
│                45ms         82%          1.2s       │
└─────────────────────────────────────────────────────┘
```

**Data Sources**:
- Application: `/api/health` endpoint (200 OK)
- Database: `/api/health` - `services.database: true`
- Redis: `/api/health/ready` - `checks.redis.status`
- CDSS: `/api/cds/metrics` - `status`

**Color Coding**:
- Green: Healthy
- Yellow: Degraded
- Red: Unhealthy

---

#### 1.2 Active Alerts (Table)

**Type**: Table

```
┌──────────────────────────────────────────────────────────────┐
│ Severity | Alert Name              | Duration | Status        │
├──────────────────────────────────────────────────────────────┤
│ P1       | High Latency            | 5m       | Investigating │
│ P2       | Cache Hit Rate Low      | 12m      | Acknowledged  │
└──────────────────────────────────────────────────────────────┘
```

**Data Source**: Sentry or PagerDuty API

**Columns**:
- Severity (P0, P1, P2)
- Alert Name
- Duration (how long alert has been active)
- Status (New, Acknowledged, Investigating, Resolved)

**Auto-refresh**: 30 seconds

---

#### 1.3 Request Rate (Time Series)

**Type**: Line Graph

```
┌──────────────────────────────────────────────────────────────┐
│ Requests per Minute                                          │
│                                                              │
│ 150 ┤                           ╭─╮                          │
│     │                       ╭───╯ ╰─╮                        │
│ 100 ┤                   ╭───╯       ╰──╮                     │
│     │               ╭───╯              ╰──╮                  │
│  50 ┤           ╭───╯                    ╰─────              │
│     │       ╭───╯                                            │
│   0 ┴───────╯                                                │
│     └────────────────────────────────────────────────────────│
│     10:00  10:15  10:30  10:45  11:00  11:15  11:30  11:45  │
└──────────────────────────────────────────────────────────────┘
```

**Metrics**:
- Total requests per minute
- Success (2xx, 3xx) - Green line
- Client errors (4xx) - Yellow line
- Server errors (5xx) - Red line

**Y-Axis**: Requests/minute
**X-Axis**: Time (last 1 hour)

**Annotations**: Mark deployments with vertical line

---

#### 1.4 Error Rate (Time Series)

**Type**: Line Graph with threshold

```
┌──────────────────────────────────────────────────────────────┐
│ Error Rate (%)                                               │
│                                                              │
│ 5% ┤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ CRITICAL THRESHOLD  │
│    │                                                         │
│ 1% ┤- - - - - - - - - - - - - - - - - - - WARNING THRESHOLD │
│    │            ╭╮                                           │
│ 0% ┼────────────╯╰───────────────────────────────────       │
│    └────────────────────────────────────────────────────────│
│    10:00  10:15  10:30  10:45  11:00  11:15  11:30  11:45  │
└──────────────────────────────────────────────────────────────┘
```

**Metrics**:
- Error rate percentage: `(5xx_errors / total_requests) * 100`

**Thresholds**:
- Yellow line at 1% (warning)
- Red line at 5% (critical)

**Alert Integration**: Show when alert fires

---

#### 1.5 Response Time (Time Series)

**Type**: Line Graph (multiple percentiles)

```
┌──────────────────────────────────────────────────────────────┐
│ Response Time (ms)                                           │
│                                                              │
│ 5000 ┤                                                       │
│      │                                              p99 ──── │
│ 3000 ┤- - - - - - - - - - - - - - - - - - - THRESHOLD       │
│      │                                   p95 ─────           │
│ 2000 ┤                              p95 ────                 │
│      │                         p50 ─────                     │
│ 1000 ┤                    p50 ────                           │
│      │               p50 ────                                │
│    0 ┴───────────────────────────────────────────────────    │
│      └────────────────────────────────────────────────────   │
│      10:00  10:15  10:30  10:45  11:00  11:15  11:30  11:45 │
└──────────────────────────────────────────────────────────────┘
```

**Metrics**:
- p50 (median) - Green
- p95 - Yellow
- p99 - Red

**Threshold**: Horizontal line at 3000ms (P1 alert threshold)

---

#### 1.6 Infrastructure Status (Status Grid)

**Type**: Grid of status indicators

```
┌────────────────────────────────────────────────────────┐
│ External Services                                      │
├────────────────────────────────────────────────────────┤
│ ✅ Supabase       ✅ Twilio        ✅ RxNav API        │
│ ✅ Gemini AI      ✅ Resend        ✅ Upstash Redis    │
│ ✅ Sentry         ✅ PostgreSQL    ✅ BetterStack      │
└────────────────────────────────────────────────────────┘
```

**Data Sources**:
- `/api/health/ready` for internal services
- Status page APIs for external services
- Custom health checks

**Update Frequency**: 1 minute

---

## Dashboard 2: Performance

**Purpose**: Detailed performance analysis for engineers

**Refresh Rate**: 1 minute

**Time Range**: Last 4 hours (with option for 24h, 7d, 30d)

### Widgets

#### 2.1 Endpoint Performance Table

**Type**: Table (sortable)

```
┌───────────────────────────────────────────────────────────────────────┐
│ Endpoint            │ Requests │ p50  │ p95  │ p99   │ Error Rate   │
├───────────────────────────────────────────────────────────────────────┤
│ /api/patients       │ 12,450   │ 245ms│ 890ms│ 1.2s  │ 0.1%         │
│ /api/ai/insights    │ 8,234    │ 1.2s │ 3.4s │ 5.8s  │ 0.3%         │
│ /api/cds/evaluate   │ 5,678    │ 800ms│ 2.1s │ 4.2s  │ 0.2%         │
│ /api/appointments   │ 3,456    │ 180ms│ 450ms│ 890ms │ 0.05%        │
└───────────────────────────────────────────────────────────────────────┘
```

**Columns**:
- Endpoint path
- Total requests (last 1 hour)
- p50 latency
- p95 latency
- p99 latency
- Error rate percentage

**Sorting**: Default by p95 latency (descending)

**Color Coding**:
- Green: p95 < 2s
- Yellow: p95 2s-3s
- Red: p95 > 3s

---

#### 2.2 Database Performance

**Type**: Multi-stat panel

```
┌──────────────────────────────────────────────────────────────┐
│ Query Latency      Active Connections    Slow Queries        │
│   45ms             12 / 100              3                   │
│   ↓ 12%            ↑ 2                  ↑ 1                 │
└──────────────────────────────────────────────────────────────┘
```

**Metrics**:
- Average query latency
- Active connections (current / max)
- Slow queries (> 1s) in last hour
- Change indicators (arrows)

**Data Source**:
- `/api/health` for latency
- Database provider metrics API
- Application logs for slow queries

---

#### 2.3 Cache Performance

**Type**: Donut chart + stats

```
┌──────────────────────────────────────────────────────────────┐
│ Cache Performance                                            │
│                                                              │
│      ╭───────╮           Hit Rate:  82%                     │
│    ╭─┤       │─╮         Hits:      12,450                  │
│   ╭──┤       │──╮        Misses:    2,734                   │
│   │  │  82%  │  │        Errors:    5                       │
│   ╰──┤       │──╯        Evictions: 123                     │
│    ╰─┤       │─╯                                            │
│      ╰───────╯           Circuit Breaker: CLOSED            │
└──────────────────────────────────────────────────────────────┘
```

**Data Source**: `/api/cds/metrics` - `cacheMetrics`

**Color Coding**:
- Green: Hit rate > 70%
- Yellow: Hit rate 50-70%
- Red: Hit rate < 50%

---

#### 2.4 CDSS Evaluation Times (Histogram)

**Type**: Histogram

```
┌──────────────────────────────────────────────────────────────┐
│ CDSS Evaluation Time Distribution                            │
│                                                              │
│ 50 ┤ ███                                                     │
│    │ ███                                                     │
│ 40 ┤ ███  ████                                              │
│    │ ███  ████                                              │
│ 30 ┤ ███  ████  ███                                         │
│    │ ███  ████  ███  ██                                     │
│ 20 ┤ ███  ████  ███  ██  █                                 │
│    │ ███  ████  ███  ██  █  █                              │
│ 10 ┤ ███  ████  ███  ██  █  █  █                           │
│    │ ███  ████  ███  ██  █  █  █                           │
│  0 ┴───────────────────────────────────────────────────────  │
│    0-1s 1-2s 2-3s 3-4s 4-5s >5s                             │
└──────────────────────────────────────────────────────────────┘
```

**Buckets**:
- 0-1s (target)
- 1-2s (acceptable)
- 2-3s (warning)
- 3-5s (degraded)
- >5s (critical)

**Target**: >90% of evaluations < 2s

---

#### 2.5 API Response Time by Endpoint (Heatmap)

**Type**: Heatmap

```
┌──────────────────────────────────────────────────────────────┐
│              00:00  06:00  12:00  18:00  24:00              │
├──────────────────────────────────────────────────────────────┤
│ /api/patients  [█] [█] [██] [██] [█]                        │
│ /api/ai/*      [█] [█] [███][███][██]                       │
│ /api/cds/*     [█] [█] [██] [██] [█]                        │
│ /api/appts     [░] [░] [█]  [█]  [░]                        │
└──────────────────────────────────────────────────────────────┘
```

**Legend**:
- ░ Light: < 1s
- █ Dark: 1-2s
- ██ Darker: 2-3s
- ███ Darkest: > 3s

**Time Range**: Last 24 hours in 1-hour buckets

---

## Dashboard 3: Clinical Operations

**Purpose**: Healthcare-specific metrics for clinical staff

**Refresh Rate**: 1 minute

**Time Range**: Last 24 hours (with option for 7d, 30d)

### Widgets

#### 3.1 Patient Activity (Big Number)

**Type**: Stat Panel

```
┌──────────────────────────────────────────────────────────────┐
│ Active Patients Today            Records Accessed            │
│      127                               1,234                 │
│      ↑ 12%                            ↑ 8%                  │
└──────────────────────────────────────────────────────────────┘
```

---

#### 3.2 CDSS Insights Generated (Time Series)

**Type**: Stacked area chart

```
┌──────────────────────────────────────────────────────────────┐
│ AI Insights by Priority                                      │
│                                                              │
│ 100 ┤                                                        │
│     │                                              ████████  │ Critical
│  80 ┤                                        ██████████████  │ High
│     │                                  ████████████████████  │ Medium
│  60 ┤                            ████████████████████████    │ Low
│     │                      ████████████████████████████      │
│  40 ┤                ████████████████████████████            │
│     │          ████████████████████████████                  │
│  20 ┤    ████████████████████████████                        │
│     │████████████████████████                                │
│   0 ┴────────────────────────────────────────────────────    │
│     00:00     06:00     12:00     18:00     24:00           │
└──────────────────────────────────────────────────────────────┘
```

**Breakdown by priority**: Critical, High, Medium, Low

**Data Source**: CDSS service logs

---

#### 3.3 Prescription Processing (Funnel)

**Type**: Funnel chart

```
┌──────────────────────────────────────────────────────────────┐
│ Prescription Workflow                                        │
│                                                              │
│ Created        ████████████████████████████ 100% (245)      │
│                                                              │
│ Signed         ███████████████████████ 94% (230)            │
│                                                              │
│ Sent           ██████████████████████ 92% (225)             │
│                                                              │
│ Confirmed      ████████████████████ 88% (215)               │
└──────────────────────────────────────────────────────────────┘
```

**Stages**:
- Prescriptions created
- Prescriptions signed by clinician
- Sent to pharmacy
- Confirmed by pharmacy

**Conversion rates** at each stage

---

#### 3.4 Review Queue Status (Gauge)

**Type**: Gauge + stat

```
┌──────────────────────────────────────────────────────────────┐
│ AI Review Queue Depth                                        │
│                                                              │
│            ╭──────╮                                          │
│          ╭─┤  23  │─╮            Target: < 20               │
│         ╭──┤      │──╮           Average Wait: 45 min       │
│        ╭───┤      │───╮          Oldest Item: 2h 15m        │
│        │   │      │   │                                      │
│        ╰───┴──────┴───╯          Status: ⚠️ Warning         │
│     0      25     50      100                               │
└──────────────────────────────────────────────────────────────┘
```

**Thresholds**:
- Green: 0-20 items
- Yellow: 21-50 items
- Red: > 50 items

---

#### 3.5 Appointment Metrics (Bar Chart)

**Type**: Grouped bar chart

```
┌──────────────────────────────────────────────────────────────┐
│ Appointments by Status (Last 7 Days)                         │
│                                                              │
│ 50 ┤                                                         │
│    │   ██                                                    │
│ 40 ┤   ██  ██                                               │
│    │   ██  ██  ██                                           │
│ 30 ┤   ██  ██  ██  ██                                       │
│    │   ██  ██  ██  ██  ██                                   │
│ 20 ┤   ██  ██  ██  ██  ██  ██                              │
│    │   ██  ██  ██  ██  ██  ██  ██                          │
│ 10 ┤   ██  ██  ██  ██  ██  ██  ██                          │
│    │   ██  ██  ██  ██  ██  ██  ██                          │
│  0 ┴───────────────────────────────────────────────────      │
│    Mon Tue Wed Thu Fri Sat Sun                              │
│                                                              │
│    █ Scheduled  █ Completed  █ Cancelled  █ No-show        │
└──────────────────────────────────────────────────────────────┘
```

**Metrics per day**:
- Scheduled (blue)
- Completed (green)
- Cancelled (yellow)
- No-show (red)

---

#### 3.6 Authentication Success Rate (Pie Chart)

**Type**: Pie chart + stats

```
┌──────────────────────────────────────────────────────────────┐
│ Authentication Events (24h)                                  │
│                                                              │
│        ╭─────────╮                                           │
│      ╭─┤         │                                           │
│     ╭──┤         │    Success:  98.5% (1,234)              │
│     │  │  98.5%  │    Failed:    1.2% (15)                 │
│     ╰──┤         │    Locked:    0.3% (4)                  │
│      ╰─┤         │                                           │
│        ╰─────────╯                                           │
└──────────────────────────────────────────────────────────────┘
```

**Categories**:
- Successful logins (green)
- Failed attempts (yellow)
- Account locked (red)

---

## Dashboard 4: Business Metrics

**Purpose**: Business intelligence for stakeholders

**Refresh Rate**: 5 minutes

**Time Range**: Last 30 days (with option for 90d, 1y)

### Widgets

#### 4.1 Key Metrics (Big Numbers)

**Type**: Stat Panel (with trends)

```
┌──────────────────────────────────────────────────────────────┐
│ Daily Active Users    AI Queries/Day    Revenue (MRR)       │
│      342                  1,245            $3,450           │
│      ↑ 15%               ↑ 23%            ↑ 8%             │
└──────────────────────────────────────────────────────────────┘
```

**Metrics**:
- Daily Active Users (DAU)
- AI queries per day
- Monthly Recurring Revenue (MRR)
- Change percentage vs. previous period

---

#### 4.2 User Growth (Line Chart)

**Type**: Line chart with trend line

```
┌──────────────────────────────────────────────────────────────┐
│ User Growth (30 Days)                                        │
│                                                              │
│ 400 ┤                                           ╭────────    │
│     │                                       ╭───╯            │
│ 300 ┤                                   ╭───╯                │
│     │                               ╭───╯                    │
│ 200 ┤                           ╭───╯                        │
│     │                       ╭───╯                            │
│ 100 ┤                   ╭───╯                                │
│     │               ╭───╯                                    │
│   0 ┴───────────────────────────────────────────────────     │
│     Day 1   Day 7   Day 14  Day 21  Day 28                  │
└──────────────────────────────────────────────────────────────┘
```

**Lines**:
- Total users (blue)
- Active users (green)
- New signups (yellow)

---

#### 4.3 Feature Usage (Bar Chart)

**Type**: Horizontal bar chart

```
┌──────────────────────────────────────────────────────────────┐
│ Feature Usage (% of Users)                                   │
│                                                              │
│ Patient Records   ████████████████████████████ 95%          │
│ AI Insights       █████████████████████ 78%                 │
│ CDSS              ████████████████ 65%                       │
│ E-Prescribing     █████████████ 58%                          │
│ Appointments      ██████████ 45%                             │
│ Messaging         ████████ 38%                               │
│ Telemedicine      ██████ 28%                                 │
└──────────────────────────────────────────────────────────────┘
```

**Sort by**: Most used features first

---

#### 4.4 AI Cost Tracking (Time Series)

**Type**: Stacked area chart with budget line

```
┌──────────────────────────────────────────────────────────────┐
│ AI Cost by Provider ($USD)                                   │
│                                                              │
│ 100 ┤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ MONTHLY BUDGET ($100) │
│     │                                              ████████  │
│  80 ┤                                        ██████████████  │ OpenAI
│     │                                  ████████████████████  │ Claude
│  60 ┤                            ████████████████████████    │ Gemini
│     │                      ████████████████████████████      │
│  40 ┤                ████████████████████████████            │
│     │          ████████████████████████████                  │
│  20 ┤    ████████████████████████████                        │
│     │████████████████████████                                │
│   0 ┴────────────────────────────────────────────────────    │
│     Week 1  Week 2  Week 3  Week 4                          │
└──────────────────────────────────────────────────────────────┘
```

**Breakdown by**:
- Gemini (primary) - Green
- Claude (fallback) - Blue
- OpenAI (secondary) - Orange

**Budget line**: Red horizontal line at monthly budget

---

#### 4.5 Cache Savings (Stat Panel)

**Type**: Stat with calculation

```
┌──────────────────────────────────────────────────────────────┐
│ Cost Savings from Caching                                    │
│                                                              │
│ This Month:    $67.50    (67.5% cost reduction)             │
│ Last Month:    $58.23    (58.2% cost reduction)             │
│ All Time:      $245.80   (62.1% average reduction)          │
│                                                              │
│ Cache Hit Rate: 82% → Saved 10,234 AI queries              │
└──────────────────────────────────────────────────────────────┘
```

**Calculation**: `(cache_hits * avg_query_cost)`

---

#### 4.6 Revenue by Plan (Donut Chart)

**Type**: Donut chart

```
┌──────────────────────────────────────────────────────────────┐
│ Revenue Distribution by Plan                                 │
│                                                              │
│        ╭───────╮                                             │
│      ╭─┤       │─╮      Enterprise: $2,100 (61%)           │
│     ╭──┤       │──╮     Pro:        $900 (26%)             │
│     │  │       │  │     Starter:    $350 (10%)             │
│     ╰──┤       │──╯     Free:       $100 (3%)              │
│      ╰─┤       │─╯                                          │
│        ╰───────╯        Total MRR: $3,450                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Dashboard Implementation

### Option 1: Grafana

**Pros**:
- Open source
- Powerful visualization
- Alert integration
- Multi-datasource support

**Setup**:
```bash
# Docker deployment
docker run -d -p 3000:3000 grafana/grafana

# Add data sources:
# - Prometheus (for metrics)
# - PostgreSQL (for database queries)
# - JSON API (for health endpoints)
```

**Dashboard Import**:
- Export dashboard JSON configs
- Store in `/monitoring/grafana-dashboards/`
- Import into Grafana instance

### Option 2: DataDog

**Pros**:
- All-in-one solution
- APM integration
- Log correlation
- Strong alerting

**Setup**:
```bash
# Install DataDog agent
DD_API_KEY=<your-key> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure APM
npm install --save dd-trace
```

**Environment Variables**:
```bash
DD_API_KEY="your-api-key"
DD_APP_KEY="your-app-key"
DD_SERVICE="holi-labs"
DD_ENV="production"
```

### Option 3: Custom Dashboard

**Tech Stack**:
- Next.js admin page
- React Query for data fetching
- Recharts for visualization
- TailwindCSS for styling

**Implementation**:
```typescript
// /app/admin/monitoring/page.tsx
export default function MonitoringDashboard() {
  const { data: health } = useQuery('/api/health');
  const { data: metrics } = useQuery('/api/cds/metrics');

  return (
    <div className="grid grid-cols-3 gap-4">
      <HealthWidget data={health} />
      <MetricsWidget data={metrics} />
      {/* More widgets */}
    </div>
  );
}
```

## Data Sources

### Health Endpoints

Already implemented:
- `/api/health` - Main health check
- `/api/health/live` - Liveness probe
- `/api/health/ready` - Readiness probe
- `/api/cds/metrics` - CDSS metrics

### Application Logs

Source: Pino logger → BetterStack

Query examples:
```
# Error rate
level:"error" | count by 5m

# Authentication failures
event:"auth_login_failed" | count by 1h

# Slow queries
duration:>1000 | count by 1h
```

### Sentry Metrics

Available via Sentry API:
- Error count by endpoint
- Transaction duration percentiles
- User-facing errors
- Release comparison

### Database Metrics

Source: PostgreSQL/Prisma
- Connection pool stats
- Query performance
- Table sizes
- Index usage

## Alert Integration

**Connect alerts to dashboards**:

1. **Visual indicators** when alerts fire
2. **Annotations** on time series graphs
3. **Alert history** table widget
4. **Click to acknowledge** from dashboard

Example annotation:
```
[10:45] 🚨 P1 Alert: High Latency (FIRING)
[10:58] ✅ P1 Alert: High Latency (RESOLVED)
```

## Mobile Dashboard

**Responsive design** for on-call engineers:

```
┌─────────────────────────┐
│ Holi Labs - Status      │
├─────────────────────────┤
│ ✅ All Systems Healthy  │
│                         │
│ Active Alerts:    0     │
│ Error Rate:       0.1%  │
│ Response Time:    890ms │
│                         │
│ [View Full Dashboard]   │
└─────────────────────────┘
```

**Features**:
- Summary view
- Critical metrics only
- One-tap alert acknowledgment
- Push notifications for P0 alerts

## Dashboard Access Control

**Roles**:
- **Admin**: Full access to all dashboards
- **Engineer**: Health + Performance + Clinical
- **Clinical Staff**: Clinical Operations only
- **Business**: Business Metrics only
- **On-Call**: Mobile-optimized view

**Authentication**: Same as application (NextAuth)

## Dashboard Maintenance

### Weekly Tasks
- Review dashboard accuracy
- Add/remove widgets based on needs
- Update thresholds
- Check data freshness

### Monthly Tasks
- Archive old dashboards
- Review metric definitions
- Optimize queries
- User feedback review

### Quarterly Tasks
- Major dashboard redesign if needed
- Add new metrics
- Remove deprecated metrics
- Performance optimization

## Dashboard Links

**Recommended External Services**:

1. **Sentry**: https://sentry.io/organizations/holi-labs/issues/
2. **BetterStack**: https://logs.betterstack.com/
3. **Database Provider**: Database metrics dashboard
4. **Status Page**: https://status.holilabs.xyz (create with StatusPage.io)

## Dashboard Checklist

- [ ] System Health Dashboard created
- [ ] Performance Dashboard created
- [ ] Clinical Operations Dashboard created
- [ ] Business Metrics Dashboard created
- [ ] Data sources connected
- [ ] Alerts integrated with dashboards
- [ ] Mobile view configured
- [ ] Access control configured
- [ ] Dashboard documentation created
- [ ] Team trained on dashboard usage
- [ ] Dashboard URLs bookmarked
- [ ] Scheduled reviews in calendar

## References

- [Grafana Documentation](https://grafana.com/docs/)
- [DataDog Dashboard Guide](https://docs.datadoghq.com/dashboards/)
- [Recharts Documentation](https://recharts.org/)
- [Health Check Endpoints](../src/app/api/health/)
- [CDSS Metrics Endpoint](../src/app/api/cds/metrics/route.ts)
