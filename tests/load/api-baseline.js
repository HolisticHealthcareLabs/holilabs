/**
 * k6 Load Test: API Baseline Performance
 *
 * Purpose: Establish baseline performance metrics for critical API endpoints
 *
 * Target Metrics (from production plan):
 * - p95 response time < 300ms
 * - Error rate < 1%
 * - 100 concurrent users
 *
 * Run:
 *   k6 run tests/load/api-baseline.js
 *
 * Run with Prometheus export (Grafana visualization):
 *   k6 run --out experimental-prometheus-rw tests/load/api-baseline.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const patientListDuration = new Trend('patient_list_duration');
const patientDetailDuration = new Trend('patient_detail_duration');
const healthCheckDuration = new Trend('health_check_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users (target)
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 50 },    // Ramp down to 50
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],

  thresholds: {
    // HTTP errors should be less than 1%
    errors: ['rate<0.01'],

    // 95th percentile response time should be < 300ms
    http_req_duration: ['p(95)<300'],

    // 99th percentile should be < 500ms
    'http_req_duration{name:patient_list}': ['p(99)<500'],
    'http_req_duration{name:patient_detail}': ['p(99)<500'],
    'http_req_duration{name:health_check}': ['p(99)<200'],

    // HTTP failures should be less than 1%
    http_req_failed: ['rate<0.01'],
  },
};

// Base URL - override with environment variable
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_TOKEN = __ENV.API_TOKEN || 'test-token-replace-with-real';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
    tags: {
      name: 'api_baseline',
    },
  };

  // Test 1: Health Check (lightest endpoint)
  const healthCheck = http.get(`${BASE_URL}/api/health`, {
    ...params,
    tags: { name: 'health_check' },
  });

  check(healthCheck, {
    'health check status is 200': (r) => r.status === 200,
    'health check duration < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  healthCheckDuration.add(healthCheck.timings.duration);

  sleep(1);

  // Test 2: Patient List (READ operation with pagination)
  const patientList = http.get(`${BASE_URL}/api/patients?page=1&limit=20`, {
    ...params,
    tags: { name: 'patient_list' },
  });

  check(patientList, {
    'patient list status is 200': (r) => r.status === 200,
    'patient list has patients': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.patients && body.patients.length > 0;
      } catch (e) {
        return false;
      }
    },
    'patient list duration < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);

  patientListDuration.add(patientList.timings.duration);

  sleep(1);

  // Test 3: Patient Detail (READ single patient)
  // Extract first patient ID from list
  let patientId;
  try {
    const listBody = JSON.parse(patientList.body);
    if (listBody.patients && listBody.patients.length > 0) {
      patientId = listBody.patients[0].id;

      const patientDetail = http.get(
        `${BASE_URL}/api/patients/${patientId}?accessReason=Treatment`,
        {
          ...params,
          tags: { name: 'patient_detail' },
        }
      );

      check(patientDetail, {
        'patient detail status is 200': (r) => r.status === 200,
        'patient detail has data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.id === patientId;
          } catch (e) {
            return false;
          }
        },
        'patient detail duration < 300ms': (r) => r.timings.duration < 300,
      }) || errorRate.add(1);

      patientDetailDuration.add(patientDetail.timings.duration);
    }
  } catch (e) {
    console.error('Failed to parse patient list:', e);
    errorRate.add(1);
  }

  sleep(2);
}

// Summary handler - prints results at the end
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  const green = enableColors ? '\x1b[32m' : '';
  const red = enableColors ? '\x1b[31m' : '';
  const yellow = enableColors ? '\x1b[33m' : '';
  const reset = enableColors ? '\x1b[0m' : '';

  let summary = '\n';
  summary += `${indent}╔══════════════════════════════════════════════════════════╗\n`;
  summary += `${indent}║        k6 LOAD TEST RESULTS - API BASELINE              ║\n`;
  summary += `${indent}╚══════════════════════════════════════════════════════════╝\n\n`;

  // HTTP request metrics
  const httpReqs = data.metrics.http_reqs;
  const httpReqDuration = data.metrics.http_req_duration;
  const httpReqFailed = data.metrics.http_req_failed;

  summary += `${indent}📊 HTTP Requests:\n`;
  summary += `${indent}  Total: ${httpReqs.values.count}\n`;
  summary += `${indent}  Rate: ${httpReqs.values.rate.toFixed(2)} req/s\n\n`;

  summary += `${indent}⏱️  Response Time:\n`;
  summary += `${indent}  Avg: ${httpReqDuration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Min: ${httpReqDuration.values.min.toFixed(2)}ms\n`;
  summary += `${indent}  Max: ${httpReqDuration.values.max.toFixed(2)}ms\n`;

  const p95 = httpReqDuration.values['p(95)'];
  const p95Pass = p95 < 300;
  summary += `${indent}  p95: ${p95Pass ? green : red}${p95.toFixed(2)}ms${reset} ${p95Pass ? '✅' : '❌ (target: <300ms)'}\n`;

  const p99 = httpReqDuration.values['p(99)'];
  const p99Pass = p99 < 500;
  summary += `${indent}  p99: ${p99Pass ? green : red}${p99.toFixed(2)}ms${reset} ${p99Pass ? '✅' : '❌ (target: <500ms)'}\n\n`;

  // Error rate
  const errorRateValue = httpReqFailed.values.rate;
  const errorPass = errorRateValue < 0.01;
  summary += `${indent}❌ Error Rate: ${errorPass ? green : red}${(errorRateValue * 100).toFixed(2)}%${reset} ${errorPass ? '✅' : '❌ (target: <1%)'}\n\n`;

  // Virtual Users
  const vus = data.metrics.vus;
  const vusMax = data.metrics.vus_max;
  summary += `${indent}👥 Virtual Users:\n`;
  summary += `${indent}  Max: ${vusMax.values.max}\n`;
  summary += `${indent}  Current: ${vus.values.value}\n\n`;

  // Test duration
  const duration = data.state.testRunDurationMs / 1000;
  summary += `${indent}⏰ Test Duration: ${duration.toFixed(0)}s\n\n`;

  // Overall status
  const allPass = p95Pass && p99Pass && errorPass;
  if (allPass) {
    summary += `${indent}${green}✅ ALL PERFORMANCE TARGETS MET${reset}\n`;
  } else {
    summary += `${indent}${red}❌ PERFORMANCE TARGETS NOT MET${reset}\n`;
    summary += `${indent}${yellow}Review thresholds and optimize API performance${reset}\n`;
  }

  summary += `${indent}\n`;
  summary += `${indent}📈 Full report: load-test-summary.json\n`;
  summary += `${indent}📊 Grafana: View metrics in k6 dashboard\n\n`;

  return summary;
}
