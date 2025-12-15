#!/usr/bin/env tsx
/**
 * Generate Demo Patient Files
 *
 * Creates 30 realistic medical documents and saves them to the filesystem
 * for use in demo mode.
 *
 * Usage:
 *   pnpm tsx scripts/generate-demo-files.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateAllDemoDocuments, getDemoDocumentStats } from '../src/lib/demo/generate-demo-documents';

const OUTPUT_DIR = path.join(__dirname, '../public/demo-files');

async function main() {
  console.log('🎭 Generating demo patient files...\n');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  } else {
    // Clean existing files
    const existingFiles = fs.readdirSync(OUTPUT_DIR);
    existingFiles.forEach(file => {
      fs.unlinkSync(path.join(OUTPUT_DIR, file));
    });
  }

  // Generate documents
  const documents = generateAllDemoDocuments();
  const stats = getDemoDocumentStats(documents);

  console.log('📄 Documents generated:');
  console.log(`  Total: ${stats.total}`);
  console.log(`  Medical Histories: ${stats.byType.medical_history}`);
  console.log(`  Lab Results: ${stats.byType.lab_result}`);
  console.log(`  Prescriptions: ${stats.byType.prescription}`);
  console.log(`  Consultation Notes: ${stats.byType.consultation_note}`);
  console.log(`  Total Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
  console.log(`  Contains PHI: ${stats.withPHI} documents\n`);

  // Save documents as individual files
  documents.forEach((doc, index) => {
    const filename = `${doc.type}_${doc.patientId}_${index + 1}.txt`;
    const filepath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(filepath, doc.content, 'utf-8');
  });

  console.log(`✅ Successfully saved ${documents.length} files to ${OUTPUT_DIR}\n`);

  // Generate index file
  const indexData = {
    generated: new Date().toISOString(),
    totalDocuments: documents.length,
    documents: documents.map(doc => ({
      id: doc.id,
      patientId: doc.patientId,
      patientName: doc.patientName,
      type: doc.type,
      title: doc.title,
      date: doc.date.toISOString(),
      provider: doc.provider,
      filename: `${doc.type}_${doc.patientId}_${documents.indexOf(doc) + 1}.txt`,
    })),
    statistics: stats,
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'index.json'),
    JSON.stringify(indexData, null, 2),
    'utf-8'
  );

  console.log('📋 Generated index.json manifest');
  console.log('\n✨ Demo files ready for use!');
  console.log(`\nFiles location: ${OUTPUT_DIR}`);
  console.log('\nTo use in demo mode:');
  console.log('  1. Toggle demo mode in the dashboard');
  console.log('  2. Navigate to document upload');
  console.log('  3. Select from /public/demo-files/');
}

main().catch(console.error);
