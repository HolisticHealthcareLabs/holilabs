/**
 * Seed Script - Generate 10 Synthetic Patients
 * For demo purposes only
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYNTHETIC_PATIENTS = [
  {
    firstName: 'María',
    lastName: 'González López',
    dateOfBirth: new Date('1985-03-15'),
    gender: 'Femenino',
    email: 'maria.gonzalez@example.com',
    phone: '+52 55 1234 5678',
    address: 'Av. Paseo de la Reforma 123',
    city: 'Ciudad de México',
    state: 'CDMX',
    postalCode: '06500',
    country: 'MX',
  },
  {
    firstName: 'Juan',
    lastName: 'Rodríguez Martínez',
    dateOfBirth: new Date('1978-07-22'),
    gender: 'Masculino',
    email: 'juan.rodriguez@example.com',
    phone: '+52 33 2345 6789',
    address: 'Av. Chapultepec 456',
    city: 'Guadalajara',
    state: 'Jalisco',
    postalCode: '44100',
    country: 'MX',
  },
  {
    firstName: 'Ana',
    lastName: 'Hernández Silva',
    dateOfBirth: new Date('1992-11-08'),
    gender: 'Femenino',
    email: 'ana.hernandez@example.com',
    phone: '+52 81 3456 7890',
    address: 'Av. Constitución 789',
    city: 'Monterrey',
    state: 'Nuevo León',
    postalCode: '64000',
    country: 'MX',
  },
  {
    firstName: 'Carlos',
    lastName: 'López Ramírez',
    dateOfBirth: new Date('1965-05-30'),
    gender: 'Masculino',
    email: 'carlos.lopez@example.com',
    phone: '+52 55 4567 8901',
    address: 'Calle Insurgentes 234',
    city: 'Ciudad de México',
    state: 'CDMX',
    postalCode: '03100',
    country: 'MX',
  },
  {
    firstName: 'Laura',
    lastName: 'Martínez Pérez',
    dateOfBirth: new Date('1988-09-12'),
    gender: 'Femenino',
    email: 'laura.martinez@example.com',
    phone: '+52 55 5678 9012',
    address: 'Av. Universidad 567',
    city: 'Ciudad de México',
    state: 'CDMX',
    postalCode: '04510',
    country: 'MX',
  },
  {
    firstName: 'Miguel',
    lastName: 'García Torres',
    dateOfBirth: new Date('1995-01-25'),
    gender: 'Masculino',
    email: 'miguel.garcia@example.com',
    phone: '+52 33 6789 0123',
    address: 'Av. Américas 890',
    city: 'Guadalajara',
    state: 'Jalisco',
    postalCode: '44630',
    country: 'MX',
  },
  {
    firstName: 'Sofia',
    lastName: 'Sánchez Morales',
    dateOfBirth: new Date('1982-04-18'),
    gender: 'Femenino',
    email: 'sofia.sanchez@example.com',
    phone: '+52 81 7890 1234',
    address: 'Av. San Pedro 345',
    city: 'Monterrey',
    state: 'Nuevo León',
    postalCode: '66230',
    country: 'MX',
  },
  {
    firstName: 'Diego',
    lastName: 'Fernández Castro',
    dateOfBirth: new Date('1970-12-03'),
    gender: 'Masculino',
    email: 'diego.fernandez@example.com',
    phone: '+52 55 8901 2345',
    address: 'Av. Revolución 678',
    city: 'Ciudad de México',
    state: 'CDMX',
    postalCode: '01030',
    country: 'MX',
  },
  {
    firstName: 'Valentina',
    lastName: 'Jiménez Ruiz',
    dateOfBirth: new Date('1998-06-14'),
    gender: 'Femenino',
    email: 'valentina.jimenez@example.com',
    phone: '+52 33 9012 3456',
    address: 'Av. Patria 901',
    city: 'Guadalajara',
    state: 'Jalisco',
    postalCode: '45030',
    country: 'MX',
  },
  {
    firstName: 'Roberto',
    lastName: 'Díaz Vargas',
    dateOfBirth: new Date('1975-08-27'),
    gender: 'Masculino',
    email: 'roberto.diaz@example.com',
    phone: '+52 81 0123 4567',
    address: 'Av. Garza Sada 123',
    city: 'Monterrey',
    state: 'Nuevo León',
    postalCode: '64849',
    country: 'MX',
  },
];

function generateMRN(): string {
  // Generate unique MRN like MRN-2024-001234
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `MRN-${year}-${random}`;
}

function generateTokenId(): string {
  // Generate token like PT-a1b2-c3d4-e5f6
  const chars = '0123456789abcdef';
  const segments = [4, 4, 4];
  return 'PT-' + segments.map(len => {
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }).join('-');
}

function getAgeBand(dateOfBirth: Date): string {
  const today = new Date();
  const age = today.getFullYear() - dateOfBirth.getFullYear();
  const decade = Math.floor(age / 10) * 10;
  return `${decade}-${decade + 9}`;
}

function getRegion(state: string): string {
  const regionMap: Record<string, string> = {
    'CDMX': 'CDMX',
    'Jalisco': 'JAL',
    'Nuevo León': 'NL',
  };
  return regionMap[state] || 'MX';
}

async function main() {
  console.log('🌱 Seeding database with 10 synthetic patients...\n');

  // Get the first clinician to assign patients to
  const clinician = await prisma.user.findFirst({
    where: { role: 'CLINICIAN' },
  });

  if (!clinician) {
    console.log('⚠️  No clinician found. Please create a clinician user first.');
    return;
  }

  console.log(`✅ Found clinician: ${clinician.firstName} ${clinician.lastName} (${clinician.email})\n`);

  for (let i = 0; i < SYNTHETIC_PATIENTS.length; i++) {
    const patientData = SYNTHETIC_PATIENTS[i];
    const mrn = generateMRN();
    const tokenId = generateTokenId();
    const ageBand = getAgeBand(patientData.dateOfBirth);
    const region = getRegion(patientData.state);

    try {
      const patient = await prisma.patient.create({
        data: {
          ...patientData,
          mrn,
          tokenId,
          ageBand,
          region,
          assignedClinicianId: clinician.id,
          isActive: true,
        },
      });

      console.log(`✅ Created patient ${i + 1}/10: ${patient.firstName} ${patient.lastName}`);
      console.log(`   MRN: ${patient.mrn} | Token: ${patient.tokenId}`);
      console.log(`   Age Band: ${patient.ageBand} | Region: ${patient.region}\n`);

      // Create a sample medication for some patients
      if (i % 3 === 0) {
        const medications = [
          { name: 'Metformina', dose: '850mg', frequency: '2x/día', route: 'oral' },
          { name: 'Losartán', dose: '50mg', frequency: '1x/día', route: 'oral' },
          { name: 'Atorvastatina', dose: '20mg', frequency: '1x/día en la noche', route: 'oral' },
        ];

        const med = medications[Math.floor(Math.random() * medications.length)];

        await prisma.medication.create({
          data: {
            patientId: patient.id,
            name: med.name,
            dose: med.dose,
            frequency: med.frequency,
            route: med.route,
            instructions: 'Tomar con alimentos',
            prescribedBy: clinician.email,
            isActive: true,
          },
        });

        console.log(`   💊 Added medication: ${med.name}\n`);
      }

      // Create upcoming appointments for some patients
      if (i % 2 === 0) {
        const daysAhead = Math.floor(Math.random() * 30) + 1;
        const appointmentDate = new Date();
        appointmentDate.setDate(appointmentDate.getDate() + daysAhead);
        appointmentDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

        const endTime = new Date(appointmentDate);
        endTime.setMinutes(endTime.getMinutes() + 30);

        await prisma.appointment.create({
          data: {
            patientId: patient.id,
            clinicianId: clinician.id,
            title: 'Consulta de seguimiento',
            description: 'Revisión de resultados de laboratorio y ajuste de tratamiento',
            startTime: appointmentDate,
            endTime: endTime,
            timezone: 'America/Mexico_City',
            type: Math.random() > 0.5 ? 'IN_PERSON' : 'TELEHEALTH',
            status: 'SCHEDULED',
          },
        });

        console.log(`   📅 Created appointment: ${appointmentDate.toLocaleDateString('es-MX')}\n`);
      }
    } catch (error: any) {
      console.error(`❌ Error creating patient ${i + 1}:`, error.message);
    }
  }

  console.log('\n🎉 Successfully seeded 10 synthetic patients!\n');
  console.log('📊 Summary:');
  const patientCount = await prisma.patient.count();
  const medicationCount = await prisma.medication.count();
  const appointmentCount = await prisma.appointment.count();

  console.log(`   Patients: ${patientCount}`);
  console.log(`   Medications: ${medicationCount}`);
  console.log(`   Appointments: ${appointmentCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
