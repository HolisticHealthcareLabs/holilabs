#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    mode: 'weekly',
    dryRun: false,
    outputDir: path.join(repoRoot, 'exports', 'cortex'),
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') args.dryRun = true;
    else if (token.startsWith('--mode=')) args.mode = token.split('=')[1];
    else if (token === '--mode') args.mode = argv[++i];
    else if (token.startsWith('--week-ending=')) args.weekEnding = token.split('=')[1];
    else if (token === '--week-ending') args.weekEnding = argv[++i];
    else if (token.startsWith('--month=')) args.month = token.split('=')[1];
    else if (token === '--month') args.month = argv[++i];
    else if (token.startsWith('--output-dir=')) args.outputDir = path.resolve(repoRoot, token.split('=')[1]);
    else if (token === '--output-dir') args.outputDir = path.resolve(repoRoot, argv[++i]);
  }

  return args;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultWeekEnding() {
  const now = new Date();
  return toIsoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0)));
}

function getDefaultMonth() {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${now.getUTCFullYear()}-${month}`;
}

function assertPattern(value, pattern, label) {
  if (!pattern.test(value)) {
    throw new Error(`Invalid ${label}: "${value}"`);
  }
}

function buildArtifactNames(mode, periodKey) {
  return [
    `cortex-board-packet-${mode}-${periodKey}.pdf`,
    `cortex-board-raw-data-${mode}-${periodKey}.csv`,
    `cortex-board-notes-${mode}-${periodKey}.md`,
  ];
}

function buildPlan(args) {
  if (!['weekly', 'monthly'].includes(args.mode)) {
    throw new Error(`Unsupported mode "${args.mode}". Use weekly or monthly.`);
  }

  const weekEnding = args.weekEnding || getDefaultWeekEnding();
  const month = args.month || getDefaultMonth();

  assertPattern(weekEnding, /^\d{4}-\d{2}-\d{2}$/, 'week-ending (expected YYYY-MM-DD)');
  assertPattern(month, /^\d{4}-\d{2}$/, 'month (expected YYYY-MM)');

  const periodKey = args.mode === 'weekly' ? weekEnding : month;
  const artifactNames = buildArtifactNames(args.mode, periodKey);

  return {
    generatedAt: new Date().toISOString(),
    mode: args.mode,
    periodKey,
    inputTabs: ['raw_data', 'weekly_rollup', 'country_rollup', 'board_export'],
    refreshOrder: [
      'Append/validate raw_data rows for the period',
      'Set weekly_rollup!B1 to target week ending',
      'Recompute weekly_rollup derived KPI cells',
      'Recompute country_rollup grouped table',
      'Open board_export and verify formula + manual narrative cells',
      'Export board packet artifacts with deterministic filenames',
    ],
    artifactNames,
    sources: {
      telemetryAndEventDerived: [
        'eligible_cases',
        'checklist_started',
        'median_verification_seconds',
        'interventions',
        'overrides',
        'missing_critical_data',
        'reminders_sent',
        'reminder_reach_rate',
      ],
      manualTrackerInputs: [
        'top_risk',
        'top_win',
        'next_week_focus',
        'decisions_needed',
        'headline',
        'owner',
      ],
    },
  };
}

function printPlan(plan) {
  const lines = [
    `Mode: ${plan.mode}`,
    `Period: ${plan.periodKey}`,
    `Input tabs: ${plan.inputTabs.join(', ')}`,
    'Refresh order:',
    ...plan.refreshOrder.map((step, idx) => `  ${idx + 1}. ${step}`),
    'Artifacts:',
    ...plan.artifactNames.map((name) => `  - ${name}`),
  ];
  console.log(lines.join('\n'));
}

function main() {
  const args = parseArgs(process.argv);
  const plan = buildPlan(args);
  const manifestName = `cortex-export-manifest-${plan.mode}-${plan.periodKey}.json`;
  const manifestPath = path.join(args.outputDir, manifestName);

  if (args.dryRun) {
    console.log('[dry-run] Cortex export plan generated');
    console.log(`[dry-run] Manifest path: ${manifestPath}`);
    printPlan(plan);
    return;
  }

  fs.mkdirSync(args.outputDir, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

  console.log(`Wrote manifest: ${manifestPath}`);
  printPlan(plan);
}

main();
