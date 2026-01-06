#!/usr/bin/env node

/**
 * Remove invalid 'details' property from audit configurations
 * The middleware only accepts { action, resource }, not details
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Removing invalid details from audit configurations...\n');

const baseDir = path.join(__dirname, '../apps/web');

// Get files with TS2353 errors about 'details'
let errorFiles = [];
try {
  const output = execSync(
    'cd /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web && pnpm tsc --noEmit 2>&1 | grep "error TS2353.*details"',
    { encoding: 'utf8' }
  );

  errorFiles = [...new Set(output.split('\n').filter(Boolean).map(line => {
    const match = line.match(/^([^(]+)\(/);
    return match ? match[1] : null;
  }).filter(Boolean))];
} catch (error) {
  // No errors or command failed
}

console.log(`Found ${errorFiles.length} files with invalid details property\n`);

let fixedCount = 0;

for (const file of errorFiles) {
  const filePath = path.join(baseDir, file);

  if (!fs.existsSync(filePath)) {
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Remove details property from audit configurations
  // Pattern:
  // audit: {
  //   action: '...',
  //   resource: '...',
  //   details: (...) => {...},
  // }

  // Use regex to find and remove the details line
  content = content.replace(
    /(\s+audit:\s*\{\s*action:\s*['"]\w+['"],\s*resource:\s*['"]\w+['"],)\s*details:\s*\([^)]*\)\s*=>\s*[\s\S]*?\},?\s*(\})/g,
    '$1\n$2'
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    fixedCount++;
    console.log(`✅ Fixed ${file}`);
  }
}

console.log(`\n🎉 Fixed ${fixedCount} files!\n`);
