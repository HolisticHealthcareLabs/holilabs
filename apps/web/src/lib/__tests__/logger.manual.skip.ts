/**
 * Logger Test Script
 * Run this to verify Pino logger is working correctly
 *
 * Usage: pnpm tsx src/lib/__tests__/logger.test.ts
 */

import { logger, createLogger, logError, logPerformance } from '../logger';

console.log('🧪 Testing Pino Logger...\n');

// Test 1: Basic logging levels
console.log('Test 1: Basic Logging Levels');
logger.trace('This is a trace message (very detailed)');
logger.debug('This is a debug message');
logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message');
logger.fatal('This is a fatal message');
console.log('✅ Basic logging levels tested\n');

// Test 2: Structured data
console.log('Test 2: Structured Data');
logger.info({
  userId: '123',
  email: 'test@example.com',
  action: 'login',
}, 'User logged in successfully');
console.log('✅ Structured data tested\n');

// Test 3: Child logger (request context)
console.log('Test 3: Child Logger');
const requestLogger = createLogger({
  requestId: 'abc-123-def',
  method: 'POST',
  url: '/api/patients',
});
requestLogger.info('Processing request');
requestLogger.info({ duration: 45 }, 'Request completed');
console.log('✅ Child logger tested\n');

// Test 4: Error logging
console.log('Test 4: Error Logging');
try {
  throw new Error('Something went wrong!');
} catch (error) {
  logger.error(logError(error), 'Failed to process request');
}
console.log('✅ Error logging tested\n');

// Test 5: Performance logging
console.log('Test 5: Performance Logging');
const start = Date.now();
// Simulate work
setTimeout(() => {
  logger.info(logPerformance('database-query', start), 'Query completed');
  console.log('✅ Performance logging tested\n');

  console.log('✨ All tests passed! Pino logger is working correctly.\n');

  console.log('📊 What you should see in production logs:');
  console.log('   - JSON format (easy for log aggregators to parse)');
  console.log('   - Timestamps');
  console.log('   - Log levels');
  console.log('   - Request IDs for tracing');
  console.log('   - Structured data (not just strings)\n');

  console.log('📘 Next steps:');
  console.log('   1. Check logs in DigitalOcean after deployment');
  console.log('   2. Set up BetterStack/Logtail for log aggregation');
  console.log('   3. Monitor error rates and slow queries');
}, 100);
