// @ts-nocheck — references Discipline model that is not yet in the Prisma schema
/**
 * Content Matrix Seed Script
 *
 * Transforms hardcoded templates from clinical-templates.ts into the
 * Dynamic Content Matrix relational structure.
 *
 * Run with: npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seeds/seed-content-matrix.ts
 *
 * This script:
 *   1. Creates Discipline records for each medical specialty
 *   2. Creates a "universal" discipline for cross-specialty content
 *   3. Transforms each ClinicalTemplate into a ContentDefinition with JSONB payload
 *   4. Creates ContentBlocks for variable groups within each template
 *   5. Maps definitions to disciplines via DisciplineContentMap with priority
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DISCIPLINE_SEEDS = [
  { slug: 'universal', displayName: 'Universal', description: 'Content available to all specialties' },
  { slug: 'cardiology', displayName: 'Cardiology', description: 'Heart and cardiovascular system' },
  { slug: 'internal-medicine', displayName: 'Internal Medicine', description: 'General adult medicine' },
  { slug: 'family-medicine', displayName: 'Family Medicine', description: 'Primary care for all ages' },
  { slug: 'emergency-medicine', displayName: 'Emergency Medicine', description: 'Acute and emergency care' },
  { slug: 'endocrinology', displayName: 'Endocrinology', description: 'Hormonal and metabolic disorders' },
  { slug: 'pediatrics', displayName: 'Pediatrics', description: 'Child and adolescent medicine' },
  { slug: 'oncology', displayName: 'Oncology', description: 'Cancer care and treatment' },
  { slug: 'pulmonology', displayName: 'Pulmonology', description: 'Lung and respiratory system' },
  { slug: 'neurology', displayName: 'Neurology', description: 'Brain and nervous system' },
  { slug: 'psychiatry', displayName: 'Psychiatry', description: 'Mental health and behavioral disorders' },
  { slug: 'geriatrics', displayName: 'Geriatrics', description: 'Care for elderly patients' },
  { slug: 'nephrology', displayName: 'Nephrology', description: 'Kidney and urinary system' },
  { slug: 'rheumatology', displayName: 'Rheumatology', description: 'Autoimmune and joint disorders' },
  { slug: 'dermatology', displayName: 'Dermatology', description: 'Skin conditions and disorders' },
  { slug: 'obstetrics-gynecology', displayName: 'Obstetrics & Gynecology', description: 'Reproductive health and pregnancy' },
] as const;

type ContentKindValue = 'SOAP_TEMPLATE' | 'ASSESSMENT_TEMPLATE' | 'PROCEDURE_NOTE' | 'CLINICAL_PLAYBOOK' | 'INTAKE_SCRIPT';

function mapCategoryToKind(category: string): ContentKindValue {
  switch (category) {
    case 'chief-complaint':
    case 'ros':
    case 'physical-exam':
      return 'SOAP_TEMPLATE';
    case 'assessment':
      return 'ASSESSMENT_TEMPLATE';
    case 'procedure':
      return 'PROCEDURE_NOTE';
    case 'plan':
      return 'CLINICAL_PLAYBOOK';
    case 'intake':
      return 'INTAKE_SCRIPT';
    default:
      return 'SOAP_TEMPLATE';
  }
}

function specialtyToSlug(specialty: string): string {
  return specialty
    .toLowerCase()
    .replace(/\s*&\s*/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

interface TemplateDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
  variables: string[];
  keywords: string[];
  specialties: string[];
  voiceCommand?: string;
}

const TEMPLATE_SEEDS: TemplateDefinition[] = [
  {
    id: 'pe-vitals', name: 'Vital Signs', category: 'physical-exam',
    specialties: [],
    description: 'Vital signs template',
    content: 'BP: {bp} mmHg\nHR: {hr} bpm\nRR: {rr} breaths/min\nTemp: {temp} F\nO2 Sat: {o2}%\nHeight: {height} cm\nWeight: {weight} kg\nBMI: {bmi}',
    variables: ['bp', 'hr', 'rr', 'temp', 'o2', 'height', 'weight', 'bmi'],
    keywords: ['vitals', 'bp', 'blood pressure'],
  },
  {
    id: 'pe-general', name: 'General Physical Exam', category: 'physical-exam',
    specialties: [],
    description: 'Complete physical examination',
    content: 'GENERAL: Alert, oriented x3, {appearance}, {distress} distress\nHEENT: Normocephalic. PERRL, EOMI.\nNECK: Supple, no JVD\nCV: RRR, no murmurs\nRESP: CTA bilaterally\nABD: Soft, non-tender\nEXT: No edema\nNEURO: CN II-XII intact\nSKIN: Warm, dry, intact',
    variables: ['appearance', 'distress'],
    keywords: ['physical exam', 'pe'],
  },
  {
    id: 'ros-complete', name: 'Complete ROS', category: 'ros',
    specialties: [],
    description: 'Comprehensive review of systems',
    content: 'CONSTITUTIONAL: Fever, chills, weight loss, fatigue\nEYES: Vision changes\nENT: Hearing, throat, sinus\nCV: Chest pain, palpitations\nRESP: SOB, cough\nGI: Nausea, vomiting, diarrhea\nGU: Dysuria, frequency\nMSK: Joint pain, weakness\nSKIN: Rash\nNEURO: Headache, dizziness\nPSYCH: Depression, anxiety\nAll other systems negative.',
    variables: [],
    keywords: ['ros', 'review of systems'],
  },
  {
    id: 'plan-medication', name: 'Medication Plan', category: 'plan',
    specialties: [],
    description: 'Template for medication changes',
    content: '1. Continue: {continue}\n2. Start: {start} - {indication}, {dosing}\n3. Discontinue: {discontinue} - {dc_reason}\n4. Adjust: {adjust} to {new_dose}',
    variables: ['continue', 'start', 'indication', 'dosing', 'discontinue', 'dc_reason', 'adjust', 'new_dose'],
    keywords: ['medication', 'prescribe', 'rx'],
  },
  {
    id: 'cc-chest-pain', name: 'Chest Pain', category: 'chief-complaint',
    specialties: ['Cardiology', 'Internal Medicine', 'Emergency Medicine', 'Family Medicine'],
    description: 'Chest pain assessment',
    content: 'Location: {location}. Quality: {quality}. Duration: {duration}. Severity: {severity}/10. Radiation: {radiation}. Symptoms: {symptoms}.',
    variables: ['location', 'quality', 'duration', 'severity', 'radiation', 'symptoms'],
    keywords: ['chest pain', 'cardiac', 'angina'],
  },
  {
    id: 'pe-cardiac', name: 'Cardiac Exam', category: 'physical-exam',
    specialties: ['Cardiology', 'Internal Medicine'],
    description: 'Focused cardiac examination',
    content: 'PMI: {pmi_location}. Rate {hr} bpm, {rhythm}. S1/S2: {s1s2}. Murmurs: {murmurs}. Edema: {edema}. JVP: {jvp} cm.',
    variables: ['pmi_location', 'hr', 'rhythm', 's1s2', 'murmurs', 'edema', 'jvp'],
    keywords: ['cardiac', 'heart'],
  },
  {
    id: 'assessment-hypertension', name: 'Hypertension Assessment', category: 'assessment',
    specialties: ['Cardiology', 'Internal Medicine', 'Family Medicine', 'Nephrology'],
    description: 'Hypertension assessment and staging',
    content: 'Stage: {stage} (BP {bp}). Factors: {factors}. End-organ damage: {end_organ}. Management: {current_management}. ASCVD risk: {ascvd_risk}%.',
    variables: ['stage', 'bp', 'factors', 'end_organ', 'current_management', 'ascvd_risk'],
    keywords: ['hypertension', 'htn'],
  },
  {
    id: 'assessment-chf', name: 'Heart Failure Assessment', category: 'assessment',
    specialties: ['Cardiology', 'Internal Medicine'],
    description: 'Heart failure classification and management',
    content: 'NYHA Class: {nyha_class}. EF: {ef}% ({hf_type}). BNP: {bnp} pg/mL. Volume: {volume_status}. GDMT: {gdmt}.',
    variables: ['nyha_class', 'ef', 'hf_type', 'bnp', 'volume_status', 'gdmt'],
    keywords: ['heart failure', 'chf', 'nyha'],
  },
  {
    id: 'assessment-diabetes', name: 'Diabetes Assessment', category: 'assessment',
    specialties: ['Endocrinology', 'Internal Medicine', 'Family Medicine'],
    description: 'Diabetes management assessment',
    content: 'Type {type} DM. HbA1c: {hba1c}% ({control}). Complications: {complications}. Management: {current_management}. Target: <{target}%.',
    variables: ['type', 'hba1c', 'control', 'complications', 'current_management', 'target'],
    keywords: ['diabetes', 'dm'],
  },
  {
    id: 'pe-neurological', name: 'Neurological Exam', category: 'physical-exam',
    specialties: ['Neurology', 'Emergency Medicine'],
    description: 'Focused neurological examination',
    content: 'Mental Status: Oriented x{orientation}. CN II-XII: {cn_findings}. Motor: {strength}. Sensory: intact. Reflexes: {reflexes}. Babinski: {babinski}. Gait: {gait}. Romberg: {romberg}.',
    variables: ['orientation', 'cn_findings', 'strength', 'reflexes', 'babinski', 'gait', 'romberg'],
    keywords: ['neurological', 'neuro'],
  },
  {
    id: 'assessment-ckd', name: 'CKD Assessment', category: 'assessment',
    specialties: ['Nephrology', 'Internal Medicine', 'Endocrinology'],
    description: 'Chronic kidney disease staging',
    content: 'Stage: {ckd_stage} (eGFR {egfr}). UACR: {uacr} mg/g. Cr: {creatinine}. K: {potassium}. Hgb: {hemoglobin}. ACEi/ARB: {raas_blocker}.',
    variables: ['ckd_stage', 'egfr', 'uacr', 'creatinine', 'potassium', 'hemoglobin', 'raas_blocker'],
    keywords: ['ckd', 'renal', 'kidney'],
  },
  {
    id: 'assessment-depression', name: 'Depression Assessment', category: 'assessment',
    specialties: ['Psychiatry', 'Family Medicine', 'Internal Medicine'],
    description: 'MDD assessment with PHQ-9',
    content: 'PHQ-9: {phq9} ({phq9_severity}). Duration: {duration}. SI: {si}. Safety plan: {safety_plan}. Medications: {medications}. Therapy: {therapy}.',
    variables: ['phq9', 'phq9_severity', 'duration', 'si', 'safety_plan', 'medications', 'therapy'],
    keywords: ['depression', 'mdd', 'phq9'],
  },
  {
    id: 'pe-skin-lesion', name: 'Skin Lesion Exam', category: 'physical-exam',
    specialties: ['Dermatology', 'Family Medicine'],
    description: 'Structured skin lesion (ABCDE)',
    content: 'Location: {location}. Size: {size}. Shape: {shape}. Color: {color}. Border: {border}. ABCDE: A={asymmetry}, B={border_regularity}, C={color_uniformity}, D={diameter}, E={evolution}.',
    variables: ['location', 'size', 'shape', 'color', 'border', 'asymmetry', 'border_regularity', 'color_uniformity', 'diameter', 'evolution'],
    keywords: ['skin', 'lesion', 'dermatology'],
  },
  {
    id: 'assessment-well-child', name: 'Well-Child Visit', category: 'assessment',
    specialties: ['Pediatrics', 'Family Medicine'],
    description: 'Developmental assessment',
    content: 'Age: {age}. Wt: {weight} kg ({weight_percentile}%ile). Ht: {height} cm ({height_percentile}%ile). Development: gross motor {gross_motor}, fine motor {fine_motor}, language {language}. Immunizations: {immunizations}.',
    variables: ['age', 'weight', 'weight_percentile', 'height', 'height_percentile', 'gross_motor', 'fine_motor', 'language', 'immunizations'],
    keywords: ['well child', 'pediatric'],
  },
  {
    id: 'assessment-prenatal', name: 'Prenatal Visit', category: 'assessment',
    specialties: ['Obstetrics & Gynecology', 'Family Medicine'],
    description: 'Routine prenatal documentation',
    content: 'GA: {ga} weeks. G{gravida}P{para}. Wt: {weight} kg. BP: {bp}. FH: {fundal_height} cm. FHR: {fhr} bpm. Presentation: {presentation}.',
    variables: ['ga', 'gravida', 'para', 'weight', 'bp', 'fundal_height', 'fhr', 'presentation'],
    keywords: ['prenatal', 'pregnancy', 'obstetric'],
  },
];

async function seedContentMatrix() {
  console.log('Seeding Dynamic Content Matrix...\n');

  const disciplineMap = new Map<string, string>();

  for (const disc of DISCIPLINE_SEEDS) {
    const record = await prisma.discipline.upsert({
      where: { slug: disc.slug },
      update: { displayName: disc.displayName, description: disc.description },
      create: { slug: disc.slug, displayName: disc.displayName, description: disc.description, status: 'ACTIVE' },
    });
    disciplineMap.set(disc.slug, record.id);
    console.log(`  Discipline: ${disc.displayName} (${record.id})`);
  }

  console.log(`\n  Created ${disciplineMap.size} disciplines.\n`);

  let definitionCount = 0;
  let mappingCount = 0;
  let blockCount = 0;

  for (const template of TEMPLATE_SEEDS) {
    const kind = mapCategoryToKind(template.category);

    const schemaPayload = {
      templateContent: template.content,
      variables: template.variables.map((v) => ({
        name: v,
        type: 'text' as const,
        required: false,
        placeholder: v.replace(/_/g, ' '),
      })),
      keywords: template.keywords,
      voiceCommand: template.voiceCommand ?? null,
      category: template.category,
    };

    const definition = await prisma.contentDefinition.upsert({
      where: {
        canonicalKey_version_locale: {
          canonicalKey: template.id,
          version: 1,
          locale: 'en',
        },
      },
      update: {
        title: template.name,
        summary: template.description,
        schemaPayload,
        lifecycleStatus: 'PUBLISHED',
        publishedAt: new Date(),
      },
      create: {
        canonicalKey: template.id,
        kind,
        title: template.name,
        summary: template.description,
        personaTarget: 'CLINICIAN',
        lifecycleStatus: 'PUBLISHED',
        version: 1,
        locale: 'en',
        schemaPayload,
        publishedAt: new Date(),
      },
    });

    definitionCount++;

    if (template.variables.length > 0) {
      const blockKey = `vars-${template.id}`;
      const block = await prisma.contentBlock.upsert({
        where: { blockKey },
        update: {
          title: `${template.name} Variables`,
          schemaPayload: {
            variables: template.variables.map((v) => ({
              name: v,
              type: 'text',
              placeholder: v.replace(/_/g, ' '),
            })),
          },
        },
        create: {
          blockKey,
          kind: 'VARIABLE_GROUP',
          title: `${template.name} Variables`,
          schemaPayload: {
            variables: template.variables.map((v) => ({
              name: v,
              type: 'text',
              placeholder: v.replace(/_/g, ' '),
            })),
          },
        },
      });

      await prisma.contentDefinitionBlock.upsert({
        where: {
          contentDefinitionId_contentBlockId_ordinal: {
            contentDefinitionId: definition.id,
            contentBlockId: block.id,
            ordinal: 0,
          },
        },
        update: {},
        create: {
          contentDefinitionId: definition.id,
          contentBlockId: block.id,
          ordinal: 0,
          isRequired: true,
        },
      });

      blockCount++;
    }

    const targetSlugs =
      template.specialties.length === 0
        ? ['universal']
        : template.specialties.map(specialtyToSlug);

    for (const slug of targetSlugs) {
      const disciplineId = disciplineMap.get(slug);
      if (!disciplineId) {
        console.warn(`    WARNING: No discipline found for slug "${slug}" (template: ${template.id})`);
        continue;
      }

      const isUniversal = slug === 'universal';

      await prisma.disciplineContentMap.upsert({
        where: {
          disciplineId_contentDefinitionId: {
            disciplineId,
            contentDefinitionId: definition.id,
          },
        },
        update: { priority: isUniversal ? 1000 : 100 },
        create: {
          disciplineId,
          contentDefinitionId: definition.id,
          priority: isUniversal ? 1000 : 100,
          isRequired: true,
          overlapGroup: template.category === 'ros' ? 'core-ros' : null,
        },
      });

      mappingCount++;
    }

    console.log(`  Content: ${template.name} -> ${targetSlugs.join(', ')}`);
  }

  console.log(`\n  Seeding complete.`);
  console.log(`    Definitions: ${definitionCount}`);
  console.log(`    Blocks: ${blockCount}`);
  console.log(`    Mappings: ${mappingCount}`);
}

seedContentMatrix()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
