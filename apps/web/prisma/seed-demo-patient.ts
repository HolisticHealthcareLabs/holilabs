/**
 * Seed Demo Patient for Clinical Suite Testing
 *
 * Creates a patient with ID "demo-patient" for use in test scripts.
 *
 * Usage: npx tsx prisma/seed-demo-patient.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo patient for clinical suite testing...\n');

  // Find or create a demo clinician to attach the patient to
  let clinician = await prisma.user.findFirst({
    where: { email: 'demo-clinician@holilabs.xyz' },
  });

  if (!clinician) {
    clinician = await prisma.user.create({
      data: {
        id: 'demo-clinician',
        email: 'demo-clinician@holilabs.xyz',
        firstName: 'Demo',
        lastName: 'Clinician',
        role: 'CLINICIAN',
        specialty: 'Internal Medicine',
      },
    });
    console.log('Created demo clinician:', clinician.email);
  } else {
    console.log('Found existing demo clinician:', clinician.email);
  }

  // Check if patient already exists
  const existingPatient = await prisma.patient.findUnique({
    where: { id: 'demo-patient' },
  });

  let demoPatient = existingPatient;

  if (existingPatient) {
    console.log('Demo patient already exists:', existingPatient.id);
  } else {

  // Create the demo patient
  const demoPatient = await prisma.patient.create({
    data: {
      id: 'demo-patient',
      firstName: 'Demo',
      lastName: 'Patient',
      dateOfBirth: new Date('1970-05-15'),
      gender: 'M',
      email: 'demo.patient@example.com',
      phone: '+1-555-0100',
      mrn: 'MRN-DEMO-001',
      tokenId: 'demo-patient-token',
      address: '123 Demo Street',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'USA',
      assignedClinician: { connect: { id: clinician.id } },
    },
  });

  console.log('Created demo patient:', demoPatient.id);

  // Add some allergies
  const allergies = [
    { allergen: 'Penicillin', severity: 'MODERATE' as const, allergyType: 'MEDICATION' as const },
    { allergen: 'Shellfish', severity: 'SEVERE' as const, allergyType: 'FOOD' as const },
  ];

  for (const allergy of allergies) {
    await prisma.allergy.create({
      data: {
        patientId: demoPatient.id,
        allergen: allergy.allergen,
        severity: allergy.severity,
        allergyType: allergy.allergyType,
        isActive: true,
        verificationStatus: 'CLINICIAN_VERIFIED',
        createdBy: clinician.id,
      },
    });
  }
  console.log('Added allergies:', allergies.map(a => a.allergen).join(', '));

  // Add some medications
  const medications = [
    { name: 'Metformin', dose: '500mg', frequency: 'twice daily', route: 'oral' },
    { name: 'Lisinopril', dose: '10mg', frequency: 'once daily', route: 'oral' },
    { name: 'Atorvastatin', dose: '20mg', frequency: 'once daily at bedtime', route: 'oral' },
  ];

  for (const med of medications) {
    await prisma.medication.create({
      data: {
        patientId: demoPatient.id,
        name: med.name,
        dose: med.dose,
        frequency: med.frequency,
        route: med.route,
        isActive: true,
        startDate: new Date('2024-01-01'),
        prescribedBy: clinician.id,
      },
    });
  }
  console.log('Added medications:', medications.map(m => m.name).join(', '));

  // Add some diagnoses
  const diagnoses = [
    { icd10Code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', status: 'ACTIVE' as const },
    { icd10Code: 'I10', description: 'Essential hypertension', status: 'ACTIVE' as const },
    { icd10Code: 'E78.5', description: 'Hyperlipidemia, unspecified', status: 'ACTIVE' as const },
  ];

  for (const dx of diagnoses) {
    await prisma.diagnosis.create({
      data: {
        patientId: demoPatient.id,
        icd10Code: dx.icd10Code,
        description: dx.description,
        status: dx.status,
        onsetDate: new Date('2023-01-01'),
      },
    });
  }
  console.log('Added diagnoses:', diagnoses.map(d => d.icd10Code).join(', '));

  // Add some lab results
  const labResults = [
    { testName: 'HbA1c', value: '7.2', unit: '%', referenceRange: '4.0-5.6', status: 'FINAL' as const },
    { testName: 'Total Cholesterol', value: '210', unit: 'mg/dL', referenceRange: '<200', status: 'FINAL' as const },
    { testName: 'LDL Cholesterol', value: '130', unit: 'mg/dL', referenceRange: '<100', status: 'FINAL' as const },
    { testName: 'HDL Cholesterol', value: '45', unit: 'mg/dL', referenceRange: '>40', status: 'FINAL' as const },
    { testName: 'Creatinine', value: '1.1', unit: 'mg/dL', referenceRange: '0.7-1.3', status: 'FINAL' as const },
    { testName: 'eGFR', value: '75', unit: 'mL/min/1.73m2', referenceRange: '>60', status: 'FINAL' as const },
  ];

  for (const lab of labResults) {
    await prisma.labResult.create({
      data: {
        patientId: demoPatient.id,
        testName: lab.testName,
        value: lab.value,
        unit: lab.unit,
        referenceRange: lab.referenceRange,
        status: lab.status,
        resultDate: new Date(),
        orderingDoctor: 'Demo Clinician',
      },
    });
  }
  console.log('Added lab results:', labResults.map(l => l.testName).join(', '));
  }

  // Create a form template for testing
  const existingTemplate = await prisma.formTemplate.findUnique({
    where: { id: 'medical-history-intake' },
  });

  if (!existingTemplate) {
    await prisma.formTemplate.create({
      data: {
        id: 'medical-history-intake',
        title: 'Medical History Intake Form',
        description: 'Comprehensive medical history questionnaire for new patients',
        category: 'MEDICAL_HISTORY',
        isBuiltIn: true,
        isActive: true,
        structure: {
          fields: [
            { id: 'allergies', type: 'textarea', label: 'Known Allergies', required: true },
            { id: 'medications', type: 'textarea', label: 'Current Medications', required: true },
            { id: 'conditions', type: 'checkbox', label: 'Medical Conditions', options: ['Diabetes', 'Hypertension', 'Heart Disease', 'Asthma'] },
            { id: 'surgeries', type: 'textarea', label: 'Previous Surgeries', required: false },
            { id: 'familyHistory', type: 'textarea', label: 'Family Medical History', required: false },
          ],
        },
        createdBy: clinician.id,
      },
    });
    console.log('Created form template: medical-history-intake');
  } else {
    console.log('Form template already exists: medical-history-intake');
  }

  console.log('\n Demo patient seeded successfully!');
  console.log('Patient ID: demo-patient');
  console.log('You can now run: npx tsx scripts/test-clinical-suite.ts');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
