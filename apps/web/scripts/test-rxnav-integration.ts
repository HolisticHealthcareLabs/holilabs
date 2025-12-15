/**
 * Test Script: RxNav API Integration
 *
 * Tests the RxNav API client and drug interaction checking
 *
 * Usage:
 *   npx tsx scripts/test-rxnav-integration.ts
 */

import { rxNavClient } from '../src/lib/integrations/rxnav-api';
import { checkDrugInteractionsWithAPI, checkDrugInteractionsHardcoded } from '../src/lib/cds/rules/drug-interactions';

/**
 * Test drug pairs
 */
const TEST_MEDICATIONS = [
  // High-risk combinations from our hardcoded database
  { name: 'Warfarin', rxNormCode: '11289' },
  { name: 'Aspirin', rxNormCode: '1191' },
  { name: 'Ibuprofen', rxNormCode: '5640' },
  { name: 'Lisinopril', rxNormCode: '29046' },
  { name: 'Simvastatin', rxNormCode: '36567' },
];

/**
 * Test RxCUI lookup
 */
async function testRxCUILookup() {
  console.log('\n🔍 Testing RxCUI Lookup...\n');

  const testDrugs = ['warfarin', 'aspirin', 'ibuprofen', 'lisinopril', 'metformin'];

  for (const drug of testDrugs) {
    try {
      const startTime = Date.now();
      const rxcui = await rxNavClient.getRxCUI(drug);
      const elapsed = Date.now() - startTime;

      if (rxcui) {
        console.log(`✅ ${drug}: ${rxcui} (${elapsed}ms)`);
      } else {
        console.log(`⚠️  ${drug}: Not found (${elapsed}ms)`);
      }
    } catch (error) {
      console.error(`❌ ${drug}: Error -`, error);
    }
  }
}

/**
 * Test drug interaction checking
 */
async function testInteractionChecking() {
  console.log('\n💊 Testing Drug Interaction Checking...\n');

  // Test 1: Warfarin + Aspirin (known major interaction)
  console.log('Test 1: Warfarin + Aspirin (expected: major interaction)');
  try {
    const startTime = Date.now();
    const interactions = await checkDrugInteractionsWithAPI([
      { name: 'Warfarin', rxNormCode: '11289' },
      { name: 'Aspirin', rxNormCode: '1191' },
    ]);
    const elapsed = Date.now() - startTime;

    console.log(`  API Result: ${interactions.length} interactions (${elapsed}ms)`);
    if (interactions.length > 0) {
      interactions.forEach(i => {
        console.log(`    - ${i.drug1.name} + ${i.drug2.name}: ${i.severity}`);
        console.log(`      ${i.description}`);
      });
    }
  } catch (error) {
    console.error('  Error:', error);
  }

  // Test 2: Multiple medications
  console.log('\nTest 2: Multiple medications');
  try {
    const startTime = Date.now();
    const interactions = await checkDrugInteractionsWithAPI(TEST_MEDICATIONS);
    const elapsed = Date.now() - startTime;

    console.log(`  API Result: ${interactions.length} interactions (${elapsed}ms)`);
    if (interactions.length > 0) {
      interactions.forEach(i => {
        console.log(`    - ${i.drug1.name} + ${i.drug2.name}: ${i.severity}`);
      });
    }
  } catch (error) {
    console.error('  Error:', error);
  }

  // Test 3: Fallback comparison
  console.log('\nTest 3: Comparing API vs Hardcoded results');
  const testPair = [
    { name: 'Warfarin', rxNormCode: '11289' },
    { name: 'Ibuprofen', rxNormCode: '5640' },
  ];

  try {
    const apiStart = Date.now();
    const apiResults = await checkDrugInteractionsWithAPI(testPair);
    const apiElapsed = Date.now() - apiStart;

    const hardcodedStart = Date.now();
    const hardcodedResults = checkDrugInteractionsHardcoded(testPair);
    const hardcodedElapsed = Date.now() - hardcodedStart;

    console.log(`  API: ${apiResults.length} interactions (${apiElapsed}ms)`);
    console.log(`  Hardcoded: ${hardcodedResults.length} interactions (${hardcodedElapsed}ms)`);
  } catch (error) {
    console.error('  Error:', error);
  }
}

/**
 * Test caching
 */
async function testCaching() {
  console.log('\n📦 Testing Caching...\n');

  const drug = 'metformin';

  // First call (cache miss)
  console.log('First call (cache miss expected):');
  const start1 = Date.now();
  await rxNavClient.getRxCUI(drug);
  const elapsed1 = Date.now() - start1;
  console.log(`  Elapsed: ${elapsed1}ms`);

  // Second call (cache hit)
  console.log('Second call (cache hit expected):');
  const start2 = Date.now();
  await rxNavClient.getRxCUI(drug);
  const elapsed2 = Date.now() - start2;
  console.log(`  Elapsed: ${elapsed2}ms`);

  const speedup = ((elapsed1 - elapsed2) / elapsed1 * 100).toFixed(1);
  console.log(`  Cache speedup: ${speedup}%`);
}

/**
 * Test performance
 */
async function testPerformance() {
  console.log('\n⚡ Testing Performance...\n');

  const iterations = 5;
  const testPairs = [
    [
      { name: 'Warfarin', rxNormCode: '11289' },
      { name: 'Aspirin', rxNormCode: '1191' },
    ],
    [
      { name: 'Lisinopril', rxNormCode: '29046' },
      { name: 'Potassium', rxNormCode: '8588' },
    ],
    [
      { name: 'Simvastatin', rxNormCode: '36567' },
      { name: 'Gemfibrozil', rxNormCode: '4493' },
    ],
  ];

  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const pair = testPairs[i % testPairs.length];
    const startTime = Date.now();

    try {
      await checkDrugInteractionsWithAPI(pair);
      const elapsed = Date.now() - startTime;
      times.push(elapsed);
      console.log(`  Iteration ${i + 1}: ${elapsed}ms`);
    } catch (error) {
      console.error(`  Iteration ${i + 1}: Error`);
    }
  }

  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`\n  Average: ${avgTime.toFixed(0)}ms`);
    console.log(`  Min: ${minTime}ms`);
    console.log(`  Max: ${maxTime}ms`);
    console.log(`  Target: <2000ms (${avgTime < 2000 ? '✅ PASS' : '❌ FAIL'})`);
  }
}

/**
 * Display metrics
 */
function displayMetrics() {
  console.log('\n📊 API Metrics...\n');

  const metrics = rxNavClient.getMetrics();
  const health = rxNavClient.getHealthStatus();

  console.log(`  Total Calls: ${metrics.totalCalls}`);
  console.log(`  Successful: ${metrics.successfulCalls}`);
  console.log(`  Failed: ${metrics.failedCalls}`);
  console.log(`  Success Rate: ${(health.successRate * 100).toFixed(1)}%`);
  console.log(`  Cache Hits: ${metrics.cacheHits}`);
  console.log(`  Cache Misses: ${metrics.cacheMisses}`);
  console.log(`  Cache Hit Rate: ${(health.cacheHitRate * 100).toFixed(1)}%`);
  console.log(`  Average Latency: ${health.averageLatency.toFixed(0)}ms`);
  console.log(`  Health Status: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);

  if (metrics.lastError) {
    console.log(`  Last Error: ${metrics.lastError}`);
    console.log(`  Last Error Time: ${metrics.lastErrorTime}`);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 RxNav API Integration Tests\n');
  console.log('═'.repeat(50));

  try {
    // Test 1: RxCUI Lookup
    await testRxCUILookup();

    // Test 2: Interaction Checking
    await testInteractionChecking();

    // Test 3: Caching
    await testCaching();

    // Test 4: Performance
    await testPerformance();

    // Display metrics
    displayMetrics();

    console.log('\n' + '═'.repeat(50));
    console.log('✅ Tests completed!\n');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
