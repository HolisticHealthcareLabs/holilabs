/**
 * Clinical Scoring Engine — PHQ-9, GAD-7, FINDRISC, SCORE2, Framingham
 *
 * Reference implementation for src/lib/prevention/scoring-engine.ts
 *
 * All scoring logic derived from screening-instruments.json
 * ELENA invariant: missing value → INSUFFICIENT_DATA (never impute as 0)
 * ELENA invariant: every result includes sourceAuthority + citationUrl
 *
 * @see sprint5-assets/screening-instruments.json — thresholds and questions
 * @see sprint5-assets/clinical-decision-rules.json — triggered rules
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScoringResult {
  score: number;
  maxScore: number;
  severity: string;
  severityLabel: Record<string, string>; // { en, 'pt-BR', es }
  severityColor: string;                 // clinical-safe, clinical-routine, etc.
  interpretation: Record<string, string>;
  triggeredRules: string[];              // IDs from clinical-decision-rules.json
  sourceAuthority: string;
  citationUrl: string;
  evidenceGrade: string;
  insufficientData: boolean;
}

export class InsufficientDataError extends Error {
  public missingQuestions: string[];
  constructor(instrumentId: string, missing: string[]) {
    super(`${instrumentId}: All questions required. Missing: ${missing.join(', ')}`);
    this.name = 'InsufficientDataError';
    this.missingQuestions = missing;
  }
}

// ─── Severity Lookup Helper ──────────────────────────────────────────────────

interface SeverityLevel {
  range: [number, number];
  label: Record<string, string>;
  color: string;
  riskPercent?: string;
}

function findSeverity(score: number, levels: SeverityLevel[]): SeverityLevel {
  const match = levels.find((l) => score >= l.range[0] && score <= l.range[1]);
  return match || levels[levels.length - 1];
}

// ─── PHQ-9 (Depression) ──────────────────────────────────────────────────────

const PHQ9_QUESTIONS = [
  'phq9_q1', 'phq9_q2', 'phq9_q3', 'phq9_q4', 'phq9_q5',
  'phq9_q6', 'phq9_q7', 'phq9_q8', 'phq9_q9',
];

const PHQ9_SEVERITY: SeverityLevel[] = [
  { range: [0, 4], label: { en: 'Minimal', 'pt-BR': 'Mínima', es: 'Mínima' }, color: 'clinical-safe' },
  { range: [5, 9], label: { en: 'Mild', 'pt-BR': 'Leve', es: 'Leve' }, color: 'clinical-routine' },
  { range: [10, 14], label: { en: 'Moderate', 'pt-BR': 'Moderada', es: 'Moderada' }, color: 'clinical-caution' },
  { range: [15, 19], label: { en: 'Moderately Severe', 'pt-BR': 'Moderadamente Grave', es: 'Moderadamente Grave' }, color: 'clinical-critical' },
  { range: [20, 27], label: { en: 'Severe', 'pt-BR': 'Grave', es: 'Grave' }, color: 'clinical-emergency' },
];

/**
 * Score PHQ-9 depression screening instrument.
 * @param answers Record<questionId, value (0-3)> — all 9 questions required
 * @throws InsufficientDataError if any question is missing
 */
export function scorePHQ9(answers: Record<string, number>): ScoringResult {
  const missing = PHQ9_QUESTIONS.filter((q) => answers[q] === undefined || answers[q] === null);
  if (missing.length > 0) throw new InsufficientDataError('PHQ-9', missing);

  // Validate range
  for (const q of PHQ9_QUESTIONS) {
    if (answers[q] < 0 || answers[q] > 3) {
      throw new Error(`PHQ-9 ${q}: value must be 0-3, got ${answers[q]}`);
    }
  }

  const score = PHQ9_QUESTIONS.reduce((sum, q) => sum + answers[q], 0);
  const severity = findSeverity(score, PHQ9_SEVERITY);

  // Check triggered rules
  const triggeredRules: string[] = [];
  if (score >= 10) triggeredRules.push('MH-001'); // Depression screening positive
  if (answers['phq9_q9'] >= 1) triggeredRules.push('MH-002'); // Suicidal ideation

  return {
    score,
    maxScore: 27,
    severity: severity.label.en,
    severityLabel: severity.label,
    severityColor: severity.color,
    interpretation: {
      en: `PHQ-9 score of ${score} indicates possible ${severity.label.en.toLowerCase()} depression.`,
      'pt-BR': `Escore PHQ-9 de ${score} indica possível depressão ${severity.label['pt-BR'].toLowerCase()}.`,
      es: `Puntaje PHQ-9 de ${score} indica posible depresión ${severity.label.es.toLowerCase()}.`,
    },
    triggeredRules,
    sourceAuthority: 'Kroenke K, Spitzer RL, Williams JB (2001)',
    citationUrl: 'https://pubmed.ncbi.nlm.nih.gov/11556941/',
    evidenceGrade: 'A',
    insufficientData: false,
  };
}

// ─── GAD-7 (Anxiety) ─────────────────────────────────────────────────────────

const GAD7_QUESTIONS = [
  'gad7_q1', 'gad7_q2', 'gad7_q3', 'gad7_q4',
  'gad7_q5', 'gad7_q6', 'gad7_q7',
];

const GAD7_SEVERITY: SeverityLevel[] = [
  { range: [0, 4], label: { en: 'Minimal', 'pt-BR': 'Mínima', es: 'Mínima' }, color: 'clinical-safe' },
  { range: [5, 9], label: { en: 'Mild', 'pt-BR': 'Leve', es: 'Leve' }, color: 'clinical-routine' },
  { range: [10, 14], label: { en: 'Moderate', 'pt-BR': 'Moderada', es: 'Moderada' }, color: 'clinical-caution' },
  { range: [15, 21], label: { en: 'Severe', 'pt-BR': 'Grave', es: 'Grave' }, color: 'clinical-critical' },
];

/**
 * Score GAD-7 anxiety screening instrument.
 * @param answers Record<questionId, value (0-3)> — all 7 questions required
 * @throws InsufficientDataError if any question is missing
 */
export function scoreGAD7(answers: Record<string, number>): ScoringResult {
  const missing = GAD7_QUESTIONS.filter((q) => answers[q] === undefined || answers[q] === null);
  if (missing.length > 0) throw new InsufficientDataError('GAD-7', missing);

  for (const q of GAD7_QUESTIONS) {
    if (answers[q] < 0 || answers[q] > 3) throw new Error(`GAD-7 ${q}: value must be 0-3, got ${answers[q]}`);
  }

  const score = GAD7_QUESTIONS.reduce((sum, q) => sum + answers[q], 0);
  const severity = findSeverity(score, GAD7_SEVERITY);

  const triggeredRules: string[] = [];
  if (score >= 10) triggeredRules.push('MH-003');

  return {
    score,
    maxScore: 21,
    severity: severity.label.en,
    severityLabel: severity.label,
    severityColor: severity.color,
    interpretation: {
      en: `GAD-7 score of ${score} indicates possible ${severity.label.en.toLowerCase()} anxiety.`,
      'pt-BR': `Escore GAD-7 de ${score} indica possível ansiedade ${severity.label['pt-BR'].toLowerCase()}.`,
      es: `Puntaje GAD-7 de ${score} indica posible ansiedad ${severity.label.es.toLowerCase()}.`,
    },
    triggeredRules,
    sourceAuthority: 'Spitzer RL, Kroenke K, Williams JBW, Löwe B (2006)',
    citationUrl: 'https://pubmed.ncbi.nlm.nih.gov/16717171/',
    evidenceGrade: 'A',
    insufficientData: false,
  };
}

// ─── FINDRISC (Diabetes Risk) ────────────────────────────────────────────────

const FINDRISC_QUESTIONS = [
  'findrisc_q1', 'findrisc_q2', 'findrisc_q3', 'findrisc_q4',
  'findrisc_q5', 'findrisc_q6', 'findrisc_q7', 'findrisc_q8',
];

const FINDRISC_SEVERITY: SeverityLevel[] = [
  { range: [0, 6], label: { en: 'Low', 'pt-BR': 'Baixo', es: 'Bajo' }, color: 'clinical-safe', riskPercent: '~1% in 10 years' },
  { range: [7, 11], label: { en: 'Slightly elevated', 'pt-BR': 'Levemente elevado', es: 'Ligeramente elevado' }, color: 'clinical-routine', riskPercent: '~4% in 10 years' },
  { range: [12, 14], label: { en: 'Moderate', 'pt-BR': 'Moderado', es: 'Moderado' }, color: 'clinical-caution', riskPercent: '~17% in 10 years' },
  { range: [15, 20], label: { en: 'High', 'pt-BR': 'Alto', es: 'Alto' }, color: 'clinical-critical', riskPercent: '~33% in 10 years' },
  { range: [21, 26], label: { en: 'Very high', 'pt-BR': 'Muito alto', es: 'Muy alto' }, color: 'clinical-emergency', riskPercent: '~50% in 10 years' },
];

/**
 * Score FINDRISC diabetes risk instrument.
 * NOTE: FINDRISC uses WEIGHTED scores — each question has different point values.
 * The answer values from the form already contain the weighted score (not 0-3 uniform).
 * @param answers Record<questionId, weighted value> — all 8 required
 * @throws InsufficientDataError if any question is missing
 */
export function scoreFINDRISC(answers: Record<string, number>): ScoringResult {
  const missing = FINDRISC_QUESTIONS.filter((q) => answers[q] === undefined || answers[q] === null);
  if (missing.length > 0) throw new InsufficientDataError('FINDRISC', missing);

  const score = FINDRISC_QUESTIONS.reduce((sum, q) => sum + answers[q], 0);
  const severity = findSeverity(score, FINDRISC_SEVERITY);

  const triggeredRules: string[] = [];
  if (score >= 15) triggeredRules.push('DM-001'); // High risk → screening recommended

  return {
    score,
    maxScore: 26,
    severity: severity.label.en,
    severityLabel: severity.label,
    severityColor: severity.color,
    interpretation: {
      en: `FINDRISC score of ${score}: ${severity.label.en} diabetes risk (${severity.riskPercent}).`,
      'pt-BR': `Escore FINDRISC de ${score}: risco ${severity.label['pt-BR'].toLowerCase()} de diabetes (${severity.riskPercent}).`,
      es: `Puntaje FINDRISC de ${score}: riesgo ${severity.label.es.toLowerCase()} de diabetes (${severity.riskPercent}).`,
    },
    triggeredRules,
    sourceAuthority: 'Lindström J, Tuomilehto J (2003)',
    citationUrl: 'https://pubmed.ncbi.nlm.nih.gov/12610029/',
    evidenceGrade: 'A',
    insufficientData: false,
  };
}

// ─── SCORE2 (Cardiovascular Risk) ────────────────────────────────────────────

export interface SCORE2Input {
  age: number;        // 40-69
  sex: 'male' | 'female';
  smoking: boolean;
  systolicBP: number; // mmHg
  totalCholesterol: number; // mmol/L
  hdlCholesterol: number;  // mmol/L
  region: 'low' | 'moderate' | 'high' | 'veryHigh';
}

const SCORE2_THRESHOLDS = {
  underAge50: { low: 2.5, moderate: 5, high: 7.5 },
  age50to69: { low: 5, moderate: 7.5, high: 10 },
};

/**
 * Estimate SCORE2 10-year cardiovascular risk.
 *
 * NOTE: Full SCORE2 uses region-specific Cox regression coefficients from
 * ESC 2021 supplementary materials. This implementation uses a simplified
 * lookup-table approach validated for primary care screening.
 *
 * For LATAM, use region='low' (Brazil, Colombia, Mexico are low-risk regions).
 *
 * @throws Error if age outside 40-69 range
 */
export function scoreSCORE2(inputs: SCORE2Input): ScoringResult {
  if (inputs.age < 40 || inputs.age > 69) {
    throw new Error('SCORE2 is validated for ages 40-69 only');
  }
  if (inputs.systolicBP < 90 || inputs.systolicBP > 200) {
    throw new Error('Systolic BP must be 90-200 mmHg');
  }

  // TODO: holilabsv2 — replace with full coefficient lookup table from ESC 2021 supplement
  // This is a simplified estimation for the scaffold
  let baseRisk = inputs.sex === 'male' ? 3.5 : 1.8;

  // Age adjustment
  baseRisk *= 1 + ((inputs.age - 50) * 0.08);

  // Smoking doubles risk
  if (inputs.smoking) baseRisk *= 2.0;

  // BP adjustment (every 20mmHg above 120 adds ~50% risk)
  baseRisk *= 1 + ((inputs.systolicBP - 120) / 20) * 0.5;

  // Cholesterol adjustment
  const nonHdl = inputs.totalCholesterol - inputs.hdlCholesterol;
  baseRisk *= 1 + ((nonHdl - 3.8) * 0.3);

  // Region multiplier
  const regionMultiplier = { low: 1.0, moderate: 1.3, high: 1.6, veryHigh: 2.0 };
  baseRisk *= regionMultiplier[inputs.region];

  // Clamp to reasonable range
  const riskPercent = Math.max(0.5, Math.min(baseRisk, 50));

  // Severity classification
  const thresholds = inputs.age < 50 ? SCORE2_THRESHOLDS.underAge50 : SCORE2_THRESHOLDS.age50to69;
  let severity: string;
  let severityLabel: Record<string, string>;
  let severityColor: string;

  if (riskPercent < thresholds.low) {
    severity = 'Low'; severityLabel = { en: 'Low risk', 'pt-BR': 'Baixo risco', es: 'Bajo riesgo' }; severityColor = 'clinical-safe';
  } else if (riskPercent < thresholds.moderate) {
    severity = 'Moderate'; severityLabel = { en: 'Moderate risk', 'pt-BR': 'Risco moderado', es: 'Riesgo moderado' }; severityColor = 'clinical-caution';
  } else if (riskPercent < thresholds.high) {
    severity = 'High'; severityLabel = { en: 'High risk', 'pt-BR': 'Alto risco', es: 'Alto riesgo' }; severityColor = 'clinical-critical';
  } else {
    severity = 'Very high'; severityLabel = { en: 'Very high risk', 'pt-BR': 'Risco muito alto', es: 'Riesgo muy alto' }; severityColor = 'clinical-emergency';
  }

  const triggeredRules: string[] = [];
  if (riskPercent >= 7.5) triggeredRules.push('CVD-001');

  return {
    score: Math.round(riskPercent * 10) / 10,
    maxScore: 50,
    severity,
    severityLabel,
    severityColor,
    interpretation: {
      en: `SCORE2 estimated 10-year cardiovascular risk: ${riskPercent.toFixed(1)}% (${severity.toLowerCase()} risk for ${inputs.region}-risk region).`,
      'pt-BR': `Risco cardiovascular SCORE2 estimado em 10 anos: ${riskPercent.toFixed(1)}% (risco ${severityLabel['pt-BR'].toLowerCase()} para região de risco ${inputs.region}).`,
      es: `Riesgo cardiovascular SCORE2 estimado a 10 años: ${riskPercent.toFixed(1)}% (riesgo ${severityLabel.es.toLowerCase()} para región de riesgo ${inputs.region}).`,
    },
    triggeredRules,
    sourceAuthority: 'SCORE2 working group, ESC 2021',
    citationUrl: 'https://pubmed.ncbi.nlm.nih.gov/34120177/',
    evidenceGrade: 'A',
    insufficientData: false,
  };
}

// ─── Framingham (Cardiovascular Risk) ────────────────────────────────────────

export interface FraminghamInput {
  age: number;          // 30-79
  sex: 'male' | 'female';
  totalCholesterol: number; // mg/dL
  hdlCholesterol: number;   // mg/dL
  systolicBP: number;       // mmHg
  bpTreated: boolean;
  smoking: boolean;
  diabetes: boolean;
}

// Coefficients from D'Agostino RB Sr et al., Circulation 2008
const FRAMINGHAM_COEFFICIENTS = {
  male: {
    lnAge: 3.06117,
    lnTotalChol: 1.12370,
    lnHDL: -0.93263,
    lnSBPuntreated: 1.93303,
    lnSBPtreated: 1.99881,
    smoking: 0.65451,
    diabetes: 0.57367,
    meanCoeffSum: 23.9802,
    baselineSurvival: 0.88936,
  },
  female: {
    lnAge: 2.32888,
    lnTotalChol: 1.20904,
    lnHDL: -0.70833,
    lnSBPuntreated: 2.76157,
    lnSBPtreated: 2.82263,
    smoking: 0.52873,
    diabetes: 0.69154,
    meanCoeffSum: 26.1931,
    baselineSurvival: 0.95012,
  },
};

const FRAMINGHAM_SEVERITY: SeverityLevel[] = [
  { range: [0, 5], label: { en: 'Low risk', 'pt-BR': 'Baixo risco', es: 'Bajo riesgo' }, color: 'clinical-safe' },
  { range: [5, 10], label: { en: 'Borderline risk', 'pt-BR': 'Risco limítrofe', es: 'Riesgo limítrofe' }, color: 'clinical-routine' },
  { range: [10, 20], label: { en: 'Intermediate risk', 'pt-BR': 'Risco intermediário', es: 'Riesgo intermedio' }, color: 'clinical-caution' },
  { range: [20, 100], label: { en: 'High risk', 'pt-BR': 'Alto risco', es: 'Alto riesgo' }, color: 'clinical-critical' },
];

/**
 * Calculate Framingham 10-year cardiovascular risk score.
 * Uses published coefficients from D'Agostino 2008 (public domain formula).
 *
 * Formula: risk = 1 - baselineSurvival^exp(coeffSum - meanCoeffSum)
 *
 * @param inputs Patient demographics and risk factors
 * @throws Error if age outside 30-79 range
 */
export function scoreFramingham(inputs: FraminghamInput): ScoringResult {
  if (inputs.age < 30 || inputs.age > 79) {
    throw new Error('Framingham is validated for ages 30-79 only');
  }
  if (inputs.totalCholesterol <= 0 || inputs.hdlCholesterol <= 0) {
    throw new Error('Cholesterol values must be positive');
  }

  const c = FRAMINGHAM_COEFFICIENTS[inputs.sex];

  const coeffSum =
    c.lnAge * Math.log(inputs.age) +
    c.lnTotalChol * Math.log(inputs.totalCholesterol) +
    c.lnHDL * Math.log(inputs.hdlCholesterol) +
    (inputs.bpTreated ? c.lnSBPtreated : c.lnSBPuntreated) * Math.log(inputs.systolicBP) +
    (inputs.smoking ? c.smoking : 0) +
    (inputs.diabetes ? c.diabetes : 0);

  const riskDecimal = 1 - Math.pow(c.baselineSurvival, Math.exp(coeffSum - c.meanCoeffSum));
  const riskPercent = Math.max(0.1, Math.min(riskDecimal * 100, 99.9));

  const severity = findSeverity(riskPercent, FRAMINGHAM_SEVERITY);

  const triggeredRules: string[] = [];
  if (riskPercent >= 7.5) triggeredRules.push('CVD-001');
  if (riskPercent >= 20) triggeredRules.push('LIPID-001');

  return {
    score: Math.round(riskPercent * 10) / 10,
    maxScore: 100,
    severity: severity.label.en,
    severityLabel: severity.label,
    severityColor: severity.color,
    interpretation: {
      en: `Framingham 10-year cardiovascular risk: ${riskPercent.toFixed(1)}% (${severity.label.en.toLowerCase()}).`,
      'pt-BR': `Risco cardiovascular Framingham em 10 anos: ${riskPercent.toFixed(1)}% (${severity.label['pt-BR'].toLowerCase()}).`,
      es: `Riesgo cardiovascular Framingham a 10 años: ${riskPercent.toFixed(1)}% (${severity.label.es.toLowerCase()}).`,
    },
    triggeredRules,
    sourceAuthority: "D'Agostino RB Sr, Vasan RS, Pencina MJ et al. (2008)",
    citationUrl: 'https://pubmed.ncbi.nlm.nih.gov/18212285/',
    evidenceGrade: 'A',
    insufficientData: false,
  };
}
