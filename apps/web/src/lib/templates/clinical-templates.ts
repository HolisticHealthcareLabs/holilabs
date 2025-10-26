/**
 * Smart Clinical Templates
 *
 * Pre-built templates for common clinical scenarios
 * with AI-powered customization and voice command integration
 */

export interface ClinicalTemplate {
  id: string;
  name: string;
  category: 'chief-complaint' | 'ros' | 'physical-exam' | 'assessment' | 'plan' | 'procedure';
  description: string;
  content: string;
  variables: string[]; // Variables that can be filled in (e.g., {location}, {duration})
  voiceCommand?: string; // Voice command to trigger (e.g., "insert blood pressure template")
  keywords: string[]; // Keywords for auto-suggestion
}

export const CLINICAL_TEMPLATES: ClinicalTemplate[] = [
  // Chief Complaint Templates
  {
    id: 'cc-chest-pain',
    name: 'Chest Pain',
    category: 'chief-complaint',
    description: 'Template for chest pain assessment',
    content: `Patient presents with chest pain. Location: {location}. Quality: {quality}. Duration: {duration}. Severity: {severity}/10. Radiates to: {radiation}. Associated symptoms: {symptoms}. Aggravating factors: {aggravating}. Alleviating factors: {alleviating}.`,
    variables: ['location', 'quality', 'duration', 'severity', 'radiation', 'symptoms', 'aggravating', 'alleviating'],
    voiceCommand: 'insert chest pain',
    keywords: ['chest pain', 'cardiac', 'angina'],
  },
  {
    id: 'cc-abdominal-pain',
    name: 'Abdominal Pain',
    category: 'chief-complaint',
    description: 'Template for abdominal pain assessment',
    content: `Patient presents with abdominal pain in {location} quadrant. Onset: {onset}. Character: {character}. Duration: {duration}. Severity: {severity}/10. Associated symptoms: nausea {nausea}, vomiting {vomiting}, diarrhea {diarrhea}, fever {fever}. Last bowel movement: {bm}. Last meal: {meal}.`,
    variables: ['location', 'onset', 'character', 'duration', 'severity', 'nausea', 'vomiting', 'diarrhea', 'fever', 'bm', 'meal'],
    voiceCommand: 'insert abdominal pain',
    keywords: ['abdominal pain', 'stomach', 'gi'],
  },
  {
    id: 'cc-headache',
    name: 'Headache',
    category: 'chief-complaint',
    description: 'Template for headache assessment',
    content: `Patient presents with headache. Location: {location}. Quality: {quality} (throbbing/dull/sharp). Severity: {severity}/10. Duration: {duration}. Onset: {onset}. Associated symptoms: photophobia {photophobia}, phonophobia {phonophobia}, nausea {nausea}, visual changes {visual}. Previous episodes: {history}.`,
    variables: ['location', 'quality', 'severity', 'duration', 'onset', 'photophobia', 'phonophobia', 'nausea', 'visual', 'history'],
    voiceCommand: 'insert headache',
    keywords: ['headache', 'migraine', 'cephalgia'],
  },

  // Review of Systems Templates
  {
    id: 'ros-complete',
    name: 'Complete ROS',
    category: 'ros',
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

  // Physical Exam Templates
  {
    id: 'pe-vitals',
    name: 'Vital Signs',
    category: 'physical-exam',
    description: 'Vital signs template',
    content: `VITAL SIGNS:
BP: {bp} mmHg
HR: {hr} bpm, regular rhythm
RR: {rr} breaths/min
Temp: {temp}°F ({temp_c}°C)
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
    id: 'pe-cardiac',
    name: 'Cardiac Exam',
    category: 'physical-exam',
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

  // Assessment Templates
  {
    id: 'assessment-hypertension',
    name: 'Hypertension Assessment',
    category: 'assessment',
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
    id: 'assessment-diabetes',
    name: 'Diabetes Assessment',
    category: 'assessment',
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

  // Plan Templates
  {
    id: 'plan-medication',
    name: 'Medication Plan',
    category: 'plan',
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

  // Procedure Templates
  {
    id: 'proc-laceration-repair',
    name: 'Laceration Repair',
    category: 'procedure',
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
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): ClinicalTemplate | undefined {
  return CLINICAL_TEMPLATES.find(t => t.id === id);
}

/**
 * Search templates by keyword
 */
export function searchTemplates(query: string): ClinicalTemplate[] {
  const lowerQuery = query.toLowerCase();
  return CLINICAL_TEMPLATES.filter(
    t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.keywords.some(k => k.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: ClinicalTemplate['category']): ClinicalTemplate[] {
  return CLINICAL_TEMPLATES.filter(t => t.category === category);
}

/**
 * Fill template with values
 */
export function fillTemplate(template: ClinicalTemplate, values: Record<string, string>): string {
  let result = template.content;

  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || `{${key}}`);
  }

  return result;
}

/**
 * Extract unfilled variables from filled template
 */
export function getUnfilledVariables(filledContent: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const matches = Array.from(filledContent.matchAll(regex));
  return matches.map(m => m[1]);
}

/**
 * Parse voice command to find matching template
 */
export function findTemplateByVoiceCommand(command: string): ClinicalTemplate | undefined {
  const lowerCommand = command.toLowerCase();
  return CLINICAL_TEMPLATES.find(t =>
    t.voiceCommand && lowerCommand.includes(t.voiceCommand.toLowerCase())
  );
}
