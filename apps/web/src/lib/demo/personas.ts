/**
 * Demo Persona Engine
 *
 * One pre-scripted persona per discipline. Each persona includes:
 *  - A named demo doctor
 *  - 3–5 realistic patients with vitals and chief complaints
 *  - 1 pre-filled SOAP note from today's encounter
 *  - 2–3 CDSS alerts matching specialty guidelines
 *
 * Used by /api/demo/provision to seed the ephemeral workspace with
 * instantly compelling, specialty-appropriate content.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DemoPatient {
  firstName: string;
  lastName: string;
  age: number;
  sex: 'M' | 'F';
  chiefComplaint: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'arrived';
  vitals?: {
    bp?: string;
    hr?: number;
    temp?: string;
    spo2?: number;
    weight?: string;
  };
}

export interface DemoCDSSAlert {
  summary: string;
  detail: string;
  indicator: 'critical' | 'warning' | 'info';
}

export interface DemoSOAP {
  patientName: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface DemoVoiceProfile {
  copilotVoiceId: string;
  doctorVoiceId: string;
  tone: 'warm' | 'clinical' | 'calm' | 'urgent';
}

export interface DemoPersona {
  disciplineSlug: string;
  doctorTitle: string;
  doctorFirst: string;
  doctorLast: string;
  specialty: string;
  patients: DemoPatient[];
  soapNote: DemoSOAP;
  cdssAlerts: DemoCDSSAlert[];
  voice?: DemoVoiceProfile;
}

// ─── Personas ─────────────────────────────────────────────────────────────────

const personas: DemoPersona[] = [

  // ── Internal Medicine ───────────────────────────────────────────────────────
  {
    disciplineSlug: 'internal-medicine',
    doctorTitle:    'Dr.',
    doctorFirst:    'Ricardo',
    doctorLast:     'Ferreira',
    specialty:      'Internal Medicine',
    voice: { copilotVoiceId: 'onwK4e9ZLuTAKqWW03F9', doctorVoiceId: 'pNInz6obpgDQGcFmaJgB', tone: 'clinical' },
    patients: [
      { firstName: 'James',    lastName: 'O\'Brien',  age: 58, sex: 'M', chiefComplaint: 'Chest tightness & dyspnea on exertion',     status: 'in-progress', vitals: { bp: '162/95', hr: 94, spo2: 93, weight: '92 kg' } },
      { firstName: 'Maria',    lastName: 'Costa',     age: 44, sex: 'F', chiefComplaint: 'Fatigue and uncontrolled blood glucose',     status: 'arrived',     vitals: { bp: '138/88', hr: 82, spo2: 98, weight: '78 kg' } },
      { firstName: 'Carlos',   lastName: 'Mendes',    age: 67, sex: 'M', chiefComplaint: 'Peripheral oedema — bilateral',             status: 'scheduled',   vitals: { bp: '148/92', hr: 76, weight: '105 kg' } },
      { firstName: 'Patricia', lastName: 'Alves',     age: 52, sex: 'F', chiefComplaint: 'Persistent cough and night sweats',         status: 'scheduled' },
      { firstName: 'Roberto',  lastName: 'Lima',      age: 61, sex: 'M', chiefComplaint: 'Follow-up: CKD Stage 3 + hypertension',     status: 'scheduled' },
    ],
    soapNote: {
      patientName: 'James O\'Brien',
      subjective:  '58-year-old male presenting with 5-day history of progressive chest tightness and shortness of breath on exertion. Reports bilateral ankle swelling. PMH: CKD Stage 3, T2DM. Medications: Lisinopril 10 mg, Metformin 1000 mg BID, Furosemide 40 mg, Atorvastatin 40 mg, Aspirin 81 mg.',
      objective:   'BP 162/95 mmHg, HR 94 bpm, SpO2 93% RA, RR 18. Bibasilar crackles on auscultation. S3 gallop present. Pitting oedema 2+ bilateral lower extremities. JVD elevated at 8 cm H2O.',
      assessment:  'Acute decompensated heart failure (I50.9). Poorly controlled hypertension (I10). CKD Stage 3 (N18.3). Type 2 Diabetes Mellitus (E11.9). Rule out ACS given family history.',
      plan:        '1. Urgent ECG, Troponin I series, BNP, CMP, chest X-ray STAT.\n2. Hold Metformin — eGFR < 45 and contrast imaging pending.\n3. IV Furosemide 80 mg now; reassess in 2 h.\n4. Uptitrate Lisinopril to 20 mg if renal function stable.\n5. Refer cardiology for echo and possible coronary angiography.\n6. Patient education: fluid restriction 1.5 L/day, daily weights.',
    },
    cdssAlerts: [
      { summary: 'Drug Interaction: Metformin + Contrast Dye (CKD Stage 3)', detail: 'eGFR < 45 mL/min: hold Metformin 48 h before contrast-enhanced imaging to prevent lactic acidosis.', indicator: 'critical' },
      { summary: 'BP Advisory: 162/95 mmHg — Exceeds JNC-8 Target', detail: 'Goal < 140/90 mmHg. Consider Lisinopril uptitration or addition of amlodipine 5 mg.', indicator: 'warning' },
      { summary: 'BNP Elevation Expected — Heart Failure Protocol', detail: 'Order BNP to confirm ADHF. If > 400 pg/mL, initiate AHA Stage C heart failure pathway.', indicator: 'info' },
    ],
  },

  // ── Cardiology ──────────────────────────────────────────────────────────────
  {
    disciplineSlug: 'cardiology',
    doctorTitle:    'Dr.',
    doctorFirst:    'Ana',
    doctorLast:     'Ribeiro',
    specialty:      'Cardiology',
    voice: { copilotVoiceId: 'EXAVITQu4vr4xnSDxMaL', doctorVoiceId: '21m00Tcm4TlvDq8ikWAM', tone: 'calm' },
    patients: [
      { firstName: 'Eduardo', lastName: 'Santos',  age: 63, sex: 'M', chiefComplaint: 'Post-MI follow-up — 6 weeks',                status: 'in-progress', vitals: { bp: '128/80', hr: 68, spo2: 98 } },
      { firstName: 'Claudia', lastName: 'Pereira', age: 47, sex: 'F', chiefComplaint: 'Palpitations and pre-syncope episodes',      status: 'arrived',     vitals: { bp: '115/72', hr: 112, spo2: 99 } },
      { firstName: 'Marcos',  lastName: 'Teixeira', age: 71, sex: 'M', chiefComplaint: 'Aortic stenosis — annual surveillance',    status: 'scheduled' },
      { firstName: 'Beatriz', lastName: 'Nunes',   age: 55, sex: 'F', chiefComplaint: 'Hypertrophic cardiomyopathy monitoring',    status: 'scheduled' },
    ],
    soapNote: {
      patientName: 'Eduardo Santos',
      subjective:  '63-year-old male, 6-week post-STEMI follow-up. Reports mild exertional fatigue; denies chest pain, orthopnoea, or PND. Adherent to dual antiplatelet therapy (Aspirin 100 mg + Ticagrelor 90 mg BID), Bisoprolol 5 mg, Ramipril 5 mg, Atorvastatin 80 mg.',
      objective:   'BP 128/80 mmHg, HR 68 bpm regular, SpO2 98%. No JVD. Clear lung fields. Soft S1/S2, no murmurs. Mild pedal oedema 1+. Echo report: LVEF 42%, anterior hypokinesis.',
      assessment:  'Post-STEMI with reduced ejection fraction (I25.2). Stable — LVEF improving from 35% at discharge. Medication-adherent.',
      plan:        '1. Continue dual antiplatelet therapy for 12 months total (6 weeks remaining).\n2. Uptitrate Ramipril to 10 mg; recheck renal function in 4 weeks.\n3. Uptitrate Bisoprolol to 7.5 mg; target HR 55–60 bpm.\n4. Repeat echo in 3 months to reassess LVEF.\n5. Cardiac rehabilitation referral — confirm enrolment.\n6. ICD risk stratification if LVEF < 35% at 3-month echo.',
    },
    cdssAlerts: [
      { summary: 'LVEF < 45%: Guideline-Directed Medical Therapy Review', detail: 'ACC/AHA 2022: maximise ACEi + beta-blocker dosing. Consider adding MRA (spironolactone) if EF remains < 40%.', indicator: 'warning' },
      { summary: 'DAPT Duration Alert: 12-month target approaching', detail: 'Patient is at 6 months post-STEMI. Plan transition to single antiplatelet at month 12 unless high ischaemic risk.', indicator: 'info' },
      { summary: 'LDL Target: Verify < 55 mg/dL for very-high-risk patient', detail: 'ESC 2021: post-ACS LDL goal < 55 mg/dL. Confirm latest lipid panel; consider adding ezetimibe if not at target.', indicator: 'info' },
    ],
  },

  // ── Pediatrics ──────────────────────────────────────────────────────────────
  {
    disciplineSlug: 'pediatrics',
    doctorTitle:    'Dr.',
    doctorFirst:    'Camila',
    voice: { copilotVoiceId: 'AZnzlk1XvdvUeBnXmlld', doctorVoiceId: 'MF3mGyEYCl7XYWbV9V6O', tone: 'warm' },
    doctorLast:     'Oliveira',
    specialty:      'Pediatrics',
    patients: [
      { firstName: 'Lucas',    lastName: 'Silva',    age: 4,  sex: 'M', chiefComplaint: 'Fever 39.2°C x 3 days, rhinorrhoea',         status: 'in-progress', vitals: { bp: '96/60', hr: 108, temp: '39.2°C', spo2: 97 } },
      { firstName: 'Isabella', lastName: 'Gomes',    age: 8,  sex: 'F', chiefComplaint: 'Asthma exacerbation — peak flow 65%',         status: 'arrived',     vitals: { bp: '100/65', hr: 96, spo2: 94 } },
      { firstName: 'Miguel',   lastName: 'Rocha',    age: 2,  sex: 'M', chiefComplaint: 'Well-child visit — 24 months',               status: 'scheduled',   vitals: { weight: '12.4 kg' } },
      { firstName: 'Sofia',    lastName: 'Carvalho', age: 12, sex: 'F', chiefComplaint: 'ADHD medication follow-up',                  status: 'scheduled' },
      { firstName: 'Arthur',   lastName: 'Barbosa',  age: 6,  sex: 'M', chiefComplaint: 'Suspected streptococcal pharyngitis',        status: 'scheduled' },
    ],
    soapNote: {
      patientName: 'Lucas Silva',
      subjective:  '4-year-old male brought by mother with 3-day history of fever up to 39.2°C, rhinorrhoea, and mild cough. No vomiting or diarrhoea. Up to date on vaccinations. No known allergies. No antibiotic use in the past 3 months.',
      objective:   'T 39.2°C, HR 108, SpO2 97%, RR 24. Alert and playful. Bilateral nasal congestion. Oropharynx: mild erythema, no exudate. Tympanic membranes clear bilaterally. Lungs: clear, no wheeze or retractions. No lymphadenopathy.',
      assessment:  'Viral upper respiratory tract infection (J06.9). Low clinical probability for bacterial pharyngitis (McIsaac score 0). No indication for antibiotic therapy.',
      plan:        '1. Supportive care: paracetamol 15 mg/kg q6h PRN fever.\n2. Adequate hydration — push oral fluids.\n3. Nasal saline drops for congestion.\n4. Return precautions: fever > 5 days, respiratory distress, or poor oral intake.\n5. No antibiotic indicated at this time.\n6. Follow-up in 3–5 days if symptoms worsen.',
    },
    cdssAlerts: [
      { summary: 'Antibiotic Stewardship: McIsaac Score 0', detail: 'Score 0–1 has < 3% probability of Group A Strep. No antibiotic indicated. Consistent with AAP guidelines.', indicator: 'info' },
      { summary: 'Fever Management: Avoid ibuprofen < 3 months', detail: 'Patient is 4 years — ibuprofen 10 mg/kg q6–8h is safe. Alternating with paracetamol may improve comfort.', indicator: 'info' },
    ],
  },

  // ── Orthopedics ─────────────────────────────────────────────────────────────
  {
    disciplineSlug: 'orthopedics',
    doctorTitle:    'Dr.',
    doctorFirst:    'Felipe',
    voice: { copilotVoiceId: 'onwK4e9ZLuTAKqWW03F9', doctorVoiceId: 'VR6AewLTigWG4xSOukaG', tone: 'clinical' },
    doctorLast:     'Martins',
    specialty:      'Orthopedics',
    patients: [
      { firstName: 'André',    lastName: 'Moreira',  age: 45, sex: 'M', chiefComplaint: 'Right knee pain — ACL tear post-MRI',       status: 'in-progress', vitals: { bp: '122/78', hr: 72 } },
      { firstName: 'Fernanda', lastName: 'Dias',     age: 68, sex: 'F', chiefComplaint: 'Right hip OA — pre-op assessment THA',      status: 'arrived',     vitals: { bp: '134/84', hr: 78, weight: '72 kg' } },
      { firstName: 'Paulo',    lastName: 'Sousa',    age: 32, sex: 'M', chiefComplaint: 'Low back pain — L4/L5 disc herniation',     status: 'scheduled' },
      { firstName: 'Renata',   lastName: 'Faria',    age: 55, sex: 'F', chiefComplaint: 'Rotator cuff tear — conservative management review', status: 'scheduled' },
    ],
    soapNote: {
      patientName: 'André Moreira',
      subjective:  '45-year-old male presenting with right knee pain following sports injury 3 weeks ago. MRI confirmed complete ACL tear with medial meniscus involvement. Swelling persists. Pain 7/10 on VAS. Requests return-to-sport guidance and surgical options.',
      objective:   'Right knee: effusion present, positive Lachman test, positive pivot shift. ROM: flexion 100° (limited), extension full. McMurray test positive medial. Neurovascular intact distally. MRI: complete ACL rupture + posterior horn medial meniscus tear.',
      assessment:  'Complete ACL rupture right knee (S83.511A). Medial meniscus tear right knee (S83.201A). Active individual requesting return to recreational football.',
      plan:        '1. Refer to orthopaedic surgery for ACL reconstruction + meniscus repair discussion.\n2. Pre-operative physiotherapy: quadriceps strengthening, range-of-motion restoration.\n3. Knee brace (unloader type) for daily activities.\n4. Ibuprofen 600 mg TID with food for analgesia; max 2 weeks.\n5. No return to pivoting sports until post-operative clearance.\n6. Follow-up in 2 weeks or post-surgical consultation.',
    },
    cdssAlerts: [
      { summary: 'NSAID Caution: Ibuprofen > 2 weeks — GI Risk', detail: 'If Ibuprofen continued beyond 2 weeks, add PPI cover (omeprazole 20 mg OD) per NICE guidelines.', indicator: 'warning' },
      { summary: 'Surgical Planning: Meniscus Repair + ACL — Timing', detail: 'Combined ACL reconstruction + meniscus repair recommended within 3–6 months. Delay risks further cartilage damage (ESSKA 2023).', indicator: 'info' },
    ],
  },

  // ── Neurology ───────────────────────────────────────────────────────────────
  {
    disciplineSlug: 'neurology',
    voice: { copilotVoiceId: 'EXAVITQu4vr4xnSDxMaL', doctorVoiceId: 'pNInz6obpgDQGcFmaJgB', tone: 'calm' },
    doctorTitle:    'Dr.',
    doctorFirst:    'Larissa',
    doctorLast:     'Monteiro',
    specialty:      'Neurology',
    patients: [
      { firstName: 'Guilherme', lastName: 'Azevedo', age: 52, sex: 'M', chiefComplaint: 'New focal seizures — workup',               status: 'in-progress', vitals: { bp: '130/82', hr: 74 } },
      { firstName: 'Mariana',   lastName: 'Lopes',   age: 38, sex: 'F', chiefComplaint: 'Migraine with aura — refractory',          status: 'arrived' },
      { firstName: 'Jorge',     lastName: 'Cunha',   age: 71, sex: 'M', chiefComplaint: 'Parkinson\'s disease follow-up',           status: 'scheduled',   vitals: { bp: '118/70', hr: 64 } },
      { firstName: 'Tatiana',   lastName: 'Vieira',  age: 29, sex: 'F', chiefComplaint: 'First MS relapse — treatment initiation',  status: 'scheduled' },
    ],
    soapNote: {
      patientName: 'Guilherme Azevedo',
      subjective:  '52-year-old male presenting with 3 episodes of right arm clonic jerking with secondary generalisation over the past 6 weeks. Postictal confusion lasting 10 minutes. No prior seizure history. Non-smoker. Takes no regular medications. Reports no alcohol use. Family history negative for epilepsy.',
      objective:   'Neurological exam: fully alert and oriented. Subtle right-hand drift on pronator test. No papilloedema. No cranial nerve deficits. Gait and coordination intact. EEG pending. MRI brain with contrast requested.',
      assessment:  'New-onset focal epilepsy with secondary generalisation (G40.209). Structural aetiology must be excluded — MRI brain urgent. Possible cortical dysplasia or low-grade glioma.',
      plan:        '1. MRI brain with FLAIR/contrast sequences — urgent same week.\n2. EEG standard 20-minute recording.\n3. Initiate Levetiracetam 500 mg BID; uptitrate to 1000 mg BID in 2 weeks.\n4. ILAE seizure diary — patient education provided.\n5. Driving restriction counselled per national road safety law (6-month seizure-free period required).\n6. Follow-up in 4 weeks with imaging results or sooner if further seizures.',
    },
    cdssAlerts: [
      { summary: 'Levetiracetam: Monitor for Neuropsychiatric Side Effects', detail: 'Irritability and depression reported in 10–15% of patients. Counsel patient; consider B6 supplementation (pyridoxine 100 mg OD).', indicator: 'warning' },
      { summary: 'Driving Restriction: Seizure-Free Period Required', detail: 'ILAE 2022: physicians have a duty to counsel patients. Document discussion in medical record.', indicator: 'critical' },
      { summary: 'Urgent Imaging: Structural Cause Must Be Excluded', detail: 'New focal-onset seizures in adults > 50 y/o require contrast MRI within 72 h per ACN guidelines.', indicator: 'critical' },
    ],
  },

  // ── Oncology ────────────────────────────────────────────────────────────────
  {
    disciplineSlug: 'oncology',
    voice: { copilotVoiceId: 'AZnzlk1XvdvUeBnXmlld', doctorVoiceId: '21m00Tcm4TlvDq8ikWAM', tone: 'warm' },
    doctorTitle:    'Dr.',
    doctorFirst:    'Bruno',
    doctorLast:     'Nascimento',
    specialty:      'Oncology',
    patients: [
      { firstName: 'Helena',   lastName: 'Correia',  age: 54, sex: 'F', chiefComplaint: 'Breast cancer — cycle 4 of 6 adjuvant chemo', status: 'in-progress', vitals: { bp: '118/74', hr: 80, weight: '64 kg' } },
      { firstName: 'Antônio',  lastName: 'Macedo',   age: 67, sex: 'M', chiefComplaint: 'CRC Stage III — post-FOLFOX cycle 8',          status: 'arrived',     vitals: { bp: '126/78', hr: 76 } },
      { firstName: 'Vanessa',  lastName: 'Pinto',    age: 42, sex: 'F', chiefComplaint: 'Cervical cancer — radiation planning',          status: 'scheduled' },
      { firstName: 'Francisco',lastName: 'Ramos',    age: 71, sex: 'M', chiefComplaint: 'Lung adenocarcinoma — EGFR mutation — 3-month review', status: 'scheduled' },
      { firstName: 'Renata',   lastName: 'Vieira',   age: 48, sex: 'F', chiefComplaint: 'Pancreatic cancer — CA 19-9 surveillance — gemcitabine cycle 3', status: 'scheduled', vitals: { bp: '110/68', hr: 82 } },
    ],
    soapNote: {
      patientName: 'Helena Correia',
      subjective:  '54-year-old female, HR+ HER2- invasive ductal carcinoma left breast (T2N1M0, Stage IIB). Cycle 4/6 AC-T adjuvant chemotherapy. Reports grade 2 fatigue and nausea; managed with ondansetron. No fever. Last cycle: Doxorubicin 60 mg/m² + Cyclophosphamide 600 mg/m². BSA 1.64 m².',
      objective:   'ECOG PS 1. BP 118/74 mmHg, HR 80, T 36.8°C. Mild mucositis grade 1 oral cavity. No palpable lymphadenopathy. CBC today: ANC 1.8 × 10⁹/L, Hb 10.2 g/dL, Plt 198 × 10⁹/L. LVEF (echo 4 weeks ago): 58%.',
      assessment:  'HR+ HER2- invasive ductal carcinoma left breast (C50.912). Tolerating AC chemotherapy — cycle 4/6 on schedule. Grade 1 mucositis. Mild anaemia secondary to chemotherapy.',
      plan:        '1. Cycle 4 AC to proceed — ANC > 1.5, eligible per protocol.\n2. Continue ondansetron 8 mg BID for nausea; add dexamethasone 4 mg on day 1 if persistent.\n3. Prescribe chlorhexidine mouthwash for mucositis; advance to folinic acid rinse if grade ≥ 2.\n4. Iron supplementation if Hb < 10 g/dL at next visit; G-CSF not indicated at ANC 1.8.\n5. LVEF reassessment before cycle 6 (Doxorubicin total dose 240 mg/m²).\n6. Genetic counselling referral — BRCA1/2 testing initiated.',
    },
    cdssAlerts: [
      { summary: 'Cardiotoxicity Alert: Cumulative Doxorubicin Dose 240 mg/m²', detail: 'AC cycle 4/6: cumulative dose approaching 240 mg/m². LVEF reassessment mandatory before cycle 6 per ESMO 2023.', indicator: 'warning' },
      { summary: 'Antiemetic Protocol: Add Dexamethasone for Highly Emetogenic Regimen', detail: 'AC is highly emetogenic (HEC). ASCO guidelines recommend 3-drug regimen: 5-HT3 antagonist + NK1-RA + dexamethasone.', indicator: 'info' },
      { summary: 'G-CSF Threshold: Primary Prophylaxis Not Required', detail: 'AC regimen has 15–20% FN risk. Primary G-CSF prophylaxis indicated if risk > 20% or patient > 65 y/o. Monitor ANC.', indicator: 'info' },
    ],
  },

  // ── Dermatology ─────────────────────────────────────────────────────────────
  {
    disciplineSlug: 'dermatology',
    voice: { copilotVoiceId: 'MF3mGyEYCl7XYWbV9V6O', doctorVoiceId: 'onwK4e9ZLuTAKqWW03F9', tone: 'warm' },
    doctorTitle:    'Dr.',
    doctorFirst:    'Letícia',
    doctorLast:     'Xavier',
    specialty:      'Dermatology',
    patients: [
      { firstName: 'Rafael',  lastName: 'Cavalcanti', age: 34, sex: 'M', chiefComplaint: 'Suspicious pigmented lesion right shoulder',  status: 'in-progress' },
      { firstName: 'Juliana', lastName: 'Freitas',    age: 28, sex: 'F', chiefComplaint: 'Severe acne vulgaris — isotretinoin review',   status: 'arrived' },
      { firstName: 'Nelson',  lastName: 'Batista',    age: 62, sex: 'M', chiefComplaint: 'Chronic plaque psoriasis — biologics refill',  status: 'scheduled' },
      { firstName: 'Amanda',  lastName: 'Campos',     age: 19, sex: 'F', chiefComplaint: 'Atopic dermatitis flare — face and neck',       status: 'scheduled' },
    ],
    soapNote: {
      patientName: 'Rafael Cavalcanti',
      subjective:  '34-year-old male presenting with 6-month history of enlarging pigmented lesion on right shoulder. Noticed asymmetry and colour change. No bleeding or ulceration. Fair skin, Fitzpatrick II. History of sunburns in childhood. No family history of melanoma.',
      objective:   'Dermoscopy: 1.4 cm asymmetric lesion with irregular border, multicomponent colour pattern (brown, black, grey), atypical network, regression zones. ABCDE score: Asymmetry 1, Border 2, Colour 2, Diameter 14 mm, Evolving. Total dermoscopy score suggests high-risk melanocytic lesion.',
      assessment:  'High-risk melanocytic lesion right shoulder (D22.61) — dermoscopic features highly suspicious for melanoma. Urgent excision biopsy required.',
      plan:        '1. Urgent excisional biopsy with 2 mm margins — today or earliest available slot.\n2. Histopathology with Breslow thickness, Clark level, mitotic index, and margin status.\n3. Patient counselled on potential staging and sentinel lymph node biopsy if Breslow ≥ 1 mm.\n4. If melanoma confirmed, refer to oncology/dermato-oncology MDT.\n5. Full-body dermoscopy to document and photograph all other lesions.\n6. Sun protection counselling: SPF 50+, avoid peak UV exposure.',
    },
    cdssAlerts: [
      { summary: 'Urgent: Dermoscopic Features Consistent with Melanoma', detail: 'Multicomponent pattern + regression structures = sensitivity 97% for melanoma (Argenziano 2003). Excision within 48 h per BAD guidelines.', indicator: 'critical' },
      { summary: 'Isotretinoin Monitoring: Lipids + LFTs at Cycle 4', detail: 'For patient Juliana Freitas: monthly lipid panel and LFTs required per isotretinoin REMS protocol.', indicator: 'warning' },
    ],
  },

  // ── Psychiatry ──────────────────────────────────────────────────────────────
  {
    disciplineSlug: 'psychiatry',
    voice: { copilotVoiceId: 'EXAVITQu4vr4xnSDxMaL', doctorVoiceId: 'AZnzlk1XvdvUeBnXmlld', tone: 'calm' },
    doctorTitle:    'Dr.',
    doctorFirst:    'Gabriela',
    doctorLast:     'Moura',
    specialty:      'Psychiatry',
    patients: [
      { firstName: 'Thiago',   lastName: 'Andrade',  age: 31, sex: 'M', chiefComplaint: 'MDD — escitalopram dose optimisation',       status: 'in-progress' },
      { firstName: 'Simone',   lastName: 'Duarte',   age: 44, sex: 'F', chiefComplaint: 'Bipolar I — lithium trough level review',    status: 'arrived',     vitals: { bp: '116/72', hr: 68 } },
      { firstName: 'Ricardo',  lastName: 'Melo',     age: 26, sex: 'M', chiefComplaint: 'GAD + panic disorder — CBT adjunct',        status: 'scheduled' },
      { firstName: 'Cristina', lastName: 'Torres',   age: 57, sex: 'F', chiefComplaint: 'Late-life depression — ECT assessment',     status: 'scheduled' },
    ],
    soapNote: {
      patientName: 'Thiago Andrade',
      subjective:  '31-year-old male with 6-month history of MDD. Currently on escitalopram 10 mg OD for 6 weeks. Reports partial response — mood improved from 2/10 to 5/10 (PHQ-9 baseline 22, current 14). Sleep remains disrupted; energy low. Denies suicidal ideation. Working from home; social isolation moderate.',
      objective:   'MSE: alert, cooperative, affect constricted but reactive, no psychomotor retardation. Speech: normal rate and volume. Thought form: linear. Thought content: no SI/HI. Insight: good. PHQ-9: 14 (moderate depression). GAD-7: 8 (mild anxiety). BMI 24.',
      assessment:  'Major Depressive Disorder, moderate severity, single episode (F32.1). Partial response to escitalopram 10 mg. Residual neurovegetative symptoms.',
      plan:        '1. Uptitrate escitalopram to 20 mg OD — reassess in 4 weeks.\n2. Add mirtazapine 15 mg nocte for sleep and appetite augmentation.\n3. CBT referral — 12-session structured programme.\n4. Safety plan reviewed and documented; emergency contacts confirmed.\n5. Lifestyle: aerobic exercise 30 min x 5/week (RCT evidence Level A for MDD).\n6. Return in 4 weeks; PHQ-9 to be repeated.',
    },
    cdssAlerts: [
      { summary: 'Serotonin Syndrome Risk: Escitalopram + Mirtazapine Combination', detail: 'Low risk with standard doses, but monitor for fever, clonus, tremor. No tramadol or triptans to be co-prescribed.', indicator: 'warning' },
      { summary: 'PHQ-9 ≥ 10: Formal Safety Assessment Required', detail: 'Document suicidality screening using Columbia Protocol (C-SSRS). Safety plan must be on file per JCI standard.', indicator: 'info' },
      { summary: 'Treatment Response: 6-Week Rule — Consider Dose Escalation', detail: 'Partial response at 6 weeks with PHQ-9 > 10 supports SSRI dose optimisation before switching (APA 2022).', indicator: 'info' },
    ],
  },

  // ── OB-GYN ──────────────────────────────────────────────────────────────────
  {
    disciplineSlug: 'obstetrics-gynecology',
    voice: { copilotVoiceId: 'AZnzlk1XvdvUeBnXmlld', doctorVoiceId: 'EXAVITQu4vr4xnSDxMaL', tone: 'warm' },
    doctorTitle:    'Dr.',
    doctorFirst:    'Débora',
    doctorLast:     'Fernandes',
    specialty:      'Obstetrics & Gynecology',
    patients: [
      { firstName: 'Priscila', lastName: 'Guimarães', age: 29, sex: 'F', chiefComplaint: 'Antenatal visit — 32 weeks gestation',       status: 'in-progress', vitals: { bp: '128/82', hr: 86, weight: '73 kg' } },
      { firstName: 'Caroline', lastName: 'Vasconcelos',age: 35, sex: 'F', chiefComplaint: 'PCOS — fertility counselling',             status: 'arrived' },
      { firstName: 'Renata',   lastName: 'Medeiros',  age: 48, sex: 'F', chiefComplaint: 'Perimenopausal symptoms — HRT initiation',   status: 'scheduled' },
      { firstName: 'Luciana',  lastName: 'Cardoso',   age: 24, sex: 'F', chiefComplaint: 'Abnormal uterine bleeding — 3-month history', status: 'scheduled' },
    ],
    soapNote: {
      patientName: 'Priscila Guimarães',
      subjective:  '29-year-old G2P1 at 32+2 weeks gestation presenting for routine antenatal visit. Reports mild lower back pain and pelvic pressure; no contractions, no bleeding, no ROM. Foetal movements normal. BP at home 128–132/80–84 mmHg over past week.',
      objective:   'BP 128/82 mmHg, HR 86, weight 73 kg (BMI pre-pregnancy 24). Fundal height 32 cm. Foetal heart rate 148 bpm via Doppler. No proteinuria on dipstick. Mild ankle oedema. USS Doppler pending.',
      assessment:  'Singleton pregnancy 32+2 weeks (Z34.32). Gestational hypertension (O13.2) — no proteinuria; monitoring required. Lower back pain — musculoskeletal.',
      plan:        '1. 24-hour urine protein to exclude pre-eclampsia.\n2. Repeat BP in 1 week; if ≥ 140/90 mmHg, consider labetalol 100 mg BID.\n3. Uterine artery Doppler + growth biometry USS at 34 weeks.\n4. Advise bed rest in left lateral position 1–2 h daily.\n5. FBC, LFTs, creatinine, uric acid — baseline pre-eclampsia bloods.\n6. MAGPIE trial criteria reviewed — low-dose aspirin already commenced at 12 weeks.',
    },
    cdssAlerts: [
      { summary: 'Pre-Eclampsia Surveillance: BP Trend + Proteinuria', detail: 'ISSHP 2021: gestational hypertension with BP ≥ 140/90 mmHg on 2 occasions 4 h apart = gestational hypertension. Proteinuria converts to pre-eclampsia diagnosis.', indicator: 'warning' },
      { summary: 'Foetal Growth: USS Biometry Required at 32 Weeks', detail: 'Gestational hypertension is associated with FGR. Doppler surveillance every 2 weeks from 32 weeks per RCOG guidelines.', indicator: 'info' },
    ],
  },

  // ── Emergency Medicine ──────────────────────────────────────────────────────
  {
    disciplineSlug: 'emergency-medicine',
    voice: { copilotVoiceId: 'onwK4e9ZLuTAKqWW03F9', doctorVoiceId: 'VR6AewLTigWG4xSOukaG', tone: 'urgent' },
    doctorTitle:    'Dr.',
    doctorFirst:    'Rodrigo',
    doctorLast:     'Tavares',
    specialty:      'Emergency Medicine',
    patients: [
      { firstName: 'Sebastião', lastName: 'Pires',   age: 74, sex: 'M', chiefComplaint: 'Acute stroke — FAST positive, onset 90 min',  status: 'in-progress', vitals: { bp: '186/104', hr: 88, spo2: 95 } },
      { firstName: 'Marília',   lastName: 'Santos',  age: 22, sex: 'F', chiefComplaint: 'Anaphylaxis — bee sting, dyspnoea',            status: 'in-progress', vitals: { bp: '82/50', hr: 132, spo2: 91 } },
      { firstName: 'Gilberto',  lastName: 'Araújo',  age: 58, sex: 'M', chiefComplaint: 'Polytrauma — MVA, GCS 13',                    status: 'arrived',     vitals: { bp: '100/60', hr: 118 } },
      { firstName: 'Natalia',   lastName: 'Campos',  age: 37, sex: 'F', chiefComplaint: 'Acute abdomen — right iliac fossa pain',      status: 'scheduled' },
    ],
    soapNote: {
      patientName: 'Marília Santos',
      subjective:  '22-year-old female brought by ambulance with severe dyspnoea, urticaria, and angioedema following bee sting 20 minutes ago. Known allergy to bee venom — carries EpiPen but did not self-administer. No prior anaphylaxis requiring hospitalisation.',
      objective:   'BP 82/50 mmHg, HR 132 bpm, SpO2 91% RA, RR 28. Generalised urticaria. Lip and tongue angioedema. Bilateral wheeze, reduced air entry. GCS 15. Stridor absent.',
      assessment:  'Anaphylaxis — bee sting (T63.441A). Haemodynamic compromise with bronchospasm. Ring 1 (ASCIA grading). Immediate life threat.',
      plan:        '1. Adrenaline 0.5 mg IM lateral thigh — STAT (administer now).\n2. O2 15 L/min via non-rebreather mask.\n3. IV access x2, 1L 0.9% NaCl bolus.\n4. Chlorpheniramine 10 mg IV + hydrocortisone 200 mg IV.\n5. Salbutamol 5 mg via nebuliser for bronchospasm.\n6. Observation minimum 6 h for biphasic reaction.\n7. Discharge: new EpiPen prescription, allergen immunotherapy referral, MedicAlert bracelet advice.',
    },
    cdssAlerts: [
      { summary: 'CRITICAL: Anaphylaxis — Adrenaline IM is First-Line Treatment', detail: 'WHO/ASCIA: adrenaline 0.5 mg IM (0.01 mg/kg) into lateral thigh is the only first-line treatment. Antihistamines are NOT first line.', indicator: 'critical' },
      { summary: 'Biphasic Reaction Risk: Mandatory 6-Hour Observation', detail: 'Biphasic anaphylaxis occurs in 5–20% of cases, typically 1–8 h after initial reaction. RCEM 2022: all anaphylaxis requires ≥ 6 h observation.', indicator: 'warning' },
      { summary: 'Stroke Alert: tPA Window — 90 min from Onset', detail: 'Patient Sebastião Pires: NIHSS score required. IV alteplase window is 4.5 h from onset. CT head before any thrombolysis.', indicator: 'critical' },
    ],
  },

  // ── Physical Therapy ────────────────────────────────────────────────────────
  {
    disciplineSlug: 'physical-therapy',
    voice: { copilotVoiceId: 'MF3mGyEYCl7XYWbV9V6O', doctorVoiceId: '21m00Tcm4TlvDq8ikWAM', tone: 'warm' },
    doctorTitle:    'Dr.',
    doctorFirst:    'Marcela',
    doctorLast:     'Santana',
    specialty:      'Physical Therapy',
    patients: [
      { firstName: 'Denis',    lastName: 'Ferreira',  age: 48, sex: 'M', chiefComplaint: 'Post-TKR rehab — week 6',                   status: 'in-progress', vitals: { bp: '124/80', hr: 70 } },
      { firstName: 'Lúcia',    lastName: 'Brandão',   age: 62, sex: 'F', chiefComplaint: 'Cervical radiculopathy C5-C6 — decompression', status: 'arrived' },
      { firstName: 'William',  lastName: 'Nascimento', age: 35, sex: 'M', chiefComplaint: 'Sports rehab — hamstring grade 2 tear',    status: 'scheduled' },
      { firstName: 'Teresa',   lastName: 'Oliveira',  age: 71, sex: 'F', chiefComplaint: 'Balance training — fall prevention',        status: 'scheduled' },
    ],
    soapNote: {
      patientName: 'Denis Ferreira',
      subjective:  '48-year-old male, 6 weeks post right total knee replacement. Reports pain 4/10 with activity, 2/10 at rest. Swelling improved. Compliant with home exercise programme. Goals: return to recreational cycling and stair negotiation.',
      objective:   'Right knee ROM: flexion 105° (target 120°+), extension –5° (target 0°). Quadriceps strength: 3+/5 right (vs 5/5 left). Gait: antalgic with mild Trendelenburg. No erythema or effusion. Functional: ascending stairs independently, descending with rail.',
      assessment:  'Post-right TKR, week 6 (Z96.651). Active rehabilitation phase — ROM and strength progressing. Functional goals partially met.',
      plan:        '1. Continue quad strengthening: terminal knee extensions, leg press 60–90° arc.\n2. Introduce stationary bike 15 min/day; upgrade to outdoor cycling at week 10 if ROM > 110°.\n3. Hydrotherapy 2x/week — aquatic resistance for low-impact strength work.\n4. Add step-down eccentric training for stair descent.\n5. Target ROM 120° by week 8; escalate to manual mobilisation if plateau.\n6. Review at week 8 with functional outcomes assessment (KOOS).',
    },
    cdssAlerts: [
      { summary: 'DVT Monitoring: Post-TKR Swelling Assessment', detail: 'Week 6 post-TKR: persistent unilateral swelling should prompt Wells score + D-dimer if Wells ≥ 2. Anticoagulation course should be confirmed (typically 35 days).', indicator: 'warning' },
      { summary: 'ROM Target: < 90° at Week 6 — Consider Manipulation Under Anaesthesia', detail: 'AAOS 2023: flexion < 90° at week 6 post-TKR may indicate early arthrofibrosis. MUA is most effective before week 12.', indicator: 'info' },
    ],
  },

  // ── General Practice ────────────────────────────────────────────────────────
  {
    disciplineSlug: 'general-practice',
    voice: { copilotVoiceId: 'onwK4e9ZLuTAKqWW03F9', doctorVoiceId: 'pNInz6obpgDQGcFmaJgB', tone: 'warm' },
    doctorTitle:    'Dr.',
    doctorFirst:    'Sandra',
    doctorLast:     'Nogueira',
    specialty:      'General Practice',
    patients: [
      { firstName: 'Josefa',   lastName: 'Almeida',   age: 55, sex: 'F', chiefComplaint: 'Annual wellness — cervical screening due',   status: 'in-progress', vitals: { bp: '136/86', hr: 74, weight: '82 kg' } },
      { firstName: 'Márcio',   lastName: 'Rodrigues', age: 43, sex: 'M', chiefComplaint: 'T2DM follow-up — HbA1c 9.1%',               status: 'arrived',     vitals: { bp: '142/90', hr: 80 } },
      { firstName: 'Ana',      lastName: 'Souza',     age: 32, sex: 'F', chiefComplaint: 'Recurrent UTIs — prophylaxis discussion',    status: 'scheduled' },
      { firstName: 'Geraldo',  lastName: 'Braga',     age: 68, sex: 'M', chiefComplaint: 'COPD — exacerbation prevention review',      status: 'scheduled',   vitals: { spo2: 94 } },
      { firstName: 'Sabrina',  lastName: 'Pacheco',   age: 26, sex: 'F', chiefComplaint: 'Depression screening — PHQ-9 positive',     status: 'scheduled' },
    ],
    soapNote: {
      patientName: 'Márcio Rodrigues',
      subjective:  '43-year-old male with T2DM x 5 years presenting for quarterly review. HbA1c returned at 9.1% (was 8.4% 3 months ago). Reports dietary non-adherence — "very busy at work." Currently on Metformin 1000 mg BID and Glibenclamide 5 mg OD. Denies hypoglycaemic episodes. Non-smoker. BMI 31.',
      objective:   'BP 142/90 mmHg, HR 80, weight 86 kg (+2 kg). BMI 31. Fundoscopy: no diabetic retinopathy. Foot exam: monofilament sensation intact bilaterally, no foot lesions. Peripheral pulses present. Last microalbuminuria (6 months ago): 32 mg/g — borderline.',
      assessment:  'T2DM, suboptimally controlled (E11.65). HbA1c worsening — lifestyle + medication adjustment required. Hypertension (I10). Overweight (E66.01). Repeat microalbuminuria recommended.',
      plan:        '1. Add Empagliflozin 10 mg OD — SGLT2i for glycaemic control and cardiovascular/renal protection.\n2. Refer to diabetes educator + dietitian for medical nutrition therapy.\n3. HbA1c target < 7.5% in 3 months.\n4. Uptitrate Lisinopril to 5 mg OD for BP and nephroprotection.\n5. Repeat microalbuminuria and eGFR in 3 months.\n6. Statin therapy review: calculate 10-year CVD risk (SCORE2).',
    },
    cdssAlerts: [
      { summary: 'SGLT2 Inhibitor: Renal Threshold — Confirm eGFR ≥ 45 Before Starting', detail: 'Empagliflozin is not recommended if eGFR < 45 mL/min. Verify current eGFR result before prescribing.', indicator: 'warning' },
      { summary: 'Microalbuminuria 32 mg/g: ACEi Nephroprotection + Repeat Test', detail: 'Borderline microalbuminuria (30–300 mg/g) with T2DM confirms nephropathy stage A2. KDIGO 2022: ACEi first-line; retest in 3 months.', indicator: 'info' },
      { summary: 'Glibenclamide: Hypoglycaemia Risk in Combination with SGLT2i', detail: 'Consider reducing Glibenclamide dose when adding Empagliflozin. Risk of hypoglycaemia increases with combination therapy.', indicator: 'warning' },
    ],
  },

];

// ─── Lookup helper ────────────────────────────────────────────────────────────

export function getPersonaForDiscipline(disciplineSlug: string): DemoPersona {
  const found = personas.find((p) => p.disciplineSlug === disciplineSlug);
  // Fallback to general practice if no exact match
  return found ?? personas.find((p) => p.disciplineSlug === 'general-practice')!;
}

export function getAllPersonas(): DemoPersona[] {
  return personas;
}

export default personas;
