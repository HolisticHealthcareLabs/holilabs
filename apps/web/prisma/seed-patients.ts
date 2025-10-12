import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Medical data banks
const CHRONIC_CONDITIONS = [
  'Type 2 Diabetes Mellitus',
  'Essential Hypertension',
  'Asthma',
  'Hyperlipidemia',
  'Osteoarthritis',
  'Chronic Kidney Disease Stage 3',
  'Hypothyroidism',
  'Gastroesophageal Reflux Disease',
  'Chronic Obstructive Pulmonary Disease',
  'Anxiety Disorder',
  'Major Depressive Disorder',
  'Migraine',
];

const COMMON_ALLERGIES = [
  'Penicillin - Rash',
  'Sulfa drugs - Hives',
  'Shellfish - Anaphylaxis',
  'Peanuts - Throat swelling',
  'Latex - Contact dermatitis',
  'Bee stings - Anaphylaxis',
  'Ibuprofen - Stomach upset',
  'Codeine - Nausea',
  'Aspirin - Breathing difficulty',
];

const COMMON_MEDICATIONS = [
  { name: 'Metformin', dosage: '500mg', frequency: 'twice daily with meals' },
  { name: 'Lisinopril', dosage: '10mg', frequency: 'once daily' },
  { name: 'Atorvastatin', dosage: '20mg', frequency: 'once daily at bedtime' },
  { name: 'Levothyroxine', dosage: '75mcg', frequency: 'once daily before breakfast' },
  { name: 'Omeprazole', dosage: '20mg', frequency: 'once daily before breakfast' },
  { name: 'Albuterol inhaler', dosage: '90mcg', frequency: 'as needed for wheezing' },
  { name: 'Sertraline', dosage: '50mg', frequency: 'once daily' },
  { name: 'Amlodipine', dosage: '5mg', frequency: 'once daily' },
  { name: 'Gabapentin', dosage: '300mg', frequency: 'three times daily' },
  { name: 'Aspirin', dosage: '81mg', frequency: 'once daily' },
];

const VISIT_REASONS = [
  'Annual physical examination',
  'Follow-up for chronic condition management',
  'Acute upper respiratory infection',
  'Blood pressure check',
  'Medication refill',
  'Lab results review',
  'Preventive care and health maintenance',
  'Joint pain evaluation',
];

// Locale-specific name banks
const NAMES = {
  en: {
    male: ['James', 'John', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Daniel'],
    female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'],
    surnames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'],
  },
  es: {
    male: ['José', 'Luis', 'Carlos', 'Juan', 'Miguel', 'Pedro', 'Francisco', 'Antonio', 'Manuel', 'Alejandro'],
    female: ['María', 'Carmen', 'Ana', 'Isabel', 'Lucía', 'Rosa', 'Teresa', 'Gabriela', 'Sofía', 'Elena'],
    surnames: ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Hernández'],
  },
  pt: {
    male: ['João', 'José', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Miguel', 'Rafael', 'Daniel', 'Bruno'],
    female: ['Maria', 'Ana', 'Beatriz', 'Sofia', 'Julia', 'Laura', 'Camila', 'Gabriela', 'Isabela', 'Mariana'],
    surnames: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Costa'],
  },
};

// Helper functions
function generateMRN(): string {
  return `PT-${faker.string.alphanumeric(4)}-${faker.string.alphanumeric(4)}-${faker.string.alphanumeric(4)}`.toUpperCase();
}

function generateDataHash(patientData: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(patientData)).digest('hex');
}

function selectRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function selectMultipleRandom<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Main patient generator
async function generatePatient(locale: 'en' | 'es' | 'pt', clinicianId: string, index: number) {
  const gender = Math.random() > 0.5 ? 'M' : 'F';
  const nameList = gender === 'M' ? NAMES[locale].male : NAMES[locale].female;
  const firstName = selectRandom(nameList);
  const lastName = selectRandom(NAMES[locale].surnames);
  const fullName = `${firstName} ${lastName}`;

  // Age distribution: 20% pediatric (0-17), 60% adult (18-64), 20% elderly (65+)
  let age: number;
  const ageCategory = Math.random();
  if (ageCategory < 0.2) {
    age = faker.number.int({ min: 1, max: 17 }); // Pediatric
  } else if (ageCategory < 0.8) {
    age = faker.number.int({ min: 18, max: 64 }); // Adult
  } else {
    age = faker.number.int({ min: 65, max: 88 }); // Elderly
  }

  const dateOfBirth = new Date();
  dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);

  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${index}@example.com`;
  const phone = faker.phone.number('###-###-####');
  const mrn = generateMRN();
  const tokenId = `PT-${faker.string.alphanumeric(4)}-${faker.string.alphanumeric(4)}-${faker.string.alphanumeric(4)}`.toLowerCase();

  // Generate medical history based on age
  const conditions: string[] = [];
  const medications: Array<{ name: string; dosage: string; frequency: string }> = [];
  
  if (age >= 40) {
    // Adults more likely to have chronic conditions
    const conditionCount = faker.number.int({ min: 0, max: 3 });
    const selectedConditions = selectMultipleRandom(CHRONIC_CONDITIONS, conditionCount);
    conditions.push(...selectedConditions);

    // Add medications for conditions
    if (conditions.includes('Type 2 Diabetes Mellitus')) {
      medications.push(COMMON_MEDICATIONS[0]); // Metformin
    }
    if (conditions.includes('Essential Hypertension')) {
      medications.push(COMMON_MEDICATIONS[1]); // Lisinopril
      medications.push(COMMON_MEDICATIONS[7]); // Amlodipine
    }
    if (conditions.includes('Hyperlipidemia')) {
      medications.push(COMMON_MEDICATIONS[2]); // Atorvastatin
    }
    if (conditions.includes('Hypothyroidism')) {
      medications.push(COMMON_MEDICATIONS[3]); // Levothyroxine
    }
    if (conditions.includes('Gastroesophageal Reflux Disease')) {
      medications.push(COMMON_MEDICATIONS[4]); // Omeprazole
    }
    if (conditions.includes('Asthma') || conditions.includes('Chronic Obstructive Pulmonary Disease')) {
      medications.push(COMMON_MEDICATIONS[5]); // Albuterol
    }
    if (conditions.includes('Anxiety Disorder') || conditions.includes('Major Depressive Disorder')) {
      medications.push(COMMON_MEDICATIONS[6]); // Sertraline
    }
  }

  // Allergies (40% of patients have at least one)
  const allergies: string[] = [];
  if (Math.random() < 0.4) {
    const allergyCount = faker.number.int({ min: 1, max: 2 });
    allergies.push(...selectMultipleRandom(COMMON_ALLERGIES, allergyCount));
  }

  const patientData = {
    fullName,
    dateOfBirth,
    gender,
    email,
    phone,
    mrn,
    conditions,
    medications,
    allergies,
  };

  const dataHash = generateDataHash(patientData);

  // Create patient
  const patient = await prisma.patient.create({
    data: {
      mrn,
      tokenId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      postalCode: faker.location.zipCode(),
      dataHash,
      isActive: true,
    },
  });

  console.log(`✅ Created patient ${index + 1}/30: ${fullName} (${locale.toUpperCase()}, ${age}yo)`);

  // Create medications
  for (const med of medications) {
    await prisma.medication.create({
      data: {
        patientId: patient.id,
        name: med.name,
        dose: med.dosage,
        frequency: med.frequency,
        prescribedBy: clinicianId,
        startDate: faker.date.past({ years: 2 }),
        isActive: true,
      },
    });
  }

  // Create consent record
  const consentData = {
    patientId: patient.id,
    type: 'GENERAL_CONSULTATION',
    title: 'General Medical Treatment Consent',
    content: 'I consent to medical treatment and care as deemed necessary by my healthcare provider.',
  };
  await prisma.consent.create({
    data: {
      ...consentData,
      consentHash: generateDataHash(consentData),
      signatureData: `${fullName}`,
      signedAt: new Date(),
      isActive: true,
    },
  });

  // 60% chance of having an upcoming or recent appointment
  if (Math.random() < 0.6) {
    const appointmentDate = faker.date.soon({ days: 14 });
    const visitReason = selectRandom(VISIT_REASONS);
    const endTime = new Date(appointmentDate);
    endTime.setMinutes(endTime.getMinutes() + 30);

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        clinicianId,
        title: visitReason,
        startTime: appointmentDate,
        endTime,
        status: appointmentDate > new Date() ? 'SCHEDULED' : 'COMPLETED',
        description: appointmentDate > new Date() ? null : 'Patient doing well. Continue current treatment plan.',
      },
    });
  }

  // Create patient user for portal access
  await prisma.patientUser.create({
    data: {
      email,
      phone,
      patientId: patient.id,
    },
  });

  return patient;
}

// Main execution
async function main() {
  console.log('🌱 Seeding synthetic patient data...\n');

  // Find first clinician
  const clinician = await prisma.user.findFirst({
    where: { role: 'CLINICIAN' },
  });

  if (!clinician) {
    console.error('❌ No clinician found. Please run the main seed first.');
    process.exit(1);
  }

  console.log(`📋 Using clinician: ${clinician.email}\n`);

  // Distribution: 10 English, 15 Spanish, 5 Portuguese
  let patientIndex = 0;

  // English patients (10)
  console.log('🇺🇸 Creating English-speaking patients...');
  for (let i = 0; i < 10; i++) {
    await generatePatient('en', clinician.id, patientIndex++);
  }

  // Spanish patients (15)
  console.log('\n🇲🇽 Creating Spanish-speaking patients...');
  for (let i = 0; i < 15; i++) {
    await generatePatient('es', clinician.id, patientIndex++);
  }

  // Portuguese patients (5)
  console.log('\n🇧🇷 Creating Portuguese-speaking patients...');
  for (let i = 0; i < 5; i++) {
    await generatePatient('pt', clinician.id, patientIndex++);
  }

  console.log('\n✅ Successfully created 30 synthetic patients!');
  console.log('   - 10 English-speaking');
  console.log('   - 15 Spanish-speaking');
  console.log('   - 5 Portuguese-speaking');
  console.log('\n📊 Patients have realistic:');
  console.log('   - Medical histories');
  console.log('   - Medications');
  console.log('   - Allergies');
  console.log('   - Appointments');
  console.log('   - Consent records');
  console.log('   - Portal access credentials');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding patients:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
