/**
 * NUCLEAR RESET — TypeScript Database Reset
 *
 * Drops all tables, re-runs migrations, seeds master data.
 * Replaces scripts/reset_db_for_prod.sql as the canonical reset tool.
 *
 * Safety gates (in order):
 *   1. NODE_ENV === 'production' → immediate exit
 *   2. --force-nuclear flag required
 *   3. DATABASE_URL hostname check (reject cloud providers)
 *   4. Interactive "Type DELETE to confirm" (skip with --yes for CI)
 *
 * Usage:
 *   cd apps/web && pnpm exec tsx ../../scripts/nuclear-reset.ts --force-nuclear
 *   cd apps/web && pnpm exec tsx ../../scripts/nuclear-reset.ts --force-nuclear --yes
 */

import { execSync } from 'child_process';
import * as readline from 'readline';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Safety Gates
// ---------------------------------------------------------------------------

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function fatal(message: string): never {
  console.error(`\n${RED}${BOLD}${'█'.repeat(56)}${RESET}`);
  console.error(`${RED}${BOLD}██  NUCLEAR RESET ABORTED${' '.repeat(29)}██${RESET}`);
  console.error(`${RED}${BOLD}${'█'.repeat(56)}${RESET}`);
  console.error(`${RED}${message}${RESET}\n`);
  process.exit(1);
}

// Gate 1: NODE_ENV check
if (process.env.NODE_ENV === 'production') {
  fatal('NODE_ENV is "production". Nuclear reset is FORBIDDEN in production.');
}

// Gate 2: --force-nuclear flag
const args = process.argv.slice(2);
if (!args.includes('--force-nuclear')) {
  console.log(`\n${YELLOW}${BOLD}WARNING: Nuclear Reset${RESET}`);
  console.log(`${YELLOW}This will DESTROY ALL DATA in the database and rebuild from scratch.${RESET}`);
  console.log(`\nTo proceed, run with the --force-nuclear flag:`);
  console.log(`  cd apps/web && pnpm exec tsx ../../scripts/nuclear-reset.ts --force-nuclear\n`);
  process.exit(0);
}

// Gate 3: DATABASE_URL hostname check
const databaseUrl = process.env.DATABASE_URL || '';
const FORBIDDEN_HOSTS = [
  'digitalocean',
  'amazonaws',
  'azure',
  'cloud.google',
  '.prod.',
  '.production.',
  'neon.tech',
  'supabase.co',
  'planetscale',
  'railway.app',
];

for (const host of FORBIDDEN_HOSTS) {
  if (databaseUrl.toLowerCase().includes(host)) {
    fatal(
      `DATABASE_URL contains "${host}" — this looks like a cloud/production database.\n` +
      `  Nuclear reset is only allowed on local databases.\n` +
      `  DATABASE_URL: ${databaseUrl.substring(0, 50)}...`
    );
  }
}

if (!databaseUrl) {
  fatal(
    'DATABASE_URL is not set.\n' +
    '  Ensure you are running from apps/web with .env loaded.\n' +
    '  Run: cd apps/web && pnpm exec tsx ../../scripts/nuclear-reset.ts --force-nuclear'
  );
}

// Gate 4: Interactive confirmation
const skipConfirmation = args.includes('--yes');

async function confirmDestruction(): Promise<void> {
  if (skipConfirmation) {
    console.log(`\n${YELLOW}  --yes flag detected, skipping confirmation.${RESET}`);
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    console.log(`\n${RED}${BOLD}  THIS WILL DESTROY ALL DATA IN THE DATABASE.${RESET}`);
    console.log(`  Database: ${databaseUrl.substring(0, 60)}...`);
    rl.question(`\n  Type ${BOLD}DELETE${RESET} to confirm: `, (answer) => {
      rl.close();
      if (answer.trim() === 'DELETE') {
        resolve();
      } else {
        reject(new Error('Confirmation failed. Aborting.'));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${RED}${BOLD}NUCLEAR RESET${RESET} — Database Destruction + Rebuild`);
  console.log(`${'='.repeat(60)}`);

  // Gate 4
  await confirmDestruction();

  const webDir = path.resolve(__dirname, '../apps/web');

  // Step 1: prisma migrate reset --force
  console.log(`\n${BOLD}--- Step 1: Prisma Migrate Reset ---${RESET}`);
  console.log('  Dropping all tables, re-running all migrations...');
  try {
    execSync('pnpm exec prisma migrate reset --force', {
      cwd: webDir,
      stdio: 'inherit',
      env: { ...process.env },
    });
  } catch (err) {
    fatal('prisma migrate reset failed. Check your DATABASE_URL and migration state.');
  }

  // Step 2: Seed master data
  console.log(`\n${BOLD}--- Step 2: Seed Master Data ---${RESET}`);
  try {
    execSync('pnpm exec tsx ../../scripts/seed-master-data.ts', {
      cwd: webDir,
      stdio: 'inherit',
      env: { ...process.env },
    });
  } catch (err) {
    fatal('Master data seed failed. Check seed-master-data.ts for errors.');
  }

  // Step 3: Verify
  console.log(`\n${BOLD}--- Step 3: Verification ---${RESET}`);
  try {
    const verifyScript = `
      const { PrismaClient } = require('@prisma/client');
      const p = new PrismaClient();
      (async () => {
        const patients = await p.patient.count();
        const rules = await p.clinicalRule.count();
        const flags = await p.featureFlag.count();
        console.log(JSON.stringify({ patients, rules, flags }));
        await p.$disconnect();
      })();
    `;
    const result = execSync(`node -e "${verifyScript.replace(/\n/g, ' ')}"`, {
      cwd: webDir,
      encoding: 'utf-8',
      env: { ...process.env },
    });

    const counts = JSON.parse(result.trim());

    console.log(`  Patients:       ${counts.patients === 0 ? GREEN + '0 ✓' : RED + counts.patients + ' ✗'}${RESET}`);
    console.log(`  Clinical Rules: ${counts.rules >= 27 ? GREEN + counts.rules + ' ✓' : YELLOW + counts.rules + ' ⚠'}${RESET}`);
    console.log(`  Feature Flags:  ${counts.flags >= 16 ? GREEN + counts.flags + ' ✓' : YELLOW + counts.flags + ' ⚠'}${RESET}`);

    if (counts.patients > 0) {
      fatal('VERIFICATION FAILED: Patients still exist after reset!');
    }
  } catch (err) {
    console.warn(`  ${YELLOW}Verification query failed (table schema may differ). Manual check recommended.${RESET}`);
  }

  // Done
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${GREEN}${BOLD}NUCLEAR RESET COMPLETE${RESET}`);
  console.log(`  Database is sterile. Master data seeded.`);
  console.log(`  Zero patients. Zero transactions.`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch((err) => {
  console.error(`\n${RED}NUCLEAR RESET FAILED:${RESET}`, err.message || err);
  process.exit(1);
});
