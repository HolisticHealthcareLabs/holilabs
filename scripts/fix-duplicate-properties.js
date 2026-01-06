#!/usr/bin/env node

/**
 * Fix duplicate properties in object literals
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing duplicate properties...\n');

const duplicateFiles = [
  'apps/web/src/app/api/auth/patient/magic-link/verify/route.ts',
  'apps/web/src/app/api/auth/patient/otp/verify/route.ts',
  'apps/web/src/app/api/portal/appointments/route.ts',
  'apps/web/src/app/api/portal/auth/session/route.ts',
  'apps/web/src/app/api/portal/documents/route.ts',
  'apps/web/src/app/api/portal/messages/route.ts',
  'apps/web/src/app/api/portal/metrics/route.ts',
  'apps/web/src/app/api/portal/profile/route.ts',
];

let fixCount = 0;

for (const relPath of duplicateFiles) {
  const filePath = path.join(__dirname, '..', relPath);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping: ${relPath} (not found)`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Find and fix duplicate patientId in logger.info calls
  const patientIdDupeRegex = /patientId:\s*[^,}]+,\s*\n\s*patientId:/g;
  if (patientIdDupeRegex.test(content)) {
    // Keep second patientId (the more specific one), remove first
    content = content.replace(
      /(patientId):\s*result\.patientUser\.id,\s*\n(\s*)patientId:/g,
      '$2patientId:'
    );
    fixCount++;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed duplicate patientId in: ${relPath}`);
  }

  // Reload for next fix
  content = fs.readFileSync(filePath, 'utf8');

  // Find and fix duplicate action in audit log calls
  const actionDupeRegex = /action:\s*['"][^'"]+['"],\s*\n\s*action:/g;
  if (actionDupeRegex.test(content)) {
    // Keep the first action, remove the second
    content = content.replace(
      /(action:\s*['"][^'"]+['"],)\s*\n\s*action:\s*['"][^'"]+['"],/g,
      '$1'
    );
    fixCount++;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed duplicate action in: ${relPath}`);
  }

  // Reload for next fix
  content = fs.readFileSync(filePath, 'utf8');

  // Fix duplicate resource in audit log calls
  const resourceDupeRegex = /resource:\s*['"][^'"]+['"],\s*\n\s*resource:/g;
  if (resourceDupeRegex.test(content)) {
    content = content.replace(
      /(resource:\s*['"][^'"]+['"],)\s*\n\s*resource:\s*['"][^'"]+[''],/g,
      '$1'
    );
    fixCount++;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed duplicate resource in: ${relPath}`);
  }

  // Reload for generic duplicate property fix
  content = fs.readFileSync(filePath, 'utf8');

  // Generic duplicate property detection
  const objRegex = /\{([^{}]*)\}/gs;
  let hasChanges = false;

  content = content.replace(objRegex, (match) => {
    const props = [];
    const propSet = new Set();
    const lines = match.split('\n');

    for (let line of lines) {
      const propMatch = line.match(/^\s*([a-zA-Z_$][a-zA-Z0-9_$]*):/);
      if (propMatch) {
        const propName = propMatch[1];
        if (propSet.has(propName)) {
          // Skip duplicate
          hasChanges = true;
          continue;
        }
        propSet.add(propName);
      }
      props.push(line);
    }

    return props.join('\n');
  });

  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixCount++;
    console.log(`✅ Fixed generic duplicates in: ${relPath}`);
  }
}

console.log(`\n🎉 Fixed ${fixCount} duplicate property issues!\n`);
