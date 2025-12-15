/**
 * CDSS Load Test Script
 *
 * Tests the Clinical Decision Support System under various load conditions
 * Target: p95 < 2s, <1% error rate at 100 concurrent users
 *
 * Run with: k6 run tests/load/cdss-load-test.js
 *
 * Performance Benchmarks:
 * - p50: <500ms (median response time)
 * - p95: <2000ms (95th percentile)
 * - p99: <3000ms (99th percentile)
 * - Error Rate: <1%
 * - Cache Hit Rate: >70% after warmup
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const cacheHitRate = new Rate('cache_hits');
const evaluationDuration = new Trend('cdss_evaluation_duration');
const alertsGenerated = new Counter('alerts_generated');

// Load test configuration
export const options = {
  stages: [
    // Warmup phase
    { duration: '30s', target: 10 },   // Ramp up to 10 users (cache warmup)
    { duration: '1m', target: 10 },    // Stay at 10 users

    // Load testing phase
    { duration: '2m', target: 50 },    // Ramp up to 50 concurrent
    { duration: '3m', target: 50 },    // Maintain 50 users

    // Stress testing phase
    { duration: '2m', target: 100 },   // Ramp up to 100 concurrent
    { duration: '5m', target: 100 },   // Maintain 100 users

    // Spike testing
    { duration: '30s', target: 200 },  // Spike to 200 users
    { duration: '1m', target: 200 },   // Hold spike
    { duration: '30s', target: 100 },  // Drop back

    // Cooldown
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // Performance thresholds (MUST PASS)
    'http_req_duration': ['p(95)<2000', 'p(99)<3000'], // 95% under 2s, 99% under 3s
    'http_req_failed': ['rate<0.01'],                   // <1% errors
    'errors': ['rate<0.01'],                            // <1% application errors

    // Performance targets (NICE TO HAVE)
    'http_req_duration{name:patient-view}': ['p(95)<1500'], // Patient view < 1.5s
    'http_req_duration{name:medication-prescribe}': ['p(95)<1000'], // Prescribe < 1s (critical)
    'cdss_evaluation_duration': ['p(95)<2000'],         // Engine evaluation < 2s

    // System health indicators
    'cache_hits': ['rate>0.7'],                         // >70% cache hit rate after warmup
  ],
};

// Test data - realistic patient scenarios
const testPatients = [
  // Scenario 1: Multiple medications with potential interactions
  {
    id: 'patient-001',
    hookType: 'patient-view',
    context: {
      patientId: 'patient-001',
      medications: [
        { id: 'med-1', name: 'Warfarin', status: 'active' },
        { id: 'med-2', name: 'Aspirin', status: 'active' },
        { id: 'med-3', name: 'Ibuprofen', status: 'active' },
      ],
      allergies: [],
      conditions: [
        { id: 'cond-1', code: 'I48.0', display: 'Atrial Fibrillation', icd10Code: 'I48.0', clinicalStatus: 'active', verificationStatus: 'confirmed', recordedDate: '2024-01-01' },
      ],
      demographics: {
        age: 68,
        gender: 'male',
        birthDate: '1955-06-15',
      },
    },
  },

  // Scenario 2: Allergy alert
  {
    id: 'patient-002',
    hookType: 'medication-prescribe',
    context: {
      patientId: 'patient-002',
      medications: [
        { id: 'med-4', name: 'Penicillin', status: 'draft' },
      ],
      allergies: [
        { id: 'allergy-1', allergen: 'Penicillin', severity: 'severe', verificationStatus: 'confirmed' },
      ],
      conditions: [],
      demographics: {
        age: 45,
        gender: 'female',
        birthDate: '1979-03-22',
      },
    },
  },

  // Scenario 3: Multiple chronic conditions with lab results
  {
    id: 'patient-003',
    hookType: 'patient-view',
    context: {
      patientId: 'patient-003',
      medications: [
        { id: 'med-5', name: 'Metformin', status: 'active' },
        { id: 'med-6', name: 'Lisinopril', status: 'active' },
        { id: 'med-7', name: 'Atorvastatin', status: 'active' },
      ],
      allergies: [],
      conditions: [
        { id: 'cond-2', code: 'E11.9', display: 'Type 2 Diabetes', icd10Code: 'E11.9', clinicalStatus: 'active', verificationStatus: 'confirmed', recordedDate: '2020-01-01' },
        { id: 'cond-3', code: 'I10', display: 'Hypertension', icd10Code: 'I10', clinicalStatus: 'active', verificationStatus: 'confirmed', recordedDate: '2020-01-01' },
        { id: 'cond-4', code: 'E78.5', display: 'Hyperlipidemia', icd10Code: 'E78.5', clinicalStatus: 'active', verificationStatus: 'confirmed', recordedDate: '2020-01-01' },
      ],
      labResults: [
        { id: 'lab-1', testName: 'HbA1c', value: 8.5, unit: '%', interpretation: 'high', effectiveDate: '2024-12-01', status: 'final' },
        { id: 'lab-2', testName: 'LDL Cholesterol', value: 145, unit: 'mg/dL', interpretation: 'high', effectiveDate: '2024-12-01', status: 'final' },
      ],
      demographics: {
        age: 62,
        gender: 'male',
        birthDate: '1962-08-10',
      },
    },
  },

  // Scenario 4: Duplicate therapy
  {
    id: 'patient-004',
    hookType: 'medication-prescribe',
    context: {
      patientId: 'patient-004',
      medications: [
        { id: 'med-8', name: 'Lisinopril', status: 'active' },
        { id: 'med-9', name: 'Enalapril', status: 'draft' }, // Duplicate ACE inhibitor
      ],
      allergies: [],
      conditions: [
        { id: 'cond-5', code: 'I10', display: 'Hypertension', icd10Code: 'I10', clinicalStatus: 'active', verificationStatus: 'confirmed', recordedDate: '2023-01-01' },
      ],
      demographics: {
        age: 55,
        gender: 'female',
        birthDate: '1969-11-05',
      },
    },
  },

  // Scenario 5: Prevention/screening recommendations
  {
    id: 'patient-005',
    hookType: 'patient-view',
    context: {
      patientId: 'patient-005',
      medications: [],
      allergies: [],
      conditions: [],
      demographics: {
        age: 52,
        gender: 'female',
        birthDate: '1972-04-18',
      },
    },
  },
];

// Get base URL from environment or default to localhost
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

/**
 * Main test scenario
 */
export default function () {
  // Select random patient scenario
  const patient = testPatients[Math.floor(Math.random() * testPatients.length)];

  // Generate unique hook instance
  const hookInstance = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Prepare request payload
  const payload = JSON.stringify({
    patientId: patient.id,
    userId: 'test-clinician-001',
    hookInstance,
    hookType: patient.hookType,
    context: patient.context,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: patient.hookType },
  };

  // Execute CDSS evaluation
  group(`CDSS Evaluation - ${patient.hookType}`, () => {
    const startTime = Date.now();
    const response = http.post(`${BASE_URL}/api/cds/evaluate`, payload, params);
    const duration = Date.now() - startTime;

    // Record metrics
    evaluationDuration.add(duration);

    // Validate response
    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
      'has valid JSON body': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
      'has alerts array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.alerts);
        } catch {
          return false;
        }
      },
      'has evaluation metadata': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (
            typeof body.rulesEvaluated === 'number' &&
            typeof body.rulesFired === 'number' &&
            typeof body.processingTime === 'number'
          );
        } catch {
          return false;
        }
      },
    });

    // Parse response
    let body;
    try {
      body = JSON.parse(response.body);
    } catch (error) {
      console.error('Failed to parse response:', error);
      errorRate.add(1);
      return;
    }

    // Track errors
    if (!success || response.status !== 200) {
      errorRate.add(1);
      console.error(`Request failed: ${response.status}`, body);
    } else {
      errorRate.add(0);

      // Count alerts generated
      if (body.alerts && Array.isArray(body.alerts)) {
        alertsGenerated.add(body.alerts.length);
      }

      // Detect cache hits (processing time < 50ms is likely cached)
      const isCacheHit = body.processingTime < 50;
      cacheHitRate.add(isCacheHit ? 1 : 0);

      // Log performance outliers
      if (body.processingTime > 2000) {
        console.warn(
          `Slow evaluation detected: ${body.processingTime}ms for ${patient.hookType} (patient: ${patient.id})`
        );
      }
    }
  });

  // Random think time between requests (0.5-2 seconds)
  sleep(Math.random() * 1.5 + 0.5);
}

/**
 * Setup function - runs once at start
 */
export function setup() {
  console.log('🚀 Starting CDSS Load Test');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Test scenarios: ${testPatients.length}`);
  console.log('---');
  return { startTime: Date.now() };
}

/**
 * Teardown function - runs once at end
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log('---');
  console.log(`✅ Load test completed in ${duration.toFixed(1)}s`);
}
