#!/usr/bin/env node

/**
 * Fix audit logging TypeScript errors - Pass 2
 * Focus on userEmail and duplicate properties
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing audit logging errors (Pass 2)...\n');

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

// Fix 1: Remove userEmail from audit log data objects
function removeUserEmailFromAuditData(content) {
  const regex = /await\s+(createAuditLog|logAuditEvent|auditView|auditCreate|auditUpdate|auditDelete|auditExport)\s*\(\s*\{([^}]+)\}/gs;

  return content.replace(regex, (match, funcName, dataContent) => {
    if (dataContent.includes('userEmail:')) {
      // Remove the userEmail line
      const lines = dataContent.split('\n').filter(line => !line.trim().startsWith('userEmail:'));
      fixCount++;
      return `await ${funcName}({${lines.join('\n')}}`;
    }
    return match;
  });
}

// Fix 2: Remove duplicate action properties (caused by incomplete fixes)
function removeDuplicateActions(content) {
  // Find patterns like:  action: 'READ',\n ... action: 'READ',
  const actionRegex = /(action:\s*['"][^'"]+['"],)\s*([^}]*?)\1/g;

  if (actionRegex.test(content)) {
    fixCount++;
    return content.replace(actionRegex, (match, action, middle) => {
      return action + middle;
    });
  }
  return content;
}

// Fix 3: Fix "VERIFY" and "INVITE" to valid AuditAction enum values
function fixInvalidActions(content) {
  let modified = content;
  if (content.includes('"VERIFY"') || content.includes("'VERIFY'")) {
    modified = modified
      .replace(/action:\s*["']VERIFY["']/g, "action: 'READ'")
      .replace(/["']VERIFY["']\s*as\s+AuditAction/g, "'READ' as AuditAction");
    fixCount++;
  }
  if (content.includes('"INVITE"') || content.includes("'INVITE'")) {
    modified = modified
      .replace(/action:\s*["']INVITE["']/g, "action: 'CREATE'")
      .replace(/["']INVITE["']\s*as\s+AuditAction/g, "'CREATE' as AuditAction");
    fixCount++;
  }
  return modified;
}

// Fix 4: Fix createdAt -> timestamp in orderBy clauses
function fixOrderByTimestamp(content) {
  // Fix specific patterns for different models
  const patterns = [
    { from: /orderBy:\s*\{\s*createdAt:\s*['"]desc['"]\s*\}/g, to: "orderBy: { createdAt: 'desc' }" },
    { from: /orderBy:\s*\{\s*timestamp:\s*['"]desc['"]\s*\}/g, to: "orderBy: { timestamp: 'desc' }" },
  ];

  let modified = content;
  for (const { from, to } of patterns) {
    if (from.test(modified)) {
      modified = modified.replace(from, to);
    }
  }

  // Don't change if it's not an AuditLog query
  return modified;
}

// Process all files
const files = getAllTsFiles(apiDir);

console.log(`Found ${files.length} TypeScript files\n`);

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // Apply fixes
    content = removeUserEmailFromAuditData(content);
    content = removeDuplicateActions(content);
    content = fixInvalidActions(content);

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log(`\n🎉 Applied ${fixCount} fixes in pass 2!\n`);
console.log('📋 Remaining manual fixes needed:');
console.log('  - Missing Prisma models (dataQualityEvent, userBehaviorEvent, etc.)');
console.log('  - Patient query include issues (appointments, medications, clinicalNotes)');
console.log('  - Test file errors in .skip.ts files (can be ignored for now)\n');
