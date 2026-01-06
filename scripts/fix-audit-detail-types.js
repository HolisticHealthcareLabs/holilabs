#!/usr/bin/env node

/**
 * Fix implicit any types in audit detail functions
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing implicit any types in audit detail functions...\n');

const baseDir = path.join(__dirname, '../apps/web');

// Get all files with TS7006 errors
const { execSync } = require('child_process');

let errorFiles = [];
try {
  const output = execSync(
    'cd /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web && pnpm tsc --noEmit 2>&1 | grep "error TS7006"',
    { encoding: 'utf8' }
  );

  // Parse file paths from errors
  const lines = output.split('\n').filter(Boolean);
  errorFiles = [...new Set(lines.map(line => {
    const match = line.match(/^([^(]+)\(/);
    return match ? match[1] : null;
  }).filter(Boolean))];
} catch (error) {
  // Ignore errors
}

console.log(`Found ${errorFiles.length} files with TS7006 errors\n`);

let fixedCount = 0;

for (const file of errorFiles) {
  const filePath = path.join(baseDir, file);

  if (!fs.existsSync(filePath)) {
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Determine context type based on file path
  let contextType = 'any';

  if (file.includes('[versionId]')) {
    contextType = '{ params: { id: string; versionId: string } }';
  } else if (file.includes('[id]')) {
    contextType = '{ params: { id: string } }';
  }

  // Fix: details: (req, context) => ({
  // Replace with typed version
  const detailsPattern = /details:\s*\(req,\s*context\)\s*=>\s*\(/g;
  content = content.replace(
    detailsPattern,
    `details: (req: NextRequest, context: ${contextType}) => (`
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    fixedCount++;
    console.log(`✅ Fixed ${file}`);
  }
}

console.log(`\n🎉 Fixed ${fixedCount} files!\n`);
