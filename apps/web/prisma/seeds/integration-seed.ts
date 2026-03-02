/**
 * Master Integration Seed Script
 *
 * Creates 4 demo patients that exercise the full CDSS + Prevention + Governance pipeline.
 * Idempotent: uses MRN prefix "INT-" to identify and re-create on each run.
 *
 * Usage: DATABASE_URL=... pnpm tsx prisma/seeds/integration-seed.ts
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Type assertion — generated Prisma client types are out of sync with schema for newer models.
// This is the same pattern used in governance.service.ts and other files.
const db = prisma as any;

const MRN_PREFIX = 'INT-';

function generateTokenId(): string {
  const uuid = randomUUID();
  return `PT-${uuid.slice(0, 4)}-${uuid.slice(4, 8)}-${uuid.slice(8, 12)}`;
}

async function main() {
  console.log('=== Integration Seed: Full CDSS + Prevention + Governance Pipeline ===\n');

  // Clean up previous integration seed data
  const existingPatients = await db.patient.findMany({
    where: { mrn: { startsWith: MRN_PREFIX } },
    select: { id: true },
  });

  if (existingPatients.length > 0) {
    const ids = existingPatients.map((p: any) => p.id);
    console.log(`Cleaning up ${ids.length} existing integration patients...`);

    // Delete in dependency order
    await db.preventionEncounterLink.deleteMany({ where: { preventionPlan: { patientId: { in: ids } } } });
    await db.riskScore.deleteMany({ where: { patientId: { in: ids } } });
    await db.preventionPlan.deleteMany({ where: { patientId: { in: ids } } });
    await db.preventiveCareReminder.deleteMany({ where: { patientId: { in: ids } } });
    await db.screeningOutcome.deleteMany({ where: { patientId: { in: ids } } });
    await db.medication.deleteMany({ where: { patientId: { in: ids } } });
    await db.allergy.deleteMany({ where: { patientId: { in: ids } } });
    await db.labResult.deleteMany({ where: { patientId: { in: ids } } });
    await db.diagnosis.deleteMany({ where: { patientId: { in: ids } } });
    await db.manualReviewQueueItem.deleteMany({ where: { patientId: { in: ids } } });
    await db.clinicalNote.deleteMany({ where: { patientId: { in: ids } } });
    await db.auditLog.deleteMany({ where: { resourceId: { in: ids } } });
    await db.patient.deleteMany({ where: { id: { in: ids } } });
    console.log('Cleanup complete.\n');
  }

  // Find or create integration clinician
  let clinician = await db.user.findFirst({
    where: { email: 'integration@holilabs.com' },
  });

  if (!clinician) {
    clinician = await db.user.create({
      data: {
        id: 'int-clinician-001',
        email: 'integration@holilabs.com',
        firstName: 'Integration',
        lastName: 'Clinician',
        role: 'CLINICIAN',
        specialty: 'Internal Medicine',
      },
    });
    console.log('Created clinician:', clinician.email);
  } else {
    console.log('Using existing clinician:', clinician.email);
  }

  const clinicianId = clinician.id;

  // ========================================================================
  // Patient A — "Maria Silva" (Drug Interaction + DOAC + Stale Labs)
  // ========================================================================
  console.log('\n--- Patient A: Maria Silva (Drug Interaction + DOAC + Stale Labs) ---');

  const patientA = await db.patient.create({
    data: {
      mrn: `${MRN_PREFIX}A001`,
      tokenId: generateTokenId(),
      firstName: 'Maria',
      lastName: 'Silva',
      dateOfBirth: new Date('1954-03-15'), // Age 72
      gender: 'Female',
      email: 'maria.silva@example.com',
      phone: '+55 11 98765-4321',
      isActive: true,
      assignedClinicianId: clinicianId,
      bmi: 28.5,
    },
  });
  console.log(`  Created: ${patientA.firstName} ${patientA.lastName} (${patientA.id})`);

  // Medications for Patient A
  await db.medication.createMany({
    data: [
      {
        patientId: patientA.id,
        name: 'Rivaroxaban 20mg',
        genericName: 'rivaroxaban',
        dose: '20mg',
        frequency: 'once daily',
        route: 'oral',
        isActive: true,
        prescribedBy: clinicianId,
        startDate: new Date('2025-06-01'),
      },
      {
        patientId: patientA.id,
        name: 'Aspirin 100mg',
        genericName: 'aspirin',
        dose: '100mg',
        frequency: 'once daily',
        route: 'oral',
        isActive: true,
        prescribedBy: clinicianId,
        startDate: new Date('2025-01-01'),
      },
      {
        patientId: patientA.id,
        name: 'Lisinopril 10mg',
        genericName: 'lisinopril',
        dose: '10mg',
        frequency: 'once daily',
        route: 'oral',
        isActive: true,
        prescribedBy: clinicianId,
        startDate: new Date('2024-06-01'),
      },
    ],
  });

  // Allergies for Patient A
  await db.allergy.create({
    data: {
      patientId: patientA.id,
      allergen: 'Penicillin',
      allergyType: 'MEDICATION',
      reactions: ['Anaphylaxis'],
      severity: 'SEVERE',
      verificationStatus: 'CONFIRMED_BY_TESTING',
    },
  });

  // Lab results for Patient A (CrCl STALE = 100 days old)
  const staleDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
  await db.labResult.createMany({
    data: [
      {
        patientId: patientA.id,
        testName: 'Creatinine Clearance (CrCl)',
        testCode: '2164-2',
        value: '45',
        unit: 'mL/min',
        referenceRange: '60-120 mL/min',
        interpretation: 'low',
        status: 'FINAL',
        resultDate: staleDate,
      },
      {
        patientId: patientA.id,
        testName: 'HbA1c',
        testCode: '4548-4',
        value: '6.8',
        unit: '%',
        referenceRange: '< 5.7%',
        interpretation: 'high',
        status: 'FINAL',
        resultDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Diagnoses for Patient A
  await db.diagnosis.createMany({
    data: [
      { patientId: patientA.id, icd10Code: 'I48', description: 'Atrial fibrillation', status: 'ACTIVE', diagnosedBy: clinicianId },
      { patientId: patientA.id, icd10Code: 'E11', description: 'Type 2 diabetes mellitus', status: 'ACTIVE', diagnosedBy: clinicianId },
      { patientId: patientA.id, icd10Code: 'I10', description: 'Essential hypertension', status: 'ACTIVE', diagnosedBy: clinicianId },
    ],
  });

  // ========================================================================
  // Patient B — "Carlos Mendes" (Screening Gaps + Prevention)
  // ========================================================================
  console.log('\n--- Patient B: Carlos Mendes (Screening Gaps + Prevention) ---');

  const patientB = await db.patient.create({
    data: {
      mrn: `${MRN_PREFIX}B001`,
      tokenId: generateTokenId(),
      firstName: 'Carlos',
      lastName: 'Mendes',
      dateOfBirth: new Date('1971-07-22'), // Age 55
      gender: 'Male',
      email: 'carlos.mendes@example.com',
      phone: '+55 21 99876-5432',
      isActive: true,
      assignedClinicianId: clinicianId,
      bmi: 32.0,
    },
  });
  console.log(`  Created: ${patientB.firstName} ${patientB.lastName} (${patientB.id})`);

  // Lab results for Patient B (abnormal — should trigger prevention plans)
  await db.labResult.createMany({
    data: [
      {
        patientId: patientB.id,
        testName: 'LDL Cholesterol',
        testCode: '13457-7',
        value: '185',
        unit: 'mg/dL',
        referenceRange: '< 130 mg/dL',
        interpretation: 'high',
        status: 'FINAL',
        resultDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        patientId: patientB.id,
        testName: 'Fasting Glucose',
        testCode: '1558-6',
        value: '128',
        unit: 'mg/dL',
        referenceRange: '< 100 mg/dL',
        interpretation: 'high',
        status: 'FINAL',
        resultDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // ========================================================================
  // Patient C — "Ana Torres" (Comprehensive Prevention)
  // ========================================================================
  console.log('\n--- Patient C: Ana Torres (Comprehensive Prevention) ---');

  const patientC = await db.patient.create({
    data: {
      mrn: `${MRN_PREFIX}C001`,
      tokenId: generateTokenId(),
      firstName: 'Ana',
      lastName: 'Torres',
      dateOfBirth: new Date('1964-01-10'), // Age 62
      gender: 'Female',
      email: 'ana.torres@example.com',
      phone: '+55 31 98765-1234',
      isActive: true,
      assignedClinicianId: clinicianId,
      bmi: 26.5,
      lastMammogram: new Date('2023-03-01'), // 3 years ago — overdue
      lastColonoscopy: new Date('2014-03-01'), // 12 years ago — overdue
    },
  });
  console.log(`  Created: ${patientC.firstName} ${patientC.lastName} (${patientC.id})`);

  // Medications for Patient C
  await db.medication.createMany({
    data: [
      {
        patientId: patientC.id,
        name: 'Metformin 1000mg',
        genericName: 'metformin',
        dose: '1000mg',
        frequency: 'twice daily',
        route: 'oral',
        isActive: true,
        prescribedBy: clinicianId,
        startDate: new Date('2023-01-01'),
      },
      {
        patientId: patientC.id,
        name: 'Atorvastatin 40mg',
        genericName: 'atorvastatin',
        dose: '40mg',
        frequency: 'once daily',
        route: 'oral',
        isActive: true,
        prescribedBy: clinicianId,
        startDate: new Date('2023-06-01'),
      },
    ],
  });

  // Lab results for Patient C
  await db.labResult.createMany({
    data: [
      {
        patientId: patientC.id,
        testName: 'HbA1c',
        testCode: '4548-4',
        value: '7.5',
        unit: '%',
        referenceRange: '< 7.0%',
        interpretation: 'high',
        status: 'FINAL',
        resultDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        patientId: patientC.id,
        testName: 'LDL Cholesterol',
        testCode: '13457-7',
        value: '95',
        unit: 'mg/dL',
        referenceRange: '< 100 mg/dL',
        interpretation: 'normal',
        status: 'FINAL',
        resultDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        patientId: patientC.id,
        testName: 'eGFR',
        testCode: '33914-3',
        value: '58',
        unit: 'mL/min/1.73m²',
        referenceRange: '≥ 60',
        interpretation: 'low',
        status: 'FINAL',
        resultDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Active prevention plans for Patient C (pre-existing)
  await db.preventionPlan.create({
    data: {
      patientId: patientC.id,
      planType: 'DIABETES',
      planName: 'Diabetes Management Plan',
      description: 'Active diabetes management per ADA 2025 guidelines.',
      status: 'ACTIVE',
      goals: [
        { goal: 'Target HbA1c < 7.0%', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        { goal: 'Quarterly HbA1c monitoring', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
      ],
      recommendations: [
        { category: 'medication', intervention: 'Continue Metformin 1000mg BID', evidence: 'Grade A', priority: 'high' },
        { category: 'monitoring', intervention: 'HbA1c every 3 months', evidence: 'Grade A', priority: 'high' },
      ],
      guidelineSource: 'ADA 2025',
      evidenceLevel: 'Grade A',
    },
  });

  // Screening outcomes for Patient C
  await db.screeningOutcome.create({
    data: {
      patientId: patientC.id,
      screeningType: 'mammogram',
      scheduledDate: new Date('2023-02-15'),
      completedDate: new Date('2023-03-01'),
      result: 'normal',
      notes: 'BI-RADS 1 — negative',
      performedBy: clinicianId,
    },
  });

  // Overdue reminders for Patient C
  await db.preventiveCareReminder.createMany({
    data: [
      {
        patientId: patientC.id,
        screeningType: 'MAMMOGRAM',
        title: 'Mammogram Screening',
        description: 'Mammogram overdue — last performed March 2023',
        recommendedBy: new Date('2025-03-01'),
        priority: 'HIGH',
        status: 'DUE',
        dueDate: new Date('2025-03-01'),
      },
      {
        patientId: patientC.id,
        screeningType: 'COLONOSCOPY',
        title: 'Colonoscopy Screening',
        description: 'Colonoscopy overdue — last performed March 2014',
        recommendedBy: new Date('2024-03-01'),
        priority: 'HIGH',
        status: 'DUE',
        dueDate: new Date('2024-03-01'),
      },
    ],
  });

  // ========================================================================
  // Patient D — "Roberto Andrade" (Review Queue)
  // ========================================================================
  console.log('\n--- Patient D: Roberto Andrade (Review Queue) ---');

  const patientD = await db.patient.create({
    data: {
      mrn: `${MRN_PREFIX}D001`,
      tokenId: generateTokenId(),
      firstName: 'Roberto',
      lastName: 'Andrade',
      dateOfBirth: new Date('1981-11-05'), // Age 45
      gender: 'Male',
      email: 'roberto.andrade@example.com',
      phone: '+55 41 99876-5678',
      isActive: true,
      assignedClinicianId: clinicianId,
      bmi: 24.0,
    },
  });
  console.log(`  Created: ${patientD.firstName} ${patientD.lastName} (${patientD.id})`);

  // AI-generated clinical note with low confidence
  const noteHash = `hash-${randomUUID().slice(0, 16)}`;
  const clinicalNote = await db.clinicalNote.create({
    data: {
      patientId: patientD.id,
      authorId: clinicianId,
      noteHash,
      type: 'PROGRESS',
      subjective: 'Patient presents for routine follow-up. Reports mild fatigue over past 2 weeks. No chest pain or shortness of breath.',
      objective: 'Vitals stable. No acute distress.',
      assessment: 'Mild fatigue — differential includes anemia, thyroid disorder, deconditioning.',
      plan: 'Order CBC, TSH, metabolic panel. Follow up in 2 weeks.',
    },
  });

  // Add to review queue with low confidence
  await db.manualReviewQueueItem.create({
    data: {
      patientId: patientD.id,
      clinicianId,
      contentType: 'soap_note',
      contentId: clinicalNote.id,
      confidence: 0.45,
      priority: 8,
      flagReason: 'low_confidence',
      flagDetails: 'AI-generated note with 45% confidence — clinician review required before signing.',
      status: 'PENDING',
    },
  });

  // ========================================================================
  // Governance Events (for feed panel)
  // ========================================================================
  console.log('\n--- Seeding Governance Events ---');

  await db.auditLog.createMany({
    data: [
      {
        userId: clinicianId,
        userEmail: clinician.email,
        ipAddress: '127.0.0.1',
        action: 'VIEW',
        resource: 'ClinicalDecisionSupport',
        resourceId: patientA.id,
        details: { hookType: 'medication-prescribe', alertCount: 2, patientMRN: patientA.mrn },
        success: true,
      },
      {
        userId: clinicianId,
        userEmail: clinician.email,
        ipAddress: '127.0.0.1',
        action: 'UPDATE',
        resource: 'ClinicalDecisionSupport',
        resourceId: patientA.id,
        details: { reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE', ruleId: 'drug-interaction-check' },
        success: true,
      },
      {
        userId: clinicianId,
        userEmail: clinician.email,
        ipAddress: '127.0.0.1',
        action: 'VIEW',
        resource: 'ClinicalDecisionSupport',
        resourceId: patientC.id,
        details: { hookType: 'patient-view', alertCount: 3, patientMRN: patientC.mrn },
        success: true,
      },
    ],
  });

  // Risk scores
  await db.riskScore.createMany({
    data: [
      {
        patientId: patientA.id,
        riskType: 'DIABETES',
        algorithmVersion: 'ADA-Diabetes-2009',
        score: 72,
        scorePercentage: '72%',
        category: 'HIGH',
        inputData: { hba1c: 6.8, bmi: 28.5, age: 72 },
        recommendation: 'Lifestyle intervention and continued monitoring recommended.',
        nextSteps: ['Monitor HbA1c quarterly', 'Dietary counseling', 'Annual eye exam'],
      },
      {
        patientId: patientB.id,
        riskType: 'ASCVD',
        algorithmVersion: 'ASCVD-2013-ACC-AHA',
        score: 0.152,
        scorePercentage: '15.2%',
        category: 'BORDERLINE',
        inputData: { ldl: 185, bmi: 32, age: 55 },
        recommendation: 'Consider statin therapy per ACC/AHA guidelines.',
        nextSteps: ['Start statin therapy', 'Lifestyle modifications', 'Follow-up in 3 months'],
      },
      {
        patientId: patientC.id,
        riskType: 'DIABETES',
        algorithmVersion: 'ADA-Diabetes-2009',
        score: 80,
        scorePercentage: '80%',
        category: 'HIGH',
        inputData: { hba1c: 7.5, egfr: 58, age: 62 },
        recommendation: 'Intensify diabetes management, monitor renal function.',
        nextSteps: ['Adjust Metformin dose', 'Refer to nephrology', 'Quarterly labs'],
      },
    ],
  });

  // ========================================================================
  // Summary
  // ========================================================================
  console.log('\n=== Integration Seed Complete ===');
  console.log(`Clinician: ${clinician.email} (${clinicianId})`);
  console.log(`Patient A: Maria Silva (${patientA.id}) — DOAC + Drug Interactions`);
  console.log(`Patient B: Carlos Mendes (${patientB.id}) — Screening Gaps + Abnormal Labs`);
  console.log(`Patient C: Ana Torres (${patientC.id}) — Comprehensive Prevention`);
  console.log(`Patient D: Roberto Andrade (${patientD.id}) — Review Queue`);
  console.log('\nReady for end-to-end demo testing.');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
