import { PrismaClient, TemplateCategory } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Common Clinical Templates
 * Production-ready templates for common clinical scenarios
 */
export const clinicalTemplates = [
  // Chief Complaints
  {
    name: 'Chest Pain',
    description: 'Chief complaint template for chest pain presentation',
    category: 'CHIEF_COMPLAINT' as TemplateCategory,
    specialty: 'Cardiology',
    shortcut: 'cc:chest',
    content: 'Patient presents with {{location}} chest pain, {{quality}} in nature, {{duration}} duration. Pain {{radiation}}. Associated symptoms include {{symptoms}}. Aggravating factors: {{aggravating}}. Relieving factors: {{relieving}}.',
    variables: [
      { name: 'location', type: 'text', default: 'substernal' },
      { name: 'quality', type: 'text', default: 'pressure-like' },
      { name: 'duration', type: 'text', default: '30 minutes' },
      { name: 'radiation', type: 'text', default: 'radiates to left arm' },
      { name: 'symptoms', type: 'text', default: 'shortness of breath, diaphoresis' },
      { name: 'aggravating', type: 'text', default: 'exertion' },
      { name: 'relieving', type: 'text', default: 'rest' },
    ],
    isPublic: true,
    isOfficial: true,
  },
  {
    name: 'Headache',
    description: 'Chief complaint for headache presentation',
    category: 'CHIEF_COMPLAINT' as TemplateCategory,
    specialty: 'Neurology',
    shortcut: 'cc:ha',
    content: 'Patient reports {{type}} headache, {{location}}, {{severity}}/10 severity. Onset {{onset}}. Frequency: {{frequency}}. Duration: {{duration}}. Associated with {{symptoms}}.',
    variables: [
      { name: 'type', type: 'text', default: 'throbbing' },
      { name: 'location', type: 'text', default: 'bilateral' },
      { name: 'severity', type: 'number', default: '7' },
      { name: 'onset', type: 'text', default: '2 days ago' },
      { name: 'frequency', type: 'text', default: 'daily' },
      { name: 'duration', type: 'text', default: '4-6 hours' },
      { name: 'symptoms', type: 'text', default: 'photophobia, nausea' },
    ],
    isPublic: true,
    isOfficial: true,
  },

  // Physical Exam
  {
    name: 'Cardiac Exam - Normal',
    description: 'Normal cardiovascular examination',
    category: 'PHYSICAL_EXAM' as TemplateCategory,
    specialty: 'Cardiology',
    shortcut: 'pe:cardiac',
    content: 'Cardiovascular: Regular rate and rhythm. S1 and S2 normal. No murmurs, rubs, or gallops. Peripheral pulses 2+ bilaterally. No peripheral edema. JVP not elevated. Capillary refill <2 seconds.',
    variables: [],
    isPublic: true,
    isOfficial: true,
  },
  {
    name: 'Respiratory Exam - Normal',
    description: 'Normal respiratory examination',
    category: 'PHYSICAL_EXAM' as TemplateCategory,
    specialty: 'Pulmonology',
    shortcut: 'pe:resp',
    content: 'Respiratory: Chest symmetrical, normal respiratory effort. Clear to auscultation bilaterally. No wheezes, rales, or rhonchi. Resonant to percussion. No use of accessory muscles.',
    variables: [],
    isPublic: true,
    isOfficial: true,
  },

  // Assessment & Plan
  {
    name: 'Hypertension Management',
    description: 'Assessment and plan for hypertension',
    category: 'PLAN' as TemplateCategory,
    specialty: 'Primary Care',
    shortcut: 'plan:htn',
    content: `Hypertension ({{icd10}}):
- Current BP: {{bp}}
- Target BP: <140/90
- Continue {{medication}} {{dose}}
- Lifestyle modifications: {{lifestyle}}
- Monitor home BP readings
- Labs: {{labs}}
- Follow-up in {{followup}}`,
    variables: [
      { name: 'icd10', type: 'text', default: 'I10' },
      { name: 'bp', type: 'text', default: '145/92' },
      { name: 'medication', type: 'text', default: 'Lisinopril' },
      { name: 'dose', type: 'text', default: '10mg daily' },
      { name: 'lifestyle', type: 'text', default: 'low sodium diet, regular exercise' },
      { name: 'labs', type: 'text', default: 'BMP, lipid panel' },
      { name: 'followup', type: 'text', default: '3 months' },
    ],
    isPublic: true,
    isOfficial: true,
  },
  {
    name: 'Type 2 Diabetes Management',
    description: 'Comprehensive diabetes management plan',
    category: 'PLAN' as TemplateCategory,
    specialty: 'Endocrinology',
    shortcut: 'plan:dm2',
    content: `Type 2 Diabetes Mellitus (E11.9):
- HbA1c: {{a1c}}% (Goal: <7%)
- Current medications: {{medications}}
- Blood glucose monitoring: {{bgm}}
- Diabetic foot exam: {{footexam}}
- Ophthalmology referral: {{ophthalm}}
- Nephrology: Check microalbumin, GFR
- Counseling: {{counseling}}
- Follow-up: {{followup}}`,
    variables: [
      { name: 'a1c', type: 'number', default: '7.8' },
      { name: 'medications', type: 'text', default: 'Metformin 1000mg BID' },
      { name: 'bgm', type: 'text', default: 'fasting and pre-dinner' },
      { name: 'footexam', type: 'text', default: 'intact sensation, no ulcers' },
      { name: 'ophthalm', type: 'text', default: 'due this year' },
      { name: 'counseling', type: 'text', default: 'diet, exercise, medication adherence' },
      { name: 'followup', type: 'text', default: '3 months' },
    ],
    isPublic: true,
    isOfficial: true,
  },

  // Prescriptions
  {
    name: 'Antibiotic - Amoxicillin',
    description: 'Standard amoxicillin prescription',
    category: 'PRESCRIPTION' as TemplateCategory,
    specialty: 'Primary Care',
    shortcut: 'rx:amoxi',
    content: 'Amoxicillin {{strength}} PO {{frequency}} for {{duration}} days. Dispense: {{dispense}}. Refills: 0. Indication: {{indication}}',
    variables: [
      { name: 'strength', type: 'text', default: '500mg' },
      { name: 'frequency', type: 'text', default: 'TID' },
      { name: 'duration', type: 'number', default: '7' },
      { name: 'dispense', type: 'number', default: '21' },
      { name: 'indication', type: 'text', default: 'bacterial infection' },
    ],
    isPublic: true,
    isOfficial: true,
  },

  // Patient Education
  {
    name: 'Post-Visit Instructions - URI',
    description: 'Upper respiratory infection aftercare',
    category: 'PATIENT_EDUCATION' as TemplateCategory,
    specialty: 'Primary Care',
    shortcut: 'edu:uri',
    content: `Upper Respiratory Infection Care:
1. Rest and hydrate (8-10 glasses of water daily)
2. OTC medications: acetaminophen for fever/pain, decongestants as needed
3. Humidifier or steam inhalation
4. Avoid smoking and irritants
5. Hand washing to prevent spread
6. Return if: fever >101°F for >3 days, difficulty breathing, symptoms worsen after 7-10 days
7. Most viral URIs resolve in 7-14 days
8. Antibiotics not needed unless bacterial infection suspected`,
    variables: [],
    isPublic: true,
    isOfficial: true,
  },
  {
    name: 'Medication Reconciliation',
    description: 'Standard medication list review',
    category: 'ASSESSMENT' as TemplateCategory,
    specialty: 'Primary Care',
    shortcut: 'medrec',
    content: `Medication Reconciliation Performed:
Current medications reviewed with patient. List updated in chart.
- Continue all current medications as prescribed
- Added: {{added}}
- Discontinued: {{discontinued}}
- Changed: {{changed}}
- Compliance: {{compliance}}
- Adverse effects: {{adverse}}
- Patient education provided`,
    variables: [
      { name: 'added', type: 'text', default: 'none' },
      { name: 'discontinued', type: 'text', default: 'none' },
      { name: 'changed', type: 'text', default: 'none' },
      { name: 'compliance', type: 'text', default: 'good' },
      { name: 'adverse', type: 'text', default: 'none reported' },
    ],
    isPublic: true,
    isOfficial: true,
  },

  // Progress Notes
  {
    name: 'Follow-up Visit - Stable',
    description: 'Routine follow-up for stable chronic conditions',
    category: 'PROGRESS_NOTE' as TemplateCategory,
    specialty: 'Primary Care',
    shortcut: 'progress:stable',
    content: `Patient returns for routine follow-up. Overall doing well. Chronic conditions stable on current management.

Subjective: {{subjective}}
Review of Systems: Negative except as noted above
Physical Exam: {{exam}}
Assessment: Chronic conditions stable, no acute issues
Plan: Continue current medications, routine monitoring, follow-up in {{followup}}`,
    variables: [
      { name: 'subjective', type: 'text', default: 'No new complaints. Medications well tolerated.' },
      { name: 'exam', type: 'text', default: 'Vitals stable. Exam unremarkable.' },
      { name: 'followup', type: 'text', default: '3-6 months' },
    ],
    isPublic: true,
    isOfficial: true,
  },
];

export async function seedClinicalTemplates(userId: string) {
  console.log('Seeding clinical templates...');

  for (const template of clinicalTemplates) {
    await prisma.clinicalTemplate.upsert({
      where: {
        shortcut: template.shortcut || `${template.category.toLowerCase()}-${template.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {
        ...template,
        createdById: userId,
        variables: template.variables as any,
      },
      create: {
        ...template,
        createdById: userId,
        variables: template.variables as any,
      },
    });
  }

  console.log(` Seeded ${clinicalTemplates.length} clinical templates`);
}
