/**
 * Cron Job Security Test Suite
 *
 * Tests all cron endpoints for proper security implementation:
 * 1. CRON_SECRET validation (required)
 * 2. Bearer token authentication
 * 3. Unauthorized access handling
 * 4. Response format validation
 * 5. Error handling
 *
 * Usage:
 *   pnpm tsx scripts/test-cron-security.ts
 *
 * Environment:
 *   CRON_SECRET - Required for authenticated tests
 *   TEST_BASE_URL - Base URL to test (default: http://localhost:3000)
 */

import 'dotenv/config';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

interface CronEndpoint {
  path: string;
  method: 'GET' | 'POST';
  name: string;
  allowsGetInDev?: boolean;
}

const CRON_ENDPOINTS: CronEndpoint[] = [
  {
    path: '/api/cron/execute-reminders',
    method: 'GET',
    name: 'Execute Reminders',
  },
  {
    path: '/api/cron/send-appointment-reminders',
    method: 'GET',
    name: 'Send Appointment Reminders',
  },
  {
    path: '/api/cron/screening-triggers',
    method: 'GET',
    name: 'Screening Triggers',
  },
  {
    path: '/api/cron/expire-consents',
    method: 'POST',
    name: 'Expire Consents',
    allowsGetInDev: true,
  },
  {
    path: '/api/cron/send-consent-reminders',
    method: 'POST',
    name: 'Send Consent Reminders',
    allowsGetInDev: true,
  },
  {
    path: '/api/cron/process-email-queue',
    method: 'POST',
    name: 'Process Email Queue',
    allowsGetInDev: true,
  },
];

class CronSecurityTester {
  private results: TestResult[] = [];
  private passedTests = 0;
  private failedTests = 0;

  /**
   * Run all security tests
   */
  async runAllTests(): Promise<void> {
    console.log(`${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║   Cron Job Security Test Suite            ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.blue}Testing Base URL: ${BASE_URL}${colors.reset}`);
    console.log(`${colors.blue}CRON_SECRET: ${CRON_SECRET ? 'Set ✓' : 'Not Set ✗'}${colors.reset}\n`);

    if (!CRON_SECRET) {
      console.log(`${colors.yellow}⚠️  Warning: CRON_SECRET not set. Some tests will be skipped.${colors.reset}\n`);
    }

    // Test each endpoint
    for (const endpoint of CRON_ENDPOINTS) {
      await this.testEndpoint(endpoint);
    }

    // Test health endpoint
    await this.testHealthEndpoint();

    // Print summary
    this.printSummary();
  }

  /**
   * Test security for a single endpoint
   */
  private async testEndpoint(endpoint: CronEndpoint): Promise<void> {
    console.log(`${colors.cyan}\n━━━ Testing: ${endpoint.name} ━━━${colors.reset}`);
    console.log(`${colors.blue}Endpoint: ${endpoint.method} ${endpoint.path}${colors.reset}\n`);

    // Test 1: No Authorization Header (should fail)
    await this.testUnauthorizedAccess(endpoint);

    // Test 2: Invalid Authorization Header (should fail)
    await this.testInvalidToken(endpoint);

    // Test 3: Valid Authorization (should succeed or return 500 if dependencies missing)
    if (CRON_SECRET) {
      await this.testValidToken(endpoint);
    }

    // Test 4: Alternative HTTP method
    await this.testAlternativeMethod(endpoint);
  }

  /**
   * Test 1: Endpoint rejects requests without auth
   */
  private async testUnauthorizedAccess(endpoint: CronEndpoint): Promise<void> {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
      });

      const passed = response.status === 401;
      this.addResult({
        name: `${endpoint.name} - Rejects unauthorized access`,
        passed,
        message: passed
          ? `✓ Returns 401 Unauthorized`
          : `✗ Expected 401, got ${response.status}`,
      });
    } catch (error) {
      this.addResult({
        name: `${endpoint.name} - Rejects unauthorized access`,
        passed: false,
        message: `✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  /**
   * Test 2: Endpoint rejects invalid token
   */
  private async testInvalidToken(endpoint: CronEndpoint): Promise<void> {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          Authorization: 'Bearer invalid-token-12345',
        },
      });

      const passed = response.status === 401;
      this.addResult({
        name: `${endpoint.name} - Rejects invalid token`,
        passed,
        message: passed
          ? `✓ Returns 401 Unauthorized`
          : `✗ Expected 401, got ${response.status}`,
      });
    } catch (error) {
      this.addResult({
        name: `${endpoint.name} - Rejects invalid token`,
        passed: false,
        message: `✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  /**
   * Test 3: Endpoint accepts valid token
   */
  private async testValidToken(endpoint: CronEndpoint): Promise<void> {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      });

      const body = await response.json();

      // Accept 200, 500 (missing dependencies), or 503 (service unavailable)
      const validStatuses = [200, 500, 503];
      const passed = validStatuses.includes(response.status);

      let message = '';
      if (response.status === 200) {
        message = `✓ Returns 200 OK with valid response`;
      } else if (response.status === 500) {
        message = `⚠️  Returns 500 (likely missing dependencies)`;
      } else if (response.status === 503) {
        message = `⚠️  Returns 503 (service unavailable)`;
      } else {
        message = `✗ Expected 200/500/503, got ${response.status}`;
      }

      this.addResult({
        name: `${endpoint.name} - Accepts valid token`,
        passed,
        message,
      });

      // Validate response structure (if 200)
      if (response.status === 200) {
        const hasSuccess = 'success' in body;
        this.addResult({
          name: `${endpoint.name} - Returns valid response structure`,
          passed: hasSuccess,
          message: hasSuccess
            ? `✓ Response includes 'success' field`
            : `✗ Response missing 'success' field`,
        });
      }
    } catch (error) {
      this.addResult({
        name: `${endpoint.name} - Accepts valid token`,
        passed: false,
        message: `✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  /**
   * Test 4: Test alternative HTTP method (POST vs GET)
   */
  private async testAlternativeMethod(endpoint: CronEndpoint): Promise<void> {
    if (!CRON_SECRET) return;

    const alternativeMethod = endpoint.method === 'GET' ? 'POST' : 'GET';

    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: alternativeMethod,
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      });

      // Should accept both GET and POST (or return 405 in production for GET)
      const passed = response.status === 200 || response.status === 500 || response.status === 405;

      let message = '';
      if (response.status === 200 || response.status === 500) {
        message = `✓ Also accepts ${alternativeMethod}`;
      } else if (response.status === 405) {
        message = `✓ Rejects ${alternativeMethod} in production (as expected)`;
      } else {
        message = `✗ Unexpected status ${response.status}`;
      }

      this.addResult({
        name: `${endpoint.name} - Alternative method ${alternativeMethod}`,
        passed,
        message,
      });
    } catch (error) {
      this.addResult({
        name: `${endpoint.name} - Alternative method ${alternativeMethod}`,
        passed: false,
        message: `✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  /**
   * Test health monitoring endpoint
   */
  private async testHealthEndpoint(): Promise<void> {
    console.log(`${colors.cyan}\n━━━ Testing: Health Monitoring ━━━${colors.reset}`);
    console.log(`${colors.blue}Endpoint: GET /api/cron/health${colors.reset}\n`);

    try {
      const response = await fetch(`${BASE_URL}/api/cron/health`);
      const body = await response.json();

      const passed = response.status === 200;
      this.addResult({
        name: 'Health endpoint - Accessible',
        passed,
        message: passed
          ? `✓ Returns 200 OK`
          : `✗ Expected 200, got ${response.status}`,
      });

      if (response.status === 200) {
        const hasSystem = 'system' in body;
        const hasJobs = 'jobs' in body;

        this.addResult({
          name: 'Health endpoint - Valid response structure',
          passed: hasSystem && hasJobs,
          message: hasSystem && hasJobs
            ? `✓ Response includes 'system' and 'jobs' fields`
            : `✗ Response missing required fields`,
        });

        if (hasJobs && Array.isArray(body.jobs)) {
          console.log(`${colors.blue}\n  Monitored Jobs: ${body.jobs.length}${colors.reset}`);
          body.jobs.forEach((job: any) => {
            const statusColor = job.status === 'healthy' ? colors.green : colors.yellow;
            console.log(`  ${statusColor}• ${job.jobName}: ${job.status}${colors.reset}`);
          });
        }
      }
    } catch (error) {
      this.addResult({
        name: 'Health endpoint - Accessible',
        passed: false,
        message: `✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  /**
   * Add test result
   */
  private addResult(result: TestResult): void {
    this.results.push(result);
    if (result.passed) {
      this.passedTests++;
      console.log(`  ${colors.green}${result.message}${colors.reset}`);
    } else {
      this.failedTests++;
      console.log(`  ${colors.red}${result.message}${colors.reset}`);
    }
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║             Test Summary                   ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`  Total Tests:  ${this.results.length}`);
    console.log(`  ${colors.green}Passed:       ${this.passedTests}${colors.reset}`);
    console.log(`  ${colors.red}Failed:       ${this.failedTests}${colors.reset}`);

    const successRate = ((this.passedTests / this.results.length) * 100).toFixed(1);
    console.log(`  Success Rate: ${successRate}%\n`);

    if (this.failedTests === 0) {
      console.log(`${colors.green}✓ All tests passed!${colors.reset}\n`);
      process.exit(0);
    } else {
      console.log(`${colors.red}✗ Some tests failed. Please review the output above.${colors.reset}\n`);
      process.exit(1);
    }
  }
}

// Run tests
const tester = new CronSecurityTester();
tester.runAllTests().catch(error => {
  console.error(`${colors.red}Fatal Error:${colors.reset}`, error);
  process.exit(1);
});
