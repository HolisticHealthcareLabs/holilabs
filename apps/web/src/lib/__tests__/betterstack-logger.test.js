"use strict";
/**
 * Test BetterStack Logging Integration
 * Run: LOGTAIL_SOURCE_TOKEN="ppRsuAAsrT4hR8Uw8HAY4UCu" NODE_ENV=production pnpm tsx src/lib/__tests__/betterstack-logger.test.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("@/lib/logger");
console.log('🪵 Testing BetterStack Logging Integration...\n');
// Wait a bit to ensure logger is initialized
setTimeout(async () => {
    console.log('Test 1 - Info Log:');
    logger_1.logger.info({
        event: 'betterstack_test',
        testType: 'info',
    }, 'BetterStack test: Info level log');
    console.log('\nTest 2 - Warning Log:');
    logger_1.logger.warn({
        event: 'betterstack_test',
        testType: 'warning',
        severity: 'medium',
    }, 'BetterStack test: Warning level log');
    console.log('\nTest 3 - Error Log:');
    logger_1.logger.error({
        event: 'betterstack_test',
        testType: 'error',
        errorCode: 'TEST_ERROR',
    }, 'BetterStack test: Error level log');
    console.log('\nTest 4 - Structured Data:');
    logger_1.logger.info({
        event: 'betterstack_test',
        testType: 'structured',
        user: {
            id: 'test-user-123',
            email: 'test@holilabs.com',
        },
        action: 'test_action',
        metadata: {
            browser: 'Chrome',
            version: '120.0',
        },
    }, 'BetterStack test: Structured data log');
    console.log('\n✅ Test logs sent!');
    console.log('\n📊 Check BetterStack dashboard in ~10 seconds:');
    console.log('   https://logs.betterstack.com/team/holi_labs_production');
    console.log('\n💡 Look for logs with event="betterstack_test"');
    // Wait for logs to flush
    setTimeout(() => {
        process.exit(0);
    }, 2000);
}, 500);
//# sourceMappingURL=betterstack-logger.test.js.map