# Application Performance Monitoring (APM) Setup

**Purpose:** Configure distributed tracing and performance monitoring for the Holi Labs EMR platform.

**Recommended APM Tools:**
- **Primary**: DataDog APM (recommended for healthcare apps)
- **Alternative**: New Relic APM
- **Budget**: OpenTelemetry + Jaeger (self-hosted)

---

## Overview

APM provides:
- **Distributed Tracing**: Track requests across services
- **Performance Monitoring**: Identify slow endpoints and queries
- **Error Tracking**: Deep stack traces and context
- **Resource Profiling**: CPU, memory, I/O usage
- **Custom Metrics**: Business-specific measurements

---

## Option 1: DataDog APM (Recommended)

### Advantages
- ✅ Healthcare-focused features
- ✅ HIPAA compliance available (BAA required)
- ✅ Excellent Node.js support
- ✅ Database query tracing
- ✅ Real-time alerting

### Setup Instructions

#### Step 1: Install DataDog Agent

```bash
# Install DataDog agent on application server
DD_API_KEY=<your-api-key> \
DD_SITE="datadoghq.com" \
bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script_agent7.sh)"

# Enable APM in agent config
sudo nano /etc/datadog-agent/datadog.yaml

# Add these lines:
# apm_config:
#   enabled: true
#   apm_non_local_traffic: true
#   max_traces_per_second: 100

# Restart agent
sudo systemctl restart datadog-agent

# Verify agent is running
sudo systemctl status datadog-agent
```

#### Step 2: Install Node.js Tracer

```bash
# Add DataDog tracing package
cd /path/to/holilabsv2/apps/web
pnpm add dd-trace
```

#### Step 3: Configure Tracing

Create tracer configuration file:

```typescript
// File: apps/web/src/lib/monitoring/datadog.ts

import tracer from 'dd-trace';

// Initialize tracer BEFORE any other imports
if (process.env.NODE_ENV === 'production' && process.env.DD_TRACE_ENABLED === 'true') {
  tracer.init({
    // Service name
    service: 'holi-api',
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',

    // Enable profiling
    profiling: true,
    runtimeMetrics: true,

    // Sampling rate (100% for now, adjust based on traffic)
    sampleRate: 1.0,

    // Log injection (adds trace IDs to logs)
    logInjection: true,

    // Enable specific integrations
    plugins: true,

    // Database query tracing
    dbmPropagationMode: 'full',

    // Custom tags
    tags: {
      'team': 'engineering',
      'application': 'holi-emr',
      'hipaa': 'true',
    },
  });

  console.log('✓ DataDog APM initialized');
}

export default tracer;
```

#### Step 4: Import Tracer in Application Entry Point

```typescript
// File: apps/web/src/instrumentation.ts (Next.js 13+)

// MUST be first import
import './lib/monitoring/datadog';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side initialization
    console.log('Server instrumentation loaded');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime initialization (if applicable)
    console.log('Edge instrumentation loaded');
  }
}
```

Or for Next.js 12 and earlier:

```typescript
// File: apps/web/server.ts or apps/web/pages/_app.tsx

// MUST be very first import
import './lib/monitoring/datadog';

// Rest of your application imports...
```

#### Step 5: Add Custom Spans

```typescript
// Example: apps/web/src/app/api/patients/route.ts

import tracer from '@/lib/monitoring/datadog';

export async function GET(request: NextRequest) {
  // Create custom span
  const span = tracer.startSpan('patients.list', {
    resource: 'GET /api/patients',
    tags: {
      'http.method': 'GET',
      'http.url': request.url,
    },
  });

  try {
    const session = await getServerSession(authOptions);

    // Add user context to span
    span.setTag('user.id', session?.user?.id);
    span.setTag('user.role', session?.user?.role);

    // Your logic here
    const patients = await prisma.patient.findMany({
      take: 50,
    });

    span.setTag('patients.count', patients.length);

    return NextResponse.json({ data: patients });
  } catch (error) {
    // Record error in span
    span.setTag('error', true);
    span.setTag('error.message', error.message);

    throw error;
  } finally {
    // Always finish span
    span.finish();
  }
}
```

#### Step 6: Environment Variables

```bash
# Add to .env.production

# DataDog APM
DD_TRACE_ENABLED=true
DD_API_KEY=<your-datadog-api-key>
DD_SITE=datadoghq.com
DD_SERVICE=holi-api
DD_ENV=production
DD_VERSION=1.0.0
DD_LOGS_INJECTION=true
DD_PROFILING_ENABLED=true
DD_RUNTIME_METRICS_ENABLED=true

# Database monitoring
DD_DBM_PROPAGATION_MODE=full
```

#### Step 7: Deploy Configuration

```bash
# DigitalOcean App Platform
doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    envs:
      - key: DD_TRACE_ENABLED
        value: "true"
      - key: DD_API_KEY
        value: "$DD_API_KEY"
      - key: DD_SITE
        value: "datadoghq.com"
      - key: DD_SERVICE
        value: "holi-api"
      - key: DD_ENV
        value: "production"
EOF

# Restart application
doctl apps create-deployment <app-id>
```

#### Step 8: Verify in DataDog

```markdown
1. Login to DataDog: https://app.datadoghq.com
2. Navigate to APM > Services
3. Verify "holi-api" service appears
4. Click service to view:
   - Request throughput
   - Latency (p50, p75, p95, p99)
   - Error rate
   - Traces
```

---

## Option 2: New Relic APM

### Setup Instructions

```bash
# Install New Relic agent
pnpm add newrelic

# Create newrelic.js configuration
cat > apps/web/newrelic.js <<'EOF'
'use strict'

exports.config = {
  app_name: ['Holi EMR API'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info'
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*'
    ]
  },
  distributed_tracing: {
    enabled: true
  },
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated',
    explain_threshold: 500
  },
  error_collector: {
    enabled: true,
    ignore_status_codes: [401, 404]
  },
}
EOF

# Import at app entry point
# First line of apps/web/src/instrumentation.ts:
# require('newrelic');
```

---

## Option 3: OpenTelemetry + Jaeger (Self-Hosted)

### Advantages
- ✅ Open source, no vendor lock-in
- ✅ Full control over data
- ✅ No per-host fees
- ❌ Requires infrastructure management

### Setup Instructions

#### Step 1: Deploy Jaeger

```yaml
# File: infra/monitoring/jaeger-deployment.yml

version: '3'
services:
  jaeger:
    image: jaegertracing/all-in-one:1.51
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
      - COLLECTOR_OTLP_ENABLED=true
    ports:
      - "5775:5775/udp"   # agent zipkin.thrift
      - "6831:6831/udp"   # agent jaeger.thrift compact
      - "6832:6832/udp"   # agent jaeger.thrift binary
      - "5778:5778"       # agent configs
      - "16686:16686"     # UI
      - "14268:14268"     # collector HTTP
      - "14250:14250"     # collector gRPC
      - "9411:9411"       # collector Zipkin
      - "4317:4317"       # OTLP gRPC
      - "4318:4318"       # OTLP HTTP
    restart: unless-stopped
```

```bash
# Deploy Jaeger
docker-compose -f infra/monitoring/jaeger-deployment.yml up -d

# Verify Jaeger UI
curl http://localhost:16686
```

#### Step 2: Install OpenTelemetry

```bash
# Install OpenTelemetry packages
pnpm add @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-grpc
```

#### Step 3: Configure OpenTelemetry

```typescript
// File: apps/web/src/lib/monitoring/opentelemetry.ts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'holi-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
  }),
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Disable file system instrumentation
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingPaths: ['/api/health', '/api/metrics'],
      },
    }),
  ],
});

sdk.start();

console.log('✓ OpenTelemetry tracing initialized');

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

export default sdk;
```

---

## Monitored Metrics

### 1. Request Metrics

**Automatically Captured:**
- Request rate (requests/second)
- Response time (p50, p75, p95, p99, max)
- Error rate (%)
- HTTP status codes (2xx, 4xx, 5xx)
- Request size (bytes)
- Response size (bytes)

### 2. Database Metrics

**Automatically Captured:**
- Query execution time
- Query count
- Slow queries (>1s)
- Connection pool usage
- Database errors

**Example Slow Query Alert:**
```typescript
// Prisma middleware to track slow queries
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();

  const duration = after - before;

  if (duration > 1000) {
    // Log slow query
    console.warn('[SLOW QUERY]', {
      model: params.model,
      action: params.action,
      duration: `${duration}ms`,
    });

    // Send custom metric to APM
    tracer.gauge('database.query.duration', duration, {
      model: params.model,
      action: params.action,
      slow: 'true',
    });
  }

  return result;
});
```

### 3. Custom Business Metrics

```typescript
// File: apps/web/src/lib/monitoring/custom-metrics.ts

import tracer from './datadog';

export function trackPatientCreated(userId: string, patientId: string) {
  tracer.increment('patients.created', 1, {
    userId,
    role: getUserRole(userId),
  });
}

export function trackAppointmentBooked(duration: number) {
  tracer.histogram('appointments.booking.duration', duration);
  tracer.increment('appointments.booked', 1);
}

export function trackPrescriptionCreated(medication: string) {
  tracer.increment('prescriptions.created', 1, {
    medication: medication.toLowerCase(),
  });
}

export function trackEmailSent(provider: 'resend' | 'sendgrid', success: boolean) {
  tracer.increment('email.sent', 1, {
    provider,
    success: success.toString(),
  });
}

export function trackAuthFailure(reason: string) {
  tracer.increment('auth.failures', 1, {
    reason,
  });
}

// Usage example:
// import { trackPatientCreated } from '@/lib/monitoring/custom-metrics';
// trackPatientCreated(session.user.id, patient.id);
```

---

## APM Dashboards

### DataDog Dashboards

Create custom dashboard:

```json
{
  "title": "Holi EMR - API Performance",
  "widgets": [
    {
      "definition": {
        "title": "API Request Rate",
        "type": "timeseries",
        "requests": [{
          "q": "sum:trace.web.request.hits{service:holi-api}.as_rate()",
          "display_type": "line"
        }]
      }
    },
    {
      "definition": {
        "title": "API Latency (p95)",
        "type": "timeseries",
        "requests": [{
          "q": "p95:trace.web.request.duration{service:holi-api}",
          "display_type": "line"
        }]
      }
    },
    {
      "definition": {
        "title": "Error Rate",
        "type": "timeseries",
        "requests": [{
          "q": "sum:trace.web.request.errors{service:holi-api}.as_rate()",
          "display_type": "bars",
          "style": { "palette": "red" }
        }]
      }
    },
    {
      "definition": {
        "title": "Database Query Time",
        "type": "timeseries",
        "requests": [{
          "q": "avg:trace.prisma.query.duration{service:holi-api}",
          "display_type": "line"
        }]
      }
    },
    {
      "definition": {
        "title": "Slowest Endpoints (Top 10)",
        "type": "toplist",
        "requests": [{
          "q": "top(avg:trace.web.request.duration{service:holi-api} by {resource_name}, 10, 'mean', 'desc')"
        }]
      }
    },
    {
      "definition": {
        "title": "Error Breakdown by Endpoint",
        "type": "timeseries",
        "requests": [{
          "q": "sum:trace.web.request.errors{service:holi-api} by {resource_name}.as_rate()",
          "display_type": "bars"
        }]
      }
    }
  ]
}
```

---

## Alert Configuration

### Critical Alerts (PagerDuty)

```yaml
# DataDog Monitor: High Error Rate
name: "API Error Rate High"
type: metric alert
query: "sum(last_5m):sum:trace.web.request.errors{service:holi-api}.as_rate() > 10"
message: |
  🚨 API error rate is high: {{value}} errors/second

  Check:
  - Sentry for error details
  - Recent deployments
  - Database status

  @pagerduty-holi-ops
thresholds:
  critical: 10  # 10 errors/sec
  warning: 5    # 5 errors/sec

# DataDog Monitor: High Latency
name: "API Latency High (p95)"
type: metric alert
query: "avg(last_10m):p95:trace.web.request.duration{service:holi-api} > 2000"
message: |
  ⚠️ API p95 latency is high: {{value}}ms (target: <500ms)

  Check:
  - Slow queries in APM traces
  - Database connection pool
  - Resource utilization

  @pagerduty-holi-ops
thresholds:
  critical: 2000  # 2 seconds
  warning: 1000   # 1 second
```

### Warning Alerts (Slack)

```yaml
# Slow Database Queries
name: "Slow Database Queries Detected"
type: metric alert
query: "sum(last_15m):sum:database.query.duration{service:holi-api,slow:true} > 50"
message: |
  🐌 Detected {{value}} slow database queries (>1s) in last 15 minutes

  Review APM traces to identify queries needing optimization.

  @slack-holi-engineering
thresholds:
  warning: 50

# High Memory Usage
name: "High Memory Usage"
type: metric alert
query: "avg(last_10m):system.mem.pct_usable{service:holi-api} < 0.15"
message: |
  💾 Memory usage high: {{value}}% free (target: >15%)

  Possible memory leak. Review heap snapshots.

  @slack-holi-engineering
thresholds:
  warning: 0.15  # 15% free
  critical: 0.05  # 5% free
```

---

## Trace Sampling

For high-traffic applications, sample traces to reduce costs:

```typescript
// Dynamic sampling based on traffic
tracer.init({
  sampleRate: (span) => {
    // Always sample errors
    if (span.context().tags.error) {
      return 1.0;  // 100%
    }

    // Always sample slow requests (>1s)
    if (span.context().tags['http.duration'] > 1000) {
      return 1.0;
    }

    // Sample normal requests at 10%
    return 0.1;
  },
});
```

---

## Best Practices

### 1. Tag Consistently

```typescript
// Always add these tags to spans
span.setTag('user.id', userId);
span.setTag('user.role', userRole);
span.setTag('resource.type', 'Patient');
span.setTag('resource.id', patientId);
span.setTag('action', 'READ');
```

### 2. Don't Trace Sensitive Data

```typescript
// ❌ BAD: Exposing PHI in traces
span.setTag('patient.name', patient.firstName);  // PHI!
span.setTag('patient.ssn', patient.ssn);  // HIPAA violation!

// ✅ GOOD: Use IDs only
span.setTag('patient.id', patient.id);  // OK
span.setTag('patient.age_band', getAgeBand(patient.dateOfBirth));  // Deidentified, OK
```

### 3. Instrument Critical Paths

**Must instrument:**
- Patient data access
- Prescription creation
- Appointment booking
- Payment processing
- Email sending

### 4. Monitor Third-Party APIs

```typescript
import { Span } from 'dd-trace';

async function callResendAPI(emailData: EmailData) {
  const span = tracer.startSpan('external.resend.send_email');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailData),
    });

    span.setTag('http.status_code', response.status);
    span.setTag('external.service', 'resend');

    return response;
  } catch (error) {
    span.setTag('error', true);
    throw error;
  } finally {
    span.finish();
  }
}
```

---

## Troubleshooting

### APM Not Showing Data

```bash
# Check tracer is initialized
# Should see log on startup: "✓ DataDog APM initialized"

# Check agent is running
sudo systemctl status datadog-agent

# Check agent logs
sudo tail -f /var/log/datadog/agent.log

# Check traces are being sent
curl http://localhost:8126/debug/vars

# Verify DD_TRACE_ENABLED=true
echo $DD_TRACE_ENABLED
```

### High Overhead

```typescript
// Reduce sampling rate
tracer.init({
  sampleRate: 0.1,  // Sample 10% of requests
});

// Disable profiling if not needed
tracer.init({
  profiling: false,
  runtimeMetrics: false,
});
```

---

## Related Documentation
- [Synthetic Monitoring Setup](./synthetic-monitoring.md)
- [Business Metrics Dashboard](./business-metrics-dashboard.md)
- [Performance Degradation Runbook](../runbooks/performance-degradation.md)

---

## Changelog
- **2024-01-07**: Initial version created
