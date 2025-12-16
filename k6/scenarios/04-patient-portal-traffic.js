/**
 * K6 Load Test: Patient Portal Traffic Scenario
 *
 * Simulates 200 concurrent users browsing the patient portal
 * Tests overall system capacity and user experience under load
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const pageLoadTime = new Trend('page_load_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Warm up
    { duration: '3m', target: 150 },   // Ramp to 150 users
    { duration: '5m', target: 200 },   // Peak at 200 concurrent users
    { duration: '5m', target: 200 },   // Sustained traffic
    { duration: '2m', target: 0 },     // Cool down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.001'],
    'page_load_time': ['p(95)<3000'],
    'errors': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://holilabs.xyz';
const API_KEY = __ENV.API_KEY || '';

// Simulate different patient behaviors
const USER_BEHAVIORS = [
  'view_dashboard',
  'check_appointments',
  'view_medical_records',
  'read_messages',
  'update_profile',
];

export default function () {
  const behavior = USER_BEHAVIORS[Math.floor(Math.random() * USER_BEHAVIORS.length)];
  const patientId = `patient-${__VU}`;

  // Simulate user session
  group('Patient Portal Session', function () {
    // 1. Load dashboard (all users do this)
    const dashboardStart = Date.now();

    const dashboardResponse = http.get(`${BASE_URL}/portal/dashboard`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
      tags: { name: 'LoadDashboard' },
    });

    const dashboardSuccess = check(dashboardResponse, {
      'dashboard loaded': (r) => r.status === 200,
      'dashboard has content': (r) => r.body.length > 1000,
      'dashboard loads quickly': (r) => r.timings.duration < 2000,
    });

    if (!dashboardSuccess) {
      errorRate.add(1);
    }

    pageLoadTime.add(Date.now() - dashboardStart);
    sleep(3); // User reviews dashboard

    // 2. Execute specific user behavior
    switch (behavior) {
      case 'view_dashboard':
        // User just views dashboard and leaves
        break;

      case 'check_appointments':
        checkAppointments(patientId);
        break;

      case 'view_medical_records':
        viewMedicalRecords(patientId);
        break;

      case 'read_messages':
        readMessages(patientId);
        break;

      case 'update_profile':
        updateProfile(patientId);
        break;
    }
  });

  sleep(5); // Think time between sessions
}

function checkAppointments(patientId) {
  const response = http.get(
    `${BASE_URL}/api/appointments/list?patientId=${patientId}&status=upcoming`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
      tags: { name: 'ViewAppointments' },
    }
  );

  const success = check(response, {
    'appointments loaded': (r) => r.status === 200,
    'has appointment data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.appointments !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }

  sleep(4); // User reviews appointments

  // View appointment details
  const detailsResponse = http.get(`${BASE_URL}/portal/appointments`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
    tags: { name: 'AppointmentDetails' },
  });

  check(detailsResponse, {
    'appointment details loaded': (r) => r.status === 200,
  });

  sleep(2);
}

function viewMedicalRecords(patientId) {
  // Load medical records list
  const listResponse = http.get(
    `${BASE_URL}/api/medical-records?patientId=${patientId}&limit=20`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
      tags: { name: 'LoadRecordsList' },
    }
  );

  const listSuccess = check(listResponse, {
    'records list loaded': (r) => r.status === 200,
    'has records': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.records);
      } catch {
        return false;
      }
    },
  });

  if (!listSuccess) {
    errorRate.add(1);
    return;
  }

  sleep(3); // User scrolls through records

  // View a specific record
  const records = JSON.parse(listResponse.body).records;
  if (records && records.length > 0) {
    const recordId = records[0].id;

    const recordResponse = http.get(`${BASE_URL}/api/medical-records/${recordId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
      tags: { name: 'ViewRecord' },
    });

    check(recordResponse, {
      'record details loaded': (r) => r.status === 200,
    });

    sleep(5); // User reads record
  }
}

function readMessages(patientId) {
  // Load message inbox
  const inboxResponse = http.get(
    `${BASE_URL}/api/messages/inbox?patientId=${patientId}`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
      tags: { name: 'LoadInbox' },
    }
  );

  const inboxSuccess = check(inboxResponse, {
    'inbox loaded': (r) => r.status === 200,
    'has messages': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.messages);
      } catch {
        return false;
      }
    },
  });

  if (!inboxSuccess) {
    errorRate.add(1);
    return;
  }

  sleep(2); // User scans inbox

  // Read a message
  const messages = JSON.parse(inboxResponse.body).messages;
  if (messages && messages.length > 0) {
    const messageId = messages[0].id;

    const messageResponse = http.get(`${BASE_URL}/api/messages/${messageId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
      tags: { name: 'ReadMessage' },
    });

    check(messageResponse, {
      'message loaded': (r) => r.status === 200,
    });

    sleep(4); // User reads message
  }
}

function updateProfile(patientId) {
  // Load profile
  const profileResponse = http.get(`${BASE_URL}/api/patients/${patientId}/profile`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
    tags: { name: 'LoadProfile' },
  });

  const profileSuccess = check(profileResponse, {
    'profile loaded': (r) => r.status === 200,
  });

  if (!profileSuccess) {
    errorRate.add(1);
    return;
  }

  sleep(3); // User reviews profile

  // Update notification preferences
  const updatePayload = JSON.stringify({
    notifications: {
      email: true,
      sms: Math.random() > 0.5,
      appointmentReminders: true,
      testResults: true,
    },
  });

  const updateResponse = http.patch(
    `${BASE_URL}/api/patients/${patientId}/profile`,
    updatePayload,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      tags: { name: 'UpdateProfile' },
    }
  );

  check(updateResponse, {
    'profile updated': (r) => r.status === 200,
  });

  sleep(2);
}

export function handleSummary(data) {
  let summary = '\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '  PATIENT PORTAL TRAFFIC TEST RESULTS\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  if (data.metrics.http_req_duration) {
    const p95 = data.metrics.http_req_duration.values['p(95)'];
    const p99 = data.metrics.http_req_duration.values['p(99)'];
    summary += `  Response Time (p95): ${p95.toFixed(2)}ms ${p95 < 2000 ? '✓' : '✗'}\n`;
    summary += `  Response Time (p99): ${p99.toFixed(2)}ms ${p99 < 5000 ? '✓' : '✗'}\n`;
  }

  if (data.metrics.page_load_time) {
    const p95 = data.metrics.page_load_time.values['p(95)'];
    const avg = data.metrics.page_load_time.values.avg;
    summary += `  Page Load Time (avg): ${avg.toFixed(2)}ms\n`;
    summary += `  Page Load Time (p95): ${p95.toFixed(2)}ms ${p95 < 3000 ? '✓' : '✗'}\n`;
  }

  if (data.metrics.http_req_failed) {
    const rate = data.metrics.http_req_failed.values.rate;
    summary += `  Error Rate: ${(rate * 100).toFixed(3)}% ${rate < 0.001 ? '✓' : '✗'}\n`;
  }

  if (data.metrics.http_reqs) {
    const count = data.metrics.http_reqs.values.count;
    const rate = data.metrics.http_reqs.values.rate;
    summary += `  Total Requests: ${count}\n`;
    summary += `  Requests/sec: ${rate.toFixed(2)}\n`;
  }

  if (data.metrics.vus) {
    const max = data.metrics.vus.values.max;
    summary += `  Peak Concurrent Users: ${max}\n`;
  }

  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return {
    'summary-portal-traffic.json': JSON.stringify(data),
    'stdout': summary,
  };
}
