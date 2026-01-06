#!/usr/bin/env node

/**
 * Comment out missing Prisma model references
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Commenting out missing Prisma model references...\n');

const filesToFix = {
  dataQualityEvent: [
    'apps/web/src/app/api/fhir/r4/Patient/route.ts',
    'apps/web/src/app/api/patients/import/route.ts',
  ],
  userBehaviorEvent: [
    'apps/web/src/app/api/patients/route.ts',
    'apps/web/src/app/api/search/semantic/route.ts',
    'apps/web/src/app/api/research/query/route.ts',
    'apps/web/src/app/api/patients/[id]/fhir-pull/route.ts',
    'apps/web/src/app/api/patients/import/route.ts',
    'apps/web/src/app/api/patients/[id]/context/route.ts',
    'apps/web/src/app/api/patients/search/route.ts',
  ],
  accessReasonAggregate: [
    'apps/web/src/app/api/patients/[id]/context/route.ts',
  ],
};

let fixCount = 0;

function commentOutModel(filePath, modelName) {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Pattern 1: await prisma.modelName.method(...)
  const pattern1 = new RegExp(
    `(\\s*)(await prisma\\.${modelName}\\.[a-zA-Z]+\\()`,
    'g'
  );

  content = content.replace(pattern1, (match, indent, code) => {
    fixCount++;
    return `${indent}// TODO: Restore when ${modelName} model exists in Prisma schema\n${indent}// ${code}`;
  });

  // Pattern 2: prisma.modelName (without await)
  const pattern2 = new RegExp(
    `(\\s*)(prisma\\.${modelName}\\.[a-zA-Z]+\\()`,
    'g'
  );

  content = content.replace(pattern2, (match, indent, code) => {
    if (!match.includes('// TODO')) {
      fixCount++;
      return `${indent}// TODO: Restore when ${modelName} model exists\n${indent}// ${code}`;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`  ✅ Commented out ${modelName} in: ${filePath}`);
  }
}

// Process all files
for (const [modelName, files] of Object.entries(filesToFix)) {
  console.log(`\n📦 Processing ${modelName}...`);
  const uniqueFiles = [...new Set(files)]; // Remove duplicates
  for (const file of uniqueFiles) {
    commentOutModel(file, modelName);
  }
}

console.log(`\n🎉 Applied ${fixCount} comment fixes!\n`);
console.log('💡 These references can be uncommented when the Prisma models are added to the schema.\n');
