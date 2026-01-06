#!/usr/bin/env node

/**
 * Fix syntax errors in audit configurations
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing audit configuration syntax errors...\n');

const files = [
  'src/app/api/clinical-notes/[id]/versions/route.ts',
  'src/app/api/lab-results/[id]/route.ts',
  'src/app/api/push/subscribe/route.ts',
  'src/app/api/scribe/notes/[id]/route.ts',
  'src/app/api/scribe/sessions/[id]/corrections/route.ts',
  'src/app/api/scribe/sessions/[id]/route.ts',
];

const baseDir = path.join(__dirname, '../apps/web');
let fixedCount = 0;

for (const file of files) {
  const filePath = path.join(baseDir, file);

  if (!fs.existsSync(filePath)) {
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Fix malformed audit objects:
  // audit: {
  //   action: '...',
  //   resource: '...',
  // }
  // );

  // Should be:
  // audit: {
  //   action: '...',
  //   resource: '...',
  // },
  // }
  // );

  // Pattern: resource line followed by } \n )
  content = content.replace(
    /(resource:\s*['"][^'"]+['"]),\s*\n\}/gm,
    '$1,\n    },\n  }'
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    fixedCount++;
    console.log(`✅ Fixed ${file}`);
  }
}

console.log(`\n🎉 Fixed ${fixedCount} files!\n`);
