#!/usr/bin/env tsx
/**
 * Phase 6 Management CLI
 *
 * Interactive command-line tool for managing Phase 6 features
 * Run with: pnpm tsx scripts/phase6-cli.ts
 */

import { PrismaClient, PreventionPlanType } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message: string) {
  console.log('\n' + '='.repeat(60));
  log(message, 'cyan');
  console.log('='.repeat(60) + '\n');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${prompt}${colors.reset}`, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function listTemplates() {
  header('📋 Prevention Plan Templates');

  const templates = await prisma.preventionPlanTemplate.findMany({
    orderBy: [
      { isActive: 'desc' },
      { useCount: 'desc' },
    ],
  });

  if (templates.length === 0) {
    log('No templates found.', 'yellow');
    log('Run: pnpm tsx scripts/seed-prevention-templates.ts', 'dim');
    return;
  }

  console.log(`Found ${templates.length} templates:\n`);

  templates.forEach((template, index) => {
    const status = template.isActive ? '✓ Active' : '✗ Inactive';
    const statusColor = template.isActive ? 'green' : 'dim';

    log(`${index + 1}. ${template.templateName}`, 'bright');
    log(`   Type: ${template.planType}`, 'reset');
    log(`   Status: ${status}`, statusColor);
    log(`   Used: ${template.useCount} times`, 'reset');
    if (template.lastUsedAt) {
      log(`   Last used: ${template.lastUsedAt.toLocaleDateString()}`, 'dim');
    }
    log(`   ID: ${template.id}`, 'dim');
    console.log();
  });
}

async function viewTemplate() {
  const templates = await prisma.preventionPlanTemplate.findMany({
    where: { isActive: true },
    select: { id: true, templateName: true },
  });

  if (templates.length === 0) {
    log('No templates available.', 'yellow');
    return;
  }

  console.log('\nAvailable templates:');
  templates.forEach((t, i) => {
    console.log(`${i + 1}. ${t.templateName}`);
  });

  const choice = await question('\nEnter template number (or ID): ');
  const index = parseInt(choice) - 1;

  let template;
  if (index >= 0 && index < templates.length) {
    template = await prisma.preventionPlanTemplate.findUnique({
      where: { id: templates[index].id },
    });
  } else {
    template = await prisma.preventionPlanTemplate.findUnique({
      where: { id: choice },
    });
  }

  if (!template) {
    log('Template not found.', 'red');
    return;
  }

  header(`📄 ${template.templateName}`);

  log(`Type: ${template.planType}`, 'reset');
  log(`Status: ${template.isActive ? 'Active' : 'Inactive'}`, template.isActive ? 'green' : 'dim');
  log(`Guideline: ${template.guidelineSource || 'N/A'}`, 'reset');
  log(`Evidence Level: ${template.evidenceLevel || 'N/A'}`, 'reset');
  log(`Used: ${template.useCount} times`, 'reset');
  if (template.description) {
    log(`\nDescription:`, 'bright');
    log(template.description, 'reset');
  }

  const goals = template.goals as any[];
  if (goals && goals.length > 0) {
    log(`\nGoals (${goals.length}):`, 'bright');
    goals.forEach((goal, i) => {
      log(`  ${i + 1}. ${goal.goal}`, 'green');
      log(`     Category: ${goal.category || 'N/A'}`, 'dim');
      log(`     Timeframe: ${goal.timeframe || 'N/A'}`, 'dim');
      log(`     Priority: ${goal.priority || 'medium'}`, 'dim');
    });
  }

  const recommendations = template.recommendations as any[];
  if (recommendations && recommendations.length > 0) {
    log(`\nRecommendations (${recommendations.length}):`, 'bright');
    recommendations.forEach((rec, i) => {
      log(`  ${i + 1}. ${rec.title}`, 'blue');
      log(`     ${rec.description}`, 'reset');
      log(`     Category: ${rec.category || 'N/A'}, Priority: ${rec.priority || 'medium'}`, 'dim');
    });
  }

  console.log();
}

async function toggleTemplateStatus() {
  const templates = await prisma.preventionPlanTemplate.findMany({
    select: { id: true, templateName: true, isActive: true },
  });

  if (templates.length === 0) {
    log('No templates available.', 'yellow');
    return;
  }

  console.log('\nTemplates:');
  templates.forEach((t, i) => {
    const status = t.isActive ? '✓' : '✗';
    console.log(`${i + 1}. ${status} ${t.templateName}`);
  });

  const choice = await question('\nEnter template number to toggle: ');
  const index = parseInt(choice) - 1;

  if (index < 0 || index >= templates.length) {
    log('Invalid choice.', 'red');
    return;
  }

  const template = templates[index];
  const updated = await prisma.preventionPlanTemplate.update({
    where: { id: template.id },
    data: { isActive: !template.isActive },
  });

  log(`\n✓ ${updated.templateName} is now ${updated.isActive ? 'ACTIVE' : 'INACTIVE'}`, 'green');
}

async function showStats() {
  header('📊 Phase 6 Statistics');

  const [
    totalTemplates,
    activeTemplates,
    totalPlans,
    activePlans,
    auditLogs,
  ] = await Promise.all([
    prisma.preventionPlanTemplate.count(),
    prisma.preventionPlanTemplate.count({ where: { isActive: true } }),
    prisma.preventionPlan.count(),
    prisma.preventionPlan.count({ where: { status: 'ACTIVE' } }),
    prisma.auditLog.count({ where: { resource: 'prevention_plan' } }),
  ]);

  log(`Templates:`, 'bright');
  log(`  Total: ${totalTemplates}`, 'reset');
  log(`  Active: ${activeTemplates}`, 'green');
  log(`  Inactive: ${totalTemplates - activeTemplates}`, 'dim');

  log(`\nPrevention Plans:`, 'bright');
  log(`  Total: ${totalPlans}`, 'reset');
  log(`  Active: ${activePlans}`, 'green');
  log(`  Other: ${totalPlans - activePlans}`, 'dim');

  log(`\nAudit Logs:`, 'bright');
  log(`  Prevention-related: ${auditLogs}`, 'reset');

  // Most used templates
  const mostUsed = await prisma.preventionPlanTemplate.findMany({
    where: { useCount: { gt: 0 } },
    orderBy: { useCount: 'desc' },
    take: 5,
    select: { templateName: true, useCount: true },
  });

  if (mostUsed.length > 0) {
    log(`\nMost Used Templates:`, 'bright');
    mostUsed.forEach((t, i) => {
      log(`  ${i + 1}. ${t.templateName}: ${t.useCount} uses`, 'blue');
    });
  }

  // Templates by type
  const byType = await prisma.preventionPlanTemplate.groupBy({
    by: ['planType'],
    _count: true,
    orderBy: { _count: { planType: 'desc' } },
  });

  if (byType.length > 0) {
    log(`\nTemplates by Type:`, 'bright');
    byType.forEach((t) => {
      log(`  ${t.planType}: ${t._count} templates`, 'reset');
    });
  }

  console.log();
}

async function searchTemplates() {
  const query = await question('Search query: ');

  if (!query) {
    log('No query provided.', 'yellow');
    return;
  }

  const templates = await prisma.preventionPlanTemplate.findMany({
    where: {
      OR: [
        { templateName: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { guidelineSource: { contains: query, mode: 'insensitive' } },
      ],
    },
  });

  if (templates.length === 0) {
    log(`No templates found matching "${query}"`, 'yellow');
    return;
  }

  header(`🔍 Search Results: "${query}"`);
  log(`Found ${templates.length} templates:\n`, 'green');

  templates.forEach((template, index) => {
    log(`${index + 1}. ${template.templateName}`, 'bright');
    log(`   Type: ${template.planType}`, 'reset');
    log(`   Status: ${template.isActive ? 'Active' : 'Inactive'}`, template.isActive ? 'green' : 'dim');
    if (template.description) {
      const snippet = template.description.substring(0, 80) + (template.description.length > 80 ? '...' : '');
      log(`   ${snippet}`, 'dim');
    }
    console.log();
  });
}

async function recentActivity() {
  header('⏱️  Recent Activity');

  // Get recent template updates
  const recentTemplates = await prisma.preventionPlanTemplate.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: {
      templateName: true,
      updatedAt: true,
      useCount: true,
      lastUsedAt: true,
    },
  });

  if (recentTemplates.length > 0) {
    log('Recently Updated Templates:', 'bright');
    recentTemplates.forEach((t, i) => {
      const timeAgo = getTimeAgo(t.updatedAt);
      log(`  ${i + 1}. ${t.templateName}`, 'blue');
      log(`     Updated: ${timeAgo}`, 'dim');
      if (t.lastUsedAt) {
        const usedAgo = getTimeAgo(t.lastUsedAt);
        log(`     Last used: ${usedAgo}`, 'dim');
      }
    });
  }

  // Get recent prevention plans
  const recentPlans = await prisma.preventionPlan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      planName: true,
      createdAt: true,
      status: true,
    },
  });

  if (recentPlans.length > 0) {
    log('\nRecently Created Plans:', 'bright');
    recentPlans.forEach((p, i) => {
      const timeAgo = getTimeAgo(p.createdAt);
      log(`  ${i + 1}. ${p.planName}`, 'green');
      log(`     Created: ${timeAgo}, Status: ${p.status}`, 'dim');
    });
  }

  console.log();
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

async function showMenu() {
  header('🏥 Phase 6 Management CLI');

  console.log('1. List all templates');
  console.log('2. View template details');
  console.log('3. Toggle template active/inactive');
  console.log('4. Search templates');
  console.log('5. View statistics');
  console.log('6. Recent activity');
  console.log('7. Run verification tests');
  console.log('0. Exit');
  console.log();

  const choice = await question('Select an option: ');

  switch (choice) {
    case '1':
      await listTemplates();
      break;
    case '2':
      await viewTemplate();
      break;
    case '3':
      await toggleTemplateStatus();
      break;
    case '4':
      await searchTemplates();
      break;
    case '5':
      await showStats();
      break;
    case '6':
      await recentActivity();
      break;
    case '7':
      log('\nRunning verification tests...', 'cyan');
      rl.close();
      await prisma.$disconnect();
      // Execute verification script
      const { execSync } = require('child_process');
      execSync('pnpm tsx scripts/verify-phase6.ts', { stdio: 'inherit' });
      process.exit(0);
      break;
    case '0':
      log('\nGoodbye! 👋', 'green');
      rl.close();
      await prisma.$disconnect();
      process.exit(0);
      break;
    default:
      log('Invalid option. Please try again.', 'red');
  }

  // Show menu again
  await showMenu();
}

async function main() {
  try {
    // Test connection
    await prisma.$connect();

    // Show menu
    await showMenu();
  } catch (error) {
    log(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red');
    console.error(error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
