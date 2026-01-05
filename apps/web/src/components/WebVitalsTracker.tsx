/**
 * Web Vitals Tracker Component
 *
 * Client-side component that reports Web Vitals metrics.
 * Should be included in the root layout.
 *
 * Usage in app/layout.tsx:
 * ```tsx
 * import { WebVitalsTracker } from '@/components/WebVitalsTracker';
 *
 * export default function RootLayout() {
 *   return (
 *     <html>
 *       <body>
 *         <WebVitalsTracker />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

'use client';

import { useEffect } from 'react';
import { useReportWebVitals } from 'next/web-vitals';
import { reportWebVital, createWebVitalMetric } from '@/lib/monitoring/web-vitals';

export function WebVitalsTracker() {
  useReportWebVitals((metric) => {
    const webVital = createWebVitalMetric(
      metric.name,
      metric.value,
      metric.delta,
      metric.id,
      metric.navigationType
    );
    reportWebVital(webVital);
  });

  return null;
}

/**
 * Performance Observer for additional metrics
 */
export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    // Observe long tasks (>50ms)
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
            });
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });

      return () => longTaskObserver.disconnect();
    } catch (error) {
      // Long task API not supported
    }
  }, []);

  return null;
}
