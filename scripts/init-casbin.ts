/**
 * Casbin Policy Initialization Script
 *
 * SOC 2 Control: CC6.3 (Authorization & Principle of Least Privilege)
 *
 * This script initializes default RBAC policies for Holi Labs.
 * Run this once during application setup or after database reset.
 *
 * Usage:
 * ```bash
 * pnpm tsx scripts/init-casbin.ts
 * ```
 *
 * Features:
 * - Idempotent (safe to run multiple times)
 * - Validates policy integrity
 * - Generates detailed report
 * - Supports dry-run mode
 *
 * @author Claude Sonnet 4.5
 * @date 2025-12-09
 */

import { initializeDefaultPolicies, checkCasbinHealth, getAllPolicies } from '../apps/web/src/lib/auth/casbin';
import { logger } from '../apps/web/src/lib/logger';

/**
 * Command line arguments
 */
interface InitOptions {
  dryRun: boolean;
  verbose: boolean;
  force: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): InitOptions {
  const args = process.argv.slice(2);

  return {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    force: args.includes('--force') || args.includes('-f'),
  };
}

/**
 * Display policy summary
 */
function displayPolicySummary(policies: string[][]): void {
  console.log('\n📋 Policy Summary:');
  console.log('─'.repeat(80));

  // Group by policy type
  const policyTypes = new Map<string, number>();
  const roleTypes = new Map<string, number>();

  for (const policy of policies) {
    const [type] = policy;

    if (type === 'p') {
      const subject = policy[1];
      policyTypes.set(subject, (policyTypes.get(subject) || 0) + 1);
    } else if (type === 'g') {
      const role = policy[2];
      roleTypes.set(role, (roleTypes.get(role) || 0) + 1);
    }
  }

  // Display role permissions
  console.log('\n🔑 Role Permissions:');
  for (const [role, count] of Array.from(policyTypes.entries()).sort()) {
    console.log(`   ${role.padEnd(20)} → ${count} permissions`);
  }

  // Display role inheritance
  console.log('\n👥 Role Inheritance:');
  for (const [role, count] of Array.from(roleTypes.entries()).sort()) {
    console.log(`   ${role.padEnd(20)} → ${count} parent roles`);
  }

  console.log('\n📊 Total Statistics:');
  console.log(`   Total Policies:      ${policies.length}`);
  console.log(`   Permission Policies: ${policies.filter(p => p[0] === 'p').length}`);
  console.log(`   Role Mappings:       ${policies.filter(p => p[0] === 'g').length}`);
  console.log('─'.repeat(80));
}

/**
 * Validate policy integrity
 */
function validatePolicies(policies: string[][]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Extract all roles from policies
  const definedRoles = new Set<string>();
  const referencedRoles = new Set<string>();

  for (const policy of policies) {
    const [type, ...values] = policy;

    if (type === 'p') {
      // Permission policy: p, subject, object, action, domain, effect
      const [subject] = values;
      definedRoles.add(subject);

      // Validate effect
      const effect = values[4];
      if (effect && !['allow', 'deny'].includes(effect)) {
        errors.push(`Invalid effect "${effect}" for policy: ${JSON.stringify(policy)}`);
      }
    } else if (type === 'g') {
      // Role mapping: g, user, role, domain
      const [user, role] = values;
      referencedRoles.add(user);
      referencedRoles.add(role);
    }
  }

  // Check for orphaned role references
  for (const role of referencedRoles) {
    if (!definedRoles.has(role)) {
      warnings.push(`Role "${role}" is referenced but has no permission policies defined`);
    }
  }

  // Check for expected roles
  const expectedRoles = [
    'ADMIN',
    'PHYSICIAN',
    'CLINICIAN',
    'NURSE',
    'RECEPTIONIST',
    'LAB_TECH',
    'PHARMACIST',
    'STAFF',
  ];

  for (const role of expectedRoles) {
    if (!definedRoles.has(role)) {
      errors.push(`Expected role "${role}" is missing from policies`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Main initialization function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log('🚀 Casbin Policy Initialization');
  console.log('─'.repeat(80));
  console.log(`Mode:    ${options.dryRun ? '🔍 DRY RUN' : '✅ LIVE'}`);
  console.log(`Verbose: ${options.verbose ? 'ON' : 'OFF'}`);
  console.log(`Force:   ${options.force ? 'ON' : 'OFF'}`);
  console.log('─'.repeat(80));

  try {
    // Step 1: Health check
    console.log('\n🏥 Checking Casbin health...');
    const health = await checkCasbinHealth();

    if (!health.healthy) {
      console.error('❌ Casbin health check failed:', health.error);
      process.exit(1);
    }

    console.log('✅ Casbin is healthy');
    if (health.policyCount !== undefined) {
      console.log(`   Current policy count: ${health.policyCount}`);
    }

    // Step 2: Check existing policies
    console.log('\n🔍 Checking existing policies...');
    const existingPolicies = await getAllPolicies();

    if (existingPolicies.length > 0 && !options.force) {
      console.log(`⚠️  Found ${existingPolicies.length} existing policies`);
      console.log('   Use --force to overwrite existing policies');
      console.log('   Exiting without changes...');
      process.exit(0);
    }

    if (existingPolicies.length > 0 && options.force) {
      console.log(`⚠️  Found ${existingPolicies.length} existing policies (will be overwritten due to --force)`);
    } else {
      console.log('   No existing policies found');
    }

    // Step 3: Initialize default policies
    if (options.dryRun) {
      console.log('\n🔍 DRY RUN: Skipping policy initialization');
      console.log('   Run without --dry-run to apply changes');
    } else {
      console.log('\n📝 Initializing default policies...');
      await initializeDefaultPolicies();
      console.log('✅ Default policies initialized');
    }

    // Step 4: Validate policies
    console.log('\n🔎 Validating policies...');
    const allPolicies = await getAllPolicies();
    const validation = validatePolicies(allPolicies);

    if (!validation.valid) {
      console.error('\n❌ Policy validation failed:');
      for (const error of validation.errors) {
        console.error(`   • ${error}`);
      }
      process.exit(1);
    }

    console.log('✅ Policy validation passed');

    if (validation.warnings.length > 0) {
      console.warn('\n⚠️  Warnings:');
      for (const warning of validation.warnings) {
        console.warn(`   • ${warning}`);
      }
    }

    // Step 5: Display summary
    if (options.verbose) {
      displayPolicySummary(allPolicies);
    } else {
      console.log(`\n📊 Initialized ${allPolicies.length} policies`);
      console.log('   Use --verbose to see detailed summary');
    }

    // Step 6: Log success
    logger.info({
      event: 'casbin_initialization_completed',
      policyCount: allPolicies.length,
      dryRun: options.dryRun,
      force: options.force,
    }, 'Casbin policies initialized successfully');

    console.log('\n✅ Initialization completed successfully');
    console.log('─'.repeat(80));

  } catch (error) {
    console.error('\n❌ Initialization failed:');
    console.error(error instanceof Error ? error.message : 'Unknown error');

    logger.error({
      event: 'casbin_initialization_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to initialize Casbin policies');

    process.exit(1);
  }
}

/**
 * Display usage information
 */
function displayUsage(): void {
  console.log(`
Usage: pnpm tsx scripts/init-casbin.ts [options]

Options:
  --dry-run       Validate without applying changes
  --verbose, -v   Display detailed policy summary
  --force, -f     Overwrite existing policies
  --help, -h      Display this help message

Examples:
  # Initialize policies (fails if policies already exist)
  pnpm tsx scripts/init-casbin.ts

  # Preview changes without applying
  pnpm tsx scripts/init-casbin.ts --dry-run

  # Force overwrite existing policies
  pnpm tsx scripts/init-casbin.ts --force

  # Verbose output with detailed summary
  pnpm tsx scripts/init-casbin.ts --verbose

SOC 2 Control: CC6.3 (Authorization & Principle of Least Privilege)
  `);
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  displayUsage();
  process.exit(0);
}

// Run main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
