/**
 * Bolivia Screening Rules
 *
 * Evidence-based preventive screening protocols for the Bolivian health
 * system.  Sources: PAHO/WHO Americas regional guidelines, Programa
 * Ampliado de Inmunización (PAI Bolivia), and Ministerio de Salud y
 * Deportes (MS Bolivia).
 *
 * Bolivia has limited mass-mammography infrastructure; clinical breast
 * examination (CBE) is used as the primary breast screening modality
 * per PAHO recommendation.
 */

import type { ScreeningRule } from './screening-triggers';

export const BOLIVIA_SCREENING_RULES: ScreeningRule[] = [
  // --- Cancer screenings ---
  {
    name: 'Cervical Cancer Screening (VIA or Pap)',
    screeningType: 'CERVICAL_CANCER',
    uspstfGrade: 'A',
    ageRange: { min: 30, max: 49 },
    genderRestriction: 'female',
    frequency: { years: 3 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Inspección visual con ácido acético (VIA) o Papanicolaou cada 3 años para mujeres de 30 a 49 años.',
    guidelineSource: 'PAHO/WHO Americas',
    jurisdiction: 'BO',
    sourceAuthority: 'PAHO/MS Bolivia',
    sourceUrl: 'https://www.paho.org/en/topics/cervical-cancer',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Breast Cancer Screening (CBE)',
    screeningType: 'BREAST_CBE',
    uspstfGrade: 'B',
    ageRange: { min: 40, max: 69 },
    genderRestriction: 'female',
    frequency: { years: 2 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Examen clínico de mama (ECM) cada 2 años para mujeres de 40 a 69 años. Bolivia no dispone de programa masivo de mamografía.',
    guidelineSource: 'PAHO (no mass mammography in BO)',
    jurisdiction: 'BO',
    sourceAuthority: 'PAHO/MS Bolivia',
    sourceUrl: 'https://www.paho.org/en/topics/breast-cancer',
    lastReviewedDate: '2026-01',
  },

  // --- Chronic disease screenings ---
  {
    name: 'Cardiovascular Risk Assessment (WHO Charts)',
    screeningType: 'CHOLESTEROL',
    uspstfGrade: 'B',
    ageRange: { min: 40 },
    frequency: { years: 5 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Evaluación de riesgo cardiovascular con tablas WHO/ISH cada 5 años para adultos desde los 40 años.',
    guidelineSource: 'PAHO/WHO CVD Charts',
    jurisdiction: 'BO',
    sourceAuthority: 'PAHO/MS Bolivia',
    sourceUrl: 'https://www.paho.org/en/hearts-americas',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Diabetes Screening (Fasting Glucose)',
    screeningType: 'DIABETES_SCREENING',
    uspstfGrade: 'B',
    ageRange: { min: 40 },
    frequency: { years: 3 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Glucemia en ayunas cada 3 años para adultos desde los 40 años.',
    guidelineSource: 'PAHO NCD',
    jurisdiction: 'BO',
    sourceAuthority: 'PAHO/MS Bolivia',
    sourceUrl: 'https://www.paho.org/en/topics/noncommunicable-diseases',
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
      'Toma de presión arterial anual para todos los adultos desde los 18 años.',
    guidelineSource: 'PAHO',
    jurisdiction: 'BO',
    sourceAuthority: 'PAHO/MS Bolivia',
    sourceUrl: 'https://www.paho.org/en/hearts-americas',
    lastReviewedDate: '2026-01',
  },

  // --- Immunization (PAI Bolivia) ---
  {
    name: 'Influenza Vaccine',
    screeningType: 'INFLUENZA',
    uspstfGrade: 'A',
    ageRange: { min: 60 },
    frequency: { years: 1 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Vacunación anual contra influenza para adultos de 60+ años.',
    guidelineSource: 'PAI Bolivia',
    jurisdiction: 'BO',
    sourceAuthority: 'PAHO/MS Bolivia',
    sourceUrl: 'https://www.paho.org/en/topics/immunization',
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
      'Vacunación contra fiebre amarilla para residentes o viajeros a zonas endémicas, refuerzo cada 10 años.',
    guidelineSource: 'PAI Bolivia',
    jurisdiction: 'BO',
    sourceAuthority: 'PAHO/MS Bolivia',
    sourceUrl: 'https://www.paho.org/en/topics/yellow-fever',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'BCG Vaccine',
    screeningType: 'BCG',
    uspstfGrade: 'A',
    ageRange: { min: 0, max: 0 },
    frequency: { years: 0 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Vacuna BCG al nacimiento (dosis única).',
    guidelineSource: 'PAI Bolivia',
    jurisdiction: 'BO',
    sourceAuthority: 'PAHO/MS Bolivia',
    sourceUrl: 'https://www.paho.org/en/topics/immunization',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Tetanus Vaccine (Td)',
    screeningType: 'TETANUS',
    uspstfGrade: 'A',
    ageRange: { min: 15 },
    frequency: { years: 10 },
    priority: 'MEDIUM',
    clinicalRecommendation:
      'Refuerzo de toxoide tetánico-diftérico (Td) cada 10 años para todos los adultos desde los 15 años.',
    guidelineSource: 'PAI Bolivia',
    jurisdiction: 'BO',
    sourceAuthority: 'PAHO/MS Bolivia',
    sourceUrl: 'https://www.paho.org/en/topics/immunization',
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
      'Vacunación neumocócica para adultos de 65+ años, refuerzo cada 5 años.',
    guidelineSource: 'PAI Bolivia',
    jurisdiction: 'BO',
    sourceAuthority: 'PAHO/MS Bolivia',
    sourceUrl: 'https://www.paho.org/en/topics/immunization',
    lastReviewedDate: '2026-01',
  },
];
