import { PrismaClient } from '@prisma/client';
import { generatePatientDataHash } from '../src/lib/blockchain/hashing';
import { BUILTIN_DEFAULTS } from '../src/lib/ai/prompt-templates';
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
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════════════

  console.log(`
🎉 Database seeded successfully!

  // ══════════════════════════════════════════════════════════════════════════
  // AGENT PROMPT TEMPLATES
  // ══════════════════════════════════════════════════════════════════════════

  for (const t of BUILTIN_DEFAULTS) {
    const existing = await prisma.agentPromptTemplate.findFirst({
      where: { slug: t.slug, workspaceId: null },
    });
    if (existing) {
      await prisma.agentPromptTemplate.update({
        where: { id: existing.id },
        data: { prompt: t.prompt, name: t.name, description: t.description },
      });
    } else {
      await prisma.agentPromptTemplate.create({
        data: {
          slug: t.slug,
          name: t.name,
          description: t.description,
          category: t.category,
          prompt: t.prompt,
          customizable: t.customizable,
          isDefault: true,
          isActive: true,
          version: '1.0.0',
        },
      });
    }
  }
  console.log(`✅ Prompt templates: ${BUILTIN_DEFAULTS.length} seeded`);

  console.log(`
📊 Base Setup:
   Clinicians  → ${clinician.email}, ${demoClinician.email}, ${drSilva.email}
   Patients    → MRN-2024-001, MRN-DEMO-2024, MRN-DEMO-SILVA-001
   Workspace   → ${drSilvaWorkspace.slug}

🎯 Glosa-Prevention Demo Patients (Billing Guardrails):
   FIN-001 → Isabel Fernanda Santos  (MRN: GLOSA-FIN001-SP) — ICD-10 mismatch (E11.9 + Apixaban)
   FIN-002 → Roberto Alves Lima      (MRN: GLOSA-FIN002-SP) — Invalid TUSS 00000000
   FIN-003 → Camila Beatriz Sousa    (MRN: GLOSA-FIN003-SP) — Qty 60 exceeds payer max 30

🔑 Demo Login:
   Dr. Silva    → dr.silva@holilabs.xyz / Cortex2026!
   Clinician    → doctor@holilabs.com / Demo123!@#
   Patient Portal → demo@holilabs.xyz (magic link)

🌐 App URLs:
   Dashboard  → http://localhost:3000/dashboard
   FIN-001 Pt → http://localhost:3000/dashboard/patients/<FIN001-ID>
   Safety API → POST http://localhost:3000/api/prescriptions/safety-check
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
