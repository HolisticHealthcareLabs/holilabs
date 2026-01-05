/**
 * Load Testing Script for Holi Labs API
 *
 * Tool: k6 (https://k6.io)
 * Target: 100 concurrent users
 * Duration: 5 minutes
 *
 * Usage:
 *   k6 run scripts/load-test-api.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const requestCount = new Counter('requests');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },  // Peak: 100 concurrent users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.01'], // Error rate < 1%
    'errors': ['rate<0.01'],
  },
};

// Configuration
const BASE_URL = __ENV.API_URL || 'https://api.holilabs.xyz';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// Headers
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
};

// Synthetic test data
function generatePatient() {
  const timestamp = Date.now();
  return {
    name: `Test Patient ${timestamp}`,
    email: `patient${timestamp}@test.holilabs.xyz`,
    dob: '1980-01-01',
    phone: '+1234567890',
    gender: 'MALE',
  };
}

export default function () {
  // Group: Health Check
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/health`);

    check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 200ms': (r) => r.timings.duration < 200,
    });

    errorRate.add(res.status !== 200);
    apiLatency.add(res.timings.duration);
    requestCount.add(1);
  });

  sleep(1);

  // Group: Authentication
  group('Authentication', () => {
    const loginRes = http.post(
      `${BASE_URL}/api/auth/signin`,
      JSON.stringify({
        email: 'test@holilabs.com',
        password: 'test-password',
      }),
      { headers }
    );

    check(loginRes, {
      'login status is 200 or 401': (r) => [200, 401].includes(r.status),
      'login response time < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(![200, 401].includes(loginRes.status));
    apiLatency.add(loginRes.timings.duration);
    requestCount.add(1);
  });

  sleep(1);

  // Group: Patient Search (Read-heavy operation)
  group('Patient Search', () => {
    const searchRes = http.post(
      `${BASE_URL}/api/patients/search`,
      JSON.stringify({
        name: 'Test',
      }),
      { headers }
    );

    check(searchRes, {
      'search status is 200 or 401': (r) => [200, 401].includes(r.status),
      'search response time < 300ms': (r) => r.timings.duration < 300,
      'search returns array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.patients);
        } catch {
          return false;
        }
      },
    });

    errorRate.add(![200, 401].includes(searchRes.status));
    apiLatency.add(searchRes.timings.duration);
    requestCount.add(1);
  });

  sleep(2);

  // Group: Patient Creation (Write operation)
  group('Patient Creation', () => {
    const patient = generatePatient();
    const createRes = http.post(
      `${BASE_URL}/api/patients`,
      JSON.stringify(patient),
      { headers }
    );

    check(createRes, {
      'create status is 201 or 401': (r) => [201, 401].includes(r.status),
      'create response time < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(![201, 401].includes(createRes.status));
    apiLatency.add(createRes.timings.duration);
    requestCount.add(1);
  });

  sleep(2);

  // Group: Metrics Endpoint
  group('Metrics', () => {
    const metricsRes = http.get(`${BASE_URL}/api/health/metrics`);

    check(metricsRes, {
      'metrics status is 200 or 401': (r) => [200, 401].includes(r.status),
      'metrics response time < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(![200, 401].includes(metricsRes.status));
    apiLatency.add(metricsRes.timings.duration);
    requestCount.add(1);
  });

  sleep(1);
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Total requests: ${requestCount.value}`);
}
