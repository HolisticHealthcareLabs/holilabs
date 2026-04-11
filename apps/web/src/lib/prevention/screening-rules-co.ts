/**
 * Colombia Screening Rules
 *
 * Evidence-based preventive screening protocols aligned with the Colombian
 * health system.  Sources: Resolución 3280/2018, Resolución 2765/2025,
 * Rutas Integrales de Atención en Salud (RIAS), Ministerio de Salud y
 * Protección Social (MinSalud), and Programa Ampliado de Inmunizaciones (PAI).
 */

import type { ScreeningRule } from './screening-triggers';

export const COLOMBIA_SCREENING_RULES: ScreeningRule[] = [
  // --- Cancer screenings ---
  {
    name: 'Breast Cancer Screening (Mammography)',
    screeningType: 'MAMMOGRAM',
    uspstfGrade: 'B',
    ageRange: { min: 50, max: 69 },
    genderRestriction: 'female',
    frequency: { years: 2 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Mamografía bilateral cada 2 años para mujeres de 50 a 69 años, alineado con OMS y Res. 3280/2018.',
    guidelineSource: 'Resolución 3280/2018',
    jurisdiction: 'CO',
    sourceAuthority: 'MinSalud/RIAS',
    sourceUrl: 'https://www.minsalud.gov.co/Normatividad_Nuevo/Resolución%20No.%203280%20de%202018.pdf',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Cervical Cancer Screening (Cytology)',
    screeningType: 'CERVICAL_CANCER',
    uspstfGrade: 'A',
    ageRange: { min: 25, max: 65 },
    genderRestriction: 'female',
    frequency: { years: 3 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Citología cervicovaginal cada 3 años para mujeres de 25 a 65 años (esquema 1-1-3).',
    guidelineSource: 'Resolución 3280/2018',
    jurisdiction: 'CO',
    sourceAuthority: 'MinSalud/RIAS',
    sourceUrl: 'https://www.minsalud.gov.co/Normatividad_Nuevo/Resolución%20No.%203280%20de%202018.pdf',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Cervical Cancer Screening (HPV-DNA Alternative)',
    screeningType: 'CERVICAL_HPV',
    uspstfGrade: 'A',
    ageRange: { min: 30, max: 65 },
    genderRestriction: 'female',
    frequency: { years: 5 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Prueba de ADN-VPH cada 5 años como alternativa a citología para mujeres de 30 a 65 años, conforme Res. 2765/2025.',
    guidelineSource: 'Resolución 2765/2025',
    jurisdiction: 'CO',
    sourceAuthority: 'MinSalud/RIAS',
    sourceUrl: 'https://www.minsalud.gov.co/Normatividad_Nuevo/Resolución%202765%20de%202025.pdf',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Colorectal Cancer Screening (FOBT)',
    screeningType: 'COLONOSCOPY',
    uspstfGrade: 'B',
    ageRange: { min: 50, max: 75 },
    frequency: { years: 1 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Prueba de sangre oculta en heces anual para adultos de 50 a 75 años, con colonoscopia si resultado positivo.',
    guidelineSource: 'MinSalud',
    jurisdiction: 'CO',
    sourceAuthority: 'MinSalud/RIAS',
    sourceUrl: 'https://www.minsalud.gov.co/salud/publica/PENT/Paginas/cancer-colorrectal.aspx',
    lastReviewedDate: '2026-01',
  },

  // --- Chronic disease screenings ---
  {
    name: 'Cardiovascular Risk Assessment (ASCVD)',
    screeningType: 'CHOLESTEROL',
    uspstfGrade: 'B',
    ageRange: { min: 40 },
    frequency: { years: 5 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Evaluación de riesgo cardiovascular global (ASCVD) cada 5 años para adultos desde los 40 años.',
    guidelineSource: 'RIAS Cardiovascular',
    jurisdiction: 'CO',
    sourceAuthority: 'MinSalud/RIAS',
    sourceUrl: 'https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/VS/PP/ENT/rias-cardiovascular.pdf',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Diabetes Screening (Fasting Glucose)',
    screeningType: 'DIABETES_SCREENING',
    uspstfGrade: 'B',
    ageRange: { min: 35 },
    frequency: { years: 3 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Glucemia en ayunas cada 3 años para adultos desde los 35 años, según RIAS de Diabetes Mellitus.',
    guidelineSource: 'RIAS DM',
    jurisdiction: 'CO',
    sourceAuthority: 'MinSalud/RIAS',
    sourceUrl: 'https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/VS/PP/ENT/rias-diabetes.pdf',
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
      'Toma de tensión arterial anual para todos los adultos desde los 18 años.',
    guidelineSource: 'RIAS HTA',
    jurisdiction: 'CO',
    sourceAuthority: 'MinSalud/RIAS',
    sourceUrl: 'https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/VS/PP/ENT/rias-hta.pdf',
    lastReviewedDate: '2026-01',
  },

  // --- Immunization (PAI Colombia) ---
  {
    name: 'Influenza Vaccine',
    screeningType: 'INFLUENZA',
    uspstfGrade: 'A',
    ageRange: { min: 60 },
    frequency: { years: 1 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Vacunación anual contra influenza para adultos de 60+ años.',
    guidelineSource: 'PAI Colombia',
    jurisdiction: 'CO',
    sourceAuthority: 'MinSalud/RIAS',
    sourceUrl: 'https://www.minsalud.gov.co/salud/publica/Vacunacion/Paginas/pai.aspx',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'COVID-19 Vaccine',
    screeningType: 'COVID_BOOSTER',
    uspstfGrade: 'B',
    ageRange: { min: 60 },
    frequency: { years: 1 },
    priority: 'MEDIUM',
    clinicalRecommendation:
      'Refuerzo anual de vacuna COVID-19 para adultos de 60+ años.',
    guidelineSource: 'MinSalud',
    jurisdiction: 'CO',
    sourceAuthority: 'MinSalud/RIAS',
    sourceUrl: 'https://www.minsalud.gov.co/salud/publica/Vacunacion/Paginas/Vacunacion-covid-19.aspx',
    lastReviewedDate: '2026-01',
  },
  {
    name: 'Hepatitis B Vaccine',
    screeningType: 'HEPATITIS_B',
    uspstfGrade: 'A',
    ageRange: { min: 0 },
    frequency: { years: 0 },
    priority: 'HIGH',
    clinicalRecommendation:
      'Esquema completo de vacunación contra hepatitis B para personas no vacunadas (esquema 0-1-6 meses).',
    guidelineSource: 'PAI Colombia',
    jurisdiction: 'CO',
    sourceAuthority: 'MinSalud/RIAS',
    sourceUrl: 'https://www.minsalud.gov.co/salud/publica/Vacunacion/Paginas/pai.aspx',
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
    guidelineSource: 'PAI Colombia',
    jurisdiction: 'CO',
    sourceAuthority: 'MinSalud/RIAS',
    sourceUrl: 'https://www.minsalud.gov.co/salud/publica/Vacunacion/Paginas/pai.aspx',
    lastReviewedDate: '2026-01',
  },
];
