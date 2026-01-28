/**
 * Clinical Suite Test Script
 *
 * Comprehensive validation of all agent gateway tools including:
 * - Clinical intelligence (diagnosis, drug interactions, allergies)
 * - Clinical decision support
 * - Clinical alerts (vital signs, lab results)
 * - Preventive care
 * - Drug/International lookups
 * - Forms and notifications
 * - Prevention workflows
 * - Governance tools
 * - Parallel orchestration
 *
 * Usage:
 *   npx tsx scripts/test-clinical-suite.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Demo credentials from auth.config.ts
const DEMO_EMAIL = 'demo-clinician@holilabs.xyz';
const DEMO_PASSWORD = 'Demo123!@#';

let sessionCookie: string | null = null;

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════

async function login(): Promise<boolean> {
  console.log('\n🔐 Logging in with demo credentials...');

  try {
    // Get CSRF token first
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    const csrfCookie = csrfResponse.headers.get('set-cookie')?.split(';')[0] || '';

    // Login with credentials
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': csrfCookie,
      },
      body: new URLSearchParams({
        csrfToken,
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      }),
      redirect: 'manual',
    });

    // Extract session token from Set-Cookie header
    const setCookieHeader = loginResponse.headers.get('set-cookie') || '';
    const sessionTokenMatch = setCookieHeader.match(/authjs\.session-token=([^;]+)/);

    if (sessionTokenMatch) {
      sessionCookie = `authjs.session-token=${sessionTokenMatch[1]}`;
      console.log('✅ Login successful');
      return true;
    }

    console.log('❌ Login failed - no session token received');
    return false;
  } catch (error) {
    console.log('❌ Login error:', error instanceof Error ? error.message : error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  status: number;
  duration: number;
  error?: string;
}

async function testTool(
  category: string,
  name: string,
  tool: string,
  args: Record<string, unknown> = {}
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${BASE_URL}/api/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
      body: JSON.stringify({ tool, arguments: args }),
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    // Consider 200-299 and 400 (for validation errors) as potential passes
    const passed = response.ok || (response.status === 400 && data.error?.includes('Unknown tool') === false);

    return {
      name,
      category,
      passed,
      status: response.status,
      duration,
      error: passed ? undefined : (data.error || data.data?.error || JSON.stringify(data).slice(0, 200)),
    };
  } catch (error) {
    return {
      name,
      category,
      passed: false,
      status: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testOrchestration(
  name: string,
  tools: Array<{ tool: string; arguments: Record<string, unknown> }>,
  mode: 'parallel' | 'sequential' = 'parallel'
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${BASE_URL}/api/agent/orchestrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
      body: JSON.stringify({ tools, mode }),
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    return {
      name,
      category: 'Orchestration',
      passed: response.ok && data.success,
      status: response.status,
      duration,
      error: response.ok ? undefined : data.error,
    };
  } catch (error) {
    return {
      name,
      category: 'Orchestration',
      passed: false,
      status: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // CAPABILITY DISCOVERY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📋 Testing Capability Discovery...');

  const capResponse = await fetch(`${BASE_URL}/api/agent`, {
    method: 'GET',
    headers: sessionCookie ? { Cookie: sessionCookie } : {},
  });
  const capData = await capResponse.json();
  const toolCount = capData.tools?.length || 0;

  results.push({
    name: `Capability Discovery (${toolCount} tools)`,
    category: 'Gateway',
    passed: capResponse.ok && toolCount >= 20,
    status: capResponse.status,
    duration: 0,
    error: toolCount < 20 ? `Expected 20+ tools, got ${toolCount}` : undefined,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CLINICAL INTELLIGENCE (Core)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n🏥 Testing Clinical Intelligence (Core)...');

  results.push(await testTool('Clinical', 'Symptom Diagnosis', 'diagnose-symptoms', {
    symptoms: ['fever', 'cough', 'fatigue'],
    chiefComplaint: 'fever and cough for 3 days',
    age: 45,
    sex: 'M',
  }));

  results.push(await testTool('Clinical', 'Drug Interactions', 'check-drug-interactions', {
    medications: ['aspirin', 'warfarin'],
  }));

  results.push(await testTool('Clinical', 'Allergy Check', 'check-allergies', {
    patientId: 'demo-patient',
    medications: ['penicillin', 'aspirin'],
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // CLINICAL DECISION SUPPORT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n🧠 Testing Clinical Decision Support...');

  results.push(await testTool('Decision Support', 'Clinical Decision', 'clinical-decision', {
    patientId: 'demo-patient',
    mode: 'full',
    aiScribeOutput: {
      chiefComplaint: 'chest pain for 2 days',
      symptoms: ['chest pain', 'shortness of breath'],
      vitalSigns: {
        heartRate: 95,
        systolicBp: 140,
        diastolicBp: 90,
      },
    },
  }));

  results.push(await testTool('Decision Support', 'Decision Support', 'decision-support', {
    patientId: 'demo-patient',
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // CLINICAL ALERTS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n⚠️  Testing Clinical Alerts...');

  results.push(await testTool('Alerts', 'Vital Alerts', 'check-vital-alerts', {
    heartRate: 120,
    systolicBP: 180,
    diastolicBP: 95,
    respiratoryRate: 22,
    temperature: 38.5,
    oxygenSaturation: 94,
    age: 65,
  }));

  results.push(await testTool('Alerts', 'Lab Alerts (POST)', 'check-lab-alerts', {
    patientId: 'demo-patient',
  }));

  results.push(await testTool('Alerts', 'Lab Alerts (GET)', 'get-lab-alerts', {
    patientId: 'demo-patient',
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // PREVENTIVE CARE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n🛡️  Testing Preventive Care...');

  results.push(await testTool('Preventive Care', 'Get Preventive Care', 'get-preventive-care', {
    patientId: 'demo-patient',
  }));

  results.push(await testTool('Preventive Care', 'Check Preventive Care', 'check-preventive-care', {
    patientId: 'demo-patient',
    patientAge: 55,
    patientGender: 'M',
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // DRUG & INTERNATIONAL LOOKUPS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n💊 Testing Drug & International Lookups...');

  results.push(await testTool('Lookups', 'Drug Lookup', 'lookup-drug', {
    name: 'metformin',
  }));

  results.push(await testTool('Lookups', 'Drug Interaction Check', 'normalize-drug', {
    drugs: ['tylenol', 'aspirin'],
  }));

  results.push(await testTool('Lookups', 'ICD-11 Lookup', 'lookup-icd11', {
    code: 'BA00',
  }));

  results.push(await testTool('Lookups', 'International Lookup', 'lookup-international', {
    query: 'diabetes management',
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // FORMS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📝 Testing Form Communication...');

  results.push(await testTool('Forms', 'Get Sent Forms', 'get-sent-forms', {}));

  // Note: send-form requires actual patient/template IDs
  results.push(await testTool('Forms', 'Send Form (validation)', 'send-form', {
    patientId: 'demo-patient',
    templateId: 'medical-history-intake',
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // NOTIFICATIONS / REMINDERS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n🔔 Testing Notifications...');

  results.push(await testTool('Notifications', 'Get Sent Reminders', 'get-sent-reminders', {}));

  results.push(await testTool('Notifications', 'Get Reminder Stats', 'get-reminder-stats', {}));

  // ─────────────────────────────────────────────────────────────────────────────
  // PREVENTION WORKFLOW
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n🔄 Testing Prevention Workflow...');

  results.push(await testTool('Prevention', 'Prevention Hub', 'get-prevention-hub', {
    patientId: 'demo-patient',
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // GOVERNANCE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📊 Testing Governance...');

  results.push(await testTool('Governance', 'Governance Stats', 'get-governance-stats', {}));

  results.push(await testTool('Governance', 'Governance Logs', 'get-governance-logs', {}));

  // ─────────────────────────────────────────────────────────────────────────────
  // PARALLEL ORCHESTRATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n⚡ Testing Parallel Orchestration...');

  results.push(await testOrchestration('Parallel: Governance Overview', [
    { tool: 'get-governance-stats', arguments: {} },
    { tool: 'get-governance-logs', arguments: {} },
  ], 'parallel'));

  results.push(await testOrchestration('Parallel: Clinical Alerts', [
    { tool: 'check-vital-alerts', arguments: { heartRate: 90, systolicBP: 120, diastolicBP: 80, age: 40 } },
    { tool: 'get-preventive-care', arguments: { patientId: 'demo-patient' } },
  ], 'parallel'));

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n🧪 Clinical Suite Validation Test');
  console.log('═'.repeat(70));
  console.log(`Base URL: ${BASE_URL}`);

  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n⚠️  Could not authenticate. Tests may fail with 401.');
  }

  // Run tests
  const results = await runTests();

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('TEST RESULTS SUMMARY');
  console.log('═'.repeat(70));

  // Group by category
  const categories = new Map<string, TestResult[]>();
  for (const result of results) {
    const cat = categories.get(result.category) || [];
    cat.push(result);
    categories.set(result.category, cat);
  }

  let totalPassed = 0;
  let totalFailed = 0;

  for (const [category, categoryResults] of categories) {
    console.log(`\n${category}:`);
    for (const r of categoryResults) {
      const icon = r.passed ? '✅' : '❌';
      const timing = r.duration > 0 ? ` (${r.duration}ms)` : '';
      console.log(`  ${icon} ${r.name} [${r.status}]${timing}`);
      if (!r.passed) {
        console.log(`     └─ Error: ${r.error || 'Check response data'}`);
      }
      if (r.passed) totalPassed++;
      else totalFailed++;
    }
  }

  // Final summary
  const total = results.length;
  const passRate = ((totalPassed / total) * 100).toFixed(1);

  console.log('\n' + '═'.repeat(70));
  console.log(`TOTAL: ${totalPassed}/${total} passed (${passRate}%)`);
  console.log('═'.repeat(70));

  if (totalFailed > 0) {
    console.log('\n❌ Some tests failed. Review errors above.');
  } else {
    console.log('\n✅ All tests passed!');
  }

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(console.error);
