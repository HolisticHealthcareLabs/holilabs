#!/usr/bin/env node

/**
 * Fix audit logging TypeScript errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing audit logging errors...\n');

// Get all API route files
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

// Fix 1: Remove userId from audit log data objects
function fixUserIdInAuditCalls(content) {
  let modified = content;

  // Pattern: createAuditLog({ ... userId: ..., ... })
  // This is complex, so we'll do a simple pattern match
  const patterns = [
    /createAuditLog\(\s*\{([^}]*?)userId:\s*[^,}\n]+,([^}]*?)\}/gs,
    /logAuditEvent\(\s*\{([^}]*?)userId:\s*[^,}\n]+,([^}]*?)\}/gs,
  ];

  for (const pattern of patterns) {
    if (pattern.test(modified)) {
      modified = modified.replace(pattern, (match, before, after) => {
        fixCount++;
        return match.replace(/userId:\s*[^,}\n]+,\s*/, '');
      });
    }
  }

  return modified;
}

// Fix 2: patientUserId -> patientId
function fixPatientUserId(content) {
  if (content.includes('patientUserId')) {
    fixCount++;
    return content.replace(/patientUserId/g, 'patientId');
  }
  return content;
}

// Fix 3: LOGIN_ATTEMPT -> LOGIN
function fixLoginAttempt(content) {
  if (content.includes('LOGIN_ATTEMPT')) {
    fixCount++;
    return content
      .replace(/"LOGIN_ATTEMPT"/g, '"LOGIN"')
      .replace(/'LOGIN_ATTEMPT'/g, "'LOGIN'");
  }
  return content;
}

// Fix 4: createdAt -> timestamp in audit log queries
function fixCreatedAt(content) {
  // Only fix if it's clearly an AuditLog query
  if (content.includes('auditLog') && content.includes('createdAt')) {
    const modified = content.replace(
      /orderBy:\s*\{\s*createdAt:\s*['"]desc['"]\s*\}/g,
      "orderBy: { timestamp: 'desc' }"
    );
    if (modified !== content) {
      fixCount++;
      return modified;
    }
  }
  return content;
}

// Fix 5: Remove userId from createAuditLog calls (better pattern)
function removeUserIdFromAuditData(content) {
  // Match createAuditLog or logAuditEvent with userId in the data object
  const regex = /await\s+(createAuditLog|logAuditEvent)\s*\(\s*\{([^}]+)\}/g;

  return content.replace(regex, (match, funcName, dataContent) => {
    if (dataContent.includes('userId:')) {
      // Remove the userId line
      const lines = dataContent.split('\n').filter(line => !line.trim().startsWith('userId:'));
      fixCount++;
      return `await ${funcName}({${lines.join('\n')}}`;
    }
    return match;
  });
}

// Process all files
const files = getAllTsFiles(apiDir);

console.log(`Found ${files.length} TypeScript files\n`);

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // Apply all fixes
    content = fixPatientUserId(content);
    content = fixLoginAttempt(content);
    content = fixCreatedAt(content);
    content = removeUserIdFromAuditData(content);

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log(`\n🎉 Applied ${fixCount} fixes!\n`);
console.log('📋 Next steps:');
console.log('  1. Review the changes with: git diff');
console.log('  2. Check remaining errors: cd apps/web && pnpm tsc --noEmit');
console.log('  3. Manual fixes may be needed for complex cases\n');
