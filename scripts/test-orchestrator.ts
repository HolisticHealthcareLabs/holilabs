#!/usr/bin/env tsx

/**
 * test-orchestrator.ts
 *
 * Automated test suite orchestrator for E2E testing.
 * Runs all test suites sequentially, collects results, and generates JSON report.
 *
 * Usage:
 *   tsx scripts/test-orchestrator.ts [--fix-and-retry] [--json-output <path>]
 *
 * Features:
 *   - Sequential test suite execution
 *   - Machine-readable JSON report output
 *   - Support for retry on failure
 *   - Duration tracking per suite
 *   - Detailed failure information collection
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface TestSuiteConfig {
  name: string;
  grep: string; // Playwright grep pattern
  timeout?: number; // Suite-specific timeout in ms
}

interface TestResult {
  name: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number; // ms
  succeeded: boolean;
  failures: FailureInfo[];
  timestamp: string;
}

interface FailureInfo {
  title: string;
  error?: string;
  location?: string;
}

interface OrchestrationReport {
  timestamp: string;
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number; // ms
  suites: TestResult[];
  succeeded: boolean;
  failedSuites: string[];
}

// ============================================================================
// Configuration
// ============================================================================

const TEST_SUITES: TestSuiteConfig[] = [
  { name: 'public', grep: '@public' },
  { name: 'auth', grep: '@auth' },
  { name: 'dashboard', grep: '@dashboard' },
  { name: 'portal', grep: '@portal' },
  { name: 'clinical', grep: '@clinical' },
  { name: 'enterprise', grep: '@enterprise' },
  { name: 'a11y', grep: '@a11y' },
];

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEST_RESULTS_DIR = path.join(PROJECT_ROOT, 'test-results');
const PLAYWRIGHT_REPORT_DIR = path.join(PROJECT_ROOT, 'playwright-report');

// ============================================================================
// Logging
// ============================================================================

const Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = Colors.reset): void {
  console.log(`${color}${message}${Colors.reset}`);
}

function logInfo(message: string): void {
  log(`ℹ  ${message}`, Colors.blue);
}

function logSuccess(message: string): void {
  log(`✓  ${message}`, Colors.green);
}

function logError(message: string): void {
  log(`✗  ${message}`, Colors.red);
}

function logWarn(message: string): void {
  log(`⚠  ${message}`, Colors.yellow);
}

// ============================================================================
// Command Execution
// ============================================================================

function spawnProcess(
  command: string,
  args: string[],
  options?: any
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      ...options,
    });

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0,
      });
    });
  });
}

// ============================================================================
// Test Suite Execution
// ============================================================================

async function runTestSuite(suite: TestSuiteConfig): Promise<TestResult> {
  const startTime = Date.now();

  logInfo(`Running test suite: ${suite.name}`);

  const args = [
    'exec',
    'playwright',
    'test',
    '--grep',
    suite.grep,
    '--reporter=json',
    `--reporter=html=${PLAYWRIGHT_REPORT_DIR}/${suite.name}`,
  ];

  const result = await spawnProcess('pnpm', args);
  const duration = Date.now() - startTime;

  // Parse JSON results
  const jsonReportPath = path.join(TEST_RESULTS_DIR, 'index.json');
  let testResult: TestResult = {
    name: suite.name,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration,
    succeeded: result.exitCode === 0,
    failures: [],
    timestamp: new Date().toISOString(),
  };

  if (fs.existsSync(jsonReportPath)) {
    try {
      const rawReport = JSON.parse(fs.readFileSync(jsonReportPath, 'utf-8'));
      testResult.passed = rawReport.stats?.expected || 0;
      testResult.failed = rawReport.stats?.unexpected || 0;
      testResult.skipped = rawReport.stats?.skipped || 0;

      // Extract failure details if present
      if (rawReport.suites) {
        for (const suite of rawReport.suites) {
          for (const test of suite.tests || []) {
            if (test.status === 'failed' && test.results) {
              for (const testResult of test.results) {
                if (testResult.error) {
                  testResult.failures.push({
                    title: test.title,
                    error: testResult.error.message,
                    location: `${suite.title} > ${test.title}`,
                  });
                }
              }
            }
          }
        }
      }
    } catch (e) {
      logWarn(`Failed to parse test results for ${suite.name}`);
    }
  }

  if (testResult.succeeded) {
    logSuccess(
      `${suite.name}: ${testResult.passed} passed, ${testResult.failed} failed (${duration}ms)`
    );
  } else {
    logError(
      `${suite.name}: ${testResult.passed} passed, ${testResult.failed} failed (${duration}ms)`
    );
  }

  return testResult;
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(results: TestResult[]): OrchestrationReport {
  const report: OrchestrationReport = {
    timestamp: new Date().toISOString(),
    totalSuites: results.length,
    passedSuites: results.filter((r) => r.succeeded).length,
    failedSuites: results.filter((r) => !r.succeeded).length,
    totalTests: results.reduce((sum, r) => sum + r.passed + r.failed, 0),
    totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
    suites: results,
    succeeded: results.every((r) => r.succeeded),
    failedSuites: results.filter((r) => !r.succeeded).map((r) => r.name),
  };

  return report;
}

function printReportSummary(report: OrchestrationReport): void {
  console.log('');
  logInfo('==========================================');
  logInfo('  Test Orchestration Report');
  logInfo('==========================================');
  console.log('');

  logInfo('Suite Summary:');
  console.log(`  Total Suites:  ${report.totalSuites}`);
  console.log(`  Passed:        ${Colors.green}${report.passedSuites}${Colors.reset}`);
  console.log(`  Failed:        ${Colors.red}${report.failedSuites}${Colors.reset}`);
  console.log('');

  logInfo('Test Summary:');
  console.log(`  Total Tests:   ${report.totalTests}`);
  console.log(`  Passed:        ${Colors.green}${report.totalPassed}${Colors.reset}`);
  console.log(`  Failed:        ${Colors.red}${report.totalFailed}${Colors.reset}`);
  console.log(`  Skipped:       ${report.totalSkipped}`);
  console.log('');

  logInfo('Performance:');
  console.log(`  Total Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
  console.log('');

  if (report.failedSuites.length > 0) {
    logError('Failed Suites:');
    for (const suite of report.failedSuites) {
      console.log(`  - ${suite}`);
    }
    console.log('');
  }

  if (report.succeeded) {
    logSuccess('All test suites passed!');
  } else {
    logError('Some test suites failed. See details above.');
  }

  console.log('');
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fixAndRetry = args.includes('--fix-and-retry');
  let jsonOutput = path.join(PROJECT_ROOT, 'test-report.json');

  // Parse --json-output flag
  const jsonIndex = args.indexOf('--json-output');
  if (jsonIndex !== -1 && args[jsonIndex + 1]) {
    jsonOutput = args[jsonIndex + 1];
  }

  logInfo('==========================================');
  logInfo('  Test Orchestrator - holilabsv2');
  logInfo('==========================================');
  console.log('');

  // Ensure directories exist
  if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(PLAYWRIGHT_REPORT_DIR)) {
    fs.mkdirSync(PLAYWRIGHT_REPORT_DIR, { recursive: true });
  }

  // Run all test suites sequentially
  const results: TestResult[] = [];
  for (const suite of TEST_SUITES) {
    try {
      const result = await runTestSuite(suite);
      results.push(result);
    } catch (error) {
      logError(`Failed to run suite ${suite.name}: ${error}`);
      results.push({
        name: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        succeeded: false,
        failures: [
          {
            title: 'Suite execution failed',
            error: String(error),
          },
        ],
        timestamp: new Date().toISOString(),
      });
    }

    // Small delay between suites
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Generate report
  const report = generateReport(results);
  printReportSummary(report);

  // Write JSON report
  fs.writeFileSync(jsonOutput, JSON.stringify(report, null, 2));
  logSuccess(`Report saved to: ${jsonOutput}`);

  // Exit with appropriate code
  process.exit(report.succeeded ? 0 : 1);
}

// Run main
main().catch((error) => {
  logError(`Fatal error: ${error}`);
  process.exit(1);
});
