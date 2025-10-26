/**
 * Medical Terminology Recognition
 *
 * Identifies and highlights medical terms in transcribed text
 * Categories: Diagnoses, Medications, Procedures, Anatomy, Symptoms
 */

// Common medical term patterns
const MEDICAL_TERMS = {
  // Vital signs and measurements
  vitals: [
    'blood pressure', 'bp', 'heart rate', 'hr', 'pulse', 'temperature', 'temp',
    'respiratory rate', 'rr', 'oxygen saturation', 'o2 sat', 'spo2', 'bpm',
    'mmhg', 'celsius', 'fahrenheit', 'systolic', 'diastolic',
  ],

  // Common symptoms
  symptoms: [
    'pain', 'fever', 'cough', 'nausea', 'vomiting', 'diarrhea', 'headache',
    'dizziness', 'fatigue', 'shortness of breath', 'dyspnea', 'chest pain',
    'abdominal pain', 'back pain', 'joint pain', 'swelling', 'rash',
    'bleeding', 'numbness', 'tingling', 'weakness', 'seizure', 'syncope',
  ],

  // Common diagnoses
  diagnoses: [
    'hypertension', 'diabetes', 'copd', 'asthma', 'pneumonia', 'bronchitis',
    'uti', 'infection', 'fracture', 'arthritis', 'depression', 'anxiety',
    'covid', 'influenza', 'flu', 'stroke', 'heart attack', 'mi', 'chf',
    'heart failure', 'cancer', 'tumor', 'anemia', 'hypothyroidism',
  ],

  // Common medications
  medications: [
    'aspirin', 'tylenol', 'acetaminophen', 'ibuprofen', 'advil', 'aleve',
    'naproxen', 'amoxicillin', 'azithromycin', 'ciprofloxacin', 'metformin',
    'insulin', 'lisinopril', 'atenolol', 'metoprolol', 'amlodipine',
    'simvastatin', 'atorvastatin', 'omeprazole', 'pantoprazole', 'prednisone',
    'albuterol', 'fluticasone', 'morphine', 'oxycodone', 'tramadol',
  ],

  // Procedures
  procedures: [
    'x-ray', 'ct scan', 'mri', 'ultrasound', 'ecg', 'ekg', 'electrocardiogram',
    'blood test', 'urine test', 'biopsy', 'endoscopy', 'colonoscopy',
    'surgery', 'intubation', 'catheter', 'iv', 'injection', 'vaccination',
  ],

  // Anatomy
  anatomy: [
    'heart', 'lung', 'liver', 'kidney', 'brain', 'stomach', 'intestine',
    'pancreas', 'spleen', 'bladder', 'spine', 'joint', 'bone', 'muscle',
    'tendon', 'ligament', 'nerve', 'artery', 'vein', 'lymph node',
  ],
};

// Flatten all terms for quick lookup
const ALL_MEDICAL_TERMS = Object.values(MEDICAL_TERMS).flat();

// Create regex pattern for matching (case-insensitive, word boundaries)
const MEDICAL_TERM_PATTERN = new RegExp(
  `\\b(${ALL_MEDICAL_TERMS.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'gi'
);

export interface MedicalTermMatch {
  term: string;
  category: keyof typeof MEDICAL_TERMS;
  startIndex: number;
  endIndex: number;
}

/**
 * Identify medical terms in text
 */
export function identifyMedicalTerms(text: string): MedicalTermMatch[] {
  const matches: MedicalTermMatch[] = [];
  const lowerText = text.toLowerCase();

  // Check each category
  for (const [category, terms] of Object.entries(MEDICAL_TERMS)) {
    for (const term of terms) {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;

      while ((match = regex.exec(lowerText)) !== null) {
        matches.push({
          term: text.substring(match.index, match.index + term.length),
          category: category as keyof typeof MEDICAL_TERMS,
          startIndex: match.index,
          endIndex: match.index + term.length,
        });
      }
    }
  }

  // Sort by start index
  return matches.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Get category color for highlighting
 */
export function getMedicalTermColor(category: keyof typeof MEDICAL_TERMS): string {
  const colors: Record<keyof typeof MEDICAL_TERMS, string> = {
    vitals: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    symptoms: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700',
    diagnoses: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700',
    medications: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
    procedures: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    anatomy: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 border-pink-300 dark:border-pink-700',
  };

  return colors[category];
}

/**
 * Get category display name
 */
export function getMedicalTermCategoryName(category: keyof typeof MEDICAL_TERMS): string {
  const names: Record<keyof typeof MEDICAL_TERMS, string> = {
    vitals: 'Vital Sign',
    symptoms: 'Symptom',
    diagnoses: 'Diagnosis',
    medications: 'Medication',
    procedures: 'Procedure',
    anatomy: 'Anatomy',
  };

  return names[category];
}

/**
 * Highlight medical terms in text
 * Returns text with HTML spans for highlighting
 */
export function highlightMedicalTerms(text: string): string {
  const matches = identifyMedicalTerms(text);

  if (matches.length === 0) {
    return text;
  }

  let result = '';
  let lastIndex = 0;

  for (const match of matches) {
    // Add text before match
    result += text.substring(lastIndex, match.startIndex);

    // Add highlighted match
    const color = getMedicalTermColor(match.category);
    const categoryName = getMedicalTermCategoryName(match.category);
    result += `<span class="inline-flex items-center gap-1 px-1 rounded border ${color} font-medium text-xs" title="${categoryName}: ${match.term}">${match.term}</span>`;

    lastIndex = match.endIndex;
  }

  // Add remaining text
  result += text.substring(lastIndex);

  return result;
}

/**
 * Extract medical entities from text for structured data
 */
export function extractMedicalEntities(text: string): {
  vitals: string[];
  symptoms: string[];
  diagnoses: string[];
  medications: string[];
  procedures: string[];
  anatomy: string[];
} {
  const matches = identifyMedicalTerms(text);

  const entities: Record<keyof typeof MEDICAL_TERMS, string[]> = {
    vitals: [],
    symptoms: [],
    diagnoses: [],
    medications: [],
    procedures: [],
    anatomy: [],
  };

  for (const match of matches) {
    if (!entities[match.category].includes(match.term.toLowerCase())) {
      entities[match.category].push(match.term.toLowerCase());
    }
  }

  return entities;
}
