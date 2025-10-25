#!/usr/bin/env tsx
/**
 * Production Environment Validation Script
 *
 * Validates that all required environment variables are set correctly
 * and performs basic health checks on production services.
 *
 * Usage:
 *   tsx scripts/validate-production.ts
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Critical checks failed
 *   2 - Some non-critical checks failed
 */

import * as https from 'https';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

interface ValidationResult {
  passed: boolean;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

interface CheckResult {
  name: string;
  results: ValidationResult[];
}

// Validation functions
function validateDatabaseUrl(): ValidationResult {
  const url = process.env.DATABASE_URL;

  if (!url) {
    return {
      passed: false,
      message: 'DATABASE_URL is not set',
      severity: 'critical',
    };
  }

  if (!url.includes('sslmode=require')) {
    return {
      passed: false,
      message: 'DATABASE_URL does not include sslmode=require (HIPAA requirement)',
      severity: 'critical',
    };
  }

  if (url.includes('localhost')) {
    return {
      passed: false,
      message: 'DATABASE_URL points to localhost (should be production database)',
      severity: 'critical',
    };
  }

  return {
    passed: true,
    message: 'DATABASE_URL is properly configured',
    severity: 'info',
  };
}

function validateAuthSecrets(): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check SESSION_SECRET
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    results.push({
      passed: false,
      message: 'SESSION_SECRET is not set',
      severity: 'critical',
    });
  } else if (sessionSecret.length < 32) {
    results.push({
      passed: false,
      message: `SESSION_SECRET is too short (${sessionSecret.length} chars, need 32+)`,
      severity: 'critical',
    });
  } else if (sessionSecret.includes('your-') || sessionSecret.includes('test')) {
    results.push({
      passed: false,
      message: 'SESSION_SECRET appears to be a placeholder value',
      severity: 'critical',
    });
  } else {
    results.push({
      passed: true,
      message: 'SESSION_SECRET is properly configured',
      severity: 'info',
    });
  }

  // Check NEXTAUTH_SECRET
  const nextauthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextauthSecret) {
    results.push({
      passed: false,
      message: 'NEXTAUTH_SECRET is not set',
      severity: 'critical',
    });
  } else if (nextauthSecret.length < 32) {
    results.push({
      passed: false,
      message: `NEXTAUTH_SECRET is too short (${nextauthSecret.length} chars, need 32+)`,
      severity: 'critical',
    });
  } else if (nextauthSecret.includes('your-') || nextauthSecret.includes('test')) {
    results.push({
      passed: false,
      message: 'NEXTAUTH_SECRET appears to be a placeholder value',
      severity: 'critical',
    });
  } else {
    results.push({
      passed: true,
      message: 'NEXTAUTH_SECRET is properly configured',
      severity: 'info',
    });
  }

  // Check NEXTAUTH_URL
  const nextauthUrl = process.env.NEXTAUTH_URL;
  if (!nextauthUrl) {
    results.push({
      passed: false,
      message: 'NEXTAUTH_URL is not set',
      severity: 'critical',
    });
  } else if (nextauthUrl.includes('localhost')) {
    results.push({
      passed: false,
      message: 'NEXTAUTH_URL points to localhost (should be production URL)',
      severity: 'critical',
    });
  } else if (!nextauthUrl.startsWith('https://')) {
    results.push({
      passed: false,
      message: 'NEXTAUTH_URL does not use HTTPS',
      severity: 'critical',
    });
  } else {
    results.push({
      passed: true,
      message: `NEXTAUTH_URL is properly configured: ${nextauthUrl}`,
      severity: 'info',
    });
  }

  return results;
}

function validateSupabase(): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check NEXT_PUBLIC_SUPABASE_URL
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    results.push({
      passed: false,
      message: 'NEXT_PUBLIC_SUPABASE_URL is not set',
      severity: 'critical',
    });
  } else if (url.includes('your-project')) {
    results.push({
      passed: false,
      message: 'NEXT_PUBLIC_SUPABASE_URL is a placeholder',
      severity: 'critical',
    });
  } else if (!url.includes('supabase.co')) {
    results.push({
      passed: false,
      message: 'NEXT_PUBLIC_SUPABASE_URL does not appear to be a Supabase URL',
      severity: 'warning',
    });
  } else {
    results.push({
      passed: true,
      message: 'NEXT_PUBLIC_SUPABASE_URL is configured',
      severity: 'info',
    });
  }

  // Check NEXT_PUBLIC_SUPABASE_ANON_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    results.push({
      passed: false,
      message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set',
      severity: 'critical',
    });
  } else if (anonKey.includes('your-')) {
    results.push({
      passed: false,
      message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is a placeholder',
      severity: 'critical',
    });
  } else {
    results.push({
      passed: true,
      message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is configured',
      severity: 'info',
    });
  }

  // Check SUPABASE_SERVICE_ROLE_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    results.push({
      passed: false,
      message: 'SUPABASE_SERVICE_ROLE_KEY is not set',
      severity: 'critical',
    });
  } else if (serviceKey.includes('your-')) {
    results.push({
      passed: false,
      message: 'SUPABASE_SERVICE_ROLE_KEY is a placeholder',
      severity: 'critical',
    });
  } else {
    results.push({
      passed: true,
      message: 'SUPABASE_SERVICE_ROLE_KEY is configured',
      severity: 'info',
    });
  }

  return results;
}

function validateEncryption(): ValidationResult[] {
  const results: ValidationResult[] = [];

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    results.push({
      passed: false,
      message: 'ENCRYPTION_KEY is not set (HIPAA CRITICAL)',
      severity: 'critical',
    });
  } else if (encryptionKey.includes('your-')) {
    results.push({
      passed: false,
      message: 'ENCRYPTION_KEY is a placeholder',
      severity: 'critical',
    });
  } else if (encryptionKey.length < 32) {
    results.push({
      passed: false,
      message: 'ENCRYPTION_KEY is too short for AES-256',
      severity: 'critical',
    });
  } else {
    results.push({
      passed: true,
      message: 'ENCRYPTION_KEY is properly configured',
      severity: 'info',
    });
  }

  return results;
}

function validateNodeEnv(): ValidationResult {
  const nodeEnv = process.env.NODE_ENV;

  if (nodeEnv !== 'production') {
    return {
      passed: false,
      message: `NODE_ENV is "${nodeEnv}" but should be "production"`,
      severity: 'critical',
    };
  }

  return {
    passed: true,
    message: 'NODE_ENV is set to production',
    severity: 'info',
  };
}

function validateAIServices(): ValidationResult[] {
  const results: ValidationResult[] = [];

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    results.push({
      passed: false,
      message: 'ANTHROPIC_API_KEY is not set (AI features will not work)',
      severity: 'warning',
    });
  } else if (anthropicKey.includes('your-')) {
    results.push({
      passed: false,
      message: 'ANTHROPIC_API_KEY is a placeholder',
      severity: 'warning',
    });
  } else if (!anthropicKey.startsWith('sk-ant-')) {
    results.push({
      passed: false,
      message: 'ANTHROPIC_API_KEY does not match expected format (sk-ant-...)',
      severity: 'warning',
    });
  } else {
    results.push({
      passed: true,
      message: 'ANTHROPIC_API_KEY is configured',
      severity: 'info',
    });
  }

  return results;
}

function validateMonitoring(): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check Sentry
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!sentryDsn) {
    results.push({
      passed: false,
      message: 'NEXT_PUBLIC_SENTRY_DSN is not set (no error tracking)',
      severity: 'warning',
    });
  } else if (sentryDsn.includes('your-')) {
    results.push({
      passed: false,
      message: 'NEXT_PUBLIC_SENTRY_DSN is a placeholder',
      severity: 'warning',
    });
  } else {
    results.push({
      passed: true,
      message: 'Sentry error tracking is configured',
      severity: 'info',
    });
  }

  // Check PostHog
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!posthogKey) {
    results.push({
      passed: false,
      message: 'NEXT_PUBLIC_POSTHOG_KEY is not set (no analytics)',
      severity: 'warning',
    });
  } else if (posthogKey.includes('your-')) {
    results.push({
      passed: false,
      message: 'NEXT_PUBLIC_POSTHOG_KEY is a placeholder',
      severity: 'warning',
    });
  } else {
    results.push({
      passed: true,
      message: 'PostHog analytics is configured',
      severity: 'info',
    });
  }

  // Check PostHog host (HIPAA requirement)
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (posthogHost && !posthogHost.includes('us.i.posthog.com')) {
    results.push({
      passed: false,
      message: 'NEXT_PUBLIC_POSTHOG_HOST is not US region (HIPAA requirement)',
      severity: 'warning',
    });
  }

  return results;
}

function validateVapidKeys(): ValidationResult[] {
  const results: ValidationResult[] = [];

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey) {
    results.push({
      passed: false,
      message: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set (push notifications disabled)',
      severity: 'warning',
    });
  } else if (publicKey.includes('your-')) {
    results.push({
      passed: false,
      message: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is a placeholder',
      severity: 'warning',
    });
  } else {
    results.push({
      passed: true,
      message: 'VAPID public key is configured',
      severity: 'info',
    });
  }

  if (!privateKey) {
    results.push({
      passed: false,
      message: 'VAPID_PRIVATE_KEY is not set (push notifications disabled)',
      severity: 'warning',
    });
  } else if (privateKey.includes('your-')) {
    results.push({
      passed: false,
      message: 'VAPID_PRIVATE_KEY is a placeholder',
      severity: 'warning',
    });
  } else {
    results.push({
      passed: true,
      message: 'VAPID private key is configured',
      severity: 'info',
    });
  }

  return results;
}

async function checkHealthEndpoint(url: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const req = https.get(url + '/api/health', (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);

          if (json.status === 'healthy' && json.database === true) {
            resolve({
              passed: true,
              message: 'Health endpoint: Application and database are healthy',
              severity: 'info',
            });
          } else if (json.status === 'healthy' && json.database === false) {
            resolve({
              passed: false,
              message: 'Health endpoint: Application is up but database connection failed',
              severity: 'critical',
            });
          } else {
            resolve({
              passed: false,
              message: `Health endpoint: Unexpected response: ${JSON.stringify(json)}`,
              severity: 'warning',
            });
          }
        } catch (err) {
          resolve({
            passed: false,
            message: `Health endpoint: Invalid JSON response: ${data}`,
            severity: 'warning',
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        passed: false,
        message: `Health endpoint: Cannot connect - ${err.message}`,
        severity: 'critical',
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        passed: false,
        message: 'Health endpoint: Request timeout (5s)',
        severity: 'critical',
      });
    });
  });
}

// Main validation function
async function runValidation() {
  console.log(`\n${colors.bold}${colors.cyan}============================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  Production Environment Validation${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}============================================${colors.reset}\n`);

  console.log(`${colors.dim}Timestamp: ${new Date().toISOString()}${colors.reset}`);
  console.log(`${colors.dim}Node Version: ${process.version}${colors.reset}\n`);

  const checks: CheckResult[] = [];

  // Run all checks
  console.log(`${colors.bold}Running validation checks...${colors.reset}\n`);

  checks.push({
    name: 'Database Configuration',
    results: [validateDatabaseUrl()],
  });

  checks.push({
    name: 'Authentication Secrets',
    results: validateAuthSecrets(),
  });

  checks.push({
    name: 'Supabase Configuration',
    results: validateSupabase(),
  });

  checks.push({
    name: 'PHI Encryption',
    results: validateEncryption(),
  });

  checks.push({
    name: 'Node Environment',
    results: [validateNodeEnv()],
  });

  checks.push({
    name: 'AI Services',
    results: validateAIServices(),
  });

  checks.push({
    name: 'Monitoring',
    results: validateMonitoring(),
  });

  checks.push({
    name: 'Push Notifications',
    results: validateVapidKeys(),
  });

  // Health endpoint check (if app URL is set)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && !appUrl.includes('localhost')) {
    console.log(`${colors.dim}Checking health endpoint at ${appUrl}...${colors.reset}\n`);
    const healthResult = await checkHealthEndpoint(appUrl);
    checks.push({
      name: 'Application Health',
      results: [healthResult],
    });
  }

  // Display results
  let criticalFailures = 0;
  let warnings = 0;
  let totalChecks = 0;
  let passedChecks = 0;

  for (const check of checks) {
    console.log(`${colors.bold}${check.name}${colors.reset}`);

    for (const result of check.results) {
      totalChecks++;

      let icon: string;
      let color: string;

      if (result.passed) {
        icon = '✅';
        color = colors.green;
        passedChecks++;
      } else if (result.severity === 'critical') {
        icon = '❌';
        color = colors.red;
        criticalFailures++;
      } else {
        icon = '⚠️ ';
        color = colors.yellow;
        warnings++;
      }

      console.log(`  ${icon} ${color}${result.message}${colors.reset}`);
    }

    console.log();
  }

  // Summary
  console.log(`${colors.bold}${colors.cyan}============================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  Summary${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}============================================${colors.reset}\n`);

  console.log(`${colors.bold}Total Checks:${colors.reset} ${totalChecks}`);
  console.log(`${colors.green}${colors.bold}Passed:${colors.reset} ${passedChecks}`);
  console.log(`${colors.yellow}${colors.bold}Warnings:${colors.reset} ${warnings}`);
  console.log(`${colors.red}${colors.bold}Critical Failures:${colors.reset} ${criticalFailures}\n`);

  // Final verdict
  if (criticalFailures > 0) {
    console.log(`${colors.red}${colors.bold}❌ VALIDATION FAILED${colors.reset}`);
    console.log(`${colors.red}${criticalFailures} critical issue(s) must be fixed before deploying to production.${colors.reset}\n`);
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  VALIDATION PASSED WITH WARNINGS${colors.reset}`);
    console.log(`${colors.yellow}${warnings} warning(s) should be addressed for optimal production deployment.${colors.reset}\n`);
    process.exit(2);
  } else {
    console.log(`${colors.green}${colors.bold}✅ ALL CHECKS PASSED${colors.reset}`);
    console.log(`${colors.green}Environment is ready for production deployment!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run validation
runValidation().catch((err) => {
  console.error(`${colors.red}Fatal error during validation:${colors.reset}`, err);
  process.exit(1);
});
