/**
 * Agent Gateway Test Script
 *
 * Tests the /api/agent endpoint with demo authentication.
 *
 * Usage:
 *   npx tsx scripts/test-agent-gateway.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Demo credentials from auth.config.ts
const DEMO_EMAIL = 'demo-clinician@holilabs.xyz';
const DEMO_PASSWORD = 'Demo123!@#';

let sessionCookie: string | null = null;

async function login(): Promise<boolean> {
  console.log('\n🔐 Logging in with demo credentials...');

  try {
    // Get CSRF token first
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;

    // Extract CSRF cookie
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

    // Find the session token in the comma-separated cookies
    const sessionTokenMatch = setCookieHeader.match(/authjs\.session-token=([^;]+)/);

    if (sessionTokenMatch) {
      sessionCookie = `authjs.session-token=${sessionTokenMatch[1]}`;
      console.log('✅ Login successful');
      return true;
    }

    console.log('❌ Login failed - no session token received');
    console.log('Response status:', loginResponse.status);
    return false;
  } catch (error) {
    console.log('❌ Login error:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function testEndpoint(
  name: string,
  method: string,
  path: string,
  body?: object
): Promise<{ passed: boolean; status: number }> {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log(`${method} ${path}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500));

    const passed = response.ok || (response.status === 400 && name.includes('should return 400'));
    console.log(passed ? '✅ PASSED' : '❌ FAILED');

    return { passed, status: response.status };
  } catch (error) {
    console.log('❌ ERROR:', error instanceof Error ? error.message : error);
    return { passed: false, status: 0 };
  }
}

async function main() {
  console.log('\n🤖 Agent Gateway Test Suite');
  console.log('═'.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);

  // Login first
  const loggedIn = await login();

  if (!loggedIn) {
    console.log('\n⚠️  Could not authenticate. Running tests anyway (expect 401s)...');
  }

  const results: { name: string; passed: boolean; status: number }[] = [];

  // Test 1: GET /api/agent - Capability discovery
  results.push({
    name: 'Capability Discovery',
    ...(await testEndpoint('Capability Discovery', 'GET', '/api/agent')),
  });

  // Test 2: POST /api/agent - Unknown tool
  results.push({
    name: 'Unknown Tool',
    ...(await testEndpoint(
      'Unknown Tool (should return 400)',
      'POST',
      '/api/agent',
      { tool: 'unknown-tool', arguments: {} }
    )),
  });

  // Test 3: POST /api/agent - Get governance stats
  results.push({
    name: 'Governance Stats',
    ...(await testEndpoint(
      'Get Governance Stats',
      'POST',
      '/api/agent',
      { tool: 'get-governance-stats', arguments: {} }
    )),
  });

  // Test 4: POST /api/agent - Get governance logs
  results.push({
    name: 'Governance Logs',
    ...(await testEndpoint(
      'Get Governance Logs',
      'POST',
      '/api/agent',
      { tool: 'get-governance-logs', arguments: {} }
    )),
  });

  // Test 5: POST /api/agent - Missing tool name
  results.push({
    name: 'Missing Tool',
    ...(await testEndpoint(
      'Missing Tool Name (should return 400)',
      'POST',
      '/api/agent',
      { arguments: {} }
    )),
  });

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  for (const r of results) {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name} (${r.status})`);
  }

  console.log(`\nTotal: ${passed}/${total} passed`);
  console.log('═'.repeat(60) + '\n');

  process.exit(passed === total ? 0 : 1);
}

main().catch(console.error);
