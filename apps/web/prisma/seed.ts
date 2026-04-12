import { PrismaClient, UserRole, AppointmentType, AppointmentStatus, ConfirmationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo database...');

  const passwordHash = await bcrypt.hash('HoliDemo2026!', 12);

  // 1. Create Login Accounts
  const admin = await prisma.user.upsert({
    where: { email: 'admin@holilabs.xyz' },
    update: { passwordHash },
    create: {
      email: 'admin@holilabs.xyz',
      firstName: 'Admin',
      lastName: 'Holi',
      role: UserRole.ADMIN,
      passwordHash,
      onboardingCompleted: true,
    },
  });

  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@holilabs.xyz' },
    update: { passwordHash },
    create: {
      email: 'doctor@holilabs.xyz',
      firstName: 'Demo',
      lastName: 'Doctor',
      role: UserRole.PHYSICIAN,
      specialty: 'Internal Medicine',
      passwordHash,
      onboardingCompleted: true,
    },
  });

  // 2. Create 3 Demo Providers
  const drAna = await prisma.user.upsert({
    where: { email: 'ana.santos@holilabs.xyz' },
    update: { passwordHash },
    create: {
      email: 'ana.santos@holilabs.xyz',
      firstName: 'Ana',
      lastName: 'Santos',
      role: UserRole.PHYSICIAN,
      specialty: 'Family Medicine',
      licenseNumber: 'CRM-SP-123456',
      passwordHash,
      onboardingCompleted: true,
    },
  });

  const drCarlos = await prisma.user.upsert({
    where: { email: 'carlos.garcia@holilabs.xyz' },
    update: { passwordHash },
    create: {
      email: 'carlos.garcia@holilabs.xyz',
      firstName: 'Carlos',
      lastName: 'Garcia',
      role: UserRole.PHYSICIAN,
      specialty: 'Cardiology',
      licenseNumber: 'CRM-RJ-654321',
      passwordHash,
      onboardingCompleted: true,
    },
  });

  const drMaria = await prisma.user.upsert({
    where: { email: 'maria.xavier@holilabs.xyz' },
    update: { passwordHash },
    create: {
      email: 'maria.xavier@holilabs.xyz',
      firstName: 'Maria',
      lastName: 'Xavier',
      role: UserRole.PHYSICIAN,
      specialty: 'Pediatrics',
      licenseNumber: 'CRM-MG-987654',
      passwordHash,
      onboardingCompleted: true,
    },
  });

  console.log('✅ Providers created');

  // 3. Create 15 Demo Patients
  const patientData = [
    { firstName: 'João', lastName: 'Silva', condition: 'Hypertension', dob: '1975-05-12', gender: 'M' },
    { firstName: 'Maria', lastName: 'Oliveira', condition: 'Diabetes Type 2', dob: '1968-09-22', gender: 'F' },
    { firstName: 'José', lastName: 'Santos', condition: 'Asthma', dob: '1982-11-30', gender: 'M' },
    { firstName: 'Ana', lastName: 'Souza', condition: 'Anxiety', dob: '1990-03-15', gender: 'F' },
    { firstName: 'Carlos', lastName: 'Ferreira', condition: 'Hyperlipidemia', dob: '1955-07-08', gender: 'M' },
    { firstName: 'Lucia', lastName: 'Pereira', condition: 'Arthritis', dob: '1960-12-01', gender: 'F' },
    { firstName: 'Ricardo', lastName: 'Alves', condition: 'GERD', dob: '1985-02-14', gender: 'M' },
    { firstName: 'Fernanda', lastName: 'Costa', condition: 'Hypothyroidism', dob: '1978-06-25', gender: 'F' },
    { firstName: 'Roberto', lastName: 'Lima', condition: 'Atrial Fibrillation', dob: '1950-10-10', gender: 'M' },
    { firstName: 'Camila', lastName: 'Sousa', condition: 'Migraine', dob: '1992-04-05', gender: 'F' },
    { firstName: 'Bruno', lastName: 'Rocha', condition: 'Allergic Rhinitis', dob: '1988-08-18', gender: 'M' },
    { firstName: 'Juliana', lastName: 'Martins', condition: 'Eczema', dob: '1995-01-20', gender: 'F' },
    { firstName: 'Paulo', lastName: 'Carvalho', condition: 'Obesity', dob: '1970-11-11', gender: 'M' },
    { firstName: 'Beatriz', lastName: 'Gomes', condition: 'Anemia', dob: '1983-05-30', gender: 'F' },
    { firstName: 'Gabriel', lastName: 'Rodrigues', condition: 'Insomnia', dob: '1980-07-07', gender: 'M' },
  ];

  const patients = [];
  for (const p of patientData) {
    const patient = await prisma.patient.upsert({
      where: { mrn: `MRN-${p.firstName.toUpperCase()}-${p.lastName.toUpperCase()}` },
      update: {},
      create: {
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: new Date(p.dob),
        gender: p.gender,
        mrn: `MRN-${p.firstName.toUpperCase()}-${p.lastName.toUpperCase()}`,
        tokenId: `PT-${p.firstName.toLowerCase()}-${p.lastName.toLowerCase()}`,
        country: 'BR',
        assignedClinicianId: drAna.id, // Assign to Dr. Ana by default
      },
    });
    patients.push(patient);
  }

  // Create patient login account for one of them
  const demoPatientUser = await prisma.patient.upsert({
    where: { mrn: 'MRN-PATIENT-DEMO' },
    update: {},
    create: {
      firstName: 'Demo',
      lastName: 'Patient',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'M',
      mrn: 'MRN-PATIENT-DEMO',
      tokenId: 'PT-patient-demo',
      country: 'BR',
      assignedClinicianId: drAna.id,
    }
  });

  await prisma.patientUser.upsert({
    where: { email: 'patient@holilabs.xyz' },
    update: { passwordHash },
    create: {
      email: 'patient@holilabs.xyz',
      patientId: demoPatientUser.id,
      passwordHash,
    },
  });

  console.log('✅ 15 Patients created');

  // 4. Create 5 Appointments for Today
  const today = new Date();
  today.setHours(9, 0, 0, 0);

  const clinicians = [drAna.id, drCarlos.id, drMaria.id];

  for (let i = 0; i < 5; i++) {
    const startTime = new Date(today);
    startTime.setHours(today.getHours() + i);
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + 30);

    await prisma.appointment.create({
      data: {
        title: `Consultation - ${patients[i].firstName}`,
        patientId: patients[i].id,
        clinicianId: clinicians[i % clinicians.length],
        startTime,
        endTime,
        status: AppointmentStatus.SCHEDULED,
        type: AppointmentType.IN_PERSON,
        confirmationStatus: ConfirmationStatus.CONFIRMED,
      },
    });
  }

  console.log('✅ 5 Appointments for today created');
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
