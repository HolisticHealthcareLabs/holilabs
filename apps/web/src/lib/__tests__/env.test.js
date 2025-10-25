"use strict";
/**
 * Environment Variable Validation Test
 *
 * Run this to test env validation without crashing the app
 * Usage: pnpm tsx src/lib/__tests__/env.test.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("../env");
console.log('🧪 Testing Environment Variable Validation...\n');
// Test 1: Basic validation
console.log('Test 1: Validate Current Environment');
try {
    const env = (0, env_1.validateEnv)({ exitOnError: false, skipDatabaseCheck: true });
    console.log('✅ Environment validation passed');
    console.log(`   NODE_ENV: ${env.NODE_ENV}`);
    console.log(`   Has Supabase: ${!!env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`   Has Database: ${!!env.DATABASE_URL}`);
    console.log(`   Has Encryption Key: ${!!env.ENCRYPTION_KEY}`);
    console.log(`   Has Redis: ${!!(env.REDIS_URL || env.UPSTASH_REDIS_REST_URL)}`);
}
catch (error) {
    console.log('❌ Validation failed (expected if required vars missing)');
    console.log(`   Error: ${error.message}`);
}
console.log('');
// Test 2: Get environment (cached)
console.log('Test 2: Get Cached Environment');
try {
    const env = (0, env_1.getEnv)();
    console.log('✅ Retrieved cached environment');
    console.log(`   LOG_LEVEL: ${env.LOG_LEVEL}`);
}
catch (error) {
    console.log('⚠️  Could not get environment:', error.message);
}
console.log('');
// Test 3: Feature flags
console.log('Test 3: Feature Flags');
try {
    console.log(`   Blockchain enabled: ${(0, env_1.isFeatureEnabled)('ENABLE_BLOCKCHAIN')}`);
    console.log(`   Sentry enabled: ${(0, env_1.isFeatureEnabled)('NEXT_PUBLIC_SENTRY_DSN')}`);
    console.log(`   Redis enabled: ${(0, env_1.isFeatureEnabled)('REDIS_URL') || (0, env_1.isFeatureEnabled)('UPSTASH_REDIS_REST_URL')}`);
    console.log('✅ Feature flags checked');
}
catch (error) {
    console.log('⚠️  Could not check features:', error.message);
}
console.log('');
// Test 4: Required env vars
console.log('Test 4: Get Required Variables');
try {
    const supabaseUrl = (0, env_1.getRequiredEnv)('NEXT_PUBLIC_SUPABASE_URL');
    console.log('✅ Required var exists: NEXT_PUBLIC_SUPABASE_URL');
    console.log(`   Value: ${supabaseUrl.substring(0, 30)}...`);
}
catch (error) {
    console.log('❌ Required var missing: NEXT_PUBLIC_SUPABASE_URL');
}
console.log('');
// Test 5: Simulate missing required var
console.log('Test 5: Simulate Missing Required Var');
const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
try {
    // Clear cache to force re-validation
    env_1.validateEnv.cachedEnv = null;
    (0, env_1.validateEnv)({ exitOnError: false });
    console.log('❌ Should have failed but didn\'t');
}
catch (error) {
    console.log('✅ Correctly caught missing variable');
}
// Restore
process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
console.log('');
console.log('✨ All tests completed!\n');
console.log('📊 Current Environment Status:');
try {
    const env = (0, env_1.getEnv)();
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   Log Level: ${env.LOG_LEVEL}`);
    console.log(`\n   ✅ Required:`);
    console.log(`      Supabase: ${env.NEXT_PUBLIC_SUPABASE_URL ? '✓' : '✗'}`);
    console.log(`\n   ⚠️  Recommended:`);
    console.log(`      Database: ${env.DATABASE_URL ? '✓' : '✗'}`);
    console.log(`      Encryption: ${env.ENCRYPTION_KEY ? '✓' : '✗'}`);
    console.log(`      NextAuth Secret: ${env.NEXTAUTH_SECRET ? '✓' : '✗'}`);
    console.log(`\n   📧 Optional:`);
    console.log(`      Email (Resend): ${env.RESEND_API_KEY ? '✓' : '✗'}`);
    console.log(`      AI (Anthropic): ${env.ANTHROPIC_API_KEY ? '✓' : '✗'}`);
    console.log(`\n   🔧 Infrastructure:`);
    console.log(`      Redis: ${(env.REDIS_URL || env.UPSTASH_REDIS_REST_URL) ? '✓' : '✗'}`);
    console.log(`      Sentry: ${env.NEXT_PUBLIC_SENTRY_DSN ? '✓' : '✗'}`);
    console.log(`\n   📅 Calendar OAuth:`);
    console.log(`      Google: ${(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) ? '✓' : '✗'}`);
    console.log(`      Microsoft: ${(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) ? '✓' : '✗'}`);
}
catch (error) {
    console.log('Could not get environment status');
}
console.log('\n📖 Next steps:');
console.log('   1. Ensure required variables are set in DigitalOcean');
console.log('   2. Add optional variables as needed');
console.log('   3. Deploy and check logs for validation messages\n');
//# sourceMappingURL=env.test.js.map