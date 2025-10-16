# 📊 Performance Monitoring Guide

**Purpose:** Monitor application performance, detect issues early, and optimize user experience

**Tools:** PostHog, Sentry, Browser DevTools, Lighthouse

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Key Performance Metrics](#key-performance-metrics)
3. [Monitoring Setup](#monitoring-setup)
4. [Performance Dashboards](#performance-dashboards)
5. [Alert Configuration](#alert-configuration)
6. [Performance Optimization](#performance-optimization)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

### Why Monitor Performance?

**User Experience:**
- Slow apps frustrate users
- 1 second delay = 7% conversion loss
- 53% users abandon if page takes >3s

**Clinical Impact:**
- Clinicians see 20-30 patients/day
- Saving 10 seconds per patient = 5-10 minutes/day
- Better performance = more time with patients

**Benchmarks:**
| Metric | Target | Good | Poor |
|--------|--------|------|------|
| **First Contentful Paint (FCP)** | <1.8s | <3s | >3s |
| **Largest Contentful Paint (LCP)** | <2.5s | <4s | >4s |
| **Time to Interactive (TTI)** | <3.8s | <7.3s | >7.3s |
| **Total Blocking Time (TBT)** | <200ms | <600ms | >600ms |
| **Cumulative Layout Shift (CLS)** | <0.1 | <0.25 | >0.25 |
| **API Response Time** | <200ms | <500ms | >1s |

---

## 📈 Key Performance Metrics

### 1. Frontend Performance

#### Core Web Vitals

**Largest Contentful Paint (LCP)**
- **What:** Time until main content is visible
- **Target:** <2.5 seconds
- **Impact:** User perceived load speed

**First Input Delay (FID)**
- **What:** Time until page responds to first interaction
- **Target:** <100ms
- **Impact:** Interactivity and responsiveness

**Cumulative Layout Shift (CLS)**
- **What:** Visual stability (elements moving around)
- **Target:** <0.1
- **Impact:** User frustration from unexpected shifts

#### Other Frontend Metrics

**First Contentful Paint (FCP)**
- **What:** Time until first text/image is visible
- **Target:** <1.8 seconds

**Time to Interactive (TTI)**
- **What:** Time until page is fully interactive
- **Target:** <3.8 seconds

**Speed Index**
- **What:** How quickly content is visually complete
- **Target:** <3.4 seconds

### 2. Backend Performance

**API Response Time**
```
GET /api/patients          Target: <200ms
POST /api/clinical-notes   Target: <500ms
POST /api/scribe/transcribe Target: <2s
GET /api/search            Target: <300ms
```

**Database Query Time**
```
Patient lookup by MRN:     <50ms
Full-text search:          <200ms
Complex joins:             <500ms
```

**External API Latency**
```
AssemblyAI transcription:  5-30s (async, acceptable)
Gemini AI generation:      2-10s (user sees progress)
Supabase storage upload:   <2s
```

### 3. Resource Metrics

**Bundle Size**
- **Total JS:** <300KB (gzipped)
- **Total CSS:** <50KB (gzipped)
- **First Load JS:** <200KB

**Memory Usage**
- **Heap size:** <100MB
- **Memory leaks:** Monitor over time

**Network Requests**
- **Count:** <50 requests per page
- **Total size:** <2MB

---

## 🔧 Monitoring Setup

### 1. PostHog Performance Monitoring

**Already configured!** PostHog automatically tracks:
- Page load times
- API response times (if instrumented)
- User interactions

**Enable Performance Monitoring:**

```typescript
// apps/web/src/lib/posthog.ts (already exists)

posthog.init(apiKey, {
  api_host: apiHost,

  // Performance monitoring (add if missing)
  capture_performance: true,

  // Session recordings (disabled for HIPAA)
  disable_session_recording: true,
});
```

**Track Custom Performance Metrics:**

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

export function PatientList() {
  const analytics = useAnalytics();

  useEffect(() => {
    const startTime = performance.now();

    fetchPatients().then(() => {
      const loadTime = performance.now() - startTime;

      analytics.track('patient_list_loaded', {
        loadTime: Math.round(loadTime),
        patientCount: patients.length,
      });
    });
  }, []);
}
```

### 2. Browser Performance API

**Track Page Performance:**

```typescript
// apps/web/src/hooks/usePagePerformance.ts (create this)

import { useEffect } from 'react';
import { useAnalytics } from './useAnalytics';

export function usePagePerformance(pageName: string) {
  const analytics = useAnalytics();

  useEffect(() => {
    // Wait for page to fully load
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (perfData) {
        analytics.track('page_performance', {
          page: pageName,
          // DNS + TCP + Request + Response
          loadTime: Math.round(perfData.loadEventEnd - perfData.fetchStart),
          // Time to interactive
          domInteractive: Math.round(perfData.domInteractive - perfData.fetchStart),
          // Time until DOM is ready
          domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart),
        });
      }

      // Track Core Web Vitals
      if ('PerformanceObserver' in window) {
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          analytics.track('web_vitals_lcp', {
            page: pageName,
            value: Math.round(lastEntry.startTime),
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entry = list.getEntries()[0];
          analytics.track('web_vitals_fid', {
            page: pageName,
            value: Math.round(entry.processingStart - entry.startTime),
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // Report CLS on page unload
        window.addEventListener('beforeunload', () => {
          analytics.track('web_vitals_cls', {
            page: pageName,
            value: clsValue,
          });
        });
      }
    });
  }, [pageName, analytics]);
}
```

**Usage in Pages:**

```typescript
// apps/web/src/app/dashboard/page.tsx

import { usePagePerformance } from '@/hooks/usePagePerformance';

export default function DashboardPage() {
  usePagePerformance('dashboard');

  return <div>...</div>;
}
```

### 3. API Performance Tracking

**Instrument API Routes:**

```typescript
// apps/web/src/lib/api/performance.ts (create this)

import { NextRequest, NextResponse } from 'next/server';

export function withPerformanceTracking(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  routeName: string
) {
  return async (req: NextRequest, context: any) => {
    const startTime = Date.now();

    try {
      const response = await handler(req, context);
      const duration = Date.now() - startTime;

      // Log performance (will be sent to BetterStack/Logtail)
      console.log({
        type: 'api_performance',
        route: routeName,
        method: req.method,
        duration,
        status: response.status,
        timestamp: new Date().toISOString(),
      });

      // Add performance header
      response.headers.set('X-Response-Time', `${duration}ms`);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error({
        type: 'api_error',
        route: routeName,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  };
}
```

**Usage in API Routes:**

```typescript
// apps/web/src/app/api/patients/route.ts

import { withPerformanceTracking } from '@/lib/api/performance';

async function handler(req: NextRequest) {
  // ... existing logic
}

export const GET = withPerformanceTracking(handler, '/api/patients');
```

### 4. Database Query Performance

**Log Slow Queries:**

```typescript
// packages/database/src/client.ts (modify existing)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

// Log slow queries (>500ms)
prisma.$on('query', (e) => {
  if (e.duration > 500) {
    console.warn({
      type: 'slow_query',
      query: e.query,
      duration: e.duration,
      params: e.params,
    });
  }
});

export { prisma };
```

---

## 📊 Performance Dashboards

### PostHog Dashboard: Frontend Performance

**Create Dashboard:**
1. PostHog → Dashboards → New Dashboard
2. Name: "Frontend Performance"

**Add Insights:**

**1. Page Load Times (Trend)**
- Event: `page_performance`
- Property: `loadTime` (average)
- Breakdown by: `page`
- Visualization: Line chart
- **Goal:** <2000ms

**2. Core Web Vitals - LCP**
- Event: `web_vitals_lcp`
- Property: `value` (p75)
- Breakdown by: `page`
- Visualization: Line chart
- **Goal:** <2500ms

**3. Core Web Vitals - FID**
- Event: `web_vitals_fid`
- Property: `value` (p75)
- Visualization: Line chart
- **Goal:** <100ms

**4. Core Web Vitals - CLS**
- Event: `web_vitals_cls`
- Property: `value` (p75)
- Visualization: Line chart
- **Goal:** <0.1

**5. Slowest Pages (Table)**
- Event: `page_performance`
- Property: `loadTime` (average)
- Group by: `page`
- Sort: Descending
- **Action:** Optimize top 3 slowest pages

### PostHog Dashboard: API Performance

**Create Dashboard:**
1. PostHog → Dashboards → New Dashboard
2. Name: "API Performance"

**Add Insights:**

**1. API Response Times (Trend)**
- Event: `api_call` (if tracked)
- Property: `duration` (average)
- Breakdown by: `endpoint`
- Visualization: Line chart

**2. API Error Rate**
- Event: `api_call`
- Formula: `(errors / total) * 100`
- Breakdown by: `endpoint`
- Visualization: Line chart
- **Goal:** <1%

**3. Slowest Endpoints (Table)**
- Event: `api_call`
- Property: `duration` (p95)
- Group by: `endpoint`
- Sort: Descending

### BetterStack/Logtail Dashboard

**If BetterStack is configured:**

1. **Log in to BetterStack**
2. **Create Dashboard:** "Holi Labs Performance"
3. **Add Widgets:**

**Widget 1: Average Response Time**
```sql
SELECT AVG(duration) as avg_response_time
FROM logs
WHERE type = 'api_performance'
AND timestamp > NOW() - INTERVAL 1 HOUR
GROUP BY route
```

**Widget 2: P95 Response Time**
```sql
SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95
FROM logs
WHERE type = 'api_performance'
AND timestamp > NOW() - INTERVAL 24 HOUR
```

**Widget 3: Slow Query Count**
```sql
SELECT COUNT(*) as slow_queries
FROM logs
WHERE type = 'slow_query'
AND timestamp > NOW() - INTERVAL 1 HOUR
```

---

## 🚨 Alert Configuration

### PostHog Alerts

**1. High Page Load Time Alert**

Settings:
- Metric: `page_performance.loadTime` (average)
- Condition: `> 3000` (3 seconds)
- Window: Last 1 hour
- Action: Send email to team

**2. API Error Rate Alert**

Settings:
- Metric: API error rate
- Condition: `> 5%`
- Window: Last 15 minutes
- Action: Send Slack notification + email

### BetterStack Alerts

**1. Slow API Response Alert**

```json
{
  "name": "Slow API Response",
  "query": "type:api_performance duration:>1000",
  "threshold": 10,
  "window": "5m",
  "actions": ["email", "slack"]
}
```

**2. Database Connection Error**

```json
{
  "name": "Database Connection Error",
  "query": "error:*connection* type:database",
  "threshold": 1,
  "window": "1m",
  "actions": ["email", "slack", "pagerduty"]
}
```

---

## ⚡ Performance Optimization

### Frontend Optimization

#### 1. Code Splitting

**Lazy Load Heavy Components:**

```typescript
// apps/web/src/app/dashboard/patients/[id]/page.tsx

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load heavy components
const ClinicalNotesEditor = dynamic(
  () => import('@/components/clinical-notes/ClinicalNotesEditor'),
  {
    loading: () => <SkeletonCard />,
    ssr: false,
  }
);

const AIScribeWidget = dynamic(
  () => import('@/components/scribe/AIScribeWidget'),
  {
    loading: () => <SkeletonBox className="h-64" />,
  }
);

export default function PatientDetailPage() {
  return (
    <div>
      <PatientHeader /> {/* Always loaded */}

      <Suspense fallback={<SkeletonCard />}>
        <ClinicalNotesEditor />
      </Suspense>

      <Suspense fallback={<SkeletonBox />}>
        <AIScribeWidget />
      </Suspense>
    </div>
  );
}
```

#### 2. Image Optimization

**Use Next.js Image Component:**

```typescript
import Image from 'next/image';

// Before (slow)
<img src="/logo.png" alt="Logo" />

// After (optimized)
<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // For above-the-fold images
/>
```

#### 3. Bundle Size Optimization

**Analyze Bundle:**

```bash
# Install analyzer
pnpm add --dev @next/bundle-analyzer

# Add to next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true pnpm build
```

**Optimize Large Dependencies:**

```typescript
// Before: Import entire library (100KB)
import _ from 'lodash';

// After: Import only what you need (5KB)
import debounce from 'lodash/debounce';

// Or use native alternatives
const unique = [...new Set(array)]; // Instead of _.uniq
```

### Backend Optimization

#### 1. Database Query Optimization

**Add Indexes:**

```prisma
// packages/database/prisma/schema.prisma

model Patient {
  id        String   @id @default(cuid())
  mrn       String   @unique
  firstName String
  lastName  String

  // Add indexes for frequently searched fields
  @@index([lastName, firstName])
  @@index([mrn])
}

model ClinicalNote {
  id        String   @id @default(cuid())
  patientId String
  createdAt DateTime @default(now())

  @@index([patientId, createdAt])
}
```

**Optimize Queries:**

```typescript
// Before: N+1 query problem
const patients = await prisma.patient.findMany();
for (const patient of patients) {
  const notes = await prisma.clinicalNote.findMany({
    where: { patientId: patient.id },
  });
}

// After: Single query with include
const patients = await prisma.patient.findMany({
  include: {
    clinicalNotes: {
      take: 10,
      orderBy: { createdAt: 'desc' },
    },
  },
});
```

**Use Pagination:**

```typescript
// Before: Load all patients (slow with 10,000+ patients)
const patients = await prisma.patient.findMany();

// After: Paginate (fast)
const patients = await prisma.patient.findMany({
  take: 50,
  skip: (page - 1) * 50,
  orderBy: { lastName: 'asc' },
});
```

#### 2. Caching

**Redis Caching (if Upstash is configured):**

```typescript
// apps/web/src/lib/cache.ts (create this)

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getCachedPatient(mrn: string) {
  // Check cache first
  const cached = await redis.get(`patient:${mrn}`);
  if (cached) return cached;

  // Cache miss - fetch from database
  const patient = await prisma.patient.findUnique({
    where: { mrn },
  });

  // Cache for 5 minutes
  if (patient) {
    await redis.setex(`patient:${mrn}`, 300, JSON.stringify(patient));
  }

  return patient;
}
```

**React Query for Client-Side Caching:**

```typescript
// Already using React Query in some components - expand usage

import { useQuery } from '@tanstack/react-query';

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => fetchPatient(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}
```

#### 3. API Response Optimization

**Compress Responses:**

```typescript
// apps/web/src/middleware.ts (add if missing)

import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  const response = NextResponse.next();

  // Enable gzip compression
  response.headers.set('Content-Encoding', 'gzip');

  return response;
}
```

**Limit Response Size:**

```typescript
// Only return needed fields
const patients = await prisma.patient.findMany({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    mrn: true,
    // Don't include heavy fields unless needed
    // dataHash: false,
    // createdAt: false,
  },
});
```

---

## 🔍 Troubleshooting

### Issue: Slow Page Load

**Diagnosis:**
1. Open Chrome DevTools → Performance
2. Record page load
3. Identify bottlenecks:
   - Large JS bundles?
   - Slow API calls?
   - Unoptimized images?
   - Render-blocking resources?

**Common Fixes:**
- Code split large components
- Lazy load images
- Defer non-critical JavaScript
- Use CDN for static assets

### Issue: High API Response Time

**Diagnosis:**
1. Check BetterStack logs for slow queries
2. Identify which queries are slow
3. Analyze query execution plan

**Common Fixes:**
- Add database indexes
- Optimize complex joins
- Use pagination
- Cache frequently accessed data

### Issue: Memory Leaks

**Diagnosis:**
1. Chrome DevTools → Memory
2. Take heap snapshot
3. Perform action
4. Take another snapshot
5. Compare

**Common Causes:**
- Event listeners not cleaned up
- React components not unmounting properly
- Large data stored in state
- Timers not cleared

**Fix:**
```typescript
useEffect(() => {
  const timer = setInterval(() => {
    // Do something
  }, 1000);

  // Clean up!
  return () => clearInterval(timer);
}, []);
```

---

## 📚 Performance Checklist

**Before Production Launch:**

- [ ] All pages load in <3 seconds
- [ ] LCP <2.5s on all pages
- [ ] CLS <0.1 on all pages
- [ ] API endpoints respond in <500ms
- [ ] Database queries <200ms
- [ ] Bundle size <300KB (gzipped)
- [ ] Images optimized (WebP format)
- [ ] Code splitting implemented
- [ ] Caching configured
- [ ] Performance monitoring active
- [ ] Alerts configured
- [ ] Lighthouse score >90

**Run Lighthouse Audit:**

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://holilabs.com --view

# Or use Chrome DevTools → Lighthouse tab
```

---

## 🎯 Performance Goals

### Short-term (1 month)
- [ ] Dashboard loads in <2s
- [ ] Search results in <500ms
- [ ] AI transcription <10s
- [ ] Zero memory leaks

### Medium-term (3 months)
- [ ] All Core Web Vitals pass
- [ ] 95th percentile API response <500ms
- [ ] Lighthouse score >95
- [ ] Bundle size <200KB

### Long-term (6 months)
- [ ] Global CDN deployment
- [ ] Edge computing for critical paths
- [ ] Advanced caching strategy
- [ ] Real-time performance budgets

---

**Document Version:** 1.0
**Last Updated:** October 2025
**Owner:** Engineering Team
**Next Review:** Monthly
