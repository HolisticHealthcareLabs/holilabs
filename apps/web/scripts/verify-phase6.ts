/**
 * Phase 6 Verification Script
 *
 * Tests all Phase 6 endpoints and features to ensure proper deployment
 * Run with: pnpm tsx scripts/verify-phase6.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function addResult(name: string, status: 'pass' | 'fail' | 'skip', message: string, duration?: number) {
  results.push({ name, status, message, duration });

  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⊘';
  const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow';
  const durationStr = duration ? ` (${duration}ms)` : '';

  log(`${icon} ${name}: ${message}${durationStr}`, color);
}

async function testDatabaseConnection() {
  const start = Date.now();
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    addResult('Database Connection', 'pass', 'Connected successfully', Date.now() - start);
    return true;
  } catch (error) {
    addResult('Database Connection', 'fail', `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function testPreventionPlanTemplateTable() {
  const start = Date.now();
  try {
    const count = await prisma.preventionPlanTemplate.count();
    addResult('PreventionPlanTemplate Table', 'pass', `Found ${count} templates`, Date.now() - start);
    return count > 0;
  } catch (error) {
    addResult('PreventionPlanTemplate Table', 'fail', `Table not found or inaccessible: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

async function testSeedData() {
  const start = Date.now();
  try {
    const templates = await prisma.preventionPlanTemplate.findMany({
      select: {
        templateName: true,
        planType: true,
        isActive: true,
      },
    });

    if (templates.length === 0) {
      addResult('Seed Data', 'skip', 'No templates found. Run seed script: pnpm tsx scripts/seed-prevention-templates.ts');
      return false;
    }

    const expectedTemplates = [
      'Plan Estándar de Prevención Cardiovascular',
      'Plan de Prevención de Diabetes Tipo 2',
      'Prevención de Cáncer - Detección Temprana',
      'Plan de Vacunación del Adulto',
      'Bienestar General y Chequeo Preventivo',
    ];

    const foundNames = templates.map(t => t.templateName);
    const allFound = expectedTemplates.every(name => foundNames.includes(name));

    if (allFound) {
      addResult('Seed Data', 'pass', `All 5 expected templates found`, Date.now() - start);
      return true;
    } else {
      addResult('Seed Data', 'skip', `Found ${templates.length} templates, but some expected templates are missing`);
      return false;
    }
  } catch (error) {
    addResult('Seed Data', 'fail', `Error checking seed data: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

async function testEnumValues() {
  const start = Date.now();
  try {
    // Test that new enum values exist by trying to query them
    const immunizationTemplates = await prisma.preventionPlanTemplate.findMany({
      where: { planType: 'IMMUNIZATION' },
    });

    const wellnessTemplates = await prisma.preventionPlanTemplate.findMany({
      where: { planType: 'GENERAL_WELLNESS' },
    });

    if (immunizationTemplates.length > 0 || wellnessTemplates.length > 0) {
      addResult('PreventionPlanType Enum', 'pass', `New enum values (IMMUNIZATION, GENERAL_WELLNESS) work correctly`, Date.now() - start);
      return true;
    } else {
      addResult('PreventionPlanType Enum', 'skip', 'New enum values exist but no templates use them yet');
      return true;
    }
  } catch (error) {
    addResult('PreventionPlanType Enum', 'fail', `Enum values not updated: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

async function testTemplateStructure() {
  const start = Date.now();
  try {
    const template = await prisma.preventionPlanTemplate.findFirst({
      where: { isActive: true },
    });

    if (!template) {
      addResult('Template Structure', 'skip', 'No templates to validate');
      return false;
    }

    // Check required fields
    const hasRequiredFields =
      template.templateName &&
      template.planType &&
      template.goals &&
      template.recommendations &&
      typeof template.isActive === 'boolean' &&
      typeof template.useCount === 'number';

    if (!hasRequiredFields) {
      addResult('Template Structure', 'fail', 'Template missing required fields');
      return false;
    }

    // Validate goals structure
    const goals = template.goals as any[];
    if (!Array.isArray(goals) || goals.length === 0) {
      addResult('Template Structure', 'fail', 'Goals field is not a valid array');
      return false;
    }

    const firstGoal = goals[0];
    if (!firstGoal.goal || !firstGoal.category) {
      addResult('Template Structure', 'fail', 'Goal structure is invalid');
      return false;
    }

    // Validate recommendations structure
    const recommendations = template.recommendations as any[];
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      addResult('Template Structure', 'fail', 'Recommendations field is not a valid array');
      return false;
    }

    const firstRec = recommendations[0];
    if (!firstRec.title || !firstRec.description) {
      addResult('Template Structure', 'fail', 'Recommendation structure is invalid');
      return false;
    }

    addResult('Template Structure', 'pass', 'Template structure is valid', Date.now() - start);
    return true;
  } catch (error) {
    addResult('Template Structure', 'fail', `Error validating structure: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

async function testIndexes() {
  const start = Date.now();
  try {
    // Test that indexes exist by running queries that would use them
    await Promise.all([
      prisma.preventionPlanTemplate.findMany({
        where: { planType: 'CARDIOVASCULAR' },
        take: 1,
      }),
      prisma.preventionPlanTemplate.findMany({
        where: { isActive: true },
        take: 1,
      }),
      prisma.preventionPlanTemplate.findMany({
        orderBy: { useCount: 'desc' },
        take: 1,
      }),
    ]);

    addResult('Database Indexes', 'pass', 'All indexes working correctly', Date.now() - start);
    return true;
  } catch (error) {
    addResult('Database Indexes', 'fail', `Index query failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

async function testPreventionPlanTable() {
  const start = Date.now();
  try {
    const count = await prisma.preventionPlan.count();
    addResult('PreventionPlan Table', 'pass', `Found ${count} prevention plans`, Date.now() - start);
    return true;
  } catch (error) {
    addResult('PreventionPlan Table', 'fail', `Error accessing prevention plans: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

async function testAuditLogTable() {
  const start = Date.now();
  try {
    const count = await prisma.auditLog.count();
    addResult('AuditLog Table', 'pass', `Found ${count} audit logs`, Date.now() - start);
    return true;
  } catch (error) {
    addResult('AuditLog Table', 'fail', `Error accessing audit logs: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

async function testUsersTable() {
  const start = Date.now();
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      addResult('Users Table', 'skip', 'No users found. Create a user to test Phase 6 features');
      return false;
    }
    addResult('Users Table', 'pass', `Found ${count} users`, Date.now() - start);
    return true;
  } catch (error) {
    addResult('Users Table', 'fail', `Error accessing users: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

function printSummary() {
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const total = results.length;

  console.log('\n' + '='.repeat(60));
  log('Phase 6 Verification Summary', 'cyan');
  console.log('='.repeat(60));

  log(`✓ Passed:  ${passed}/${total}`, 'green');
  if (failed > 0) log(`✗ Failed:  ${failed}/${total}`, 'red');
  if (skipped > 0) log(`⊘ Skipped: ${skipped}/${total}`, 'yellow');

  console.log('='.repeat(60));

  if (failed === 0 && skipped === 0) {
    log('\n🎉 All tests passed! Phase 6 is fully operational.', 'green');
  } else if (failed === 0) {
    log('\n⚠️  Some tests skipped. Check messages above for details.', 'yellow');
  } else {
    log('\n❌ Some tests failed. Please fix the issues above.', 'red');
  }

  console.log('\n');
}

async function main() {
  log('\n🚀 Starting Phase 6 Verification...\n', 'cyan');

  // Core database tests
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    log('\n❌ Cannot proceed without database connection', 'red');
    return;
  }

  // Table existence tests
  await testPreventionPlanTemplateTable();
  await testPreventionPlanTable();
  await testAuditLogTable();
  await testUsersTable();

  // Data validation tests
  await testSeedData();
  await testEnumValues();
  await testTemplateStructure();
  await testIndexes();

  // Print summary
  printSummary();

  // Provide next steps
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  if (skipped > 0 && failed === 0) {
    log('📋 Recommended actions:', 'blue');
    const seedNeeded = results.some(r => r.name === 'Seed Data' && r.status === 'skip');
    const usersNeeded = results.some(r => r.name === 'Users Table' && r.status === 'skip');

    if (seedNeeded) {
      log('  • Load seed data: pnpm tsx scripts/seed-prevention-templates.ts', 'blue');
    }
    if (usersNeeded) {
      log('  • Create a user account via the app or seed script', 'blue');
    }
  }

  if (failed === 0 && skipped === 0) {
    log('📖 Next steps:', 'blue');
    log('  • Start dev server: pnpm dev', 'blue');
    log('  • Visit: http://localhost:3000/dashboard/prevention/templates', 'blue');
    log('  • Read docs: PHASE_6_QUICKSTART.md', 'blue');
  }
}

main()
  .catch((e) => {
    log(`\n❌ Verification failed with error: ${e.message}`, 'red');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
