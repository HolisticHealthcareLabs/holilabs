#!/usr/bin/env tsx
/**
 * Seed Orchestrator — Entry point for all seeding operations.
 *
 * Usage:
 *   tsx prisma/seeds/index.ts --demo              # seed demo data
 *   tsx prisma/seeds/index.ts --demo --minimal     # users + 3 patients only
 *   tsx prisma/seeds/index.ts --clean --confirm     # wipe demo data + reseed
 *
 * Safety guards:
 *   - Refuses if DATABASE_URL contains "prod" or "production"
 *   - Refuses if DEMO_MODE !== "true"
 *   - --clean requires --confirm
 */

import { PrismaClient } from '@prisma/client';
import { seedDemoData, DEMO_PASSWORD } from './demo-data';

// ─── Safety Guards ──────────────────────────────────────────────────────────

function assertNotProduction(): void {
  const dbUrl = process.env.DATABASE_URL ?? '';
  if (/prod(uction)?/i.test(dbUrl)) {
    console.error('\n  ABORT: DATABASE_URL appears to point at a production database.');
    console.error('  Seed scripts will never run against production.\n');
    process.exit(1);
  }
}

function assertDemoMode(): void {
  if (process.env.DEMO_MODE !== 'true') {
    console.error('\n  ABORT: DEMO_MODE is not set to "true".');
    console.error('  Set DEMO_MODE=true in your .env or shell before seeding.\n');
    process.exit(1);
  }
}

// ─── CLI Flag Parsing ───────────────────────────────────────────────────────

interface SeedFlags {
  demo: boolean;
  clean: boolean;
  minimal: boolean;
  confirm: boolean;
}

function parseFlags(): SeedFlags {
  const args = process.argv.slice(2);
  return {
    demo: args.includes('--demo'),
    clean: args.includes('--clean'),
    minimal: args.includes('--minimal'),
    confirm: args.includes('--confirm'),
  };
}

// ─── Clean (wipe demo data) ─────────────────────────────────────────────────

async function cleanDemoData(prisma: PrismaClient): Promise<void> {
  console.log('\n  Cleaning all DEMO- prefixed data...\n');

  // Delete in FK-safe order (children first)
  const deletions = [
    { label: 'MedicationSchedules', fn: () => prisma.medicationSchedule.deleteMany({ where: { medication: { prescription: { patient: { mrn: { startsWith: 'DEMO-' } } } } } }) },
    { label: 'MedicationAdministrations', fn: () => prisma.medicationAdministration.deleteMany({ where: { medication: { prescription: { patient: { mrn: { startsWith: 'DEMO-' } } } } } }) },
    { label: 'Medications', fn: () => prisma.medication.deleteMany({ where: { prescription: { patient: { mrn: { startsWith: 'DEMO-' } } } } }) },
    { label: 'PrescriptionDispenses', fn: () => prisma.prescriptionDispense.deleteMany({ where: { prescription: { patient: { mrn: { startsWith: 'DEMO-' } } } } }) },
    { label: 'Prescriptions', fn: () => prisma.prescription.deleteMany({ where: { patient: { mrn: { startsWith: 'DEMO-' } } } }) },
    { label: 'ClinicalNoteVersions', fn: () => prisma.clinicalNoteVersion.deleteMany({ where: { clinicalNote: { patient: { mrn: { startsWith: 'DEMO-' } } } } }) },
    { label: 'ClinicalNotes', fn: () => prisma.clinicalNote.deleteMany({ where: { patient: { mrn: { startsWith: 'DEMO-' } } } }) },
    { label: 'LabResults', fn: () => prisma.labResult.deleteMany({ where: { patient: { mrn: { startsWith: 'DEMO-' } } } }) },
    { label: 'Diagnoses', fn: () => prisma.diagnosis.deleteMany({ where: { patient: { mrn: { startsWith: 'DEMO-' } } } }) },
    { label: 'Allergies', fn: () => prisma.allergy.deleteMany({ where: { patient: { mrn: { startsWith: 'DEMO-' } } } }) },
    { label: 'VitalSigns', fn: () => prisma.vitalSign.deleteMany({ where: { patient: { mrn: { startsWith: 'DEMO-' } } } }) },
    { label: 'ImagingStudies', fn: () => prisma.imagingStudy.deleteMany({ where: { patient: { mrn: { startsWith: 'DEMO-' } } } }) },
    { label: 'PreventiveCareReminders', fn: () => prisma.preventiveCareReminder.deleteMany({ where: { patient: { mrn: { startsWith: 'DEMO-' } } } }) },
    { label: 'ScribeSessions', fn: () => prisma.scribeSession.deleteMany({ where: { appointment: { patient: { mrn: { startsWith: 'DEMO-' } } } } }) },
    { label: 'Appointments', fn: () => prisma.appointment.deleteMany({ where: { patient: { mrn: { startsWith: 'DEMO-' } } } }) },
    { label: 'AuditLogs (demo)', fn: () => prisma.auditLog.deleteMany({ where: { actorId: { startsWith: 'demo-' } } }) },
    { label: 'Patients', fn: () => prisma.patient.deleteMany({ where: { mrn: { startsWith: 'DEMO-' } } }) },
    { label: 'WorkspaceMembers (demo)', fn: () => prisma.workspaceMember.deleteMany({ where: { userId: { startsWith: 'demo-' } } }) },
    { label: 'Users (demo)', fn: () => prisma.user.deleteMany({ where: { id: { startsWith: 'demo-' } } }) },
    { label: 'Workspaces (demo)', fn: () => prisma.workspace.deleteMany({ where: { slug: { startsWith: 'demo-' } } }) },
  ];

  let cleaned = 0;
  for (const { label, fn } of deletions) {
    const result = await fn();
    if (result.count > 0) {
      console.log(`    ${label}: ${result.count} deleted`);
      cleaned += result.count;
    }
  }

  console.log(`\n  Clean complete: ${cleaned} total records removed.\n`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const flags = parseFlags();

  // Show help if no flags
  if (!flags.demo && !flags.clean) {
    console.log(`
  Holi Labs — Seed Orchestrator

  Usage:
    tsx prisma/seeds/index.ts --demo              Seed demo data (DEMO_MODE=true required)
    tsx prisma/seeds/index.ts --demo --minimal    Seed users + 3 patients only
    tsx prisma/seeds/index.ts --clean --confirm    Wipe all DEMO- prefixed data + reseed
    tsx prisma/seeds/index.ts --clean --confirm --demo   Wipe + reseed demo data

  Environment:
    DEMO_MODE=true     Required for all operations
    DATABASE_URL       Must NOT contain "prod" or "production"

  Demo credentials:
    Password: ${DEMO_PASSWORD}
`);
    process.exit(0);
  }

  // Safety checks
  assertNotProduction();
  assertDemoMode();

  // --clean requires --confirm
  if (flags.clean && !flags.confirm) {
    console.error('\n  ABORT: --clean requires --confirm to prevent accidental data loss.');
    console.error('  Run: tsx prisma/seeds/index.ts --clean --confirm\n');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const startTime = Date.now();

  try {
    // Step 1: Clean if requested
    if (flags.clean) {
      await cleanDemoData(prisma);
    }

    // Step 2: Seed demo data if requested
    if (flags.demo) {
      await seedDemoData(prisma, { minimal: flags.minimal });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Summary
    console.log('  ╔══════════════════════════════════════╗');
    console.log('  ║        Seed Complete                 ║');
    console.log('  ╠══════════════════════════════════════╣');
    console.log(`  ║  Clean:   ${flags.clean ? 'YES' : 'no'}${' '.repeat(26 - (flags.clean ? 3 : 2))}║`);
    console.log(`  ║  Demo:    ${flags.demo ? 'YES' : 'no'}${' '.repeat(26 - (flags.demo ? 3 : 2))}║`);
    console.log(`  ║  Minimal: ${flags.minimal ? 'YES' : 'no'}${' '.repeat(26 - (flags.minimal ? 3 : 2))}║`);
    console.log(`  ║  Time:    ${elapsed}s${' '.repeat(26 - elapsed.length - 1)}║`);
    console.log('  ╚══════════════════════════════════════╝\n');
  } catch (err) {
    console.error('\n  SEED FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
