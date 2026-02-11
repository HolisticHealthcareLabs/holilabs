#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const defaultConfigPath = path.join(repoRoot, 'configs', 'cortex-doc-automation.config.json');

function parseArgs(argv) {
  const args = { mode: 'auto', dryRun: false, all: false };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--all') args.all = true;
    else if (token.startsWith('--mode=')) args.mode = token.split('=')[1];
    else if (token === '--mode') args.mode = argv[++i];
    else if (token.startsWith('--date=')) args.date = token.split('=')[1];
    else if (token === '--date') args.date = argv[++i];
    else if (token.startsWith('--config=')) args.config = token.split('=')[1];
    else if (token === '--config') args.config = argv[++i];
    else if (token === '--append-log') args.appendLog = true;
  }
  return args;
}

function parseDate(input) {
  if (!input) return new Date();
  const [y, m, d] = input.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function nextWeekday(date, targetDow) {
  const current = date.getUTCDay();
  const delta = (targetDow - current + 7) % 7 || 7;
  return addDays(date, delta);
}

function nextForCadence(now, cadence) {
  if (cadence === 'daily') return toIsoDate(addDays(now, 1));
  if (cadence === 'weekly') return toIsoDate(addDays(now, 7));
  if (cadence === 'monday') return toIsoDate(nextWeekday(now, 1));
  if (cadence === 'friday') return toIsoDate(nextWeekday(now, 5));
  if (cadence === 'monfri') {
    const nextMon = nextWeekday(now, 1);
    const nextFri = nextWeekday(now, 5);
    return toIsoDate(nextMon < nextFri ? nextMon : nextFri);
  }
  return toIsoDate(addDays(now, 7));
}

function shouldRun(cadence, mode, now, all) {
  if (all) return true;
  const dow = now.getUTCDay(); // 1 Monday, 5 Friday
  if (mode === 'daily') return cadence === 'daily' || cadence === 'monfri';
  if (mode === 'weekly') return cadence === 'weekly' || cadence === 'monfri';
  if (mode === 'monday') return cadence === 'monday' || cadence === 'monfri' || cadence === 'weekly';
  if (mode === 'friday') return cadence === 'friday' || cadence === 'monfri' || cadence === 'weekly';
  if (mode === 'auto') {
    if (dow === 1) return cadence === 'monday' || cadence === 'monfri' || cadence === 'weekly';
    if (dow === 5) return cadence === 'friday' || cadence === 'monfri' || cadence === 'weekly';
    return cadence === 'daily';
  }
  return false;
}

function upsertMetadataBlock(content, block) {
  const start = '<!-- CORTEX_AUTOMATION:START -->';
  const end = '<!-- CORTEX_AUTOMATION:END -->';
  if (content.includes(start) && content.includes(end)) {
    const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
    return content.replace(pattern, block);
  }

  const firstHeaderMatch = content.match(/^# .*\n?/m);
  if (!firstHeaderMatch || firstHeaderMatch.index == null) {
    return `${block}\n\n${content}`;
  }

  const insertAt = firstHeaderMatch.index + firstHeaderMatch[0].length;
  return `${content.slice(0, insertAt)}\n${block}\n${content.slice(insertAt)}`;
}

function upsertWeeklyLog(content, now, mode) {
  const sectionHeader = '## Weekly Auto Log';
  const stamp = toIsoDate(now);
  const entryHeader = `### ${stamp} (${mode.toUpperCase()})`;
  if (content.includes(entryHeader)) return content;

  const entryLines =
    mode === 'monday'
      ? [
          entryHeader,
          '- Focus this week:',
          '- Top 3 priorities:',
          '- Risks to monitor:',
          '- Decisions needed:',
          '',
        ].join('\n')
      : [
          entryHeader,
          '- Progress this week:',
          '- KPI highlights:',
          '- Blockers encountered:',
          '- Next week commitments:',
          '',
        ].join('\n');

  if (!content.includes(sectionHeader)) {
    return `${content.trimEnd()}\n\n---\n\n${sectionHeader}\n\n${entryLines}\n`;
  }

  const idx = content.indexOf(sectionHeader) + sectionHeader.length;
  return `${content.slice(0, idx)}\n\n${entryLines}${content.slice(idx)}`;
}

function buildMetadataBlock({ updatedAt, owner, cadence, mode, nextUpdate }) {
  return [
    '<!-- CORTEX_AUTOMATION:START -->',
    '## Update Metadata',
    '',
    `- Last Updated: ${updatedAt}`,
    `- Owner: ${owner}`,
    `- Cadence: ${cadence}`,
    `- Last Run Mode: ${mode}`,
    `- Next Recommended Update: ${nextUpdate}`,
    '<!-- CORTEX_AUTOMATION:END -->',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv);
  const configPath = args.config ? path.resolve(repoRoot, args.config) : defaultConfigPath;
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const now = parseDate(args.date);
  const today = toIsoDate(now);

  const mode = args.mode;
  const docs = config.documents || [];
  let updatedCount = 0;

  docs.forEach((doc) => {
    if (!shouldRun(doc.cadence, mode, now, args.all)) return;
    const absPath = path.resolve(repoRoot, doc.path);
    if (!fs.existsSync(absPath)) {
      console.warn(`Skipping missing doc: ${doc.path}`);
      return;
    }
    const content = fs.readFileSync(absPath, 'utf8');
    const block = buildMetadataBlock({
      updatedAt: today,
      owner: doc.owner || config.defaultOwner || 'TBD',
      cadence: doc.cadence || 'weekly',
      mode,
      nextUpdate: nextForCadence(now, doc.cadence || 'weekly'),
    });
    let nextContent = upsertMetadataBlock(content, block);

    const logEnabled = args.appendLog || Boolean(doc.appendAutoLog);
    if (logEnabled && (mode === 'monday' || mode === 'friday' || mode === 'weekly')) {
      nextContent = upsertWeeklyLog(nextContent, now, mode);
    }

    if (nextContent !== content) {
      updatedCount += 1;
      if (!args.dryRun) fs.writeFileSync(absPath, nextContent, 'utf8');
      console.log(`${args.dryRun ? '[dry-run] would update' : 'updated'} ${doc.path}`);
    }
  });

  console.log(`Done. ${updatedCount} document(s) ${args.dryRun ? 'would be' : 'were'} updated.`);
}

main();

