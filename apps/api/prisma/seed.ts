import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo organization
  const demoOrg = await prisma.organization.upsert({
    where: { id: 'org_demo' },
    update: {},
    create: {
      id: 'org_demo',
      name: 'Demo Organization',
      type: 'CLINIC',
      status: 'ACTIVE',
      settings: {
        enableFhirSync: true,
        enableAuditMirror: true,
      },
    },
  });
  console.log('✅ Demo organization created:', demoOrg.id);

  // Create demo admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@holilabs.xyz' },
    update: {},
    create: {
      email: 'admin@holilabs.xyz',
      name: 'Admin User',
      role: 'ADMIN',
      orgId: demoOrg.id,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  // Create demo patient token
  const patientToken = await prisma.patientToken.upsert({
    where: { id: 'pt_demo_patient_001' },
    update: {},
    create: {
      id: 'pt_demo_patient_001',
      orgId: demoOrg.id,
      encryptedData: {
        personalInfo: {
          firstName: 'Demo',
          lastName: 'Patient',
          dateOfBirth: '1990-01-15',
        },
      },
      fhirPatientId: null,
      lastSyncedAt: null,
    },
  });
  console.log('✅ Demo patient token created:', patientToken.id);

  // Create demo consent
  const consent = await prisma.consent.upsert({
    where: {
      patientTokenId_type: {
        patientTokenId: patientToken.id,
        type: 'CARE',
      },
    },
    update: {},
    create: {
      patientTokenId: patientToken.id,
      type: 'CARE',
      status: 'ACTIVE',
      dataClasses: ['DEMOGRAPHICS', 'CLINICAL', 'OBSERVATIONS'],
      grantedAt: new Date(),
      grantedBy: adminUser.id,
    },
  });
  console.log('✅ Demo consent created:', consent.id);

  // Create demo encounter
  const encounter = await prisma.encounter.upsert({
    where: { id: 'enc_demo_001' },
    update: {},
    create: {
      id: 'enc_demo_001',
      patientTokenId: patientToken.id,
      type: 'AMBULATORY',
      status: 'FINISHED',
      startTime: new Date('2024-01-15T09:00:00Z'),
      endTime: new Date('2024-01-15T09:45:00Z'),
      fhirEncounterId: null,
      lastSyncedAt: null,
    },
  });
  console.log('✅ Demo encounter created:', encounter.id);

  // Create demo observations
  const observations = [
    {
      id: 'obs_demo_001',
      type: 'BLOOD_PRESSURE',
      value: '120/80',
      unit: 'mmHg',
      recordedAt: new Date('2024-01-15T09:15:00Z'),
    },
    {
      id: 'obs_demo_002',
      type: 'HEART_RATE',
      value: '72',
      unit: 'bpm',
      recordedAt: new Date('2024-01-15T09:15:00Z'),
    },
    {
      id: 'obs_demo_003',
      type: 'WEIGHT',
      value: '70',
      unit: 'kg',
      recordedAt: new Date('2024-01-15T09:15:00Z'),
    },
  ];

  for (const obs of observations) {
    const observation = await prisma.observation.upsert({
      where: { id: obs.id },
      update: {},
      create: {
        ...obs,
        patientTokenId: patientToken.id,
        encounterId: encounter.id,
        fhirObservationId: null,
        lastSyncedAt: null,
      },
    });
    console.log('✅ Demo observation created:', observation.id);
  }

  // Create demo audit event
  await prisma.auditEvent.create({
    data: {
      eventType: 'PATIENT_CREATED',
      actorId: adminUser.id,
      actorRole: 'ADMIN',
      resourceType: 'PatientToken',
      resourceId: patientToken.id,
      action: 'CREATE',
      outcome: 'SUCCESS',
      timestamp: new Date(),
      ipAddress: '127.0.0.1',
      userAgent: 'Seed Script',
      details: {
        source: 'database_seed',
        purpose: 'demo_data',
      },
      orgId: demoOrg.id,
      correlationId: 'seed_' + Date.now(),
    },
  });
  console.log('✅ Demo audit event created');

  console.log('');
  console.log('🎉 Database seed completed successfully!');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Organization: org_demo');
  console.log('  Admin Email: admin@holilabs.xyz');
  console.log('  Patient Token: pt_demo_patient_001');
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
