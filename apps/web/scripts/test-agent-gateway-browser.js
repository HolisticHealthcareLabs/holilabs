/**
 * Browser Test for Agent Gateway
 *
 * Instructions:
 * 1. Log into http://localhost:3000 with demo credentials
 * 2. Open browser DevTools (F12 or Cmd+Option+I)
 * 3. Go to Console tab
 * 4. Copy and paste this entire file into the console
 * 5. Press Enter to run
 */

(async function testAgentGateway() {
  console.log('🤖 Agent Gateway Browser Test');
  console.log('═'.repeat(50));

  const results = [];

  // Test 1: GET /api/agent - Capability Discovery
  console.log('\n📋 Test 1: Capability Discovery');
  try {
    const res = await fetch('/api/agent');
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
    results.push({ name: 'Capability Discovery', passed: res.ok, status: res.status });
  } catch (e) {
    console.error('Error:', e);
    results.push({ name: 'Capability Discovery', passed: false, status: 0 });
  }

  // Test 2: Unknown Tool
  console.log('\n❓ Test 2: Unknown Tool (should return 400)');
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'unknown-tool', arguments: {} })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
    results.push({ name: 'Unknown Tool', passed: res.status === 400, status: res.status });
  } catch (e) {
    console.error('Error:', e);
    results.push({ name: 'Unknown Tool', passed: false, status: 0 });
  }

  // Test 3: Get Governance Stats
  console.log('\n📊 Test 3: Get Governance Stats');
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'get-governance-stats', arguments: {} })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
    results.push({ name: 'Governance Stats', passed: res.ok, status: res.status });
  } catch (e) {
    console.error('Error:', e);
    results.push({ name: 'Governance Stats', passed: false, status: 0 });
  }

  // Test 4: Get Governance Logs
  console.log('\n📜 Test 4: Get Governance Logs');
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'get-governance-logs', arguments: {} })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
    results.push({ name: 'Governance Logs', passed: res.ok, status: res.status });
  } catch (e) {
    console.error('Error:', e);
    results.push({ name: 'Governance Logs', passed: false, status: 0 });
  }

  // Test 5: Missing Tool Name
  console.log('\n🚫 Test 5: Missing Tool Name (should return 400)');
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arguments: {} })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
    results.push({ name: 'Missing Tool', passed: res.status === 400, status: res.status });
  } catch (e) {
    console.error('Error:', e);
    results.push({ name: 'Missing Tool', passed: false, status: 0 });
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('SUMMARY');
  console.log('═'.repeat(50));

  const passed = results.filter(r => r.passed).length;
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name} (${r.status})`);
  });

  console.log(`\nTotal: ${passed}/${results.length} passed`);
  console.log('═'.repeat(50));

  return { results, passed, total: results.length };
})();
