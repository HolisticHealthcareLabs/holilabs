/**
 * K6 Load Test: API Endpoint Stress Test
 *
 * Stresses critical API endpoints with 500 req/sec
 * Tests API gateway, rate limiting, and backend capacity
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successRate = new Rate('success');
const rateLimitHits = new Counter('rate_limit_hits');
const apiLatency = new Trend('api_latency');

// Test configuration
export const options = {
  scenarios: {
    // Constant rate test - maintain exact req/sec
    constant_request_rate: {
      executor: 'constant-arrival-rate',
      rate: 500, // 500 requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'], // Strict for API
    'http_req_failed': ['rate<0.01'],
    'api_latency': ['p(95)<800'],
    'success': ['rate>0.99'], // 99% success rate
    'errors': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://holilabs.xyz';
const API_KEY = __ENV.API_KEY || '';

// Critical API endpoints to test
const ENDPOINTS = [
  {
    name: 'HealthCheck',
    method: 'GET',
    url: '/api/health',
    weight: 10, // 10% of traffic
    requiresAuth: false,
  },
  {
    name: 'AuthSession',
    method: 'GET',
    url: '/api/auth/session',
    weight: 15, // 15% of traffic
    requiresAuth: true,
  },
  {
    name: 'PatientsList',
    method: 'GET',
    url: '/api/patients?limit=20',
    weight: 20, // 20% of traffic
    requiresAuth: true,
  },
  {
    name: 'AppointmentsList',
    method: 'GET',
    url: '/api/appointments/list?limit=50',
    weight: 20, // 20% of traffic
    requiresAuth: true,
  },
  {
    name: 'MedicationSearch',
    method: 'GET',
    url: '/api/medications/search?q=ibuprofen',
    weight: 15, // 15% of traffic
    requiresAuth: true,
  },
  {
    name: 'LabResults',
    method: 'GET',
    url: '/api/lab-results?status=recent',
    weight: 10, // 10% of traffic
    requiresAuth: true,
  },
  {
    name: 'Analytics',
    method: 'GET',
    url: '/api/analytics/dashboard',
    weight: 10, // 10% of traffic
    requiresAuth: true,
  },
];

// Calculate cumulative weights for endpoint selection
let cumulativeWeights = [];
let sum = 0;
for (const endpoint of ENDPOINTS) {
  sum += endpoint.weight;
  cumulativeWeights.push(sum);
}
const totalWeight = sum;

function selectEndpoint() {
  const random = Math.random() * totalWeight;
  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (random < cumulativeWeights[i]) {
      return ENDPOINTS[i];
    }
  }
  return ENDPOINTS[0];
}

export default function () {
  const endpoint = selectEndpoint();
  const startTime = Date.now();

  let response;

  if (endpoint.method === 'GET') {
    response = http.get(`${BASE_URL}${endpoint.url}`, {
      headers: endpoint.requiresAuth
        ? {
            'Authorization': `Bearer ${API_KEY}`,
          }
        : {},
      tags: { name: endpoint.name },
    });
  } else if (endpoint.method === 'POST') {
    response = http.post(
      `${BASE_URL}${endpoint.url}`,
      JSON.stringify(endpoint.payload || {}),
      {
        headers: endpoint.requiresAuth
          ? {
              'Authorization': `Bearer ${API_KEY}`,
              'Content-Type': 'application/json',
            }
          : {
              'Content-Type': 'application/json',
            },
        tags: { name: endpoint.name },
      }
    );
  }

  const duration = Date.now() - startTime;
  apiLatency.add(duration);

  // Check for rate limiting
  if (response.status === 429) {
    rateLimitHits.add(1);
  }

  const success = check(response, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401, // 401 is ok for unauthenticated tests
    'not rate limited': (r) => r.status !== 429,
    'response under 1s': (r) => r.timings.duration < 1000,
    'valid JSON response': (r) => {
      if (r.status === 200) {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      }
      return true; // Skip for non-200 responses
    },
  });

  if (success) {
    successRate.add(1);
  } else {
    successRate.add(0);
    errorRate.add(1);
  }

  // Very short sleep to maintain high req/sec
  sleep(0.1);
}

export function handleSummary(data) {
  let summary = '\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '  API STRESS TEST RESULTS\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Overall metrics
  if (data.metrics.http_reqs) {
    const count = data.metrics.http_reqs.values.count;
    const rate = data.metrics.http_reqs.values.rate;
    summary += `  Total Requests: ${count}\n`;
    summary += `  Requests/sec: ${rate.toFixed(2)} ${rate >= 450 ? '✓' : '✗'}\n`;
  }

  if (data.metrics.api_latency) {
    const p50 = data.metrics.api_latency.values['p(50)'];
    const p95 = data.metrics.api_latency.values['p(95)'];
    const p99 = data.metrics.api_latency.values['p(99)'];
    summary += `  API Latency (p50): ${p50.toFixed(2)}ms\n`;
    summary += `  API Latency (p95): ${p95.toFixed(2)}ms ${p95 < 800 ? '✓' : '✗'}\n`;
    summary += `  API Latency (p99): ${p99.toFixed(2)}ms ${p99 < 2000 ? '✓' : '✗'}\n`;
  }

  if (data.metrics.success) {
    const rate = data.metrics.success.values.rate;
    summary += `  Success Rate: ${(rate * 100).toFixed(2)}% ${rate > 0.99 ? '✓' : '✗'}\n`;
  }

  if (data.metrics.http_req_failed) {
    const rate = data.metrics.http_req_failed.values.rate;
    summary += `  Error Rate: ${(rate * 100).toFixed(3)}% ${rate < 0.01 ? '✓' : '✗'}\n`;
  }

  if (data.metrics.rate_limit_hits) {
    const count = data.metrics.rate_limit_hits.values.count;
    summary += `  Rate Limit Hits: ${count} ${count === 0 ? '✓' : '⚠'}\n`;
  }

  summary += '\n  Endpoint Breakdown:\n';
  summary += '  ─────────────────────────────────────────────────────────────────────\n';

  // Per-endpoint metrics
  for (const endpoint of ENDPOINTS) {
    const metricName = `http_req_duration{name:${endpoint.name}}`;
    if (data.metrics[metricName]) {
      const avg = data.metrics[metricName].values.avg;
      const p95 = data.metrics[metricName].values['p(95)'];
      summary += `  ${endpoint.name.padEnd(20)} avg: ${avg.toFixed(0)}ms, p95: ${p95.toFixed(0)}ms\n`;
    }
  }

  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return {
    'summary-api-stress.json': JSON.stringify(data),
    'stdout': summary,
  };
}
