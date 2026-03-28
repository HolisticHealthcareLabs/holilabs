/**
 * Brazil Screening Rules
 *
 * Evidence-based preventive screening protocols for the Brazilian public
 * and supplementary health systems.  Sources: INCA PCDT 2024, Ministério
 * da Saúde (MS), Sociedade Brasileira de Cardiologia (SBC), Sociedade
 * Brasileira de Diabetes (SBD), and Programa Nacional de Imunizações (PNI).
 */

import type { ScreeningRule } from './screening-triggers';

export const BRAZIL_SCREENING_RULES: ScreeningRule[] = [
  // --- Cancer screenings ---
  {
    name: 'Breast Cancer Screening (Mammography)',
    screeningType: 'MAMMOGRAM',
    uspstfGrade: 'B',
    ageRange: { min: 40, max: 74 },
    genderRestriction: 'female',
    frequency: { years: 2 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Mamografia bilateral a cada 2 anos para mulheres de 40 a 74 anos, conforme INCA PCDT 2024 (faixa expandida de 50-69).',
    guidelineSource: 'INCA PCDT 2024',
    jurisdiction: 'BR',
    sourceAuthority: 'INCA/MS',
    sourceUrl: 'https://www.gov.br/inca/pt-br/assuntos/gestor-e-profissional-de-saude/controle-do-cancer-de-mama',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Cervical Cancer Screening (HPV-DNA)',
    screeningType: 'CERVICAL_CANCER',
    uspstfGrade: 'A',
    ageRange: { min: 25, max: 64 },
    genderRestriction: 'female',
    frequency: { years: 5 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Teste de HPV-DNA a cada 5 anos para mulheres de 25 a 64 anos, conforme publicação do Diário Oficial de agosto de 2025.',
    guidelineSource: 'MS Diário Oficial Agosto 2025',
    jurisdiction: 'BR',
    sourceAuthority: 'MS',
    sourceUrl: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/c/cancer-do-colo-do-utero',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Colorectal Cancer Screening (FOBT)',
    screeningType: 'COLONOSCOPY',
    uspstfGrade: 'A',
    ageRange: { min: 50, max: 75 },
    frequency: { years: 1 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Pesquisa de sangue oculto nas fezes (PSOF) anual para adultos de 50 a 75 anos, com colonoscopia em caso de resultado positivo.',
    guidelineSource: 'SUS/INCA Protocol',
    jurisdiction: 'BR',
    sourceAuthority: 'INCA/SUS',
    sourceUrl: 'https://www.gov.br/inca/pt-br/assuntos/gestor-e-profissional-de-saude/controle-do-cancer-de-intestino',
    lastReviewedDate: '2026-01',
  },

  // --- Chronic disease screenings ---
  {
    name: 'Cardiovascular Risk Assessment (Framingham-BR)',
    screeningType: 'CHOLESTEROL',
    uspstfGrade: 'B',
    ageRange: { min: 40 },
    frequency: { years: 5 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Avaliação de risco cardiovascular global (escala de Framingham adaptada) a cada 5 anos para adultos a partir de 40 anos.',
    guidelineSource: 'SBC Diretriz 2024',
    jurisdiction: 'BR',
    sourceAuthority: 'SBC',
    sourceUrl: 'https://www.scielo.br/j/abc/a/SBC-Diretriz-Prevencao-CV-2024',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Diabetes Screening (HbA1c)',
    screeningType: 'DIABETES_SCREENING',
    uspstfGrade: 'B',
    ageRange: { min: 35, max: 70 },
    frequency: { years: 3 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Rastreamento de diabetes tipo 2 por HbA1c a cada 3 anos para adultos de 35 a 70 anos.',
    guidelineSource: 'SBD/MS 2024',
    jurisdiction: 'BR',
    sourceAuthority: 'SBD/MS',
    sourceUrl: 'https://diretriz.diabetes.org.br',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Hypertension Screening (Blood Pressure)',
    screeningType: 'BLOOD_PRESSURE',
    uspstfGrade: 'A',
    ageRange: { min: 18 },
    frequency: { years: 1 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Aferição de pressão arterial anual para todos os adultos a partir de 18 anos.',
    guidelineSource: 'SBC 2024',
    jurisdiction: 'BR',
    sourceAuthority: 'SBC',
    sourceUrl: 'https://www.scielo.br/j/abc/a/SBC-Diretriz-HAS-2024',
    lastReviewedDate: '2026-01',
  },

  // --- Immunization (PNI 2026) ---
  {
    name: 'Influenza Vaccine',
    screeningType: 'INFLUENZA',
    uspstfGrade: 'A',
    ageRange: { min: 60 },
    frequency: { years: 1 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Vacinação anual contra influenza para adultos com 60+ anos ou portadores de doenças crônicas.',
    guidelineSource: 'PNI 2026',
    jurisdiction: 'BR',
    sourceAuthority: 'MS/PNI',
    sourceUrl: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/c/calendario-nacional-de-vacinacao',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'COVID-19 Booster',
    screeningType: 'COVID_BOOSTER',
    uspstfGrade: 'B',
    ageRange: { min: 60 },
    frequency: { years: 1 },
    priority: 'MEDIUM',
    clinicalRecommendation:
      'Dose de reforço anual contra COVID-19 para adultos com 60+ anos ou portadores de comorbidades.',
    guidelineSource: 'PNI 2026',
    jurisdiction: 'BR',
    sourceAuthority: 'MS/PNI',
    sourceUrl: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/c/covid-19-vacinacao',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Pneumococcal Vaccine',
    screeningType: 'PNEUMOCOCCAL',
    uspstfGrade: 'A',
    ageRange: { min: 65 },
    frequency: { years: 5 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Vacinação pneumocócica (PCV13 + PPSV23) para adultos com 65+ anos, reforço a cada 5 anos.',
    guidelineSource: 'PNI 2026',
    jurisdiction: 'BR',
    sourceAuthority: 'MS/PNI',
    sourceUrl: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/c/calendario-nacional-de-vacinacao',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Hepatitis B Vaccine',
    screeningType: 'HEPATITIS_B',
    uspstfGrade: 'A',
    ageRange: { min: 0, max: 49 },
    frequency: { years: 0 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Vacinação contra hepatite B (esquema 0-1-6 meses) para indivíduos até 49 anos não vacinados.',
    guidelineSource: 'PNI 2026',
    jurisdiction: 'BR',
    sourceAuthority: 'MS/PNI',
    sourceUrl: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/c/calendario-nacional-de-vacinacao',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Yellow Fever Vaccine',
    screeningType: 'YELLOW_FEVER',
    uspstfGrade: 'B',
    ageRange: { min: 9 },
    frequency: { years: 10 },
    priority: 'MEDIUM',
    clinicalRecommendation:
      'Vacinação contra febre amarela para residentes ou viajantes a áreas endêmicas, reforço a cada 10 anos.',
    guidelineSource: 'PNI 2026',
    jurisdiction: 'BR',
    sourceAuthority: 'MS/PNI',
    sourceUrl: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/f/febre-amarela',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Tetanus Vaccine (dT)',
    screeningType: 'TETANUS',
    uspstfGrade: 'A',
    ageRange: { min: 20 },
    frequency: { years: 10 },
    priority: 'MEDIUM',
    clinicalRecommendation:
      'Reforço de dupla adulto (dT) a cada 10 anos para todos os adultos a partir de 20 anos.',
    guidelineSource: 'PNI 2026',
    jurisdiction: 'BR',
    sourceAuthority: 'MS/PNI',
    sourceUrl: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/c/calendario-nacional-de-vacinacao',
    lastReviewedDate: '2026-01',
  },
];
