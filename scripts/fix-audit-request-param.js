#!/usr/bin/env node

/**
 * Fix 'request' being inside data object - move it to second parameter
 *
 * BEFORE: createAuditLog({ action: 'READ', ..., request })
 * AFTER:  createAuditLog({ action: 'READ', ... }, request)
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing request parameter in audit log calls...\n');

const apiDir = path.join(__dirname, '../apps/web/src/app/api');

function getAllTsFiles(dir) {
  const files = [];
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && item !== 'node_modules' && item !== '.next') {
        walk(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

let fixCount = 0;

function fixRequestParam(content) {
  // Pattern: createAuditLog({ ... request, })
  // or:     createAuditLog({ ... request })
  // Move request outside the data object

  const lines = content.split('\n');
  const newLines = [];
  let inAuditCall = false;
  let auditCallStartLine = -1;
  let braceCount = 0;
  let hasRequestInData = false;
  let requestIndent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we're starting an audit log call
    if (line.match(/await\s+(createAuditLog|logAuditEvent|auditView|auditCreate|auditUpdate|auditDelete|auditExport)\s*\(/)) {
      inAuditCall = true;
      auditCallStartLine = i;
      braceCount = 0;
      hasRequestInData = false;
    }

    if (inAuditCall) {
      // Count braces to know when we're in the data object
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      // Check if this line is just "request," or "request" in the data object
      const trimmed = line.trim();
      if ((trimmed === 'request,' || trimmed === 'request') && braceCount === 1) {
        hasRequestInData = true;
        requestIndent = line.match(/^(\s*)/)[1];
        // Skip this line (we'll add it back as a parameter)
        continue;
      }

      // If we're at the closing of the data object and found request
      if (hasRequestInData && braceCount === 1 && line.includes('}')) {
        // Change }); to }, request);
        const modifiedLine = line.replace(/\}\s*\)/, '}, request)');
        newLines.push(modifiedLine);
        fixCount++;
        inAuditCall = false;
        hasRequestInData = false;
        continue;
      }
    }

    // Check if we're done with the audit call
    if (inAuditCall && braceCount === 0 && line.includes(')')) {
      inAuditCall = false;
    }

    newLines.push(line);
  }

  return newLines.join('\n');
}

// Process all files
const files = getAllTsFiles(apiDir);

console.log(`Found ${files.length} TypeScript files\n`);

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // Apply fix
    content = fixRequestParam(content);

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log(`\n🎉 Fixed ${fixCount} request parameters!\n`);
console.log('💡 Request is now passed as the 2nd parameter, not in the data object.\n');
