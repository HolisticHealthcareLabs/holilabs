/**
 * K6 Load Test: Login Surge Scenario
 *
 * Simulates high concurrent login traffic (100 simultaneous users)
 * Tests authentication system resilience during peak hours
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Warm up: ramp up to 20 users
    { duration: '2m', target: 100 },  // Peak: ramp to 100 concurrent users
    { duration: '5m', target: 100 },  // Sustain: maintain 100 users
    { duration: '2m', target: 0 },    // Cool down: ramp down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'], // 95% under 2s, 99% under 5s
    'http_req_failed': ['rate<0.001'],                  // Error rate < 0.1%
    'errors': ['rate<0.01'],                            // Custom error rate < 1%
  },
  ext: {
    loadimpact: {
      projectID: 3659870,
      name: 'HoliLabs - Login Surge Test',
    },
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'https://holilabs.xyz';

// Test data
const TEST_USERS = [
  { email: 'patient1@test.holilabs.xyz', type: 'patient' },
  { email: 'patient2@test.holilabs.xyz', type: 'patient' },
  { email: 'provider1@test.holilabs.xyz', type: 'provider' },
  { email: 'provider2@test.holilabs.xyz', type: 'provider' },
  { email: 'admin1@test.holilabs.xyz', type: 'admin' },
];

export default function () {
  // Select a random test user
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];

  // 1. Load login page
  const loginPageResponse = http.get(`${BASE_URL}/portal/login`, {
    tags: { name: 'LoadLoginPage' },
  });

  const loginPageSuccess = check(loginPageResponse, {
    'login page loads': (r) => r.status === 200,
    'login page has title': (r) => r.body.includes('Patient Portal') || r.body.includes('Sign In'),
  });

  if (!loginPageSuccess) {
    errorRate.add(1);
  }

  sleep(1); // User reads the page

  // 2. Request magic link (passwordless authentication)
  const magicLinkPayload = JSON.stringify({
    email: user.email,
    callbackUrl: `${BASE_URL}/dashboard`,
  });

  const magicLinkResponse = http.post(
    `${BASE_URL}/api/auth/email`,
    magicLinkPayload,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { name: 'RequestMagicLink' },
    }
  );

  const magicLinkSuccess = check(magicLinkResponse, {
    'magic link sent': (r) => r.status === 200 || r.status === 201,
    'response has email confirmation': (r) =>
      r.json('message') !== undefined ||
      r.json('success') === true,
  });

  if (!magicLinkSuccess) {
    errorRate.add(1);
  }

  sleep(2); // Simulate user checking email

  // 3. Verify authentication endpoint is responsive
  const authCheckResponse = http.get(`${BASE_URL}/api/auth/session`, {
    tags: { name: 'CheckSession' },
  });

  const authCheckSuccess = check(authCheckResponse, {
    'auth endpoint responsive': (r) => r.status === 200 || r.status === 401,
    'auth response time acceptable': (r) => r.timings.duration < 1000,
  });

  if (!authCheckSuccess) {
    errorRate.add(1);
  }

  sleep(1); // Think time between requests
}

export function handleSummary(data) {
  return {
    'summary-login-surge.json': JSON.stringify(data),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  summary += `${indent}  LOGIN SURGE TEST RESULTS\n`;
  summary += `${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (data.metrics.http_req_duration) {
    const p95 = data.metrics.http_req_duration.values['p(95)'];
    const p99 = data.metrics.http_req_duration.values['p(99)'];
    summary += `${indent}  Response Time (p95): ${p95.toFixed(2)}ms ${p95 < 2000 ? '✓' : '✗'}\n`;
    summary += `${indent}  Response Time (p99): ${p99.toFixed(2)}ms ${p99 < 5000 ? '✓' : '✗'}\n`;
  }

  if (data.metrics.http_req_failed) {
    const errorRate = data.metrics.http_req_failed.values.rate;
    summary += `${indent}  Error Rate: ${(errorRate * 100).toFixed(3)}% ${errorRate < 0.001 ? '✓' : '✗'}\n`;
  }

  if (data.metrics.http_reqs) {
    summary += `${indent}  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  }

  summary += `${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return summary;
}
