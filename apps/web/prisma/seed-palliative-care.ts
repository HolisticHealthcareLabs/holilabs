/**
 * Pequeno Cotolêngo Pilot - Palliative Care Seed Data
 *
 * Creates realistic sample data for demo with Pequeno Cotolêngo hospital
 * Focus: Special needs and palliative care patients with Brazilian identifiers
 */

import { PrismaClient } from '@prisma/client';
import { generatePatientDataHash } from '../src/lib/blockchain/hashing';

const prisma = new PrismaClient();

async function main() {
  console.log('🏥 Seeding Pequeno Cotolêngo palliative care data...\n');

  // Create test clinician (if doesn't exist)
  const clinician = await prisma.user.upsert({
    where: { email: 'dra.silva@pequenocotolengo.org.br' },
    update: {},
    create: {
      email: 'dra.silva@pequenocotolengo.org.br',
      firstName: 'Ana',
      lastName: 'Silva',
      role: 'CLINICIAN',
      specialty: 'Palliative Medicine',
      licenseNumber: 'CRM-SP-123456',
    },
  });

  console.log(`✅ Created clinician: Dra. ${clinician.firstName} ${clinician.lastName}`);

  // Create nurse
  const nurse = await prisma.user.upsert({
    where: { email: 'enf.santos@pequenocotolengo.org.br' },
    update: {},
    create: {
      email: 'enf.santos@pequenocotolengo.org.br',
      firstName: 'João',
      lastName: 'Santos',
      role: 'NURSE',
      specialty: 'Palliative Nursing',
      licenseNumber: 'COREN-SP-789012',
    },
  });

  console.log(`✅ Created nurse: Enf. ${nurse.firstName} ${nurse.lastName}\n`);

  // Sample Palliative Care Patients
  const patients = [
    {
      // Patient 1: Maria - End-stage cancer, DNR, family involvement
      firstName: 'Maria',
      lastName: 'Oliveira Santos',
      preferredName: 'Dona Maria',
      dateOfBirth: new Date('1945-03-15'),
      gender: 'F',
      phone: '+55 11 98765-4321',
      address: 'Rua das Flores, 123',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01234-567',
      country: 'BR',
      mrn: 'PC-2025-001',
      cns: '898765432109876',
      cpf: '12345678901',
      municipalityCode: '3550308', // São Paulo
      healthUnitCNES: '2787229',

      // Palliative care
      isPalliativeCare: true,
      comfortCareOnly: true,
      advanceDirectivesStatus: 'COMPLETED',
      advanceDirectivesDate: new Date('2024-12-01'),
      advanceDirectivesNotes: 'Paciente expressa desejo de permanecer no Pequeno Cotolêngo. Não deseja hospitalização. Família está de acordo.',
      dnrStatus: true,
      dnrDate: new Date('2024-12-01'),
      dniStatus: true,
      dniDate: new Date('2024-12-01'),
      codeStatus: 'COMFORT_CARE_ONLY',

      // Quality of life
      qualityOfLifeScore: 6,
      lastQoLAssessment: new Date('2025-01-10'),

      // Spiritual care
      religiousAffiliation: 'Católica',
      spiritualCareNeeds: 'Deseja receber comunhão semanalmente. Gosta de rezar o terço.',
      chaplainAssigned: true,

      // Family contacts
      primaryContactName: 'Ana Paula Oliveira',
      primaryContactRelation: 'Filha',
      primaryContactPhone: '+55 11 97654-3210',
      primaryContactEmail: 'ana.paula@email.com',

      emergencyContactName: 'Carlos Oliveira',
      emergencyContactPhone: '+55 11 96543-2109',
      emergencyContactRelation: 'Filho',

      // Humanization
      pronouns: 'ela/dela',
      culturalPreferences: 'Gosta de música sertaneja antiga. Aprecia flores naturais no quarto.',

      // Special needs
      hasSpecialNeeds: false,

      // Care team notes
      careTeamNotes: 'Paciente lúcida e orientada. Comunicativa. Prefere horário da manhã para procedimentos.',
      flaggedConcerns: ['Pain Management', 'Nutrition Support'],
    },
    {
      // Patient 2: Pedro - Special needs + palliative, non-verbal
      firstName: 'Pedro',
      lastName: 'Costa Ferreira',
      preferredName: 'Pedrinho',
      dateOfBirth: new Date('2000-07-22'),
      gender: 'M',
      phone: '+55 11 95432-1098',
      address: 'Avenida Paulista, 1000',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01310-100',
      country: 'BR',
      mrn: 'PC-2025-002',
      cns: '765432109876543',
      cpf: '98765432109',
      municipalityCode: '3550308',
      healthUnitCNES: '2787229',

      // Palliative care
      isPalliativeCare: true,
      comfortCareOnly: false,
      codeStatus: 'DNR',
      dnrStatus: true,
      dnrDate: new Date('2023-05-10'),

      // Quality of life
      qualityOfLifeScore: 7,
      lastQoLAssessment: new Date('2025-01-12'),

      // Spiritual care
      religiousAffiliation: 'Católica',
      chaplainAssigned: true,

      // Family contacts
      primaryContactName: 'Teresa Costa',
      primaryContactRelation: 'Mãe',
      primaryContactPhone: '+55 11 94321-0987',
      primaryContactEmail: 'teresa.costa@email.com',

      // Humanization
      pronouns: 'ele/dele',

      // Special needs - CRITICAL
      hasSpecialNeeds: true,
      specialNeedsType: ['Cognitive', 'Physical', 'Sensory'],
      communicationNeeds: 'Não-verbal. Usa expressões faciais e sons para comunicar desconforto. Responde ao toque carinhoso.',
      mobilityNeeds: 'Cadeira de rodas. Necessita apoio total para transferências. Posicionamento a cada 2 horas.',
      dietaryNeeds: 'Dieta enteral via gastrostomia. 1500ml/dia dividido em 6 porções.',
      sensoryNeeds: 'Sensível a ruídos altos. Prefere ambiente calmo. Gosta de música suave.',

      // Care team notes
      careTeamNotes: 'Atenção especial para sinais não-verbais de dor. Sorri quando ouve música. Família muito presente.',
      flaggedConcerns: ['Fall Risk', 'Aspiration Risk', 'Seizure Risk'],
    },
    {
      // Patient 3: João - Elderly, Alzheimer's, palliative
      firstName: 'João',
      lastName: 'Mendes Silva',
      preferredName: 'Seu João',
      dateOfBirth: new Date('1938-11-08'),
      gender: 'M',
      phone: '+55 11 93210-9876',
      address: 'Rua Augusta, 500',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01305-000',
      country: 'BR',
      mrn: 'PC-2025-003',
      cns: '654321098765432',
      cpf: '87654321098',
      municipalityCode: '3550308',
      healthUnitCNES: '2787229',

      // Palliative care
      isPalliativeCare: true,
      comfortCareOnly: true,
      codeStatus: 'AND', // Allow Natural Death
      dnrStatus: true,
      dnrDate: new Date('2024-08-15'),
      advanceDirectivesStatus: 'COMPLETED',

      // Quality of life
      qualityOfLifeScore: 5,
      lastQoLAssessment: new Date('2025-01-13'),

      // Spiritual care
      religiousAffiliation: 'Católica',
      chaplainAssigned: true,

      // Family contacts
      primaryContactName: 'Mariana Mendes',
      primaryContactRelation: 'Filha',
      primaryContactPhone: '+55 11 92109-8765',
      primaryContactEmail: 'mariana.mendes@email.com',

      secondaryContactName: 'Roberto Mendes',
      secondaryContactRelation: 'Filho',
      secondaryContactPhone: '+55 11 91098-7654',

      // Humanization
      pronouns: 'ele/dele',
      culturalPreferences: 'Gosta de futebol. Torce pelo Corinthians. Aprecia música de Roberto Carlos.',

      // Special needs
      hasSpecialNeeds: true,
      specialNeedsType: ['Cognitive'],
      communicationNeeds: 'Alzheimer avançado. Responde melhor a abordagens simples e afetivas. Reconhece familiares alguns dias.',
      mobilityNeeds: 'Deambula com supervisão. Risco de quedas. Necessita apoio para higiene.',
      dietaryNeeds: 'Dieta pastosa. Supervisão durante refeições. Hidratação assistida.',

      // Care team notes
      careTeamNotes: 'Agitação vespertina comum. Música e presença familiar acalmam. Evitar ambientes com muitos estímulos.',
      flaggedConcerns: ['Fall Risk', 'Wandering Risk', 'Nutrition Risk'],
    },
  ];

  // Create patients with data hash
  const createdPatients = [];
  for (const patientData of patients) {
    const tokenId = `PCT-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}`;
    const dataHash = generatePatientDataHash({
      id: tokenId,
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      dateOfBirth: patientData.dateOfBirth.toISOString(),
      mrn: patientData.mrn,
    });

    const age = new Date().getFullYear() - patientData.dateOfBirth.getFullYear();
    const ageBand = `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`;

    const patient = await prisma.patient.create({
      data: {
        ...patientData,
        tokenId,
        ageBand,
        region: 'SP',
        dataHash,
        lastHashUpdate: new Date(),
        assignedClinicianId: clinician.id,
      },
    });

    createdPatients.push(patient);
    console.log(`✅ Created patient: ${patient.preferredName || patient.firstName} (${patient.mrn})`);
  }

  console.log('\n📋 Creating care plans...\n');

  // Care Plans for Maria (Patient 1)
  await prisma.carePlan.create({
    data: {
      patientId: createdPatients[0].id,
      title: 'Controle de Dor Oncológica',
      description: 'Manejo de dor relacionada a câncer metastático. Meta: manter escala de dor ≤ 3.',
      category: 'PAIN_MANAGEMENT',
      priority: 'HIGH',
      goals: [
        'Avaliar dor 3x ao dia',
        'Administrar analgésicos conforme prescrição',
        'Identificar fatores agravantes',
        'Ajustar posicionamento para conforto',
      ],
      status: 'ACTIVE',
      assignedTeam: [clinician.id, nurse.id],
      progressNotes: ['Dor controlada com morfina de liberação lenta. Paciente relatando melhora significativa.'],
      createdBy: clinician.id,
      createdAt: new Date('2025-01-05'),
      updatedAt: new Date('2025-01-14'),
    },
  });

  await prisma.carePlan.create({
    data: {
      patientId: createdPatients[0].id,
      title: 'Apoio Familiar e Espiritual',
      description: 'Fortalecimento do vínculo familiar e suporte espiritual.',
      category: 'FAMILY_SUPPORT',
      priority: 'MEDIUM',
      goals: [
        'Reuniões semanais com família',
        'Visitas do capelão 2x por semana',
        'Comunhão semanal conforme desejo da paciente',
      ],
      status: 'ACTIVE',
      assignedTeam: [clinician.id],
      progressNotes: [],
      createdBy: clinician.id,
      createdAt: new Date('2025-01-06'),
      updatedAt: new Date('2025-01-06'),
    },
  });

  // Pain assessments for Maria
  const painScores = [8, 7, 6, 4, 5, 3, 4, 3];
  for (let i = 0; i < painScores.length; i++) {
    await prisma.painAssessment.create({
      data: {
        patientId: createdPatients[0].id,
        painScore: painScores[i],
        painType: 'CHRONIC',
        location: 'Região abdominal e lombar',
        description: 'Dor profunda, constante',
        quality: ['Aching', 'Deep'],
        timing: 'Constante, piora à noite',
        aggravatingFactors: ['Movimento', 'Tosse'],
        relievingFactors: ['Repouso', 'Posicionamento lateral', 'Medicação'],
        functionalImpact: i < 4 ? 'Dificuldade para mobilização' : 'Capaz de mobilizar-se com auxílio',
        sleepImpact: i < 4 ? 'Acordando durante a noite' : 'Sono preservado',
        moodImpact: i < 4 ? 'Irritabilidade' : 'Humor estável',
        interventionsGiven: ['Morfina', 'Posicionamento', 'Massagem suave'],
        responseToTreatment: i >= 4 ? 'Boa resposta ao ajuste medicamentoso' : 'Resposta parcial',
        assessedAt: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000),
        assessedBy: nurse.id,
      },
    });
  }

  console.log(`✅ Created ${painScores.length} pain assessments for Maria`);

  // Care Plan for Pedro (Patient 2)
  await prisma.carePlan.create({
    data: {
      patientId: createdPatients[1].id,
      title: 'Comunicação Não-Verbal e Conforto',
      description: 'Estabelecer rotinas de comunicação através de expressões e contato físico.',
      category: 'QUALITY_OF_LIFE',
      priority: 'HIGH',
      goals: [
        'Identificar sinais de conforto/desconforto',
        'Musicoterapia diária',
        'Posicionamento a cada 2h',
        'Envolvimento familiar nos cuidados',
      ],
      status: 'ACTIVE',
      assignedTeam: [nurse.id],
      progressNotes: ['Pedrinho responde bem à música. Sorri quando ouve suas músicas favoritas.'],
      createdBy: nurse.id,
      createdAt: new Date('2025-01-08'),
      updatedAt: new Date('2025-01-14'),
    },
  });

  // Care Plan for João (Patient 3)
  await prisma.carePlan.create({
    data: {
      patientId: createdPatients[2].id,
      title: 'Qualidade de Vida em Demência Avançada',
      description: 'Promover conforto e dignidade nos cuidados paliativos.',
      category: 'QUALITY_OF_LIFE',
      priority: 'MEDIUM',
      goals: [
        'Ambiente calmo e familiar',
        'Rotina estruturada',
        'Presença familiar regular',
        'Atividades sensoriais suaves',
      ],
      status: 'ACTIVE',
      assignedTeam: [clinician.id, nurse.id],
      progressNotes: [],
      createdBy: clinician.id,
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date('2025-01-10'),
    },
  });

  console.log('\n✅ All palliative care seed data created successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - ${createdPatients.length} palliative care patients`);
  console.log(`   - 5 care plans`);
  console.log(`   - ${painScores.length} pain assessments`);
  console.log(`   - 1 clinician + 1 nurse\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
