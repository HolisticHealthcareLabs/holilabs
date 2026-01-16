import { PrismaClient } from '@prisma/client';
import { generatePatientDataHash } from '../src/lib/blockchain/hashing';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const clinicianPasswordHash = await bcrypt.hash('Demo123!@#', 12);

  // Create test clinician
  const clinician = await prisma.user.upsert({
    where: { email: 'doctor@holilabs.com' },
    update: {
      passwordHash: clinicianPasswordHash,
    },
    create: {
      email: 'doctor@holilabs.com',
      firstName: 'Dr. Carlos',
      lastName: 'Ramírez',
      role: 'CLINICIAN',
      specialty: 'Cardiología',
      licenseNumber: '12345678',
      mfaEnabled: false,
      passwordHash: clinicianPasswordHash,
    },
  });

  console.log('✅ Created clinician:', clinician.email);

  // Create demo clinician (demo-clinician@holilabs.xyz / Demo123!@#)
  const demoClinician = await prisma.user.upsert({
    where: { email: 'demo-clinician@holilabs.xyz' },
    update: {
      passwordHash: clinicianPasswordHash,
    },
    create: {
      email: 'demo-clinician@holilabs.xyz',
      firstName: 'Demo',
      lastName: 'Clinician',
      role: 'CLINICIAN',
      specialty: 'Family Medicine',
      licenseNumber: 'DEMO-12345',
      npi: '1234567890',
      mfaEnabled: false,
      passwordHash: clinicianPasswordHash,
      permissions: ['READ_PATIENTS', 'WRITE_PATIENTS', 'READ_RECORDS', 'WRITE_RECORDS'],
    },
  });

  console.log('✅ Created demo clinician:', demoClinician.email);

  // Create test patient with blockchain-ready fields
  const patient = await prisma.patient.upsert({
    where: { mrn: 'MRN-2024-001' },
    update: {},
    create: {
      firstName: 'María',
      lastName: 'González García',
      dateOfBirth: new Date('1985-06-15'),
      gender: 'F',
      email: 'maria.gonzalez@example.com',
      phone: '+52 55 1234 5678',
      address: 'Av. Reforma 123, Col. Juárez',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '06600',
      country: 'MX',
      mrn: 'MRN-2024-001',
      tokenId: 'PT-892a-4f3e-b1c2',
      ageBand: '30-39',
      region: 'CDMX',
      assignedClinicianId: clinician.id,
      // Generate hash for blockchain verification
      dataHash: generatePatientDataHash({
        id: 'temp',
        firstName: 'María',
        lastName: 'González García',
        dateOfBirth: '1985-06-15',
        mrn: 'MRN-2024-001',
      }),
      lastHashUpdate: new Date(),
    },
  });

  console.log('✅ Created patient:', patient.tokenId);

  // Hash password for test patient account (Test123!@#)
  const testPasswordHash = await bcrypt.hash('Test123!@#', 12);

  // Create PatientUser for authentication (NEW - for patient portal login)
  const patientUser = await prisma.patientUser.upsert({
    where: { email: 'maria.gonzalez@example.com' },
    update: {},
    create: {
      email: 'maria.gonzalez@example.com',
      patientId: patient.id,
      passwordHash: testPasswordHash,
      emailVerifiedAt: new Date(),
      mfaEnabled: false,
    },
  });

  console.log('✅ Created patient user for login:', patientUser.email);

  // ============================================================================
  // CREATE DEMO ACCOUNT (demo@holilabs.xyz)
  // ============================================================================

  const demoPatient = await prisma.patient.upsert({
    where: { mrn: 'MRN-DEMO-2024' },
    update: {},
    create: {
      firstName: 'Demo',
      lastName: 'Paciente',
      dateOfBirth: new Date('1980-01-15'),
      gender: 'M',
      email: 'demo@holilabs.xyz',
      phone: '+52 55 9876 5432',
      address: 'Paseo de la Reforma 505, Cuauhtémoc',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '06500',
      country: 'MX',
      mrn: 'MRN-DEMO-2024',
      tokenId: 'PT-demo-2024-xyz',
      ageBand: '40-49',
      region: 'CDMX',
      assignedClinicianId: clinician.id,
      dataHash: generatePatientDataHash({
        id: 'temp-demo',
        firstName: 'Demo',
        lastName: 'Paciente',
        dateOfBirth: '1980-01-15',
        mrn: 'MRN-DEMO-2024',
      }),
      lastHashUpdate: new Date(),
    },
  });

  console.log('✅ Created demo patient:', demoPatient.tokenId);

  // Hash password for demo account (Demo123!@#)
  const demoPasswordHash = await bcrypt.hash('Demo123!@#', 12);

  // Create PatientUser for demo account
  const demoPatientUser = await prisma.patientUser.upsert({
    where: { email: 'demo@holilabs.xyz' },
    update: {},
    create: {
      email: 'demo@holilabs.xyz',
      patientId: demoPatient.id,
      passwordHash: demoPasswordHash,
      emailVerifiedAt: new Date(),
      mfaEnabled: false,
    },
  });

  console.log('✅ Created demo patient user:', demoPatientUser.email);

  // Create comprehensive medications for demo account
  const demoMedications = await prisma.medication.createMany({
    data: [
      {
        patientId: demoPatient.id,
        name: 'Lisinopril',
        genericName: 'Lisinopril',
        dose: '20mg',
        frequency: '1x/día',
        route: 'oral',
        instructions: 'Tomar en la mañana con agua',
        isActive: true,
        prescribedBy: clinician.id,
        startDate: new Date('2023-06-01'),
      },
      {
        patientId: demoPatient.id,
        name: 'Atorvastatina',
        genericName: 'Atorvastatin',
        dose: '40mg',
        frequency: '1x/día',
        route: 'oral',
        instructions: 'Tomar por la noche',
        isActive: true,
        prescribedBy: clinician.id,
        startDate: new Date('2023-06-01'),
      },
      {
        patientId: demoPatient.id,
        name: 'Metformina',
        genericName: 'Metformina HCl',
        dose: '850mg',
        frequency: '2x/día',
        route: 'oral',
        instructions: 'Tomar con alimentos para reducir efectos gastrointestinales',
        isActive: true,
        prescribedBy: clinician.id,
        startDate: new Date('2023-01-15'),
      },
      {
        patientId: demoPatient.id,
        name: 'Omeprazol',
        genericName: 'Omeprazole',
        dose: '20mg',
        frequency: '1x/día',
        route: 'oral',
        instructions: 'Tomar 30 minutos antes del desayuno',
        isActive: true,
        prescribedBy: clinician.id,
        startDate: new Date('2023-09-10'),
      },
      {
        patientId: demoPatient.id,
        name: 'Aspirina',
        genericName: 'Ácido acetilsalicílico',
        dose: '100mg',
        frequency: '1x/día',
        route: 'oral',
        instructions: 'Tomar con alimentos',
        isActive: true,
        prescribedBy: clinician.id,
        startDate: new Date('2023-06-01'),
      },
      {
        patientId: demoPatient.id,
        name: 'Vitamina D3',
        genericName: 'Colecalciferol',
        dose: '2000 IU',
        frequency: '1x/día',
        route: 'oral',
        instructions: 'Tomar con comida que contenga grasa',
        isActive: true,
        prescribedBy: clinician.id,
        startDate: new Date('2023-11-01'),
      },
    ],
  });

  console.log('✅ Created demo medications:', demoMedications.count);

  // Create appointments for demo account (past, today, and future)
  const now = new Date();
  const demoAppointments = await prisma.appointment.createMany({
    data: [
      // Past appointment
      {
        patientId: demoPatient.id,
        clinicianId: clinician.id,
        title: 'Consulta de Seguimiento',
        description: 'Revisión de presión arterial y resultados de laboratorio',
        startTime: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endTime: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        type: 'IN_PERSON',
        status: 'COMPLETED',
      },
      // Upcoming appointment
      {
        patientId: demoPatient.id,
        clinicianId: clinician.id,
        title: 'Control Trimestral',
        description: 'Revisión de diabetes, presión arterial y colesterol',
        startTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        endTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        type: 'IN_PERSON',
        status: 'SCHEDULED',
      },
      // Future appointment
      {
        patientId: demoPatient.id,
        clinicianId: clinician.id,
        title: 'Consulta de Nutrición',
        description: 'Evaluación dietética y plan alimenticio para diabetes',
        startTime: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
        endTime: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        type: 'TELEHEALTH',
        status: 'SCHEDULED',
      },
    ],
  });

  console.log('✅ Created demo appointments:', demoAppointments.count);

  // Create medications for existing patient
  const medications = await prisma.medication.createMany({
    data: [
      {
        patientId: patient.id,
        name: 'Metformina',
        genericName: 'Metformina HCl',
        dose: '500mg',
        frequency: '2x/día',
        route: 'oral',
        instructions: 'Tomar con alimentos',
        isActive: true,
        prescribedBy: clinician.id,
      },
      {
        patientId: patient.id,
        name: 'Enalapril',
        genericName: 'Enalapril maleato',
        dose: '10mg',
        frequency: '1x/día',
        route: 'oral',
        instructions: 'Tomar en la mañana',
        isActive: true,
        prescribedBy: clinician.id,
      },
    ],
  });

  console.log('✅ Created medications:', medications.count);

  // Create a test appointment
  const appointment = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      clinicianId: clinician.id,
      title: 'Control de Diabetes',
      description: 'Revisión de glucosa y ajuste de medicación',
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 30 min duration
      type: 'IN_PERSON',
      status: 'SCHEDULED',
    },
  });

  console.log('✅ Created appointment:', appointment.id);

  // Create audit log
  const auditLog = await prisma.auditLog.create({
    data: {
      userId: clinician.id,
      userEmail: clinician.email,
      ipAddress: '127.0.0.1',
      action: 'CREATE',
      resource: 'Patient',
      resourceId: patient.id,
      success: true,
    },
  });

  console.log('✅ Created audit log:', auditLog.id);

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - 1 Clinician (${clinician.email})`);
  console.log(`   - 2 Patients (${patient.tokenId}, ${demoPatient.tokenId})`);
  console.log(`   - 2 Patient Users (${patientUser.email}, ${demoPatientUser.email})`);
  console.log(`   - 8 Medications (6 for demo account, 2 for test patient)`);
  console.log(`   - 4 Appointments (3 for demo account, 1 for test patient)`);
  console.log(`   - 1 Audit Log`);
  console.log('\n💡 Test the app:');
  console.log(`   - Clinician Dashboard: http://localhost:3000/dashboard/patients/${patient.id}`);
  console.log(`   - Patient Portal Login: http://localhost:3000/portal/login`);
  console.log(`\n🎭 Demo Account (Public Access):`);
  console.log(`   - Email: ${demoPatientUser.email}`);
  console.log(`   - Portal: http://localhost:3000/portal/login`);
  console.log(`   - Features: 6 medications, 3 appointments, comprehensive medical history`);
  console.log(`\n🔬 Test Account:`);
  console.log(`   - Email: ${patientUser.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
