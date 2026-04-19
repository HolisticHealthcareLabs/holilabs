import { PrismaClient, MedicalSystemType } from '@prisma/client';

const prisma = new PrismaClient();

interface SpecialtySeed {
  slug: string;
  displayPt: string;
  displayEs: string;
  displayEn: string;
  cfmCode?: string;
  nuccCode?: string;
  systemType: MedicalSystemType;
  isCam: boolean;
  pnpicRecognized?: boolean;
  isAreaOfExpertise?: boolean;
  parentSlug?: string;
}

const SPECIALTIES: SpecialtySeed[] = [
  // ── Conventional Medicine (CFM-recognized) ────────────────────────────
  { slug: 'cardiologia', displayPt: 'Cardiologia', displayEs: 'Cardiología', displayEn: 'Cardiology', cfmCode: '10', nuccCode: '207RC0000X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'dermatologia', displayPt: 'Dermatologia', displayEs: 'Dermatología', displayEn: 'Dermatology', cfmCode: '15', nuccCode: '207N00000X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'endocrinologia', displayPt: 'Endocrinologia', displayEs: 'Endocrinología', displayEn: 'Endocrinology', cfmCode: '19', nuccCode: '207RE0101X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'gastroenterologia', displayPt: 'Gastroenterologia', displayEs: 'Gastroenterología', displayEn: 'Gastroenterology', cfmCode: '23', nuccCode: '207RG0100X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'geriatria', displayPt: 'Geriatria', displayEs: 'Geriatría', displayEn: 'Geriatrics', cfmCode: '24', nuccCode: '207QG0300X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'ginecologia-obstetricia', displayPt: 'Ginecologia e Obstetrícia', displayEs: 'Ginecología y Obstetricia', displayEn: 'OB/GYN', cfmCode: '25', nuccCode: '207V00000X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'infectologia', displayPt: 'Infectologia', displayEs: 'Infectología', displayEn: 'Infectious Disease', cfmCode: '30', nuccCode: '207RI0200X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'medicina-familia', displayPt: 'Medicina de Família e Comunidade', displayEs: 'Medicina Familiar', displayEn: 'Family Medicine', cfmCode: '32', nuccCode: '207Q00000X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'medicina-interna', displayPt: 'Clínica Médica', displayEs: 'Medicina Interna', displayEn: 'Internal Medicine', cfmCode: '11', nuccCode: '207R00000X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'nefrologia', displayPt: 'Nefrologia', displayEs: 'Nefrología', displayEn: 'Nephrology', cfmCode: '36', nuccCode: '207RN0300X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'neurologia', displayPt: 'Neurologia', displayEs: 'Neurología', displayEn: 'Neurology', cfmCode: '37', nuccCode: '2084N0400X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'oftalmologia', displayPt: 'Oftalmologia', displayEs: 'Oftalmología', displayEn: 'Ophthalmology', cfmCode: '40', nuccCode: '207W00000X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'ortopedia', displayPt: 'Ortopedia e Traumatologia', displayEs: 'Ortopedia y Traumatología', displayEn: 'Orthopedics', cfmCode: '42', nuccCode: '207X00000X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'otorrinolaringologia', displayPt: 'Otorrinolaringologia', displayEs: 'Otorrinolaringología', displayEn: 'ENT / Otolaryngology', cfmCode: '43', nuccCode: '207Y00000X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'pediatria', displayPt: 'Pediatria', displayEs: 'Pediatría', displayEn: 'Pediatrics', cfmCode: '44', nuccCode: '208000000X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'pneumologia', displayPt: 'Pneumologia', displayEs: 'Neumología', displayEn: 'Pulmonology', cfmCode: '45', nuccCode: '207RP1001X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'psiquiatria', displayPt: 'Psiquiatria', displayEs: 'Psiquiatría', displayEn: 'Psychiatry', cfmCode: '47', nuccCode: '2084P0800X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'radiologia', displayPt: 'Radiologia', displayEs: 'Radiología', displayEn: 'Radiology', cfmCode: '48', nuccCode: '2085R0202X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'reumatologia', displayPt: 'Reumatologia', displayEs: 'Reumatología', displayEn: 'Rheumatology', cfmCode: '49', nuccCode: '207RR0500X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'urologia', displayPt: 'Urologia', displayEs: 'Urología', displayEn: 'Urology', cfmCode: '51', nuccCode: '208800000X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'cirurgia-geral', displayPt: 'Cirurgia Geral', displayEs: 'Cirugía General', displayEn: 'General Surgery', cfmCode: '12', nuccCode: '208600000X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'anestesiologia', displayPt: 'Anestesiologia', displayEs: 'Anestesiología', displayEn: 'Anesthesiology', cfmCode: '3', nuccCode: '207L00000X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'oncologia', displayPt: 'Oncologia Clínica', displayEs: 'Oncología', displayEn: 'Oncology', cfmCode: '41', nuccCode: '207RX0202X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'medicina-emergencia', displayPt: 'Medicina de Emergência', displayEs: 'Medicina de Emergencia', displayEn: 'Emergency Medicine', cfmCode: '33', nuccCode: '207P00000X', systemType: 'CONVENTIONAL', isCam: false },
  { slug: 'patologia', displayPt: 'Patologia', displayEs: 'Patología', displayEn: 'Pathology', cfmCode: '46', nuccCode: '207ZP0102X', systemType: 'CONVENTIONAL', isCam: false },

  // ── Integrative Medicine ──────────────────────────────────────────────
  { slug: 'medicina-integrativa', displayPt: 'Medicina Integrativa', displayEs: 'Medicina Integrativa', displayEn: 'Integrative Medicine', nuccCode: '207RI0011X', systemType: 'INTEGRATIVE', isCam: true, pnpicRecognized: true },
  { slug: 'medicina-funcional', displayPt: 'Medicina Funcional', displayEs: 'Medicina Funcional', displayEn: 'Functional Medicine', systemType: 'INTEGRATIVE', isCam: true },
  { slug: 'medicina-ortomolecular', displayPt: 'Medicina Ortomolecular', displayEs: 'Medicina Ortomolecular', displayEn: 'Orthomolecular Medicine', systemType: 'INTEGRATIVE', isCam: true, pnpicRecognized: true },
  { slug: 'nutrologia', displayPt: 'Nutrologia', displayEs: 'Nutrología', displayEn: 'Nutrology', cfmCode: '39', systemType: 'INTEGRATIVE', isCam: false },

  // ── Traditional Medicine Systems ──────────────────────────────────────
  { slug: 'medicina-tradicional-chinesa', displayPt: 'Medicina Tradicional Chinesa', displayEs: 'Medicina Tradicional China', displayEn: 'Traditional Chinese Medicine', systemType: 'TRADITIONAL', isCam: true, pnpicRecognized: true },
  { slug: 'ayurveda', displayPt: 'Ayurveda', displayEs: 'Ayurveda', displayEn: 'Ayurveda', systemType: 'TRADITIONAL', isCam: true, pnpicRecognized: true },
  { slug: 'medicina-antroposofica', displayPt: 'Medicina Antroposófica', displayEs: 'Medicina Antroposófica', displayEn: 'Anthroposophic Medicine', systemType: 'TRADITIONAL', isCam: true, pnpicRecognized: true },

  // ── Complementary Practices ───────────────────────────────────────────
  { slug: 'acupuntura', displayPt: 'Acupuntura', displayEs: 'Acupuntura', displayEn: 'Acupuncture', cfmCode: '1', nuccCode: '171100000X', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'homeopatia', displayPt: 'Homeopatia', displayEs: 'Homeopatía', displayEn: 'Homeopathy', cfmCode: '29', nuccCode: '175H00000X', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'naturopatia', displayPt: 'Naturopatia', displayEs: 'Naturopatía', displayEn: 'Naturopathy', nuccCode: '175F00000X', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'quiropraxia', displayPt: 'Quiropraxia', displayEs: 'Quiropráctica', displayEn: 'Chiropractic', nuccCode: '111N00000X', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'osteopatia', displayPt: 'Osteopatia', displayEs: 'Osteopatía', displayEn: 'Osteopathy', nuccCode: '171M00000X', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'fitoterapia', displayPt: 'Fitoterapia', displayEs: 'Fitoterapia', displayEn: 'Phytotherapy / Herbal Medicine', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'aromaterapia', displayPt: 'Aromaterapia', displayEs: 'Aromaterapia', displayEn: 'Aromatherapy', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'musicoterapia', displayPt: 'Musicoterapia', displayEs: 'Musicoterapia', displayEn: 'Music Therapy', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'reflexologia', displayPt: 'Reflexologia', displayEs: 'Reflexología', displayEn: 'Reflexology', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'reiki', displayPt: 'Reiki', displayEs: 'Reiki', displayEn: 'Reiki', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'yoga-terapeutico', displayPt: 'Yoga Terapêutico', displayEs: 'Yoga Terapéutico', displayEn: 'Therapeutic Yoga', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'meditacao', displayPt: 'Meditação', displayEs: 'Meditación', displayEn: 'Meditation Therapy', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'terapia-floral', displayPt: 'Terapia Floral', displayEs: 'Terapia Floral', displayEn: 'Flower Essence Therapy', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'hipnose-clinica', displayPt: 'Hipnose Clínica', displayEs: 'Hipnosis Clínica', displayEn: 'Clinical Hypnosis', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
  { slug: 'ozonioterapia', displayPt: 'Ozonioterapia', displayEs: 'Ozonoterapia', displayEn: 'Ozone Therapy', systemType: 'COMPLEMENTARY', isCam: true, pnpicRecognized: true },
];

async function seedSpecialties() {
  console.log('Seeding medical specialties (conventional + CAM)...');

  let created = 0;
  let updated = 0;

  for (const spec of SPECIALTIES) {
    const data = {
      displayPt: spec.displayPt,
      displayEs: spec.displayEs,
      displayEn: spec.displayEn,
      cfmCode: spec.cfmCode ?? null,
      nuccCode: spec.nuccCode ?? null,
      systemType: spec.systemType,
      isCam: spec.isCam,
      pnpicRecognized: spec.pnpicRecognized ?? false,
      isAreaOfExpertise: spec.isAreaOfExpertise ?? false,
    };

    const existing = await prisma.medicalSpecialty.findUnique({ where: { slug: spec.slug } });
    await prisma.medicalSpecialty.upsert({
      where: { slug: spec.slug },
      update: data,
      create: { slug: spec.slug, ...data },
    });

    if (existing) {
      updated++;
    } else {
      created++;
    }
  }

  console.log(`Specialties seeded: ${created} created, ${updated} updated (${SPECIALTIES.length} total)`);
}

async function main() {
  try {
    await seedSpecialties();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
