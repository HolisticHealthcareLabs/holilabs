/**
 * Web Vitals Performance Monitoring
 *
 * Tracks Core Web Vitals and other performance metrics.
 * Reports to logging system for analysis and alerting.
 *
 * Metrics tracked:
 * - LCP (Largest Contentful Paint) - Loading performance
 * - FID (First Input Delay) - Interactivity
 * - CLS (Cumulative Layout Shift) - Visual stability
 * - FCP (First Contentful Paint) - Loading performance
 * - TTFB (Time to First Byte) - Server response time
 *
 * @see https://web.dev/vitals/
 */

import { logger } from '@/lib/logger';

export interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType?: string;
}

/**
 * Report Web Vital metric to logging system
 */
export function reportWebVital(metric: WebVitalMetric) {
  // Only log in production or if explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !process.env.ENABLE_WEB_VITALS_LOGGING) {
    return;
  }

  logger.info({
    event: 'web_vital',
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  }, `Web Vital: ${metric.name} = ${metric.value}ms (${metric.rating})`);

  // Send to analytics if configured
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }
}

/**
 * Get rating based on thresholds
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    FID: [100, 300],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };

  const [good, needsImprovement] = thresholds[name] || [0, 0];

  if (value <= good) return 'good';
  if (value <= needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Create Web Vital metric object
 */
export function createWebVitalMetric(
  name: string,
  value: number,
  delta: number,
  id: string,
  navigationType?: string
): WebVitalMetric {
  return {
    name,
    value,
    rating: getRating(name, value),
    delta,
    id,
    navigationType,
  };
}
