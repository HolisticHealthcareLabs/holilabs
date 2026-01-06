#!/usr/bin/env node

/**
 * Fix implicit any types in route handlers
 * Adds proper type annotations for req and context parameters
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing implicit any types in route handlers...\n');

// Files to fix based on TypeScript errors
const filesToFix = [
  'src/app/api/clinical-notes/[id]/versions/[versionId]/route.ts',
  'src/app/api/clinical-notes/[id]/versions/route.ts',
  'src/app/api/clinical/drug-interactions/route.ts',
  'src/app/api/lab-results/[id]/route.ts',
  'src/app/api/lab-results/route.ts',
  'src/app/api/push/subscribe/route.ts',
  'src/app/api/scribe/notes/[id]/route.ts',
  'src/app/api/scribe/sessions/[id]/corrections/route.ts',
  'src/app/api/scribe/sessions/[id]/route.ts',
  'src/app/api/scribe/sessions/[id]/transcript/route.ts',
  'src/app/api/scribe/sessions/route.ts',
];

const baseDir = path.join(__dirname, '../apps/web');
let fixedCount = 0;

for (const file of filesToFix) {
  const filePath = path.join(baseDir, file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} (not found)`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Pattern 1: Fix route handlers with (req, context) => { ... }
  // Examples:
  // export async function GET(req, context) {
  // export async function POST(req, context) {
  // export async function PUT(req, context) {
  // export async function DELETE(req, context)

  // Determine context type based on file path
  let contextType = '{ params: { id: string } }';
  if (file.includes('[versionId]')) {
    contextType = '{ params: { id: string; versionId: string } }';
  }

  // Fix: export async function METHOD(req, context) {
  content = content.replace(
    /export async function (GET|POST|PUT|DELETE|PATCH)\(\s*req\s*,\s*context\s*\)\s*{/g,
    `export async function $1(\n  req: NextRequest,\n  context: ${contextType}\n) {`
  );

  // Fix: async function METHOD(req, context) {
  content = content.replace(
    /async function (get|post|put|delete|patch)\(\s*req\s*,\s*context\s*\)\s*{/g,
    `async function $1(\n  req: NextRequest,\n  context: ${contextType}\n) {`
  );

  // Ensure NextRequest is imported
  if (content !== originalContent && !content.includes('NextRequest')) {
    // Find the first import from 'next/server' and add NextRequest
    if (content.includes("from 'next/server'")) {
      content = content.replace(
        /import\s*\{\s*([^}]+)\s*\}\s*from\s*'next\/server'/,
        "import { $1, NextRequest } from 'next/server'"
      );
    } else {
      // Add new import at the top
      content = `import { NextRequest, NextResponse } from 'next/server';\n${content}`;
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    fixedCount++;
    console.log(`✅ Fixed ${file}`);
  }
}

console.log(`\n🎉 Fixed ${fixedCount} files with implicit any types!\n`);
