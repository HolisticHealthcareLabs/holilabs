#!/usr/bin/env node

/**
 * Fix orderBy timestamp to use createdAt instead
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing orderBy timestamp errors...\n');

const files = [
  'src/app/api/clinical-notes/route.ts',
  'src/app/api/patients/route.ts',
  'src/app/api/payments/route.ts',
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

  // Fix: orderBy: { timestamp: 'desc' } -> orderBy: { createdAt: 'desc' }
  content = content.replace(
    /orderBy:\s*\{\s*timestamp:\s*(['"])(asc|desc)\1\s*\}/g,
    "orderBy: { createdAt: '$2' }"
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    fixedCount++;
    console.log(`✅ Fixed ${file}`);
  }
}

console.log(`\n🎉 Fixed ${fixedCount} files!\n`);
