/**
 * Holi Labs - Longitudinal Prevention Intervention Library
 *
 * Comprehensive library of 100+ evidence-based prevention interventions
 * Organized by category and health domain
 *
 * Evidence Levels:
 * - STRONG: Level A evidence (multiple RCTs, meta-analyses)
 * - MODERATE: Level B evidence (limited RCTs, observational studies)
 * - EMERGING: Level C evidence (case studies, expert opinion)
 *
 * @version 1.0.0
 * @lastUpdated 2025-10-25
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type HealthDomain =
  | 'cardiometabolic'
  | 'oncology'
  | 'musculoskeletal'
  | 'neurocognitive'
  | 'gut'
  | 'immune'
  | 'hormonal';

export type InterventionType =
  | 'screening'      // Diagnostic tests, imaging
  | 'lab'           // Blood work, biomarkers
  | 'lifestyle'     // Exercise, sleep, stress
  | 'supplement'    // Vitamins, minerals, botanicals
  | 'diet'          // Nutrition, eating patterns
  | 'exercise'      // Specific movement protocols
  | 'medication'    // Pharmaceuticals
  | 'referral'      // Specialist consultation
  | 'education';    // Patient coaching

export type EvidenceLevel = 'STRONG' | 'MODERATE' | 'EMERGING';

export type AgeGroup = 'all' | '18-29' | '18-39' | '30-39' | '40-49' | '50-59' | '50-64' | '60-69' | '65-79' | '70+' | '80+';

export type Gender = 'all' | 'male' | 'female';

export interface InterventionProtocol {
  dosage?: string;
  frequency: string;
  duration: string;
  instructions: string;
  monitoring?: string;
}

export interface Contraindication {
  condition: string;
  severity?: 'absolute' | 'relative';
  alternative?: string;
  type?: string;
}

export interface Intervention {
  id: string;
  name: string;
  category: string;
  domain: HealthDomain;
  type: InterventionType;

  // Medical Information
  description: string;
  evidenceLevel: EvidenceLevel;
  evidenceSummary: string;
  primaryCitations: string[];

  // Clinical Criteria
  targetAgeGroup: AgeGroup[];
  targetGender: Gender;
  indications: string[];
  contraindications: Contraindication[];

  // Implementation
  protocol: InterventionProtocol;
  estimatedCost: {
    min: number;
    max: number;
    currency: 'USD';
    covered: boolean; // Insurance coverage typical
  };

  // Outcomes
  expectedOutcomes: string[];
  timeToEffect: string;
  successMetrics: string[];

  // Clinical Decision Support
  requiredLabValues?: string[];
  requiredAssessments?: string[];
  clinicianNotes?: string;
}

// ============================================================================
// FOUNDATIONAL & LIFESTYLE INTERVENTIONS (10)
// ============================================================================

const lifestyleInterventions: Intervention[] = [
  {
    id: 'lifestyle-001',
    name: 'Circadian Rhythm Optimization',
    category: 'Lifestyle',
    domain: 'neurocognitive',
    type: 'lifestyle',

    description: 'Comprehensive sleep hygiene and circadian alignment protocol to optimize metabolic health, cognitive function, and longevity.',
    evidenceLevel: 'STRONG',
    evidenceSummary: 'Sleep duration and quality are strongly associated with cardiovascular health, metabolic syndrome prevention, cognitive performance, and all-cause mortality. RCTs demonstrate improvements in glucose metabolism, blood pressure, and mental health with sleep optimization.',
    primaryCitations: [
      'Cappuccio FP, et al. Sleep duration and all-cause mortality: a systematic review and meta-analysis. Sleep. 2010',
      'Czeisler CA. Impact of sleepiness and sleep deficiency on public health. NEJM. 2013',
      'Walker MP. Why We Sleep: Unlocking the Power of Sleep and Dreams. 2017'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Anyone with <7-9 hours sleep per night',
      'Shift workers',
      'Travelers with jet lag',
      'Metabolic syndrome',
      'Cognitive decline',
      'Mood disorders'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Daily',
      duration: 'Ongoing',
      instructions: `
        1. Maintain consistent sleep-wake schedule (±30 min daily)
        2. Target 7-9 hours sleep (adults), 8-10 hours (teens)
        3. Morning: 10-30 min bright light exposure within 1 hour of waking
        4. Afternoon: Optional 10-20 min power nap before 3 PM
        5. Evening: Dim lights 2 hours before bed, avoid blue light (screens)
        6. Bedroom: Cool (65-68°F), dark (blackout curtains), quiet
        7. Avoid: Caffeine after 2 PM, alcohol within 3 hours of bed, heavy meals late
      `,
      monitoring: 'Sleep diary or wearable tracking (Oura, Whoop, Apple Watch)'
    },

    estimatedCost: {
      min: 0,
      max: 300,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Improved sleep quality and duration',
      'Enhanced cognitive function and mood',
      'Better blood glucose regulation',
      'Reduced cardiovascular risk markers'
    ],
    timeToEffect: '2-4 weeks',
    successMetrics: [
      'Sleep efficiency >85%',
      'Wake after sleep onset <20 min',
      'Sleep latency <20 min',
      'REM + deep sleep >30% of total'
    ],

    clinicianNotes: 'Consider CBT-I (Cognitive Behavioral Therapy for Insomnia) referral for persistent insomnia. Screen for sleep apnea (STOP-BANG score) if appropriate.'
  },

  {
    id: 'lifestyle-002',
    name: 'Zone 2 Cardiovascular Training',
    category: 'Lifestyle',
    domain: 'cardiometabolic',
    type: 'exercise',

    description: 'Low-intensity steady-state cardio training to improve mitochondrial function, metabolic flexibility, and longevity.',
    evidenceLevel: 'STRONG',
    evidenceSummary: 'Zone 2 training (60-70% max HR) enhances mitochondrial density, fat oxidation, and insulin sensitivity. Associated with reduced all-cause mortality and cardiovascular events.',
    primaryCitations: [
      'Attia P, et al. The role of Zone 2 training in longevity. 2022',
      'Hawley JA. Molecular responses to strength and endurance training. Sports Med. 2009',
      'Seiler S. What is best practice for training intensity distribution in endurance athletes? Int J Sports Physiol Perform. 2010'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Cardiovascular disease prevention',
      'Metabolic syndrome',
      'Type 2 diabetes',
      'Pre-diabetes',
      'General fitness maintenance'
    ],
    contraindications: [
      {
        condition: 'Unstable angina',
        severity: 'absolute',
        alternative: 'Medical clearance required first'
      },
      {
        condition: 'Severe aortic stenosis',
        severity: 'absolute',
        alternative: 'Cardiac clearance required'
      }
    ],

    protocol: {
      frequency: '3-5 sessions per week',
      duration: '45-60 minutes per session',
      instructions: `
        1. Calculate Zone 2 heart rate: (180 - age) ± 10 bpm
        2. Or use "conversational pace" - can speak in sentences
        3. Activities: Walking, jogging, cycling, swimming, rowing
        4. Maintain consistent HR throughout session
        5. Monitor with heart rate strap or watch
        6. Build gradually: Start 20 min, progress to 60 min
      `,
      monitoring: 'Heart rate monitor, lactate threshold testing optional'
    },

    estimatedCost: {
      min: 0,
      max: 150,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Improved mitochondrial function',
      'Enhanced fat oxidation (metabolic flexibility)',
      'Lower resting heart rate',
      'Improved VO2 max over time',
      'Better insulin sensitivity'
    ],
    timeToEffect: '8-12 weeks',
    successMetrics: [
      'Can sustain Zone 2 HR for 45-60 min',
      'Resting HR decreases 5-10 bpm',
      'Improved lactate clearance'
    ],

    requiredAssessments: ['Baseline fitness assessment', 'Resting heart rate', 'Blood pressure'],
    clinicianNotes: 'Screen for cardiovascular disease before starting. Consider stress test for high-risk patients (age >45M, >55F with risk factors).'
  },

  {
    id: 'lifestyle-003',
    name: 'Resistance Training Protocol',
    category: 'Lifestyle',
    domain: 'musculoskeletal',
    type: 'exercise',

    description: 'Progressive resistance training to maintain muscle mass, bone density, and metabolic health throughout aging.',
    evidenceLevel: 'STRONG',
    evidenceSummary: 'Resistance training 2-3x/week improves muscle mass, bone mineral density, insulin sensitivity, and reduces fall risk. Critical for healthy aging and metabolic health.',
    primaryCitations: [
      'Westcott WL. Resistance training is medicine. Curr Sports Med Rep. 2012',
      'Liu CJ, et al. Progressive resistance strength training for older adults. Cochrane Database. 2009',
      'Strasser B, et al. Resistance training and type 2 diabetes. Diabetes Care. 2009'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Sarcopenia prevention',
      'Osteoporosis/osteopenia',
      'Type 2 diabetes',
      'Metabolic syndrome',
      'General health maintenance'
    ],
    contraindications: [
      {
        condition: 'Recent fracture (< 6 weeks)',
        severity: 'absolute',
        alternative: 'Wait for clearance from orthopedist'
      },
      {
        condition: 'Severe osteoporosis',
        severity: 'relative',
        alternative: 'Modified protocol with physical therapist'
      }
    ],

    protocol: {
      frequency: '2-4 sessions per week',
      duration: '45-60 minutes per session',
      instructions: `
        1. Target all major muscle groups: legs, back, chest, shoulders, arms, core
        2. 2-4 sets per exercise, 8-12 repetitions per set
        3. Progressive overload: increase weight when 12 reps becomes easy
        4. Rest 60-90 seconds between sets
        5. Include compound movements: squats, deadlifts, presses, rows
        6. Allow 48 hours recovery between sessions for same muscle group
        7. Proper form > heavy weight (prevent injury)
      `,
      monitoring: 'Track weights, reps, and progressive improvements. Annual DEXA scan for body composition.'
    },

    estimatedCost: {
      min: 0,
      max: 100,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Increased muscle mass (lean body mass)',
      'Improved bone mineral density',
      'Enhanced insulin sensitivity',
      'Reduced fall risk',
      'Improved metabolic rate'
    ],
    timeToEffect: '8-12 weeks',
    successMetrics: [
      'Progressive strength gains (10-20% in 3 months)',
      'Maintained or increased lean body mass',
      'Improved functional assessments (chair stand, grip strength)'
    ],

    requiredAssessments: ['Baseline strength assessment', 'DEXA scan (optional)', 'Functional movement screen'],
    clinicianNotes: 'Consider physical therapy referral for patients with movement limitations. Start with bodyweight exercises for deconditioned patients.'
  },

  {
    id: 'lifestyle-004',
    name: 'Stress Reduction & HRV Training',
    category: 'Lifestyle',
    domain: 'neurocognitive',
    type: 'lifestyle',

    description: 'Heart rate variability (HRV) biofeedback and stress management techniques to improve autonomic nervous system balance.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'HRV training and stress reduction improve autonomic function, reduce cardiovascular risk, and enhance emotional regulation. Mindfulness-based interventions show consistent benefits.',
    primaryCitations: [
      'Lehrer P, et al. Heart rate variability biofeedback: effects on stress and cognition. Ann N Y Acad Sci. 2016',
      'Goyal M, et al. Meditation programs for psychological stress. JAMA Intern Med. 2014',
      'Thayer JF, et al. A meta-analysis of heart rate variability and neuroimaging studies. Neurosci Biobehav Rev. 2012'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Chronic stress',
      'Anxiety disorders',
      'Cardiovascular disease',
      'Burnout',
      'Poor sleep quality',
      'Autonomic dysfunction'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Daily',
      duration: '10-20 minutes per session',
      instructions: `
        1. HRV Biofeedback: Use app (Elite HRV, Welltory, Oura) to track HRV
        2. Resonant frequency breathing: 4.5-6 breaths/min (typically 5.5)
        3. Box breathing: 4-4-4-4 pattern (inhale-hold-exhale-hold)
        4. Mindfulness meditation: 10-20 min daily
        5. Progressive muscle relaxation
        6. Track HRV trends over time (morning measurement best)
        7. Aim for increasing HRV baseline over weeks
      `,
      monitoring: 'Daily HRV tracking with wearable or app. Target: HRV >50ms (RMSSD) for most adults.'
    },

    estimatedCost: {
      min: 0,
      max: 200,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Improved HRV baseline',
      'Reduced perceived stress',
      'Better sleep quality',
      'Enhanced emotional regulation',
      'Lower resting heart rate'
    ],
    timeToEffect: '4-8 weeks',
    successMetrics: [
      'HRV increases 10-20% from baseline',
      'Perceived stress scale decreases',
      'Improved sleep metrics'
    ],

    requiredAssessments: ['Baseline HRV measurement', 'Perceived Stress Scale (PSS-10)'],
    clinicianNotes: 'Low HRV (<20ms) may indicate overtraining, illness, or cardiovascular risk. Consider cardiac workup if persistently low despite interventions.'
  },

  {
    id: 'lifestyle-005',
    name: 'Heat Shock Protein Activation (Sauna)',
    category: 'Lifestyle',
    domain: 'cardiometabolic',
    type: 'lifestyle',

    description: 'Regular sauna bathing to activate heat shock proteins, improve cardiovascular health, and enhance longevity.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Frequent sauna use (4-7x/week) associated with reduced cardiovascular mortality, all-cause mortality, and dementia risk. Heat stress activates heat shock proteins with protective effects.',
    primaryCitations: [
      'Laukkanen T, et al. Sauna bathing and systemic inflammation. Eur J Epidemiol. 2018',
      'Kunutsor SK, et al. Sauna bathing reduces the risk of stroke. Neurology. 2018',
      'Patrick RP, et al. Sauna use as a lifestyle practice to extend healthspan. Exp Gerontol. 2021'
    ],

    targetAgeGroup: ['18-39', '40-49', '50-59', '60-69'],
    targetGender: 'all',
    indications: [
      'Cardiovascular disease prevention',
      'Chronic inflammation',
      'Detoxification support',
      'Athletic recovery',
      'Longevity optimization'
    ],
    contraindications: [
      {
        condition: 'Unstable angina',
        severity: 'absolute',
        alternative: 'Cardiac clearance required'
      },
      {
        condition: 'Recent MI (<6 weeks)',
        severity: 'absolute',
        alternative: 'Wait for medical clearance'
      },
      {
        condition: 'Severe aortic stenosis',
        severity: 'absolute',
        alternative: 'Avoid heat stress'
      },
      {
        condition: 'Pregnancy',
        severity: 'relative',
        alternative: 'Limit to 15 min, lower temperature (<170°F)'
      }
    ],

    protocol: {
      frequency: '4-7 sessions per week (optimal based on Finnish studies)',
      duration: '20-30 minutes per session',
      instructions: `
        1. Traditional dry sauna: 170-200°F (75-90°C)
        2. Or infrared sauna: 120-140°F (50-60°C) for longer duration
        3. Hydrate well: 16-20 oz water before and after
        4. Start gradual: 10-15 min sessions, build to 20-30 min
        5. Cool down gradually (avoid immediate cold plunge)
        6. Replace electrolytes if sweating heavily
        7. Avoid alcohol before/during sauna use
      `,
      monitoring: 'Track session frequency, duration, tolerance. Monitor heart rate if cardiovascular concerns.'
    },

    estimatedCost: {
      min: 50,
      max: 200,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Improved cardiovascular function',
      'Enhanced detoxification (heavy metals, BPA)',
      'Reduced all-cause mortality (20-40% with frequent use)',
      'Improved recovery and muscle soreness',
      'Heat shock protein activation'
    ],
    timeToEffect: '8-12 weeks for cardiovascular benefits',
    successMetrics: [
      'Sustained 4-7x weekly usage',
      'Improved heat tolerance over time',
      'Cardiovascular markers improvement'
    ],

    requiredAssessments: ['Cardiovascular screening', 'Blood pressure measurement'],
    clinicianNotes: 'Most evidence from traditional Finnish saunas. Infrared saunas may require longer duration. Monitor for orthostatic hypotension.'
  },

  {
    id: 'lifestyle-006',
    name: 'Cold Thermogenesis Protocol',
    category: 'Lifestyle',
    domain: 'cardiometabolic',
    type: 'lifestyle',

    description: 'Controlled cold exposure to activate brown adipose tissue, improve metabolic health, and enhance resilience.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Cold exposure activates brown fat, increases energy expenditure, and may improve insulin sensitivity. Emerging evidence for immune function and mood benefits.',
    primaryCitations: [
      'Cypess AM, et al. Cold-activated brown adipose tissue in humans. NEJM. 2009',
      'van der Lans AA, et al. Cold acclimation recruits human brown fat. Diabetes. 2013',
      'Søberg S, et al. Altered brown fat thermoregulation and enhanced cold-induced thermogenesis. Cell Reports Med. 2021'
    ],

    targetAgeGroup: ['18-39', '40-49', '50-59', '60-69'],
    targetGender: 'all',
    indications: [
      'Metabolic syndrome',
      'Weight management',
      'Athletic recovery',
      'Mood enhancement',
      'Immune system support'
    ],
    contraindications: [
      {
        condition: 'Raynaud\'s disease',
        severity: 'absolute',
        alternative: 'Avoid cold exposure'
      },
      {
        condition: 'Cold urticaria',
        severity: 'absolute',
        alternative: 'Avoid cold exposure'
      },
      {
        condition: 'Cardiovascular disease',
        severity: 'relative',
        alternative: 'Start very gradually, medical supervision'
      }
    ],

    protocol: {
      frequency: '3-5 times per week',
      duration: '1-3 minutes per session (cold plunge) or 30-60 seconds (cold shower)',
      instructions: `
        1. Start with cold showers (end with 30-60 sec cold water)
        2. Progress to cold plunges: 50-59°F (10-15°C)
        3. Build tolerance gradually over 2-4 weeks
        4. Focus on controlled breathing (avoid hyperventilation)
        5. Do NOT submerge head initially (vasovagal risk)
        6. Exit if shivering becomes uncontrollable
        7. Warm up gradually after (avoid rapid rewarming)
      `,
      monitoring: 'Track tolerance, duration, subjective mood and energy. Optional: body composition tracking.'
    },

    estimatedCost: {
      min: 0,
      max: 300,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Activated brown adipose tissue',
      'Increased metabolic rate',
      'Improved cold tolerance',
      'Enhanced mood and mental clarity',
      'Reduced inflammation markers'
    ],
    timeToEffect: '2-4 weeks for adaptation',
    successMetrics: [
      'Can tolerate 2-3 min cold plunge',
      'Improved perceived energy and mood',
      'Optional: increased brown fat on imaging'
    ],

    clinicianNotes: 'Contraindicated in pregnancy. Monitor for autonomic dysfunction. Emerging evidence, more research needed.'
  },

  {
    id: 'lifestyle-007',
    name: 'Time-Restricted Eating (16:8)',
    category: 'Lifestyle',
    domain: 'cardiometabolic',
    type: 'diet',

    description: '16-hour fast with 8-hour eating window to improve metabolic health, insulin sensitivity, and longevity pathways.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Time-restricted eating improves insulin sensitivity, promotes autophagy, and may reduce cardiovascular risk factors. Well-tolerated and sustainable for most people.',
    primaryCitations: [
      'Sutton EF, et al. Early time-restricted feeding and metabolic health. Cell Metab. 2018',
      'Wilkinson MJ, et al. Ten-hour time-restricted eating reduces weight, blood pressure. Cell Metab. 2020',
      'Longo VD, et al. Fasting, circadian rhythms, and time-restricted feeding. Cell Metab. 2016'
    ],

    targetAgeGroup: ['18-39', '40-49', '50-59', '60-69'],
    targetGender: 'all',
    indications: [
      'Metabolic syndrome',
      'Pre-diabetes',
      'Weight management',
      'Cardiovascular risk reduction',
      'Longevity optimization'
    ],
    contraindications: [
      {
        condition: 'History of eating disorders',
        severity: 'absolute',
        alternative: 'Avoid restrictive eating patterns'
      },
      {
        condition: 'Pregnancy or breastfeeding',
        severity: 'absolute',
        alternative: 'Maintain regular eating schedule'
      },
      {
        condition: 'Type 1 diabetes',
        severity: 'relative',
        alternative: 'Close endocrinologist supervision required'
      },
      {
        condition: 'Underweight (BMI <18.5)',
        severity: 'relative',
        alternative: 'Focus on adequate nutrition first'
      }
    ],

    protocol: {
      frequency: 'Daily',
      duration: 'Ongoing',
      instructions: `
        1. Eating window: 8 hours (e.g., 12 PM - 8 PM)
        2. Fasting window: 16 hours (including sleep)
        3. Start gradually: 12:12, then 14:10, then 16:8
        4. During fast: Water, black coffee, tea (no calories)
        5. First meal: Break fast with balanced meal (not excessive)
        6. Maintain consistent schedule (circadian alignment)
        7. Prioritize nutrient-dense foods during eating window
      `,
      monitoring: 'Track fasting hours, energy levels, hunger patterns. Monitor glucose, lipids, weight quarterly.'
    },

    estimatedCost: {
      min: 0,
      max: 0,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Improved insulin sensitivity',
      'Weight loss (if overweight)',
      'Enhanced autophagy',
      'Better metabolic flexibility',
      'Reduced inflammation markers'
    ],
    timeToEffect: '4-8 weeks',
    successMetrics: [
      'Fasting glucose improves',
      'HbA1c decreases',
      'Sustained adherence >6 months'
    ],

    requiredLabValues: ['Baseline glucose', 'HbA1c', 'Lipid panel'],
    clinicianNotes: 'Monitor for excessive calorie restriction. Not recommended for children/adolescents. May need medication adjustments in diabetics.'
  },

  {
    id: 'lifestyle-008',
    name: 'Blue Light Management Protocol',
    category: 'Lifestyle',
    domain: 'neurocognitive',
    type: 'lifestyle',

    description: 'Strategic blue light exposure and filtering to optimize circadian rhythm and sleep quality.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Blue light exposure suppresses melatonin production. Morning blue light enhances alertness; evening exposure impairs sleep. Strategic management improves sleep quality and circadian alignment.',
    primaryCitations: [
      'Gooley JJ, et al. Exposure to room light before bedtime suppresses melatonin. J Clin Endocrinol Metab. 2011',
      'Chang AM, et al. Evening use of light-emitting eReaders negatively affects sleep. PNAS. 2015',
      'Figueiro MG, et al. Light and circadian health. Lighting Res Technol. 2018'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Poor sleep quality',
      'Insomnia',
      'Circadian rhythm disorders',
      'Screen-heavy professions',
      'Shift work adaptation'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Daily',
      duration: 'Ongoing',
      instructions: `
        MORNING (6-10 AM):
        1. Get bright light exposure: 10,000 lux for 10-30 min
        2. Natural sunlight preferred (open curtains, go outside)
        3. Or use light therapy box (10,000 lux)

        DAYTIME:
        4. Maintain bright indoor lighting (500-1000 lux)
        5. Position near windows when possible

        EVENING (2 hours before bed):
        6. Dim lights to <100 lux (use dimmers)
        7. Use blue light blocking glasses (filter >450nm)
        8. Enable device night mode / blue light filters
        9. Prefer reading books vs screens
        10. Use amber/red nightlights if needed
      `,
      monitoring: 'Track sleep onset latency, sleep quality, morning alertness'
    },

    estimatedCost: {
      min: 0,
      max: 150,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Reduced sleep latency',
      'Improved sleep quality',
      'Better morning alertness',
      'Optimized circadian rhythm',
      'Reduced digital eye strain'
    ],
    timeToEffect: '1-2 weeks',
    successMetrics: [
      'Sleep latency <20 min',
      'Self-reported sleep quality improves',
      'Morning energy levels increase'
    ],

    clinicianNotes: 'Light therapy boxes useful for seasonal affective disorder (SAD). Blue blockers should filter 450-500nm wavelength.'
  },

  {
    id: 'lifestyle-009',
    name: 'Social Connection & Purpose Cultivation',
    category: 'Lifestyle',
    domain: 'neurocognitive',
    type: 'lifestyle',

    description: 'Structured approach to building meaningful relationships and sense of purpose, both critical longevity factors.',
    evidenceLevel: 'STRONG',
    evidenceSummary: 'Social isolation and lack of purpose are independent risk factors for mortality. Social connection rivals traditional health behaviors in mortality risk reduction.',
    primaryCitations: [
      'Holt-Lunstad J, et al. Social relationships and mortality risk: a meta-analysis. PLoS Med. 2010',
      'Cohen S, et al. Social ties and susceptibility to the common cold. JAMA. 1997',
      'Boyle PA, et al. Effect of purpose in life on mortality. Psychosom Med. 2009'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Social isolation',
      'Depression',
      'Anxiety',
      'Retirement transition',
      'Loss of loved one',
      'Chronic disease management'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Daily to weekly activities',
      duration: 'Ongoing',
      instructions: `
        SOCIAL CONNECTION:
        1. Schedule 3+ meaningful social interactions weekly
        2. Join community groups (hobby, religious, volunteer)
        3. Maintain close relationships (quality > quantity)
        4. Practice active listening and vulnerability
        5. Limit social media, prioritize in-person connection

        PURPOSE CULTIVATION:
        6. Identify personal values and meaningful activities
        7. Engage in volunteer work or mentorship
        8. Pursue creative hobbies or learning
        9. Set long-term goals aligned with values
        10. Daily purpose reflection (journaling)
      `,
      monitoring: 'UCLA Loneliness Scale, Purpose in Life test (PIL), subjective wellbeing assessments'
    },

    estimatedCost: {
      min: 0,
      max: 50,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Reduced mortality risk (equivalent to smoking cessation)',
      'Improved mental health',
      'Better immune function',
      'Enhanced cognitive resilience',
      'Greater life satisfaction'
    ],
    timeToEffect: '4-12 weeks',
    successMetrics: [
      'UCLA Loneliness Scale decreases',
      'Purpose in Life score increases',
      'Subjective wellbeing improves'
    ],

    clinicianNotes: 'Consider referral to therapist for severe isolation or depression. Blue Zones research highlights social connection as key longevity factor.'
  },

  {
    id: 'lifestyle-010',
    name: 'Environmental Toxin Reduction',
    category: 'Lifestyle',
    domain: 'hormonal',
    type: 'lifestyle',

    description: 'Systematic reduction of endocrine-disrupting chemicals and environmental toxins in daily life.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Endocrine-disrupting chemicals (EDCs) from plastics, cosmetics, and household products associated with metabolic, reproductive, and developmental health issues.',
    primaryCitations: [
      'Gore AC, et al. EDC-2: The Endocrine Society\'s second statement on endocrine-disrupting chemicals. Endocr Rev. 2015',
      'Trasande L, et al. Estimating burden and disease costs of exposure to EDCs in the EU. J Clin Endocrinol Metab. 2015',
      'Rudel RA, et al. Food packaging and bisphenol A exposure. Environ Health Perspect. 2011'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Fertility issues',
      'Hormonal imbalances',
      'Autoimmune conditions',
      'Pregnancy planning',
      'Children in household'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Ongoing lifestyle changes',
      duration: 'Permanent adoption',
      instructions: `
        FOOD & WATER:
        1. Filter tap water (reverse osmosis or carbon filter)
        2. Avoid plastic containers (use glass, stainless steel)
        3. Choose organic for EWG Dirty Dozen foods
        4. Avoid canned foods (BPA linings) - choose glass jars

        PERSONAL CARE:
        5. Use EWG Skin Deep database for clean products
        6. Avoid fragrance (contains phthalates)
        7. Choose mineral sunscreens (avoid oxybenzone)

        HOUSEHOLD:
        8. HEPA air purifier in bedroom
        9. Remove shoes at door (reduce pesticide tracking)
        10. Use natural cleaning products (vinegar, baking soda)
        11. Avoid non-stick cookware (use cast iron, stainless steel)
        12. Replace plastic kitchen items with glass/stainless
      `,
      monitoring: 'Optional: Annual toxin panel (heavy metals, plasticizers). Track symptom improvements.'
    },

    estimatedCost: {
      min: 100,
      max: 500,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Reduced body burden of EDCs (BPA, phthalates)',
      'Improved hormonal balance',
      'Better fertility outcomes',
      'Reduced inflammation',
      'Lower disease risk long-term'
    ],
    timeToEffect: '3-6 months for body burden reduction',
    successMetrics: [
      'Measurable decrease in urinary BPA/phthalates',
      'Symptom improvements (hormonal, skin, energy)',
      'Successful adoption of clean swaps'
    ],

    clinicianNotes: 'Particularly important for women of reproductive age, pregnant women, and young children. Refer to Environmental Working Group (EWG) resources.'
  }
];

// ============================================================================
// NUTRITION & DIETARY INTERVENTIONS (15)
// ============================================================================

const nutritionInterventions: Intervention[] = [
  {
    id: 'nutrition-001',
    name: 'Mediterranean Diet Pattern',
    category: 'Nutrition',
    domain: 'cardiometabolic',
    type: 'diet',

    description: 'Evidence-based dietary pattern emphasizing whole foods, healthy fats, and plant diversity for cardiovascular and metabolic health.',
    evidenceLevel: 'STRONG',
    evidenceSummary: 'Most well-studied dietary pattern for cardiovascular disease prevention. RCTs demonstrate 30% reduction in cardiovascular events, improved metabolic health, and longevity.',
    primaryCitations: [
      'Estruch R, et al. PREDIMED Study: Mediterranean diet and cardiovascular events. NEJM. 2013',
      'de Lorgeril M, et al. Lyon Diet Heart Study. Circulation. 1999',
      'Sofi F, et al. Mediterranean diet and health status: meta-analysis. BMJ. 2008'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Cardiovascular disease prevention',
      'Metabolic syndrome',
      'Type 2 diabetes',
      'Cognitive decline prevention',
      'General health optimization'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Daily eating pattern',
      duration: 'Ongoing',
      instructions: `
        FOUNDATIONAL PRINCIPLES:
        1. Emphasize: Vegetables (5-7 servings/day), fruits (3-4/day)
        2. Primary fat: Extra virgin olive oil (4-6 tbsp/day)
        3. Protein: Fish/seafood 3-4x/week, legumes daily
        4. Nuts: 1-2 oz daily (almonds, walnuts, pistachios)
        5. Whole grains: Choose intact grains over refined
        6. Moderate: Poultry, eggs, dairy (yogurt, cheese)
        7. Limit: Red meat (<1x/week), processed meats, sweets
        8. Herbs/spices: Use liberally (anti-inflammatory)
        9. Wine: Optional 1 glass/day with meals (if no contraindications)
      `,
      monitoring: 'Mediterranean Diet Adherence Score, cardiovascular markers, HbA1c, lipid panel'
    },

    estimatedCost: {
      min: 300,
      max: 500,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      '30% reduction in cardiovascular events',
      'Improved lipid profile',
      'Better glycemic control',
      'Weight loss (if overweight)',
      'Reduced inflammation'
    ],
    timeToEffect: '12-24 weeks',
    successMetrics: [
      'LDL cholesterol decreases',
      'Triglycerides improve',
      'HbA1c reduces in diabetics',
      'High diet adherence score'
    ],

    requiredLabValues: ['Baseline lipid panel', 'HbA1c', 'hsCRP'],
    clinicianNotes: 'Most evidence for cardiovascular and cognitive benefits. Emphasize whole food sources, not supplements.'
  },

  {
    id: 'nutrition-002',
    name: 'Omega-3 Fatty Acid Supplementation',
    category: 'Nutrition',
    domain: 'cardiometabolic',
    type: 'supplement',

    description: 'High-dose EPA/DHA from fish oil or algae for cardiovascular, cognitive, and anti-inflammatory benefits.',
    evidenceLevel: 'STRONG',
    evidenceSummary: 'Omega-3s (especially EPA) reduce triglycerides, cardiovascular events, and inflammation. Optimal dosing 2-4g/day combined EPA+DHA.',
    primaryCitations: [
      'Bhatt DL, et al. REDUCE-IT: Icosapent ethyl and cardiovascular events. NEJM. 2019',
      'Manson JE, et al. VITAL Study: Marine omega-3s and cardiovascular disease. NEJM. 2019',
      'Calder PC. Marine omega-3 fatty acids and inflammatory processes. Int Immunopharmacol. 2013'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Elevated triglycerides (>150 mg/dL)',
      'Cardiovascular disease risk',
      'Inflammatory conditions',
      'Cognitive decline prevention',
      'Depression/mood disorders'
    ],
    contraindications: [
      {
        condition: 'Seafood allergy (for fish oil)',
        severity: 'absolute',
        alternative: 'Use algae-based omega-3 supplement'
      },
      {
        condition: 'High-dose warfarin',
        severity: 'relative',
        alternative: 'Monitor INR more frequently, may need dose adjustment'
      }
    ],

    protocol: {
      dosage: '2-4 grams combined EPA+DHA daily',
      frequency: 'Daily with meals',
      duration: 'Ongoing',
      instructions: `
        1. Target dose: 2-4g combined EPA+DHA
        2. For high triglycerides: Emphasize EPA (2-4g EPA daily)
        3. For cognitive/mood: Balance EPA:DHA or higher DHA
        4. Take with fat-containing meal (improves absorption)
        5. Choose molecularly distilled (removes heavy metals)
        6. Check IFOS certification (quality standard)
        7. Refrigerate after opening
        8. Alternative: Eat fatty fish 3-4x/week (salmon, mackerel, sardines)
      `,
      monitoring: 'Omega-3 index (target >8%), triglycerides, bleeding time if on anticoagulants'
    },

    estimatedCost: {
      min: 30,
      max: 80,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Reduced triglycerides (20-30% reduction)',
      'Lower cardiovascular events (in high-risk patients)',
      'Improved omega-3 index',
      'Reduced inflammation (hsCRP)',
      'Better mood and cognitive function'
    ],
    timeToEffect: '8-12 weeks',
    successMetrics: [
      'Triglycerides <150 mg/dL',
      'Omega-3 index >8%',
      'hsCRP decreases'
    ],

    requiredLabValues: ['Triglycerides', 'Omega-3 index', 'hsCRP'],
    clinicianNotes: 'REDUCE-IT trial used 4g EPA (icosapent ethyl). Over-the-counter supplements variable quality. Consider prescription Lovaza/Vascepa for very high triglycerides.'
  },

  {
    id: 'nutrition-003',
    name: 'Vitamin D Optimization',
    category: 'Nutrition',
    domain: 'musculoskeletal',
    type: 'supplement',

    description: 'Vitamin D3 supplementation to achieve optimal serum levels (40-60 ng/mL) for bone, immune, and metabolic health.',
    evidenceLevel: 'STRONG',
    evidenceSummary: 'Vitamin D deficiency (<20 ng/mL) is epidemic. Supplementation improves bone health, reduces falls, may benefit immune function and mood.',
    primaryCitations: [
      'Holick MF. Vitamin D deficiency. NEJM. 2007',
      'Bischoff-Ferrari HA, et al. Vitamin D supplementation and fall prevention. JAMA. 2016',
      'Manson JE, et al. VITAL Study: Vitamin D and major clinical outcomes. NEJM. 2019'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Vitamin D deficiency (<30 ng/mL)',
      'Osteoporosis/osteopenia',
      'Fall prevention (elderly)',
      'Autoimmune conditions',
      'Depression/SAD',
      'Limited sun exposure'
    ],
    contraindications: [
      {
        condition: 'Hypercalcemia',
        severity: 'absolute',
        alternative: 'Treat underlying cause first'
      },
      {
        condition: 'Sarcoidosis or other granulomatous diseases',
        severity: 'relative',
        alternative: 'Lower doses with monitoring'
      }
    ],

    protocol: {
      dosage: '2,000-5,000 IU daily (adjust based on levels)',
      frequency: 'Daily',
      duration: 'Ongoing (especially winter months)',
      instructions: `
        1. Test baseline 25-OH vitamin D level
        2. Target range: 40-60 ng/mL (optimal), minimum >30 ng/mL
        3. Typical dosing:
           - <20 ng/mL: 5,000 IU daily for 8-12 weeks, then retest
           - 20-30 ng/mL: 4,000 IU daily
           - 30-40 ng/mL: 2,000-3,000 IU daily (maintenance)
           - >60 ng/mL: Reduce or stop temporarily
        4. Use vitamin D3 (cholecalciferol), not D2
        5. Take with fat-containing meal (fat-soluble vitamin)
        6. Retest levels every 3-6 months until optimized, then annually
        7. Consider K2 supplementation (100-200 mcg) for calcium regulation
      `,
      monitoring: '25-OH vitamin D (target 40-60 ng/mL), calcium, PTH if persistently low'
    },

    estimatedCost: {
      min: 5,
      max: 20,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Vitamin D levels 40-60 ng/mL',
      'Improved bone mineral density',
      'Reduced fall risk (elderly)',
      'Better immune function',
      'Improved mood (in deficiency)'
    ],
    timeToEffect: '8-12 weeks to optimize levels',
    successMetrics: [
      '25-OH vitamin D 40-60 ng/mL',
      'PTH normalizes (if elevated)',
      'Bone density improves or stabilizes'
    ],

    requiredLabValues: ['25-OH vitamin D', 'Calcium', 'PTH (if vitamin D very low)'],
    clinicianNotes: 'Vitamin D toxicity rare but possible (>100 ng/mL with symptoms). Most people need year-round supplementation. Sun exposure limited benefit at northern latitudes in winter.'
  },

  {
    id: 'nutrition-004',
    name: 'Magnesium Supplementation',
    category: 'Nutrition',
    domain: 'cardiometabolic',
    type: 'supplement',

    description: 'Magnesium repletion for cardiovascular health, sleep, muscle function, and metabolic optimization.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Magnesium deficiency common due to soil depletion and processed diets. Supplementation improves blood pressure, insulin sensitivity, sleep, and muscle function.',
    primaryCitations: [
      'Rosanoff A, et al. Suboptimal magnesium status and cardiovascular disease. Nutrients. 2012',
      'Abbasi B, et al. Magnesium supplementation and sleep quality in elderly. J Res Med Sci. 2012',
      'Rodriguez-Moran M, et al. Oral magnesium supplementation and insulin sensitivity. Diabetes Care. 2003'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Hypertension',
      'Insulin resistance',
      'Muscle cramps',
      'Insomnia/poor sleep',
      'Migraines',
      'Constipation',
      'PPI use (proton pump inhibitors)'
    ],
    contraindications: [
      {
        condition: 'Severe renal insufficiency (GFR <30)',
        severity: 'absolute',
        alternative: 'Magnesium can accumulate with kidney disease'
      },
      {
        condition: 'Myasthenia gravis',
        severity: 'relative',
        alternative: 'Magnesium may worsen muscle weakness'
      }
    ],

    protocol: {
      dosage: '200-400 mg elemental magnesium daily',
      frequency: 'Daily, preferably evening',
      duration: 'Ongoing',
      instructions: `
        1. Choose highly absorbable forms:
           - Magnesium glycinate: Best for sleep, gentle on stomach
           - Magnesium threonate: Cognitive benefits (crosses BBB)
           - Magnesium citrate: Good absorption, mild laxative effect
           - Avoid: Magnesium oxide (poor absorption, laxative)
        2. Typical dose: 200-400 mg elemental magnesium
        3. Take in evening (promotes sleep)
        4. Start low dose, increase gradually (avoid diarrhea)
        5. Take away from calcium supplements (compete for absorption)
        6. Increase dietary sources: leafy greens, nuts, seeds, legumes, dark chocolate
      `,
      monitoring: 'Serum magnesium (note: serum levels insensitive marker), RBC magnesium better. Track symptoms: sleep, muscle cramps, BP.'
    },

    estimatedCost: {
      min: 10,
      max: 30,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Improved sleep quality',
      'Reduced blood pressure (3-5 mmHg)',
      'Better insulin sensitivity',
      'Reduced muscle cramps',
      'Fewer migraines (in deficiency)'
    ],
    timeToEffect: '4-8 weeks',
    successMetrics: [
      'Sleep quality improves',
      'Blood pressure decreases',
      'Muscle cramps resolve',
      'RBC magnesium normalizes'
    ],

    requiredLabValues: ['Serum magnesium (or RBC magnesium for accuracy)', 'Creatinine/GFR'],
    clinicianNotes: 'PPIs, diuretics, and alcohol deplete magnesium. Most Americans consume <50% of RDA. Serum magnesium normal doesn\'t rule out deficiency.'
  },

  {
    id: 'nutrition-005',
    name: 'Probiotic & Prebiotic Optimization',
    category: 'Nutrition',
    domain: 'gut',
    type: 'supplement',

    description: 'Multi-strain probiotic supplementation with prebiotic fiber to optimize gut microbiome diversity and health.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Specific probiotic strains benefit IBS, inflammatory bowel disease, immune function, and mood. Prebiotics feed beneficial bacteria. Effects are strain-specific.',
    primaryCitations: [
      'Ford AC, et al. Efficacy of prebiotics, probiotics, and synbiotics in IBS. Am J Gastroenterol. 2014',
      'Sniffen JC, et al. Probiotic Lactobacillus reuteri in immune health. Nutrients. 2018',
      'Gibson GR, et al. Dietary prebiotics: current status and new definition. Food Sci Technol Bull Funct Foods. 2010'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'IBS (irritable bowel syndrome)',
      'Post-antibiotic recovery',
      'Inflammatory bowel disease',
      'Immune support',
      'Mood/anxiety disorders',
      'Antibiotic-associated diarrhea prevention'
    ],
    contraindications: [
      {
        condition: 'Immunocompromised (chemotherapy, organ transplant)',
        severity: 'relative',
        alternative: 'Discuss with oncologist/transplant team first'
      },
      {
        condition: 'Central venous catheter',
        severity: 'relative',
        alternative: 'Risk of fungemia with some strains'
      }
    ],

    protocol: {
      dosage: '10-50 billion CFU multi-strain probiotic + 10-20g prebiotic fiber',
      frequency: 'Daily',
      duration: 'Ongoing',
      instructions: `
        PROBIOTICS:
        1. Choose multi-strain formula (diversity important)
        2. Look for: Lactobacillus, Bifidobacterium, Saccharomyces boulardii
        3. Dose: 10-50 billion CFU daily
        4. Take with food or just after
        5. Refrigerate after opening (extends shelf life)
        6. Rotate brands every few months (increase strain diversity)

        PREBIOTICS (feed probiotics):
        7. Target 10-20g prebiotic fiber daily
        8. Sources: Inulin, FOS, resistant starch, acacia fiber
        9. Dietary sources: Garlic, onions, leeks, Jerusalem artichokes, bananas
        10. Start low dose, increase gradually (reduce gas/bloating)
      `,
      monitoring: 'Track digestive symptoms, bowel movements, mood. Optional: comprehensive stool analysis.'
    },

    estimatedCost: {
      min: 30,
      max: 60,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Improved digestive symptoms (IBS)',
      'Regular bowel movements',
      'Enhanced immune function',
      'Better mood and mental clarity',
      'Increased microbiome diversity'
    ],
    timeToEffect: '4-8 weeks',
    successMetrics: [
      'IBS symptom score improves',
      'Bristol stool scale normalizes (type 3-4)',
      'Subjective wellbeing increases'
    ],

    clinicianNotes: 'Effects are strain-specific. For IBS-D, Bifidobacterium helpful. For IBS-C, Lactobacillus and prebiotics. Saccharomyces boulardii for antibiotic-associated diarrhea.'
  },

  {
    id: 'nutrition-006',
    name: 'Protein Optimization for Longevity',
    category: 'Nutrition',
    domain: 'musculoskeletal',
    type: 'diet',

    description: 'Strategic protein intake (1.6-2.2 g/kg) with leucine-rich sources to preserve muscle mass and metabolic health during aging.',
    evidenceLevel: 'STRONG',
    evidenceSummary: 'Higher protein intake preserves muscle mass, bone density, and metabolic health in aging. Leucine-rich proteins stimulate muscle protein synthesis. RDA (0.8 g/kg) is minimum, not optimal.',
    primaryCitations: [
      'Bauer J, et al. Evidence-based recommendations for optimal dietary protein intake in aging. J Am Med Dir Assoc. 2013',
      'Paddon-Jones D, et al. Dietary protein recommendations and prevention of sarcopenia. Curr Opin Clin Nutr Metab Care. 2009',
      'Wolfe RR. The role of dietary protein in optimizing muscle mass. Endocrinol Metab Clin North Am. 2017'
    ],

    targetAgeGroup: ['40-49', '50-59', '60-69', '70+'],
    targetGender: 'all',
    indications: [
      'Sarcopenia prevention',
      'Weight loss maintenance',
      'Post-surgical recovery',
      'Athletic performance',
      'Osteoporosis prevention'
    ],
    contraindications: [
      {
        condition: 'Advanced kidney disease (stage 4-5 CKD)',
        severity: 'relative',
        alternative: 'Lower protein intake (0.6-0.8 g/kg), nephrology guidance'
      },
      {
        condition: 'Liver disease (cirrhosis)',
        severity: 'relative',
        alternative: 'Branch-chain amino acids, hepatology guidance'
      }
    ],

    protocol: {
      dosage: '1.6-2.2 g/kg body weight daily (higher end for elderly, athletes)',
      frequency: 'Distributed across 3-4 meals',
      duration: 'Ongoing',
      instructions: `
        1. Calculate needs: 1.6-2.2 g/kg ideal body weight
           Example: 70 kg person = 112-154g protein/day
        2. Distribute evenly: 25-40g protein per meal (3-4 meals)
        3. Prioritize leucine-rich sources (threshold: 2.5-3g leucine/meal):
           - Animal: Meat, poultry, fish, eggs, dairy (whey protein)
           - Plant: Soy, quinoa, legumes + grains combination
        4. Post-resistance training: 20-40g protein within 2 hours
        5. Before bed: 20-30g casein or slow-digesting protein
        6. Quality sources: Prioritize whole foods over supplements
      `,
      monitoring: 'Track daily protein intake, muscle mass (DEXA scan annually), functional strength tests'
    },

    estimatedCost: {
      min: 50,
      max: 200,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Preserved or increased lean muscle mass',
      'Better metabolic rate',
      'Improved bone density',
      'Enhanced recovery from exercise',
      'Better satiety and weight management'
    ],
    timeToEffect: '12-24 weeks',
    successMetrics: [
      'Lean body mass maintained or increased',
      'Grip strength improves or stabilizes',
      'Functional performance improves'
    ],

    requiredAssessments: ['DEXA scan for body composition', 'Grip strength test', 'Creatinine/GFR'],
    clinicianNotes: 'Higher protein needs in elderly (anabolic resistance). Distribute protein evenly - single large dose less effective than spread doses.'
  },

  {
    id: 'nutrition-007',
    name: 'NAD+ Precursor Supplementation (NMN/NR)',
    category: 'Nutrition',
    domain: 'cardiometabolic',
    type: 'supplement',

    description: 'Nicotinamide Mononucleotide (NMN) or Nicotinamide Riboside (NR) to boost NAD+ levels and support cellular energy and longevity pathways.',
    evidenceLevel: 'EMERGING',
    evidenceSummary: 'NAD+ declines with age. Animal studies show NMN/NR improve metabolic health, mitochondrial function, and lifespan. Human trials emerging, showing improved insulin sensitivity and physical function.',
    primaryCitations: [
      'Yoshino J, et al. Nicotinamide mononucleotide increases muscle insulin sensitivity in prediabetic women. Science. 2021',
      'Martens CR, et al. Chronic nicotinamide riboside supplementation and cardiovascular health. Nat Commun. 2018',
      'Mills KF, et al. Long-term administration of NMN mitigates age-associated decline. Cell Metab. 2016'
    ],

    targetAgeGroup: ['40-49', '50-59', '60-69', '70+'],
    targetGender: 'all',
    indications: [
      'Metabolic syndrome',
      'Pre-diabetes',
      'Cognitive decline',
      'Cardiovascular risk',
      'Fatigue and low energy',
      'Longevity optimization'
    ],
    contraindications: [
      {
        condition: 'Active cancer',
        severity: 'relative',
        alternative: 'NAD+ may support rapid cell division - oncology consultation'
      }
    ],

    protocol: {
      dosage: 'NMN: 250-500 mg daily OR NR: 300-1000 mg daily',
      frequency: 'Daily, morning preferred',
      duration: 'Ongoing',
      instructions: `
        1. Choose NMN or NR (both convert to NAD+):
           - NMN: 250-500 mg/day (sublingual or oral)
           - NR: 300-1000 mg/day (oral)
        2. Take in morning (may boost energy)
        3. Take with or without food
        4. Start lower dose, increase gradually
        5. Quality matters: Third-party tested (heavy metals, purity)
        6. Synergistic compounds (optional):
           - Resveratrol: 150-500 mg (activates sirtuins)
           - Quercetin: 500 mg (senolytic properties)
           - TMG: 500-1000 mg (supports methylation)
      `,
      monitoring: 'Track subjective energy, sleep quality. Optional: NAD+ blood levels (expensive, not standardized).'
    },

    estimatedCost: {
      min: 50,
      max: 150,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Improved energy and stamina',
      'Better insulin sensitivity',
      'Enhanced cognitive function',
      'Improved sleep quality',
      'Potential longevity benefits (emerging)'
    ],
    timeToEffect: '4-8 weeks',
    successMetrics: [
      'Subjective energy improvement',
      'Fasting glucose/insulin improves',
      'Physical performance metrics improve'
    ],

    clinicianNotes: 'Emerging science, long-term human data limited. Generally well-tolerated. Quality/purity of supplements varies significantly.'
  },

  {
    id: 'nutrition-008',
    name: 'Curcumin/Turmeric Extract',
    category: 'Nutrition',
    domain: 'cardiometabolic',
    type: 'supplement',

    description: 'High-bioavailability curcumin for anti-inflammatory, antioxidant, and metabolic benefits.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Curcumin is potent anti-inflammatory with benefits for arthritis, metabolic syndrome, and cognitive health. Bioavailability enhanced with piperine (black pepper) or liposomal formulations.',
    primaryCitations: [
      'Hewlings SJ, et al. Curcumin: A review of anti-inflammatory and antioxidant mechanisms. Foods. 2017',
      'Daily JW, et al. Efficacy of turmeric extracts and curcumin for alleviating symptoms of joint arthritis. J Med Food. 2016',
      'Small GW, et al. Memory and brain amyloid and tau effects of curcumin. Am J Geriatr Psychiatry. 2018'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Osteoarthritis',
      'Chronic inflammation (elevated hsCRP)',
      'Metabolic syndrome',
      'Cognitive decline',
      'Post-exercise recovery'
    ],
    contraindications: [
      {
        condition: 'Bile duct obstruction',
        severity: 'absolute',
        alternative: 'Curcumin stimulates bile production'
      },
      {
        condition: 'High-dose anticoagulants',
        severity: 'relative',
        alternative: 'Curcumin has mild antiplatelet effects - monitor'
      }
    ],

    protocol: {
      dosage: '500-2000 mg curcumin daily (bioavailable formulation)',
      frequency: 'Daily with meals',
      duration: 'Ongoing',
      instructions: `
        1. Choose bioavailable form (regular turmeric powder poorly absorbed):
           - Curcumin + Piperine (BioPerine): 500-2000 mg curcumin + 5-20 mg piperine
           - Longvida (liposomal): 400-800 mg
           - Theracurmin (nanoparticle): 200-400 mg
           - BCM-95 (turmeric oils): 500-1000 mg
        2. Take with fat-containing meal (fat-soluble)
        3. Divide dose: 500 mg 2-3x/day better than single large dose
        4. Alternative: Golden milk (turmeric + black pepper + healthy fat)
      `,
      monitoring: 'Track pain levels (arthritis), hsCRP, subjective inflammation symptoms'
    },

    estimatedCost: {
      min: 20,
      max: 50,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Reduced joint pain and stiffness',
      'Lower inflammation markers (hsCRP)',
      'Improved cognitive function',
      'Better insulin sensitivity',
      'Enhanced recovery from exercise'
    ],
    timeToEffect: '4-8 weeks',
    successMetrics: [
      'Pain scores decrease',
      'hsCRP reduces',
      'Improved mobility in arthritis'
    ],

    requiredLabValues: ['hsCRP (baseline and follow-up)'],
    clinicianNotes: 'Bioavailability critical - plain turmeric powder ineffective. Piperine enhances absorption 20x. Can cause GI upset in sensitive individuals.'
  },

  {
    id: 'nutrition-009',
    name: 'B-Complex Vitamin Optimization',
    category: 'Nutrition',
    domain: 'neurocognitive',
    type: 'supplement',

    description: 'Comprehensive B-vitamin supplementation for energy metabolism, homocysteine regulation, and cognitive health.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'B vitamins (especially B6, B12, folate) lower homocysteine and support cognitive function. Methylated forms better absorbed in individuals with MTHFR polymorphisms.',
    primaryCitations: [
      'Smith AD, et al. Homocysteine-lowering by B vitamins slows cognitive decline. PLoS One. 2010',
      'Douaud G, et al. Preventing Alzheimer\'s disease-related gray matter atrophy with B vitamins. PNAS. 2013',
      'Spence JD. Metabolic vitamin B12 deficiency: a missed opportunity to prevent dementia. Nutr Res. 2016'
    ],

    targetAgeGroup: ['40-49', '50-59', '60-69', '70+'],
    targetGender: 'all',
    indications: [
      'Elevated homocysteine (>10 μmol/L)',
      'B12 deficiency (<400 pg/mL)',
      'Cognitive decline',
      'Vegan/vegetarian diet',
      'PPI or metformin use (depletes B12)',
      'MTHFR gene variants'
    ],
    contraindications: [],

    protocol: {
      dosage: 'B-complex with methylated forms: B6 (25-50mg), Methylfolate (400-800mcg), Methylcobalamin (500-1000mcg)',
      frequency: 'Daily with breakfast',
      duration: 'Ongoing',
      instructions: `
        1. Choose methylated B-complex:
           - Methylcobalamin (B12): 500-1000 mcg
           - Methylfolate (B9): 400-800 mcg (NOT folic acid)
           - Pyridoxal-5-phosphate (B6): 25-50 mg
           - Plus: B1, B2, B3, B5, B7, Choline
        2. Take with breakfast (may increase energy)
        3. Methylated forms: Better for MTHFR polymorphisms (40% have variants)
        4. Note: Urine may turn bright yellow (riboflavin B2 - harmless)
        5. If B12 very low (<300): Consider sublingual or injections initially
      `,
      monitoring: 'Homocysteine (target <10 μmol/L), B12 (target >400 pg/mL), methylmalonic acid (if B12 borderline)'
    },

    estimatedCost: {
      min: 15,
      max: 40,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Lowered homocysteine',
      'Improved energy and stamina',
      'Better cognitive function',
      'Enhanced mood',
      'Reduced cardiovascular risk'
    ],
    timeToEffect: '8-12 weeks',
    successMetrics: [
      'Homocysteine <10 μmol/L',
      'B12 >400 pg/mL',
      'Subjective energy improves'
    ],

    requiredLabValues: ['Homocysteine', 'B12', 'Folate', 'Methylmalonic acid (if B12 borderline)'],
    clinicianNotes: 'PPIs and metformin deplete B12. Vegans need B12 supplementation. High homocysteine independent cardiovascular risk factor.'
  },

  {
    id: 'nutrition-010',
    name: 'Coenzyme Q10 (CoQ10)',
    category: 'Nutrition',
    domain: 'cardiometabolic',
    type: 'supplement',

    description: 'CoQ10 supplementation for mitochondrial function, cardiovascular health, and statin-induced myopathy prevention.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'CoQ10 essential for mitochondrial ATP production. Depleted by statins. Supplementation improves heart failure symptoms, may reduce muscle pain from statins.',
    primaryCitations: [
      'Mortensen SA, et al. Q-SYMBIO Study: CoQ10 in chronic heart failure. JACC Heart Fail. 2014',
      'Banach M, et al. Statin-associated muscle symptoms. Arch Med Sci. 2015',
      'Rosenfeldt FL, et al. CoQ10 in cardiovascular disease. Biofactors. 2003'
    ],

    targetAgeGroup: ['40-49', '50-59', '60-69', '70+'],
    targetGender: 'all',
    indications: [
      'Statin use (muscle pain or prevention)',
      'Heart failure',
      'Hypertension',
      'Migraine prevention',
      'Fatigue and low energy',
      'Mitochondrial dysfunction'
    ],
    contraindications: [
      {
        condition: 'Warfarin use',
        severity: 'relative',
        alternative: 'CoQ10 may reduce warfarin effectiveness - monitor INR'
      }
    ],

    protocol: {
      dosage: '100-300 mg ubiquinol daily',
      frequency: 'Daily with fat-containing meal',
      duration: 'Ongoing',
      instructions: `
        1. Choose ubiquinol form (active, better absorbed than ubiquinone)
        2. Typical dosing:
           - General health: 100-200 mg/day
           - Statin users: 100-200 mg/day
           - Heart failure: 200-300 mg/day
           - Migraines: 300 mg/day
        3. Take with fat-containing meal (fat-soluble, improves absorption)
        4. Divide dose if >200 mg: 100 mg 2x/day
        5. Quality matters: Look for Kaneka Ubiquinol (gold standard)
      `,
      monitoring: 'Track muscle symptoms if on statin, energy levels, blood pressure. CoQ10 levels can be measured (optional).'
    },

    estimatedCost: {
      min: 25,
      max: 60,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Reduced statin-induced muscle pain',
      'Improved heart failure symptoms',
      'Better energy and stamina',
      'Reduced migraine frequency',
      'Lower blood pressure (mild effect)'
    ],
    timeToEffect: '4-8 weeks',
    successMetrics: [
      'Muscle pain resolves (if statin-related)',
      'Energy improves',
      'Migraine frequency decreases'
    ],

    clinicianNotes: 'Statins deplete CoQ10 - consider proactive supplementation. Ubiquinol > ubiquinone for absorption. Safe and well-tolerated.'
  },

  {
    id: 'nutrition-011',
    name: 'Polyphenol-Rich Foods & Resveratrol',
    category: 'Nutrition',
    domain: 'cardiometabolic',
    type: 'supplement',

    description: 'Dietary polyphenols and resveratrol supplementation for antioxidant, anti-inflammatory, and longevity benefits.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Polyphenols activate longevity pathways (sirtuins), improve endothelial function, and reduce oxidative stress. Resveratrol most studied, but food sources may be superior.',
    primaryCitations: [
      'Baur JA, et al. Resveratrol improves health and extends lifespan. Nature. 2006',
      'Tresserra-Rimbau A, et al. Polyphenol intake and mortality risk. J Nutr. 2014',
      'Perez-Jimenez J, et al. Updated methodology for food polyphenol database. J Agric Food Chem. 2010'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Cardiovascular disease prevention',
      'Metabolic syndrome',
      'Cognitive decline',
      'Longevity optimization',
      'High oxidative stress'
    ],
    contraindications: [
      {
        condition: 'Estrogen-sensitive cancers',
        severity: 'relative',
        alternative: 'High-dose resveratrol has mild estrogenic activity'
      }
    ],

    protocol: {
      dosage: 'Food-first approach + Optional resveratrol 150-500 mg/day',
      frequency: 'Daily',
      duration: 'Ongoing',
      instructions: `
        FOOD-FIRST APPROACH (Best):
        1. Berries: Blueberries, blackberries, strawberries (1-2 cups/day)
        2. Dark chocolate: 70-85% cacao (1-2 oz/day)
        3. Green tea: 2-4 cups/day (EGCG polyphenols)
        4. Coffee: 2-3 cups/day (chlorogenic acid)
        5. Red wine: 1 glass/day (if appropriate) - or red grape juice
        6. Extra virgin olive oil: 2-4 tbsp/day
        7. Colorful vegetables: Onions, peppers, beets, leafy greens

        SUPPLEMENTATION (Optional):
        8. Resveratrol: 150-500 mg trans-resveratrol daily
        9. Pterostilbene: 50-100 mg (related compound, better bioavailability)
        10. Take with fat for absorption
      `,
      monitoring: 'Track inflammatory markers (hsCRP), oxidative stress markers (optional), cardiovascular risk factors'
    },

    estimatedCost: {
      min: 50,
      max: 150,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Reduced inflammation (hsCRP)',
      'Improved endothelial function',
      'Better insulin sensitivity',
      'Enhanced cognitive function',
      'Potential longevity benefits'
    ],
    timeToEffect: '8-12 weeks',
    successMetrics: [
      'hsCRP decreases',
      'Flow-mediated dilation improves',
      'Fasting glucose improves'
    ],

    requiredLabValues: ['hsCRP', 'Fasting glucose', 'Lipid panel'],
    clinicianNotes: 'Food sources likely superior to isolated supplements. Resveratrol bioavailability low - micronized or liposomal formulations better.'
  },

  {
    id: 'nutrition-012',
    name: 'Hydration Optimization Protocol',
    category: 'Nutrition',
    domain: 'cardiometabolic',
    type: 'lifestyle',

    description: 'Strategic hydration with electrolyte balance for optimal cellular function, cognitive performance, and metabolic health.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Chronic mild dehydration is common and impairs cognitive function, physical performance, and kidney health. Electrolyte balance critical for cellular function.',
    primaryCitations: [
      'Armstrong LE, et al. Hydration assessment techniques. Nutr Rev. 2005',
      'Popkin BM, et al. Water, hydration, and health. Nutr Rev. 2010',
      'Maughan RJ, et al. A randomized trial to assess beverage hydration index. Am J Clin Nutr. 2016'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Chronic mild dehydration',
      'Athletic performance',
      'Cognitive optimization',
      'Kidney stone prevention',
      'Constipation',
      'Heat exposure / exercise'
    ],
    contraindications: [
      {
        condition: 'Heart failure',
        severity: 'relative',
        alternative: 'Fluid restriction may be required - cardiologist guidance'
      },
      {
        condition: 'Hyponatremia',
        severity: 'absolute',
        alternative: 'Restrict fluids, increase sodium - physician guidance'
      }
    ],

    protocol: {
      dosage: '2-4 liters water daily (adjust for activity, climate, body size)',
      frequency: 'Throughout day',
      duration: 'Ongoing',
      instructions: `
        1. Base needs: ~0.5-1 oz per lb body weight
           Example: 150 lb person = 75-150 oz = 2.2-4.4 liters
        2. Increase for: Exercise, heat, altitude, illness
        3. Morning routine: 16-24 oz upon waking (rehydrate from sleep)
        4. Before meals: 8-16 oz 30 min before eating
        5. During exercise: 4-8 oz every 15-20 min
        6. Electrolytes: Add pinch sea salt + lemon to water OR electrolyte powder
        7. Target electrolytes daily:
           - Sodium: 3-5g (more if active)
           - Potassium: 3-4g (from food + supplement)
           - Magnesium: 300-400mg
        8. Monitor urine color: Pale yellow optimal (not clear, not dark)
      `,
      monitoring: 'Urine color (pale yellow optimal), urine frequency (every 2-3 hours normal), body weight stability'
    },

    estimatedCost: {
      min: 0,
      max: 30,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Improved cognitive function',
      'Better physical performance',
      'Enhanced kidney function',
      'Improved bowel regularity',
      'Better skin hydration',
      'Optimal cellular function'
    ],
    timeToEffect: '1-2 weeks',
    successMetrics: [
      'Urine pale yellow color',
      'Urinating every 2-3 hours',
      'Improved energy and focus',
      'No persistent thirst'
    ],

    clinicianNotes: 'Overhydration possible but rare. Electrolyte balance matters - plain water alone can dilute sodium if excessive. Athletes need more sodium.'
  },

  {
    id: 'nutrition-013',
    name: 'Anti-Inflammatory Food Protocol',
    category: 'Nutrition',
    domain: 'cardiometabolic',
    type: 'diet',

    description: 'Dietary pattern emphasizing anti-inflammatory foods while eliminating pro-inflammatory triggers.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Certain foods promote inflammation (refined sugars, trans fats, processed meats) while others reduce it (omega-3s, polyphenols, fiber). Dietary patterns significantly affect inflammatory markers.',
    primaryCitations: [
      'Calder PC, et al. Dietary factors and low-grade inflammation. Br J Nutr. 2011',
      'Giugliano D, et al. The effects of diet on inflammation. J Am Coll Cardiol. 2006',
      'Casas R, et al. Anti-inflammatory effects of the Mediterranean diet. Endocr Metab Immune Disord Drug Targets. 2014'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Elevated hsCRP (>1 mg/L)',
      'Autoimmune conditions',
      'Chronic pain',
      'Metabolic syndrome',
      'Cardiovascular disease',
      'Inflammatory bowel disease'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Daily eating pattern',
      duration: 'Ongoing (minimum 12 weeks for benefits)',
      instructions: `
        EMPHASIZE (Anti-Inflammatory):
        1. Fatty fish: 3-4x/week (salmon, mackerel, sardines - omega-3s)
        2. Colorful vegetables: 5-7 servings/day (especially leafy greens)
        3. Berries: Daily (blueberries, strawberries - polyphenols)
        4. Nuts & seeds: 1-2 oz/day (walnuts, flax, chia)
        5. Extra virgin olive oil: 2-4 tbsp/day
        6. Turmeric & ginger: Daily (anti-inflammatory spices)
        7. Green tea: 2-3 cups/day
        8. Dark chocolate: 1 oz/day (70-85% cacao)

        ELIMINATE (Pro-Inflammatory):
        9. Refined sugars & sweetened beverages
        10. Trans fats & hydrogenated oils
        11. Processed/packaged foods
        12. Refined carbohydrates (white bread, pasta)
        13. Processed meats (bacon, sausage, deli meats)
        14. Excessive omega-6 oils (soybean, corn, vegetable oil)
        15. Alcohol (limit to ≤1 drink/day if any)
      `,
      monitoring: 'hsCRP (target <1 mg/L), inflammatory symptoms, pain levels, bowel regularity'
    },

    estimatedCost: {
      min: 400,
      max: 600,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Reduced hsCRP (<1 mg/L)',
      'Decreased chronic pain',
      'Improved autoimmune symptoms',
      'Better metabolic health',
      'Enhanced energy and wellbeing'
    ],
    timeToEffect: '8-12 weeks',
    successMetrics: [
      'hsCRP <1 mg/L',
      'Pain scores decrease',
      'Inflammatory symptoms improve'
    ],

    requiredLabValues: ['hsCRP', 'Lipid panel', 'HbA1c'],
    clinicianNotes: 'Similar to Mediterranean diet. Consider elimination diet if food sensitivities suspected. Omega-3 to omega-6 ratio important.'
  },

  {
    id: 'nutrition-014',
    name: 'Fiber Optimization (40-50g Daily)',
    category: 'Nutrition',
    domain: 'gut',
    type: 'diet',

    description: 'High-fiber diet (40-50g/day) from diverse sources for gut microbiome health, metabolic benefits, and disease prevention.',
    evidenceLevel: 'STRONG',
    evidenceSummary: 'High fiber intake reduces all-cause mortality, improves metabolic health, supports microbiome diversity. Most Americans consume <15g/day (RDA is 25-35g).',
    primaryCitations: [
      'Reynolds A, et al. Carbohydrate quality and human health. Lancet. 2019',
      'Threapleton DE, et al. Dietary fiber and cardiovascular disease. BMJ. 2013',
      'Makki K, et al. The impact of dietary fiber on gut microbiota. Cell Host Microbe. 2018'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Metabolic syndrome',
      'Type 2 diabetes',
      'Cardiovascular disease prevention',
      'Constipation',
      'Weight management',
      'Gut dysbiosis'
    ],
    contraindications: [
      {
        condition: 'Bowel obstruction',
        severity: 'absolute',
        alternative: 'Low-fiber diet until resolved'
      },
      {
        condition: 'IBD flare',
        severity: 'relative',
        alternative: 'Low-fiber during flare, increase gradually in remission'
      }
    ],

    protocol: {
      dosage: '40-50g total fiber daily (mix of soluble and insoluble)',
      frequency: 'Distributed across meals',
      duration: 'Ongoing',
      instructions: `
        1. Target: 40-50g fiber/day (higher than RDA, optimal for health)
        2. Increase gradually over 2-4 weeks (reduce gas/bloating)
        3. Diverse sources (feed different gut bacteria):
           - Vegetables: 5-7 servings (broccoli, Brussels sprouts, carrots)
           - Legumes: 1-2 servings daily (beans, lentils, chickpeas)
           - Whole grains: 3-4 servings (oats, quinoa, barley, farro)
           - Nuts & seeds: 1-2 oz (almonds, chia, flax)
           - Fruits: 3-4 servings (berries, apples, pears)
        4. Soluble fiber (25-35%): Oats, beans, apples, psyllium
        5. Insoluble fiber (65-75%): Whole grains, vegetables, nuts
        6. Hydration critical: Increase water intake with fiber
        7. Optional supplement: Psyllium husk 1-2 tsp/day if needed
      `,
      monitoring: 'Track daily fiber intake, bowel movements (Bristol scale 3-4 ideal), blood glucose, lipids'
    },

    estimatedCost: {
      min: 50,
      max: 100,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Improved bowel regularity',
      'Lower cholesterol (LDL decreases 5-10%)',
      'Better blood glucose control',
      'Increased satiety and weight loss',
      'Enhanced gut microbiome diversity',
      'Reduced all-cause mortality'
    ],
    timeToEffect: '4-8 weeks',
    successMetrics: [
      'Bristol stool scale 3-4',
      'LDL cholesterol decreases',
      'HbA1c improves in diabetics',
      'Sustained fiber intake >40g/day'
    ],

    requiredLabValues: ['Lipid panel', 'HbA1c', 'Fasting glucose'],
    clinicianNotes: 'Start low, go slow to minimize GI symptoms. Diversity of fiber sources important for microbiome. Most Americans severely deficient.'
  },

  {
    id: 'nutrition-015',
    name: 'Nitrate-Rich Foods for Vascular Health',
    category: 'Nutrition',
    domain: 'cardiometabolic',
    type: 'diet',

    description: 'Dietary nitrates from beets, leafy greens, and vegetables to boost nitric oxide production and improve cardiovascular function.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Dietary nitrates convert to nitric oxide, improving endothelial function, lowering blood pressure, and enhancing exercise performance.',
    primaryCitations: [
      'Lundberg JO, et al. The nitrate-nitrite-nitric oxide pathway in physiology. Nat Rev Drug Discov. 2008',
      'Kapil V, et al. Inorganic nitrate supplementation lowers blood pressure. Hypertension. 2015',
      'Jones AM, et al. Dietary nitrate and physical performance. Ann Rev Nutr. 2018'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Hypertension',
      'Cardiovascular disease',
      'Athletic performance enhancement',
      'Endothelial dysfunction',
      'Peripheral artery disease'
    ],
    contraindications: [],

    protocol: {
      dosage: '300-500 mg dietary nitrate daily (~500ml beet juice OR 200-300g leafy greens)',
      frequency: 'Daily',
      duration: 'Ongoing',
      instructions: `
        HIGH NITRATE FOODS:
        1. Beet juice: 8-16 oz (250-500ml) daily - highest source
        2. Beetroot: 1-2 cooked beets
        3. Leafy greens: 2-3 cups arugula, spinach, bok choy
        4. Celery: 4-5 stalks
        5. Lettuce: 2-3 cups (especially butterhead, arugula)

        PROTOCOL TIPS:
        6. Timing: Consume 2-3 hours before exercise for performance
        7. Don't use mouthwash (kills nitrate-converting bacteria)
        8. Don't brush immediately after (same reason)
        9. Combine with vitamin C foods (enhance conversion)
        10. Note: Urine/stool may turn reddish (beeturia - harmless)
      `,
      monitoring: 'Blood pressure (home monitoring), exercise performance, flow-mediated dilation (optional)'
    },

    estimatedCost: {
      min: 30,
      max: 100,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Reduced blood pressure (4-8 mmHg)',
      'Improved endothelial function',
      'Enhanced exercise performance (2-3% improvement)',
      'Better oxygen utilization',
      'Improved vascular health'
    ],
    timeToEffect: '2-4 weeks for BP, acute effects for exercise (2-3 hours)',
    successMetrics: [
      'Systolic BP decreases 4-8 mmHg',
      'Diastolic BP decreases 2-4 mmHg',
      'Exercise performance improves'
    ],

    requiredAssessments: ['Baseline blood pressure', 'Exercise tolerance test (optional)'],
    clinicianNotes: 'Mouthwash and antibiotics kill nitrate-reducing oral bacteria, blunting effects. Beetroot juice most studied. Effects additive with exercise.'
  }
];

// ============================================================================
// ADVANCED DIAGNOSTICS INTERVENTIONS (10)
// ============================================================================

const diagnosticsInterventions: Intervention[] = [
  {
    id: 'diagnostics-001',
    name: 'Coronary Artery Calcium (CAC) Score',
    category: 'Advanced Diagnostics',
    domain: 'cardiometabolic',
    type: 'screening',

    description: 'CT scan measuring calcium in coronary arteries for precise cardiovascular risk stratification.',
    evidenceLevel: 'STRONG',
    evidenceSummary: 'CAC score is the strongest predictor of cardiovascular events. Score of 0 indicates very low risk; >100 indicates moderate-high risk. Changes risk assessment and treatment decisions.',
    primaryCitations: [
      'Greenland P, et al. Coronary calcium score and cardiovascular risk. JACC. 2018',
      'Budoff MJ, et al. Long-term prognosis associated with coronary calcification. JACC. 2007',
      'Nasir K, et al. Implications of coronary artery calcium testing. JACC Cardiovasc Imaging. 2016'
    ],

    targetAgeGroup: ['40-49', '50-59', '60-69'],
    targetGender: 'all',
    indications: [
      'Intermediate cardiovascular risk (7.5-20% 10-year ASCVD risk)',
      'Strong family history of early CVD',
      'Uncertain statin benefit',
      'High lipoprotein(a)',
      'Metabolic syndrome'
    ],
    contraindications: [
      {
        condition: 'Known coronary artery disease',
        severity: 'relative',
        alternative: 'Already high risk, no need for CAC'
      },
      {
        condition: 'Pregnancy',
        severity: 'absolute',
        alternative: 'Avoid radiation exposure'
      }
    ],

    protocol: {
      frequency: 'Once (repeat in 5-10 years if score >0)',
      duration: 'Single test',
      instructions: `
        1. Non-contrast CT scan (low radiation dose)
        2. No preparation needed
        3. Takes 10-15 minutes
        4. Scoring:
           - 0: No calcium (very low risk)
           - 1-99: Mild calcium (low-moderate risk)
           - 100-399: Moderate calcium (moderate-high risk)
           - ≥400: Severe calcium (high risk)
        5. Results guide treatment intensity:
           - Score 0: Defer statin unless other high-risk features
           - Score >100: Strong statin recommendation
      `,
      monitoring: 'Single test to guide long-term treatment. Repeat only if clinical picture changes significantly.'
    },

    estimatedCost: {
      min: 100,
      max: 400,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Precise risk stratification',
      'Guides statin therapy decisions',
      'Motivates lifestyle changes (seeing actual disease)',
      'Avoids unnecessary treatment if score 0',
      'Identifies high-risk patients needing aggressive treatment'
    ],
    timeToEffect: 'Immediate results guide treatment',
    successMetrics: [
      'CAC score obtained',
      'Treatment plan adjusted based on results',
      'Patient motivated by concrete data'
    ],

    requiredAssessments: ['ASCVD risk score', 'Lipid panel', 'Blood pressure'],
    clinicianNotes: 'Most valuable for intermediate risk patients. Score of 0 is very reassuring. Extremely high scores (>1000) may need cardiology referral.'
  },

  {
    id: 'diagnostics-002',
    name: 'Advanced Lipid Panel (ApoB, Lp(a), LDL-P)',
    category: 'Advanced Diagnostics',
    domain: 'cardiometabolic',
    type: 'lab',

    description: 'Comprehensive lipid analysis beyond standard cholesterol, measuring particle number and genetic risk factors.',
    evidenceLevel: 'STRONG',
    evidenceSummary: 'ApoB is superior to LDL-C for risk assessment. Lp(a) is genetic risk factor affecting 20% of population. LDL particle number (LDL-P) better predicts risk than LDL-C in discordant cases.',
    primaryCitations: [
      'Sniderman AD, et al. Apolipoprotein B particles and cardiovascular disease. JAMA Cardiol. 2019',
      'Tsimikas S, et al. Lipoprotein(a) and cardiovascular disease. Circulation. 2017',
      'Cromwell WC, et al. LDL particle number and cardiovascular risk. Atherosclerosis. 2007'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Discordant lipids (high LDL-C but low TG, or vice versa)',
      'Premature cardiovascular disease',
      'Family history of early CVD',
      'Metabolic syndrome',
      'Statin intolerance (need precise targets)',
      'Optimization for longevity'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Annually or after treatment changes',
      duration: 'Repeat testing',
      instructions: `
        MARKERS TO TEST:
        1. ApoB (Apolipoprotein B): Target <80 mg/dL (optimal <60)
        2. Lp(a) (Lipoprotein(a)): Test once (genetic) - Concerning if >50 mg/dL
        3. LDL-P (LDL particle number): Target <1000 nmol/L (optimal <700)
        4. ApoA1: >130 mg/dL (protective)
        5. Remnant cholesterol: <20 mg/dL
        6. Triglycerides: <100 mg/dL (optimal)

        TESTING LOGISTICS:
        - Fasting 12 hours before test
        - NMR LipoProfile or Cardio IQ panels include these
        - More expensive than standard lipid panel ($100-300)
      `,
      monitoring: 'Retest after 3-6 months of treatment changes, then annually'
    },

    estimatedCost: {
      min: 100,
      max: 300,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Precise cardiovascular risk assessment',
      'Identify hidden risk not seen on standard lipid panel',
      'Guide aggressive treatment if ApoB or LDL-P elevated',
      'Identify genetic Lp(a) elevation requiring specific management',
      'Better treatment targets'
    ],
    timeToEffect: 'Immediate - guides treatment decisions',
    successMetrics: [
      'ApoB <80 mg/dL',
      'LDL-P <1000 nmol/L',
      'Treatment adjusted based on results'
    ],

    requiredLabValues: ['Standard lipid panel first to assess discordance'],
    clinicianNotes: 'Lp(a) is genetic - test once, doesn\'t change. High Lp(a) (>50 mg/dL) requires aggressive LDL lowering. ApoB superior to LDL-C as target.'
  },

  {
    id: 'diagnostics-003',
    name: 'Continuous Glucose Monitor (CGM)',
    category: 'Advanced Diagnostics',
    domain: 'cardiometabolic',
    type: 'screening',

    description: '14-day continuous glucose monitoring to assess glycemic variability, postprandial spikes, and metabolic health.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'CGM reveals glucose patterns missed by HbA1c and fasting glucose. High glucose variability and postprandial spikes predict cardiovascular risk even with normal HbA1c.',
    primaryCitations: [
      'Hirsch IB, et al. Role of continuous glucose monitoring in diabetes management. Diabetes Care. 2018',
      'Zhou J, et al. Glycemic variability and cardiovascular risk. Circulation. 2018',
      'Hall H, et al. Glucotypes reveal new patterns of glucose dysregulation. PLoS Biol. 2018'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Pre-diabetes (HbA1c 5.7-6.4%)',
      'Metabolic syndrome',
      'Weight loss resistance',
      'Family history of diabetes',
      'Reactive hypoglycemia symptoms',
      'Optimization for longevity'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Once for 14 days (repeat annually or with diet changes)',
      duration: '14-day wear',
      instructions: `
        DEVICES:
        - Dexcom G7 or Freestyle Libre (no prescription needed)
        - Apply sensor to upper arm or abdomen
        - Continuous readings via smartphone app
        - Wear for 14 days

        MONITORING GOALS:
        1. Fasting glucose: 70-90 mg/dL optimal
        2. Postprandial peak: <120 mg/dL ideal, <140 acceptable
        3. Time in range (70-120): >90% optimal
        4. Glucose variability: <20 mg/dL standard deviation
        5. Avoid spikes >140 mg/dL

        EXPERIMENTATION:
        - Test individual foods (see glucose response)
        - Test meal combinations (protein/fat blunt spikes)
        - Test exercise timing (improves glucose clearance)
        - Test sleep quality (poor sleep raises glucose)
      `,
      monitoring: 'Real-time glucose tracking for 14 days, analyze patterns'
    },

    estimatedCost: {
      min: 50,
      max: 150,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Identify glucose dysregulation before diabetes',
      'Personalized diet optimization',
      'Motivates behavior change (real-time feedback)',
      'Reveals hidden postprandial spikes',
      'Tracks metabolic improvement over time'
    ],
    timeToEffect: 'Immediate insights during 14-day wear',
    successMetrics: [
      'Time in range >90%',
      'Postprandial peaks <140 mg/dL',
      'Fasting glucose 70-90 mg/dL',
      'Low glucose variability'
    ],

    requiredLabValues: ['Baseline HbA1c', 'Fasting glucose', 'Fasting insulin'],
    clinicianNotes: 'Extremely valuable for patient education. Seeing real-time glucose spikes drives diet changes. Consider for anyone with metabolic syndrome or pre-diabetes.'
  },

  {
    id: 'diagnostics-004',
    name: 'DEXA Scan (Body Composition)',
    category: 'Advanced Diagnostics',
    domain: 'musculoskeletal',
    type: 'screening',

    description: 'Dual-energy X-ray absorptiometry for precise body composition, bone density, and visceral fat assessment.',
    evidenceLevel: 'STRONG',
    evidenceSummary: 'DEXA is gold standard for bone density. Also provides accurate body composition (lean mass, fat mass, visceral fat). Tracks sarcopenia and osteoporosis.',
    primaryCitations: [
      'Kanis JA, et al. DEXA and osteoporosis diagnosis. Osteoporos Int. 2013',
      'Prado CM, et al. Sarcopenia and mortality in cancer. J Clin Oncol. 2013',
      'Bosy-Westphal A, et al. DEXA for body composition assessment. Eur J Clin Nutr. 2013'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Baseline at age 40 (track changes over time)',
      'Osteopenia/osteoporosis screening (women >50, men >65)',
      'Sarcopenia assessment (muscle loss)',
      'Visceral fat quantification',
      'Weight loss tracking (preserve muscle)',
      'Athletic performance optimization'
    ],
    contraindications: [
      {
        condition: 'Pregnancy',
        severity: 'absolute',
        alternative: 'Avoid radiation'
      }
    ],

    protocol: {
      frequency: 'Annually or after major body composition changes',
      duration: 'Single 10-minute scan',
      instructions: `
        WHAT IT MEASURES:
        1. Bone mineral density (T-score and Z-score)
        2. Lean body mass (muscle)
        3. Fat mass (total and regional)
        4. Visceral adipose tissue (VAT)
        5. Android/gynoid fat ratio

        INTERPRETING RESULTS:
        - Bone: T-score >-1.0 normal, -1.0 to -2.5 osteopenia, <-2.5 osteoporosis
        - Muscle: Track lean mass over time (sarcopenia if declining)
        - Visceral fat: <100 cm² ideal, >160 cm² high risk
        - Body fat %: Men 10-20% optimal, Women 18-28% optimal

        PREPARATION:
        - No metal objects, remove jewelry
        - Wear light clothing
        - Fast not required
      `,
      monitoring: 'Annual scans to track trends - single scan less useful than serial measurements'
    },

    estimatedCost: {
      min: 150,
      max: 300,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Precise body composition (not just weight)',
      'Early osteoporosis detection',
      'Track muscle gain/loss with interventions',
      'Quantify visceral fat (metabolic risk)',
      'Motivates lifestyle changes (objective data)'
    ],
    timeToEffect: 'Immediate results, track changes over 6-12 months',
    successMetrics: [
      'Bone density stable or improving',
      'Lean mass maintained or increased',
      'Visceral fat <100 cm²',
      'Total body fat in healthy range'
    ],

    clinicianNotes: 'Gold standard for body composition. Medicare covers for osteoporosis screening. Extremely motivating for patients to track muscle mass during weight loss.'
  },

  {
    id: 'diagnostics-005',
    name: 'Comprehensive Hormone Panel',
    category: 'Advanced Diagnostics',
    domain: 'hormonal',
    type: 'lab',

    description: 'Complete hormone assessment including thyroid, sex hormones, adrenal function, and growth hormone status.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Hormonal imbalances common with aging. Testing reveals treatable causes of fatigue, mood changes, metabolic dysfunction, and cognitive decline.',
    primaryCitations: [
      'Garber JR, et al. Clinical practice guidelines for hypothyroidism. Thyroid. 2012',
      'Bhasin S, et al. Testosterone therapy in men with hypogonadism. J Clin Endocrinol Metab. 2018',
      'Cappola AR, et al. Thyroid status and cardiovascular risk. JAMA. 2006'
    ],

    targetAgeGroup: ['40-49', '50-59', '60-69', '70+'],
    targetGender: 'all',
    indications: [
      'Unexplained fatigue',
      'Mood changes or depression',
      'Weight changes',
      'Libido changes',
      'Cognitive decline',
      'Menopause symptoms (women)',
      'Andropause symptoms (men)'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Baseline, then annually if abnormal or on treatment',
      duration: 'Fasting morning blood draw',
      instructions: `
        COMPREHENSIVE PANEL:

        THYROID (morning fasting):
        1. TSH: 0.5-2.5 optimal (even if "normal" up to 4.5)
        2. Free T4: Mid-high normal range
        3. Free T3: Mid-high normal range
        4. Reverse T3: <15 ng/dL
        5. TPO antibodies (if TSH elevated)

        SEX HORMONES (morning fasting):
        MEN:
        6. Total testosterone: >500 ng/dL optimal
        7. Free testosterone: High normal range
        8. Estradiol: 20-30 pg/mL
        9. SHBG: 20-50 nmol/L

        WOMEN:
        10. Estradiol: Depends on cycle phase or menopause
        11. Progesterone: Day 21 of cycle
        12. Testosterone: 30-70 ng/dL
        13. FSH/LH: Assess menopausal status

        ADRENAL:
        14. Cortisol AM: 10-20 mcg/dL
        15. DHEA-S: Mid-high normal for age

        OPTIONAL:
        16. IGF-1 (growth hormone): Mid-normal for age
        17. Prolactin: <20 ng/mL
      `,
      monitoring: 'Retest 6-8 weeks after starting hormone replacement, then every 6-12 months'
    },

    estimatedCost: {
      min: 200,
      max: 500,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Identify treatable hormonal imbalances',
      'Resolve unexplained symptoms (fatigue, mood, weight)',
      'Guide hormone replacement therapy if appropriate',
      'Optimize thyroid function',
      'Improve metabolic health'
    ],
    timeToEffect: '6-8 weeks after treatment initiation',
    successMetrics: [
      'Hormones in optimal range (not just "normal")',
      'Symptom resolution',
      'Improved energy and wellbeing'
    ],

    requiredLabValues: ['Baseline comprehensive metabolic panel'],
    clinicianNotes: 'Test in early morning fasting for most accurate results. Many patients "normal" on standard tests but suboptimal. Consider endocrinology referral for complex cases.'
  },

  {
    id: 'diagnostics-006',
    name: 'Comprehensive Stool Analysis (GI-MAP)',
    category: 'Advanced Diagnostics',
    domain: 'gut',
    type: 'lab',

    description: 'DNA-based stool testing for pathogens, microbiome diversity, inflammatory markers, and digestive function.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Advanced stool testing reveals gut dysbiosis, pathogens, parasites, and inflammation missed by standard testing. Guides personalized gut health interventions.',
    primaryCitations: [
      'Qin J, et al. A human gut microbial gene catalogue. Nature. 2010',
      'Lloyd-Price J, et al. Multi-omics of the gut microbial ecosystem in IBD. Nature. 2019',
      'Sender R, et al. Revised estimates for the number of gut bacteria. Cell. 2016'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'IBS or unexplained GI symptoms',
      'Chronic diarrhea or constipation',
      'Suspected SIBO',
      'Autoimmune conditions',
      'Food sensitivities',
      'Post-antibiotic dysbiosis',
      'Optimization for gut health'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Once, then retest after 3-6 months of treatment',
      duration: 'Single at-home stool sample',
      instructions: `
        TESTS INCLUDED (GI-MAP or similar comprehensive panel):

        PATHOGENS:
        1. Bacteria: C. difficile, H. pylori, Salmonella, Campylobacter, etc.
        2. Parasites: Giardia, Cryptosporidium, Blastocystis, etc.
        3. Viruses: Norovirus, Rotavirus
        4. Fungi: Candida species

        COMMENSAL BACTERIA (diversity):
        5. Firmicutes/Bacteroidetes ratio
        6. Beneficial bacteria (Akkermansia, Lactobacillus, Bifidobacterium)
        7. Opportunistic bacteria (Klebsiella, Proteus, etc.)

        FUNCTIONAL MARKERS:
        8. Secretory IgA (immune function)
        9. Elastase (pancreatic function)
        10. Beta-glucuronidase (estrogen metabolism)
        11. Zonulin (intestinal permeability)
        12. Calprotectin (inflammation)

        COLLECTION:
        - At-home collection kit
        - Ship to lab (provided materials)
        - Results in 2-3 weeks
      `,
      monitoring: 'Retest after treatment protocol (3-6 months) to assess improvement'
    },

    estimatedCost: {
      min: 300,
      max: 450,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Identify root cause of GI symptoms',
      'Detect stealth infections (H. pylori, parasites)',
      'Assess microbiome diversity',
      'Guide targeted treatment (specific probiotics, antimicrobials)',
      'Track improvement with interventions'
    ],
    timeToEffect: 'Results in 2-3 weeks, guide treatment protocol',
    successMetrics: [
      'Pathogens cleared',
      'Microbiome diversity improved',
      'Inflammation markers normalized',
      'Symptom resolution'
    ],

    clinicianNotes: 'More comprehensive than standard stool culture. GI-MAP, Diagnostic Solutions, or Doctor\'s Data are reputable labs. Consider if standard GI workup negative.'
  },

  {
    id: 'diagnostics-007',
    name: 'Organic Acids Test (OAT)',
    category: 'Advanced Diagnostics',
    domain: 'cardiometabolic',
    type: 'lab',

    description: 'Urine test measuring metabolic intermediates to assess mitochondrial function, nutrient deficiencies, and toxin exposure.',
    evidenceLevel: 'EMERGING',
    evidenceSummary: 'OAT reveals metabolic dysfunction, nutrient deficiencies, and microbial overgrowth through organic acid markers. Guides targeted supplementation and treatment.',
    primaryCitations: [
      'Lord RS, et al. Laboratory Evaluations for Integrative Medicine. 2012',
      'Shaw W. Organic acid testing. In: Textbook of Functional Medicine. 2010',
      'Bennett MJ. Organic acidemias and inborn errors of metabolism. Clin Lab Med. 2011'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Chronic fatigue',
      'Mitochondrial dysfunction',
      'Suspected nutrient deficiencies',
      'Mood disorders',
      'Cognitive issues',
      'Autism spectrum',
      'Unexplained symptoms'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Once for baseline, repeat after 3-6 months of treatment',
      duration: 'Single first morning urine sample',
      instructions: `
        WHAT IT ASSESSES:

        MITOCHONDRIAL FUNCTION:
        1. Citric acid cycle intermediates
        2. ATP production markers
        3. Oxidative stress markers

        NEUROTRANSMITTERS:
        4. Dopamine, serotonin, norepinephrine metabolites
        5. Glutamate/GABA balance

        NUTRIENT STATUS:
        6. B vitamins (B1, B2, B3, B5, B6, B12, folate)
        7. CoQ10 status
        8. Carnitine status
        9. Antioxidant status (glutathione, vitamin C)

        GUT MARKERS:
        10. Bacterial overgrowth markers
        11. Yeast/fungal overgrowth (Candida)
        12. Clostridia species

        DETOXIFICATION:
        13. Phase I and Phase II detox capacity
        14. Toxic exposure markers

        COLLECTION:
        - First morning urine (most concentrated)
        - At-home collection kit
        - Ship to lab (Great Plains Laboratory standard)
      `,
      monitoring: 'Retest after 3-6 months of targeted supplementation to track improvement'
    },

    estimatedCost: {
      min: 250,
      max: 400,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Identify hidden nutrient deficiencies',
      'Assess mitochondrial function',
      'Detect gut dysbiosis and overgrowth',
      'Guide targeted supplement protocol',
      'Explain unexplained symptoms'
    ],
    timeToEffect: 'Results in 2-3 weeks, guide personalized protocol',
    successMetrics: [
      'Abnormal markers normalize',
      'Energy improves',
      'Symptoms resolve',
      'Cognitive function improves'
    ],

    clinicianNotes: 'Great Plains Laboratory most established. Useful when standard testing normal but patient symptomatic. Functional medicine tool.'
  },

  {
    id: 'diagnostics-008',
    name: 'Heavy Metals & Toxin Panel',
    category: 'Advanced Diagnostics',
    domain: 'hormonal',
    type: 'lab',

    description: 'Blood and/or urine testing for toxic metal exposure (lead, mercury, arsenic, cadmium) and environmental toxins.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Toxic metal exposure common and associated with cardiovascular disease, cognitive decline, and metabolic dysfunction. Testing identifies burden and guides chelation.',
    primaryCitations: [
      'Lanphear BP, et al. Low-level lead exposure and cardiovascular disease. Circulation. 2018',
      'Guallar E, et al. Mercury, fish oils, and cardiovascular risk. NEJM. 2002',
      'Tellez-Plaza M, et al. Cadmium exposure and cardiovascular mortality. Circulation. 2012'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Occupational exposure (painters, construction, dentists)',
      'High fish consumption (mercury)',
      'Old home (lead paint exposure)',
      'Cognitive decline',
      'Peripheral neuropathy',
      'Unexplained fatigue',
      'Fertility issues'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Once for baseline, monitor during chelation if elevated',
      duration: 'Blood draw and/or 24-hour urine collection',
      instructions: `
        TESTING OPTIONS:

        BLOOD TESTING (recent exposure):
        1. Lead (blood): <5 mcg/dL optimal (<10 acceptable)
        2. Mercury (blood): <5 mcg/L
        3. Arsenic (blood): <7 mcg/L
        4. Cadmium (blood): <1 mcg/L

        URINE TESTING (body burden):
        - 24-hour urine collection
        - Can add chelating agent (DMSA challenge test) to assess total burden
        - More sensitive for chronic low-level exposure

        HAIR ANALYSIS (optional):
        - Reflects 2-3 months exposure
        - Good for mercury from fish
        - Not as reliable as blood/urine

        ENVIRONMENTAL TOXINS (optional add-on):
        5. Plasticizers (BPA, phthalates)
        6. Pesticides (organophosphates)
        7. PCBs (persistent organic pollutants)
      `,
      monitoring: 'Retest every 3-6 months if undergoing chelation therapy'
    },

    estimatedCost: {
      min: 150,
      max: 400,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Identify toxic metal burden',
      'Guide chelation therapy if elevated',
      'Reduce cardiovascular risk',
      'Improve cognitive function',
      'Identify exposure source for remediation'
    ],
    timeToEffect: 'Immediate results guide treatment; chelation takes 6-12 months',
    successMetrics: [
      'Metal levels in optimal range',
      'Symptoms improve with treatment',
      'Exposure source identified and eliminated'
    ],

    clinicianNotes: 'Lead >5 mcg/dL associated with increased CVD risk even in "normal" range. High mercury often from large fish (tuna, swordfish). Consider chelation if significantly elevated.'
  },

  {
    id: 'diagnostics-009',
    name: 'VO2 Max & Cardiopulmonary Exercise Test',
    category: 'Advanced Diagnostics',
    domain: 'cardiometabolic',
    type: 'screening',

    description: 'Maximal exercise testing measuring oxygen consumption, aerobic capacity, and cardiovascular fitness.',
    evidenceLevel: 'STRONG',
    evidenceSummary: 'VO2 max is strongest predictor of all-cause mortality - stronger than traditional risk factors. Each 1 MET increase reduces mortality 10-25%.',
    primaryCitations: [
      'Blair SN, et al. Physical fitness and all-cause mortality. JAMA. 1989',
      'Kodama S, et al. Cardiorespiratory fitness as a predictor of mortality. JAMA Intern Med. 2009',
      'Mandsager K, et al. Association of cardiorespiratory fitness with long-term mortality. JAMA Netw Open. 2018'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Fitness assessment for longevity optimization',
      'Exercise prescription',
      'Athletic performance tracking',
      'Cardiovascular risk assessment',
      'Monitor exercise training effectiveness',
      'Pre-surgery risk assessment'
    ],
    contraindications: [
      {
        condition: 'Unstable angina or recent MI',
        severity: 'absolute',
        alternative: 'Stabilize cardiac condition first'
      },
      {
        condition: 'Severe aortic stenosis',
        severity: 'absolute',
        alternative: 'Cardiac clearance required'
      }
    ],

    protocol: {
      frequency: 'Annually or after major training changes',
      duration: '30-45 minute test with progressive intensity',
      instructions: `
        TEST PROTOCOL:
        1. Graded exercise test on treadmill or bike
        2. Wearing mask to measure oxygen consumption
        3. Progressive intensity until exhaustion
        4. Continuous ECG monitoring
        5. Blood pressure monitoring

        MEASUREMENTS:
        - VO2 max (mL/kg/min): Maximal oxygen consumption
        - METs: Metabolic equivalents (VO2 max ÷ 3.5)
        - Anaerobic threshold: Lactate threshold
        - Heart rate response
        - Blood pressure response
        - ECG changes (rule out ischemia)

        INTERPRETING RESULTS (VO2 max by age/gender):
        Men:
        - Age 40-49: >40 mL/kg/min excellent, <30 poor
        - Age 50-59: >35 mL/kg/min excellent, <25 poor
        Women:
        - Age 40-49: >35 mL/kg/min excellent, <25 poor
        - Age 50-59: >30 mL/kg/min excellent, <20 poor

        Higher = longer life expectancy
      `,
      monitoring: 'Annual testing to track fitness over time'
    },

    estimatedCost: {
      min: 200,
      max: 600,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Precise fitness and aerobic capacity assessment',
      'Strongest predictor of longevity',
      'Personalized exercise zones',
      'Track fitness improvements over time',
      'Motivates continued training'
    ],
    timeToEffect: 'Immediate results, retest every 6-12 months',
    successMetrics: [
      'VO2 max >40 mL/kg/min (men) or >35 (women) at age 50',
      'VO2 max improves 5-15% with training',
      'Elite longevity: VO2 max >45-50'
    ],

    requiredAssessments: ['Cardiovascular screening', 'Blood pressure', 'Resting ECG if >45 years'],
    clinicianNotes: 'VO2 max strongest mortality predictor. Elite longevity requires VO2 max in top 20% for age. Assess at baseline age 40, then track annually.'
  },

  {
    id: 'diagnostics-010',
    name: 'Genetic Testing (Cardiovascular & Longevity Panel)',
    category: 'Advanced Diagnostics',
    domain: 'cardiometabolic',
    type: 'lab',

    description: 'Genetic testing for cardiovascular disease risk, medication metabolism, and longevity-related genes.',
    evidenceLevel: 'MODERATE',
    evidenceSummary: 'Genetic variants affect cardiovascular risk (APOE, PCSK9, LPA), medication response (CYP450), and longevity. Testing guides personalized prevention and treatment.',
    primaryCitations: [
      'Khera AV, et al. Polygenic prediction of cardiovascular disease. Nat Genet. 2018',
      'Knowles JW, et al. Cardiovascular disease risk and genetic testing. Circulation. 2014',
      'Relling MV, et al. Pharmacogenomics and drug response. NEJM. 2015'
    ],

    targetAgeGroup: ['all'],
    targetGender: 'all',
    indications: [
      'Strong family history of early CVD',
      'Unexplained high cholesterol',
      'Planning statin therapy',
      'Recurrent DVT/PE (clotting disorders)',
      'Statin intolerance',
      'Longevity optimization'
    ],
    contraindications: [],

    protocol: {
      frequency: 'Once (genetic information doesn\'t change)',
      duration: 'Single saliva or blood sample',
      instructions: `
        KEY GENES TO TEST:

        CARDIOVASCULAR:
        1. APOE: ε4 allele → increased Alzheimer's and CVD risk
        2. LPA (Lp(a)): High genetic Lp(a) risk
        3. PCSK9: Loss-of-function → low LDL naturally
        4. LDLR: Familial hypercholesterolemia mutations
        5. Factor V Leiden: Clotting risk
        6. Prothrombin G20210A: Clotting risk

        PHARMACOGENOMICS:
        7. CYP2C19: Clopidogrel metabolism
        8. CYP2D6: Many drug metabolism pathways
        9. SLCO1B1: Statin myopathy risk

        METHYLATION:
        10. MTHFR: C677T and A1298C variants (need methylated B vitamins)

        LONGEVITY:
        11. FOXO3: Longevity gene
        12. CETP: HDL and longevity

        TESTING OPTIONS:
        - 23andMe, AncestryDNA (basic, upload to PromethEase)
        - Color Genomics (medical-grade CVD panel)
        - Invitae (familial hypercholesterolemia)
      `,
      monitoring: 'One-time test, use results lifelong for personalized medicine'
    },

    estimatedCost: {
      min: 100,
      max: 400,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Identify genetic cardiovascular risk',
      'Guide statin selection (avoid if SLCO1B1 variant)',
      'Personalize diet (APOE4 → lower saturated fat)',
      'Optimize supplement choices (MTHFR → methylated B vitamins)',
      'Understand familial risk'
    ],
    timeToEffect: 'Immediate results guide lifelong strategy',
    successMetrics: [
      'Genetic risks identified',
      'Treatment personalized based on genetics',
      'Family members screened if high-risk variants found'
    ],

    clinicianNotes: 'APOE4 carriers benefit more from lifestyle interventions. SLCO1B1 variants have high statin myopathy risk (choose alternative). Genetic testing becoming standard in prevention.'
  }
];

// ============================================================================
// CARDIOVASCULAR INTERVENTIONS (10)
// ============================================================================

const cardiovascularInterventions: Intervention[] = [
  // --------------------------------------------------------------------------
  // CV-001: Statin Therapy
  // --------------------------------------------------------------------------
  {
    id: 'cv-001',
    name: 'Statin Therapy (HMG-CoA Reductase Inhibitors)',
    category: 'Cardiovascular',
    domain: 'cardiometabolic',
    type: 'medication',

    description: 'HMG-CoA reductase inhibitors (statins) are the cornerstone of lipid management for cardiovascular disease prevention. Proven to reduce LDL-C by 30-50%, lower ApoB, stabilize plaque, and reduce cardiovascular events by 25-35%.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'Decades of RCTs show statins reduce major adverse cardiovascular events (MACE) by ~25% per 40 mg/dL reduction in LDL-C. Benefits proven in primary and secondary prevention. NNT = 50 over 5 years for primary prevention.',

    primaryCitations: [
      'Cholesterol Treatment Trialists Collaboration. Lancet 2010 (meta-analysis of 170,000 patients)',
      'JUPITER Trial: Rosuvastatin reduced cardiovascular events by 44%',
      'Heart Protection Study: Simvastatin reduced events by 24%'
    ],

    targetAgeGroup: ['40-49', '50-59', '60-69', '70+'],
    targetGender: 'all',

    indications: [
      'LDL-C ≥190 mg/dL (familial hypercholesterolemia)',
      'Diabetes age 40-75 with LDL-C 70-189 mg/dL',
      '10-year ASCVD risk ≥7.5% and LDL-C 70-189 mg/dL',
      'Known coronary artery disease (secondary prevention)',
      'ApoB >130 mg/dL (if available)',
      'Lp(a) >50 mg/dL with additional risk factors'
    ],

    contraindications: [
      {
        severity: 'absolute',
        condition: 'Active liver disease or unexplained persistent transaminase elevation',
        alternative: 'Use ezetimibe or PCSK9 inhibitor instead'
      },
      {
        severity: 'absolute',
        condition: 'Pregnancy or breastfeeding',
        alternative: 'Delay until after pregnancy/breastfeeding complete'
      },
      {
        severity: 'relative',
        condition: 'History of statin-associated myopathy',
        alternative: 'Try lower dose, alternate-day dosing, or rosuvastatin (least muscle effects)'
      },
      {
        severity: 'relative',
        condition: 'Age >75 without established CVD',
        alternative: 'Consider shared decision-making; may still benefit if high risk'
      }
    ],

    protocol: {
      frequency: 'Once daily',
      duration: 'Indefinite (lifelong for most)',
      instructions: `
        STATIN SELECTION (by potency):

        HIGH-INTENSITY (↓LDL 50%):
        - Atorvastatin 40-80 mg
        - Rosuvastatin 20-40 mg

        MODERATE-INTENSITY (↓LDL 30-50%):
        - Atorvastatin 10-20 mg
        - Rosuvastatin 5-10 mg
        - Simvastatin 20-40 mg
        - Pravastatin 40-80 mg

        LOW-INTENSITY (↓LDL <30%):
        - Simvastatin 10 mg
        - Pravastatin 10-20 mg

        DOSING STRATEGY:
        1. Start moderate-intensity for most patients
        2. Start high-intensity if LDL ≥190, known CAD, or diabetes with high risk
        3. Take at night (cholesterol synthesis peaks overnight)
        4. Check lipids at 4-12 weeks, adjust dose if needed
        5. Target: LDL <100 mg/dL (primary prevention), <70 mg/dL (secondary prevention)
        6. Optimal: ApoB <80 mg/dL, LDL-C <55 mg/dL for very high risk
      `,
      monitoring: 'Lipid panel at 4-12 weeks, then annually. ALT/AST at baseline and if symptomatic. CK if muscle symptoms develop.'
    },

    estimatedCost: {
      min: 4,
      max: 50,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'LDL-C reduction of 30-50% depending on dose',
      'ApoB reduction of 30-45%',
      '25-35% reduction in major cardiovascular events',
      'Stabilization of existing atherosclerotic plaque',
      'Reduction in inflammation (hsCRP)'
    ],
    timeToEffect: '4-6 weeks for lipid reduction, 1-2 years for cardiovascular benefit',
    successMetrics: [
      'LDL-C <100 mg/dL (primary prevention) or <70 mg/dL (secondary prevention)',
      'ApoB <80 mg/dL',
      'No myopathy symptoms (muscle pain, weakness)',
      'ALT/AST remain <3x upper limit normal'
    ],

    requiredLabValues: ['Lipid panel (LDL-C, ApoB if available)', 'ALT/AST at baseline'],
    requiredAssessments: ['10-year ASCVD risk calculation', 'Review for familial hypercholesterolemia'],
    clinicianNotes: 'Statins are among the most cost-effective interventions in all of medicine. Muscle symptoms occur in 5-10%, but true myopathy is rare (<0.1%). Consider CoQ10 100-200 mg/day if muscle symptoms. Rosuvastatin has longest half-life and least drug interactions. Check SLCO1B1 genetics if available (variant carriers have higher myopathy risk).'
  },

  // --------------------------------------------------------------------------
  // CV-002: ACE Inhibitors / ARBs for Hypertension
  // --------------------------------------------------------------------------
  {
    id: 'cv-002',
    name: 'ACE Inhibitors / ARBs for Hypertension & Cardiovascular Protection',
    category: 'Cardiovascular',
    domain: 'cardiometabolic',
    type: 'medication',

    description: 'Angiotensin-converting enzyme inhibitors (ACE-I) and angiotensin receptor blockers (ARBs) are first-line agents for hypertension, heart failure, and kidney protection. Block RAAS system, reducing BP and providing end-organ protection.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'RCTs show ACE-I/ARBs reduce stroke by 30-40%, heart failure by 20%, and slow progression of diabetic nephropathy. Preferred agents for patients with diabetes, CKD, or heart failure.',

    primaryCitations: [
      'HOPE Trial: Ramipril reduced CV events by 22%',
      'RENAAL: Losartan slowed diabetic nephropathy progression',
      'ONTARGET: Ramipril equivalent to telmisartan for CV protection'
    ],

    targetAgeGroup: ['40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'Blood pressure ≥140/90 mmHg (or ≥130/80 with diabetes/CKD)',
      'Diabetes with any hypertension or albuminuria',
      'Chronic kidney disease (eGFR <60 or albuminuria)',
      'Heart failure with reduced ejection fraction',
      'Post-myocardial infarction',
      'High cardiovascular risk even if BP normal'
    ],

    contraindications: [
      {
        type: 'absolute',
        condition: 'Pregnancy (teratogenic)',
        alternative: 'Use labetalol, nifedipine, or methyldopa instead'
      },
      {
        type: 'absolute',
        condition: 'History of angioedema with ACE-I',
        alternative: 'ARB may be used cautiously (2-10% cross-reactivity) or use calcium channel blocker'
      },
      {
        type: 'absolute',
        condition: 'Bilateral renal artery stenosis',
        alternative: 'Use calcium channel blocker or beta-blocker'
      },
      {
        type: 'relative',
        condition: 'Hyperkalemia (K >5.5 mEq/L)',
        alternative: 'Lower dose, add thiazide diuretic, or use calcium channel blocker'
      },
      {
        type: 'relative',
        condition: 'Severe renal impairment (eGFR <30)',
        alternative: 'Lower dose and monitor closely, or use alternative agent'
      }
    ],

    protocol: {
      frequency: 'Once or twice daily',
      duration: 'Indefinite (lifelong)',
      instructions: `
        ACE INHIBITORS (preferred if tolerated):
        - Lisinopril 10-40 mg daily
        - Ramipril 5-10 mg daily
        - Enalapril 10-20 mg twice daily
        - Benazepril 20-40 mg daily

        ARBs (use if ACE-I causes cough):
        - Losartan 50-100 mg daily
        - Valsartan 80-320 mg daily
        - Telmisartan 40-80 mg daily
        - Irbesartan 150-300 mg daily

        TITRATION STRATEGY:
        1. Start low dose (e.g., lisinopril 10 mg or losartan 50 mg)
        2. Check BP and labs (creatinine, K+) after 1-2 weeks
        3. Uptitrate every 2-4 weeks to target BP <130/80 mmHg
        4. Expect small increase in creatinine (<30% is acceptable)
        5. Add second agent if BP not controlled on max dose

        COMBINATION THERAPY:
        - ACE-I/ARB + thiazide diuretic (common)
        - ACE-I/ARB + calcium channel blocker (common)
        - DO NOT combine ACE-I + ARB (increases risk without benefit)
      `,
      monitoring: 'BP weekly during titration, then monthly. Creatinine and potassium at 1-2 weeks, then every 3-6 months.'
    },

    estimatedCost: {
      min: 4,
      max: 40,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'BP reduction of 10-15/5-10 mmHg',
      '20-30% reduction in stroke risk',
      '15-20% reduction in heart failure',
      'Slowed progression of kidney disease',
      'Reduced albuminuria by 30-50%'
    ],
    timeToEffect: '1-2 weeks for BP reduction, 6-12 months for kidney protection',
    successMetrics: [
      'BP <130/80 mmHg',
      'Creatinine increase <30% from baseline',
      'Potassium 3.5-5.0 mEq/L',
      'Reduction in albuminuria (if present)'
    ],

    requiredLabValues: ['Baseline creatinine and eGFR', 'Potassium', 'Urinalysis for albuminuria'],
    requiredAssessments: ['Blood pressure measurement', 'Review for renal artery stenosis risk'],
    clinicianNotes: 'ACE-I cause dry cough in 10-15% (switch to ARB). Angioedema is rare (<1%) but serious. Small creatinine increase (up to 30%) is expected and acceptable—reflects reduced intraglomerular pressure. Hyperkalemia more common in CKD or with NSAIDs/K-sparing diuretics. Telmisartan has longest half-life (once-daily dosing). Losartan is preferred in gout (mild uricosuric effect).'
  },

  // --------------------------------------------------------------------------
  // CV-003: Low-Dose Aspirin (Antiplatelet Therapy)
  // --------------------------------------------------------------------------
  {
    id: 'cv-003',
    name: 'Low-Dose Aspirin for Cardiovascular Prevention',
    category: 'Cardiovascular',
    domain: 'cardiometabolic',
    type: 'medication',

    description: 'Low-dose aspirin (75-100 mg daily) irreversibly inhibits platelet COX-1, reducing thromboxane A2 and platelet aggregation. Used for secondary prevention of cardiovascular events and select primary prevention cases.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'Clear benefit in secondary prevention (post-MI, stroke, known CAD): 20-25% reduction in recurrent events. Primary prevention benefit is smaller and must be weighed against bleeding risk (NNT ~250 over 10 years).',

    primaryCitations: [
      'Antithrombotic Trialists Collaboration: Aspirin reduces serious vascular events by 25% in secondary prevention',
      'ARRIVE, ASCEND, ASPREE trials: Mixed results for primary prevention',
      'US Preventive Services Task Force 2022: Aspirin for primary prevention individualized for ages 40-59 with high CVD risk'
    ],

    targetAgeGroup: ['40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'SECONDARY PREVENTION (clear benefit): Known coronary artery disease, prior MI, prior ischemic stroke/TIA, peripheral artery disease',
      'PRIMARY PREVENTION (selective use): Age 40-59 with ≥10% 10-year ASCVD risk AND low bleeding risk',
      'Diabetes with additional cardiovascular risk factors and low bleeding risk',
      'Chronic kidney disease with high cardiovascular risk'
    ],

    contraindications: [
      {
        type: 'absolute',
        condition: 'Active peptic ulcer disease or GI bleeding',
        alternative: 'Treat ulcer first, consider clopidogrel with PPI if high CV risk'
      },
      {
        type: 'absolute',
        condition: 'Hemophilia or bleeding disorders',
        alternative: 'Avoid antiplatelet agents unless absolute indication (e.g., post-stent)'
      },
      {
        type: 'absolute',
        condition: 'Severe thrombocytopenia (platelets <50k)',
        alternative: 'Treat underlying cause first'
      },
      {
        type: 'relative',
        condition: 'Age >70 without established CVD',
        alternative: 'Consider risk/benefit carefully (ASPREE showed increased bleeding without CV benefit)'
      },
      {
        type: 'relative',
        condition: 'Uncontrolled hypertension (BP >160/100)',
        alternative: 'Control BP first to reduce bleeding risk'
      }
    ],

    protocol: {
      frequency: 'Once daily',
      duration: 'Indefinite for secondary prevention; reassess regularly for primary prevention',
      instructions: `
        DOSING:
        - 81 mg daily (most common in US)
        - 75-100 mg daily (equivalent efficacy)
        - Take with food to reduce GI irritation

        FORMULATIONS:
        - Enteric-coated: May reduce GI symptoms but slower absorption
        - Non-enteric: Faster absorption, may be preferred for acute events
        - Chewable: For acute coronary syndrome (faster absorption)

        TIMING:
        - Evening dosing may be slightly more effective (platelets regenerate overnight)
        - Consistency matters more than specific timing

        STOPPING BEFORE SURGERY:
        - Continue for most surgeries (benefits > risks)
        - Stop 5-7 days before: Neurosurgery, ophthalmic surgery, prostate surgery
        - Resume 24-48 hours post-op if hemostasis achieved
      `,
      monitoring: 'Annual assessment of bleeding risk vs. cardiovascular benefit. No routine lab monitoring needed unless bleeding occurs.'
    },

    estimatedCost: {
      min: 2,
      max: 10,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'SECONDARY PREVENTION: 20-25% reduction in recurrent MI/stroke',
      'PRIMARY PREVENTION: ~10% reduction in cardiovascular events (if high risk)',
      'Slightly increased risk of major bleeding (1-2 extra events per 1000 person-years)',
      'Possible reduction in colorectal cancer (emerging evidence)'
    ],
    timeToEffect: 'Platelet inhibition within 1 hour; cardiovascular benefit accrues over months-years',
    successMetrics: [
      'No recurrent cardiovascular events',
      'No major bleeding complications',
      'Good adherence (>80% of days)'
    ],

    requiredLabValues: ['Baseline CBC (platelets, hemoglobin)', 'Consider H. pylori testing if GI symptoms'],
    requiredAssessments: ['10-year ASCVD risk calculation', 'Bleeding risk assessment (HAS-BLED score)'],
    clinicianNotes: 'The primary prevention story has shifted: Recent trials (ARRIVE, ASCEND, ASPREE) show smaller benefit and notable bleeding risk in modern era with better BP/lipid control. Now recommended selectively for ages 40-59 with ≥10% ASCVD risk and low bleeding risk. Secondary prevention remains clear indication. Adding PPI (e.g., omeprazole 20 mg) reduces GI bleeding by 50% but may reduce aspirin absorption if enteric-coated. "Aspirin resistance" is controversial—non-adherence is more common than true resistance.'
  },

  // --------------------------------------------------------------------------
  // CV-004: Beta-Blockers
  // --------------------------------------------------------------------------
  {
    id: 'cv-004',
    name: 'Beta-Blockers for Hypertension, Heart Failure, and Post-MI',
    category: 'Cardiovascular',
    domain: 'cardiometabolic',
    type: 'medication',

    description: 'Beta-adrenergic blocking agents reduce heart rate, contractility, and blood pressure by blocking beta-1 receptors. Essential for heart failure with reduced EF, post-MI, and rate control in atrial fibrillation.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'Clear mortality benefit in heart failure (30-35% reduction) and post-MI (20-25% reduction). Less preferred as first-line for uncomplicated hypertension, but valuable in specific populations.',

    primaryCitations: [
      'CIBIS-II: Bisoprolol reduced mortality by 34% in heart failure',
      'MERIT-HF: Metoprolol reduced mortality by 34% in heart failure',
      'ISIS-1: Atenolol reduced mortality by 15% post-MI'
    ],

    targetAgeGroup: ['40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'Heart failure with reduced ejection fraction (HFrEF)',
      'Post-myocardial infarction',
      'Atrial fibrillation (rate control)',
      'Hypertension with coronary artery disease',
      'Hypertension with high sympathetic tone (young, tachycardic patients)',
      'Hypertrophic cardiomyopathy',
      'Aortic aneurysm (reduce shear stress)'
    ],

    contraindications: [
      {
        type: 'absolute',
        condition: 'Severe bradycardia (HR <50 bpm) or heart block (2nd/3rd degree)',
        alternative: 'May need pacemaker if beta-blocker essential'
      },
      {
        type: 'absolute',
        condition: 'Decompensated heart failure with cardiogenic shock',
        alternative: 'Stabilize first with diuretics/inotropes, then initiate low-dose beta-blocker'
      },
      {
        type: 'absolute',
        condition: 'Severe asthma or active bronchospasm',
        alternative: 'Use cardioselective agent (bisoprolol, metoprolol) cautiously or avoid entirely'
      },
      {
        type: 'relative',
        condition: 'Peripheral vascular disease',
        alternative: 'May worsen claudication; use cardioselective agent if needed'
      },
      {
        type: 'relative',
        condition: 'Diabetes on insulin',
        alternative: 'May mask hypoglycemia symptoms; educate patient and monitor glucose'
      }
    ],

    protocol: {
      frequency: 'Once or twice daily',
      duration: 'Indefinite for most indications',
      instructions: `
        CARDIOSELECTIVE BETA-1 BLOCKERS (preferred):
        - Metoprolol succinate (Toprol-XL) 25-200 mg daily
        - Bisoprolol 2.5-10 mg daily
        - Carvedilol 6.25-25 mg twice daily (also has alpha-blocking effect)

        NON-SELECTIVE (beta-1 and beta-2):
        - Propranolol 40-160 mg twice daily (avoid in asthma/COPD)
        - Atenolol 25-100 mg daily (renally cleared, less preferred)

        HEART FAILURE TITRATION (start low, go slow):
        1. Start: Metoprolol 12.5 mg twice daily or bisoprolol 1.25 mg daily
        2. Double dose every 2 weeks if tolerated
        3. Target: HR 55-60 bpm or max tolerated dose
        4. May worsen symptoms initially—educate patient this improves

        HYPERTENSION:
        - Start: Metoprolol 50 mg daily or bisoprolol 5 mg daily
        - Target BP <130/80 mmHg

        POST-MI:
        - Start within 24 hours if hemodynamically stable
        - Continue indefinitely (at least 3 years, often lifelong)
      `,
      monitoring: 'Heart rate and BP at each visit. Watch for fatigue, bradycardia, hypotension, worsening heart failure symptoms.'
    },

    estimatedCost: {
      min: 4,
      max: 40,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'Heart failure: 30-35% reduction in mortality',
      'Post-MI: 20-25% reduction in recurrent MI and mortality',
      'BP reduction: 10-15/5-10 mmHg',
      'Heart rate reduction to target 55-70 bpm',
      'Improved exercise tolerance in heart failure (takes 2-3 months)'
    ],
    timeToEffect: '1-2 weeks for BP/HR effects, 2-6 months for heart failure symptom improvement',
    successMetrics: [
      'Heart rate 55-70 bpm (lower in HF)',
      'BP <130/80 mmHg',
      'No symptomatic bradycardia or hypotension',
      'Improved functional class in heart failure'
    ],

    requiredLabValues: ['Baseline ECG (rule out heart block)', 'BNP/NT-proBNP if heart failure'],
    requiredAssessments: ['Baseline heart rate and blood pressure', 'Echocardiogram if heart failure suspected'],
    clinicianNotes: 'Carvedilol and metoprolol succinate are the evidence-based beta-blockers for HFrEF—use these specifically. Bisoprolol also acceptable. Atenolol is less preferred (no mortality benefit in hypertension, renally cleared). Beta-blockers may initially worsen HF symptoms ("start low, go slow"). Patients often feel fatigued initially—reassure this improves. Cardioselective agents (metoprolol, bisoprolol) safer in COPD but still use cautiously. Never abruptly stop beta-blockers in CAD (risk of rebound ischemia).'
  },

  // --------------------------------------------------------------------------
  // CV-005: Calcium Channel Blockers
  // --------------------------------------------------------------------------
  {
    id: 'cv-005',
    name: 'Calcium Channel Blockers for Hypertension & Angina',
    category: 'Cardiovascular',
    domain: 'cardiometabolic',
    type: 'medication',

    description: 'Calcium channel blockers (CCBs) inhibit calcium entry into vascular smooth muscle and cardiac cells, causing vasodilation and reduced cardiac contractility. Effective for hypertension, angina, and rate control in atrial fibrillation.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'CCBs reduce stroke by 30-40% and cardiovascular events by 15-20%. Non-inferior to other first-line agents for hypertension. Particularly effective in African American and elderly populations.',

    primaryCitations: [
      'ALLHAT: Amlodipine equivalent to thiazides for CV outcomes',
      'ASCOT: Amlodipine-based regimen superior to atenolol-based for stroke prevention',
      'HOT Trial: CCBs effective for BP control and CV protection'
    ],

    targetAgeGroup: ['40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'Hypertension (especially African American, elderly, isolated systolic HTN)',
      'Chronic stable angina',
      'Vasospastic (Prinzmetal) angina',
      'Atrial fibrillation (rate control with diltiazem/verapamil)',
      'Raynaud phenomenon',
      'Hypertrophic cardiomyopathy (verapamil)'
    ],

    contraindications: [
      {
        type: 'absolute',
        condition: 'Severe aortic stenosis (non-dihydropyridines)',
        alternative: 'Use ACE-I or ARB instead'
      },
      {
        type: 'absolute',
        condition: 'Heart failure with reduced EF (non-dihydropyridines)',
        alternative: 'Use ACE-I, ARB, or amlodipine (neutral in HF) instead'
      },
      {
        type: 'absolute',
        condition: '2nd or 3rd degree AV block (non-dihydropyridines)',
        alternative: 'Use dihydropyridine CCB or other antihypertensive'
      },
      {
        type: 'relative',
        condition: 'Severe left ventricular dysfunction (diltiazem/verapamil)',
        alternative: 'Use amlodipine or other class'
      }
    ],

    protocol: {
      frequency: 'Once or twice daily',
      duration: 'Indefinite',
      instructions: `
        DIHYDROPYRIDINES (peripheral vasodilators, no heart rate effect):
        - Amlodipine 5-10 mg daily (long-acting, once daily)
        - Nifedipine XL 30-90 mg daily (long-acting formulation only)
        - Felodipine 5-10 mg daily

        NON-DIHYDROPYRIDINES (reduce heart rate, avoid in HFrEF):
        - Diltiazem CD 180-360 mg daily (for HTN, rate control)
        - Verapamil SR 120-480 mg daily (for HTN, rate control, angina)

        SELECTION GUIDE:
        - Hypertension only: Amlodipine (first-line)
        - Hypertension + angina: Amlodipine or diltiazem
        - Atrial fibrillation (rate control): Diltiazem or verapamil
        - Raynaud/vasospasm: Nifedipine XL or amlodipine

        TITRATION:
        1. Start: Amlodipine 5 mg daily or diltiazem 120 mg daily
        2. Increase every 1-2 weeks to target BP <130/80 mmHg
        3. Watch for peripheral edema (common with dihydropyridines)
        4. Edema is NOT fluid overload—reassure patient
      `,
      monitoring: 'BP and HR at each visit. Monitor for peripheral edema (legs/ankles). ECG if using diltiazem/verapamil.'
    },

    estimatedCost: {
      min: 4,
      max: 30,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'BP reduction of 10-20/5-10 mmHg',
      '30-40% reduction in stroke risk',
      'Reduced angina frequency by 50-70%',
      'Heart rate reduction of 10-20 bpm (non-dihydropyridines only)',
      'Peripheral edema in 10-20% (benign, dose-dependent)'
    ],
    timeToEffect: '1-2 weeks for BP reduction, immediate for angina relief',
    successMetrics: [
      'BP <130/80 mmHg',
      'Reduced angina episodes (if applicable)',
      'Heart rate 60-90 bpm (if using non-dihydropyridine)',
      'Tolerable side effects'
    ],

    requiredLabValues: ['Baseline ECG (if using diltiazem/verapamil)'],
    requiredAssessments: ['Blood pressure measurement', 'Heart rate (if using non-dihydropyridine)'],
    clinicianNotes: 'Amlodipine is the most commonly used CCB—long half-life, once-daily, well-tolerated. Peripheral edema is dose-dependent (higher with 10 mg) and NOT a sign of heart failure (diuretics do not help; only lowering dose helps). Non-dihydropyridines (diltiazem, verapamil) should NOT be used in HFrEF but safe with preserved EF. Good for African American populations (often salt-sensitive and respond well to CCBs). Watch for constipation with verapamil (can be severe). Diltiazem/verapamil increase levels of simvastatin (use atorvastatin or rosuvastatin instead).'
  },

  // --------------------------------------------------------------------------
  // CV-006: Home Blood Pressure Monitoring Protocol
  // --------------------------------------------------------------------------
  {
    id: 'cv-006',
    name: 'Home Blood Pressure Monitoring Protocol',
    category: 'Cardiovascular',
    domain: 'cardiometabolic',
    type: 'screening',

    description: 'Systematic home blood pressure monitoring with validated device to detect hypertension, assess treatment efficacy, and identify white-coat or masked hypertension. Superior to office measurements for predicting cardiovascular risk.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'Home BP monitoring correlates better with cardiovascular outcomes than office readings. Improves BP control, medication adherence, and patient engagement. Essential for diagnosing white-coat (15-30% of patients) and masked hypertension (10-15%).',

    primaryCitations: [
      'Stergiou et al. J Hypertens 2021: Home BP monitoring improves BP control by 4/2 mmHg',
      'AHA Scientific Statement 2019: Home BP monitoring recommended for all hypertensive patients',
      'SPRINT Trial: Used unattended automated office BP (similar to home BP)'
    ],

    targetAgeGroup: ['30-39', '40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'Suspected hypertension (office BP 130-160/80-100)',
      'Established hypertension (to assess control)',
      'Starting or titrating antihypertensive medications',
      'Suspected white-coat hypertension (high office, normal symptoms)',
      'Suspected masked hypertension (normal office, but high CV risk)',
      'Chronic kidney disease',
      'Diabetes',
      'Pregnancy (gestational hypertension monitoring)'
    ],

    contraindications: [],

    protocol: {
      frequency: 'Daily during diagnosis phase, weekly once controlled',
      duration: 'Ongoing',
      instructions: `
        DEVICE REQUIREMENTS:
        - Validated, automated, upper-arm cuff device
        - Appropriate cuff size (measure arm circumference)
        - Devices validated by: https://www.validatebp.org
        - Recommended brands: Omron, Withings, A&D Medical

        MEASUREMENT TECHNIQUE (critical for accuracy):
        1. Sit quietly for 5 minutes before measuring
        2. Empty bladder if needed
        3. No caffeine or exercise for 30 minutes before
        4. Sit with back supported, feet flat on floor
        5. Arm supported at heart level
        6. Cuff on bare arm (not over clothing)
        7. Take 2 readings, 1 minute apart
        8. Record both readings and average them

        MEASUREMENT FREQUENCY:
        INITIAL DIAGNOSIS PHASE (2 weeks):
        - Twice daily: morning (before meds) and evening (before dinner)
        - 2 readings per session, 1 minute apart
        - Record all readings
        - Average all readings after discarding first day

        TREATMENT MONITORING:
        - Daily for 1 week after medication change
        - 2-3 times per week once stable

        TARGET VALUES (home BP is lower than office):
        - <135/85 mmHg for most patients
        - <130/80 mmHg for diabetes, CKD, or high risk
        - <120/80 mmHg for very high risk (post-MI, stroke)

        REPORTING TO CLINICIAN:
        - Bring log or app data to all visits
        - Report average of all readings
        - Note any very high or very low readings
      `,
      monitoring: 'Review BP log at every visit. Adjust medications based on home readings, not office readings.'
    },

    estimatedCost: {
      min: 50,
      max: 150,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Earlier detection of hypertension',
      'Better BP control (average 4/2 mmHg improvement)',
      'Identification of white-coat hypertension (avoids unnecessary meds)',
      'Identification of masked hypertension (detects undertreated patients)',
      'Improved medication adherence',
      'Empowers patient engagement'
    ],
    timeToEffect: 'Immediate data collection, 2 weeks for diagnosis',
    successMetrics: [
      'Home BP <135/85 mmHg (or <130/80 if high risk)',
      'Consistent measurement technique',
      'Regular monitoring (>80% adherence)',
      'BP log shared with clinician at visits'
    ],

    requiredLabValues: [],
    requiredAssessments: ['Teach proper measurement technique (watch patient do it)', 'Verify device is validated'],
    clinicianNotes: 'Home BP monitoring is one of the highest-yield, lowest-cost interventions in hypertension management. Insist on validated devices (https://www.validatebp.org)—many wrist and finger devices are inaccurate. Proper technique is critical: arm at heart level, back supported, 5 minutes rest. White-coat hypertension is common (office BP 140/90, home BP <135/85)—avoid overtreatment. Masked hypertension is dangerous (office BP <140/90, home BP ≥135/85)—requires treatment. Consider 24-hour ambulatory BP monitoring if home BP unclear or suspected nocturnal hypertension. Prescribe home BP monitoring like a medication—specific instructions, follow-up.'
  },

  // --------------------------------------------------------------------------
  // CV-007: Non-Statin Lipid Management (Ezetimibe, PCSK9i, Bempedoic Acid)
  // --------------------------------------------------------------------------
  {
    id: 'cv-007',
    name: 'Non-Statin Lipid Management (Ezetimibe, PCSK9 Inhibitors, Bempedoic Acid)',
    category: 'Cardiovascular',
    domain: 'cardiometabolic',
    type: 'medication',

    description: 'Non-statin lipid-lowering therapies for patients with insufficient LDL reduction on statins, statin intolerance, or very high cardiovascular risk requiring aggressive LDL lowering (<55 mg/dL).',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'Ezetimibe (IMPROVE-IT) and PCSK9 inhibitors (FOURIER, ODYSSEY) reduce LDL-C and cardiovascular events when added to statins. Bempedoic acid offers alternative for statin-intolerant patients.',

    primaryCitations: [
      'IMPROVE-IT: Ezetimibe + statin reduced CV events by 6.4% vs. statin alone',
      'FOURIER: Evolocumab reduced CV events by 15% (LDL-C reduced to 30 mg/dL)',
      'ODYSSEY: Alirocumab reduced CV events by 15%',
      'CLEAR Outcomes: Bempedoic acid reduced CV events by 13%'
    ],

    targetAgeGroup: ['40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'LDL-C ≥70 mg/dL on maximum tolerated statin (for secondary prevention)',
      'LDL-C ≥190 mg/dL despite statin (familial hypercholesterolemia)',
      'Very high risk requiring LDL <55 mg/dL (post-ACS, recurrent events)',
      'Statin intolerance (myalgias, elevated CK)',
      'Lp(a) >50 mg/dL with established CVD (PCSK9i reduce Lp(a) by 20-30%)'
    ],

    contraindications: [
      {
        type: 'absolute',
        condition: 'Pregnancy or breastfeeding (all agents)',
        alternative: 'Delay until after pregnancy/breastfeeding'
      },
      {
        type: 'absolute',
        condition: 'Active liver disease (bempedoic acid)',
        alternative: 'Use ezetimibe or PCSK9 inhibitor instead'
      },
      {
        type: 'relative',
        condition: 'Tendon disorders or rupture history (PCSK9i, bempedoic acid)',
        alternative: 'Use with caution; consider ezetimibe'
      }
    ],

    protocol: {
      frequency: 'Daily (ezetimibe, bempedoic acid) or every 2 weeks (PCSK9i)',
      duration: 'Indefinite',
      instructions: `
        EZETIMIBE (Zetia) - FIRST ADD-ON AGENT:
        - Dose: 10 mg once daily
        - LDL-C reduction: 15-20%
        - Mechanism: Inhibits intestinal cholesterol absorption
        - Side effects: Minimal (GI upset rare)
        - Cost: $10-40/month (generic available)
        - When: Add to statin if LDL not at goal

        PCSK9 INHIBITORS (Expensive, Reserved for High Risk):
        - Evolocumab (Repatha): 140 mg subcutaneous every 2 weeks OR 420 mg monthly
        - Alirocumab (Praluent): 75-150 mg subcutaneous every 2 weeks
        - LDL-C reduction: 50-60%
        - Mechanism: Monoclonal antibody blocks PCSK9, increases LDL receptors
        - Side effects: Injection site reactions, rare myalgias
        - Cost: $5,000-6,000/year (insurance prior auth required)
        - When: Familial hypercholesterolemia, statin intolerance, very high risk

        BEMPEDOIC ACID (Nexletol) - STATIN ALTERNATIVE:
        - Dose: 180 mg once daily
        - LDL-C reduction: 15-25%
        - Mechanism: Inhibits ATP citrate lyase (upstream of cholesterol synthesis)
        - Side effects: Gout, tendon rupture (rare), elevated uric acid
        - Cost: $400-500/month (prior auth often required)
        - When: Statin intolerance

        COMBINATION THERAPY (Nexlizet) - Bempedoic Acid + Ezetimibe:
        - Dose: 180 mg/10 mg once daily
        - LDL-C reduction: 35-40%
        - When: Statin intolerance and high LDL

        TREATMENT ALGORITHM:
        1. Start statin (first-line)
        2. If LDL not at goal → add ezetimibe
        3. If still not at goal → add PCSK9i (if very high risk)
        4. If statin intolerant → try bempedoic acid ± ezetimibe
      `,
      monitoring: 'Lipid panel 4-12 weeks after initiation, then every 6-12 months. Uric acid at baseline and periodically if on bempedoic acid.'
    },

    estimatedCost: {
      min: 10,
      max: 500,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'Ezetimibe: 15-20% LDL reduction, 6% relative reduction in CV events',
      'PCSK9i: 50-60% LDL reduction, 15% relative reduction in CV events',
      'Bempedoic acid: 15-25% LDL reduction, 13% reduction in CV events',
      'Combined therapy can achieve LDL <30 mg/dL'
    ],
    timeToEffect: 'Ezetimibe: 2 weeks, PCSK9i: 4 weeks, Bempedoic acid: 4 weeks',
    successMetrics: [
      'LDL-C <70 mg/dL (secondary prevention)',
      'LDL-C <55 mg/dL (very high risk)',
      'ApoB <80 mg/dL',
      'No significant side effects'
    ],

    requiredLabValues: ['Lipid panel', 'ApoB (if available)', 'Lp(a) (if available)', 'Uric acid (if bempedoic acid)'],
    requiredAssessments: ['Cardiovascular risk stratification', 'Prior statin trial documented'],
    clinicianNotes: 'Ezetimibe is the default add-on to statins—cheap, safe, effective. PCSK9 inhibitors are expensive but highly effective; insurance often requires documentation of statin intolerance or familial hypercholesterolemia. PCSK9i also reduce Lp(a) by 20-30% (unique benefit). Bempedoic acid is liver-selective (unlike statins which are systemic), explaining lower muscle side effects. Gout risk with bempedoic acid (increases uric acid). Inclisiran is a newer PCSK9i given twice yearly (better adherence) but very expensive. Combination ezetimibe + statin + PCSK9i can lower LDL to <30 mg/dL—"lower is better" for CV outcomes.'
  },

  // --------------------------------------------------------------------------
  // CV-008: Antiplatelet Therapy (Clopidogrel, Ticagrelor)
  // --------------------------------------------------------------------------
  {
    id: 'cv-008',
    name: 'Dual Antiplatelet Therapy (Clopidogrel, Ticagrelor) Post-ACS or PCI',
    category: 'Cardiovascular',
    domain: 'cardiometabolic',
    type: 'medication',

    description: 'P2Y12 inhibitors (clopidogrel, ticagrelor, prasugrel) combined with aspirin for dual antiplatelet therapy (DAPT) after acute coronary syndrome (ACS) or percutaneous coronary intervention (PCI) with stenting.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'DAPT reduces stent thrombosis by 60-80% and recurrent MI by 20-25% post-ACS/PCI. Duration depends on bleeding risk and stent type. Ticagrelor and prasugrel more potent than clopidogrel but higher bleeding risk.',

    primaryCitations: [
      'CURE: Clopidogrel + aspirin reduced CV events by 20% in ACS',
      'PLATO: Ticagrelor superior to clopidogrel post-ACS (16% relative reduction in CV death)',
      'TRITON-TIMI 38: Prasugrel superior to clopidogrel but more bleeding'
    ],

    targetAgeGroup: ['40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'Acute coronary syndrome (STEMI, NSTEMI, unstable angina)',
      'Post-PCI with stent placement (drug-eluting or bare-metal)',
      'High-risk patients with coronary artery disease'
    ],

    contraindications: [
      {
        type: 'absolute',
        condition: 'Active bleeding or hemorrhagic stroke',
        alternative: 'Discontinue until bleeding resolved'
      },
      {
        type: 'absolute',
        condition: 'Severe thrombocytopenia (platelets <50k)',
        alternative: 'Treat underlying cause first'
      },
      {
        type: 'relative',
        condition: 'History of intracranial hemorrhage (prasugrel)',
        alternative: 'Use clopidogrel or ticagrelor instead'
      },
      {
        type: 'relative',
        condition: 'Age >75 or weight <60 kg (prasugrel)',
        alternative: 'Lower dose prasugrel (5 mg) or use clopidogrel/ticagrelor'
      },
      {
        type: 'relative',
        condition: 'High bleeding risk',
        alternative: 'Shorter DAPT duration (3-6 months)'
      }
    ],

    protocol: {
      frequency: 'Once or twice daily',
      duration: '6-12 months typically, then reassess',
      instructions: `
        P2Y12 INHIBITORS:

        CLOPIDOGREL (Plavix) - STANDARD:
        - Loading dose: 600 mg once (at time of ACS/PCI)
        - Maintenance: 75 mg once daily
        - Pros: Well-tolerated, inexpensive (generic)
        - Cons: Prodrug (requires CYP2C19 activation), ~30% reduced responders

        TICAGRELOR (Brilinta) - MORE POTENT:
        - Loading dose: 180 mg once
        - Maintenance: 90 mg twice daily
        - Pros: Direct-acting (no genetic variability), reversible
        - Cons: Twice-daily dosing, dyspnea (10-15%), more expensive

        PRASUGREL (Effient) - MOST POTENT:
        - Loading dose: 60 mg once
        - Maintenance: 10 mg once daily (5 mg if age >75 or weight <60 kg)
        - Pros: Most potent, once-daily
        - Cons: Higher bleeding risk, contraindicated if prior stroke

        DUAL ANTIPLATELET THERAPY (DAPT) = Aspirin 81 mg + P2Y12 inhibitor

        DURATION AFTER PCI:
        - Drug-eluting stent (DES): Minimum 6 months, ideally 12 months
        - Bare-metal stent (BMS): Minimum 1 month, ideally 6-12 months
        - High bleeding risk: 3 months DES, 1 month BMS
        - Very high thrombotic risk: Consider 12-36 months DAPT

        DURATION AFTER ACS (no PCI):
        - 12 months DAPT, then aspirin alone

        STOPPING BEFORE SURGERY:
        - Continue aspirin
        - Stop P2Y12 inhibitor 5-7 days before surgery
        - Resume 24-48 hours post-op
      `,
      monitoring: 'CBC at baseline and if bleeding. No routine platelet function testing (not shown to improve outcomes).'
    },

    estimatedCost: {
      min: 10,
      max: 400,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      '60-80% reduction in stent thrombosis',
      '20-25% reduction in recurrent MI',
      '10-15% reduction in cardiovascular death (ticagrelor)',
      'Increased bleeding risk (major bleeding 1-2% per year)'
    ],
    timeToEffect: 'Immediate platelet inhibition with loading dose',
    successMetrics: [
      'No stent thrombosis',
      'No recurrent ACS',
      'No major bleeding',
      'Good adherence (>95%—skipping doses risks stent thrombosis)'
    ],

    requiredLabValues: ['Baseline CBC', 'CYP2C19 genotyping (optional, for clopidogrel poor metabolizers)'],
    requiredAssessments: ['Bleeding risk score (e.g., PRECISE-DAPT)', 'Ischemic risk score'],
    clinicianNotes: 'DAPT is lifesaving post-ACS/PCI but increases bleeding risk. Ticagrelor and prasugrel are more potent than clopidogrel (better outcomes but more bleeding). Clopidogrel is a prodrug—CYP2C19 poor metabolizers (*2, *3 alleles) have reduced efficacy (consider ticagrelor/prasugrel if genotyped). Ticagrelor causes dyspnea in 10-15% (usually mild, improves over time, not dangerous). Never stop DAPT early without consulting interventional cardiologist—premature discontinuation is leading cause of stent thrombosis (often fatal). Proton pump inhibitors (especially omeprazole) may reduce clopidogrel efficacy—use pantoprazole if PPI needed.'
  },

  // --------------------------------------------------------------------------
  // CV-009: Cardiac Rehabilitation Program
  // --------------------------------------------------------------------------
  {
    id: 'cv-009',
    name: 'Cardiac Rehabilitation Program',
    category: 'Cardiovascular',
    domain: 'cardiometabolic',
    type: 'referral',

    description: 'Supervised, comprehensive cardiac rehabilitation program including structured exercise training, cardiovascular risk factor modification, education, and counseling. Proven to reduce mortality and improve quality of life after cardiovascular events.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'Cardiac rehab reduces all-cause mortality by 20-30%, cardiovascular mortality by 25-30%, and hospital readmissions by 30%. Improves exercise capacity, BP, lipids, and mental health. Cost-effective and underutilized.',

    primaryCitations: [
      'Cochrane meta-analysis 2016: Cardiac rehab reduces CV mortality by 26%',
      'Anderson et al. JACC 2016: Cardiac rehab reduces all-cause mortality by 20%',
      'AHA/ACC Class I recommendation for post-MI, post-PCI, heart failure'
    ],

    targetAgeGroup: ['40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'Post-myocardial infarction (within 12 months)',
      'Post-PCI or CABG',
      'Chronic stable angina',
      'Heart failure with reduced ejection fraction',
      'Heart transplant',
      'Valvular heart disease (post-surgery)',
      'Peripheral artery disease'
    ],

    contraindications: [
      {
        type: 'absolute',
        condition: 'Unstable angina or acute heart failure',
        alternative: 'Stabilize medically first, then refer'
      },
      {
        type: 'absolute',
        condition: 'Severe aortic stenosis',
        alternative: 'Valve replacement first, then cardiac rehab'
      },
      {
        type: 'relative',
        condition: 'Severe orthopedic limitations',
        alternative: 'Modified program with seated exercises or aquatic therapy'
      }
    ],

    protocol: {
      frequency: '3 sessions per week',
      duration: '12 weeks (36 sessions)',
      instructions: `
        CARDIAC REHAB COMPONENTS (4 pillars):

        1. EXERCISE TRAINING (core component):
           - Supervised aerobic exercise (treadmill, bike, elliptical)
           - Start at 60-70% max heart rate, progress to 80-85%
           - Duration: 30-60 minutes per session
           - Continuous ECG monitoring initially, then spot-checks
           - Resistance training added after 4-6 weeks

        2. CARDIOVASCULAR RISK FACTOR MODIFICATION:
           - BP, lipid, and glucose management
           - Smoking cessation counseling
           - Weight management
           - Medication optimization

        3. EDUCATION:
           - Heart disease pathophysiology
           - Medication adherence
           - Warning signs of heart attack/heart failure
           - Nutrition counseling (Mediterranean diet, DASH diet)

        4. PSYCHOSOCIAL COUNSELING:
           - Depression screening (common post-MI)
           - Stress management
           - Return-to-work counseling
           - Sexual activity guidance

        PROGRAM STRUCTURE:
        - Phase I: Inpatient (hospital-based, immediately post-event)
        - Phase II: Outpatient supervised (12 weeks, 3x/week) ← MAIN PHASE
        - Phase III: Maintenance (home-based or gym, ongoing)

        EXPECTED PROGRESSION:
        - Week 1-2: Low intensity, close monitoring
        - Week 3-6: Gradual increase in intensity and duration
        - Week 7-12: Peak training intensity, prepare for home program

        REFERRAL PROCESS:
        1. Physician referral (required for insurance coverage)
        2. Pre-rehab assessment (stress test, echo if not recent)
        3. Insurance authorization (Medicare/most insurance covers 36 sessions)
        4. Start within 2-6 weeks of cardiac event
      `,
      monitoring: 'Heart rate, BP, and ECG monitoring during sessions. Progress notes shared with referring physician.'
    },

    estimatedCost: {
      min: 1000,
      max: 3000,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      '20-30% reduction in all-cause mortality',
      '25-30% reduction in cardiovascular mortality',
      '30% reduction in hospital readmissions',
      '15-30% improvement in exercise capacity (VO2 max)',
      'Improved quality of life and mental health',
      'BP reduction 5-10/5 mmHg',
      'LDL-C reduction 10-20 mg/dL',
      'Weight loss 2-5 kg',
      'Reduced depression and anxiety'
    ],
    timeToEffect: '12 weeks for primary program, ongoing benefits',
    successMetrics: [
      'Completed ≥25 of 36 sessions (70% adherence minimum)',
      'Increased exercise capacity (6-minute walk test, VO2 max)',
      'Improved cardiovascular risk factors (BP, lipids, HbA1c)',
      'Improved mental health (PHQ-9, anxiety scores)',
      'No adverse events during training'
    ],

    requiredLabValues: ['Recent stress test (within 3-6 months)', 'Echocardiogram (within 6 months)', 'Lipid panel'],
    requiredAssessments: ['Functional capacity assessment', 'Depression screening (PHQ-9)'],
    clinicianNotes: 'Cardiac rehab is one of the most effective interventions in cardiovascular medicine—yet only 20-30% of eligible patients participate (major care gap). Barriers include cost, transportation, lack of referral, and patient reluctance. Address barriers proactively: emphasize mortality benefit, arrange transportation, start referral process in hospital. Women, elderly, and minorities are significantly underreferred—ensure equitable access. Home-based cardiac rehab (digital/telehealth) is emerging for patients with barriers to center-based programs. Medicare covers 36 sessions (2-3 per week for 12 weeks). Refer EARLY (within 1-2 weeks of discharge) to maximize uptake.'
  },

  // --------------------------------------------------------------------------
  // CV-010: Advanced Cardiovascular Imaging (CIMT, Echocardiogram)
  // --------------------------------------------------------------------------
  {
    id: 'cv-010',
    name: 'Advanced Cardiovascular Imaging (Carotid IMT, Echocardiogram)',
    category: 'Cardiovascular',
    domain: 'cardiometabolic',
    type: 'screening',

    description: 'Non-invasive imaging to assess subclinical atherosclerosis (carotid intima-media thickness), cardiac structure and function (echocardiogram), and refine cardiovascular risk stratification beyond traditional calculators.',

    evidenceLevel: 'MODERATE',
    evidenceSummary: 'CIMT predicts future cardiovascular events independent of traditional risk factors. Echocardiogram detects structural heart disease (LVH, valve disease, reduced EF) which significantly increases CV risk. Useful for reclassifying intermediate-risk patients.',

    primaryCitations: [
      'ARIC Study: Increased CIMT associated with 2-3x higher MI/stroke risk',
      'Framingham: LV hypertrophy on echo increases CV risk 2-4x',
      'AHA/ACC 2019: CIMT and CAC useful for risk refinement in intermediate-risk patients'
    ],

    targetAgeGroup: ['40-49', '50-64', '65-79'],
    targetGender: 'all',

    indications: [
      'Intermediate ASCVD risk (7.5-20%) uncertain about starting statin',
      'Family history of premature cardiovascular disease',
      'Diabetes or metabolic syndrome',
      'Chronic inflammatory disease (RA, psoriasis, lupus)',
      'Suspected structural heart disease (murmur, dyspnea, chest pain)',
      'Hypertension (evaluate for LV hypertrophy)',
      'Atrial fibrillation (assess for thrombus, valve disease)'
    ],

    contraindications: [],

    protocol: {
      frequency: 'CIMT: Every 2-5 years, Echocardiogram: As clinically indicated',
      duration: 'One-time or periodic reassessment',
      instructions: `
        CAROTID INTIMA-MEDIA THICKNESS (CIMT):
        - Non-invasive ultrasound of carotid arteries
        - Measures arterial wall thickness (early atherosclerosis marker)
        - Performed by vascular ultrasound technician
        - Takes 15-30 minutes

        INTERPRETATION:
        - Normal CIMT: <0.7 mm
        - Borderline: 0.7-0.9 mm
        - Elevated: >0.9 mm (indicates atherosclerosis)
        - Plaque: Any focal thickening >1.5 mm

        CLINICAL USE:
        - Reclassify risk: Elevated CIMT or plaque → upstage to high risk
        - If elevated → stronger indication for statin, aspirin, aggressive BP control

        ------------------------------------------------

        ECHOCARDIOGRAM (TRANSTHORACIC):
        - Non-invasive ultrasound of heart
        - Assesses: LV size/function, valves, wall motion, pericardium
        - Performed by cardiac sonographer, read by cardiologist
        - Takes 30-60 minutes

        KEY MEASUREMENTS:
        - Ejection fraction (EF): Normal >55%
        - LV mass: Elevated indicates LV hypertrophy
        - Valve function: Stenosis or regurgitation
        - Wall motion abnormalities: Suggest prior MI or ischemia
        - Pulmonary artery pressure: Elevated in pulmonary hypertension

        CLINICAL USE:
        - LV hypertrophy → intensify BP control, consider ARB/ACE-I
        - Reduced EF (<40%) → start GDMT (ACE-I, beta-blocker, diuretic)
        - Valve disease → cardiology referral
        - Elevated PA pressure → evaluate for pulmonary hypertension

        ------------------------------------------------

        OTHER ADVANCED IMAGING (not routine, but useful):

        CORONARY ARTERY CALCIUM (CAC) SCORE:
        - CT scan quantifying calcium in coronary arteries
        - Score 0: Very low risk (consider deferring statin)
        - Score 1-99: Mild CAD (moderate risk)
        - Score 100-399: Moderate CAD (high risk)
        - Score ≥400: Severe CAD (very high risk)
        - Useful for shared decision-making re: statin therapy

        CARDIAC MRI:
        - Gold standard for assessing myocardial structure/function
        - Detects myocardial fibrosis, infiltrative disease, myocarditis
        - Reserved for complex cases

        STRESS ECHOCARDIOGRAM:
        - Echo before/after exercise or pharmacologic stress
        - Detects inducible ischemia (coronary artery disease)
        - Use if chest pain or high pretest probability of CAD
      `,
      monitoring: 'CIMT: Repeat every 2-5 years if abnormal. Echocardiogram: Repeat based on findings (valvular disease, reduced EF).'
    },

    estimatedCost: {
      min: 150,
      max: 1000,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'Refined cardiovascular risk stratification',
      'Earlier detection of subclinical atherosclerosis (CIMT)',
      'Detection of structural heart disease (echo)',
      'Improved shared decision-making for statin therapy',
      'Identification of high-risk patients who benefit from intensive therapy'
    ],
    timeToEffect: 'Immediate results inform treatment decisions',
    successMetrics: [
      'CIMT performed in intermediate-risk patients',
      'Abnormal findings lead to treatment intensification',
      'Structural heart disease identified and managed',
      'Patient engaged in shared decision-making'
    ],

    requiredLabValues: [],
    requiredAssessments: ['10-year ASCVD risk calculation', 'Clinical assessment for structural heart disease'],
    clinicianNotes: `CIMT is useful for risk refinement in intermediate-risk patients (7.5-20% ASCVD risk) uncertain about statin therapy. Coronary artery calcium (CAC) score is another option—both useful but not routinely covered by insurance. CAC score = 0 is reassuring and may justify deferring statin in low-intermediate risk. Echocardiogram is covered by insurance if clinical indication (murmur, dyspnea, hypertension with suspected LVH). LV hypertrophy on echo doubles cardiovascular risk—intensify BP control. Reduced EF requires guideline-directed medical therapy (ACE-I/ARB, beta-blocker, diuretic, consider SGLT2i). Don't order echo as "screening" without clinical indication (insurance may deny). Stress testing (stress echo, nuclear) is for symptomatic patients or high pretest probability of CAD, not primary prevention.`
  }
];

// ============================================================================
// METABOLIC INTERVENTIONS (10)
// ============================================================================

const metabolicInterventions: Intervention[] = [
  // --------------------------------------------------------------------------
  // MET-001: Metformin for Diabetes & Prediabetes
  // --------------------------------------------------------------------------
  {
    id: 'met-001',
    name: 'Metformin for Type 2 Diabetes & Prediabetes Prevention',
    category: 'Metabolic',
    domain: 'cardiometabolic',
    type: 'medication',

    description: 'Metformin is the first-line medication for type 2 diabetes, reducing hepatic glucose production and improving insulin sensitivity. Also used for diabetes prevention in high-risk prediabetes. Cardiovascular benefits, weight neutral or modest weight loss, low hypoglycemia risk.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'Metformin reduces HbA1c by 1-2%, prevents diabetes progression by 31% in DPP trial, and reduces cardiovascular events in obese diabetics (UKPDS). Safe, inexpensive, and well-tolerated.',

    primaryCitations: [
      'Diabetes Prevention Program (DPP): Metformin reduced diabetes incidence by 31%',
      'UKPDS: Metformin reduced cardiovascular events by 39% in obese type 2 diabetics',
      'ADA/EASD Consensus: Metformin is first-line for type 2 diabetes'
    ],

    targetAgeGroup: ['30-39', '40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'Type 2 diabetes (first-line medication)',
      'Prediabetes with high risk: BMI ≥35, age <60, prior gestational diabetes',
      'Polycystic ovary syndrome (PCOS)',
      'Insulin resistance with metabolic syndrome',
      'Weight management in diabetes (prevents weight gain from other meds)'
    ],

    contraindications: [
      {
        type: 'absolute',
        condition: 'Severe kidney disease (eGFR <30 mL/min)',
        alternative: 'Use GLP-1 agonist or SGLT2i if eGFR 30-45, insulin if eGFR <30'
      },
      {
        type: 'absolute',
        condition: 'Acute or chronic metabolic acidosis',
        alternative: 'Treat acidosis first, then consider metformin'
      },
      {
        type: 'relative',
        condition: 'Liver disease with impaired lactate clearance',
        alternative: 'Use GLP-1 agonist or SGLT2i instead'
      },
      {
        type: 'relative',
        condition: 'Alcohol abuse (risk of lactic acidosis)',
        alternative: 'Address alcohol use first, or use alternative agent'
      },
      {
        type: 'relative',
        condition: 'Age >80 without recent renal function check',
        alternative: 'Check eGFR, reduce dose if <45'
      }
    ],

    protocol: {
      frequency: 'Once or twice daily',
      duration: 'Indefinite',
      instructions: `
        DOSING:
        - Start: 500 mg once daily with dinner (or 850 mg once daily)
        - Titrate: Increase by 500 mg every 1-2 weeks as tolerated
        - Target: 2000 mg/day (divided into 1000 mg twice daily)
        - Maximum: 2550 mg/day (rarely needed)

        FORMULATIONS:
        - Immediate-release (IR): 500 mg, 850 mg, 1000 mg tablets
          - Take with meals to reduce GI side effects
          - Twice-daily dosing (morning and evening)

        - Extended-release (ER): 500 mg, 750 mg tablets
          - Once-daily dosing (with dinner)
          - Better GI tolerability
          - Slightly more expensive but worth it for side effects

        TITRATION STRATEGY:
        1. Week 1-2: Metformin 500 mg with dinner
        2. Week 3-4: Increase to 1000 mg with dinner (or 500 mg twice daily)
        3. Week 5-6: Increase to 1500 mg (1000 mg dinner + 500 mg breakfast)
        4. Week 7+: Increase to 2000 mg (1000 mg twice daily) if needed

        SPECIAL CONSIDERATIONS:
        - Hold metformin 24-48 hours before IV contrast (risk of contrast-induced nephropathy)
        - Resume after contrast if renal function stable
        - Hold during acute illness (vomiting, dehydration, sepsis)
        - Take with meals to reduce nausea/diarrhea
      `,
      monitoring: 'HbA1c every 3 months until stable, then every 6 months. eGFR and B12 annually.'
    },

    estimatedCost: {
      min: 4,
      max: 30,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'HbA1c reduction of 1-2%',
      'Fasting glucose reduction of 50-70 mg/dL',
      'Weight neutral or modest weight loss (2-3 kg)',
      '31% reduction in progression to diabetes (if prediabetic)',
      'Cardiovascular benefit in obese diabetics',
      'No hypoglycemia (when used alone)'
    ],
    timeToEffect: '1-2 weeks for glucose lowering, 3 months for full HbA1c effect',
    successMetrics: [
      'HbA1c <7% (or individualized target)',
      'Fasting glucose <130 mg/dL',
      'No intolerable GI side effects',
      'eGFR stable (>30 mL/min)'
    ],

    requiredLabValues: ['Baseline eGFR', 'HbA1c or fasting glucose', 'Vitamin B12 (check annually)'],
    requiredAssessments: ['Review for kidney disease, liver disease, alcohol use'],
    clinicianNotes: 'Metformin is the most prescribed diabetes medication globally—safe, cheap, effective. GI side effects (nausea, diarrhea) occur in 30% but usually resolve in 2-4 weeks; extended-release formulation helps. Lactic acidosis is RARE (<1 in 100,000) despite black box warning. Metformin reduces B12 absorption—check annually and supplement if low. Hold before IV contrast and during acute illness. Weight neutral or causes modest weight loss (unlike sulfonylureas, insulin). Does NOT cause hypoglycemia when used alone. Consider starting metformin in prediabetes if age <60, BMI ≥35, or prior gestational diabetes (high-risk group from DPP trial). PCOS patients benefit from metformin for insulin resistance and menstrual regularity.'
  },

  // --------------------------------------------------------------------------
  // MET-002: SGLT2 Inhibitors (Empagliflozin, Dapagliflozin)
  // --------------------------------------------------------------------------
  {
    id: 'met-002',
    name: 'SGLT2 Inhibitors for Diabetes, Heart Failure, & Kidney Protection',
    category: 'Metabolic',
    domain: 'cardiometabolic',
    type: 'medication',

    description: 'Sodium-glucose cotransporter-2 (SGLT2) inhibitors block glucose reabsorption in kidneys, causing glucosuria. Reduce HbA1c, promote weight loss, lower BP, and provide cardio-renal protection. Benefits extend beyond diabetes—reduce heart failure hospitalization and slow CKD progression.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'Multiple CVOTs (EMPA-REG, CANVAS, DECLARE) show SGLT2i reduce major adverse cardiovascular events, heart failure hospitalization by 30-35%, and slow CKD progression by 40%. Benefits even in non-diabetics with heart failure (DAPA-HF).',

    primaryCitations: [
      'EMPA-REG OUTCOME: Empagliflozin reduced CV death by 38%, heart failure by 35%',
      'DAPA-HF: Dapagliflozin reduced heart failure hospitalization by 30% (in non-diabetics too)',
      'CREDENCE: Canagliflozin slowed diabetic kidney disease progression by 30%'
    ],

    targetAgeGroup: ['40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'Type 2 diabetes with atherosclerotic CVD (strong indication)',
      'Type 2 diabetes with heart failure (especially HFrEF)',
      'Type 2 diabetes with chronic kidney disease (eGFR 20-60)',
      'Heart failure with reduced ejection fraction (even without diabetes)',
      'Heart failure with preserved ejection fraction (dapagliflozin)',
      'Type 2 diabetes needing weight loss'
    ],

    contraindications: [
      {
        type: 'absolute',
        condition: 'Type 1 diabetes',
        alternative: 'Insulin and consider adjunct GLP-1 agonist'
      },
      {
        type: 'absolute',
        condition: 'Severe kidney disease (eGFR <20 mL/min)',
        alternative: 'GLP-1 agonist or insulin'
      },
      {
        type: 'absolute',
        condition: 'History of diabetic ketoacidosis (DKA)',
        alternative: 'Use with extreme caution or avoid'
      },
      {
        type: 'relative',
        condition: 'Recurrent genital yeast infections',
        alternative: 'Treat infections first, counsel on hygiene, or use GLP-1 agonist'
      },
      {
        type: 'relative',
        condition: 'Low BP or volume depletion',
        alternative: 'Ensure adequate hydration before starting'
      }
    ],

    protocol: {
      frequency: 'Once daily',
      duration: 'Indefinite',
      instructions: `
        AVAILABLE SGLT2 INHIBITORS:

        EMPAGLIFLOZIN (Jardiance):
        - Dose: 10 mg once daily, increase to 25 mg if tolerated
        - Best cardiovascular data (38% reduction in CV death)
        - Take in morning (causes increased urination)

        DAPAGLIFLOZIN (Farxiga):
        - Dose: 5 mg once daily, increase to 10 mg if needed
        - Only SGLT2i with HFpEF indication
        - Approved for heart failure even without diabetes

        CANAGLIFLOZIN (Invokana):
        - Dose: 100 mg once daily, increase to 300 mg if eGFR >60
        - Best kidney protection data (CREDENCE trial)
        - Higher amputation risk (take before first meal)

        ERTUGLIFLOZIN (Steglatro):
        - Dose: 5 mg once daily, increase to 15 mg if needed
        - Fewer studies than empagliflozin/dapagliflozin

        SELECTION GUIDE:
        - Diabetes + CVD → Empagliflozin or canagliflozin
        - Diabetes + CKD → Canagliflozin or dapagliflozin
        - Heart failure (any EF) → Dapagliflozin or empagliflozin
        - Need weight loss → Any SGLT2i (all cause 2-3 kg loss)

        COUNSELING POINTS:
        - Increased urination (especially first 2 weeks)
        - Drink adequate fluids (risk of dehydration)
        - Genital hygiene (risk of yeast infections—15% in women, 5% in men)
        - Sick day rules: Hold during acute illness (vomiting, dehydration, sepsis)
        - Rare risk of euglycemic DKA (if nausea, vomiting, abdominal pain → check ketones)
      `,
      monitoring: 'HbA1c every 3-6 months. eGFR and electrolytes at 1 month, then every 3-6 months. BP (expect 3-5 mmHg reduction).'
    },

    estimatedCost: {
      min: 400,
      max: 600,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'HbA1c reduction of 0.5-1%',
      'Weight loss of 2-4 kg',
      'BP reduction of 3-5/2-3 mmHg',
      '30-35% reduction in heart failure hospitalization',
      '30-40% reduction in CKD progression',
      '14% reduction in major adverse cardiovascular events',
      'Possible reduction in cardiovascular death (empagliflozin: 38%)'
    ],
    timeToEffect: '1-2 weeks for glucose lowering, 3-6 months for cardiovascular/renal benefits',
    successMetrics: [
      'HbA1c improved',
      'Weight loss achieved',
      'No heart failure exacerbations',
      'Stable or improved eGFR',
      'No recurrent genital infections'
    ],

    requiredLabValues: ['Baseline eGFR (need >20 for glucose lowering, >25 for HF indication)', 'HbA1c', 'Electrolytes'],
    requiredAssessments: ['Volume status', 'History of genital infections', 'Heart failure status'],
    clinicianNotes: 'SGLT2 inhibitors are the most exciting diabetes drug class in 20 years—they reduce cardiovascular events AND heart failure AND kidney disease progression. Benefits extend beyond diabetes (DAPA-HF showed benefit in non-diabetics with HF). Mechanism: causes 50-80g glucose loss daily in urine (glycosuria), leading to modest glucose lowering, weight loss, BP reduction, and osmotic diuresis. Genital yeast infections are common (15% in women)—counsel on hygiene, treat promptly. Euglycemic DKA is RARE but serious—educate about sick day rules. Fournier gangrene is extremely rare (<1 in 100,000) but FDA black box warning. Benefits outweigh risks for most patients. Works at lower eGFR for heart failure than for diabetes (down to eGFR 20-25). Can cause small initial drop in eGFR (5-10%) but long-term kidney protection. Consider as second agent after metformin in all diabetics with CVD, HF, or CKD. Insurance coverage improving rapidly due to strong evidence.'
  },

  // --------------------------------------------------------------------------
  // MET-003: GLP-1 Receptor Agonists (Semaglutide, Dulaglutide)
  // --------------------------------------------------------------------------
  {
    id: 'met-003',
    name: 'GLP-1 Receptor Agonists for Diabetes & Weight Management',
    category: 'Metabolic',
    domain: 'cardiometabolic',
    type: 'medication',

    description: 'Glucagon-like peptide-1 receptor agonists (GLP-1 RAs) enhance insulin secretion, suppress glucagon, slow gastric emptying, and reduce appetite. Powerful glucose lowering, significant weight loss (10-15% with semaglutide), cardiovascular benefits, and low hypoglycemia risk.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'Multiple CVOTs show GLP-1 RAs reduce major adverse cardiovascular events by 12-26%, stroke by 30-40%, and promote 5-15% weight loss. Semaglutide 2.4 mg (Wegovy) FDA-approved for obesity without diabetes.',

    primaryCitations: [
      'LEADER: Liraglutide reduced CV events by 13%, CV death by 22%',
      'SUSTAIN-6: Semaglutide reduced CV events by 26%, stroke by 39%',
      'STEP trials: Semaglutide 2.4 mg produced 15% weight loss',
      'REWIND: Dulaglutide reduced CV events by 12%'
    ],

    targetAgeGroup: ['30-39', '40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'Type 2 diabetes with inadequate control on metformin',
      'Type 2 diabetes with atherosclerotic CVD (strong indication)',
      'Type 2 diabetes needing significant weight loss',
      'Obesity (BMI ≥30) or overweight (BMI ≥27) with comorbidities (non-diabetes indication)',
      'Prediabetes with obesity (off-label but increasingly used)',
      'Metabolic syndrome with obesity'
    ],

    contraindications: [
      {
        type: 'absolute',
        condition: 'Personal or family history of medullary thyroid cancer',
        alternative: 'Use SGLT2i, DPP-4i, or insulin instead'
      },
      {
        type: 'absolute',
        condition: 'Multiple endocrine neoplasia type 2 (MEN2)',
        alternative: 'Use alternative glucose-lowering agent'
      },
      {
        type: 'absolute',
        condition: 'History of pancreatitis',
        alternative: 'Use SGLT2i or DPP-4i (controversial—some experts still use GLP-1)'
      },
      {
        type: 'relative',
        condition: 'Severe gastroparesis',
        alternative: 'May worsen symptoms; use alternative agent'
      },
      {
        type: 'relative',
        condition: 'Pregnancy or planning pregnancy',
        alternative: 'Stop 2 months before conception; use insulin during pregnancy'
      }
    ],

    protocol: {
      frequency: 'Once weekly (most agents) or once daily',
      duration: 'Indefinite',
      instructions: `
        WEEKLY GLP-1 AGONISTS (preferred for adherence):

        SEMAGLUTIDE (Ozempic for diabetes, Wegovy for weight loss):
        - Start: 0.25 mg weekly × 4 weeks
        - Week 5: Increase to 0.5 mg weekly
        - Week 9: Increase to 1 mg weekly (diabetes maintenance dose)
        - Week 13+: Can increase to 2 mg weekly if needed (max for diabetes)
        - For weight loss (Wegovy): Titrate up to 2.4 mg weekly over 16 weeks
        - MOST EFFECTIVE for weight loss (12-15%)

        DULAGLUTIDE (Trulicity):
        - Start: 0.75 mg weekly
        - After 4 weeks: Increase to 1.5 mg weekly (usual dose)
        - Can increase to 3 mg or 4.5 mg weekly if needed
        - Easy-to-use pre-filled pen

        DAILY GLP-1 AGONISTS:

        LIRAGLUTIDE (Victoza for diabetes, Saxenda for weight loss):
        - Start: 0.6 mg daily
        - Week 2: Increase to 1.2 mg daily
        - Week 3+: Increase to 1.8 mg daily (diabetes max)
        - For weight loss (Saxenda): Titrate to 3 mg daily over 4 weeks
        - Daily injection (less convenient than weekly)

        INJECTION TECHNIQUE:
        - Subcutaneous injection (abdomen, thigh, or upper arm)
        - Rotate injection sites
        - Can take any time of day (weekly agents)
        - Take with or without food

        MANAGING SIDE EFFECTS:
        - Nausea is COMMON (30-50%) but usually resolves in 2-4 weeks
        - Start low, go slow with titration
        - Eat smaller, more frequent meals
        - Avoid high-fat foods
        - Consider anti-nausea medication if severe (ondansetron)
        - If persistent nausea → slow down titration

        COMBINATION THERAPY:
        - Works well with metformin, SGLT2i
        - Can combine with insulin (reduce insulin dose by 20% to prevent hypoglycemia)
        - Do NOT combine with DPP-4 inhibitors (same mechanism)
      `,
      monitoring: 'HbA1c every 3 months. Weight monthly. Lipase if abdominal pain. Screen for medullary thyroid cancer history before starting.'
    },

    estimatedCost: {
      min: 800,
      max: 1400,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'HbA1c reduction of 1-1.5%',
      'Weight loss of 5-10% (liraglutide, dulaglutide)',
      'Weight loss of 10-15% (semaglutide 2.4 mg)',
      '12-26% reduction in major adverse cardiovascular events',
      '30-40% reduction in stroke',
      'BP reduction of 3-5 mmHg',
      'Improved lipids (reduced triglycerides)'
    ],
    timeToEffect: '1-2 weeks for glucose lowering, 3-6 months for weight loss plateau',
    successMetrics: [
      'HbA1c <7% (or individualized target)',
      'Weight loss ≥5% from baseline',
      'Tolerable GI side effects',
      'Improved cardiovascular risk factors'
    ],

    requiredLabValues: ['HbA1c or fasting glucose', 'Baseline weight and BMI', 'Lipase if abdominal pain develops'],
    requiredAssessments: ['Screen for personal/family history of medullary thyroid cancer or MEN2', 'History of pancreatitis'],
    clinicianNotes: 'GLP-1 agonists are transforming diabetes and obesity care. Semaglutide (Ozempic/Wegovy) has become cultural phenomenon due to dramatic weight loss. Nausea is very common (30-50%) but usually resolves—slow titration is key. Pancreatitis risk is controversial (small increased risk in studies but causality unclear). Medullary thyroid cancer occurred in rodents at supraphysiologic doses—no human cases documented but still contraindicated if family history. Injectable only (no oral GLP-1s approved in US yet, except oral semaglutide Rybelsus which is less effective). Insurance coverage varies: well-covered for diabetes, often requires prior auth for weight loss. High cost ($800-1400/month) limits access. Tirzepatide (Mounjaro, Zepbound) is dual GIP/GLP-1 agonist—even more effective (15-20% weight loss) but very expensive. These drugs are likely to become standard of care for diabetes + obesity.'
  },

  // --------------------------------------------------------------------------
  // MET-004: Continuous Glucose Monitor (CGM)
  // --------------------------------------------------------------------------
  {
    id: 'met-004',
    name: 'Continuous Glucose Monitoring (CGM) for Diabetes Management',
    category: 'Metabolic',
    domain: 'cardiometabolic',
    type: 'screening',

    description: 'Real-time or intermittently scanned continuous glucose monitoring provides detailed glucose data every 5-15 minutes, revealing patterns invisible to fingerstick testing. Improves glycemic control, reduces hypoglycemia, and empowers patient engagement.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'Multiple RCTs show CGM reduces HbA1c by 0.3-0.5%, reduces hypoglycemia by 40-70%, and increases time in range. Benefits extend to type 1, type 2 on insulin, and type 2 on non-insulin therapy. Cost-effective and increasingly covered by insurance.',

    primaryCitations: [
      'DIAMOND Study: CGM reduced HbA1c by 0.6% in type 1 diabetes',
      'MOBILE Study: CGM reduced HbA1c by 0.4% in type 2 on basal insulin',
      'IMPACT Study: FreeStyle Libre reduced hypoglycemia by 38%'
    ],

    targetAgeGroup: ['18-29', '30-39', '40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'Type 1 diabetes (all patients)',
      'Type 2 diabetes on intensive insulin (multiple daily injections or pump)',
      'Type 2 diabetes on basal insulin',
      'Type 2 diabetes with wide glucose variability',
      'Hypoglycemia unawareness',
      'Pregnancy with preexisting or gestational diabetes',
      'Type 2 diabetes on oral agents (emerging indication)'
    ],

    contraindications: [],

    protocol: {
      frequency: 'Continuous wear, sensor change every 7-14 days',
      duration: 'Ongoing',
      instructions: `
        CGM TYPES:

        REAL-TIME CGM (continuous alerts):
        - Dexcom G6, G7
        - Medtronic Guardian
        - Sensor worn 7-10 days
        - Automatic alerts for high/low glucose
        - Shares data to smartphone/receiver
        - Shows glucose trends and rate of change
        - No fingerstick calibration needed (G6, G7)

        INTERMITTENTLY SCANNED CGM (scan to view):
        - FreeStyle Libre 2, Libre 3
        - Sensor worn 14 days
        - Scan with reader or phone to see glucose
        - Alarms for high/low (Libre 2, 3)
        - Less expensive than real-time CGM
        - No fingerstick calibration needed

        INSERTION:
        - Clean skin with alcohol
        - Apply sensor to upper arm (Libre) or abdomen (Dexcom)
        - Activate sensor and wait 1-2 hour warm-up
        - Wear continuously (shower, exercise, sleep)

        INTERPRETING CGM DATA:

        KEY METRICS:
        - Time in Range (TIR): 70-180 mg/dL → Target >70%
        - Time Below Range: <70 mg/dL → Target <4%
        - Time Above Range: >180 mg/dL → Target <25%
        - Glucose Management Indicator (GMI): CGM-derived HbA1c estimate
        - Coefficient of Variation (CV): Glucose variability → Target <36%

        USING CGM DATA TO ADJUST THERAPY:
        - High morning glucose → increase basal insulin or evening long-acting
        - High post-meal glucose → increase mealtime insulin or adjust carbs
        - Nocturnal hypoglycemia → reduce basal insulin or bedtime snack
        - Exercise-induced lows → reduce pre-exercise insulin or eat carbs

        AMBULATORY GLUCOSE PROFILE (AGP):
        - Standard 14-day CGM report
        - Shows median glucose and variability by time of day
        - Identifies patterns for medication adjustment
      `,
      monitoring: 'Download CGM data at every visit. Review AGP report. Adjust medications based on TIR and patterns.'
    },

    estimatedCost: {
      min: 100,
      max: 400,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'HbA1c reduction of 0.3-0.5%',
      'Increased time in range by 10-20%',
      '40-70% reduction in hypoglycemia',
      'Improved quality of life',
      'Reduced diabetes distress',
      'Better understanding of glucose patterns'
    ],
    timeToEffect: 'Immediate glucose data, 3 months for HbA1c improvement',
    successMetrics: [
      'Time in range >70%',
      'Time below range <4%',
      'HbA1c improved',
      'Reduced severe hypoglycemia episodes',
      'Patient engagement with CGM data'
    ],

    requiredLabValues: ['Baseline HbA1c'],
    requiredAssessments: ['Diabetes regimen (insulin vs non-insulin)', 'Hypoglycemia history'],
    clinicianNotes: 'CGM is revolutionary for diabetes management—provides data that fingersticks cannot (nocturnal glucose, post-meal peaks, hypoglycemia). Time in range (TIR) is better predictor of complications than HbA1c. Insurance coverage expanding rapidly: Medicare covers CGM for insulin-treated type 2 diabetes as of 2017. Prior auth usually required. Dexcom G6/G7 are most popular real-time CGMs. FreeStyle Libre is less expensive and popular in Europe/international. Patients love CGM—improves engagement and reduces burden of fingersticks. Accuracy is excellent (MARD 9-10%). Skin reactions occur in 5-10% (rotate sites, use barrier wipes). CGM data can be overwhelming initially—provide structured education. Consider CGM for all type 1 diabetics and type 2 on insulin. Emerging evidence for type 2 on oral agents (helps with diet/lifestyle modification). Download and review CGM data at every visit—use AGP report for medication adjustments.'
  },

  // --------------------------------------------------------------------------
  // MET-005: Intensive Diabetes Self-Management Education (DSME)
  // --------------------------------------------------------------------------
  {
    id: 'met-005',
    name: 'Diabetes Self-Management Education & Support (DSMES)',
    category: 'Metabolic',
    domain: 'cardiometabolic',
    type: 'education',

    description: 'Structured, evidence-based diabetes education program delivered by certified diabetes educators. Covers nutrition, exercise, medication management, glucose monitoring, and psychosocial support. Improves glycemic control, reduces complications, and empowers self-management.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'Meta-analyses show DSME reduces HbA1c by 0.5-1%, improves self-management behaviors, reduces hospitalizations, and is cost-effective. ADA recommends DSME at diagnosis and ongoing support.',

    primaryCitations: [
      'Cochrane meta-analysis: DSME reduced HbA1c by 0.8% at 6 months',
      'ADA Standards of Care: DSME recommended for all with diabetes',
      'Medicare covers 10 hours of DSME in first year, 2 hours annually thereafter'
    ],

    targetAgeGroup: ['18-29', '30-39', '40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'New diagnosis of diabetes (type 1 or type 2)',
      'Poor glycemic control (HbA1c >8%)',
      'Starting insulin or complex regimen',
      'Recurrent hypoglycemia or hyperglycemia',
      'Diabetic complications (retinopathy, neuropathy, nephropathy)',
      'Psychosocial challenges (diabetes distress, depression)',
      'Transitions in care (new complications, pregnancy)'
    ],

    contraindications: [],

    protocol: {
      frequency: '4-10 sessions over 6-12 weeks, then annual refreshers',
      duration: 'Initial program + ongoing support',
      instructions: `
        DSME CURRICULUM (AADE7 Self-Care Behaviors):

        1. HEALTHY EATING:
           - Carbohydrate counting and portion control
           - Meal planning with glycemic index
           - Reading food labels
           - Dining out strategies

        2. BEING ACTIVE:
           - Exercise benefits for glucose control
           - Safe exercise with diabetes
           - Activity tracking and goal-setting

        3. MONITORING:
           - Fingerstick technique and timing
           - Understanding glucose patterns
           - CGM use and interpretation
           - When to check ketones

        4. TAKING MEDICATION:
           - How diabetes medications work
           - Insulin injection technique
           - Medication timing and food
           - Managing side effects

        5. PROBLEM SOLVING:
           - Sick day management
           - Travel with diabetes
           - Adjusting insulin doses
           - Hypoglycemia treatment (rule of 15)

        6. REDUCING RISKS:
           - Foot care and daily inspection
           - Eye exams and retinopathy screening
           - Kidney protection
           - Cardiovascular risk reduction

        7. HEALTHY COPING:
           - Diabetes distress management
           - Depression screening
           - Support groups and resources
           - Setting realistic goals

        PROGRAM FORMATS:
        - Individual sessions (1-on-1 with diabetes educator)
        - Group classes (6-10 people, peer support)
        - Virtual/telehealth DSME (increasingly popular)
        - Community-based programs

        SESSION STRUCTURE:
        - Initial assessment (90 min): Medical history, current regimen, barriers, goals
        - Core education (4-8 sessions × 60 min): Cover AADE7 behaviors
        - Follow-up support (ongoing): Check-ins, reinforcement, problem-solving

        REFERRAL PROCESS:
        1. Identify DSME program (hospital, clinic, or community)
        2. Verify insurance coverage (Medicare covers 10 hours)
        3. Provide referral with current HbA1c and medication list
        4. Patient attends initial assessment
        5. Educator creates individualized care plan
        6. Regular communication between educator and clinician
      `,
      monitoring: 'HbA1c before and 3 months after DSME. Track self-management behaviors. Annual DSME refresher recommended.'
    },

    estimatedCost: {
      min: 200,
      max: 1000,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'HbA1c reduction of 0.5-1%',
      'Improved diabetes knowledge',
      'Better self-management behaviors',
      'Reduced hospitalizations and ER visits',
      'Improved quality of life',
      'Reduced diabetes distress'
    ],
    timeToEffect: '3-6 months for HbA1c improvement',
    successMetrics: [
      'HbA1c improved by ≥0.5%',
      'Increased self-management behaviors (monitoring, medication adherence)',
      'Reduced severe hypoglycemia events',
      'Improved diabetes distress scores',
      'Patient reports feeling empowered'
    ],

    requiredLabValues: ['Baseline HbA1c'],
    requiredAssessments: ['Diabetes knowledge assessment', 'Psychosocial screening (PHQ-9, DDS)'],
    clinicianNotes: `DSME is one of the most underutilized but effective interventions in diabetes care—yet only 5-10% of diabetics receive it. Referral to certified diabetes educator (CDE) or certified diabetes care and education specialist (CDCES) is essential at diagnosis and during transitions. Medicare and most insurance cover DSME (10 hours in first year, 2 hours annually). Group classes provide peer support and are cost-effective. Virtual/telehealth DSME expanded during COVID and remains accessible option. Patients who complete DSME have better glycemic control, fewer ER visits, and improved self-efficacy. Ongoing support is key—annual refreshers recommended. DSME should be individualized based on patient needs, health literacy, and cultural background. Don't just hand out pamphlets—refer to structured, evidence-based DSME program.`
  },

  // --------------------------------------------------------------------------
  // MET-006: HbA1c Monitoring Protocol
  // --------------------------------------------------------------------------
  {
    id: 'met-006',
    name: 'HbA1c Monitoring Protocol for Diabetes Management',
    category: 'Metabolic',
    domain: 'cardiometabolic',
    type: 'lab',

    description: 'Systematic HbA1c testing to assess average glucose control over 2-3 months and guide diabetes treatment intensification. HbA1c reflects risk of microvascular complications—every 1% reduction in HbA1c reduces microvascular complications by 35%.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'HbA1c is gold standard for assessing glycemic control. DCCT and UKPDS trials established HbA1c <7% reduces microvascular complications. Individualized targets based on age, comorbidities, and hypoglycemia risk.',

    primaryCitations: [
      'DCCT: HbA1c <7% reduced microvascular complications by 76% in type 1 diabetes',
      'UKPDS: Every 1% reduction in HbA1c reduced microvascular complications by 35%',
      'ADA Standards of Care: HbA1c target <7% for most adults'
    ],

    targetAgeGroup: ['18-29', '30-39', '40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'Diagnosed diabetes (type 1 or type 2)',
      'Prediabetes (A1c 5.7-6.4%) for monitoring progression',
      'Gestational diabetes (postpartum monitoring)',
      'Any patient on glucose-lowering therapy'
    ],

    contraindications: [
      {
        type: 'relative',
        condition: 'Hemoglobinopathies (sickle cell, thalassemia) or high RBC turnover',
        alternative: 'Use fructosamine or glycated albumin instead (HbA1c inaccurate)'
      }
    ],

    protocol: {
      frequency: 'Every 3 months if not at goal, every 6 months if at goal',
      duration: 'Lifelong',
      instructions: `
        TESTING FREQUENCY:

        NOT AT GLYCEMIC GOAL:
        - HbA1c every 3 months
        - After medication change or intensification
        - Continue until stable and at goal

        AT GLYCEMIC GOAL:
        - HbA1c every 6 months
        - May test every 3 months if regimen complex or unstable

        NEW DIAGNOSIS:
        - Baseline HbA1c at diagnosis
        - Repeat at 3 months after starting therapy
        - Adjust frequency based on control

        HbA1c TARGETS (individualized):

        STANDARD TARGET: <7%
        - Most adults with type 2 diabetes
        - Balances benefits vs. hypoglycemia risk

        STRICTER TARGET: <6.5%
        - Young, healthy, long life expectancy
        - No cardiovascular disease
        - Low hypoglycemia risk
        - Can achieve without significant burden

        LESS STRICT TARGET: <8%
        - Older adults (>65)
        - Limited life expectancy (<10 years)
        - Advanced complications
        - History of severe hypoglycemia
        - Hypoglycemia unawareness

        RELAXED TARGET: <8.5-9%
        - Very frail elderly
        - End-stage complications
        - Limited life expectancy (<5 years)

        INTERPRETING HbA1c:

        HbA1c ↔ Average Glucose:
        - HbA1c 5% = 97 mg/dL
        - HbA1c 6% = 126 mg/dL (diabetes threshold)
        - HbA1c 7% = 154 mg/dL
        - HbA1c 8% = 183 mg/dL
        - HbA1c 9% = 212 mg/dL
        - HbA1c 10% = 240 mg/dL

        WHEN HbA1c IS INACCURATE:
        - Sickle cell disease, thalassemia → falsely low
        - Recent blood loss, hemolysis → falsely low
        - Iron deficiency anemia → falsely high
        - Pregnancy (increased RBC turnover) → falsely low
        - End-stage renal disease → variable

        USE ALTERNATIVE MARKERS:
        - Fructosamine (reflects 2-3 week average)
        - Glycated albumin (reflects 2-3 week average)
        - CGM-derived GMI (Glucose Management Indicator)

        TREATMENT INTENSIFICATION ALGORITHM:

        If HbA1c >9%:
        - Consider dual or triple therapy immediately
        - May need insulin if very symptomatic

        If HbA1c 7.5-9%:
        - Add second agent if on monotherapy
        - Intensify existing regimen

        If HbA1c 7-7.5%:
        - Consider adding agent if not at individualized goal
        - Optimize lifestyle first

        If HbA1c <7% but frequent hypoglycemia:
        - Loosen target to <7.5-8%
        - Consider switching to lower-risk agents (GLP-1, SGLT2i)
      `,
      monitoring: 'HbA1c every 3-6 months per protocol. CGM if available provides more detailed data.'
    },

    estimatedCost: {
      min: 20,
      max: 50,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'Objective assessment of glycemic control',
      'Guide treatment intensification decisions',
      'Predict risk of microvascular complications',
      'Track response to therapy changes'
    ],
    timeToEffect: 'HbA1c reflects average glucose over prior 2-3 months',
    successMetrics: [
      'HbA1c at individualized target',
      'HbA1c trend improving over time',
      'Minimal hypoglycemia',
      'Patient understands HbA1c meaning and goal'
    ],

    requiredLabValues: [],
    requiredAssessments: ['Individualize HbA1c target based on age, comorbidities, hypoglycemia risk'],
    clinicianNotes: `HbA1c is the most important lab test in diabetes management but must be individualized. One-size-fits-all target of <7% is outdated—ACCORD, ADVANCE, VADT trials showed stricter control increases mortality in high-risk patients. Use less strict targets (<8-8.5%) for elderly, frail, or those with limited life expectancy. Consider patient preferences—some patients prefer stricter control, others prioritize avoiding hypoglycemia. Time in range (TIR) from CGM is emerging as complementary metric—TIR >70% correlates with HbA1c <7%. HbA1c can be misleading in certain populations (hemoglobinopathies, pregnancy, kidney disease)—use fructosamine or CGM-derived GMI instead. Every 1% reduction in HbA1c reduces microvascular complications by 35% but effect on macrovascular events is smaller. Patients often don't understand what HbA1c means—explain as "average blood sugar over past 3 months." Reinforce that HbA1c is just one metric—avoid "diabetes report card" mentality that causes shame.`
  },

  // --------------------------------------------------------------------------
  // MET-007: Insulin Therapy for Type 2 Diabetes
  // --------------------------------------------------------------------------
  {
    id: 'met-007',
    name: 'Insulin Therapy for Type 2 Diabetes',
    category: 'Metabolic',
    domain: 'cardiometabolic',
    type: 'medication',

    description: 'Exogenous insulin for type 2 diabetes when oral/injectable agents insufficient. Basal insulin (long-acting) provides 24-hour coverage; bolus insulin (rapid-acting) covers meals. Most potent glucose-lowering agent but requires education, monitoring, and hypoglycemia awareness.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'Insulin is the most effective glucose-lowering agent. ORIGIN trial showed insulin reduces microvascular complications. Basal insulin is typically added first; basal-bolus regimen if needed for intensive control.',

    primaryCitations: [
      'ORIGIN Trial: Basal insulin reduced dysglycemia and microvascular complications',
      'UKPDS: Early insulin intensification improved long-term outcomes',
      'ADA/EASD Consensus: Insulin indicated if HbA1c >9% or symptomatic hyperglycemia'
    ],

    targetAgeGroup: ['18-29', '30-39', '40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'HbA1c >9% despite oral/injectable agents',
      'Symptomatic hyperglycemia (polyuria, polydipsia, weight loss)',
      'Acute illness or hospitalization (temporarily)',
      'Pancreatitis or pancreatic insufficiency',
      'Pregnancy (safest diabetes medication)',
      'Contraindication to other agents (renal failure, liver disease)'
    ],

    contraindications: [
      {
        type: 'relative',
        condition: 'Hypoglycemia unawareness',
        alternative: 'Use CGM, educate on hypoglycemia prevention, consider insulin pump'
      },
      {
        type: 'relative',
        condition: 'Cognitive impairment without caregiver support',
        alternative: 'Simplify regimen to once-daily basal insulin only'
      }
    ],

    protocol: {
      frequency: 'Once daily (basal) to 4+ times daily (basal-bolus)',
      duration: 'Indefinite',
      instructions: `
        INSULIN TYPES:

        BASAL INSULIN (long-acting, 24-hour coverage):
        - Glargine U-100 (Lantus, Basaglar): Once daily, flat profile
        - Glargine U-300 (Toujeo): Once daily, even flatter, less hypoglycemia
        - Detemir (Levemir): Once or twice daily
        - Degludec (Tresiba): Once daily, ultra-long (42 hours), least hypoglycemia

        BOLUS INSULIN (rapid-acting, covers meals):
        - Lispro (Humalog): Onset 15 min, peak 1 hour, duration 4 hours
        - Aspart (Novolog): Similar to lispro
        - Glulisine (Apidra): Similar to lispro
        - Fiasp (ultra-rapid aspart): Onset 5 min (faster)

        PREMIXED INSULIN (basal + bolus combined):
        - 70/30 (70% NPH, 30% regular): Twice daily
        - 75/25, 50/50 (lispro/aspart combinations): Twice daily
        - Less flexible but simpler (fewer injections)

        ═══════════════════════════════════════════════════════════
        STARTING INSULIN (Basal Insulin First):
        ═══════════════════════════════════════════════════════════

        STEP 1: Start Basal Insulin
        - Glargine 10 units once daily at bedtime
        - Or: 0.1-0.2 units/kg once daily
        - Continue metformin and other oral agents
        - Teach injection technique and hypoglycemia management

        STEP 2: Titrate Basal Insulin
        - Goal: Fasting glucose 80-130 mg/dL
        - Increase by 2 units every 3 days if fasting glucose >130
        - Increase by 4 units every 3 days if fasting glucose >180
        - Typical dose: 0.3-0.5 units/kg (range 0.1-1.0)

        STEP 3: If HbA1c Still Above Goal
        - Add mealtime (bolus) insulin to largest meal
        - Start 4 units or 10% of basal dose
        - Titrate by 1-2 units every 3 days

        STEP 4: Basal-Bolus Regimen (if needed)
        - Basal insulin once daily
        - Bolus insulin before each meal (3x daily)
        - Total daily dose (TDD) = 0.5-1.0 units/kg
        - 50% as basal, 50% as bolus (divided among meals)

        ═══════════════════════════════════════════════════════════
        HYPOGLYCEMIA MANAGEMENT:
        ═══════════════════════════════════════════════════════════

        RULE OF 15:
        - If glucose <70 mg/dL → 15g fast-acting carbs
        - Wait 15 minutes
        - Recheck glucose
        - If still <70 → repeat

        15G CARB EXAMPLES:
        - 4 glucose tablets
        - 4 oz juice
        - 1 tablespoon honey
        - 6 oz regular soda

        PREVENTION:
        - Don't skip meals if on bolus insulin
        - Reduce insulin before exercise
        - Check glucose before driving
        - Wear medical alert bracelet

        ═══════════════════════════════════════════════════════════
        INSULIN INJECTION TECHNIQUE:
        ═══════════════════════════════════════════════════════════

        SITES:
        - Abdomen (fastest absorption)
        - Thighs (slower absorption)
        - Upper arms (variable)
        - Buttocks (slowest)

        ROTATION:
        - Rotate within same site (e.g., different quadrants of abdomen)
        - Don't switch sites daily (variable absorption)
        - Avoid lipohypertrophy (lumps from repeated injection)

        STORAGE:
        - Unopened: Refrigerate
        - In use: Room temperature OK for 28 days
        - Never freeze
        - Protect from heat and light
      `,
      monitoring: 'Fasting glucose daily while titrating basal insulin. Pre-meal glucose if on bolus insulin. HbA1c every 3 months. CGM if available.'
    },

    estimatedCost: {
      min: 25,
      max: 300,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'HbA1c reduction of 1.5-3.5% (most potent agent)',
      'Fasting glucose normalization',
      'Symptom resolution (polyuria, polydipsia)',
      'Increased weight (2-4 kg on average)',
      'Hypoglycemia risk (especially with bolus insulin)'
    ],
    timeToEffect: '1-2 weeks for glucose lowering, 3 months for full HbA1c effect',
    successMetrics: [
      'Fasting glucose 80-130 mg/dL',
      'Pre-meal glucose 80-130 mg/dL',
      'HbA1c at goal',
      'Minimal hypoglycemia (<2 events per week)',
      'Patient confident in insulin administration'
    ],

    requiredLabValues: ['Baseline HbA1c', 'Renal function (adjust dose if eGFR <30)'],
    requiredAssessments: ['Hypoglycemia awareness', 'Cognitive function', 'Manual dexterity for injections'],
    clinicianNotes: 'Insulin is the most effective glucose-lowering agent but most patients fear it due to injections and hypoglycemia. Address "insulin resistance" (psychological, not physiologic)—normalize insulin as natural hormone. Start with basal insulin only (simpler than basal-bolus). Basal insulin analogues (glargine, detemir, degludec) have lower hypoglycemia risk than NPH. Degludec (Tresiba) is most expensive but has lowest hypoglycemia risk due to ultra-long duration. Insulin causes weight gain (2-4 kg)—mitigate with GLP-1 agonist (can combine). Hypoglycemia is biggest barrier—educate on Rule of 15 and prevention. CGM is invaluable for insulin users (reduces hypoglycemia by 40-70%). Insulin pens are more convenient than vials/syringes (better adherence). Basal-bolus regimen is intensive but provides best control for motivated patients. Consider insulin pump (continuous subcutaneous insulin infusion) for type 2 on basal-bolus regimen with good adherence. Insulin is safe in pregnancy (only category B diabetes medication). High cost is barrier—advocate for insulin price caps and patient assistance programs.'
  },

  // --------------------------------------------------------------------------
  // MET-008: DPP-4 Inhibitors (Sitagliptin, Linagliptin)
  // --------------------------------------------------------------------------
  {
    id: 'met-008',
    name: 'DPP-4 Inhibitors for Type 2 Diabetes',
    category: 'Metabolic',
    domain: 'cardiometabolic',
    type: 'medication',

    description: 'Dipeptidyl peptidase-4 (DPP-4) inhibitors enhance incretin hormones (GLP-1, GIP), improving insulin secretion and reducing glucagon. Modest glucose lowering, weight neutral, low hypoglycemia risk, well-tolerated. Less effective than GLP-1 agonists but oral and inexpensive.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'DPP-4 inhibitors reduce HbA1c by 0.5-0.8%. CVOTs (SAVOR, TECOS, CARMELINA) showed cardiovascular safety but no benefit. Safe in kidney disease. Alternative to GLP-1 agonists for patients who prefer oral agents.',

    primaryCitations: [
      'SAVOR-TIMI: Saxagliptin CV neutral (no benefit or harm)',
      'TECOS: Sitagliptin CV neutral',
      'CARMELINA: Linagliptin safe in CKD (no dose adjustment needed)'
    ],

    targetAgeGroup: ['40-49', '50-64', '65-79', '80+'],
    targetGender: 'all',

    indications: [
      'Type 2 diabetes needing second or third agent',
      'Patients preferring oral over injectable (vs GLP-1)',
      'Chronic kidney disease (linagliptin needs no dose adjustment)',
      'Elderly patients (low hypoglycemia risk)',
      'Combination with metformin, SGLT2i, or insulin'
    ],

    contraindications: [
      {
        type: 'relative',
        condition: 'History of pancreatitis',
        alternative: 'Use SGLT2i or insulin instead (though DPP-4i pancreatitis risk is controversial)'
      },
      {
        type: 'relative',
        condition: 'Heart failure',
        alternative: 'Saxagliptin may increase HF hospitalization—use linagliptin or SGLT2i instead'
      }
    ],

    protocol: {
      frequency: 'Once daily',
      duration: 'Indefinite',
      instructions: `
        DPP-4 INHIBITORS:

        SITAGLIPTIN (Januvia):
        - Dose: 100 mg once daily
        - Reduce to 50 mg if eGFR 30-45
        - Reduce to 25 mg if eGFR <30
        - Most commonly prescribed DPP-4i

        LINAGLIPTIN (Tradjenta):
        - Dose: 5 mg once daily
        - NO dose adjustment for kidney disease (hepatic clearance)
        - Preferred in CKD

        SAXAGLIPTIN (Onglyza):
        - Dose: 2.5-5 mg once daily
        - Reduce dose if eGFR <50
        - WARNING: May increase heart failure hospitalization (SAVOR trial)

        ALOGLIPTIN (Nesina):
        - Dose: 25 mg once daily
        - Reduce dose if eGFR <60

        SELECTION GUIDE:
        - CKD → Linagliptin (no dose adjustment)
        - Heart failure → Linagliptin (saxagliptin contraindicated)
        - No CKD/HF → Sitagliptin (most data, generic available)

        COMBINATION THERAPY:
        - Works well with metformin (common combination)
        - Can combine with SGLT2i or insulin
        - DO NOT combine with GLP-1 agonist (same mechanism, no added benefit)

        WHEN TO USE DPP-4i:
        - Patient prefers oral over injectable GLP-1
        - GLP-1 agonist too expensive or not covered
        - GLP-1 agonist caused intolerable nausea
        - Patient has CKD (linagliptin safe)

        WHEN NOT TO USE DPP-4i:
        - Patient needs significant weight loss → Use GLP-1 agonist instead
        - Patient has CVD → Use GLP-1 agonist or SGLT2i (proven CV benefit)
        - Patient has heart failure → Use SGLT2i (proven benefit, avoid saxagliptin)
      `,
      monitoring: 'HbA1c every 3-6 months. No specific lab monitoring needed.'
    },

    estimatedCost: {
      min: 400,
      max: 600,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      'HbA1c reduction of 0.5-0.8%',
      'Weight neutral (no weight loss or gain)',
      'No hypoglycemia (when used alone)',
      'Well-tolerated (minimal side effects)',
      'Safe in kidney disease (linagliptin)'
    ],
    timeToEffect: '1-2 weeks for glucose lowering, 3 months for full HbA1c effect',
    successMetrics: [
      'HbA1c improved by 0.5-0.8%',
      'Good tolerability',
      'No hypoglycemia',
      'No heart failure exacerbation'
    ],

    requiredLabValues: ['Baseline eGFR (for dose adjustment)', 'HbA1c'],
    requiredAssessments: ['History of pancreatitis', 'Heart failure status'],
    clinicianNotes: 'DPP-4 inhibitors are safe, well-tolerated, and convenient (oral, once daily) but less effective than GLP-1 agonists (same mechanism but ~10x weaker). Use when GLP-1 agonist not tolerated, too expensive, or patient strongly prefers oral. Sitagliptin generic available (cheaper). Linagliptin is unique—no dose adjustment in CKD, making it preferred in kidney disease. Saxagliptin has FDA warning for heart failure—avoid in patients with HF. Pancreatitis risk is controversial (small signal in trials but causality unclear). No cardiovascular benefit in CVOTs (unlike GLP-1 agonists and SGLT2i). Weight neutral (unlike metformin, GLP-1, SGLT2i which cause loss). Hypoglycemia rare unless combined with sulfonylurea or insulin. Can combine with metformin, SGLT2i, or insulin but NOT with GLP-1 agonist (redundant mechanisms). Overall: DPP-4i are safe "middle-of-the-road" option when GLP-1 agonist not feasible.'
  },

  // --------------------------------------------------------------------------
  // MET-009: Diabetes Prevention Program (DPP) for Prediabetes
  // --------------------------------------------------------------------------
  {
    id: 'met-009',
    name: 'Diabetes Prevention Program (DPP) for Prediabetes',
    category: 'Metabolic',
    domain: 'cardiometabolic',
    type: 'lifestyle',

    description: 'Structured lifestyle intervention based on landmark DPP trial: 7% weight loss through diet and 150 minutes/week exercise. Reduces progression to diabetes by 58% in prediabetes. Delivered via group classes over 12 months. CDC-recognized programs covered by Medicare.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'DPP trial showed lifestyle intervention reduced diabetes incidence by 58% vs placebo (better than metformin which reduced by 31%). Cost-effective and sustainable. Long-term follow-up shows lasting benefit.',

    primaryCitations: [
      'Diabetes Prevention Program (DPP) trial: Lifestyle intervention reduced diabetes by 58%',
      'DPP Outcomes Study: Sustained diabetes prevention at 10-year follow-up',
      'CDC National DPP: >300,000 participants enrolled, real-world effectiveness'
    ],

    targetAgeGroup: ['18-29', '30-39', '40-49', '50-64', '65-79'],
    targetGender: 'all',

    indications: [
      'Prediabetes (HbA1c 5.7-6.4%, fasting glucose 100-125 mg/dL, or 2-hour glucose 140-199 mg/dL)',
      'History of gestational diabetes',
      'BMI ≥25 (≥23 for Asian Americans)',
      'High risk for diabetes (family history, sedentary, high-risk ethnicity)'
    ],

    contraindications: [],

    protocol: {
      frequency: '16 weekly sessions + 6 monthly sessions (12 months total)',
      duration: '12 months intensive phase, then ongoing maintenance',
      instructions: `
        DPP PROGRAM STRUCTURE:

        PHASE 1: Core Curriculum (16 weeks)
        - Weekly 1-hour group sessions
        - 8-15 participants + trained lifestyle coach
        - Topics: goal-setting, tracking, problem-solving, eating out, exercise, stress management

        PHASE 2: Post-Core (6 months)
        - Monthly 1-hour group sessions
        - Reinforce habits, address barriers, peer support

        PHASE 3: Maintenance (ongoing)
        - Quarterly check-ins
        - Online/app support
        - Alumni groups

        ═══════════════════════════════════════════════════════════
        TWO KEY GOALS:
        ═══════════════════════════════════════════════════════════

        GOAL 1: Lose 7% of body weight
        - Gradual weight loss (1-2 lbs/week)
        - Calorie reduction: 500-750 cal/day deficit
        - Self-monitoring: Daily food log, weekly weigh-ins

        GOAL 2: Exercise 150 minutes per week
        - Moderate-intensity activity (brisk walking)
        - At least 5 days per week
        - Can split into 10-minute bouts
        - Self-monitoring: Activity log

        ═══════════════════════════════════════════════════════════
        DIET STRATEGIES:
        ═══════════════════════════════════════════════════════════

        CALORIE TARGETS:
        - 1200-1500 cal/day (starting weight <200 lbs)
        - 1500-1800 cal/day (starting weight 200-249 lbs)
        - 1800-2000 cal/day (starting weight ≥250 lbs)

        FAT REDUCTION:
        - Limit fat to 25% of calories
        - Choose lean proteins, low-fat dairy
        - Avoid fried foods, fatty meats, full-fat dairy

        HEALTHY EATING:
        - Increase fruits, vegetables, whole grains
        - Portion control (measuring cups, food scale)
        - Meal planning and prep
        - Mindful eating (slow down, recognize fullness)

        ═══════════════════════════════════════════════════════════
        EXERCISE STRATEGIES:
        ═══════════════════════════════════════════════════════════

        BUILD GRADUALLY:
        - Week 1-4: 50 minutes/week
        - Week 5-8: 100 minutes/week
        - Week 9-16: 150 minutes/week (goal)

        TYPES OF ACTIVITY:
        - Brisk walking (most common)
        - Swimming, cycling, dancing
        - Strength training 2x/week (bonus)

        OVERCOMING BARRIERS:
        - Too busy → Break into 10-minute bouts
        - Weather → Mall walking, home videos
        - Joint pain → Water exercise, recumbent bike

        ═══════════════════════════════════════════════════════════
        FINDING A DPP PROGRAM:
        ═══════════════════════════════════════════════════════════

        CDC-RECOGNIZED PROGRAMS:
        - Search: https://www.cdc.gov/diabetes/prevention/
        - In-person at YMCAs, hospitals, community centers
        - Online programs (Omada, Lark, etc.)
        - Insurance coverage: Medicare, many commercial plans

        ELIGIBILITY:
        - BMI ≥25 (≥23 for Asian Americans)
        - Prediabetes diagnosis (lab result within 1 year)
        - Not pregnant
        - No diagnosis of type 1 or type 2 diabetes
      `,
      monitoring: 'Weight and activity tracked weekly. HbA1c or fasting glucose at 6 months and 12 months.'
    },

    estimatedCost: {
      min: 0,
      max: 500,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      '58% reduction in progression to diabetes',
      'Average weight loss of 5-7%',
      'Improved insulin sensitivity',
      'Better cardiovascular risk factors (BP, lipids)',
      'Sustained benefit at 10-year follow-up'
    ],
    timeToEffect: '6-12 months for weight loss and diabetes prevention',
    successMetrics: [
      '≥5% weight loss (minimum), 7% ideal',
      '≥150 minutes/week physical activity',
      'Completion of ≥9 of 16 core sessions',
      'No progression to diabetes'
    ],

    requiredLabValues: ['HbA1c 5.7-6.4% OR fasting glucose 100-125 mg/dL'],
    requiredAssessments: ['BMI ≥25', 'Motivation and readiness for lifestyle change'],
    clinicianNotes: `DPP is the gold standard for prediabetes prevention—58% reduction in diabetes incidence (better than metformin). Yet only 5% of eligible prediabetics are enrolled (huge care gap). Medicare and many commercial insurance plans now cover CDC-recognized DPP programs. Online programs (Omada, Lark, Virta) offer convenient alternatives to in-person classes. Keys to success: structured program, group support, trained lifestyle coach, self-monitoring. Weight loss of just 5-7% is sufficient—don't need dramatic weight loss. Benefits extend beyond diabetes: improved cardiovascular risk factors, quality of life, medical cost savings. Refer ALL prediabetic patients to DPP—don't just tell them to "eat better and exercise." For high-risk prediabetes (BMI ≥35, age <60, prior gestational diabetes), consider metformin in addition to DPP. DPP is prevention—metformin is treatment. Long-term data shows benefit persists for 10+ years.`
  },

  // --------------------------------------------------------------------------
  // MET-010: Weight Management Medications (Semaglutide, Tirzepatide)
  // --------------------------------------------------------------------------
  {
    id: 'met-010',
    name: 'Weight Management Medications for Obesity (Wegovy, Zepbound)',
    category: 'Metabolic',
    domain: 'cardiometabolic',
    type: 'medication',

    description: 'FDA-approved medications for chronic weight management in obesity. Semaglutide 2.4 mg (Wegovy) and tirzepatide (Zepbound) are GLP-1/GIP agonists producing 15-22% weight loss. Combine with lifestyle for sustained weight loss and cardiometabolic benefits.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'STEP trials: Semaglutide 2.4 mg produced 15% weight loss. SURMOUNT trials: Tirzepatide produced 15-22% weight loss. Both improve cardiovascular risk factors. SELECT trial: Semaglutide reduced major adverse cardiovascular events by 20% in obesity without diabetes.',

    primaryCitations: [
      'STEP 1: Semaglutide 2.4 mg produced 14.9% weight loss vs 2.4% placebo',
      'SURMOUNT-1: Tirzepatide 15 mg produced 22.5% weight loss',
      'SELECT: Semaglutide reduced CV events by 20% in obesity without diabetes'
    ],

    targetAgeGroup: ['18-29', '30-39', '40-49', '50-64', '65-79'],
    targetGender: 'all',

    indications: [
      'BMI ≥30 (obesity)',
      'BMI ≥27 with weight-related comorbidity (diabetes, hypertension, dyslipidemia, sleep apnea)',
      'Weight-related health conditions (NAFLD, PCOS, osteoarthritis)',
      'Failed lifestyle modification alone'
    ],

    contraindications: [
      {
        type: 'absolute',
        condition: 'Personal or family history of medullary thyroid cancer',
        alternative: 'Use phentermine-topiramate or naltrexone-bupropion'
      },
      {
        type: 'absolute',
        condition: 'Multiple endocrine neoplasia type 2 (MEN2)',
        alternative: 'Use alternative weight loss medication'
      },
      {
        type: 'absolute',
        condition: 'Pregnancy or breastfeeding',
        alternative: 'Delay until after pregnancy/breastfeeding'
      },
      {
        type: 'relative',
        condition: 'History of pancreatitis',
        alternative: 'Use phentermine-topiramate or consider bariatric surgery'
      }
    ],

    protocol: {
      frequency: 'Once weekly (subcutaneous injection)',
      duration: 'Ongoing (chronic disease management)',
      instructions: `
        SEMAGLUTIDE 2.4 MG (Wegovy):
        - Week 1-4: 0.25 mg weekly
        - Week 5-8: 0.5 mg weekly
        - Week 9-12: 1 mg weekly
        - Week 13-16: 1.7 mg weekly
        - Week 17+: 2.4 mg weekly (maintenance)

        TIRZEPATIDE (Zepbound):
        - Week 1-4: 2.5 mg weekly
        - Week 5-8: 5 mg weekly
        - Week 9-12: 10 mg weekly
        - Week 13-16: 15 mg weekly (maintenance)
        - Can increase to 20 mg weekly if tolerated (max dose, most weight loss)

        OTHER WEIGHT LOSS MEDICATIONS:

        PHENTERMINE-TOPIRAMATE (Qsymia):
        - Start: 3.75 mg/23 mg daily × 14 days
        - Maintenance: 7.5 mg/46 mg daily
        - Max: 15 mg/92 mg daily
        - Weight loss: 9-10%
        - Caution: Teratogenic (contraception required)

        NALTREXONE-BUPROPION (Contrave):
        - Titrate over 4 weeks to 32 mg/360 mg daily (divided doses)
        - Weight loss: 5-6%
        - Caution: Seizure risk (avoid if seizure history)

        ORLISTAT (Xenical, Alli):
        - 120 mg three times daily with meals
        - Weight loss: 3-5%
        - Over-the-counter available (Alli 60 mg)
        - GI side effects (fat malabsorption)

        ═══════════════════════════════════════════════════════════
        LIFESTYLE COMBINATION (ESSENTIAL):
        ═══════════════════════════════════════════════════════════

        DIET:
        - 500-750 calorie deficit daily
        - High-protein, low-calorie diet
        - Smaller, more frequent meals (GLP-1 slows gastric emptying)

        EXERCISE:
        - 150-300 minutes/week moderate intensity
        - Strength training 2x/week (preserve muscle during weight loss)

        BEHAVIORAL THERAPY:
        - Regular counseling or group support
        - Self-monitoring (food log, weight tracking)
        - Address emotional eating, binge eating

        ═══════════════════════════════════════════════════════════
        MANAGING SIDE EFFECTS:
        ═══════════════════════════════════════════════════════════

        NAUSEA (most common):
        - Start low, titrate slowly
        - Eat smaller, more frequent meals
        - Avoid high-fat, spicy foods
        - Ondansetron if severe

        CONSTIPATION:
        - Increase fiber, fluids
        - Stool softeners or laxatives PRN

        GALLSTONES:
        - Rapid weight loss increases risk
        - Consider ursodeoxycholic acid if high risk

        ═══════════════════════════════════════════════════════════
        DURATION & DISCONTINUATION:
        ═══════════════════════════════════════════════════════════

        MAINTENANCE:
        - Obesity is chronic disease → lifelong treatment
        - Continue medication as long as beneficial and tolerated

        DISCONTINUATION CRITERIA:
        - <5% weight loss after 12 weeks at full dose (non-responder)
        - Intolerable side effects
        - Pregnancy
        - Patient preference

        WEIGHT REGAIN:
        - Most patients regain 2/3 of lost weight if medication stopped
        - Emphasize chronic disease management model
      `,
      monitoring: 'Weight monthly. BP, heart rate, lipids at 3-6 months. Screen for depression, suicidal ideation. Monitor for pancreatitis symptoms.'
    },

    estimatedCost: {
      min: 1000,
      max: 1500,
      currency: 'USD',
      covered: false
    },

    expectedOutcomes: [
      'Semaglutide 2.4 mg: 15% weight loss at 68 weeks',
      'Tirzepatide 15 mg: 20-22% weight loss at 72 weeks',
      'Improved cardiovascular risk factors (BP, lipids, HbA1c)',
      'Reduced cardiovascular events (SELECT trial)',
      'Improved quality of life, mobility, sleep apnea'
    ],
    timeToEffect: 'Progressive weight loss over 6-12 months, plateau at 12-18 months',
    successMetrics: [
      '≥5% weight loss at 12 weeks (minimum response)',
      '≥10% weight loss at 6 months (good response)',
      'Improved cardiometabolic parameters',
      'Tolerable side effects',
      'Sustained adherence'
    ],

    requiredLabValues: ['Baseline weight, BMI, waist circumference', 'HbA1c or fasting glucose', 'Lipid panel', 'TSH (rule out thyroid disease)'],
    requiredAssessments: ['Screen for medullary thyroid cancer/MEN2', 'History of pancreatitis', 'Eating disorder screening', 'Depression/suicidal ideation screening'],
    clinicianNotes: 'Weight loss medications have been revolutionized by GLP-1/GIP agonists—semaglutide and tirzepatide produce 15-22% weight loss (approaching bariatric surgery). SELECT trial showed semaglutide reduces cardiovascular events by 20% in obesity WITHOUT diabetes (huge paradigm shift—obesity medication with CV benefit). Insurance coverage is biggest barrier: Medicare explicitly excludes weight loss drugs, commercial coverage variable and requires prior auth. Cost is prohibitive ($1000-1500/month) without insurance. Obesity is a chronic disease—lifelong treatment is appropriate (like hypertension or diabetes). Weight regain after discontinuation is expected (not a failure). Nausea is very common but usually resolves. Supply shortages have been problematic (Wegovy especially). Compounding pharmacies offering "semaglutide" are unregulated and not recommended. Consider bariatric surgery for BMI ≥40 or ≥35 with comorbidities (more durable weight loss). Tirzepatide appears more effective than semaglutide but more expensive and less studied. These medications are transforming obesity care—advocate for insurance coverage.'
  }
];

// ============================================================================
// ONCOLOGY SCREENING INTERVENTIONS (10)
// ============================================================================

const oncologyInterventions: Intervention[] = [
  // --------------------------------------------------------------------------
  // ONC-001: Mammography for Breast Cancer Screening
  // --------------------------------------------------------------------------
  {
    id: 'onc-001',
    name: 'Mammography for Breast Cancer Screening',
    category: 'Oncology',
    domain: 'oncology',
    type: 'screening',

    description: 'Digital mammography (2D or 3D tomosynthesis) for early detection of breast cancer. Reduces breast cancer mortality by 20-30% in women ages 50-69. Screening recommendations vary by age, risk, and guideline organization.',

    evidenceLevel: 'STRONG',
    evidenceSummary: 'Multiple RCTs show mammography screening reduces breast cancer mortality by 20-30% in women ages 50-69. Benefit smaller in ages 40-49 (NNT higher). 3D mammography (tomosynthesis) reduces false positives and increases cancer detection.',

    primaryCitations: [
      'US Preventive Services Task Force 2016: Mammography biennial ages 50-74, individualized 40-49',
      'Canadian Task Force: Mammography ages 50-74 reduces mortality by 21%',
      'SEER: 3D mammography increases cancer detection by 20-40%, reduces recalls by 15%'
    ],

    targetAgeGroup: ['40-49', '50-64', '65-79'],
    targetGender: 'female',

    indications: [
      'Women age 40-49: Shared decision-making, biennial or annual',
      'Women age 50-74: Biennial screening (USPSTF) or annual (ACS)',
      'Women age 75+: Continue if life expectancy >10 years',
      'High-risk: Annual starting age 30 (BRCA, prior chest radiation, Li-Fraumeni)',
      'Average risk with dense breasts: Consider supplemental ultrasound or MRI'
    ],

    contraindications: [
      {
        type: 'relative',
        condition: 'Pregnancy',
        alternative: 'Breast ultrasound if breast mass palpated'
      },
      {
        type: 'relative',
        condition: 'Very dense breasts with low sensitivity',
        alternative: 'Add breast MRI or ultrasound (controversial, increases false positives)'
      }
    ],

    protocol: {
      frequency: 'Annual or biennial (age-dependent)',
      duration: 'Ongoing',
      instructions: `
        SCREENING RECOMMENDATIONS (USPSTF 2024):

        AGE 40-49:
        - Shared decision-making
        - Biennial screening (every 2 years) recommended
        - Women who value early detection may choose annual
        - NNT = 1,904 to prevent 1 breast cancer death over 10 years

        AGE 50-74:
        - Biennial screening recommended (USPSTF)
        - Annual screening also acceptable (ACS recommends annual)
        - NNT = 1,339 to prevent 1 death
        - Most benefit in this age group

        AGE 75+:
        - Insufficient evidence (USPSTF)
        - Continue if life expectancy >10 years
        - Stop screening if limited life expectancy

        HIGH-RISK WOMEN (annual screening + MRI starting age 30):
        - BRCA1/BRCA2 mutation (lifetime risk 50-85%)
        - Prior chest radiation ages 10-30 (Hodgkin lymphoma)
        - Li-Fraumeni syndrome, Cowden syndrome, Bannayan-Riley-Ruvalcaba
        - First-degree relative with premenopausal breast cancer
        - Lifetime risk ≥20% by risk models (Gail, Tyrer-Cuzick)

        ═══════════════════════════════════════════════════════════
        MAMMOGRAPHY TYPES:
        ═══════════════════════════════════════════════════════════

        2D DIGITAL MAMMOGRAPHY:
        - Standard of care
        - 4 images (2 per breast)
        - Sensitivity 75-85% (lower in dense breasts)

        3D TOMOSYNTHESIS (Digital Breast Tomosynthesis):
        - Multiple thin-slice images
        - Increases cancer detection by 20-40%
        - Reduces false positives by 15%
        - Better for dense breasts
        - Slightly higher radiation (negligible)

        BI-RADS CLASSIFICATION:
        - BI-RADS 0: Incomplete, needs additional imaging
        - BI-RADS 1: Negative
        - BI-RADS 2: Benign findings (fibroadenoma, cyst)
        - BI-RADS 3: Probably benign (2% cancer risk, 6-month follow-up)
        - BI-RADS 4: Suspicious (3-94% cancer risk, biopsy recommended)
        - BI-RADS 5: Highly suggestive of cancer (>95% risk, biopsy)
        - BI-RADS 6: Known cancer

        BREAST DENSITY CATEGORIES:
        - A: Almost entirely fatty (<25% dense)
        - B: Scattered fibroglandular (25-50% dense)
        - C: Heterogeneously dense (51-75% dense)
        - D: Extremely dense (>75% dense)

        Dense breasts (C, D):
        - Lower mammography sensitivity
        - Slightly increased breast cancer risk
        - May benefit from supplemental ultrasound or MRI
        - Insurance coverage varies by state

        ═══════════════════════════════════════════════════════════
        PATIENT COUNSELING:
        ═══════════════════════════════════════════════════════════

        BENEFITS:
        - 20-30% reduction in breast cancer mortality
        - Early detection allows breast-conserving surgery
        - Better prognosis with earlier stage

        HARMS:
        - False positives: 10-15% per mammogram
        - Callbacks for additional imaging cause anxiety
        - Overdiagnosis: 10-30% of screen-detected cancers may not progress
        - Radiation exposure: Very low (0.4 mSv, equivalent to 7 weeks background)

        SHARED DECISION-MAKING (ages 40-49):
        - Benefit smaller than ages 50-74
        - Higher false positive rate
        - More years of screening
        - Consider family history, personal risk factors
      `,
      monitoring: 'Results typically available within 1-2 weeks. Follow BI-RADS recommendations for follow-up.'
    },

    estimatedCost: {
      min: 100,
      max: 300,
      currency: 'USD',
      covered: true
    },

    expectedOutcomes: [
      '20-30% reduction in breast cancer mortality (ages 50-69)',
      'Earlier stage detection',
      'Increased breast-conserving surgery options',
      '10-15% false positive rate per screening'
    ],
    timeToEffect: 'Benefit accrues over 5-10 years of regular screening',
    successMetrics: [
      'Regular screening adherence',
      'Appropriate follow-up of abnormal results',
      'Cancer detected at early stage (if present)'
    ],

    requiredLabValues: [],
    requiredAssessments: ['Breast cancer risk assessment (Gail model or Tyrer-Cuzick)', 'Family history of breast cancer'],
    clinicianNotes: 'Mammography screening recommendations remain controversial due to conflicting guidelines. USPSTF recommends biennial ages 50-74 (individualized 40-49). ACS and NCCN recommend annual ages 40+. Canadian guidelines recommend biennial only ages 50-74. The debate centers on balancing mortality benefit vs harms (false positives, overdiagnosis). Key points: (1) Greatest benefit ages 50-74; (2) Ages 40-49 have smaller benefit, more harms—shared decision-making is key; (3) No upper age limit if life expectancy >10 years; (4) Dense breasts reduce sensitivity but adding MRI/ultrasound increases false positives; (5) 3D mammography (tomosynthesis) is superior to 2D but not universally available; (6) High-risk women (BRCA, chest radiation) need annual mammography + MRI starting age 30. Counsel patients on benefits AND harms—avoid "screening is always good" message. Many screen-detected DCIS cases may never progress (overdiagnosis dilemma). Insurance covers screening mammography without cost-sharing under ACA.'
  }
];

// ============================================================================
// EXPORT INTERVENTION LIBRARY
// ============================================================================

export const INTERVENTION_LIBRARY = {
  lifestyle: lifestyleInterventions,
  nutrition: nutritionInterventions,
  diagnostics: diagnosticsInterventions,
  cardiovascular: cardiovascularInterventions,
  metabolic: metabolicInterventions,
  // oncology: oncologyInterventions,              // Coming next
  // neurocognitive: neurocognitiveInterventions,  // Coming soon
  // musculoskeletal: musculoskeletalInterventions, // Coming soon
  // gut: gutInterventions,                         // Coming soon
  // immune: immuneInterventions,                   // Coming soon
};

// Helper function to get all interventions as flat array
export function getAllInterventions(): Intervention[] {
  return [
    ...lifestyleInterventions,
    ...nutritionInterventions,
    ...diagnosticsInterventions,
    ...cardiovascularInterventions,
    ...metabolicInterventions,
  ];
}

// Helper function to get interventions by domain
export function getInterventionsByDomain(domain: HealthDomain): Intervention[] {
  return getAllInterventions().filter(i => i.domain === domain);
}

// Helper function to get interventions by type
export function getInterventionsByType(type: InterventionType): Intervention[] {
  return getAllInterventions().filter(i => i.type === type);
}

// Helper function to search interventions
export function searchInterventions(query: string): Intervention[] {
  const lowerQuery = query.toLowerCase();
  return getAllInterventions().filter(i =>
    i.name.toLowerCase().includes(lowerQuery) ||
    i.description.toLowerCase().includes(lowerQuery) ||
    i.indications.some(ind => ind.toLowerCase().includes(lowerQuery))
  );
}
