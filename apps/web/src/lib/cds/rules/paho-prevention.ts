/**
 * PAHO (Pan American Health Organization) Prevention Protocols
 *
 * Evidence-based preventive care guidelines for Latin America and Caribbean
 * Adapted from PAHO's Better Care for NCDs Initiative
 *
 * Focus: Integrated care for multiple comorbidities in primary care settings
 * Target: Community health centers, rural clinics, underserved populations
 *
 * Sources:
 * - PAHO Clinical Guidelines Dashboard (22 countries, 300+ guidelines)
 * - PAHO Better Care for NCDs Technical Package
 * - PAHO Pocket Book of Primary Health Care
 *
 * @compliance PAHO, WHO
 */

import type { CDSRule, CDSAlert, CDSContext } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * PAHO PROTOCOL 1: Integrated NCD Risk Assessment
 *
 * Multi-disease screening for: Hypertension, Diabetes, CVD, COPD
 * Optimized for low-resource primary care settings
 */
export const PAHO_INTEGRATED_NCD_SCREENING: CDSRule = {
  id: 'paho-integrated-ncd-screening',
  name: 'PAHO Integrated NCD Risk Assessment',
  description: 'Comprehensive screening for noncommunicable diseases in primary care',
  category: 'preventive-care',
  severity: 'info',
  triggerHooks: ['patient-view', 'encounter-start'],
  priority: 6,
  enabled: true,
  evidenceStrength: 'B',
  source: 'PAHO Better Care for NCDs Initiative',

  condition: (context) => {
    const demographics = context.context.demographics;

    // Applicable to adults 30+ years
    return !!demographics && demographics.age >= 30;
  },

  evaluate: (context) => {
    const demographics = context.context.demographics!;
    const vitals = context.context.vitalSigns;
    const conditions = context.context.conditions || [];
    const labResults = context.context.labResults || [];

    // Check which screenings are needed
    const screeningGaps: Array<{ test: string; reason: string; frequency: string }> = [];

    // 1. Hypertension screening
    if (!vitals?.bloodPressureSystolic) {
      screeningGaps.push({
        test: 'Blood Pressure Measurement',
        reason: 'Universal screening for adults',
        frequency: 'Annually if normal, more frequent if elevated',
      });
    }

    // 2. Diabetes screening (if high risk)
    const hasGlucoseResult = labResults.some(lab =>
      lab.testName.toLowerCase().includes('glucose') ||
      lab.testName.toLowerCase().includes('hba1c')
    );

    const diabetesRiskFactors = [];
    if (demographics.age >= 45) diabetesRiskFactors.push('Age ≥45 years');
    if (vitals?.bmi && vitals.bmi >= 25) diabetesRiskFactors.push('Overweight/Obesity');
    if (conditions.some(c => c.icd10Code?.startsWith('I10'))) diabetesRiskFactors.push('Hypertension');
    if (demographics.gender === 'female') diabetesRiskFactors.push('Possible GDM history');

    if (!hasGlucoseResult && diabetesRiskFactors.length >= 2) {
      screeningGaps.push({
        test: 'Diabetes Screening (Fasting Glucose)',
        reason: `${diabetesRiskFactors.length} risk factors: ${diabetesRiskFactors.join(', ')}`,
        frequency: 'Every 3 years if normal',
      });
    }

    // 3. Lipid screening for CVD risk
    const hasCholesterol = labResults.some(lab =>
      lab.testName.toLowerCase().includes('cholesterol')
    );

    if (!hasCholesterol && demographics.age >= 40) {
      screeningGaps.push({
        test: 'Lipid Profile (Total Cholesterol minimum)',
        reason: 'CVD risk assessment for adults ≥40 years',
        frequency: 'Every 5 years if normal',
      });
    }

    // 4. BMI assessment
    if (!vitals?.bmi && vitals?.weight && vitals?.height) {
      const heightM = vitals.height / 100;
      const bmi = vitals.weight / (heightM * heightM);
      screeningGaps.push({
        test: `BMI Calculation (Current: ${bmi.toFixed(1)})`,
        reason: 'Obesity screening and weight management',
        frequency: 'At every visit',
      });
    }

    // 5. Smoking status
    if (demographics.smoking === undefined) {
      screeningGaps.push({
        test: 'Tobacco Use Assessment',
        reason: 'Leading preventable cause of death',
        frequency: 'At every visit',
      });
    }

    // 6. Cervical cancer screening (women 30-65)
    if (demographics.gender === 'female' && demographics.age >= 30 && demographics.age <= 65) {
      const hasPapTest = labResults.some(lab =>
        lab.testName.toLowerCase().includes('pap') ||
        lab.testName.toLowerCase().includes('cervical')
      );

      if (!hasPapTest) {
        screeningGaps.push({
          test: 'Cervical Cancer Screening (Pap test or HPV test)',
          reason: 'PAHO cervical cancer prevention program',
          frequency: 'Every 3-5 years if normal',
        });
      }
    }

    // 7. Breast cancer screening (women 50-69)
    if (demographics.gender === 'female' && demographics.age >= 50 && demographics.age <= 69) {
      const hasMammogram = labResults.some(lab =>
        lab.testName.toLowerCase().includes('mammogram') ||
        lab.testName.toLowerCase().includes('breast')
      );

      if (!hasMammogram) {
        screeningGaps.push({
          test: 'Breast Cancer Screening (Mammography)',
          reason: 'PAHO breast cancer early detection program',
          frequency: 'Every 2 years (ages 50-69)',
        });
      }
    }

    if (screeningGaps.length === 0) {
      return null;
    }

    const screeningList = screeningGaps.map((gap, index) =>
      `${index + 1}. **${gap.test}**\n   - Indication: ${gap.reason}\n   - Frequency: ${gap.frequency}`
    ).join('\n\n');

    return {
      id: uuidv4(),
      ruleId: 'paho-integrated-ncd-screening',
      summary: `${screeningGaps.length} Preventive Screening${screeningGaps.length > 1 ? 's' : ''} Recommended`,
      detail: `**PAHO Integrated NCD Risk Assessment**\n\n**Patient**: ${demographics.age}yo ${demographics.gender}\n\n**Recommended Screenings** (${screeningGaps.length}):\n\n${screeningList}\n\n---\n\n💡 **PAHO Integrated Care Approach**: Screen for multiple NCDs simultaneously to improve early detection and reduce disease burden in primary care.`,
      severity: 'info',
      category: 'preventive-care',
      indicator: 'info',
      source: {
        label: 'PAHO Better Care for NCDs',
        url: 'https://www.paho.org/en/better-care-ncds-initiative',
      },
      suggestions: [
        {
          label: 'Order recommended screening tests',
          isRecommended: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };
  },
};

/**
 * PAHO PROTOCOL 2: Vaccination Recommendations for Adults
 *
 * Based on PAHO Immunization Program for Latin America/Caribbean
 */
export const PAHO_ADULT_IMMUNIZATION: CDSRule = {
  id: 'paho-adult-immunization',
  name: 'PAHO Adult Immunization Schedule',
  description: 'Evidence-based vaccine recommendations for adults in Latin America',
  category: 'preventive-care',
  severity: 'info',
  triggerHooks: ['patient-view', 'encounter-start'],
  priority: 5,
  enabled: true,
  evidenceStrength: 'A',
  source: 'PAHO Immunization Program',

  condition: (context) => {
    return !!context.context.demographics;
  },

  evaluate: (context) => {
    const demographics = context.context.demographics!;
    const conditions = context.context.conditions || [];

    const vaccineRecommendations: Array<{
      vaccine: string;
      indication: string;
      priority: 'high' | 'routine' | 'conditional';
    }> = [];

    // 1. Influenza vaccine (annual)
    if (demographics.age >= 50 || conditions.length > 0) {
      vaccineRecommendations.push({
        vaccine: 'Influenza (Annual)',
        indication: demographics.age >= 65 ?
          'Adults ≥65 years (high priority)' :
          'Adults with chronic conditions or age ≥50',
        priority: demographics.age >= 65 ? 'high' : 'routine',
      });
    }

    // 2. Pneumococcal vaccine
    if (demographics.age >= 65 || conditions.some(c =>
      c.icd10Code?.startsWith('E11') || // Diabetes
      c.icd10Code?.startsWith('I') || // Cardiovascular
      c.icd10Code?.startsWith('J') // Respiratory
    )) {
      vaccineRecommendations.push({
        vaccine: 'Pneumococcal (PCV13 + PPSV23)',
        indication: 'Adults ≥65 or with chronic medical conditions',
        priority: 'high',
      });
    }

    // 3. Tetanus-diphtheria booster
    vaccineRecommendations.push({
      vaccine: 'Td (Tetanus-Diphtheria) Booster',
      indication: 'All adults every 10 years',
      priority: 'routine',
    });

    // 4. COVID-19 vaccine
    vaccineRecommendations.push({
      vaccine: 'COVID-19 (Updated)',
      indication: 'All adults per current PAHO guidelines',
      priority: demographics.age >= 60 ? 'high' : 'routine',
    });

    // 5. Hepatitis B (if high risk)
    if (demographics.age < 60) {
      vaccineRecommendations.push({
        vaccine: 'Hepatitis B (3-dose series)',
        indication: 'Healthcare workers, high-risk adults',
        priority: 'conditional',
      });
    }

    // 6. MMR (if no immunity)
    if (demographics.age < 50) {
      vaccineRecommendations.push({
        vaccine: 'MMR (Measles-Mumps-Rubella)',
        indication: 'Adults born after 1957 without documentation',
        priority: 'conditional',
      });
    }

    // 7. Varicella (if no immunity)
    if (demographics.age < 50) {
      vaccineRecommendations.push({
        vaccine: 'Varicella (Chickenpox)',
        indication: 'Adults without history of chickenpox',
        priority: 'conditional',
      });
    }

    // 8. Herpes Zoster (Shingles)
    if (demographics.age >= 50) {
      vaccineRecommendations.push({
        vaccine: 'Herpes Zoster (Shingles - Shingrix)',
        indication: 'Adults ≥50 years (2-dose series)',
        priority: demographics.age >= 60 ? 'routine' : 'conditional',
      });
    }

    // 9. HPV vaccine (if eligible)
    if (demographics.age <= 26) {
      vaccineRecommendations.push({
        vaccine: 'HPV (Human Papillomavirus)',
        indication: 'Adults through age 26 (catch-up vaccination)',
        priority: 'routine',
      });
    } else if (demographics.age <= 45) {
      vaccineRecommendations.push({
        vaccine: 'HPV (Human Papillomavirus)',
        indication: 'Adults 27-45 years (shared clinical decision)',
        priority: 'conditional',
      });
    }

    // 10. Hepatitis A (if high risk)
    vaccineRecommendations.push({
      vaccine: 'Hepatitis A (2-dose series)',
      indication: 'Adults with chronic liver disease or high-risk travel',
      priority: 'conditional',
    });

    // Organize by priority
    const highPriority = vaccineRecommendations.filter(v => v.priority === 'high');
    const routine = vaccineRecommendations.filter(v => v.priority === 'routine');
    const conditional = vaccineRecommendations.filter(v => v.priority === 'conditional');

    let vaccineList = '';

    if (highPriority.length > 0) {
      vaccineList += '**HIGH PRIORITY**:\n' + highPriority.map(v =>
        `- ${v.vaccine}\n  ${v.indication}`
      ).join('\n') + '\n\n';
    }

    if (routine.length > 0) {
      vaccineList += '**ROUTINE**:\n' + routine.map(v =>
        `- ${v.vaccine}\n  ${v.indication}`
      ).join('\n') + '\n\n';
    }

    if (conditional.length > 0) {
      vaccineList += '**CONDITIONAL (Assess Eligibility)**:\n' + conditional.map(v =>
        `- ${v.vaccine}\n  ${v.indication}`
      ).join('\n');
    }

    return {
      id: uuidv4(),
      ruleId: 'paho-adult-immunization',
      summary: `Adult Immunization Schedule Review`,
      detail: `**PAHO Adult Immunization Recommendations**\n\n**Patient**: ${demographics.age}yo ${demographics.gender}\n\n${vaccineList}\n\n---\n\n💉 **Note**: Review immunization records and update per PAHO guidelines. Vaccine-preventable diseases remain a significant cause of morbidity and mortality in adults.`,
      severity: 'info',
      category: 'preventive-care',
      indicator: 'info',
      source: {
        label: 'PAHO Immunization Program',
        url: 'https://www.paho.org/en/immunization',
      },
      suggestions: [
        {
          label: 'Review immunization records',
          isRecommended: true,
        },
        {
          label: 'Order recommended vaccines',
          isRecommended: highPriority.length > 0,
        },
      ],
      timestamp: new Date().toISOString(),
    };
  },
};

/**
 * PAHO PROTOCOL 3: Mental Health Screening (Depression & Anxiety)
 *
 * Based on PAHO's Mental Health Strategy for the Region of the Americas
 */
export const PAHO_MENTAL_HEALTH_SCREENING: CDSRule = {
  id: 'paho-mental-health-screening',
  name: 'PAHO Mental Health Screening Protocol',
  description: 'Depression and anxiety screening in primary care settings',
  category: 'preventive-care',
  severity: 'info',
  triggerHooks: ['patient-view', 'encounter-start'],
  priority: 6,
  enabled: true,
  evidenceStrength: 'B',
  source: 'PAHO Mental Health Strategy',

  condition: (context) => {
    const demographics = context.context.demographics;
    return !!demographics && demographics.age >= 18;
  },

  evaluate: (context) => {
    const demographics = context.context.demographics!;
    const conditions = context.context.conditions || [];

    // Check if depression/anxiety already diagnosed
    const hasMentalHealthDx = conditions.some(c =>
      c.icd10Code?.startsWith('F3') || // Mood disorders
      c.icd10Code?.startsWith('F4') || // Anxiety disorders
      c.display.toLowerCase().includes('depression') ||
      c.display.toLowerCase().includes('anxiety')
    );

    // Risk factors for mental health issues
    const riskFactors: string[] = [];
    if (conditions.length >= 2) riskFactors.push('Multiple chronic conditions');
    if (conditions.some(c => c.icd10Code?.startsWith('E11'))) riskFactors.push('Diabetes');
    if (conditions.some(c => c.icd10Code?.startsWith('I'))) riskFactors.push('Cardiovascular disease');
    if (demographics.age >= 65) riskFactors.push('Older adult');
    if (demographics.gender === 'female') riskFactors.push('Female (higher depression risk)');

    if (!hasMentalHealthDx && riskFactors.length === 0) {
      // No risk factors, routine screening only
      return {
        id: uuidv4(),
        ruleId: 'paho-mental-health-screening',
        summary: 'Mental Health Screening Recommended',
        detail: `**PAHO Mental Health Screening Protocol**\n\n**Patient**: ${demographics.age}yo ${demographics.gender}\n\n**Recommendation**: Screen all adults for depression and anxiety in primary care settings.\n\n**Screening Tools** (Choose one):\n\n1. **PHQ-2 (Ultra-brief - 2 questions)**\n   - "Over the past 2 weeks, how often bothered by:"\n   - Little interest or pleasure in doing things?\n   - Feeling down, depressed, or hopeless?\n   - Scoring: 0-6 (≥3 = positive, use PHQ-9)\n\n2. **PHQ-9 (Depression - 9 questions)**\n   - Comprehensive depression screening\n   - Scoring: 0-27 (≥10 = moderate depression)\n\n3. **GAD-7 (Anxiety - 7 questions)**\n   - Generalized anxiety disorder screening\n   - Scoring: 0-21 (≥10 = moderate anxiety)\n\n**Next Steps**:\n- Screen annually or when clinically indicated\n- If positive, assess suicide risk and refer as needed\n- Consider brief psychological interventions in primary care`,
        severity: 'info',
        category: 'preventive-care',
        indicator: 'info',
        source: {
          label: 'PAHO Mental Health Strategy',
          url: 'https://www.paho.org/en/mental-health-and-substance-use',
        },
        timestamp: new Date().toISOString(),
      };
    }

    if (riskFactors.length >= 2 && !hasMentalHealthDx) {
      return {
        id: uuidv4(),
        ruleId: 'paho-mental-health-screening',
        summary: `Mental Health Screening Recommended (${riskFactors.length} Risk Factors)`,
        detail: `**PAHO Mental Health Screening Protocol**\n\n**Patient**: ${demographics.age}yo ${demographics.gender}\n\n**Risk Factors Present** (${riskFactors.length}):\n${riskFactors.map(r => `- ${r}`).join('\n')}\n\n⚠️ **High-Risk Patient**: Multiple risk factors for depression/anxiety detected.\n\n**Recommended Action**:\n\n1. **Screen using PHQ-9 and GAD-7**\n2. **Assess for**:\n   - Sleep disturbances\n   - Changes in appetite/weight\n   - Loss of interest in activities\n   - Concentration difficulties\n   - Suicidal ideation (CRITICAL)\n\n3. **If positive screen**:\n   - Rule out medical causes (thyroid, anemia, medications)\n   - Assess severity and suicide risk\n   - Consider brief psychological intervention or referral\n   - May consider SSRI therapy if moderate-severe\n\n**Follow-up**: Every 2-4 weeks until stable`,
        severity: 'info',
        category: 'preventive-care',
        indicator: 'info',
        source: {
          label: 'PAHO Mental Health Strategy',
          url: 'https://www.paho.org/en/mental-health-and-substance-use',
        },
        suggestions: [
          {
            label: 'Screen with PHQ-9 and GAD-7',
            isRecommended: true,
          },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  },
};

/**
 * PAHO PROTOCOL 4: Chronic Respiratory Disease Management (COPD/Asthma)
 *
 * Simplified management for resource-limited settings
 */
export const PAHO_RESPIRATORY_MANAGEMENT: CDSRule = {
  id: 'paho-respiratory-management',
  name: 'PAHO Chronic Respiratory Disease Management',
  description: 'COPD and asthma management for primary care in limited-resource settings',
  category: 'guideline-recommendation',
  severity: 'info',
  triggerHooks: ['patient-view', 'encounter-start'],
  priority: 7,
  enabled: true,
  evidenceStrength: 'B',
  source: 'PAHO/WHO Chronic Respiratory Disease Management',

  condition: (context) => {
    const conditions = context.context.conditions || [];

    // Trigger for COPD or Asthma diagnosis
    return conditions.some(c =>
      c.icd10Code?.startsWith('J44') || // COPD
      c.icd10Code?.startsWith('J45') || // Asthma
      c.display.toLowerCase().includes('copd') ||
      c.display.toLowerCase().includes('asthma')
    );
  },

  evaluate: (context) => {
    const demographics = context.context.demographics!;
    const conditions = context.context.conditions || [];
    const medications = context.context.medications || [];

    const hasCOPD = conditions.some(c =>
      c.icd10Code?.startsWith('J44') || c.display.toLowerCase().includes('copd')
    );

    const hasAsthma = conditions.some(c =>
      c.icd10Code?.startsWith('J45') || c.display.toLowerCase().includes('asthma')
    );

    // Check for appropriate controller medications
    const hasInhaledCorticosteroid = medications.some(m =>
      m.name.toLowerCase().includes('budesonide') ||
      m.name.toLowerCase().includes('fluticasone') ||
      m.name.toLowerCase().includes('beclomethasone')
    );

    const hasBronchodilator = medications.some(m =>
      m.name.toLowerCase().includes('salbutamol') ||
      m.name.toLowerCase().includes('albuterol') ||
      m.name.toLowerCase().includes('formoterol') ||
      m.name.toLowerCase().includes('salmeterol') ||
      m.name.toLowerCase().includes('tiotropium')
    );

    let recommendations: string[] = [];
    let disease = '';
    let severity: 'info' | 'warning' = 'info';

    if (hasCOPD) {
      disease = 'COPD';

      recommendations = [
        '**PAHO/WHO COPD Management Essentials**:',
        '',
        '1. **Smoking Cessation** (MOST IMPORTANT)',
        '   - Brief counseling at every visit',
        '   - Consider nicotine replacement if available',
        '',
        '2. **Pharmacological Treatment**:',
      ];

      if (!hasBronchodilator) {
        severity = 'warning';
        recommendations.push('   ⚠️ **ADD: Short-acting bronchodilator** (Salbutamol inhaler 100mcg, 2 puffs PRN)');
      } else {
        recommendations.push('   ✅ Has bronchodilator therapy');
      }

      if (!hasInhaledCorticosteroid && hasBronchodilator) {
        recommendations.push('   📋 Consider adding inhaled corticosteroid if frequent exacerbations');
      }

      recommendations.push(
        '',
        '3. **Non-Pharmacological**:',
        '   - Pulmonary rehabilitation (if available)',
        '   - Breathing exercises',
        '   - Annual influenza vaccination',
        '   - Pneumococcal vaccination',
        '',
        '4. **Monitor for Exacerbations**:',
        '   - Increased dyspnea, cough, sputum',
        '   - May require oral corticosteroids + antibiotics',
        '',
        '5. **Follow-up**: Every 3-6 months when stable'
      );
    } else if (hasAsthma) {
      disease = 'Asthma';

      recommendations = [
        '**PAHO/WHO Asthma Management Essentials**:',
        '',
        '1. **Controller Therapy** (Essential for persistent asthma):',
      ];

      if (!hasInhaledCorticosteroid) {
        severity = 'warning';
        recommendations.push('   ⚠️ **MISSING: Inhaled corticosteroid**');
        recommendations.push('   📋 START: Budesonide 200mcg twice daily OR Beclomethasone 100-200mcg twice daily');
      } else {
        recommendations.push('   ✅ Has inhaled corticosteroid (controller)');
      }

      recommendations.push('');
      recommendations.push('2. **Reliever Therapy** (Rescue inhaler):');

      if (!hasBronchodilator) {
        severity = 'warning';
        recommendations.push('   ⚠️ **MISSING: Short-acting bronchodilator**');
        recommendations.push('   📋 ADD: Salbutamol inhaler 100mcg, 2 puffs PRN');
      } else {
        recommendations.push('   ✅ Has rescue inhaler (salbutamol/albuterol)');
      }

      recommendations.push(
        '',
        '3. **Trigger Avoidance**:',
        '   - Identify and avoid asthma triggers',
        '   - Tobacco smoke exposure',
        '   - Indoor air pollution (cooking smoke)',
        '',
        '4. **Inhaler Technique**:',
        '   - Demonstrate proper technique at every visit',
        '   - Consider spacer device if available',
        '',
        '5. **Asthma Action Plan**:',
        '   - Green zone: Well-controlled, continue medications',
        '   - Yellow zone: Worsening, increase reliever use',
        '   - Red zone: Severe, seek emergency care',
        '',
        '6. **Follow-up**: Monthly until controlled, then every 3 months'
      );
    }

    return {
      id: uuidv4(),
      ruleId: 'paho-respiratory-management',
      summary: `${disease} Management Review`,
      detail: `**Patient**: ${demographics.age}yo ${demographics.gender} with ${disease}\n\n${recommendations.join('\n')}\n\n---\n\n💡 **PAHO Approach**: Simplified management protocols using essential medicines available in most primary care settings.`,
      severity,
      category: 'guideline-recommendation',
      indicator: severity,
      source: {
        label: 'PAHO/WHO Chronic Respiratory Guidelines',
        url: 'https://www.paho.org/en/topics/chronic-respiratory-diseases',
      },
      suggestions: [
        {
          label: 'Review and adjust respiratory medications',
          isRecommended: severity === 'warning',
        },
        {
          label: 'Demonstrate inhaler technique',
          isRecommended: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };
  },
};

/**
 * Export all PAHO prevention rules
 */
export const PAHO_PREVENTION_RULES: CDSRule[] = [
  PAHO_INTEGRATED_NCD_SCREENING,
  PAHO_ADULT_IMMUNIZATION,
  PAHO_MENTAL_HEALTH_SCREENING,
  PAHO_RESPIRATORY_MANAGEMENT,
];
