#!/usr/bin/env node

/**
 * Remove ipAddress from audit log data objects (it's auto-detected)
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Removing ipAddress from audit log calls...\n');

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

function removeIpAddress(content) {
  const regex = /await\s+(createAuditLog|logAuditEvent|auditView|auditCreate|auditUpdate|auditDelete|auditExport)\s*\(\s*\{([^}]+)\}/gs;

  return content.replace(regex, (match, funcName, dataContent) => {
    if (dataContent.includes('ipAddress:')) {
      // Remove the ipAddress line
      const lines = dataContent.split('\n').filter(line => !line.trim().startsWith('ipAddress:'));
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

    // Apply fix
    content = removeIpAddress(content);

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log(`\n🎉 Removed ipAddress from ${fixCount} audit log calls!\n`);
