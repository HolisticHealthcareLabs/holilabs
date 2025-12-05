/**
 * Clinical Guidelines Rules
 *
 * Evidence-based clinical guidelines and recommendations
 * Sources: USPSTF, ACC/AHA, ADA, CDC
 *
 * @compliance Evidence-Based Medicine
 */

import type { ClinicalGuideline, GuidelineRecommendation } from '../types';

/**
 * US Preventive Services Task Force (USPSTF) Guidelines
 */
export const CLINICAL_GUIDELINES: ClinicalGuideline[] = [
  // Hypertension Management (ACC/AHA 2017)
  {
    id: 'htn-management-001',
    title: 'Hypertension Management - ACC/AHA Guidelines',
    description: 'Evidence-based guidelines for diagnosis and management of hypertension in adults',
    source: 'American College of Cardiology / American Heart Association',
    sourceUrl: 'https://www.acc.org/guidelines',
    evidenceStrength: 'A',
    conditions: ['I10'], // ICD-10 for essential hypertension
    recommendations: [
      {
        id: 'htn-rec-001',
        text: 'Initiate antihypertensive drug therapy for adults with confirmed hypertension and known cardiovascular disease or 10-year ASCVD risk ≥10%',
        strength: 'strong',
        evidenceLevel: 'A',
        category: 'treatment',
        population: 'Adults with stage 1 hypertension (SBP 130-139 or DBP 80-89 mmHg)',
        considerations: ['ASCVD risk calculation', 'Patient preference', 'Comorbidities'],
      },
      {
        id: 'htn-rec-002',
        text: 'Target BP <130/80 mmHg for most adults with hypertension',
        strength: 'strong',
        evidenceLevel: 'A',
        category: 'treatment',
        population: 'Adults with hypertension',
        contraindications: ['Advanced age with frailty', 'Limited life expectancy'],
      },
    ],
    datePublished: '2017-11-13',
    dateLastUpdated: '2017-11-13',
    version: '1.0',
  },

  // Diabetes Screening (ADA 2024)
  {
    id: 'dm-screening-002',
    title: 'Type 2 Diabetes Screening - ADA Standards of Care',
    description: 'Screening recommendations for type 2 diabetes mellitus in asymptomatic adults',
    source: 'American Diabetes Association',
    sourceUrl: 'https://diabetesjournals.org/care/issue',
    evidenceStrength: 'B',
    conditions: ['E11.9'], // Type 2 diabetes
    recommendations: [
      {
        id: 'dm-screen-001',
        text: 'Screen for type 2 diabetes in asymptomatic adults aged ≥35 years',
        strength: 'strong',
        evidenceLevel: 'B',
        category: 'screening',
        population: 'Adults aged 35 years and older',
        considerations: ['BMI ≥25 kg/m²', 'First-degree relative with diabetes', 'High-risk ethnicity'],
      },
      {
        id: 'dm-screen-002',
        text: 'Screen for type 2 diabetes in adults with overweight/obesity (BMI ≥25 or ≥23 in Asian Americans) with one or more additional risk factors',
        strength: 'strong',
        evidenceLevel: 'B',
        category: 'screening',
        population: 'Adults with overweight/obesity',
        considerations: ['Physical inactivity', 'Hypertension', 'Dyslipidemia', 'PCOS', 'History of GDM'],
      },
    ],
    datePublished: '2024-01-01',
    dateLastUpdated: '2024-01-01',
    version: '2024',
  },

  // Colorectal Cancer Screening (USPSTF)
  {
    id: 'crc-screening-003',
    title: 'Colorectal Cancer Screening - USPSTF',
    description: 'Screening for colorectal cancer in average-risk adults',
    source: 'US Preventive Services Task Force',
    sourceUrl: 'https://www.uspreventiveservicestaskforce.org/',
    evidenceStrength: 'A',
    conditions: ['Z12.11'], // Encounter for screening for colorectal cancer
    recommendations: [
      {
        id: 'crc-screen-001',
        text: 'Screen for colorectal cancer in all adults aged 45 to 75 years',
        strength: 'strong',
        evidenceLevel: 'A',
        category: 'screening',
        population: 'Adults aged 45-75 years',
        considerations: ['Family history', 'Personal history of polyps', 'Inflammatory bowel disease'],
      },
      {
        id: 'crc-screen-002',
        text: 'Multiple screening options available: colonoscopy every 10 years, FIT annually, or FIT-DNA every 1-3 years',
        strength: 'strong',
        evidenceLevel: 'A',
        category: 'screening',
        population: 'Average-risk adults',
        considerations: ['Patient preference', 'Access to screening', 'Completion rates'],
      },
    ],
    datePublished: '2021-05-18',
    dateLastUpdated: '2021-05-18',
    version: '2021',
  },

  // Statin Therapy for CVD Prevention (USPSTF)
  {
    id: 'statin-cvd-004',
    title: 'Statin Use for Primary Prevention of CVD - USPSTF',
    description: 'Recommendations for statin therapy to prevent cardiovascular disease',
    source: 'US Preventive Services Task Force',
    sourceUrl: 'https://www.uspreventiveservicestaskforce.org/',
    evidenceStrength: 'B',
    conditions: ['Z13.6'], // Encounter for screening for CVD
    recommendations: [
      {
        id: 'statin-rec-001',
        text: 'Prescribe a statin for primary prevention of CVD in adults aged 40 to 75 years with ≥1 CVD risk factor and a 10-year CVD risk of ≥10%',
        strength: 'strong',
        evidenceLevel: 'B',
        category: 'prevention',
        population: 'Adults 40-75 years with elevated CVD risk',
        contraindications: ['Active liver disease', 'Pregnancy/breastfeeding', 'Myopathy'],
        considerations: ['LDL >70 mg/dL', 'Risk discussion with patient', 'Shared decision-making'],
      },
    ],
    datePublished: '2022-08-23',
    dateLastUpdated: '2022-08-23',
    version: '2022',
  },

  // Breast Cancer Screening (USPSTF)
  {
    id: 'breast-screening-005',
    title: 'Breast Cancer Screening - USPSTF',
    description: 'Screening mammography recommendations for breast cancer',
    source: 'US Preventive Services Task Force',
    sourceUrl: 'https://www.uspreventiveservicestaskforce.org/',
    evidenceStrength: 'B',
    conditions: ['Z12.31'], // Encounter for screening mammogram
    recommendations: [
      {
        id: 'breast-screen-001',
        text: 'Biennial screening mammography for women aged 50 to 74 years',
        strength: 'strong',
        evidenceLevel: 'B',
        category: 'screening',
        population: 'Women aged 50-74 years',
        considerations: ['Family history', 'Personal preference', 'Prior history of breast cancer'],
      },
      {
        id: 'breast-screen-002',
        text: 'Decision to start biennial screening before age 50 should be individualized',
        strength: 'weak',
        evidenceLevel: 'C',
        category: 'screening',
        population: 'Women aged 40-49 years',
        considerations: ['Patient values', 'Benefit-harm ratio', 'Risk factors'],
      },
    ],
    datePublished: '2024-04-30',
    dateLastUpdated: '2024-04-30',
    version: '2024',
  },

  // Aspirin for CVD Prevention (USPSTF)
  {
    id: 'aspirin-cvd-006',
    title: 'Aspirin Use for Primary Prevention of CVD - USPSTF',
    description: 'Low-dose aspirin for cardiovascular disease prevention',
    source: 'US Preventive Services Task Force',
    sourceUrl: 'https://www.uspreventiveservicestaskforce.org/',
    evidenceStrength: 'C',
    conditions: ['Z13.6'], // CVD screening
    recommendations: [
      {
        id: 'aspirin-rec-001',
        text: 'Decision to initiate low-dose aspirin should be individualized for adults aged 40 to 59 years with ≥10% 10-year CVD risk',
        strength: 'conditional',
        evidenceLevel: 'C',
        category: 'prevention',
        population: 'Adults 40-59 years with elevated CVD risk',
        contraindications: ['Increased bleeding risk', 'History of GI bleeding', 'Active peptic ulcer'],
        considerations: ['Bleeding risk assessment', 'Patient preference', 'Age >60 years: recommendation against'],
      },
    ],
    datePublished: '2022-04-26',
    dateLastUpdated: '2022-04-26',
    version: '2022',
  },

  // Depression Screening (USPSTF)
  {
    id: 'depression-screening-007',
    title: 'Depression Screening in Adults - USPSTF',
    description: 'Screening for depression in the general adult population',
    source: 'US Preventive Services Task Force',
    sourceUrl: 'https://www.uspreventiveservicestaskforce.org/',
    evidenceStrength: 'B',
    conditions: ['Z13.89'], // Encounter for screening for other disorder
    recommendations: [
      {
        id: 'depression-screen-001',
        text: 'Screen for depression in the general adult population, including pregnant and postpartum women',
        strength: 'strong',
        evidenceLevel: 'B',
        category: 'screening',
        population: 'All adults including pregnant/postpartum women',
        considerations: ['Adequate systems for diagnosis, treatment, and follow-up', 'PHQ-2 or PHQ-9'],
      },
    ],
    datePublished: '2023-06-20',
    dateLastUpdated: '2023-06-20',
    version: '2023',
  },

  // Lung Cancer Screening (USPSTF)
  {
    id: 'lung-screening-008',
    title: 'Lung Cancer Screening - USPSTF',
    description: 'Low-dose CT screening for lung cancer in high-risk adults',
    source: 'US Preventive Services Task Force',
    sourceUrl: 'https://www.uspreventiveservicestaskforce.org/',
    evidenceStrength: 'B',
    conditions: ['Z12.2'], // Encounter for screening for lung cancer
    recommendations: [
      {
        id: 'lung-screen-001',
        text: 'Annual screening for lung cancer with low-dose CT in adults aged 50 to 80 years with 20 pack-year smoking history and currently smoke or quit within past 15 years',
        strength: 'strong',
        evidenceLevel: 'B',
        category: 'screening',
        population: 'Adults 50-80 years, 20 pack-year history',
        contraindications: ['Life expectancy <10 years', 'Unable to undergo curative surgery'],
        considerations: ['Smoking cessation counseling', 'Shared decision-making', 'Discontinue once quit >15 years'],
      },
    ],
    datePublished: '2021-03-09',
    dateLastUpdated: '2021-03-09',
    version: '2021',
  },
];

/**
 * Find applicable guidelines for a patient
 */
export function findApplicableGuidelines(context: {
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  conditions?: string[]; // ICD-10 codes
  riskFactors?: string[];
}): ClinicalGuideline[] {
  const applicable: ClinicalGuideline[] = [];

  for (const guideline of CLINICAL_GUIDELINES) {
    // Check if guideline applies to patient's conditions
    const hasCondition = context.conditions?.some(code =>
      guideline.conditions.includes(code)
    );

    // Check age-based screening guidelines
    if (guideline.id.includes('screening') && context.age) {
      const isAgeAppropriate = checkAgeAppropriateness(guideline, context.age, context.gender);
      if (isAgeAppropriate) {
        applicable.push(guideline);
        continue;
      }
    }

    // Check prevention guidelines
    if (guideline.id.includes('prevention') || guideline.id.includes('cvd')) {
      if (context.riskFactors && context.riskFactors.length > 0) {
        applicable.push(guideline);
      }
    }

    // Add if has matching condition
    if (hasCondition) {
      applicable.push(guideline);
    }
  }

  return applicable;
}

/**
 * Check if age is appropriate for guideline
 */
function checkAgeAppropriateness(
  guideline: ClinicalGuideline,
  age: number,
  gender?: string
): boolean {
  // Colorectal cancer: 45-75
  if (guideline.id === 'crc-screening-003') {
    return age >= 45 && age <= 75;
  }

  // Breast cancer: 40-74 (women only)
  if (guideline.id === 'breast-screening-005') {
    return gender === 'female' && age >= 40 && age <= 74;
  }

  // Diabetes screening: 35+
  if (guideline.id === 'dm-screening-002') {
    return age >= 35;
  }

  // Lung cancer: 50-80
  if (guideline.id === 'lung-screening-008') {
    return age >= 50 && age <= 80;
  }

  // Statin/aspirin: 40-75
  if (guideline.id.includes('statin') || guideline.id.includes('aspirin')) {
    return age >= 40 && age <= 75;
  }

  return false;
}

/**
 * Get guideline strength color
 */
export function getGuidelineStrengthColor(strength: string): string {
  switch (strength) {
    case 'A':
      return '#10B981'; // Green 500
    case 'B':
      return '#3B82F6'; // Blue 500
    case 'C':
      return '#F59E0B'; // Amber 500
    case 'D':
      return '#EF4444'; // Red 500
    default:
      return '#6B7280'; // Gray 500
  }
}
