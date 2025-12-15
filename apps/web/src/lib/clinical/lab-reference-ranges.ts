/**
 * Lab Reference Ranges with LOINC Codes
 * Evidence-based age/gender-specific reference ranges for clinical laboratory tests
 *
 * Sources:
 * - LOINC (Logical Observation Identifiers Names and Codes) Database - https://loinc.org/
 * - WHO International Reference Ranges
 * - IFCC (International Federation of Clinical Chemistry) Guidelines
 * - Clinical Laboratory Standards Institute (CLSI)
 * - UpToDate Clinical Reference Database
 *
 * Last Updated: December 2025
 */

export interface LabReferenceRange {
  loincCode: string;
  testName: string;
  commonAliases?: string[]; // Alternative names for the test
  unit: string;
  minAge?: number; // Minimum age in years (undefined = no minimum)
  maxAge?: number; // Maximum age in years (undefined = no maximum)
  gender?: 'M' | 'F' | 'both';
  normalMin: number;
  normalMax: number;
  criticalLow?: number; // Life-threatening low value
  criticalHigh?: number; // Life-threatening high value
  interpretation: {
    low: string;
    normal: string;
    high: string;
    criticalLow?: string;
    criticalHigh?: string;
  };
  category: string; // Test category
  clinicalSignificance: string; // Brief clinical context
}

/**
 * Comprehensive lab reference ranges database
 * Organized by category for easier maintenance
 */
export const REFERENCE_RANGES: LabReferenceRange[] = [
  // ==========================================
  // COMPLETE BLOOD COUNT (CBC)
  // ==========================================
  {
    loincCode: '718-7',
    testName: 'Hemoglobin',
    commonAliases: ['Hgb', 'Hb'],
    unit: 'g/dL',
    gender: 'M',
    minAge: 18,
    normalMin: 13.5,
    normalMax: 17.5,
    criticalLow: 7.0,
    criticalHigh: 20.0,
    category: 'Hematology',
    clinicalSignificance: 'Oxygen-carrying capacity of blood',
    interpretation: {
      low: 'Anemia - consider iron deficiency, chronic disease, bleeding, hemolysis, or bone marrow disorders',
      normal: 'Normal hemoglobin level - adequate oxygen-carrying capacity',
      high: 'Polycythemia - consider dehydration, chronic hypoxia, COPD, or polycythemia vera',
      criticalLow: 'CRITICAL: Severe anemia requiring immediate intervention, possible transfusion',
      criticalHigh: 'CRITICAL: Severe polycythemia with increased thrombosis risk',
    },
  },
  {
    loincCode: '718-7',
    testName: 'Hemoglobin',
    commonAliases: ['Hgb', 'Hb'],
    unit: 'g/dL',
    gender: 'F',
    minAge: 18,
    normalMin: 12.0,
    normalMax: 15.5,
    criticalLow: 7.0,
    criticalHigh: 20.0,
    category: 'Hematology',
    clinicalSignificance: 'Oxygen-carrying capacity of blood',
    interpretation: {
      low: 'Anemia - consider iron deficiency, menstrual losses, pregnancy, nutrition, or chronic disease',
      normal: 'Normal hemoglobin level - adequate oxygen-carrying capacity',
      high: 'Polycythemia - consider dehydration, chronic hypoxia, smoking, or polycythemia vera',
      criticalLow: 'CRITICAL: Severe anemia requiring immediate intervention, possible transfusion',
      criticalHigh: 'CRITICAL: Severe polycythemia with increased thrombosis risk',
    },
  },
  {
    loincCode: '20570-8',
    testName: 'Hematocrit',
    commonAliases: ['Hct', 'PCV'],
    unit: '%',
    gender: 'M',
    minAge: 18,
    normalMin: 38.8,
    normalMax: 50.0,
    criticalLow: 20.0,
    criticalHigh: 60.0,
    category: 'Hematology',
    clinicalSignificance: 'Percentage of blood volume occupied by red blood cells',
    interpretation: {
      low: 'Low hematocrit - anemia, blood loss, or hemodilution',
      normal: 'Normal hematocrit - adequate red blood cell volume',
      high: 'Elevated hematocrit - dehydration, polycythemia, or chronic hypoxia',
      criticalLow: 'CRITICAL: Severe anemia with compromised oxygen delivery',
      criticalHigh: 'CRITICAL: Hyperviscosity syndrome risk - stroke, MI, DVT',
    },
  },
  {
    loincCode: '20570-8',
    testName: 'Hematocrit',
    commonAliases: ['Hct', 'PCV'],
    unit: '%',
    gender: 'F',
    minAge: 18,
    normalMin: 35.0,
    normalMax: 45.0,
    criticalLow: 20.0,
    criticalHigh: 60.0,
    category: 'Hematology',
    clinicalSignificance: 'Percentage of blood volume occupied by red blood cells',
    interpretation: {
      low: 'Low hematocrit - anemia, blood loss, pregnancy, or hemodilution',
      normal: 'Normal hematocrit - adequate red blood cell volume',
      high: 'Elevated hematocrit - dehydration, polycythemia, or chronic hypoxia',
      criticalLow: 'CRITICAL: Severe anemia with compromised oxygen delivery',
      criticalHigh: 'CRITICAL: Hyperviscosity syndrome risk - stroke, MI, DVT',
    },
  },
  {
    loincCode: '6690-2',
    testName: 'White Blood Cell Count',
    commonAliases: ['WBC', 'Leukocytes'],
    unit: 'x10^3/uL',
    gender: 'both',
    minAge: 18,
    normalMin: 4.5,
    normalMax: 11.0,
    criticalLow: 2.0,
    criticalHigh: 30.0,
    category: 'Hematology',
    clinicalSignificance: 'Immune system cell count',
    interpretation: {
      low: 'Leukopenia - consider viral infection, bone marrow suppression, autoimmune disease, or chemotherapy',
      normal: 'Normal white blood cell count - adequate immune function',
      high: 'Leukocytosis - consider infection, inflammation, stress, leukemia, or corticosteroid use',
      criticalLow: 'CRITICAL: Severe neutropenia - high infection risk, requires isolation and prophylaxis',
      criticalHigh: 'CRITICAL: Possible leukemia or severe sepsis - immediate hematology consultation',
    },
  },
  {
    loincCode: '777-3',
    testName: 'Platelet Count',
    commonAliases: ['PLT', 'Thrombocytes'],
    unit: 'x10^3/uL',
    gender: 'both',
    minAge: 18,
    normalMin: 150,
    normalMax: 400,
    criticalLow: 50,
    criticalHigh: 1000,
    category: 'Hematology',
    clinicalSignificance: 'Blood clotting capacity',
    interpretation: {
      low: 'Thrombocytopenia - consider ITP, drug-induced, DIC, bone marrow disorders, or splenic sequestration',
      normal: 'Normal platelet count - adequate hemostasis',
      high: 'Thrombocytosis - consider reactive (infection, inflammation), essential thrombocythemia, or myeloproliferative disorder',
      criticalLow: 'CRITICAL: Severe thrombocytopenia - spontaneous bleeding risk, avoid invasive procedures',
      criticalHigh: 'CRITICAL: Extreme thrombocytosis - thrombosis and paradoxical bleeding risk',
    },
  },

  // ==========================================
  // BASIC METABOLIC PANEL (BMP)
  // ==========================================
  {
    loincCode: '2345-7',
    testName: 'Glucose',
    commonAliases: ['Blood Sugar', 'Blood Glucose'],
    unit: 'mg/dL',
    gender: 'both',
    minAge: 18,
    normalMin: 70,
    normalMax: 100,
    criticalLow: 40,
    criticalHigh: 500,
    category: 'Chemistry',
    clinicalSignificance: 'Blood sugar level - diabetes screening and management',
    interpretation: {
      low: 'Hypoglycemia - consider insulin excess, inadequate food intake, insulinoma, or adrenal insufficiency',
      normal: 'Normal fasting glucose - low diabetes risk',
      high: 'Hyperglycemia - prediabetes (100-125 mg/dL) or diabetes (≥126 mg/dL fasting). Consider HbA1c for confirmation',
      criticalLow: 'CRITICAL: Severe hypoglycemia - confusion, seizures, coma risk. Immediate glucose administration required',
      criticalHigh: 'CRITICAL: Hyperglycemic crisis - DKA or HHS risk. Check ketones, immediate intervention required',
    },
  },
  {
    loincCode: '2160-0',
    testName: 'Creatinine',
    commonAliases: ['Cr', 'Serum Creatinine'],
    unit: 'mg/dL',
    gender: 'M',
    minAge: 18,
    normalMin: 0.74,
    normalMax: 1.35,
    criticalLow: 0.4,
    criticalHigh: 10.0,
    category: 'Chemistry',
    clinicalSignificance: 'Kidney function marker',
    interpretation: {
      low: 'Low creatinine - consider decreased muscle mass, malnutrition, or liver disease',
      normal: 'Normal creatinine - adequate kidney function',
      high: 'Elevated creatinine - acute or chronic kidney disease. Calculate eGFR for staging',
      criticalLow: 'Unusually low - investigate muscle wasting or malnutrition',
      criticalHigh: 'CRITICAL: Severe renal failure - consider dialysis, avoid nephrotoxic drugs',
    },
  },
  {
    loincCode: '2160-0',
    testName: 'Creatinine',
    commonAliases: ['Cr', 'Serum Creatinine'],
    unit: 'mg/dL',
    gender: 'F',
    minAge: 18,
    normalMin: 0.59,
    normalMax: 1.04,
    criticalLow: 0.4,
    criticalHigh: 10.0,
    category: 'Chemistry',
    clinicalSignificance: 'Kidney function marker',
    interpretation: {
      low: 'Low creatinine - consider decreased muscle mass, malnutrition, or liver disease',
      normal: 'Normal creatinine - adequate kidney function',
      high: 'Elevated creatinine - acute or chronic kidney disease. Calculate eGFR for staging',
      criticalLow: 'Unusually low - investigate muscle wasting or malnutrition',
      criticalHigh: 'CRITICAL: Severe renal failure - consider dialysis, avoid nephrotoxic drugs',
    },
  },
  {
    loincCode: '3094-0',
    testName: 'Blood Urea Nitrogen',
    commonAliases: ['BUN', 'Urea Nitrogen'],
    unit: 'mg/dL',
    gender: 'both',
    minAge: 18,
    normalMin: 7,
    normalMax: 20,
    criticalLow: 2,
    criticalHigh: 100,
    category: 'Chemistry',
    clinicalSignificance: 'Kidney function and protein metabolism',
    interpretation: {
      low: 'Low BUN - consider liver disease, malnutrition, overhydration, or pregnancy',
      normal: 'Normal BUN - adequate kidney function and protein metabolism',
      high: 'Elevated BUN - prerenal (dehydration, heart failure), renal (kidney disease), or postrenal (obstruction). Check BUN/Cr ratio',
      criticalLow: 'Severe hepatic dysfunction or malnutrition',
      criticalHigh: 'CRITICAL: Severe azotemia - uremic symptoms likely, dialysis may be indicated',
    },
  },
  {
    loincCode: '2951-2',
    testName: 'Sodium',
    commonAliases: ['Na', 'Serum Sodium'],
    unit: 'mEq/L',
    gender: 'both',
    minAge: 18,
    normalMin: 136,
    normalMax: 145,
    criticalLow: 120,
    criticalHigh: 160,
    category: 'Chemistry',
    clinicalSignificance: 'Electrolyte and fluid balance',
    interpretation: {
      low: 'Hyponatremia - consider SIADH, heart failure, cirrhosis, diuretics, or psychogenic polydipsia',
      normal: 'Normal sodium - adequate electrolyte balance',
      high: 'Hypernatremia - consider dehydration, diabetes insipidus, or excess sodium intake',
      criticalLow: 'CRITICAL: Severe hyponatremia - seizure risk, cerebral edema. Correct slowly to avoid osmotic demyelination',
      criticalHigh: 'CRITICAL: Severe hypernatremia - altered mental status, seizures. Correct slowly',
    },
  },
  {
    loincCode: '2823-3',
    testName: 'Potassium',
    commonAliases: ['K', 'Serum Potassium'],
    unit: 'mEq/L',
    gender: 'both',
    minAge: 18,
    normalMin: 3.5,
    normalMax: 5.0,
    criticalLow: 2.5,
    criticalHigh: 6.5,
    category: 'Chemistry',
    clinicalSignificance: 'Cardiac and neuromuscular function',
    interpretation: {
      low: 'Hypokalemia - consider diuretics, vomiting, diarrhea, hyperaldosteronism, or inadequate intake',
      normal: 'Normal potassium - adequate cardiac and neuromuscular function',
      high: 'Hyperkalemia - consider renal failure, ACE inhibitors, potassium-sparing diuretics, or hemolysis (spurious)',
      criticalLow: 'CRITICAL: Severe hypokalemia - cardiac arrhythmia risk, muscle weakness. Immediate replacement needed',
      criticalHigh: 'CRITICAL: Severe hyperkalemia - life-threatening arrhythmia risk. Immediate treatment with calcium, insulin/glucose, dialysis',
    },
  },
  {
    loincCode: '2075-0',
    testName: 'Chloride',
    commonAliases: ['Cl', 'Serum Chloride'],
    unit: 'mEq/L',
    gender: 'both',
    minAge: 18,
    normalMin: 98,
    normalMax: 106,
    criticalLow: 80,
    criticalHigh: 120,
    category: 'Chemistry',
    clinicalSignificance: 'Acid-base and electrolyte balance',
    interpretation: {
      low: 'Hypochloremia - consider vomiting, metabolic alkalosis, diuretics, or SIADH',
      normal: 'Normal chloride - adequate acid-base balance',
      high: 'Hyperchloremia - consider dehydration, metabolic acidosis, or renal tubular acidosis',
      criticalLow: 'Severe acid-base disturbance',
      criticalHigh: 'Severe acid-base disturbance',
    },
  },
  {
    loincCode: '2028-9',
    testName: 'Carbon Dioxide',
    commonAliases: ['CO2', 'Bicarbonate', 'Total CO2'],
    unit: 'mEq/L',
    gender: 'both',
    minAge: 18,
    normalMin: 23,
    normalMax: 29,
    criticalLow: 10,
    criticalHigh: 40,
    category: 'Chemistry',
    clinicalSignificance: 'Acid-base balance indicator',
    interpretation: {
      low: 'Low CO2 - metabolic acidosis (DKA, lactic acidosis, renal failure) or respiratory compensation',
      normal: 'Normal CO2 - adequate acid-base balance',
      high: 'High CO2 - metabolic alkalosis (vomiting, diuretics) or respiratory acidosis (COPD)',
      criticalLow: 'CRITICAL: Severe metabolic acidosis - investigate cause urgently',
      criticalHigh: 'CRITICAL: Severe alkalosis or respiratory failure',
    },
  },

  // ==========================================
  // LIPID PANEL
  // ==========================================
  {
    loincCode: '2093-3',
    testName: 'Total Cholesterol',
    commonAliases: ['Chol', 'TC'],
    unit: 'mg/dL',
    gender: 'both',
    minAge: 18,
    normalMin: 125,
    normalMax: 200,
    criticalHigh: 400,
    category: 'Lipids',
    clinicalSignificance: 'Cardiovascular disease risk factor',
    interpretation: {
      low: 'Low cholesterol - generally desirable, but very low levels (<120) may indicate malnutrition or hyperthyroidism',
      normal: 'Desirable cholesterol level - lower cardiovascular risk',
      high: 'Elevated cholesterol - 200-239 borderline high, ≥240 high. Increased CVD risk, consider statin therapy per guidelines',
      criticalHigh: 'CRITICAL: Severe hypercholesterolemia - familial hypercholesterolemia possible, aggressive therapy needed',
    },
  },
  {
    loincCode: '13457-7',
    testName: 'LDL Cholesterol',
    commonAliases: ['LDL-C', 'Bad Cholesterol'],
    unit: 'mg/dL',
    gender: 'both',
    minAge: 18,
    normalMin: 0,
    normalMax: 100,
    criticalHigh: 250,
    category: 'Lipids',
    clinicalSignificance: 'Primary target for cardiovascular disease prevention',
    interpretation: {
      low: 'Optimal LDL - lowest cardiovascular risk',
      normal: 'Near optimal LDL - low cardiovascular risk',
      high: 'Elevated LDL - 100-129 above optimal, 130-159 borderline high, 160-189 high, ≥190 very high. Statin therapy per ACC/AHA guidelines',
      criticalHigh: 'CRITICAL: Very high LDL - aggressive lipid-lowering therapy indicated',
    },
  },
  {
    loincCode: '2085-9',
    testName: 'HDL Cholesterol',
    commonAliases: ['HDL-C', 'Good Cholesterol'],
    unit: 'mg/dL',
    gender: 'M',
    minAge: 18,
    normalMin: 40,
    normalMax: 100,
    criticalLow: 25,
    category: 'Lipids',
    clinicalSignificance: 'Protective against cardiovascular disease',
    interpretation: {
      low: 'Low HDL - major CVD risk factor. Lifestyle modifications (exercise, smoking cessation) and consider niacin or fibrates',
      normal: 'Adequate HDL - cardioprotective',
      high: 'High HDL (>60) - negative risk factor, cardioprotective',
      criticalLow: 'CRITICAL: Very low HDL - very high CVD risk',
    },
  },
  {
    loincCode: '2085-9',
    testName: 'HDL Cholesterol',
    commonAliases: ['HDL-C', 'Good Cholesterol'],
    unit: 'mg/dL',
    gender: 'F',
    minAge: 18,
    normalMin: 50,
    normalMax: 100,
    criticalLow: 25,
    category: 'Lipids',
    clinicalSignificance: 'Protective against cardiovascular disease',
    interpretation: {
      low: 'Low HDL - major CVD risk factor. Lifestyle modifications (exercise, smoking cessation) and consider niacin or fibrates',
      normal: 'Adequate HDL - cardioprotective',
      high: 'High HDL (>60) - negative risk factor, cardioprotective',
      criticalLow: 'CRITICAL: Very low HDL - very high CVD risk',
    },
  },
  {
    loincCode: '2571-8',
    testName: 'Triglycerides',
    commonAliases: ['TG', 'Trigs'],
    unit: 'mg/dL',
    gender: 'both',
    minAge: 18,
    normalMin: 0,
    normalMax: 150,
    criticalHigh: 1000,
    category: 'Lipids',
    clinicalSignificance: 'CVD risk and pancreatitis risk marker',
    interpretation: {
      low: 'Normal low triglycerides',
      normal: 'Normal triglycerides - lower CVD risk',
      high: 'Elevated triglycerides - 150-199 borderline, 200-499 high, ≥500 very high with pancreatitis risk. Consider fibrates, omega-3',
      criticalHigh: 'CRITICAL: Severe hypertriglyceridemia - acute pancreatitis risk. Immediate therapy with fibrates/insulin',
    },
  },

  // ==========================================
  // LIVER FUNCTION TESTS (LFTs)
  // ==========================================
  {
    loincCode: '1742-6',
    testName: 'Alanine Aminotransferase',
    commonAliases: ['ALT', 'SGPT'],
    unit: 'U/L',
    gender: 'both',
    minAge: 18,
    normalMin: 7,
    normalMax: 56,
    criticalHigh: 1000,
    category: 'Hepatic',
    clinicalSignificance: 'Liver-specific enzyme - hepatocellular injury marker',
    interpretation: {
      low: 'Low ALT - normal finding',
      normal: 'Normal ALT - no significant hepatocellular injury',
      high: 'Elevated ALT - hepatocellular injury. <5x ULN: chronic hepatitis, NAFLD. >10x ULN: acute hepatitis, drug toxicity, ischemia',
      criticalHigh: 'CRITICAL: Severe hepatocellular injury - acute hepatitis, drug-induced liver injury (acetaminophen), or ischemic hepatitis',
    },
  },
  {
    loincCode: '1920-8',
    testName: 'Aspartate Aminotransferase',
    commonAliases: ['AST', 'SGOT'],
    unit: 'U/L',
    gender: 'both',
    minAge: 18,
    normalMin: 10,
    normalMax: 40,
    criticalHigh: 1000,
    category: 'Hepatic',
    clinicalSignificance: 'Liver and cardiac enzyme - less specific than ALT',
    interpretation: {
      low: 'Low AST - normal finding',
      normal: 'Normal AST - no significant organ injury',
      high: 'Elevated AST - liver injury, MI, muscle injury. AST:ALT ratio >2 suggests alcoholic liver disease',
      criticalHigh: 'CRITICAL: Severe organ injury - acute hepatitis, MI, rhabdomyolysis, or drug toxicity',
    },
  },
  {
    loincCode: '1975-2',
    testName: 'Total Bilirubin',
    commonAliases: ['T.Bili', 'TBIL'],
    unit: 'mg/dL',
    gender: 'both',
    minAge: 18,
    normalMin: 0.1,
    normalMax: 1.2,
    criticalHigh: 15.0,
    category: 'Hepatic',
    clinicalSignificance: 'Liver function and hemolysis marker',
    interpretation: {
      low: 'Low bilirubin - normal finding',
      normal: 'Normal bilirubin - adequate liver conjugation and excretion',
      high: 'Hyperbilirubinemia - jaundice if >2.5. Consider hemolysis (unconjugated), hepatitis, cirrhosis, or obstruction (conjugated)',
      criticalHigh: 'CRITICAL: Severe hyperbilirubinemia - acute liver failure or complete biliary obstruction',
    },
  },
  {
    loincCode: '1751-7',
    testName: 'Albumin',
    commonAliases: ['Alb'],
    unit: 'g/dL',
    gender: 'both',
    minAge: 18,
    normalMin: 3.5,
    normalMax: 5.5,
    criticalLow: 2.0,
    category: 'Hepatic',
    clinicalSignificance: 'Liver synthetic function and nutritional status',
    interpretation: {
      low: 'Hypoalbuminemia - chronic liver disease, malnutrition, nephrotic syndrome, or protein-losing enteropathy',
      normal: 'Normal albumin - adequate liver synthesis and nutritional status',
      high: 'Elevated albumin - usually dehydration',
      criticalLow: 'CRITICAL: Severe hypoalbuminemia - cirrhosis, severe malnutrition, or nephrotic syndrome with edema risk',
    },
  },
  {
    loincCode: '6768-6',
    testName: 'Alkaline Phosphatase',
    commonAliases: ['ALP', 'Alk Phos'],
    unit: 'U/L',
    gender: 'both',
    minAge: 18,
    normalMin: 40,
    normalMax: 130,
    criticalHigh: 500,
    category: 'Hepatic',
    clinicalSignificance: 'Cholestasis and bone disease marker',
    interpretation: {
      low: 'Low ALP - consider hypophosphatasia (rare)',
      normal: 'Normal ALP - no cholestasis or bone disease',
      high: 'Elevated ALP - cholestasis (biliary obstruction, PSC, PBC), bone disease (Paget, metastases), or pregnancy',
      criticalHigh: 'CRITICAL: Severe elevation - complete biliary obstruction or infiltrative liver disease',
    },
  },

  // ==========================================
  // THYROID FUNCTION TESTS
  // ==========================================
  {
    loincCode: '3016-3',
    testName: 'Thyroid Stimulating Hormone',
    commonAliases: ['TSH', 'Thyrotropin'],
    unit: 'mIU/L',
    gender: 'both',
    minAge: 18,
    normalMin: 0.4,
    normalMax: 4.0,
    criticalLow: 0.01,
    criticalHigh: 20.0,
    category: 'Endocrine',
    clinicalSignificance: 'Primary thyroid function screening test',
    interpretation: {
      low: 'Low TSH - hyperthyroidism (Graves, toxic nodule, thyroiditis), or excessive levothyroxine. Check free T4',
      normal: 'Normal TSH - euthyroid state',
      high: 'Elevated TSH - primary hypothyroidism. >10 mIU/L warrants levothyroxine therapy. 4-10 mIU/L is subclinical',
      criticalLow: 'CRITICAL: Suppressed TSH - thyroid storm risk if symptomatic',
      criticalHigh: 'CRITICAL: Severe hypothyroidism - myxedema coma risk if symptomatic',
    },
  },
  {
    loincCode: '3024-7',
    testName: 'Free Thyroxine',
    commonAliases: ['Free T4', 'FT4'],
    unit: 'ng/dL',
    gender: 'both',
    minAge: 18,
    normalMin: 0.8,
    normalMax: 1.8,
    criticalLow: 0.3,
    criticalHigh: 4.0,
    category: 'Endocrine',
    clinicalSignificance: 'Direct measure of thyroid hormone',
    interpretation: {
      low: 'Low free T4 - hypothyroidism (with high TSH) or central hypothyroidism (with low/normal TSH)',
      normal: 'Normal free T4 - adequate thyroid hormone',
      high: 'Elevated free T4 - hyperthyroidism (with low TSH) or excess levothyroxine',
      criticalLow: 'CRITICAL: Severe hypothyroidism - myxedema coma risk',
      criticalHigh: 'CRITICAL: Thyrotoxicosis - thyroid storm risk',
    },
  },

  // ==========================================
  // DIABETES MONITORING
  // ==========================================
  {
    loincCode: '4548-4',
    testName: 'Hemoglobin A1c',
    commonAliases: ['HbA1c', 'Glycated Hemoglobin', 'A1c'],
    unit: '%',
    gender: 'both',
    minAge: 18,
    normalMin: 4.0,
    normalMax: 5.6,
    criticalHigh: 14.0,
    category: 'Endocrine',
    clinicalSignificance: '3-month average blood glucose - diabetes diagnosis and monitoring',
    interpretation: {
      low: 'Low HbA1c - normal glycemic control or hypoglycemia',
      normal: 'Normal HbA1c (<5.7%) - no diabetes. 5.7-6.4% is prediabetes',
      high: 'Elevated HbA1c - ≥6.5% diagnostic for diabetes. Goal <7% for most diabetics, <8% for elderly/comorbid patients',
      criticalHigh: 'CRITICAL: Severe hyperglycemia - very poor glycemic control, high complication risk',
    },
  },

  // ==========================================
  // CARDIAC MARKERS
  // ==========================================
  {
    loincCode: '10839-9',
    testName: 'Troponin I',
    commonAliases: ['cTnI', 'Cardiac Troponin I'],
    unit: 'ng/mL',
    gender: 'both',
    minAge: 18,
    normalMin: 0.0,
    normalMax: 0.04,
    criticalHigh: 10.0,
    category: 'Cardiac',
    clinicalSignificance: 'Myocardial injury marker - gold standard for MI diagnosis',
    interpretation: {
      low: 'Undetectable troponin - no acute myocardial injury',
      normal: 'Normal troponin - no significant myocardial injury',
      high: 'Elevated troponin - acute MI (with clinical context), myocarditis, PE, renal failure, sepsis, or demand ischemia',
      criticalHigh: 'CRITICAL: Massive myocardial injury - large MI or myocarditis. Immediate cardiology consultation',
    },
  },
  {
    loincCode: '30934-4',
    testName: 'B-Type Natriuretic Peptide',
    commonAliases: ['BNP', 'Brain Natriuretic Peptide'],
    unit: 'pg/mL',
    gender: 'both',
    minAge: 18,
    normalMin: 0,
    normalMax: 100,
    criticalHigh: 2000,
    category: 'Cardiac',
    clinicalSignificance: 'Heart failure diagnosis and prognosis',
    interpretation: {
      low: 'Low BNP (<100) - heart failure unlikely',
      normal: 'Normal BNP - no significant heart failure',
      high: 'Elevated BNP - 100-300 possible HF, 300-600 moderate HF, >600 severe HF. Also elevated in renal failure, PE, sepsis',
      criticalHigh: 'CRITICAL: Severe heart failure - poor prognosis, consider ICU admission',
    },
  },

  // ==========================================
  // INFLAMMATION MARKERS
  // ==========================================
  {
    loincCode: '1988-5',
    testName: 'C-Reactive Protein',
    commonAliases: ['CRP'],
    unit: 'mg/L',
    gender: 'both',
    minAge: 18,
    normalMin: 0.0,
    normalMax: 3.0,
    criticalHigh: 200,
    category: 'Inflammation',
    clinicalSignificance: 'Non-specific inflammation and cardiovascular risk marker',
    interpretation: {
      low: 'Low CRP - no significant inflammation. <1 mg/L is low CVD risk',
      normal: 'Normal CRP - minimal inflammation. 1-3 mg/L is average CVD risk',
      high: 'Elevated CRP - >3 mg/L high CVD risk. >10 mg/L indicates acute inflammation (infection, autoimmune, malignancy)',
      criticalHigh: 'CRITICAL: Severe systemic inflammation - sepsis, severe infection, or inflammatory crisis',
    },
  },

  // ==========================================
  // RENAL FUNCTION EXTENDED
  // ==========================================
  {
    loincCode: '33914-3',
    testName: 'Estimated GFR',
    commonAliases: ['eGFR', 'Glomerular Filtration Rate'],
    unit: 'mL/min/1.73m2',
    gender: 'both',
    minAge: 18,
    normalMin: 90,
    normalMax: 120,
    criticalLow: 15,
    category: 'Renal',
    clinicalSignificance: 'Kidney function - CKD staging',
    interpretation: {
      low: 'Reduced GFR - CKD staging: G2 (60-89), G3a (45-59), G3b (30-44), G4 (15-29), G5 (<15 = kidney failure)',
      normal: 'Normal GFR (≥90) - Stage G1 CKD if albuminuria present, otherwise normal kidney function',
      high: 'Hyperfiltration - early diabetes or pregnancy',
      criticalLow: 'CRITICAL: Kidney failure (Stage 5 CKD) - dialysis or transplant needed',
    },
  },

  // ==========================================
  // ELECTROLYTES EXTENDED
  // ==========================================
  {
    loincCode: '2777-1',
    testName: 'Phosphate',
    commonAliases: ['Phosphorus', 'PO4'],
    unit: 'mg/dL',
    gender: 'both',
    minAge: 18,
    normalMin: 2.5,
    normalMax: 4.5,
    criticalLow: 1.0,
    criticalHigh: 8.0,
    category: 'Chemistry',
    clinicalSignificance: 'Bone metabolism and cellular energy',
    interpretation: {
      low: 'Hypophosphatemia - consider refeeding syndrome, alcoholism, DKA treatment, or hyperparathyroidism',
      normal: 'Normal phosphate - adequate bone and energy metabolism',
      high: 'Hyperphosphatemia - consider renal failure, hypoparathyroidism, tumor lysis syndrome, or rhabdomyolysis',
      criticalLow: 'CRITICAL: Severe hypophosphatemia - cardiac dysfunction, respiratory failure, seizures',
      criticalHigh: 'CRITICAL: Severe hyperphosphatemia - metastatic calcification risk',
    },
  },
  {
    loincCode: '17861-6',
    testName: 'Calcium',
    commonAliases: ['Ca', 'Serum Calcium'],
    unit: 'mg/dL',
    gender: 'both',
    minAge: 18,
    normalMin: 8.5,
    normalMax: 10.5,
    criticalLow: 6.5,
    criticalHigh: 13.0,
    category: 'Chemistry',
    clinicalSignificance: 'Bone health and neuromuscular function',
    interpretation: {
      low: 'Hypocalcemia - consider hypoparathyroidism, vitamin D deficiency, hypomagnesemia, or pancreatitis',
      normal: 'Normal calcium - adequate bone and neuromuscular function',
      high: 'Hypercalcemia - consider primary hyperparathyroidism, malignancy, vitamin D toxicity, or granulomatous disease',
      criticalLow: 'CRITICAL: Severe hypocalcemia - tetany, seizures, prolonged QT. Immediate IV calcium',
      criticalHigh: 'CRITICAL: Hypercalcemic crisis - confusion, renal failure, cardiac arrhythmias',
    },
  },
  {
    loincCode: '2601-3',
    testName: 'Magnesium',
    commonAliases: ['Mg'],
    unit: 'mg/dL',
    gender: 'both',
    minAge: 18,
    normalMin: 1.7,
    normalMax: 2.2,
    criticalLow: 1.0,
    criticalHigh: 4.0,
    category: 'Chemistry',
    clinicalSignificance: 'Cardiac and neuromuscular function',
    interpretation: {
      low: 'Hypomagnesemia - consider diuretics, diarrhea, PPI use, or alcoholism. Can cause hypokalemia and hypocalcemia',
      normal: 'Normal magnesium - adequate cardiac and neuromuscular function',
      high: 'Hypermagnesemia - consider renal failure or excessive supplementation',
      criticalLow: 'CRITICAL: Severe hypomagnesemia - arrhythmias, seizures',
      criticalHigh: 'CRITICAL: Severe hypermagnesemia - respiratory depression, cardiac arrest',
    },
  },
];

/**
 * Get reference range for a specific test based on patient demographics
 */
export function getReferenceRange(
  loincCode: string,
  patientAge: number,
  patientGender: 'M' | 'F' | 'MALE' | 'FEMALE' | string
): LabReferenceRange | null {
  // Normalize gender
  const normalizedGender = normalizeGender(patientGender);

  if (!normalizedGender) {
    console.warn(`Invalid gender: ${patientGender}`);
    return null;
  }

  // Find all matching ranges for this LOINC code
  const matchingRanges = REFERENCE_RANGES.filter((range) => {
    // Check LOINC code match
    if (range.loincCode !== loincCode) {
      return false;
    }

    // Check age range
    if (range.minAge !== undefined && patientAge < range.minAge) {
      return false;
    }
    if (range.maxAge !== undefined && patientAge > range.maxAge) {
      return false;
    }

    // Check gender match
    if (range.gender === 'both' || range.gender === normalizedGender) {
      return true;
    }

    return false;
  });

  // Return the most specific match (prefer gender-specific over 'both')
  if (matchingRanges.length === 0) {
    return null;
  }

  // Prioritize gender-specific ranges
  const genderSpecific = matchingRanges.find((r) => r.gender === normalizedGender);
  if (genderSpecific) {
    return genderSpecific;
  }

  // Fall back to 'both' gender
  return matchingRanges[0];
}

/**
 * Get reference range by test name (less reliable than LOINC code)
 */
export function getReferenceRangeByTestName(
  testName: string,
  patientAge: number,
  patientGender: 'M' | 'F' | 'MALE' | 'FEMALE' | string
): LabReferenceRange | null {
  const normalizedGender = normalizeGender(patientGender);

  if (!normalizedGender) {
    console.warn(`Invalid gender: ${patientGender}`);
    return null;
  }

  // Find by exact test name or alias
  const testNameLower = testName.toLowerCase().trim();

  const matchingRanges = REFERENCE_RANGES.filter((range) => {
    const rangeNameMatch = range.testName.toLowerCase() === testNameLower;
    const aliasMatch = range.commonAliases?.some(
      (alias) => alias.toLowerCase() === testNameLower
    );

    if (!rangeNameMatch && !aliasMatch) {
      return false;
    }

    // Check age range
    if (range.minAge !== undefined && patientAge < range.minAge) {
      return false;
    }
    if (range.maxAge !== undefined && patientAge > range.maxAge) {
      return false;
    }

    // Check gender match
    if (range.gender === 'both' || range.gender === normalizedGender) {
      return true;
    }

    return false;
  });

  if (matchingRanges.length === 0) {
    return null;
  }

  // Prioritize gender-specific ranges
  const genderSpecific = matchingRanges.find((r) => r.gender === normalizedGender);
  if (genderSpecific) {
    return genderSpecific;
  }

  return matchingRanges[0];
}

/**
 * Interpret a lab result value against its reference range
 */
export function interpretResult(
  value: number,
  range: LabReferenceRange
): 'critical-low' | 'low' | 'normal' | 'high' | 'critical-high' {
  // Check critical thresholds first
  if (range.criticalLow !== undefined && value <= range.criticalLow) {
    return 'critical-low';
  }
  if (range.criticalHigh !== undefined && value >= range.criticalHigh) {
    return 'critical-high';
  }

  // Check normal range
  if (value < range.normalMin) {
    return 'low';
  }
  if (value > range.normalMax) {
    return 'high';
  }

  return 'normal';
}

/**
 * Get clinical interpretation text for a result
 */
export function getInterpretationText(
  value: number,
  range: LabReferenceRange
): string {
  const interpretation = interpretResult(value, range);

  switch (interpretation) {
    case 'critical-low':
      return range.interpretation.criticalLow || range.interpretation.low;
    case 'low':
      return range.interpretation.low;
    case 'normal':
      return range.interpretation.normal;
    case 'high':
      return range.interpretation.high;
    case 'critical-high':
      return range.interpretation.criticalHigh || range.interpretation.high;
  }
}

/**
 * Normalize gender string to 'M' or 'F'
 */
function normalizeGender(gender: string): 'M' | 'F' | null {
  const genderUpper = gender?.toUpperCase().trim();

  if (genderUpper === 'M' || genderUpper === 'MALE') {
    return 'M';
  }
  if (genderUpper === 'F' || genderUpper === 'FEMALE') {
    return 'F';
  }

  return null;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Get all LOINC codes in the database
 */
export function getAllLoincCodes(): string[] {
  return Array.from(new Set(REFERENCE_RANGES.map((r) => r.loincCode))).sort();
}

/**
 * Get all test names for a specific category
 */
export function getTestsByCategory(category: string): LabReferenceRange[] {
  return REFERENCE_RANGES.filter((r) => r.category === category);
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  return Array.from(new Set(REFERENCE_RANGES.map((r) => r.category))).sort();
}

/**
 * Format reference range for display
 */
export function formatReferenceRange(range: LabReferenceRange): string {
  return `${range.normalMin}-${range.normalMax} ${range.unit}`;
}

/**
 * Validate if a LOINC code exists in our database
 */
export function isValidLoincCode(loincCode: string): boolean {
  return REFERENCE_RANGES.some((r) => r.loincCode === loincCode);
}

/**
 * Get test information by LOINC code (without demographic filtering)
 */
export function getTestInfoByLoincCode(loincCode: string): LabReferenceRange | null {
  return REFERENCE_RANGES.find((r) => r.loincCode === loincCode) || null;
}

/**
 * Statistics about the reference ranges database
 */
export function getDatabaseStats() {
  return {
    totalRanges: REFERENCE_RANGES.length,
    uniqueTests: new Set(REFERENCE_RANGES.map((r) => r.loincCode)).size,
    categories: getAllCategories(),
    categoryBreakdown: getAllCategories().map((cat) => ({
      category: cat,
      count: getTestsByCategory(cat).length,
    })),
  };
}
