/**
 * Smart Clinical Templates
 *
 * Pre-built templates for common clinical scenarios
 * with specialty-aware filtering, AI-powered customization,
 * and voice command integration.
 *
 * Templates tagged with an empty specialties array are universal
 * and visible to all practitioners regardless of declared specialty.
 */

export type Specialty =
  | 'Cardiology'
  | 'Internal Medicine'
  | 'Family Medicine'
  | 'Emergency Medicine'
  | 'Endocrinology'
  | 'Pediatrics'
  | 'Oncology'
  | 'Pulmonology'
  | 'Neurology'
  | 'Psychiatry'
  | 'Geriatrics'
  | 'Nephrology'
  | 'Rheumatology'
  | 'Dermatology'
  | 'Obstetrics & Gynecology'
  | 'Other';

export interface ClinicalTemplate {
  id: string;
  name: string;
  category: 'chief-complaint' | 'ros' | 'physical-exam' | 'assessment' | 'plan' | 'procedure' | 'intake';
  description: string;
  content: string;
  variables: string[];
  voiceCommand?: string;
  keywords: string[];
  specialties: Specialty[];
}

export const CLINICAL_TEMPLATES: ClinicalTemplate[] = [
  // =========================================================================
  // UNIVERSAL TEMPLATES (visible to all specialties)
  // =========================================================================

  {
    id: 'pe-vitals',
    name: 'Vital Signs',
    category: 'physical-exam',
    specialties: [],
    description: 'Vital signs template',
    content: `VITAL SIGNS:
BP: {bp} mmHg
HR: {hr} bpm, regular rhythm
RR: {rr} breaths/min
Temp: {temp} F ({temp_c} C)
O2 Sat: {o2}% on room air
Height: {height} cm
Weight: {weight} kg
BMI: {bmi}`,
    variables: ['bp', 'hr', 'rr', 'temp', 'temp_c', 'o2', 'height', 'weight', 'bmi'],
    voiceCommand: 'insert vital signs',
    keywords: ['vitals', 'bp', 'blood pressure', 'vital signs'],
  },
  {
    id: 'pe-general',
    name: 'General Physical Exam',
    category: 'physical-exam',
    specialties: [],
    description: 'Complete physical examination template',
    content: `PHYSICAL EXAMINATION:
GENERAL: Patient is alert and oriented x3, {appearance}, in {distress} distress
HEENT: Normocephalic, atraumatic. PERRL, EOMI. TMs clear bilaterally. Oropharynx clear.
NECK: Supple, no JVD, no lymphadenopathy
CARDIOVASCULAR: RRR, S1/S2 normal, no murmurs/rubs/gallops
RESPIRATORY: Clear to auscultation bilaterally, no wheezes/rales/rhonchi
ABDOMEN: Soft, non-tender, non-distended, bowel sounds normal
EXTREMITIES: No edema, pulses 2+ bilaterally
NEUROLOGICAL: Alert and oriented x3, cranial nerves II-XII intact, strength 5/5 all extremities
SKIN: Warm, dry, intact, no rashes`,
    variables: ['appearance', 'distress'],
    voiceCommand: 'insert physical exam',
    keywords: ['physical exam', 'pe', 'examination'],
  },
  {
    id: 'ros-complete',
    name: 'Complete ROS',
    category: 'ros',
    specialties: [],
    description: 'Comprehensive review of systems',
    content: `CONSTITUTIONAL: Fever {fever}, chills {chills}, weight loss {weight_loss}, fatigue {fatigue}
EYES: Vision changes {vision}, eye pain {eye_pain}
ENT: Hearing loss {hearing}, sore throat {throat}, sinus congestion {sinus}
CARDIOVASCULAR: Chest pain {chest_pain}, palpitations {palpitations}, orthopnea {orthopnea}
RESPIRATORY: Shortness of breath {sob}, cough {cough}, wheezing {wheeze}
GASTROINTESTINAL: Nausea {nausea}, vomiting {vomiting}, diarrhea {diarrhea}, constipation {constipation}
GENITOURINARY: Dysuria {dysuria}, frequency {frequency}, hematuria {hematuria}
MUSCULOSKELETAL: Joint pain {joint_pain}, muscle weakness {weakness}
SKIN: Rash {rash}, lesions {lesions}
NEUROLOGICAL: Headache {headache}, dizziness {dizziness}, numbness {numbness}
PSYCHIATRIC: Depression {depression}, anxiety {anxiety}
All other systems reviewed and negative.`,
    variables: ['fever', 'chills', 'weight_loss', 'fatigue', 'vision', 'eye_pain', 'hearing', 'throat', 'sinus', 'chest_pain', 'palpitations', 'orthopnea', 'sob', 'cough', 'wheeze', 'nausea', 'vomiting', 'diarrhea', 'constipation', 'dysuria', 'frequency', 'hematuria', 'joint_pain', 'weakness', 'rash', 'lesions', 'headache', 'dizziness', 'numbness', 'depression', 'anxiety'],
    voiceCommand: 'insert review of systems',
    keywords: ['ros', 'review of systems'],
  },
  {
    id: 'plan-medication',
    name: 'Medication Plan',
    category: 'plan',
    specialties: [],
    description: 'Template for medication changes',
    content: `PLAN - Medications:
1. Continue: {continue}
2. Start: {start}
   - Indication: {indication}
   - Dosing: {dosing}
   - Duration: {duration}
   - Monitoring: {monitoring}
3. Discontinue: {discontinue}
   - Reason: {dc_reason}
4. Adjust: {adjust}
   - New dose: {new_dose}
   - Reason: {adjust_reason}`,
    variables: ['continue', 'start', 'indication', 'dosing', 'duration', 'monitoring', 'discontinue', 'dc_reason', 'adjust', 'new_dose', 'adjust_reason'],
    voiceCommand: 'insert medication plan',
    keywords: ['medication', 'prescribe', 'rx'],
  },
  {
    id: 'plan-followup',
    name: 'Follow-up Plan',
    category: 'plan',
    specialties: [],
    description: 'Follow-up and monitoring plan',
    content: `FOLLOW-UP PLAN:
1. Return to clinic in {timeframe}
2. Labs: {labs} - to be done {lab_timing}
3. Imaging: {imaging} - {imaging_timing}
4. Referrals: {referrals}
5. Patient education provided regarding: {education}
6. Warning signs discussed: {warning_signs}
7. Contact number provided for urgent issues`,
    variables: ['timeframe', 'labs', 'lab_timing', 'imaging', 'imaging_timing', 'referrals', 'education', 'warning_signs'],
    voiceCommand: 'insert follow up plan',
    keywords: ['follow up', 'monitoring', 'return visit'],
  },

  // =========================================================================
  // CARDIOLOGY
  // =========================================================================

  {
    id: 'cc-chest-pain',
    name: 'Chest Pain',
    category: 'chief-complaint',
    specialties: ['Cardiology', 'Internal Medicine', 'Emergency Medicine', 'Family Medicine'],
    description: 'Template for chest pain assessment',
    content: `Patient presents with chest pain. Location: {location}. Quality: {quality}. Duration: {duration}. Severity: {severity}/10. Radiates to: {radiation}. Associated symptoms: {symptoms}. Aggravating factors: {aggravating}. Alleviating factors: {alleviating}.`,
    variables: ['location', 'quality', 'duration', 'severity', 'radiation', 'symptoms', 'aggravating', 'alleviating'],
    voiceCommand: 'insert chest pain',
    keywords: ['chest pain', 'cardiac', 'angina'],
  },
  {
    id: 'pe-cardiac',
    name: 'Cardiac Exam',
    category: 'physical-exam',
    specialties: ['Cardiology', 'Internal Medicine'],
    description: 'Focused cardiac examination',
    content: `CARDIOVASCULAR EXAMINATION:
Inspection: No visible pulsations, no chest wall deformities
Palpation: PMI at {pmi_location}, no heaves or thrills
Auscultation: Rate {hr} bpm, rhythm {rhythm}
  - S1/S2: {s1s2}
  - Murmurs: {murmurs}
  - Rubs: {rubs}
  - Gallops: {gallops}
Peripheral pulses: {pulses} bilaterally (radial, femoral, dorsalis pedis, posterior tibial)
Edema: {edema}
JVP: {jvp} cm at 45 degrees`,
    variables: ['pmi_location', 'hr', 'rhythm', 's1s2', 'murmurs', 'rubs', 'gallops', 'pulses', 'edema', 'jvp'],
    voiceCommand: 'insert cardiac exam',
    keywords: ['cardiac', 'heart', 'cardiovascular'],
  },
  {
    id: 'assessment-hypertension',
    name: 'Hypertension Assessment',
    category: 'assessment',
    specialties: ['Cardiology', 'Internal Medicine', 'Family Medicine', 'Nephrology'],
    description: 'Hypertension assessment and staging',
    content: `ASSESSMENT: Hypertension
Stage: {stage} (BP {bp})
Contributing factors: {factors}
End-organ damage: {end_organ}
Current management: {current_management}
ASCVD risk: {ascvd_risk}%`,
    variables: ['stage', 'bp', 'factors', 'end_organ', 'current_management', 'ascvd_risk'],
    voiceCommand: 'insert hypertension assessment',
    keywords: ['hypertension', 'htn', 'blood pressure'],
  },
  {
    id: 'assessment-chf',
    name: 'Heart Failure Assessment',
    category: 'assessment',
    specialties: ['Cardiology', 'Internal Medicine'],
    description: 'Heart failure classification and management assessment',
    content: `ASSESSMENT: Heart Failure
NYHA Class: {nyha_class}
Ejection Fraction: {ef}% ({hf_type})
BNP/NT-proBNP: {bnp} pg/mL
Volume status: {volume_status}
Current GDMT: {gdmt}
Daily weight trend: {weight_trend}
Fluid restriction adherence: {fluid}
Salt restriction adherence: {salt}`,
    variables: ['nyha_class', 'ef', 'hf_type', 'bnp', 'volume_status', 'gdmt', 'weight_trend', 'fluid', 'salt'],
    voiceCommand: 'insert heart failure',
    keywords: ['heart failure', 'chf', 'hfref', 'hfpef', 'nyha'],
  },
  {
    id: 'assessment-afib',
    name: 'Atrial Fibrillation Assessment',
    category: 'assessment',
    specialties: ['Cardiology', 'Internal Medicine'],
    description: 'AF risk stratification and anticoagulation decision',
    content: `ASSESSMENT: Atrial Fibrillation
Type: {af_type} (paroxysmal/persistent/permanent)
CHA2DS2-VASc Score: {chadsvasc}
HAS-BLED Score: {hasbled}
Anticoagulation: {anticoag_status}
Rate vs Rhythm Control: {strategy}
Ventricular rate: {rate} bpm
Symptoms: {symptoms}
Last echocardiogram: {echo_date} - LA size {la_size}`,
    variables: ['af_type', 'chadsvasc', 'hasbled', 'anticoag_status', 'strategy', 'rate', 'symptoms', 'echo_date', 'la_size'],
    voiceCommand: 'insert atrial fibrillation',
    keywords: ['afib', 'atrial fibrillation', 'anticoagulation', 'chadsvasc'],
  },

  // =========================================================================
  // ENDOCRINOLOGY
  // =========================================================================

  {
    id: 'assessment-diabetes',
    name: 'Diabetes Assessment',
    category: 'assessment',
    specialties: ['Endocrinology', 'Internal Medicine', 'Family Medicine'],
    description: 'Diabetes management assessment',
    content: `ASSESSMENT: Type {type} Diabetes Mellitus
Current control: HbA1c {hba1c}% ({control})
Complications: {complications}
Current management: {current_management}
Monitoring: {monitoring}
Target HbA1c: <{target}%`,
    variables: ['type', 'hba1c', 'control', 'complications', 'current_management', 'monitoring', 'target'],
    voiceCommand: 'insert diabetes assessment',
    keywords: ['diabetes', 'dm', 'diabetic'],
  },
  {
    id: 'assessment-thyroid',
    name: 'Thyroid Assessment',
    category: 'assessment',
    specialties: ['Endocrinology', 'Internal Medicine', 'Family Medicine'],
    description: 'Thyroid function assessment and management',
    content: `ASSESSMENT: {thyroid_condition}
TSH: {tsh} mIU/L (ref 0.4-4.0)
Free T4: {ft4} ng/dL
Free T3: {ft3} pg/mL (if applicable)
Thyroid antibodies: {antibodies}
Imaging: {imaging}
Current medication: {medication}
Symptoms: {symptoms}
Dose adjustment: {adjustment}`,
    variables: ['thyroid_condition', 'tsh', 'ft4', 'ft3', 'antibodies', 'imaging', 'medication', 'symptoms', 'adjustment'],
    voiceCommand: 'insert thyroid assessment',
    keywords: ['thyroid', 'hypothyroid', 'hyperthyroid', 'tsh'],
  },

  // =========================================================================
  // NEUROLOGY
  // =========================================================================

  {
    id: 'cc-headache',
    name: 'Headache',
    category: 'chief-complaint',
    specialties: ['Neurology', 'Internal Medicine', 'Family Medicine', 'Emergency Medicine'],
    description: 'Template for headache assessment',
    content: `Patient presents with headache. Location: {location}. Quality: {quality} (throbbing/dull/sharp). Severity: {severity}/10. Duration: {duration}. Onset: {onset}. Associated symptoms: photophobia {photophobia}, phonophobia {phonophobia}, nausea {nausea}, visual changes {visual}. Previous episodes: {history}.`,
    variables: ['location', 'quality', 'severity', 'duration', 'onset', 'photophobia', 'phonophobia', 'nausea', 'visual', 'history'],
    voiceCommand: 'insert headache',
    keywords: ['headache', 'migraine', 'cephalgia'],
  },
  {
    id: 'pe-neurological',
    name: 'Neurological Exam',
    category: 'physical-exam',
    specialties: ['Neurology', 'Emergency Medicine'],
    description: 'Focused neurological examination',
    content: `NEUROLOGICAL EXAMINATION:
Mental Status: Alert, oriented x{orientation}. Speech fluent, no dysarthria.
Cranial Nerves:
  II: Visual fields full to confrontation. Fundoscopy {fundoscopy}.
  III/IV/VI: EOMI, no nystagmus. Pupils {pupils}.
  V: Sensation intact V1-V3. Masseter strength normal.
  VII: Face symmetric. Smile symmetric.
  VIII: Hearing grossly intact bilaterally.
  IX/X: Palate rises symmetrically. Gag reflex intact.
  XI: SCM and trapezius strength {cn11}.
  XII: Tongue midline, no fasciculations.
Motor: Strength {strength} all extremities. Tone {tone}. No pronator drift.
Sensory: Light touch, pinprick, proprioception intact.
Reflexes: {reflexes} throughout. Babinski {babinski}.
Coordination: Finger-to-nose {ftn}. Heel-to-shin {hts}. Rapid alternating movements {ram}.
Gait: {gait}. Romberg {romberg}.`,
    variables: ['orientation', 'fundoscopy', 'pupils', 'cn11', 'strength', 'tone', 'reflexes', 'babinski', 'ftn', 'hts', 'ram', 'gait', 'romberg'],
    voiceCommand: 'insert neuro exam',
    keywords: ['neurological', 'neuro', 'cranial nerves', 'motor', 'sensory'],
  },
  {
    id: 'assessment-stroke',
    name: 'Stroke Assessment',
    category: 'assessment',
    specialties: ['Neurology', 'Emergency Medicine'],
    description: 'Acute stroke assessment and NIHSS documentation',
    content: `ASSESSMENT: Acute {stroke_type} Stroke
NIHSS Score: {nihss}
Last known well: {lkw}
Onset to arrival: {onset_to_arrival}
CT/MRI findings: {imaging}
Vessel involved: {vessel}
tPA eligibility: {tpa_eligible}
Thrombectomy considered: {thrombectomy}
BP management: {bp_management}
Swallow screen: {swallow}`,
    variables: ['stroke_type', 'nihss', 'lkw', 'onset_to_arrival', 'imaging', 'vessel', 'tpa_eligible', 'thrombectomy', 'bp_management', 'swallow'],
    voiceCommand: 'insert stroke assessment',
    keywords: ['stroke', 'cva', 'nihss', 'tpa'],
  },

  // =========================================================================
  // PULMONOLOGY
  // =========================================================================

  {
    id: 'assessment-copd',
    name: 'COPD Assessment',
    category: 'assessment',
    specialties: ['Pulmonology', 'Internal Medicine', 'Family Medicine'],
    description: 'COPD classification and exacerbation assessment',
    content: `ASSESSMENT: COPD
GOLD Stage: {gold_stage}
GOLD Group: {gold_group}
FEV1: {fev1}% predicted
FEV1/FVC: {fev1_fvc}
CAT Score: {cat_score}
mMRC Dyspnea: Grade {mmrc}
Exacerbation history (past 12 months): {exacerbations}
Current inhaler regimen: {inhalers}
O2 requirement: {o2}
Smoking status: {smoking}`,
    variables: ['gold_stage', 'gold_group', 'fev1', 'fev1_fvc', 'cat_score', 'mmrc', 'exacerbations', 'inhalers', 'o2', 'smoking'],
    voiceCommand: 'insert copd assessment',
    keywords: ['copd', 'emphysema', 'chronic bronchitis', 'gold'],
  },
  {
    id: 'assessment-asthma',
    name: 'Asthma Assessment',
    category: 'assessment',
    specialties: ['Pulmonology', 'Internal Medicine', 'Family Medicine', 'Pediatrics'],
    description: 'Asthma control and step therapy assessment',
    content: `ASSESSMENT: Asthma
Control level: {control_level} (well-controlled / not well-controlled / very poorly controlled)
Step: {step}
Daytime symptoms: {daytime_sx} times per week
Nighttime awakenings: {nighttime} times per month
Rescue inhaler use: {rescue_use}
Activity limitation: {activity}
FEV1: {fev1}% predicted
Peak flow: {peak_flow} L/min ({pf_percent}% personal best)
Current controller: {controller}
Action plan reviewed: {action_plan}`,
    variables: ['control_level', 'step', 'daytime_sx', 'nighttime', 'rescue_use', 'activity', 'fev1', 'peak_flow', 'pf_percent', 'controller', 'action_plan'],
    voiceCommand: 'insert asthma assessment',
    keywords: ['asthma', 'reactive airway', 'bronchospasm'],
  },

  // =========================================================================
  // NEPHROLOGY
  // =========================================================================

  {
    id: 'assessment-ckd',
    name: 'CKD Assessment',
    category: 'assessment',
    specialties: ['Nephrology', 'Internal Medicine', 'Endocrinology'],
    description: 'Chronic kidney disease staging and management',
    content: `ASSESSMENT: Chronic Kidney Disease
Stage: {ckd_stage} (eGFR {egfr} mL/min/1.73m2)
Albuminuria category: {alb_category} (UACR {uacr} mg/g)
Etiology: {etiology}
Creatinine: {creatinine} mg/dL
BUN: {bun} mg/dL
Potassium: {potassium} mEq/L
Bicarbonate: {bicarb} mEq/L
Phosphorus: {phosphorus} mg/dL
Hemoglobin: {hemoglobin} g/dL
BP target: {bp_target}
ACEi/ARB: {raas_blocker}
Nephrology referral: {referral_status}`,
    variables: ['ckd_stage', 'egfr', 'alb_category', 'uacr', 'etiology', 'creatinine', 'bun', 'potassium', 'bicarb', 'phosphorus', 'hemoglobin', 'bp_target', 'raas_blocker', 'referral_status'],
    voiceCommand: 'insert ckd assessment',
    keywords: ['ckd', 'chronic kidney', 'renal', 'egfr', 'dialysis'],
  },

  // =========================================================================
  // PSYCHIATRY
  // =========================================================================

  {
    id: 'assessment-depression',
    name: 'Depression Assessment',
    category: 'assessment',
    specialties: ['Psychiatry', 'Family Medicine', 'Internal Medicine'],
    description: 'Major depressive disorder assessment with PHQ-9',
    content: `ASSESSMENT: Major Depressive Disorder
PHQ-9 Score: {phq9} ({phq9_severity})
Duration of current episode: {duration}
Previous episodes: {previous}
Suicidal ideation: {si} (plan: {plan}, intent: {intent}, means: {means})
Safety plan: {safety_plan}
Current medications: {medications}
Psychotherapy: {therapy}
Functional impairment: {functional}
Sleep: {sleep}
Appetite: {appetite}`,
    variables: ['phq9', 'phq9_severity', 'duration', 'previous', 'si', 'plan', 'intent', 'means', 'safety_plan', 'medications', 'therapy', 'functional', 'sleep', 'appetite'],
    voiceCommand: 'insert depression assessment',
    keywords: ['depression', 'mdd', 'phq9', 'mood'],
  },

  // =========================================================================
  // DERMATOLOGY
  // =========================================================================

  {
    id: 'pe-skin-lesion',
    name: 'Skin Lesion Exam',
    category: 'physical-exam',
    specialties: ['Dermatology', 'Family Medicine'],
    description: 'Structured skin lesion description using ABCDE criteria',
    content: `SKIN LESION EXAMINATION:
Location: {location}
Size: {size_length} x {size_width} mm
Shape: {shape}
Color: {color}
Border: {border} (regular/irregular)
Symmetry: {symmetry}
Elevation: {elevation} (flat/raised/pedunculated)
Surface: {surface} (smooth/rough/ulcerated/crusted)
Tenderness: {tenderness}
Duration: {duration}
Change over time: {change}
ABCDE:
  A (Asymmetry): {asymmetry}
  B (Border): {border_regularity}
  C (Color): {color_uniformity}
  D (Diameter): {diameter}
  E (Evolution): {evolution}
Assessment: {assessment}
Plan: {plan}`,
    variables: ['location', 'size_length', 'size_width', 'shape', 'color', 'border', 'symmetry', 'elevation', 'surface', 'tenderness', 'duration', 'change', 'asymmetry', 'border_regularity', 'color_uniformity', 'diameter', 'evolution', 'assessment', 'plan'],
    voiceCommand: 'insert skin lesion',
    keywords: ['skin', 'lesion', 'mole', 'rash', 'dermatology', 'abcde'],
  },

  // =========================================================================
  // EMERGENCY MEDICINE / GENERAL
  // =========================================================================

  {
    id: 'cc-abdominal-pain',
    name: 'Abdominal Pain',
    category: 'chief-complaint',
    specialties: ['Emergency Medicine', 'Internal Medicine', 'Family Medicine'],
    description: 'Template for abdominal pain assessment',
    content: `Patient presents with abdominal pain in {location} quadrant. Onset: {onset}. Character: {character}. Duration: {duration}. Severity: {severity}/10. Associated symptoms: nausea {nausea}, vomiting {vomiting}, diarrhea {diarrhea}, fever {fever}. Last bowel movement: {bm}. Last meal: {meal}.`,
    variables: ['location', 'onset', 'character', 'duration', 'severity', 'nausea', 'vomiting', 'diarrhea', 'fever', 'bm', 'meal'],
    voiceCommand: 'insert abdominal pain',
    keywords: ['abdominal pain', 'stomach', 'gi'],
  },
  {
    id: 'proc-laceration-repair',
    name: 'Laceration Repair',
    category: 'procedure',
    specialties: ['Emergency Medicine', 'Family Medicine'],
    description: 'Laceration repair procedure note',
    content: `PROCEDURE: Laceration Repair
Location: {location}
Size: {length} cm x {width} cm x {depth} cm
Mechanism: {mechanism}
Time of injury: {injury_time}
Tetanus status: {tetanus}

PROCEDURE:
1. Informed consent obtained
2. Area prepped with {prep}
3. Local anesthesia: {anesthetic} {volume} mL
4. Wound explored - {findings}
5. Wound irrigated with {irrigation}
6. Closure: {suture_type} {suture_size} sutures x {number}
7. Sterile dressing applied
8. Neurovascular status intact distally

POST-PROCEDURE:
- Wound care instructions provided
- Return for suture removal in {removal_days} days
- Signs of infection discussed
- Antibiotics: {antibiotics}`,
    variables: ['location', 'length', 'width', 'depth', 'mechanism', 'injury_time', 'tetanus', 'prep', 'anesthetic', 'volume', 'findings', 'irrigation', 'suture_type', 'suture_size', 'number', 'removal_days', 'antibiotics'],
    voiceCommand: 'insert laceration repair',
    keywords: ['laceration', 'suture', 'wound'],
  },

  // =========================================================================
  // PEDIATRICS
  // =========================================================================

  {
    id: 'assessment-well-child',
    name: 'Well-Child Visit',
    category: 'assessment',
    specialties: ['Pediatrics', 'Family Medicine'],
    description: 'Well-child visit developmental assessment',
    content: `WELL-CHILD VISIT: {age}
Growth:
  Weight: {weight} kg ({weight_percentile}th percentile)
  Height: {height} cm ({height_percentile}th percentile)
  Head circumference: {hc} cm ({hc_percentile}th percentile)
  BMI: {bmi} ({bmi_percentile}th percentile)
Nutrition: {nutrition}
Development:
  Gross motor: {gross_motor}
  Fine motor: {fine_motor}
  Language: {language}
  Social: {social}
Screening: {screening}
Immunizations: {immunizations}
Safety counseling: {safety}
Anticipatory guidance: {guidance}`,
    variables: ['age', 'weight', 'weight_percentile', 'height', 'height_percentile', 'hc', 'hc_percentile', 'bmi', 'bmi_percentile', 'nutrition', 'gross_motor', 'fine_motor', 'language', 'social', 'screening', 'immunizations', 'safety', 'guidance'],
    voiceCommand: 'insert well child',
    keywords: ['well child', 'pediatric', 'development', 'growth'],
  },

  // =========================================================================
  // OBSTETRICS & GYNECOLOGY
  // =========================================================================

  {
    id: 'assessment-prenatal',
    name: 'Prenatal Visit',
    category: 'assessment',
    specialties: ['Obstetrics & Gynecology', 'Family Medicine'],
    description: 'Routine prenatal visit documentation',
    content: `PRENATAL VISIT:
Gestational age: {ga} weeks by {dating_method}
EDD: {edd}
Gravida: {gravida} Para: {para}
Weight: {weight} kg (gain {weight_gain} kg from prepregnancy)
BP: {bp} mmHg
Urine: Protein {protein}, glucose {glucose}
Fundal height: {fundal_height} cm
Fetal heart rate: {fhr} bpm
Fetal movement: {movement}
Presentation: {presentation}
Edema: {edema}
Cervical exam: {cervical} (if applicable)
Labs reviewed: {labs}
Complaints: {complaints}
Plan: {plan}`,
    variables: ['ga', 'dating_method', 'edd', 'gravida', 'para', 'weight', 'weight_gain', 'bp', 'protein', 'glucose', 'fundal_height', 'fhr', 'movement', 'presentation', 'edema', 'cervical', 'labs', 'complaints', 'plan'],
    voiceCommand: 'insert prenatal visit',
    keywords: ['prenatal', 'pregnancy', 'obstetric', 'ob'],
  },
];

// =========================================================================
// Filtering and lookup functions
// =========================================================================

function isUniversalTemplate(template: ClinicalTemplate): boolean {
  return template.specialties.length === 0;
}

export function getTemplatesForSpecialties(
  userSpecialties: string[]
): ClinicalTemplate[] {
  if (userSpecialties.length === 0) return CLINICAL_TEMPLATES;

  const normalizedSpecialties = new Set(
    userSpecialties.map((s) => s.trim().toLowerCase())
  );

  return CLINICAL_TEMPLATES.filter((template) => {
    if (isUniversalTemplate(template)) return true;
    return template.specialties.some((s) =>
      normalizedSpecialties.has(s.toLowerCase())
    );
  });
}

export function getTemplateById(id: string): ClinicalTemplate | undefined {
  return CLINICAL_TEMPLATES.find((t) => t.id === id);
}

export function searchTemplates(
  query: string,
  userSpecialties?: string[]
): ClinicalTemplate[] {
  const pool = userSpecialties?.length
    ? getTemplatesForSpecialties(userSpecialties)
    : CLINICAL_TEMPLATES;

  const lowerQuery = query.toLowerCase();
  return pool.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.keywords.some((k) => k.toLowerCase().includes(lowerQuery))
  );
}

export function getTemplatesByCategory(
  category: ClinicalTemplate['category'],
  userSpecialties?: string[]
): ClinicalTemplate[] {
  const pool = userSpecialties?.length
    ? getTemplatesForSpecialties(userSpecialties)
    : CLINICAL_TEMPLATES;

  return pool.filter((t) => t.category === category);
}

export function fillTemplate(
  template: ClinicalTemplate,
  values: Record<string, string>
): string {
  let result = template.content;
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || `{${key}}`);
  }
  return result;
}

export function getUnfilledVariables(filledContent: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const matches = Array.from(filledContent.matchAll(regex));
  return matches.map((m) => m[1]);
}

export function findTemplateByVoiceCommand(
  command: string,
  userSpecialties?: string[]
): ClinicalTemplate | undefined {
  const pool = userSpecialties?.length
    ? getTemplatesForSpecialties(userSpecialties)
    : CLINICAL_TEMPLATES;

  const lowerCommand = command.toLowerCase();
  return pool.find(
    (t) => t.voiceCommand && lowerCommand.includes(t.voiceCommand.toLowerCase())
  );
}

export function getAvailableSpecialties(): Specialty[] {
  const specialtySet = new Set<Specialty>();
  for (const template of CLINICAL_TEMPLATES) {
    for (const specialty of template.specialties) {
      specialtySet.add(specialty);
    }
  }
  return Array.from(specialtySet).sort();
}

export function getTemplateCounts(
  userSpecialties?: string[]
): Record<ClinicalTemplate['category'], number> {
  const pool = userSpecialties?.length
    ? getTemplatesForSpecialties(userSpecialties)
    : CLINICAL_TEMPLATES;

  const counts: Record<string, number> = {};
  for (const template of pool) {
    counts[template.category] = (counts[template.category] ?? 0) + 1;
  }
  return counts as Record<ClinicalTemplate['category'], number>;
}
