/**
 * Seed sample LATAM providers for development and demo.
 *
 * Idempotent — uses upsert on unique keys. Safe to run multiple times.
 * Covers Brazil (CFM), Mexico (CONACEM), Colombia (ReTHUS) across the
 * full CAM taxonomy so the find-doctor UI has visible data across all
 * four MedicalSystemType filters.
 */
import { PrismaClient, PhysicianRegistrySource, PhysicianClaimStatus, EstablishmentType } from '@prisma/client';

const prisma = new PrismaClient();

interface ProviderSeed {
  country: string;
  registryId: string;
  registryState: string | null;
  registrySource: PhysicianRegistrySource;
  name: string;
  photoUrl: string | null;
  gender: 'M' | 'F' | null;
  lat: number | null;
  lng: number | null;
  addressCity: string;
  addressState: string;
  addressStreet: string | null;
  addressCep: string | null;
  phone: string | null;
  email: string | null;
  claimStatus: PhysicianClaimStatus;
  bio: string;
  languages: string[];
  education: string;
  consultationFee: number | null;
  consultationCurrency: string | null;
  websiteUrl: string | null;
  avgRating: number;
  reviewCount: number;
  completenessScore: number;
  /** slug -> { isPrimary, rqeNumber? } */
  specialties: { slug: string; isPrimary: boolean; rqeNumber?: string }[];
  /** CNES codes for establishments */
  establishmentCnes: string[];
  /** Insurance plan slugs */
  insurancePlans: string[];
  /** Sample reviews */
  reviews: { rating: number; title: string; body: string }[];
}

const INSURANCE_PLANS = [
  { slug: 'amil', operator: 'Amil Assistência Médica', plan: 'Amil One Black', ans: '326305', country: 'BR' },
  { slug: 'sulamerica', operator: 'SulAmérica', plan: 'Prestige', ans: '006246', country: 'BR' },
  { slug: 'unimed-sp', operator: 'Unimed São Paulo', plan: 'Unimed Beta', ans: '339679', country: 'BR' },
  { slug: 'bradesco-saude', operator: 'Bradesco Saúde', plan: 'Top Nacional', ans: '005711', country: 'BR' },
  { slug: 'gnp-mx', operator: 'GNP Seguros', plan: 'Plan Plenitud', ans: 'GNP-MX-001', country: 'MX' },
  { slug: 'sura-co', operator: 'SURA Colombia', plan: 'Plan Clásico', ans: 'SURA-CO-001', country: 'CO' },
];

const ESTABLISHMENTS = [
  {
    cnes: '2077485',
    name: 'Hospital Sírio-Libanês',
    tradeName: 'Sírio-Libanês',
    type: 'HOSPITAL' as EstablishmentType,
    country: 'BR',
    city: 'São Paulo', state: 'SP', cep: '01308-050',
    street: 'R. Dona Adma Jafet, 91 - Bela Vista',
    lat: -23.5570, lng: -46.6538,
    phone: '+55 11 3155-0200',
  },
  {
    cnes: '2077493',
    name: 'Hospital Albert Einstein',
    tradeName: 'Einstein Morumbi',
    type: 'HOSPITAL' as EstablishmentType,
    country: 'BR',
    city: 'São Paulo', state: 'SP', cep: '05652-900',
    street: 'Av. Albert Einstein, 627 - Morumbi',
    lat: -23.5999, lng: -46.7169,
    phone: '+55 11 2151-1233',
  },
  {
    cnes: '2269783',
    name: 'Clínica Integrativa São Paulo',
    tradeName: 'Integrativa SP',
    type: 'CLINIC' as EstablishmentType,
    country: 'BR',
    city: 'São Paulo', state: 'SP', cep: '04538-132',
    street: 'Av. Brigadeiro Faria Lima, 3144',
    lat: -23.5775, lng: -46.6926,
    phone: '+55 11 3078-4000',
  },
  {
    cnes: '6937142',
    name: 'Centro Médico ABC',
    tradeName: 'CMA',
    type: 'CLINIC' as EstablishmentType,
    country: 'MX',
    city: 'Ciudad de México', state: 'CDMX', cep: '11650',
    street: 'Av. Carlos Graef Fernández 154, Tlaxala',
    lat: 19.3625, lng: -99.2559,
    phone: '+52 55 1103-1600',
  },
  {
    cnes: '9908121',
    name: 'Clínica del Country',
    tradeName: 'Country Bogotá',
    type: 'CLINIC' as EstablishmentType,
    country: 'CO',
    city: 'Bogotá', state: 'Cundinamarca', cep: '110221',
    street: 'Cra. 16 #82-57',
    lat: 4.6674, lng: -74.0560,
    phone: '+57 1 530-0470',
  },
];

const PROVIDERS: ProviderSeed[] = [
  // ── Brazil — Conventional specialties ────────────────────────────────
  {
    country: 'BR', registryId: '123456', registryState: 'SP',
    registrySource: 'CFM_BR', name: 'Dra. Mariana Silva Oliveira',
    photoUrl: null, gender: 'F', lat: -23.5505, lng: -46.6333,
    addressCity: 'São Paulo', addressState: 'SP',
    addressStreet: 'R. Dona Adma Jafet, 91', addressCep: '01308-050',
    phone: '+55 11 3155-0200', email: 'mariana.oliveira@example.com',
    claimStatus: 'VERIFIED',
    bio: 'Cardiologista com foco em cardiologia preventiva e reabilitação cardíaca. Atendo pacientes com ênfase em abordagem integrativa para saúde cardiovascular.',
    languages: ['Português', 'Inglês', 'Espanhol'],
    education: 'MD, Universidade de São Paulo (USP)\nResidência em Cardiologia - InCor-HCFMUSP\nFellowship em Cardiologia Preventiva - Cleveland Clinic',
    consultationFee: 650, consultationCurrency: 'BRL',
    websiteUrl: 'https://drcardiosp.com.br',
    avgRating: 4.8, reviewCount: 127, completenessScore: 95,
    specialties: [
      { slug: 'cardiologia', isPrimary: true, rqeNumber: 'RQE-12345' },
      { slug: 'medicina-integrativa', isPrimary: false },
    ],
    establishmentCnes: ['2077485'],
    insurancePlans: ['amil', 'sulamerica', 'unimed-sp'],
    reviews: [
      { rating: 5, title: 'Atendimento excepcional', body: 'A Dra. Mariana é atenciosa e explica tudo com clareza. Me ajudou muito com minha hipertensão.' },
      { rating: 5, title: 'Profissional de excelência', body: 'Muito didática e competente. Recomendo fortemente.' },
      { rating: 4, title: 'Boa consulta', body: 'Consulta tranquila e bem conduzida. Gostei da abordagem preventiva.' },
    ],
  },
  {
    country: 'BR', registryId: '234567', registryState: 'RJ',
    registrySource: 'CFM_BR', name: 'Dr. Ricardo Almeida Souza',
    photoUrl: null, gender: 'M', lat: -22.9068, lng: -43.1729,
    addressCity: 'Rio de Janeiro', addressState: 'RJ',
    addressStreet: 'Av. das Américas, 3500', addressCep: '22640-102',
    phone: '+55 21 3325-4000', email: null,
    claimStatus: 'VERIFIED',
    bio: 'Ortopedista especializado em cirurgia de joelho e medicina esportiva. Atendo atletas amadores e profissionais.',
    languages: ['Português', 'Inglês'],
    education: 'MD, Universidade Federal do Rio de Janeiro (UFRJ)\nResidência em Ortopedia - INTO\nFellowship em Joelho - Hospital for Special Surgery (NY)',
    consultationFee: 550, consultationCurrency: 'BRL',
    websiteUrl: null,
    avgRating: 4.7, reviewCount: 89, completenessScore: 88,
    specialties: [
      { slug: 'ortopedia', isPrimary: true, rqeNumber: 'RQE-23456' },
    ],
    establishmentCnes: [],
    insurancePlans: ['bradesco-saude', 'sulamerica'],
    reviews: [
      { rating: 5, title: 'Excelente ortopedista', body: 'Resolveu meu problema no joelho com uma abordagem conservadora. Muito competente.' },
      { rating: 4, title: 'Bom profissional', body: 'Atendimento bom, explicou bem o tratamento.' },
    ],
  },
  {
    country: 'BR', registryId: '345678', registryState: 'SP',
    registrySource: 'CFM_BR', name: 'Dr. Bruno Fernandes Costa',
    photoUrl: null, gender: 'M', lat: -23.5950, lng: -46.6860,
    addressCity: 'São Paulo', addressState: 'SP',
    addressStreet: 'Av. Albert Einstein, 627', addressCep: '05652-900',
    phone: '+55 11 2151-1233', email: null,
    claimStatus: 'UNCLAIMED',
    bio: 'Pediatra com mais de 15 anos de experiência em pediatria geral e desenvolvimento infantil.',
    languages: ['Português', 'Inglês'],
    education: 'MD, Faculdade de Medicina da USP\nResidência em Pediatria - HC-FMUSP',
    consultationFee: null, consultationCurrency: null, websiteUrl: null,
    avgRating: 4.6, reviewCount: 54, completenessScore: 70,
    specialties: [
      { slug: 'pediatria', isPrimary: true, rqeNumber: 'RQE-34567' },
    ],
    establishmentCnes: ['2077493'],
    insurancePlans: ['amil', 'unimed-sp'],
    reviews: [
      { rating: 5, title: 'Ótimo pediatra', body: 'Meus filhos adoram o Dr. Bruno. Muito paciente com as crianças.' },
    ],
  },

  // ── Brazil — Integrative & CAM ───────────────────────────────────────
  {
    country: 'BR', registryId: '456789', registryState: 'SP',
    registrySource: 'CFM_BR', name: 'Dra. Camila Tanaka Yamashita',
    photoUrl: null, gender: 'F', lat: -23.5775, lng: -46.6926,
    addressCity: 'São Paulo', addressState: 'SP',
    addressStreet: 'Av. Brigadeiro Faria Lima, 3144', addressCep: '04538-132',
    phone: '+55 11 3078-4000', email: 'camila.tanaka@example.com',
    claimStatus: 'VERIFIED',
    bio: 'Médica integrativa e acupunturista. Combino medicina conventional com Medicina Tradicional Chinesa para tratamento de dor crônica, ansiedade e distúrbios do sono.',
    languages: ['Português', 'Inglês', 'Japonês'],
    education: 'MD, Universidade de São Paulo (USP)\nEspecialização em Acupuntura - CMBA\nFormação em Medicina Integrativa - Andrew Weil Center (Arizona)\nFormação em Medicina Tradicional Chinesa - Beijing TCM University',
    consultationFee: 480, consultationCurrency: 'BRL',
    websiteUrl: 'https://drcamilaintegrativa.com.br',
    avgRating: 4.9, reviewCount: 203, completenessScore: 98,
    specialties: [
      { slug: 'medicina-integrativa', isPrimary: true },
      { slug: 'acupuntura', isPrimary: false, rqeNumber: 'RQE-45678' },
      { slug: 'medicina-tradicional-chinesa', isPrimary: false },
    ],
    establishmentCnes: ['2269783'],
    insurancePlans: ['amil', 'bradesco-saude'],
    reviews: [
      { rating: 5, title: 'Transformou minha vida', body: 'Após anos sofrendo com enxaqueca, a Dra. Camila combinou acupuntura com medicina integrativa e finalmente tenho qualidade de vida.' },
      { rating: 5, title: 'Abordagem única', body: 'Ela realmente escuta o paciente e trata a causa, não só o sintoma.' },
      { rating: 5, title: 'Excelente médica', body: 'Aulas sobre bem-estar e acupuntura mudaram minha rotina.' },
    ],
  },
  {
    country: 'BR', registryId: '567890', registryState: 'MG',
    registrySource: 'CFM_BR', name: 'Dr. Felipe Moreira Lima',
    photoUrl: null, gender: 'M', lat: -19.9167, lng: -43.9345,
    addressCity: 'Belo Horizonte', addressState: 'MG',
    addressStreet: 'Av. do Contorno, 6283', addressCep: '30110-043',
    phone: '+55 31 3247-0000', email: null,
    claimStatus: 'VERIFIED',
    bio: 'Homeopata e médico de família. Atendimento humanizado com foco na individualidade do paciente e uso de homeopatia como terapia principal.',
    languages: ['Português'],
    education: 'MD, Universidade Federal de Minas Gerais (UFMG)\nEspecialização em Homeopatia - AMHB',
    consultationFee: 280, consultationCurrency: 'BRL',
    websiteUrl: null,
    avgRating: 4.5, reviewCount: 67, completenessScore: 82,
    specialties: [
      { slug: 'homeopatia', isPrimary: true, rqeNumber: 'RQE-56789' },
      { slug: 'medicina-familia', isPrimary: false },
    ],
    establishmentCnes: [],
    insurancePlans: ['unimed-sp'],
    reviews: [
      { rating: 5, title: 'Homeopata excepcional', body: 'Tratamento homeopático que realmente funciona. Paciente com eczema crônico e finalmente encontrei resultado.' },
      { rating: 4, title: 'Bom atendimento', body: 'Consultas longas e detalhadas, gostei do cuidado.' },
    ],
  },
  {
    country: 'BR', registryId: '678901', registryState: 'RS',
    registrySource: 'CFM_BR', name: 'Dra. Juliana Bertoldi Weber',
    photoUrl: null, gender: 'F', lat: -30.0346, lng: -51.2177,
    addressCity: 'Porto Alegre', addressState: 'RS',
    addressStreet: 'Av. Independência, 270', addressCep: '90035-073',
    phone: null, email: null,
    claimStatus: 'UNCLAIMED',
    bio: 'Médica antroposófica com formação em medicina de família. Abordagem biográfica integrada com pediatria e ginecologia.',
    languages: ['Português', 'Alemão', 'Inglês'],
    education: 'MD, UFRGS\nFormação em Medicina Antroposófica - ABMA',
    consultationFee: null, consultationCurrency: null, websiteUrl: null,
    avgRating: 4.4, reviewCount: 31, completenessScore: 65,
    specialties: [
      { slug: 'medicina-antroposofica', isPrimary: true },
      { slug: 'medicina-familia', isPrimary: false },
    ],
    establishmentCnes: [],
    insurancePlans: [],
    reviews: [
      { rating: 5, title: 'Abordagem completa', body: 'Primeira consulta com medicina antroposófica e fiquei impressionada com a profundidade do atendimento.' },
    ],
  },

  // ── Brazil — Complementary (CAM) ─────────────────────────────────────
  {
    country: 'BR', registryId: '789012', registryState: 'SP',
    registrySource: 'CFM_BR', name: 'Dr. Pedro Nakamura Yoshida',
    photoUrl: null, gender: 'M', lat: -23.5600, lng: -46.6500,
    addressCity: 'São Paulo', addressState: 'SP',
    addressStreet: 'R. Galvão Bueno, 540 - Liberdade', addressCep: '01506-000',
    phone: '+55 11 3209-0000', email: 'pedro.yoshida@example.com',
    claimStatus: 'VERIFIED',
    bio: 'Especialista em Medicina Tradicional Chinesa com formação direta em Beijing. Atendo com acupuntura, fitoterapia chinesa e tuiná.',
    languages: ['Português', 'Mandarim', 'Japonês'],
    education: 'MD, UNIFESP\nBachelor in TCM - Beijing University of Chinese Medicine\nEspecialização em Acupuntura - CMBA',
    consultationFee: 380, consultationCurrency: 'BRL',
    websiteUrl: null,
    avgRating: 4.8, reviewCount: 142, completenessScore: 90,
    specialties: [
      { slug: 'medicina-tradicional-chinesa', isPrimary: true },
      { slug: 'acupuntura', isPrimary: false, rqeNumber: 'RQE-78901' },
      { slug: 'fitoterapia', isPrimary: false },
    ],
    establishmentCnes: [],
    insurancePlans: ['amil'],
    reviews: [
      { rating: 5, title: 'Especialista de verdade', body: 'Passou anos estudando na China. Sabe muito sobre MTC.' },
      { rating: 5, title: 'Acupuntura transformadora', body: 'Sessões de acupuntura para dor lombar funcionaram em poucas semanas.' },
    ],
  },

  // ── Mexico — Conventional + Traditional ──────────────────────────────
  {
    country: 'MX', registryId: 'CED-8234567', registryState: 'CDMX',
    registrySource: 'CONACEM_MX', name: 'Dra. Isabel Mendoza Herrera',
    photoUrl: null, gender: 'F', lat: 19.3625, lng: -99.2559,
    addressCity: 'Ciudad de México', addressState: 'CDMX',
    addressStreet: 'Av. Carlos Graef Fernández 154', addressCep: '11650',
    phone: '+52 55 1103-1600', email: null,
    claimStatus: 'VERIFIED',
    bio: 'Endocrinóloga con enfoque en diabetes tipo 2 y trastornos tiroideos. Atención personalizada con educación del paciente.',
    languages: ['Español', 'Inglés'],
    education: 'MD, UNAM\nResidencia en Endocrinología - INCMNSZ\nFellowship en Diabetes - Joslin Diabetes Center (Boston)',
    consultationFee: 1500, consultationCurrency: 'MXN',
    websiteUrl: 'https://drmendozaendocrino.mx',
    avgRating: 4.7, reviewCount: 95, completenessScore: 92,
    specialties: [
      { slug: 'endocrinologia', isPrimary: true },
    ],
    establishmentCnes: ['6937142'],
    insurancePlans: ['gnp-mx'],
    reviews: [
      { rating: 5, title: 'Excelente endocrinóloga', body: 'Me ayudó a controlar mi diabetes con un plan claro y práctico.' },
      { rating: 5, title: 'Muy profesional', body: 'Explicó todo con paciencia. Recomiendo ampliamente.' },
    ],
  },

  // ── Colombia — Conventional + Integrative ────────────────────────────
  {
    country: 'CO', registryId: 'RM-12345-CO', registryState: 'Cundinamarca',
    registrySource: 'RETHUS_CO', name: 'Dr. Carlos Restrepo Vargas',
    photoUrl: null, gender: 'M', lat: 4.6674, lng: -74.0560,
    addressCity: 'Bogotá', addressState: 'Cundinamarca',
    addressStreet: 'Cra. 16 #82-57', addressCep: '110221',
    phone: '+57 1 530-0470', email: null,
    claimStatus: 'VERIFIED',
    bio: 'Médico internista con formación en medicina funcional. Abordaje de enfermedades crónicas desde la causa raíz.',
    languages: ['Español', 'Inglés'],
    education: 'MD, Universidad Nacional de Colombia\nEspecialización en Medicina Interna - Hospital Militar Central\nInstitute for Functional Medicine Certified Practitioner (IFMCP)',
    consultationFee: 350000, consultationCurrency: 'COP',
    websiteUrl: null,
    avgRating: 4.6, reviewCount: 58, completenessScore: 85,
    specialties: [
      { slug: 'medicina-interna', isPrimary: true },
      { slug: 'medicina-funcional', isPrimary: false },
    ],
    establishmentCnes: ['9908121'],
    insurancePlans: ['sura-co'],
    reviews: [
      { rating: 5, title: 'Médico integral', body: 'Consulta de 90 minutos. Revisó toda mi historia clínica con detalle.' },
      { rating: 4, title: 'Muy completo', body: 'Aborda los problemas desde la raíz, no solo los síntomas.' },
    ],
  },

  // ── Brazil — Oncology (claim pending) ────────────────────────────────
  {
    country: 'BR', registryId: '890123', registryState: 'SP',
    registrySource: 'CFM_BR', name: 'Dra. Patricia Vieira Lopes',
    photoUrl: null, gender: 'F', lat: -23.5505, lng: -46.6333,
    addressCity: 'São Paulo', addressState: 'SP',
    addressStreet: 'R. Dona Adma Jafet, 91', addressCep: '01308-050',
    phone: null, email: null,
    claimStatus: 'PENDING_VERIFICATION',
    bio: 'Oncologista clínica com especialização em tumores de mama.',
    languages: ['Português', 'Inglês'],
    education: 'MD, USP\nResidência em Oncologia - ICESP',
    consultationFee: null, consultationCurrency: null, websiteUrl: null,
    avgRating: 0, reviewCount: 0, completenessScore: 60,
    specialties: [
      { slug: 'oncologia', isPrimary: true, rqeNumber: 'RQE-89012' },
    ],
    establishmentCnes: ['2077485'],
    insurancePlans: ['amil', 'bradesco-saude'],
    reviews: [],
  },
];

const REVIEW_AUTHOR_SENTINELS = [
  { id: 'seed-review-author-1', email: 'seed-reviewer-1@holilabs.test', firstName: 'Seed', lastName: 'Reviewer1' },
  { id: 'seed-review-author-2', email: 'seed-reviewer-2@holilabs.test', firstName: 'Seed', lastName: 'Reviewer2' },
  { id: 'seed-review-author-3', email: 'seed-reviewer-3@holilabs.test', firstName: 'Seed', lastName: 'Reviewer3' },
] as const;

async function seedReviewAuthors() {
  console.log('Seeding review author sentinels...');
  for (const author of REVIEW_AUTHOR_SENTINELS) {
    await prisma.user.upsert({
      where: { email: author.email },
      update: {},
      create: {
        id: author.id,
        email: author.email,
        firstName: author.firstName,
        lastName: author.lastName,
        isEphemeral: true,
      },
    });
  }
  console.log(`  ${REVIEW_AUTHOR_SENTINELS.length} sentinel review authors ready`);
}

async function seedInsurancePlans() {
  console.log('Seeding insurance plans...');
  for (const plan of INSURANCE_PLANS) {
    await prisma.insurancePlan.upsert({
      where: { slug: plan.slug },
      update: {
        ansOperatorCode: plan.ans,
        operatorName: plan.operator,
        planName: plan.plan,
        country: plan.country,
      },
      create: {
        slug: plan.slug,
        ansOperatorCode: plan.ans,
        operatorName: plan.operator,
        planName: plan.plan,
        country: plan.country,
      },
    });
  }
  console.log(`  ${INSURANCE_PLANS.length} insurance plans ready`);
}

async function seedEstablishments() {
  console.log('Seeding healthcare establishments...');
  for (const est of ESTABLISHMENTS) {
    await prisma.healthcareEstablishment.upsert({
      where: { cnesCode: est.cnes },
      update: {
        name: est.name,
        tradeName: est.tradeName,
        type: est.type,
        country: est.country,
        addressCity: est.city,
        addressState: est.state,
        addressCep: est.cep,
        addressStreet: est.street,
        lat: est.lat,
        lng: est.lng,
        phone: est.phone,
      },
      create: {
        cnesCode: est.cnes,
        name: est.name,
        tradeName: est.tradeName,
        type: est.type,
        country: est.country,
        addressCity: est.city,
        addressState: est.state,
        addressCep: est.cep,
        addressStreet: est.street,
        lat: est.lat,
        lng: est.lng,
        phone: est.phone,
      },
    });
  }
  console.log(`  ${ESTABLISHMENTS.length} establishments ready`);
}

async function seedProviders() {
  console.log('Seeding providers...');
  let created = 0;
  let updated = 0;

  for (const p of PROVIDERS) {
    const existing = await prisma.physicianCatalog.findUnique({
      where: {
        country_registryId_registryState: {
          country: p.country,
          registryId: p.registryId,
          registryState: p.registryState ?? '',
        },
      },
    });

    const data = {
      country: p.country,
      registryId: p.registryId,
      registryState: p.registryState,
      registrySource: p.registrySource,
      name: p.name,
      photoUrl: p.photoUrl,
      gender: p.gender,
      lat: p.lat,
      lng: p.lng,
      addressCity: p.addressCity,
      addressState: p.addressState,
      addressStreet: p.addressStreet,
      addressCep: p.addressCep,
      phone: p.phone,
      email: p.email,
      isRegistryActive: true,
      publicProfileEnabled: true,
      claimStatus: p.claimStatus,
      claimedAt: p.claimStatus === 'VERIFIED' ? new Date() : null,
      bio: p.bio,
      languages: p.languages,
      education: p.education,
      consultationFee: p.consultationFee,
      consultationCurrency: p.consultationCurrency,
      websiteUrl: p.websiteUrl,
      avgRating: p.avgRating,
      reviewCount: p.reviewCount,
      completenessScore: p.completenessScore,
      lastSyncedAt: new Date(),
    };

    const physician = await prisma.physicianCatalog.upsert({
      where: {
        country_registryId_registryState: {
          country: p.country,
          registryId: p.registryId,
          registryState: p.registryState ?? '',
        },
      },
      update: data,
      create: data,
    });

    if (existing) updated++;
    else created++;

    // Wipe + recreate joins (idempotent way to keep seed simple)
    await prisma.physicianSpecialty.deleteMany({ where: { physicianId: physician.id } });
    await prisma.physicianEstablishment.deleteMany({ where: { physicianId: physician.id } });
    await prisma.physicianInsurancePlan.deleteMany({ where: { physicianId: physician.id } });

    // Attach specialties
    for (const spec of p.specialties) {
      const specialty = await prisma.medicalSpecialty.findUnique({ where: { slug: spec.slug } });
      if (!specialty) {
        console.warn(`  WARN: specialty '${spec.slug}' not found — run seed-specialties.ts first`);
        continue;
      }
      await prisma.physicianSpecialty.create({
        data: {
          physicianId: physician.id,
          specialtyId: specialty.id,
          isPrimary: spec.isPrimary,
          rqeNumber: spec.rqeNumber ?? null,
        },
      });
    }

    // Attach establishments
    for (const cnes of p.establishmentCnes) {
      const est = await prisma.healthcareEstablishment.findUnique({ where: { cnesCode: cnes } });
      if (!est) continue;
      await prisma.physicianEstablishment.create({
        data: {
          physicianId: physician.id,
          establishmentId: est.id,
          isPrimary: p.establishmentCnes[0] === cnes,
        },
      });
    }

    // Attach insurance plans
    for (const planSlug of p.insurancePlans) {
      const plan = await prisma.insurancePlan.findUnique({ where: { slug: planSlug } });
      if (!plan) continue;
      await prisma.physicianInsurancePlan.create({
        data: {
          physicianId: physician.id,
          insurancePlanId: plan.id,
          verificationSource: 'SELF_DECLARED',
          verifiedAt: p.claimStatus === 'VERIFIED' ? new Date() : null,
          isActive: true,
        },
      });
    }

    // Reviews — wipe all sentinel-authored reviews for this physician, then recreate
    const sentinelIds = REVIEW_AUTHOR_SENTINELS.map((a) => a.id);
    await prisma.physicianReview.deleteMany({
      where: { physicianId: physician.id, authorUserId: { in: [...sentinelIds] } },
    });
    for (let i = 0; i < p.reviews.length && i < REVIEW_AUTHOR_SENTINELS.length; i++) {
      const review = p.reviews[i];
      await prisma.physicianReview.create({
        data: {
          physicianId: physician.id,
          authorUserId: REVIEW_AUTHOR_SENTINELS[i].id,
          rating: review.rating,
          title: review.title,
          body: review.body,
          status: 'APPROVED',
        },
      });
    }
  }

  console.log(`  ${created} created, ${updated} updated (${PROVIDERS.length} total)`);
}

async function main() {
  try {
    await seedReviewAuthors();
    await seedInsurancePlans();
    await seedEstablishments();
    await seedProviders();
    console.log('\nSeed complete.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
