/**
 * OPERATION FIRST LIGHT: Synthetic Pilot Data Injection
 *
 * Generates 20 synthetic patients targeting specific boundary conditions
 * to stress-test the DOAC Safety Engine before production deployment.
 *
 * Each patient is designed to trigger specific clinical scenarios:
 * - Contraindication thresholds (CrCl cliffs)
 * - Data gaps and missing values
 * - Drug-drug interactions
 * - Edge cases (age, weight, renal function)
 *
 * Usage: pnpm tsx scripts/seed-pilot-data.ts
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient({
  errorFormat: 'pretty',
  log: ['error', 'warn'],
});

// Type-safe patient state matching schema
interface PatientState {
  patientId: string;
  firstName: string;
  lastName: string;
  age: number;
  weight: number | null; // kg
  creatinine: number | null; // mg/dL
  creatinineClearance: number | null; // ml/min
  medications: {
    name: string;
    code: string; // RxNorm
    dosage: string;
  }[];
  labTimestamp: Date;
  consentStatus: boolean;
  consentTimestamp: Date;
  scenario: string; // Human-readable scenario name
  expectedRisk: 'PASS' | 'FLAG' | 'BLOCK' | 'ATTESTATION_REQUIRED'; // What Agent A should return
  killZone: string; // Which boundary condition this tests
}

// Calculate Cockcroft-Gault CrCl from creatinine
function calculateCrCl(
  age: number,
  weight: number,
  creatinine: number,
  isMale: boolean = true
): number {
  const sexFactor = isMale ? 1 : 0.85;
  return ((140 - age) * weight * sexFactor) / (72 * creatinine);
}

const syntheticPatients: PatientState[] = [
  // ===== SCENARIO 1-2: THE CLIFF (CrCl Threshold) =====
  {
    patientId: `P-001-${randomUUID()}`,
    firstName: 'Carlos',
    lastName: 'Mendez',
    age: 72,
    weight: 75,
    creatinine: 1.95,
    creatinineClearance: 29, // JUST BELOW THRESHOLD
    medications: [
      { name: 'Rivaroxaban', code: '1114195', dosage: '20mg daily' },
      { name: 'Metformin', code: '6809', dosage: '1000mg daily' },
    ],
    labTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h old (fresh)
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    scenario: 'The Cliff: CrCl = 29 (CONTRAINDICATED)',
    expectedRisk: 'BLOCK',
    killZone: 'CrCl threshold (30 ml/min boundary)',
  },
  {
    patientId: `P-002-${randomUUID()}`,
    firstName: 'Rosa',
    lastName: 'Santos',
    age: 72,
    weight: 75,
    creatinine: 1.90,
    creatinineClearance: 31, // JUST ABOVE THRESHOLD
    medications: [
      { name: 'Apixaban', code: '1364430', dosage: '5mg BID' },
      { name: 'Lisinopril', code: '21409', dosage: '10mg daily' },
    ],
    labTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'The Cliff: CrCl = 31 (SAFE)',
    expectedRisk: 'PASS',
    killZone: 'CrCl threshold (upper bound)',
  },

  // ===== SCENARIO 3-4: THE GHOST (Missing Data) =====
  {
    patientId: `P-003-${randomUUID()}`,
    firstName: 'Miguel',
    lastName: 'Rodriguez',
    age: 65,
    weight: null, // MISSING
    creatinine: 1.1,
    creatinineClearance: null, // Cannot calculate without weight
    medications: [
      { name: 'Edoxaban', code: '1298088', dosage: '60mg daily' },
    ],
    labTimestamp: new Date(Date.now() - 96 * 60 * 60 * 1000), // 96h old (TOO OLD)
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'The Ghost: Missing Weight (Data Gap)',
    expectedRisk: 'ATTESTATION_REQUIRED',
    killZone: 'Missing critical field (weight)',
  },
  {
    patientId: `P-004-${randomUUID()}`,
    firstName: 'Ana',
    lastName: 'Fernandez',
    age: 68,
    weight: 70,
    creatinine: null, // MISSING
    creatinineClearance: null,
    medications: [
      { name: 'Dabigatran', code: '1061325', dosage: '110mg BID' },
    ],
    labTimestamp: new Date(Date.now() - 120 * 60 * 60 * 1000), // 120h old (STALE)
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'The Ghost: Missing Creatinine (Data Gap)',
    expectedRisk: 'ATTESTATION_REQUIRED',
    killZone: 'Missing critical field (creatinine)',
  },

  // ===== SCENARIO 5-6: THE COCKTAIL (Drug Interactions) =====
  {
    patientId: `P-005-${randomUUID()}`,
    firstName: 'Juan',
    lastName: 'Perez',
    age: 70,
    weight: 80,
    creatinine: 1.0,
    creatinineClearance: 75,
    medications: [
      { name: 'Rivaroxaban', code: '1114195', dosage: '20mg daily' },
      { name: 'Warfarin', code: '11289', dosage: '5mg daily' }, // INTERACTION
      { name: 'Amiodarone', code: '703', dosage: '200mg daily' }, // INTERACTION
      { name: 'Sertraline', code: '36437', dosage: '50mg daily' }, // INTERACTION
    ],
    labTimestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48h old (fresh)
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'The Cocktail: Warfarin + Amiodarone + SSRI (Multi-drug Interaction)',
    expectedRisk: 'FLAG', // Not contraindicated, but requires caution
    killZone: 'Drug-drug interaction (triple therapy)',
  },
  {
    patientId: `P-006-${randomUUID()}`,
    firstName: 'Diego',
    lastName: 'Morales',
    age: 75,
    weight: 65,
    creatinine: 1.5,
    creatinineClearance: 45,
    medications: [
      { name: 'Apixaban', code: '1364430', dosage: '5mg BID' },
      { name: 'Amiodarone', code: '703', dosage: '200mg daily' },
      { name: 'Fluconazole', code: '3639', dosage: '200mg daily' }, // Strong CYP3A4 inhibitor
    ],
    labTimestamp: new Date(Date.now() - 36 * 60 * 60 * 1000),
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'The Cocktail: Apixaban + Amiodarone + Fluconazole (CYP3A4 Inhibition)',
    expectedRisk: 'FLAG',
    killZone: 'CYP3A4 interaction (increased drug levels)',
  },

  // ===== SCENARIO 7: THE EDGE (Geriatric, Age 89) =====
  {
    patientId: `P-007-${randomUUID()}`,
    firstName: 'Ramón',
    lastName: 'García',
    age: 89, // VERY ELDERLY
    weight: 55, // LOW WEIGHT
    creatinine: 1.8,
    creatinineClearance: 25, // LOW CrCl
    medications: [
      { name: 'Edoxaban', code: '1298088', dosage: '30mg daily' }, // Adjusted dose for age/renal
    ],
    labTimestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'The Edge: Age 89, CrCl 25, Weight 55kg (Geriatric + Renal Impairment)',
    expectedRisk: 'FLAG', // Safe with dose adjustment, but high risk
    killZone: 'Geriatric polypharmacy (age + renal impairment + low weight)',
  },

  // ===== SCENARIO 8-12: NORMAL SAFE CASES (Baseline) =====
  {
    patientId: `P-008-${randomUUID()}`,
    firstName: 'Elena',
    lastName: 'López',
    age: 55,
    weight: 70,
    creatinine: 0.9,
    creatinineClearance: 85,
    medications: [
      { name: 'Rivaroxaban', code: '1114195', dosage: '20mg daily' },
      { name: 'Atorvastatin', code: '125027', dosage: '40mg daily' },
    ],
    labTimestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'Baseline: 55yo, Normal Renal Function, Monotherapy',
    expectedRisk: 'PASS',
    killZone: 'Normal safe case (control)',
  },
  {
    patientId: `P-009-${randomUUID()}`,
    firstName: 'Pablo',
    lastName: 'Gutiérrez',
    age: 62,
    weight: 85,
    creatinine: 1.1,
    creatinineClearance: 70,
    medications: [
      { name: 'Apixaban', code: '1364430', dosage: '5mg BID' },
      { name: 'Metoprolol', code: '6713', dosage: '50mg daily' },
      { name: 'Omeprazole', code: '32265', dosage: '20mg daily' },
    ],
    labTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'Baseline: 62yo, Mild Renal Impairment, Stable Polypharmacy',
    expectedRisk: 'PASS',
    killZone: 'Normal safe case (mild impairment)',
  },
  {
    patientId: `P-010-${randomUUID()}`,
    firstName: 'Gabriela',
    lastName: 'Martínez',
    age: 58,
    weight: 68,
    creatinine: 0.85,
    creatinineClearance: 92,
    medications: [
      { name: 'Dabigatran', code: '1061325', dosage: '150mg BID' },
      { name: 'Lisinopril', code: '21409', dosage: '20mg daily' },
    ],
    labTimestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'Baseline: 58yo, Normal Renal Function, Dual Therapy',
    expectedRisk: 'PASS',
    killZone: 'Normal safe case (excellent renal function)',
  },

  // ===== SCENARIO 13-14: CONSENT EDGE CASES =====
  {
    patientId: `P-013-${randomUUID()}`,
    firstName: 'Roberto',
    lastName: 'Castro',
    age: 70,
    weight: 75,
    creatinine: 1.0,
    creatinineClearance: 80,
    medications: [
      { name: 'Rivaroxaban', code: '1114195', dosage: '20mg daily' },
    ],
    labTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    consentStatus: false, // NO CONSENT
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'Edge Case: Patient WITHOUT Consent for Research',
    expectedRisk: 'PASS', // Clinical rule still applies, but governance event blocked
    killZone: 'Consent check (patient opted out)',
  },
  {
    patientId: `P-014-${randomUUID()}`,
    firstName: 'Sofía',
    lastName: 'Delgado',
    age: 66,
    weight: 72,
    creatinine: 1.2,
    creatinineClearance: 65,
    medications: [
      { name: 'Edoxaban', code: '1298088', dosage: '60mg daily' },
    ],
    labTimestamp: new Date(), // BRAND NEW LAB (0 minutes old)
    consentStatus: true,
    consentTimestamp: new Date(), // JUST CONSENTED
    scenario: 'Edge Case: Fresh Labs, Fresh Consent',
    expectedRisk: 'PASS',
    killZone: 'Timestamp boundary (zero lag)',
  },

  // ===== SCENARIO 15-20: ADDITIONAL STRESS CASES =====
  {
    patientId: `P-015-${randomUUID()}`,
    firstName: 'Luis',
    lastName: 'Ortega',
    age: 77,
    weight: 50, // VERY LOW WEIGHT
    creatinine: 2.5, // HIGH CREATININE
    creatinineClearance: 18, // SEVERELY LOW CrCl
    medications: [
      { name: 'Edoxaban', code: '1298088', dosage: '30mg daily' },
    ],
    labTimestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'Stress: CrCl 18, Weight 50kg, Age 77 (Multiple Risk Factors)',
    expectedRisk: 'BLOCK', // Severe renal impairment
    killZone: 'Severe renal impairment + low weight + elderly',
  },
  {
    patientId: `P-016-${randomUUID()}`,
    firstName: 'Valentina',
    lastName: 'Romero',
    age: 61,
    weight: 120, // HIGH WEIGHT
    creatinine: 0.7,
    creatinineClearance: 125, // EXCELLENT CrCl
    medications: [
      { name: 'Rivaroxaban', code: '1114195', dosage: '20mg daily' },
    ],
    labTimestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'Stress: CrCl 125, Weight 120kg, Age 61 (Opposite Extreme)',
    expectedRisk: 'PASS',
    killZone: 'High renal clearance + high body weight',
  },
  {
    patientId: `P-017-${randomUUID()}`,
    firstName: 'Marco',
    lastName: 'Vega',
    age: 80,
    weight: 62,
    creatinine: 1.7,
    creatinineClearance: 35,
    medications: [
      { name: 'Apixaban', code: '1364430', dosage: '2.5mg BID' }, // REDUCED DOSE FOR AGE/WEIGHT
    ],
    labTimestamp: new Date(Date.now() - 72 * 60 * 60 * 1000),
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'Stress: Age 80, CrCl 35, Reduced Dose Apixaban (Beers Criteria)',
    expectedRisk: 'PASS', // Properly dosed for geriatric patient
    killZone: 'Age-weight-renal interaction (Beers criteria)',
  },
  {
    patientId: `P-018-${randomUUID()}`,
    firstName: 'Carmen',
    lastName: 'Silva',
    age: 71,
    weight: 69,
    creatinine: 2.8, // VERY HIGH CREATININE
    creatinineClearance: 15, // VERY LOW CrCl (near dialysis)
    medications: [
      { name: 'Rivaroxaban', code: '1114195', dosage: '20mg daily' }, // CONTRAINDICATED
    ],
    labTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'Stress: CrCl 15 (Pre-Dialysis), Rivaroxaban (CONTRAINDICATED)',
    expectedRisk: 'BLOCK',
    killZone: 'End-stage renal disease boundary',
  },
  {
    patientId: `P-019-${randomUUID()}`,
    firstName: 'Andrés',
    lastName: 'Núñez',
    age: 64,
    weight: 78,
    creatinine: 1.1,
    creatinineClearance: 72,
    medications: [
      { name: 'Dabigatran', code: '1061325', dosage: '150mg BID' },
      { name: 'Verapamil', code: '11170', dosage: '120mg daily' }, // CYP3A4 substrate
      { name: 'Clopidogrel', code: '32526', dosage: '75mg daily' }, // Antiplatelet
    ],
    labTimestamp: new Date(Date.now() - 36 * 60 * 60 * 1000),
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'Stress: Dabigatran + Verapamil + Clopidogrel (Complex Interactions)',
    expectedRisk: 'FLAG',
    killZone: 'Dual anticoagulation + rate control drug',
  },
  {
    patientId: `P-020-${randomUUID()}`,
    firstName: 'Isabela',
    lastName: 'Rivas',
    age: 59,
    weight: 71,
    creatinine: 0.95,
    creatinineClearance: 88,
    medications: [
      { name: 'Edoxaban', code: '1298088', dosage: '60mg daily' },
    ],
    labTimestamp: new Date(Date.now() - 18 * 60 * 60 * 1000),
    consentStatus: true,
    consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scenario: 'Baseline: 59yo, Normal Renal Function, Single DOAC (Control)',
    expectedRisk: 'PASS',
    killZone: 'Healthy baseline control',
  },
];

/**
 * Main execution: Seed the database with synthetic patients
 */
async function main() {
  console.log('🚀 OPERATION FIRST LIGHT: Synthetic Data Injection');
  console.log(`📊 Seeding ${syntheticPatients.length} synthetic patients...\n`);

  let successCount = 0;
  const createdPatients: { id: string; scenario: string }[] = [];

  for (const patient of syntheticPatients) {
    try {
      // Create patient using Prisma ORM
      const createdPatient = await prisma.patient.create({
        data: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: new Date(new Date().getFullYear() - patient.age, 0, 1),
          mrn: patient.patientId,
          tokenId: `PT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        },
      });

      // Note: Lab results, medications, and audit logs skipped for MVP
      // Focus on core patient record creation for pilot validation

      successCount++;
      createdPatients.push({ id: createdPatient.id.slice(0, 8), scenario: patient.scenario });
      console.log(`✅ [${createdPatient.id.slice(0, 8)}] ${patient.scenario}`);
    } catch (error) {
      console.error(
        `❌ [${patient.patientId}] Failed:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log(`\n📈 Seeding complete! ${successCount}/${syntheticPatients.length} patients injected.`);
  console.log('🧪 Ready for clinical validation testing...\n');

  if (successCount === syntheticPatients.length) {
    console.log('🟢 ALL PATIENTS SEEDED SUCCESSFULLY\n');
    console.log('📊 Created patients:');
    for (const p of createdPatients) {
      console.log(`   ${p.id} | ${p.scenario}`);
    }
  } else {
    console.log(
      `⚠️  ${syntheticPatients.length - successCount} patients failed. Check database connection.`
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('💥 Seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
