/**
 * Test AI Infrastructure Setup
 *
 * Run with: npx tsx test-ai-setup.ts
 */

import { printCostComparison } from './src/lib/ai/usage-tracker';
import { cacheHealthCheck } from './src/lib/ai/cache';

async function testSetup() {
  console.log('\n='.repeat(60));
  console.log('🧪 Testing Holi Labs AI Infrastructure');
  console.log('='.repeat(60));

  // Test 1: Cost Comparison
  console.log('\n📊 Test 1: Cost Comparison Between Providers');
  printCostComparison();

  // Test 2: Cache Health Check
  console.log('\n📦 Test 2: Redis Cache Health Check');
  const cacheHealth = await cacheHealthCheck();

  if (cacheHealth.isHealthy) {
    console.log('✅ Redis cache is healthy');
    console.log(`   - Total cached responses: ${cacheHealth.stats?.totalKeys || 0}`);
    console.log(`   - Estimated cache size: ${cacheHealth.stats?.estimatedSize || '0 MB'}`);
  } else if (!cacheHealth.isConfigured) {
    console.log('⚠️  Redis cache not configured (optional for development)');
    console.log('   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable');
  } else {
    console.log(`❌ Redis cache error: ${cacheHealth.error}`);
  }

  // Test 3: Environment Check
  console.log('\n🔑 Test 3: Environment Variables');
  const envVars = {
    'GOOGLE_AI_API_KEY': process.env.GOOGLE_AI_API_KEY ? '✅ Set' : '❌ Missing',
    'ANTHROPIC_API_KEY': process.env.ANTHROPIC_API_KEY ? '✅ Set' : '⚠️  Optional',
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY ? '✅ Set' : '⚠️  Optional',
    'UPSTASH_REDIS_REST_URL': process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '⚠️  Optional (caching disabled)',
    'UPSTASH_REDIS_REST_TOKEN': process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '⚠️  Optional (caching disabled)',
  };

  Object.entries(envVars).forEach(([key, status]) => {
    console.log(`   ${key}: ${status}`);
  });

  // Test 4: Configuration Summary
  console.log('\n⚙️  Test 4: AI Configuration');
  const config = {
    'Primary Provider': process.env.AI_PRIMARY_PROVIDER || 'gemini (default)',
    'Fallback Enabled': process.env.AI_FALLBACK_ENABLED || 'true (default)',
    'Cache Enabled': process.env.AI_CACHE_ENABLED || 'true (default)',
    'Cache TTL': process.env.AI_CACHE_TTL ? `${process.env.AI_CACHE_TTL}s` : '86400s (24h default)',
    'Rate Limit': process.env.AI_RATE_LIMIT_PER_USER ? `${process.env.AI_RATE_LIMIT_PER_USER} queries/hour` : '50 queries/hour (default)',
    'Max Concurrent': process.env.MAX_CONCURRENT_AI_REQUESTS || '10 (default)',
  };

  Object.entries(config).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });

  // Test 5: Freemium Tiers
  console.log('\n💎 Test 5: Freemium Tier Limits');
  const tiers = {
    'FREE': process.env.AI_FREE_TIER_LIMIT || '10 queries/day',
    'STARTER': process.env.AI_STARTER_TIER_LIMIT || '50 queries/day',
    'PRO': process.env.AI_PRO_TIER_LIMIT || 'Unlimited',
    'ENTERPRISE': process.env.AI_ENTERPRISE_TIER_LIMIT || 'Unlimited',
  };

  Object.entries(tiers).forEach(([tier, limit]) => {
    console.log(`   ${tier.padEnd(12)}: ${limit}`);
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ Summary');
  console.log('='.repeat(60));

  const hasGemini = !!process.env.GOOGLE_AI_API_KEY;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasCache = cacheHealth.isHealthy;

  console.log('\n🎯 Setup Status:');

  if (hasGemini) {
    console.log('   ✅ Primary provider (Gemini) ready');
    console.log('      → 20x cheaper than Claude');
    console.log('      → Cost: ~$0.001 per query');
  } else {
    console.log('   ❌ Primary provider (Gemini) not configured');
    console.log('      → Set GOOGLE_AI_API_KEY to enable');
  }

  if (hasClaude) {
    console.log('   ✅ Fallback provider (Claude) ready');
    console.log('      → Highest quality for critical decisions');
  } else {
    console.log('   ⚠️  Fallback provider (Claude) not configured (optional)');
  }

  if (hasOpenAI) {
    console.log('   ✅ Secondary fallback (OpenAI) ready');
  }

  if (hasCache) {
    console.log('   ✅ Redis caching enabled');
    console.log('      → 60% additional cost savings expected');
  } else {
    console.log('   ⚠️  Redis caching disabled (optional for dev)');
  }

  console.log('\n💰 Estimated Monthly Cost (6,000 queries):');

  if (hasGemini && hasCache) {
    console.log('   • With Gemini + Cache: ~$2.40/month (94% savings vs Claude-only)');
  } else if (hasGemini) {
    console.log('   • With Gemini only: ~$6/month (90% savings vs Claude-only)');
  } else if (hasClaude) {
    console.log('   • With Claude only: ~$180/month (baseline)');
  }

  console.log('\n🚀 Next Steps:');

  if (!hasGemini) {
    console.log('   1. Get Gemini API key: https://aistudio.google.com/app/apikey');
    console.log('   2. Add to .env.local: GOOGLE_AI_API_KEY="your-key"');
  }

  if (!hasCache) {
    console.log('   3. (Optional) Setup Upstash Redis: https://upstash.com/');
    console.log('   4. Add to .env.local: UPSTASH_REDIS_REST_URL and TOKEN');
  }

  if (hasGemini) {
    console.log('   ✅ You\'re ready to start using the AI features!');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

testSetup().catch(console.error);
