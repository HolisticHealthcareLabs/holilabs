/**
 * Test Clinical Data Seed Script
 *
 * Populates database with realistic test data for CDSS and Review Queue testing
 *
 * Run with:
 * DATABASE_URL="postgresql://holi:holi_dev_password@localhost:5432/holi_protocol?schema=public&sslmode=disable" \
 * pnpm tsx prisma/seeds/test-clinical-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test clinical data...');

  // Create test clinician
  const clinician = await prisma.user.upsert({
    where: { email: 'test.clinician@holilabs.com' },
    update: {},
    create: {
      email: 'test.clinician@holilabs.com',
      firstName: 'Dr. Test',
      lastName: 'Clinician',
      role: 'CLINICIAN',
    },
  });

  console.log('✅ Created test clinician:', clinician.email);

  // Patient 1: Drug Interaction (Warfarin + Aspirin)
  const patient1 = await prisma.patient.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1960-01-01'),
      mrn: 'TEST-001',
      tokenId: 'PT-test-001',
      assignedClinicianId: clinician.id,
      medications: {
        create: [
          {
            name: 'Warfarin',
            dose: '5mg',
            frequency: 'QD',
            isActive: true,
          },
          {
            name: 'Aspirin',
            dose: '81mg',
            frequency: 'QD',
            isActive: true,
          },
        ],
      },
    },
  });

  console.log('✅ Created patient with drug interaction:', patient1.mrn);

  // Patient 2: Sepsis Risk (high qSOFA)
  const patient2 = await prisma.patient.create({
    data: {
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: new Date('1970-05-15'),
      mrn: 'TEST-002',
      tokenId: 'PT-test-002',
      assignedClinicianId: clinician.id,
      vitalSigns: {
        create: [
          {
            temperature: 38.5,
            heartRate: 115,
            systolicBP: 95,
            diastolicBP: 60,
            respiratoryRate: 24,
            oxygenSaturation: 92,
            recordedAt: new Date(),
          },
        ],
      },
    },
  });

  console.log('✅ Created patient with sepsis risk:', patient2.mrn);

  // Patient 3: Hypertension
  const patient3 = await prisma.patient.create({
    data: {
      firstName: 'Bob',
      lastName: 'Johnson',
      dateOfBirth: new Date('1965-03-20'),
      mrn: 'TEST-003',
      tokenId: 'PT-test-003',
      assignedClinicianId: clinician.id,
      vitalSigns: {
        create: [
          {
            temperature: 36.8,
            heartRate: 75,
            systolicBP: 155,
            diastolicBP: 95,
            respiratoryRate: 16,
            oxygenSaturation: 98,
            recordedAt: new Date(),
          },
        ],
      },
    },
  });

  console.log('✅ Created patient with hypertension:', patient3.mrn);

  // Patient 4: Critical Labs
  const patient4 = await prisma.patient.create({
    data: {
      firstName: 'Alice',
      lastName: 'Williams',
      dateOfBirth: new Date('1955-08-10'),
      mrn: 'TEST-004',
      tokenId: 'PT-test-004',
      assignedClinicianId: clinician.id,
      labResults: {
        create: [
          {
            testName: 'Potassium',
            value: '6.5',
            unit: 'mEq/L',
            referenceRange: '3.5-5.0',
            isAbnormal: true,
            isCritical: true,
            status: 'FINAL',
            resultDate: new Date(),
          },
        ],
      },
    },
  });

  console.log('✅ Created patient with critical labs:', patient4.mrn);

  // Patient 5: Polypharmacy (10+ medications)
  const patient5 = await prisma.patient.create({
    data: {
      firstName: 'Diana',
      lastName: 'Davis',
      dateOfBirth: new Date('1945-06-30'),
      mrn: 'TEST-005',
      tokenId: 'PT-test-005',
      assignedClinicianId: clinician.id,
      medications: {
        create: [
          { name: 'Lisinopril', dose: '10mg', frequency: 'QD', isActive: true },
          { name: 'Metformin', dose: '500mg', frequency: 'BID', isActive: true },
          { name: 'Atorvastatin', dose: '20mg', frequency: 'QHS', isActive: true },
          { name: 'Aspirin', dose: '81mg', frequency: 'QD', isActive: true },
          { name: 'Omeprazole', dose: '20mg', frequency: 'QD', isActive: true },
          { name: 'Levothyroxine', dose: '50mcg', frequency: 'QAM', isActive: true },
          { name: 'Warfarin', dose: '5mg', frequency: 'QD', isActive: true },
          { name: 'Furosemide', dose: '40mg', frequency: 'QD', isActive: true },
          { name: 'Albuterol', dose: '90mcg', frequency: 'PRN', isActive: true },
          { name: 'Gabapentin', dose: '300mg', frequency: 'TID', isActive: true },
        ],
      },
    },
  });

  console.log('✅ Created patient with polypharmacy:', patient5.mrn);

  // Patient 6: Renal Dosing Concern
  const patient6 = await prisma.patient.create({
    data: {
      firstName: 'Edward',
      lastName: 'Martinez',
      dateOfBirth: new Date('1958-11-05'),
      mrn: 'TEST-006',
      tokenId: 'PT-test-006',
      assignedClinicianId: clinician.id,
      medications: {
        create: [
          { name: 'Metformin', dose: '1000mg', frequency: 'BID', isActive: true },
          { name: 'Lisinopril', dose: '20mg', frequency: 'QD', isActive: true },
        ],
      },
      labResults: {
        create: [
          {
            testName: 'Creatinine',
            value: '1.5',
            unit: 'mg/dL',
            referenceRange: '0.6-1.2',
            isAbnormal: true,
            isCritical: false,
            status: 'FINAL',
            resultDate: new Date(),
            createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000), // 200 days ago
          },
        ],
      },
    },
  });

  console.log('✅ Created patient with renal dosing concern:', patient6.mrn);

  // Patient 7: Warfarin with INR out of range
  const patient7 = await prisma.patient.create({
    data: {
      firstName: 'Grace',
      lastName: 'Lee',
      dateOfBirth: new Date('1968-09-22'),
      mrn: 'TEST-007',
      tokenId: 'PT-test-007',
      assignedClinicianId: clinician.id,
      medications: {
        create: [
          { name: 'Warfarin', dose: '5mg', frequency: 'QD', isActive: true },
        ],
      },
      labResults: {
        create: [
          {
            testName: 'INR',
            value: '1.5',
            unit: '',
            referenceRange: '2.0-3.5',
            isAbnormal: true,
            isCritical: false,
            status: 'FINAL',
            resultDate: new Date(),
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          },
        ],
      },
    },
  });

  console.log('✅ Created patient with INR out of range:', patient7.mrn);

  // Patient 8: Duplicate Therapy (Multiple Statins)
  const patient8 = await prisma.patient.create({
    data: {
      firstName: 'Irene',
      lastName: 'Anderson',
      dateOfBirth: new Date('1957-07-08'),
      mrn: 'TEST-008',
      tokenId: 'PT-test-008',
      assignedClinicianId: clinician.id,
      medications: {
        create: [
          { name: 'Atorvastatin', dose: '20mg', frequency: 'QHS', isActive: true },
          { name: 'Simvastatin', dose: '40mg', frequency: 'QHS', isActive: true },
        ],
      },
    },
  });

  console.log('✅ Created patient with duplicate therapy:', patient8.mrn);

  // Patient 9: Healthy Patient (Control)
  const patient9 = await prisma.patient.create({
    data: {
      firstName: 'Jack',
      lastName: 'Thompson',
      dateOfBirth: new Date('1980-03-12'),
      mrn: 'TEST-009',
      tokenId: 'PT-test-009',
      assignedClinicianId: clinician.id,
      vitalSigns: {
        create: [
          {
            temperature: 36.8,
            heartRate: 72,
            systolicBP: 118,
            diastolicBP: 75,
            respiratoryRate: 16,
            oxygenSaturation: 99,
            recordedAt: new Date(),
          },
        ],
      },
      labResults: {
        create: [
          {
            testName: 'Complete Blood Count',
            value: 'WNL',
            unit: '',
            referenceRange: 'Normal',
            isAbnormal: false,
            isCritical: false,
            status: 'FINAL',
            resultDate: new Date(),
          },
        ],
      },
    },
  });

  console.log('✅ Created healthy patient (control):', patient9.mrn);

  // Patient 10: Complex Case (Multiple Issues)
  const patient10 = await prisma.patient.create({
    data: {
      firstName: 'Karen',
      lastName: 'Brown',
      dateOfBirth: new Date('1952-11-30'),
      mrn: 'TEST-010',
      tokenId: 'PT-test-010',
      assignedClinicianId: clinician.id,
      medications: {
        create: [
          { name: 'Warfarin', dose: '5mg', frequency: 'QD', isActive: true },
          { name: 'Aspirin', dose: '81mg', frequency: 'QD', isActive: true },
          { name: 'Metformin', dose: '1000mg', frequency: 'BID', isActive: true },
          { name: 'Lisinopril', dose: '20mg', frequency: 'QD', isActive: true },
          { name: 'Atorvastatin', dose: '40mg', frequency: 'QHS', isActive: true },
        ],
      },
      vitalSigns: {
        create: [
          {
            temperature: 37.2,
            heartRate: 88,
            systolicBP: 148,
            diastolicBP: 92,
            respiratoryRate: 18,
            oxygenSaturation: 96,
            recordedAt: new Date(),
          },
        ],
      },
      labResults: {
        create: [
          {
            testName: 'INR',
            value: '4.5',
            unit: '',
            referenceRange: '2.0-3.5',
            isAbnormal: true,
            isCritical: true,
            status: 'FINAL',
            resultDate: new Date(),
          },
          {
            testName: 'HbA1c',
            value: '8.2',
            unit: '%',
            referenceRange: '<7.0',
            isAbnormal: true,
            isCritical: false,
            status: 'FINAL',
            resultDate: new Date(),
          },
        ],
      },
      diagnoses: {
        create: [
          {
            icd10Code: 'E11.9',
            description: 'Type 2 diabetes mellitus without complications',
            isPrimary: true,
            status: 'ACTIVE',
            diagnosedAt: new Date('2020-01-15'),
          },
          {
            icd10Code: 'I10',
            description: 'Essential (primary) hypertension',
            isPrimary: false,
            status: 'ACTIVE',
            diagnosedAt: new Date('2018-06-20'),
          },
          {
            icd10Code: 'I48.91',
            description: 'Unspecified atrial fibrillation',
            isPrimary: false,
            status: 'ACTIVE',
            diagnosedAt: new Date('2019-03-10'),
          },
        ],
      },
      allergies: {
        create: [
          {
            allergen: 'Penicillin',
            allergyType: 'MEDICATION',
            category: 'ANTIBIOTIC',
            severity: 'MODERATE',
            reactions: ['Rash'],
            createdBy: clinician.id,
          },
        ],
      },
    },
  });

  console.log('✅ Created complex patient case:', patient10.mrn);

  console.log('\n🎉 Seed data created successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Clinician: ${clinician.email}`);
  console.log(`   - Patients: 10 test cases`);
  console.log(`   - Drug Interaction: ${patient1.mrn}`);
  console.log(`   - Sepsis Risk: ${patient2.mrn}`);
  console.log(`   - Hypertension: ${patient3.mrn}`);
  console.log(`   - Critical Labs: ${patient4.mrn}`);
  console.log(`   - Polypharmacy: ${patient5.mrn}`);
  console.log(`   - Renal Dosing: ${patient6.mrn}`);
  console.log(`   - INR Out of Range: ${patient7.mrn}`);
  console.log(`   - Duplicate Therapy: ${patient8.mrn}`);
  console.log(`   - Healthy Control: ${patient9.mrn}`);
  console.log(`   - Complex Case: ${patient10.mrn}`);
  console.log('\n💡 Test these scenarios by calling GET /api/ai/insights');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
