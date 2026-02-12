#!/usr/bin/env node
/**
 * PROJECT MAP GENERATOR
 * ---------------------
 * Generates PROJECT_MAP.md — a complete directory tree of the monorepo.
 * Every agent (Archie, Paul, Victor, Gordon, Ruth, Elena) references this
 * file to understand the codebase before making changes.
 *
 * Usage: node scripts/generate-project-map.js
 *        pnpm update-map
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Directories and patterns to exclude
const EXCLUDE = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'coverage',
  '.turbo',
  '.cache',
  '__pycache__',
  '.vercel',
  '.do',
  'tsconfig.tsbuildinfo',
]);

const EXCLUDE_EXTENSIONS = new Set([
  '.log',
  '.lock',
  '.tsbuildinfo',
]);

const MAX_DEPTH = 5;

function shouldExclude(name) {
  if (EXCLUDE.has(name)) return true;
  const ext = path.extname(name);
  if (EXCLUDE_EXTENSIONS.has(ext)) return true;
  return false;
}

function buildTree(dir, prefix = '', depth = 0) {
  if (depth > MAX_DEPTH) return '  '.repeat(depth) + '  └── ... (truncated)\n';

  let output = '';
  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return output;
  }

  // Sort: directories first, then files, alphabetically
  const dirs = entries.filter(e => e.isDirectory() && !shouldExclude(e.name)).sort((a, b) => a.name.localeCompare(b.name));
  const files = entries.filter(e => e.isFile() && !shouldExclude(e.name)).sort((a, b) => a.name.localeCompare(b.name));
  const sorted = [...dirs, ...files];

  sorted.forEach((entry, i) => {
    const isLast = i === sorted.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const extension = isLast ? '    ' : '│   ';
    const icon = entry.isDirectory() ? '📁 ' : '';

    output += prefix + connector + icon + entry.name + '\n';

    if (entry.isDirectory()) {
      output += buildTree(path.join(dir, entry.name), prefix + extension, depth + 1);
    }
  });

  return output;
}

// Count files by type
function countFiles(dir, counts = {}) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return counts;
  }

  for (const entry of entries) {
    if (shouldExclude(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      countFiles(fullPath, counts);
    } else {
      const ext = path.extname(entry.name) || '(no ext)';
      counts[ext] = (counts[ext] || 0) + 1;
    }
  }
  return counts;
}

// Generate the map
const now = new Date().toISOString().replace('T', ' ').split('.')[0] + ' UTC';
const tree = buildTree(ROOT);
const fileCounts = countFiles(ROOT);
const sortedCounts = Object.entries(fileCounts).sort((a, b) => b[1] - a[1]);
const totalFiles = sortedCounts.reduce((sum, [, count]) => sum + count, 0);

let md = `# PROJECT MAP
> Auto-generated on ${now}
> Run \`pnpm update-map\` to refresh.
> Every agent MUST read this before modifying code.

## Statistics
- **Total Files:** ${totalFiles.toLocaleString()}
- **Top File Types:**
${sortedCounts.slice(0, 15).map(([ext, count]) => `  - \`${ext}\`: ${count}`).join('\n')}

## Monorepo Structure

\`\`\`
${tree}
\`\`\`

## Key Directories

| Directory | Owner | Purpose |
|-----------|-------|---------|
| \`apps/web/\` (→ \`apps/clinic/\`) | SWARM-C (Clinic Bot) | Next.js SaaS application — UI, pages, clinic API routes |
| \`apps/enterprise/\` | SWARM-E (Enterprise Bot) | Prediction platform — TISS ingestion, ML, insurer dashboards |
| \`apps/sidecar/\` | Maintenance | Electron desktop companion |
| \`apps/api/\` | SWARM-I (Infra Bot) | Fastify API gateway |
| \`packages/shared-kernel/\` | SWARM-K (Kernel Guardian) | Clinical Protocol Engine, Auth, Governance, Types |
| \`packages/deid/\` | SWARM-K | De-identification library |
| \`packages/schemas/\` | SWARM-K | Zod validation schemas |
| \`packages/shared-types/\` | SWARM-K | TypeScript interfaces |
| \`packages/dp/\` | SWARM-E | Differential Privacy |
| \`packages/utils/\` | SWARM-K | Logger, crypto utilities |
| \`packages/policy/\` | SWARM-K | OPA/Rego policy rules |
| \`data/clinical/\` | SWARM-K | Clinical content bundles & source rules |
| \`docs/\` | All agents | Documentation archives |
| \`scripts/\` | SWARM-I | Build, deploy, automation scripts |
| \`.cursor/rules/\` | Human CEO | Agent persona definitions |

## Dependency Rule
\`\`\`
apps/* ──depends-on──▶ packages/*
packages/* ──NEVER──▶ apps/*
apps/clinic ──NEVER──▶ apps/enterprise
apps/enterprise ──NEVER──▶ apps/clinic
\`\`\`
`;

fs.writeFileSync(path.join(ROOT, 'PROJECT_MAP.md'), md, 'utf-8');
console.log(`✅ PROJECT_MAP.md generated (${totalFiles.toLocaleString()} files indexed)`);
