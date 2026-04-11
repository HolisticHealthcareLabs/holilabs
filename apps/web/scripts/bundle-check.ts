#!/usr/bin/env npx tsx

/**
 * Bundle Size Tracker
 *
 * Parses the Next.js build output to extract per-page bundle sizes,
 * compares against budgets in sprint5-assets/performance-budgets.json,
 * outputs a console table, and exits 1 if any critical budget is exceeded.
 *
 * Usage:
 *   pnpm build && npx tsx apps/web/scripts/bundle-check.ts
 *
 * History is appended to .bundle-history.json for trend tracking.
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'fs';
import path from 'path';

// ── Types ────────────────────────────────────────────────────────────

interface BudgetEntry {
  metric: string;
  target: string;
  warning: string;
  critical: string;
  measurement?: string;
}

interface PerformanceBudgets {
  bundleSizes: BudgetEntry[];
  [key: string]: unknown;
}

interface PageBundle {
  route: string;
  jsKB: number;
  cssKB: number;
  totalKB: number;
}

interface HistoryEntry {
  timestamp: string;
  totalJSKB: number;
  totalCSSKB: number;
  pages: number;
  failures: string[];
}

// ── Paths ────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, '.next');
const MANIFEST_PATH = path.join(BUILD_DIR, 'build-manifest.json');
const BUDGETS_PATH = path.resolve(ROOT, '../../sprint5-assets/performance-budgets.json');
const HISTORY_PATH = path.join(ROOT, '.bundle-history.json');

// ── Default per-page budgets (KB) ────────────────────────────────────

const PAGE_BUDGETS: Record<string, { js: number; css: number; total: number; critical: boolean }> = {
  '/dashboard':                   { js: 250, css: 50, total: 300, critical: true },
  '/dashboard/clinical-command':  { js: 300, css: 50, total: 350, critical: true },
  '/dashboard/comunicacoes':      { js: 200, css: 40, total: 240, critical: true },
  '/dashboard/faturamento':       { js: 250, css: 50, total: 300, critical: true },
  '/portal/dashboard':            { js: 200, css: 40, total: 240, critical: true },
  '/portal/dashboard/lab-results':{ js: 220, css: 45, total: 265, critical: true },
  '/portal/dashboard/privacy':    { js: 180, css: 35, total: 215, critical: true },
  '/verify/prescription/[hash]':  { js: 150, css: 30, total: 180, critical: false },
};

const DEFAULT_BUDGET = { js: 300, css: 50, total: 350, critical: false };

// ── Helpers ──────────────────────────────────────────────────────────

function parseKB(value: string): number {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (value.toLowerCase().includes('mb')) return num * 1024;
  return num;
}

function fileSize(filePath: string): number {
  try {
    return statSync(filePath).size;
  } catch {
    return 0;
  }
}

function bytesToKB(bytes: number): number {
  return Math.round((bytes / 1024) * 10) / 10;
}

type Status = 'PASS' | 'WARN' | 'FAIL';

function statusIcon(s: Status): string {
  switch (s) {
    case 'PASS': return '[PASS]';
    case 'WARN': return '[WARN]';
    case 'FAIL': return '[FAIL]';
  }
}

function determineStatus(usagePercent: number): Status {
  if (usagePercent > 100) return 'FAIL';
  if (usagePercent > 85) return 'WARN';
  return 'PASS';
}

// ── Main ─────────────────────────────────────────────────────────────

function main() {
  console.log('Bundle Size Tracker\n');

  // 1. Check build exists
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`Build manifest not found at ${MANIFEST_PATH}`);
    console.error('Run "pnpm build" first.');
    process.exit(1);
  }

  // 2. Load manifest
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  const pages = manifest.pages as Record<string, string[]>;

  // 3. Load global budgets for context
  let globalBudgets: PerformanceBudgets | null = null;
  if (existsSync(BUDGETS_PATH)) {
    globalBudgets = JSON.parse(readFileSync(BUDGETS_PATH, 'utf-8'));
    console.log('Loaded budgets from sprint5-assets/performance-budgets.json');
  } else {
    console.log('Using default page budgets (sprint5-assets not found)');
  }

  // 4. Analyze each page
  const results: PageBundle[] = [];
  const fileCache = new Map<string, number>();

  for (const [route, files] of Object.entries(pages)) {
    let jsBytes = 0;
    let cssBytes = 0;

    for (const file of files) {
      if (!fileCache.has(file)) {
        fileCache.set(file, fileSize(path.join(BUILD_DIR, file)));
      }
      const size = fileCache.get(file) || 0;

      if (file.endsWith('.js')) jsBytes += size;
      else if (file.endsWith('.css')) cssBytes += size;
    }

    results.push({
      route,
      jsKB: bytesToKB(jsBytes),
      cssKB: bytesToKB(cssBytes),
      totalKB: bytesToKB(jsBytes + cssBytes),
    });
  }

  // Sort by total size descending
  results.sort((a, b) => b.totalKB - a.totalKB);

  // 5. Evaluate against budgets and print table
  console.log('\nPage                                    | JS (KB)    | CSS (KB)   | Total (KB) | Budget (KB) | Status');
  console.log('-'.repeat(110));

  const failures: string[] = [];
  const warnings: string[] = [];
  let totalJS = 0;
  let totalCSS = 0;

  for (const pg of results) {
    totalJS += pg.jsKB;
    totalCSS += pg.cssKB;

    const budget = PAGE_BUDGETS[pg.route] || DEFAULT_BUDGET;
    const usagePercent = (pg.totalKB / budget.total) * 100;
    const status = determineStatus(usagePercent);

    const routeCol = pg.route.padEnd(40).slice(0, 40);
    const jsCol = `${pg.jsKB}`.padStart(8);
    const cssCol = `${pg.cssKB}`.padStart(8);
    const totalCol = `${pg.totalKB}`.padStart(8);
    const budgetCol = `${budget.total}`.padStart(8);
    const statusCol = statusIcon(status);

    console.log(`${routeCol}| ${jsCol}   | ${cssCol}   | ${totalCol}   | ${budgetCol}    | ${statusCol}`);

    if (status === 'FAIL') {
      const msg = `${pg.route}: ${pg.totalKB}KB exceeds budget ${budget.total}KB`;
      if (budget.critical) failures.push(msg);
      else warnings.push(msg);
    } else if (status === 'WARN') {
      warnings.push(`${pg.route}: ${pg.totalKB}KB (${usagePercent.toFixed(0)}% of ${budget.total}KB budget)`);
    }
  }

  console.log('-'.repeat(110));
  console.log(`TOTAL                                   | ${`${totalJS.toFixed(1)}`.padStart(8)}   | ${`${totalCSS.toFixed(1)}`.padStart(8)}   |`);

  // 6. Global budget check (from performance-budgets.json)
  if (globalBudgets) {
    console.log('\nGlobal Budget Check:');
    for (const entry of globalBudgets.bundleSizes) {
      const target = parseKB(entry.target);
      const warning = parseKB(entry.warning);
      const critical = parseKB(entry.critical);

      let actual = 0;
      if (entry.metric.toLowerCase().includes('main js') || entry.metric.toLowerCase().includes('first load')) {
        actual = totalJS;
      } else if (entry.metric.toLowerCase().includes('css')) {
        actual = totalCSS;
      } else if (entry.metric.toLowerCase().includes('per-page')) {
        actual = results.length > 0 ? results[0].totalKB : 0; // largest page
      }

      let status: Status = 'PASS';
      if (actual > critical) status = 'FAIL';
      else if (actual > warning) status = 'WARN';

      console.log(`  ${statusIcon(status)} ${entry.metric}: ${actual.toFixed(1)}KB (target: ${target}KB, critical: ${critical}KB)`);
    }
  }

  // 7. Summary
  console.log(`\nAnalyzed ${results.length} pages`);
  console.log(`Total JS: ${totalJS.toFixed(1)} KB | Total CSS: ${totalCSS.toFixed(1)} KB`);

  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }

  // 8. Save to history
  const history: HistoryEntry[] = existsSync(HISTORY_PATH)
    ? JSON.parse(readFileSync(HISTORY_PATH, 'utf-8'))
    : [];

  history.push({
    timestamp: new Date().toISOString(),
    totalJSKB: totalJS,
    totalCSSKB: totalCSS,
    pages: results.length,
    failures,
  });

  // Keep last 30 entries
  while (history.length > 30) history.shift();

  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
  console.log(`\nHistory saved to ${HISTORY_PATH} (${history.length} entries)`);

  // 9. Exit code
  if (failures.length > 0) {
    console.error(`\nCRITICAL: ${failures.length} budget(s) exceeded:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log('\nAll critical budgets passed.');
}

main();
