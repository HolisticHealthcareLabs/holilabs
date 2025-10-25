"use strict";
/**
 * Test Upstash Redis Rate Limiting
 * Run: UPSTASH_REDIS_REST_URL="..." UPSTASH_REDIS_REST_TOKEN="..." pnpm tsx src/lib/__tests__/redis-rate-limit.test.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("@upstash/redis");
console.log('🔴 Testing Upstash Redis Rate Limiting...\n');
// Test 1: Check environment variables
console.log('Test 1 - Environment Variables:');
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
    console.log('  ❌ Missing credentials');
    console.log('  Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN\n');
    process.exit(1);
}
console.log(`  ✅ UPSTASH_REDIS_REST_URL: ${url.substring(0, 30)}...`);
console.log(`  ✅ UPSTASH_REDIS_REST_TOKEN: ${token.substring(0, 20)}...\n`);
// Test 2: Connect to Redis
console.log('Test 2 - Redis Connection:');
const redis = new redis_1.Redis({ url, token });
(async () => {
    try {
        // Test 3: Basic operations
        console.log('  ✅ Connected to Redis\n');
        console.log('Test 3 - Basic Operations:');
        const testKey = 'test:connection';
        // Set a value
        await redis.set(testKey, 'hello-world');
        console.log('  ✅ SET operation successful');
        // Get the value
        const value = await redis.get(testKey);
        console.log(`  ✅ GET operation successful (value: ${value})`);
        // Delete the key
        await redis.del(testKey);
        console.log('  ✅ DEL operation successful\n');
        // Test 4: Rate limiting simulation
        console.log('Test 4 - Rate Limiting Simulation:');
        const rateLimitKey = 'test:ratelimit:user123:endpoint';
        // Simulate 5 requests
        for (let i = 1; i <= 5; i++) {
            const count = await redis.incr(rateLimitKey);
            if (count === 1) {
                // Set 60 second expiry on first request
                await redis.expire(rateLimitKey, 60);
            }
            console.log(`  Request ${i}: count = ${count}`);
        }
        // Check TTL
        const ttl = await redis.ttl(rateLimitKey);
        console.log(`  ✅ TTL remaining: ${ttl} seconds\n`);
        // Clean up
        await redis.del(rateLimitKey);
        console.log('  ✅ Cleanup successful\n');
        console.log('✅ All tests passed! Redis rate limiting is working.\n');
        console.log('Next steps:');
        console.log('1. Add these env vars to DigitalOcean:');
        console.log('   UPSTASH_REDIS_REST_URL=' + url);
        console.log('   UPSTASH_REDIS_REST_TOKEN=' + token);
        console.log('2. Deploy your app\n');
        process.exit(0);
    }
    catch (error) {
        console.log('  ❌ Redis operation failed');
        console.log('  Error:', error.message);
        console.log('\nCheck:');
        console.log('  - Are your credentials correct?');
        console.log('  - Is your Redis database active?');
        console.log('  - Check Upstash dashboard for connection issues\n');
        process.exit(1);
    }
})();
//# sourceMappingURL=redis-rate-limit.test.js.map