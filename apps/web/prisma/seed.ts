import { PrismaClient } from '@prisma/client';
import { generatePatientDataHash } from '../src/lib/blockchain/hashing';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function prescriptionHash(tag: string): string {
  return crypto.createHash('sha256').update(`demo-seed:${tag}`).digest('hex');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database (idempotent)...');

  const clinicianPasswordHash = await bcrypt.hash('Demo123!@#', 12);

  // ══════════════════════════════════════════════════════════════════════════
  // USERS
  // ══════════════════════════════════════════════════════════════════════════

  const clinician = await prisma.user.upsert({
    where: { email: 'doctor@holilabs.com' },
    update: { passwordHash: clinicianPasswordHash },
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
  console.log('✅ Clinician:', clinician.email);

  const demoClinician = await prisma.user.upsert({
    where: { email: 'demo-clinician@holilabs.xyz' },
    update: { passwordHash: clinicianPasswordHash },
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
  console.log('✅ Demo clinician:', demoClinician.email);

  const drSilvaPasswordHash = await bcrypt.hash('Cortex2026!', 12);
  const drSilva = await prisma.user.upsert({
    where: { email: 'dr.silva@holilabs.xyz' },
    update: {
      id: 'demo-dr-silva-id',
      passwordHash: drSilvaPasswordHash,
      firstName: 'Ricardo',
      lastName: 'Silva',
      role: 'CLINICIAN',
      onboardingCompleted: true,
    },
    create: {
      id: 'demo-dr-silva-id',
      email: 'dr.silva@holilabs.xyz',
      firstName: 'Ricardo',
      lastName: 'Silva',
      role: 'CLINICIAN',
      specialty: 'Internal Medicine',
      licenseNumber: 'CRM-SP-123456',
      username: 'dr.silva',
      onboardingCompleted: true,
      mfaEnabled: false,
      passwordHash: drSilvaPasswordHash,
      permissions: ['READ_PATIENTS', 'WRITE_PATIENTS', 'READ_RECORDS', 'WRITE_RECORDS'],
    },
  });
  console.log('✅ Dr. Silva:', drSilva.email);

  // Workspace
  const drSilvaWorkspace = await prisma.workspace.upsert({
    where: { slug: 'demo-hospital-silva' },
    update: {},
    create: {
      name: 'Hospital Demo Silva',
      slug: 'demo-hospital-silva',
      createdByUserId: drSilva.id,
      metadata: { plan: 'demo', region: 'BR' },
    },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: drSilvaWorkspace.id, userId: drSilva.id } },
    update: {},
    create: { workspaceId: drSilvaWorkspace.id, userId: drSilva.id, role: 'OWNER' },
  });
  console.log('✅ Workspace:', drSilvaWorkspace.slug);

  // ══════════════════════════════════════════════════════════════════════════
  // BASE PATIENTS
  // ══════════════════════════════════════════════════════════════════════════

  const silvaDemoPatient = await prisma.patient.upsert({
    where: { mrn: 'MRN-DEMO-SILVA-001' },
    update: {},
    create: {
      firstName: 'Fernanda',
      lastName: 'Costa Oliveira',
      dateOfBirth: new Date('1968-03-22'),
      gender: 'F',
      email: 'fernanda.costa@example.com',
      phone: '+55 11 9876 5432',
      address: 'Rua Augusta 1200, Consolação',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01304-001',
      country: 'BR',
      mrn: 'MRN-DEMO-SILVA-001',
      tokenId: 'PT-silva-demo-001',
      ageBand: '50-59',
      region: 'SP',
      assignedClinicianId: drSilva.id,
      dataHash: generatePatientDataHash({ id: 'silva-demo-001', firstName: 'Fernanda', lastName: 'Costa Oliveira', dateOfBirth: '1968-03-22', mrn: 'MRN-DEMO-SILVA-001' }),
      lastHashUpdate: new Date(),
    },
  });

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
      dataHash: generatePatientDataHash({ id: 'temp', firstName: 'María', lastName: 'González García', dateOfBirth: '1985-06-15', mrn: 'MRN-2024-001' }),
      lastHashUpdate: new Date(),
    },
  });

  await prisma.patientUser.upsert({
    where: { email: 'maria.gonzalez@example.com' },
    update: {},
    create: { email: 'maria.gonzalez@example.com', patientId: patient.id, emailVerifiedAt: new Date(), mfaEnabled: false },
  });

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
      dataHash: generatePatientDataHash({ id: 'temp-demo', firstName: 'Demo', lastName: 'Paciente', dateOfBirth: '1980-01-15', mrn: 'MRN-DEMO-2024' }),
      lastHashUpdate: new Date(),
    },
  });

  await prisma.patientUser.upsert({
    where: { email: 'demo@holilabs.xyz' },
    update: {},
    create: { email: 'demo@holilabs.xyz', patientId: demoPatient.id, emailVerifiedAt: new Date(), mfaEnabled: false },
  });

  // ── Medications (idempotent: delete-then-create keyed on patientId) ────────

  await prisma.medication.deleteMany({ where: { patientId: demoPatient.id } });
  await prisma.medication.createMany({
    data: [
      { patientId: demoPatient.id, name: 'Lisinopril', genericName: 'Lisinopril', dose: '20mg', frequency: '1x/día', route: 'oral', instructions: 'Tomar en la mañana con agua', isActive: true, prescribedBy: clinician.id, startDate: new Date('2023-06-01') },
      { patientId: demoPatient.id, name: 'Atorvastatina', genericName: 'Atorvastatin', dose: '40mg', frequency: '1x/día', route: 'oral', instructions: 'Tomar por la noche', isActive: true, prescribedBy: clinician.id, startDate: new Date('2023-06-01') },
      { patientId: demoPatient.id, name: 'Metformina', genericName: 'Metformina HCl', dose: '850mg', frequency: '2x/día', route: 'oral', instructions: 'Tomar con alimentos para reducir efectos gastrointestinales', isActive: true, prescribedBy: clinician.id, startDate: new Date('2023-01-15') },
      { patientId: demoPatient.id, name: 'Omeprazol', genericName: 'Omeprazole', dose: '20mg', frequency: '1x/día', route: 'oral', instructions: 'Tomar 30 minutos antes del desayuno', isActive: true, prescribedBy: clinician.id, startDate: new Date('2023-09-10') },
      { patientId: demoPatient.id, name: 'Aspirina', genericName: 'Ácido acetilsalicílico', dose: '100mg', frequency: '1x/día', route: 'oral', instructions: 'Tomar con alimentos', isActive: true, prescribedBy: clinician.id, startDate: new Date('2023-06-01') },
      { patientId: demoPatient.id, name: 'Vitamina D3', genericName: 'Colecalciferol', dose: '2000 IU', frequency: '1x/día', route: 'oral', instructions: 'Tomar con comida que contenga grasa', isActive: true, prescribedBy: clinician.id, startDate: new Date('2023-11-01') },
    ],
  });

  await prisma.medication.deleteMany({ where: { patientId: patient.id } });
  await prisma.medication.createMany({
    data: [
      { patientId: patient.id, name: 'Metformina', genericName: 'Metformina HCl', dose: '500mg', frequency: '2x/día', route: 'oral', instructions: 'Tomar con alimentos', isActive: true, prescribedBy: clinician.id },
      { patientId: patient.id, name: 'Enalapril', genericName: 'Enalapril maleato', dose: '10mg', frequency: '1x/día', route: 'oral', instructions: 'Tomar en la mañana', isActive: true, prescribedBy: clinician.id },
    ],
  });

  // ── Appointments (idempotent: delete-then-create keyed on patientId) ───────

  await prisma.appointment.deleteMany({ where: { patientId: demoPatient.id } });
  const now = new Date();
  await prisma.appointment.createMany({
    data: [
      { patientId: demoPatient.id, clinicianId: clinician.id, title: 'Consulta de Seguimiento', description: 'Revisión de presión arterial y resultados de laboratorio', startTime: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), endTime: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), type: 'IN_PERSON', status: 'COMPLETED' },
      { patientId: demoPatient.id, clinicianId: clinician.id, title: 'Control Trimestral', description: 'Revisión de diabetes, presión arterial y colesterol', startTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), endTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), type: 'IN_PERSON', status: 'SCHEDULED' },
      { patientId: demoPatient.id, clinicianId: clinician.id, title: 'Consulta de Nutrición', description: 'Evaluación dietética y plan alimenticio para diabetes', startTime: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000), endTime: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), type: 'TELEHEALTH', status: 'SCHEDULED' },
    ],
  });

  await prisma.appointment.deleteMany({ where: { patientId: patient.id } });
  await prisma.appointment.create({
    data: { patientId: patient.id, clinicianId: clinician.id, title: 'Control de Diabetes', description: 'Revisión de glucosa y ajuste de medicación', startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), type: 'IN_PERSON', status: 'SCHEDULED' },
  });

  console.log('✅ Base patients, medications, appointments seeded');

  // ══════════════════════════════════════════════════════════════════════════
  // BILLING GUARDRAILS DEMO PATIENTS
  // FIN-001: ICD-10 mismatch | FIN-002: TUSS hallucination | FIN-003: Qty limit
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📋 Seeding Glosa-Prevention demo patients...');

  // ── FIN-001: Isabel Santos — Diabetes (E11.9) will be incorrectly prescribed Apixaban ──

  const fin001 = await prisma.patient.upsert({
    where: { mrn: 'GLOSA-FIN001-SP' },
    update: {},
    create: {
      firstName: 'Isabel',
      lastName: 'Fernanda Santos',
      dateOfBirth: new Date('1955-08-14'),
      gender: 'F',
      email: 'isabel.santos.fin001@holilabs-demo.com',
      phone: '+55 11 98765 0001',
      address: 'Av. Paulista 2100, Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01310-100',
      country: 'BR',
      mrn: 'GLOSA-FIN001-SP',
      tokenId: 'PT-glosa-fin001-sp',
      ageBand: '55-64',
      region: 'SP',
      assignedClinicianId: drSilva.id,
      dataHash: generatePatientDataHash({ id: 'glosa-fin001', firstName: 'Isabel', lastName: 'Fernanda Santos', dateOfBirth: '1955-08-14', mrn: 'GLOSA-FIN001-SP' }),
      lastHashUpdate: new Date(),
    },
  });

  // Existing medications: Metformin (correct for diabetes) — delete-then-create
  await prisma.medication.deleteMany({ where: { patientId: fin001.id } });
  await prisma.medication.createMany({
    data: [
      { patientId: fin001.id, name: 'Metformina', genericName: 'Metformin HCl', dose: '850mg', frequency: '2x/dia', route: 'oral', instructions: 'Tomar com refeições', isActive: true, prescribedBy: drSilva.id, startDate: new Date('2022-01-10') },
      { patientId: fin001.id, name: 'Lisinopril', genericName: 'Lisinopril', dose: '10mg', frequency: '1x/dia', route: 'oral', instructions: 'Tomar pela manhã', isActive: true, prescribedBy: drSilva.id, startDate: new Date('2022-03-15') },
    ],
  });

  // Active encounter: chief complaint is glycemia — ICD-10 E11.9
  await prisma.clinicalEncounter.deleteMany({ where: { patientId: fin001.id } });
  await prisma.clinicalEncounter.create({
    data: {
      id: 'ENC-GLOSA-FIN001-DEMO',
      patientId: fin001.id,
      providerId: drSilva.id,
      scheduledAt: new Date(),
      startedAt: new Date(),
      status: 'IN_PROGRESS',
      chiefComplaint: 'Controle de glicemia — HbA1c elevada (9.2%). Avaliar ajuste de medicação.',
    },
  });

  // Staged prescription: Apixaban for E11.9 → FIN-001 will fire on safety-check
  await prisma.prescription.upsert({
    where: { prescriptionHash: prescriptionHash('fin001-apixaban-e11') },
    update: {},
    create: {
      patientId: fin001.id,
      clinicianId: drSilva.id,
      encounterId: 'ENC-GLOSA-FIN001-DEMO',
      prescriptionHash: prescriptionHash('fin001-apixaban-e11'),
      medications: [{ name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 30, tussCode: '1.01.01.01' }],
      diagnosis: 'E11.9',
      signatureMethod: 'demo',
      signatureData: 'demo-staged',
      refillsAuthorized: 0,
      refillsRemaining: 0,
      daysSupply: 30,
      status: 'PENDING',
    },
  });

  console.log('✅ FIN-001 patient staged: Isabel Santos (MRN: GLOSA-FIN001-SP)');
  console.log('   → Encounter ICD-10: E11.9 (Diabetes) | Staged Rx: Apixaban');
  console.log('   → POST /api/prescriptions/safety-check will return AMBER (FIN-001: Indication mismatch)');

  // ── FIN-002: Roberto Lima — AF patient with hallucinated TUSS code ──────────

  const fin002 = await prisma.patient.upsert({
    where: { mrn: 'GLOSA-FIN002-SP' },
    update: {},
    create: {
      firstName: 'Roberto',
      lastName: 'Alves Lima',
      dateOfBirth: new Date('1948-11-03'),
      gender: 'M',
      email: 'roberto.lima.fin002@holilabs-demo.com',
      phone: '+55 11 98765 0002',
      address: 'Rua Oscar Freire 900, Jardins',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01426-001',
      country: 'BR',
      mrn: 'GLOSA-FIN002-SP',
      tokenId: 'PT-glosa-fin002-sp',
      ageBand: '75+',
      region: 'SP',
      assignedClinicianId: drSilva.id,
      dataHash: generatePatientDataHash({ id: 'glosa-fin002', firstName: 'Roberto', lastName: 'Alves Lima', dateOfBirth: '1948-11-03', mrn: 'GLOSA-FIN002-SP' }),
      lastHashUpdate: new Date(),
    },
  });

  await prisma.medication.deleteMany({ where: { patientId: fin002.id } });
  await prisma.medication.createMany({
    data: [
      { patientId: fin002.id, name: 'Warfarina', genericName: 'Warfarin', dose: '5mg', frequency: '1x/dia', route: 'oral', instructions: 'Tomar sempre no mesmo horário', isActive: true, prescribedBy: drSilva.id, startDate: new Date('2020-06-01') },
    ],
  });

  await prisma.clinicalEncounter.deleteMany({ where: { patientId: fin002.id } });
  await prisma.clinicalEncounter.create({
    data: {
      id: 'ENC-GLOSA-FIN002-DEMO',
      patientId: fin002.id,
      providerId: drSilva.id,
      scheduledAt: new Date(),
      startedAt: new Date(),
      status: 'IN_PROGRESS',
      chiefComplaint: 'Fibrilação atrial paroxística (I48.0) — avaliar transição de Warfarina para NOAC.',
    },
  });

  // Staged prescription: Apixaban with INVALID TUSS code → FIN-002 fires RED
  await prisma.prescription.upsert({
    where: { prescriptionHash: prescriptionHash('fin002-apixaban-bad-tuss') },
    update: {},
    create: {
      patientId: fin002.id,
      clinicianId: drSilva.id,
      encounterId: 'ENC-GLOSA-FIN002-DEMO',
      prescriptionHash: prescriptionHash('fin002-apixaban-bad-tuss'),
      medications: [{ name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 30, tussCode: '00000000' }],
      diagnosis: 'I48.0',
      signatureMethod: 'demo',
      signatureData: 'demo-staged',
      refillsAuthorized: 0,
      refillsRemaining: 0,
      daysSupply: 30,
      status: 'PENDING',
    },
  });

  console.log('✅ FIN-002 patient staged: Roberto Lima (MRN: GLOSA-FIN002-SP)');
  console.log('   → Encounter ICD-10: I48.0 (Fibrilação Atrial) | Staged Rx: Apixaban + TUSS 00000000');
  console.log('   → POST /api/prescriptions/safety-check will return RED (FIN-002: Invalid TUSS code)');

  // ── FIN-003: Camila Sousa — AF patient, prescription qty 60 > payer max 30 ──

  const fin003 = await prisma.patient.upsert({
    where: { mrn: 'GLOSA-FIN003-SP' },
    update: {},
    create: {
      firstName: 'Camila',
      lastName: 'Beatriz Sousa',
      dateOfBirth: new Date('1962-04-27'),
      gender: 'F',
      email: 'camila.sousa.fin003@holilabs-demo.com',
      phone: '+55 11 98765 0003',
      address: 'Al. Santos 1500, Cerqueira César',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01419-002',
      country: 'BR',
      mrn: 'GLOSA-FIN003-SP',
      tokenId: 'PT-glosa-fin003-sp',
      ageBand: '60-69',
      region: 'SP',
      assignedClinicianId: drSilva.id,
      dataHash: generatePatientDataHash({ id: 'glosa-fin003', firstName: 'Camila', lastName: 'Beatriz Sousa', dateOfBirth: '1962-04-27', mrn: 'GLOSA-FIN003-SP' }),
      lastHashUpdate: new Date(),
    },
  });

  await prisma.medication.deleteMany({ where: { patientId: fin003.id } });
  await prisma.medication.createMany({
    data: [
      { patientId: fin003.id, name: 'Atenolol', genericName: 'Atenolol', dose: '50mg', frequency: '1x/dia', route: 'oral', instructions: 'Tomar pela manhã', isActive: true, prescribedBy: drSilva.id, startDate: new Date('2021-09-20') },
    ],
  });

  await prisma.clinicalEncounter.deleteMany({ where: { patientId: fin003.id } });
  await prisma.clinicalEncounter.create({
    data: {
      id: 'ENC-GLOSA-FIN003-DEMO',
      patientId: fin003.id,
      providerId: drSilva.id,
      scheduledAt: new Date(),
      startedAt: new Date(),
      status: 'IN_PROGRESS',
      chiefComplaint: 'Fibrilação atrial persistente (I48.0) — iniciar anticoagulação. Preferência do paciente: suprimento trimestral.',
    },
  });

  // Staged prescription: Apixaban qty=60 vs. payer max 30 → FIN-003 fires AMBER
  await prisma.prescription.upsert({
    where: { prescriptionHash: prescriptionHash('fin003-apixaban-qty60') },
    update: {},
    create: {
      patientId: fin003.id,
      clinicianId: drSilva.id,
      encounterId: 'ENC-GLOSA-FIN003-DEMO',
      prescriptionHash: prescriptionHash('fin003-apixaban-qty60'),
      medications: [{ name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 60, tussCode: '1.01.01.01' }],
      diagnosis: 'I48.0',
      signatureMethod: 'demo',
      signatureData: 'demo-staged',
      refillsAuthorized: 0,
      refillsRemaining: 0,
      daysSupply: 60,
      status: 'PENDING',
    },
  });

  console.log('✅ FIN-003 patient staged: Camila Sousa (MRN: GLOSA-FIN003-SP)');
  console.log('   → Encounter ICD-10: I48.0 (Fibrilação Atrial) | Staged Rx: Apixaban qty=60 (payer max=30)');
  console.log('   → POST /api/prescriptions/safety-check will return AMBER (FIN-003: Quantity limit exceeded)');

  // ══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL DEMO PATIENTS (Sprint 6 Phase 2)
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n👥 Seeding additional demo patients...');

  const patientPasswordHash = await bcrypt.hash('Patient2026!', 12);

  // ── Patient 7: Maria Oliveira (Portal-enabled with password) ──────────────

  const mariaOliveira = await prisma.patient.upsert({
    where: { mrn: 'MRN-DEMO-007' },
    update: {},
    create: {
      firstName: 'Maria',
      lastName: 'Oliveira',
      dateOfBirth: new Date('1990-04-12'),
      gender: 'F',
      email: 'maria.oliveira@example.com',
      phone: '+55 11 91234 5678',
      address: 'Rua Haddock Lobo 595, Cerqueira César',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01414-001',
      country: 'BR',
      mrn: 'MRN-DEMO-007',
      tokenId: 'PT-demo-007-mo',
      ageBand: '30-39',
      region: 'SP',
      assignedClinicianId: drSilva.id,
      dataHash: generatePatientDataHash({ id: 'demo-007', firstName: 'Maria', lastName: 'Oliveira', dateOfBirth: '1990-04-12', mrn: 'MRN-DEMO-007' }),
      lastHashUpdate: new Date(),
    },
  });

  await prisma.patientUser.upsert({
    where: { email: 'maria.oliveira@example.com' },
    update: {},
    create: {
      email: 'maria.oliveira@example.com',
      patientId: mariaOliveira.id,
      emailVerifiedAt: new Date(),
      mfaEnabled: false,
      passwordHash: patientPasswordHash,
    },
  });

  console.log('✅ Maria Oliveira (MRN-DEMO-007) + PatientUser with password');

  // ── Patient 8: João Pedro Santos ──────────────────────────────────────────

  const joaoPedro = await prisma.patient.upsert({
    where: { mrn: 'MRN-DEMO-008' },
    update: {},
    create: {
      firstName: 'João Pedro',
      lastName: 'Santos',
      dateOfBirth: new Date('1975-09-28'),
      gender: 'M',
      email: 'joao.santos@example.com',
      phone: '+55 11 92345 6789',
      address: 'Av. Brigadeiro Faria Lima 3400, Itaim Bibi',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '04538-132',
      country: 'BR',
      mrn: 'MRN-DEMO-008',
      tokenId: 'PT-demo-008-jp',
      ageBand: '50-59',
      region: 'SP',
      assignedClinicianId: drSilva.id,
      dataHash: generatePatientDataHash({ id: 'demo-008', firstName: 'João Pedro', lastName: 'Santos', dateOfBirth: '1975-09-28', mrn: 'MRN-DEMO-008' }),
      lastHashUpdate: new Date(),
    },
  });

  // ── Patient 9: Ana Carolina Mendes ────────────────────────────────────────

  const anaCarolina = await prisma.patient.upsert({
    where: { mrn: 'MRN-DEMO-009' },
    update: {},
    create: {
      firstName: 'Ana Carolina',
      lastName: 'Mendes',
      dateOfBirth: new Date('1988-12-05'),
      gender: 'F',
      email: 'ana.mendes@example.com',
      phone: '+55 11 93456 7890',
      address: 'Rua da Consolação 2200, Consolação',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01302-100',
      country: 'BR',
      mrn: 'MRN-DEMO-009',
      tokenId: 'PT-demo-009-ac',
      ageBand: '30-39',
      region: 'SP',
      assignedClinicianId: clinician.id,
      dataHash: generatePatientDataHash({ id: 'demo-009', firstName: 'Ana Carolina', lastName: 'Mendes', dateOfBirth: '1988-12-05', mrn: 'MRN-DEMO-009' }),
      lastHashUpdate: new Date(),
    },
  });

  // ── Patient 10: Pedro Henrique Costa ──────────────────────────────────────

  const pedroHenrique = await prisma.patient.upsert({
    where: { mrn: 'MRN-DEMO-010' },
    update: {},
    create: {
      firstName: 'Pedro Henrique',
      lastName: 'Costa',
      dateOfBirth: new Date('1960-02-18'),
      gender: 'M',
      email: 'pedro.costa@example.com',
      phone: '+55 11 94567 8901',
      address: 'Rua Peixoto Gomide 1800, Jardim Paulista',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01409-002',
      country: 'BR',
      mrn: 'MRN-DEMO-010',
      tokenId: 'PT-demo-010-ph',
      ageBand: '60-69',
      region: 'SP',
      assignedClinicianId: drSilva.id,
      dataHash: generatePatientDataHash({ id: 'demo-010', firstName: 'Pedro Henrique', lastName: 'Costa', dateOfBirth: '1960-02-18', mrn: 'MRN-DEMO-010' }),
      lastHashUpdate: new Date(),
    },
  });

  console.log('✅ Patients 8-10 seeded: João Pedro Santos, Ana Carolina Mendes, Pedro Henrique Costa');

  // ── Medications for new patients ──────────────────────────────────────────

  await prisma.medication.deleteMany({ where: { patientId: { in: [mariaOliveira.id, joaoPedro.id, pedroHenrique.id] } } });
  await prisma.medication.createMany({
    data: [
      { patientId: mariaOliveira.id, name: 'Levotiroxina', genericName: 'Levothyroxine', dose: '50mcg', frequency: '1x/dia', route: 'oral', instructions: 'Tomar em jejum, 30 min antes do café', isActive: true, prescribedBy: drSilva.id, startDate: new Date('2024-01-10') },
      { patientId: joaoPedro.id, name: 'Losartana', genericName: 'Losartan', dose: '50mg', frequency: '1x/dia', route: 'oral', instructions: 'Tomar pela manhã', isActive: true, prescribedBy: drSilva.id, startDate: new Date('2023-05-01') },
      { patientId: joaoPedro.id, name: 'Sinvastatina', genericName: 'Simvastatin', dose: '20mg', frequency: '1x/dia', route: 'oral', instructions: 'Tomar à noite', isActive: true, prescribedBy: drSilva.id, startDate: new Date('2023-05-01') },
      { patientId: pedroHenrique.id, name: 'Metformina', genericName: 'Metformin HCl', dose: '1000mg', frequency: '2x/dia', route: 'oral', instructions: 'Tomar com refeições', isActive: true, prescribedBy: drSilva.id, startDate: new Date('2022-03-15') },
      { patientId: pedroHenrique.id, name: 'Insulina Glargina', genericName: 'Insulin Glargine', dose: '20 UI', frequency: '1x/dia', route: 'subcutânea', instructions: 'Aplicar à noite, no abdômen', isActive: true, prescribedBy: drSilva.id, startDate: new Date('2023-11-01') },
    ],
  });

  // ── Appointments for new patients ─────────────────────────────────────────

  await prisma.appointment.deleteMany({ where: { patientId: { in: [mariaOliveira.id, joaoPedro.id] } } });
  await prisma.appointment.createMany({
    data: [
      { patientId: mariaOliveira.id, clinicianId: drSilva.id, title: 'Retorno Endocrinologia', description: 'Revisão de TSH e ajuste de Levotiroxina', startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), type: 'IN_PERSON', status: 'SCHEDULED' },
      { patientId: joaoPedro.id, clinicianId: drSilva.id, title: 'Check-up Anual', description: 'Exame clínico completo e revisão de exames', startTime: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), endTime: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), type: 'IN_PERSON', status: 'SCHEDULED' },
    ],
  });

  console.log('✅ Medications and appointments for new patients seeded');

  // ══════════════════════════════════════════════════════════════════════════
  // LAB RESULTS (3 results across different patients)
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n🧪 Seeding lab results...');

  await prisma.labResult.deleteMany({
    where: { patientId: { in: [mariaOliveira.id, joaoPedro.id, pedroHenrique.id] } },
  });

  await prisma.labResult.createMany({
    data: [
      {
        patientId: mariaOliveira.id,
        testName: 'TSH (Thyroid-Stimulating Hormone)',
        testCode: '11580-8',
        category: 'Endocrinology',
        orderingDoctor: 'Dr. Ricardo Silva',
        performingLab: 'Fleury Medicina e Saúde',
        value: '6.8',
        unit: 'mIU/L',
        referenceRange: '0.4–4.0 mIU/L',
        status: 'FINAL',
        interpretation: 'High',
        isAbnormal: true,
        isCritical: false,
        orderedDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        collectedDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
        resultDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        notes: 'TSH elevado — considerar ajuste de dose de Levotiroxina.',
      },
      {
        patientId: joaoPedro.id,
        testName: 'LDL Cholesterol',
        testCode: '13457-7',
        category: 'Chemistry',
        orderingDoctor: 'Dr. Ricardo Silva',
        performingLab: 'Laboratório Hermes Pardini',
        value: '162',
        unit: 'mg/dL',
        referenceRange: '<130 mg/dL',
        status: 'FINAL',
        interpretation: 'High',
        isAbnormal: true,
        isCritical: false,
        orderedDate: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
        collectedDate: new Date(now.getTime() - 19 * 24 * 60 * 60 * 1000),
        resultDate: new Date(now.getTime() - 17 * 24 * 60 * 60 * 1000),
        notes: 'LDL acima da meta para perfil cardiovascular. Avaliar aumento de Sinvastatina.',
      },
      {
        patientId: pedroHenrique.id,
        testName: 'HbA1c (Glycated Hemoglobin)',
        testCode: '4548-4',
        category: 'Chemistry',
        orderingDoctor: 'Dr. Ricardo Silva',
        performingLab: 'Fleury Medicina e Saúde',
        value: '8.4',
        unit: '%',
        referenceRange: '<7.0%',
        status: 'FINAL',
        interpretation: 'High',
        isAbnormal: true,
        isCritical: false,
        orderedDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        collectedDate: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
        resultDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        notes: 'HbA1c acima da meta. Controle glicêmico insuficiente — avaliar adesão e ajuste de insulina.',
      },
    ],
  });

  console.log('✅ 3 lab results seeded (TSH, LDL, HbA1c)');

  // ══════════════════════════════════════════════════════════════════════════
  // CLINICAL NOTES (5 notes across different patients)
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📝 Seeding clinical notes...');

  function noteHash(tag: string): string {
    return crypto.createHash('sha256').update(`demo-note:${tag}`).digest('hex');
  }

  const clinicalNotesData = [
    {
      patientId: mariaOliveira.id,
      noteHash: noteHash('mo-progress-001'),
      type: 'PROGRESS' as const,
      subjective: 'Paciente relata fadiga persistente e ganho de peso nos últimos 3 meses. Nega palpitações ou intolerância ao frio.',
      objective: 'PA 120/78 mmHg, FC 68 bpm. Tireoide palpável sem nódulos. Pele seca.',
      assessment: 'Hipotireoidismo subclínico. TSH 6.8 mIU/L (referência 0.4-4.0).',
      plan: 'Ajustar Levotiroxina de 50mcg para 75mcg. Repetir TSH em 6 semanas.',
      chiefComplaint: 'Fadiga e ganho de peso',
      diagnosis: ['E03.9'],
      authorId: drSilva.id,
      signedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: joaoPedro.id,
      noteHash: noteHash('jp-progress-001'),
      type: 'PROGRESS' as const,
      subjective: 'Paciente assintomático. Veio para revisão de rotina. Nega dor torácica, dispneia ou edema.',
      objective: 'PA 138/88 mmHg, FC 72 bpm. Exame cardiovascular sem alterações. IMC 28.5.',
      assessment: 'Hipertensão arterial controlada. Dislipidemia — LDL 162 mg/dL acima da meta.',
      plan: 'Manter Losartana 50mg. Aumentar Sinvastatina de 20mg para 40mg. Orientar dieta e atividade física.',
      chiefComplaint: 'Check-up de rotina',
      diagnosis: ['I10', 'E78.5'],
      authorId: drSilva.id,
      signedAt: new Date(now.getTime() - 17 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: pedroHenrique.id,
      noteHash: noteHash('ph-progress-001'),
      type: 'PROGRESS' as const,
      subjective: 'Paciente relata poliúria e polidipsia. Glicemia capilar em casa variando entre 180-250 mg/dL.',
      objective: 'PA 142/90 mmHg, FC 78 bpm. HbA1c 8.4%. Pés sem lesões. Pulsos pediais presentes.',
      assessment: 'DM2 com controle glicêmico inadequado. HbA1c acima da meta (<7%).',
      plan: 'Aumentar Insulina Glargina de 20 UI para 24 UI. Manter Metformina 1000mg 2x/dia. Solicitar fundo de olho e microalbuminúria.',
      chiefComplaint: 'Controle de diabetes',
      diagnosis: ['E11.65'],
      authorId: drSilva.id,
      signedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: silvaDemoPatient.id,
      noteHash: noteHash('fc-consultation-001'),
      type: 'CONSULTATION' as const,
      subjective: 'Encaminhada para avaliação cardiológica. Queixa de palpitações esporádicas há 2 meses.',
      objective: 'PA 130/82 mmHg, FC 76 bpm. Ausculta cardíaca: ritmo regular, sem sopros. ECG: ritmo sinusal normal.',
      assessment: 'Palpitações benignas. Sem evidência de arritmia no ECG de repouso.',
      plan: 'Solicitar Holter 24h para avaliação. Orientar redução de cafeína. Retorno com resultado.',
      chiefComplaint: 'Palpitações esporádicas',
      diagnosis: ['R00.2'],
      authorId: drSilva.id,
      signedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: anaCarolina.id,
      noteHash: noteHash('ac-progress-001'),
      type: 'PROGRESS' as const,
      subjective: 'Paciente relata cefaleia tensional frequente (3-4x/semana). Associa a estresse no trabalho. Nega aura, náusea ou fotofobia.',
      objective: 'PA 118/74 mmHg, FC 64 bpm. Exame neurológico sem déficits focais. Musculatura cervical tensa.',
      assessment: 'Cefaleia tensional crônica. Sem sinais de alarme.',
      plan: 'Orientar higiene do sono e técnicas de relaxamento. Prescrever Paracetamol 750mg SOS. Retorno em 30 dias.',
      chiefComplaint: 'Cefaleia frequente',
      diagnosis: ['G44.2'],
      authorId: clinician.id,
      signedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const noteData of clinicalNotesData) {
    await prisma.clinicalNote.upsert({
      where: { noteHash: noteData.noteHash },
      update: {},
      create: noteData,
    });
  }

  console.log('✅ 5 clinical notes seeded');

  // ══════════════════════════════════════════════════════════════════════════
  // MESSAGES (5 clinician↔patient messages)
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n💬 Seeding messages...');

  await prisma.message.deleteMany({
    where: { patientId: { in: [mariaOliveira.id, joaoPedro.id, pedroHenrique.id, anaCarolina.id] } },
  });

  await prisma.message.createMany({
    data: [
      {
        fromUserId: drSilva.id,
        fromUserType: 'CLINICIAN',
        toUserId: mariaOliveira.id,
        toUserType: 'PATIENT',
        patientId: mariaOliveira.id,
        subject: 'Resultado de exame — TSH',
        body: 'Maria, seu resultado de TSH veio alterado (6.8 mIU/L). Vamos ajustar a dose de Levotiroxina na próxima consulta. Pode agendar retorno para a semana que vem?',
        createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        fromUserId: mariaOliveira.id,
        fromUserType: 'PATIENT',
        toUserId: drSilva.id,
        toUserType: 'CLINICIAN',
        patientId: mariaOliveira.id,
        subject: 'Re: Resultado de exame — TSH',
        body: 'Dr. Silva, obrigada pelo aviso. Já agendei para terça-feira. Tenho sentido muita fadiga, é relacionado?',
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        fromUserId: drSilva.id,
        fromUserType: 'CLINICIAN',
        toUserId: joaoPedro.id,
        toUserType: 'PATIENT',
        patientId: joaoPedro.id,
        subject: 'Ajuste de medicação — Colesterol',
        body: 'João Pedro, seus exames mostraram LDL de 162 mg/dL. Vou aumentar a dose de Sinvastatina. A receita está disponível na farmácia do hospital.',
        createdAt: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
      },
      {
        fromUserId: pedroHenrique.id,
        fromUserType: 'PATIENT',
        toUserId: drSilva.id,
        toUserType: 'CLINICIAN',
        patientId: pedroHenrique.id,
        subject: 'Dúvida sobre insulina',
        body: 'Dr. Silva, estou com dificuldade de aplicar a insulina no abdômen. Posso aplicar na coxa?',
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        fromUserId: clinician.id,
        fromUserType: 'CLINICIAN',
        toUserId: anaCarolina.id,
        toUserType: 'PATIENT',
        patientId: anaCarolina.id,
        subject: 'Orientações — Cefaleia',
        body: 'Ana Carolina, segue um resumo das orientações: evitar telas antes de dormir, manter horário regular de sono, e praticar alongamento cervical. Se a cefaleia piorar, entre em contato.',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('✅ 5 messages seeded');

  // ══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════════════

  console.log(`
🎉 Database seeded successfully!

📊 Base Setup:
   Clinicians  → ${clinician.email}, ${demoClinician.email}, ${drSilva.email}
   Patients    → 10 total (6 base + 4 Sprint 6)
   Workspace   → ${drSilvaWorkspace.slug}

🎯 Glosa-Prevention Demo Patients (Billing Guardrails):
   FIN-001 → Isabel Fernanda Santos  (MRN: GLOSA-FIN001-SP) — ICD-10 mismatch (E11.9 + Apixaban)
   FIN-002 → Roberto Alves Lima      (MRN: GLOSA-FIN002-SP) — Invalid TUSS 00000000
   FIN-003 → Camila Beatriz Sousa    (MRN: GLOSA-FIN003-SP) — Qty 60 exceeds payer max 30

🧪 Lab Results: 3 (TSH, LDL, HbA1c)
📝 Clinical Notes: 5 (SOAP progress + consultation)
💬 Messages: 5 (clinician↔patient threads)

🔑 Demo Login:
   Dr. Silva      → dr.silva@holilabs.xyz / Cortex2026!
   Clinician      → doctor@holilabs.com / Demo123!@#
   Patient Portal → maria.oliveira@example.com / Patient2026!
   Patient Portal → demo@holilabs.xyz (magic link)

🌐 App URLs:
   Dashboard       → http://localhost:3000/dashboard
   Patient Portal  → http://localhost:3000/portal/login
   Safety API      → POST http://localhost:3000/api/prescriptions/safety-check
`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
