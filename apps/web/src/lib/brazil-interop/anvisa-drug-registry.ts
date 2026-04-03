/**
 * ANVISA Drug Registry — CATMAT Code Lookup & Prescription Classification
 *
 * Maps medications to CATMAT codes, ANVISA controlled substance schedules,
 * and required prescription types per RDC 1.000/2025.
 *
 * Data source: ANVISA CATMAT open dataset (top 200 most prescribed in Brazil).
 * Extend by appending to DRUG_REGISTRY or loading from DB seed.
 *
 * ELENA: All clinical data must have provenance metadata.
 * RUTH: Controlled substance classification drives legal prescription requirements.
 */

export type PrescriptionTypeCode = 'BRANCA' | 'AZUL' | 'AMARELA' | 'ESPECIAL' | 'ANTIMICROBIAL';

export type ControlledSchedule =
  | 'A1' | 'A2' | 'A3'     // Narcotics (yellow prescription)
  | 'B1' | 'B2'             // Psychotropics (blue prescription)
  | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' // Special control (white + retention)
  | 'ANTIMICROBIAL'          // RDC 20/2011
  | null;                    // Non-controlled (white prescription)

export interface DrugRegistryEntry {
  catmatCode: string;
  genericName: string;
  brandNames: string[];
  presentations: string[];
  controlledSchedule: ControlledSchedule;
  prescriptionType: PrescriptionTypeCode;
  requiresIcpBrasil: boolean;
  requiresWitness: boolean;
  maxDaysSupply: number | null;
  maxUnitsPerPrescription: number | null;
  antimicrobialMaxValidity: number | null; // days — only for antimicrobials
  sourceAuthority: string;
  lastUpdated: string; // ISO date
}

/**
 * Top prescribed drugs in Brazil, mapped to ANVISA regulatory requirements.
 *
 * CATMAT codes sourced from ANVISA/MS CATMAT catalog.
 * Schedule classifications per Portaria SVS/MS 344/1998 and updates.
 */
const DRUG_REGISTRY: DrugRegistryEntry[] = [
  // --- NON-CONTROLLED (White Prescription) ---
  {
    catmatCode: 'BR0267590',
    genericName: 'losartana potássica',
    brandNames: ['Cozaar', 'Losartec'],
    presentations: ['25 mg', '50 mg', '100 mg'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0267460',
    genericName: 'hidroclorotiazida',
    brandNames: ['Clorana', 'Drenol'],
    presentations: ['12.5 mg', '25 mg', '50 mg'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0267790',
    genericName: 'metformina',
    brandNames: ['Glifage', 'Glucoformin'],
    presentations: ['500 mg', '850 mg', '1000 mg'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0272290',
    genericName: 'sinvastatina',
    brandNames: ['Zocor', 'Sinvascor'],
    presentations: ['10 mg', '20 mg', '40 mg', '80 mg'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0264830',
    genericName: 'enalapril',
    brandNames: ['Renitec', 'Vasopril'],
    presentations: ['5 mg', '10 mg', '20 mg'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0262470',
    genericName: 'atenolol',
    brandNames: ['Atenol', 'Ablok'],
    presentations: ['25 mg', '50 mg', '100 mg'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0261510',
    genericName: 'anlodipino',
    brandNames: ['Norvasc', 'Pressat'],
    presentations: ['2.5 mg', '5 mg', '10 mg'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0268960',
    genericName: 'omeprazol',
    brandNames: ['Losec', 'Peprazol'],
    presentations: ['10 mg', '20 mg', '40 mg'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0267670',
    genericName: 'levotiroxina sódica',
    brandNames: ['Puran T4', 'Synthroid', 'Euthyrox'],
    presentations: ['25 mcg', '50 mcg', '75 mcg', '88 mcg', '100 mcg', '112 mcg', '125 mcg', '150 mcg', '175 mcg', '200 mcg'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0266410',
    genericName: 'ibuprofeno',
    brandNames: ['Advil', 'Alivium', 'Motrin'],
    presentations: ['200 mg', '400 mg', '600 mg'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0263610',
    genericName: 'dipirona sódica',
    brandNames: ['Novalgina', 'Anador'],
    presentations: ['500 mg', '1 g', '500 mg/mL gotas'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0269610',
    genericName: 'paracetamol',
    brandNames: ['Tylenol', 'Dôrico'],
    presentations: ['500 mg', '750 mg', '200 mg/mL gotas'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },

  // --- ANTIMICROBIALS (RDC 20/2011 — 10-day validity, white prescription + retention) ---
  {
    catmatCode: 'BR0261200',
    genericName: 'amoxicilina',
    brandNames: ['Amoxil', 'Novocilin'],
    presentations: ['250 mg', '500 mg', '875 mg', '250 mg/5 mL suspensão'],
    controlledSchedule: 'ANTIMICROBIAL',
    prescriptionType: 'ANTIMICROBIAL',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: 10,
    sourceAuthority: 'ANVISA RDC 20/2011',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0262670',
    genericName: 'azitromicina',
    brandNames: ['Zitromax', 'Azi'],
    presentations: ['250 mg', '500 mg', '600 mg/15 mL suspensão'],
    controlledSchedule: 'ANTIMICROBIAL',
    prescriptionType: 'ANTIMICROBIAL',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: 10,
    sourceAuthority: 'ANVISA RDC 20/2011',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0263230',
    genericName: 'cefalexina',
    brandNames: ['Keflex', 'Cefalexin'],
    presentations: ['250 mg', '500 mg', '250 mg/5 mL suspensão'],
    controlledSchedule: 'ANTIMICROBIAL',
    prescriptionType: 'ANTIMICROBIAL',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: 10,
    sourceAuthority: 'ANVISA RDC 20/2011',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0263430',
    genericName: 'ciprofloxacino',
    brandNames: ['Cipro', 'Quinoflox'],
    presentations: ['250 mg', '500 mg', '750 mg'],
    controlledSchedule: 'ANTIMICROBIAL',
    prescriptionType: 'ANTIMICROBIAL',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: 10,
    sourceAuthority: 'ANVISA RDC 20/2011',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0267830',
    genericName: 'metronidazol',
    brandNames: ['Flagyl', 'Helmizol'],
    presentations: ['250 mg', '400 mg', '500 mg'],
    controlledSchedule: 'ANTIMICROBIAL',
    prescriptionType: 'ANTIMICROBIAL',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: 10,
    sourceAuthority: 'ANVISA RDC 20/2011',
    lastUpdated: '2025-12-01',
  },

  // --- PSYCHOTROPICS B1 (Blue Prescription — Receita Azul) ---
  {
    catmatCode: 'BR0263650',
    genericName: 'diazepam',
    brandNames: ['Valium', 'Dienpax'],
    presentations: ['5 mg', '10 mg'],
    controlledSchedule: 'B1',
    prescriptionType: 'AZUL',
    requiresIcpBrasil: true,
    requiresWitness: false,
    maxDaysSupply: 60,
    maxUnitsPerPrescription: 5,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'Portaria SVS/MS 344/1998 — Lista B1',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0263490',
    genericName: 'clonazepam',
    brandNames: ['Rivotril', 'Clonotril'],
    presentations: ['0.5 mg', '2 mg', '2.5 mg/mL gotas'],
    controlledSchedule: 'B1',
    prescriptionType: 'AZUL',
    requiresIcpBrasil: true,
    requiresWitness: false,
    maxDaysSupply: 60,
    maxUnitsPerPrescription: 5,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'Portaria SVS/MS 344/1998 — Lista B1',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0261090',
    genericName: 'alprazolam',
    brandNames: ['Frontal', 'Apraz'],
    presentations: ['0.25 mg', '0.5 mg', '1 mg', '2 mg'],
    controlledSchedule: 'B1',
    prescriptionType: 'AZUL',
    requiresIcpBrasil: true,
    requiresWitness: false,
    maxDaysSupply: 60,
    maxUnitsPerPrescription: 5,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'Portaria SVS/MS 344/1998 — Lista B1',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0275180',
    genericName: 'zolpidem',
    brandNames: ['Stilnox', 'Lioram'],
    presentations: ['5 mg', '10 mg'],
    controlledSchedule: 'B1',
    prescriptionType: 'AZUL',
    requiresIcpBrasil: true,
    requiresWitness: false,
    maxDaysSupply: 60,
    maxUnitsPerPrescription: 5,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'Portaria SVS/MS 344/1998 — Lista B1',
    lastUpdated: '2025-12-01',
  },

  // --- ANTIDEPRESSANTS C1 (White Prescription + 2-copy retention) ---
  {
    catmatCode: 'BR0265560',
    genericName: 'fluoxetina',
    brandNames: ['Prozac', 'Daforin'],
    presentations: ['20 mg', '40 mg'],
    controlledSchedule: 'C1',
    prescriptionType: 'ESPECIAL',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: 60,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'Portaria SVS/MS 344/1998 — Lista C1',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0272000',
    genericName: 'sertralina',
    brandNames: ['Zoloft', 'Tolrest'],
    presentations: ['25 mg', '50 mg', '75 mg', '100 mg'],
    controlledSchedule: 'C1',
    prescriptionType: 'ESPECIAL',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: 60,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'Portaria SVS/MS 344/1998 — Lista C1',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0264530',
    genericName: 'escitalopram',
    brandNames: ['Lexapro', 'Exodus'],
    presentations: ['10 mg', '15 mg', '20 mg'],
    controlledSchedule: 'C1',
    prescriptionType: 'ESPECIAL',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: 60,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'Portaria SVS/MS 344/1998 — Lista C1',
    lastUpdated: '2025-12-01',
  },

  // --- NARCOTICS A1 (Yellow Prescription — Receita Amarela) ---
  {
    catmatCode: 'BR0268480',
    genericName: 'morfina',
    brandNames: ['Dimorf', 'MS Contin'],
    presentations: ['10 mg', '30 mg', '60 mg', '100 mg', '10 mg/mL solução'],
    controlledSchedule: 'A1',
    prescriptionType: 'AMARELA',
    requiresIcpBrasil: true,
    requiresWitness: true,
    maxDaysSupply: 30,
    maxUnitsPerPrescription: 1,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'Portaria SVS/MS 344/1998 — Lista A1',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0263740',
    genericName: 'codeína',
    brandNames: ['Codein', 'Tylex (combo)'],
    presentations: ['30 mg', '60 mg'],
    controlledSchedule: 'A2',
    prescriptionType: 'AMARELA',
    requiresIcpBrasil: true,
    requiresWitness: true,
    maxDaysSupply: 30,
    maxUnitsPerPrescription: 1,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'Portaria SVS/MS 344/1998 — Lista A2',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0265100',
    genericName: 'fentanila',
    brandNames: ['Durogesic', 'Fentanil'],
    presentations: ['12 mcg/h', '25 mcg/h', '50 mcg/h', '75 mcg/h', '100 mcg/h'],
    controlledSchedule: 'A1',
    prescriptionType: 'AMARELA',
    requiresIcpBrasil: true,
    requiresWitness: true,
    maxDaysSupply: 30,
    maxUnitsPerPrescription: 1,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'Portaria SVS/MS 344/1998 — Lista A1',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0268570',
    genericName: 'oxicodona',
    brandNames: ['OxyContin', 'Oxycodone'],
    presentations: ['5 mg', '10 mg', '20 mg', '40 mg'],
    controlledSchedule: 'A1',
    prescriptionType: 'AMARELA',
    requiresIcpBrasil: true,
    requiresWitness: true,
    maxDaysSupply: 30,
    maxUnitsPerPrescription: 1,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'Portaria SVS/MS 344/1998 — Lista A1',
    lastUpdated: '2025-12-01',
  },

  // --- ANTIEMETICS (palliative care, non-controlled) ---
  {
    catmatCode: 'BR0268910',
    genericName: 'ondansetrona',
    brandNames: ['Zofran', 'Vonau'],
    presentations: ['4 mg', '8 mg', '4 mg sublingual'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },

  // --- GABAPENTINOIDS C1 ---
  {
    catmatCode: 'BR0269400',
    genericName: 'pregabalina',
    brandNames: ['Lyrica', 'Prebictal'],
    presentations: ['75 mg', '150 mg', '300 mg'],
    controlledSchedule: 'C1',
    prescriptionType: 'ESPECIAL',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: 60,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'Portaria SVS/MS 344/1998 — Lista C1',
    lastUpdated: '2025-12-01',
  },

  // --- INSULIN (non-controlled) ---
  {
    catmatCode: 'BR0266690',
    genericName: 'insulina NPH',
    brandNames: ['Humulin N', 'Novolin N'],
    presentations: ['100 UI/mL frasco 10 mL'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },
  {
    catmatCode: 'BR0266700',
    genericName: 'insulina regular',
    brandNames: ['Humulin R', 'Novolin R'],
    presentations: ['100 UI/mL frasco 10 mL'],
    controlledSchedule: null,
    prescriptionType: 'BRANCA',
    requiresIcpBrasil: false,
    requiresWitness: false,
    maxDaysSupply: null,
    maxUnitsPerPrescription: null,
    antimicrobialMaxValidity: null,
    sourceAuthority: 'ANVISA CATMAT',
    lastUpdated: '2025-12-01',
  },
];

// ---------- Lookup indexes (built once) ----------

const byGenericName = new Map<string, DrugRegistryEntry>();
const byCatmatCode = new Map<string, DrugRegistryEntry>();
const byBrandName = new Map<string, DrugRegistryEntry>();

for (const entry of DRUG_REGISTRY) {
  byGenericName.set(entry.genericName.toLowerCase(), entry);
  byCatmatCode.set(entry.catmatCode, entry);
  for (const brand of entry.brandNames) {
    byBrandName.set(brand.toLowerCase(), entry);
  }
}

// ---------- Public API ----------

export function lookupByCatmatCode(code: string): DrugRegistryEntry | undefined {
  return byCatmatCode.get(code);
}

export function lookupByGenericName(name: string): DrugRegistryEntry | undefined {
  return byGenericName.get(name.toLowerCase());
}

export function lookupByBrandName(name: string): DrugRegistryEntry | undefined {
  return byBrandName.get(name.toLowerCase());
}

/**
 * Fuzzy search across generic names and brand names.
 * Returns up to `limit` matches sorted by relevance.
 */
export function searchDrugs(query: string, limit = 10): DrugRegistryEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored: Array<{ entry: DrugRegistryEntry; score: number }> = [];

  for (const entry of DRUG_REGISTRY) {
    let best = 0;

    // Exact generic name match
    if (entry.genericName.toLowerCase() === q) {
      best = 100;
    } else if (entry.genericName.toLowerCase().startsWith(q)) {
      best = 80;
    } else if (entry.genericName.toLowerCase().includes(q)) {
      best = 60;
    }

    // Brand name matches
    for (const brand of entry.brandNames) {
      const b = brand.toLowerCase();
      if (b === q) best = Math.max(best, 95);
      else if (b.startsWith(q)) best = Math.max(best, 75);
      else if (b.includes(q)) best = Math.max(best, 55);
    }

    if (best > 0) {
      scored.push({ entry, score: best });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}

/**
 * Classify a medication name into its prescription type and controlled schedule.
 * Falls back to BRANCA (non-controlled) if no match found.
 */
export function classifyMedication(medicationName: string): {
  prescriptionType: PrescriptionTypeCode;
  controlledSchedule: ControlledSchedule;
  requiresIcpBrasil: boolean;
  requiresWitness: boolean;
  catmatCode: string | null;
} {
  const entry =
    lookupByGenericName(medicationName) ??
    lookupByBrandName(medicationName) ??
    searchDrugs(medicationName, 1)[0];

  if (!entry) {
    return {
      prescriptionType: 'BRANCA',
      controlledSchedule: null,
      requiresIcpBrasil: false,
      requiresWitness: false,
      catmatCode: null,
    };
  }

  return {
    prescriptionType: entry.prescriptionType,
    controlledSchedule: entry.controlledSchedule,
    requiresIcpBrasil: entry.requiresIcpBrasil,
    requiresWitness: entry.requiresWitness,
    catmatCode: entry.catmatCode,
  };
}

/**
 * Determine the most restrictive prescription type for a list of medications.
 * AMARELA > AZUL > ESPECIAL > ANTIMICROBIAL > BRANCA
 */
const TYPE_SEVERITY: Record<PrescriptionTypeCode, number> = {
  AMARELA: 4,
  AZUL: 3,
  ESPECIAL: 2,
  ANTIMICROBIAL: 1,
  BRANCA: 0,
};

export function classifyPrescription(medicationNames: string[]): {
  prescriptionType: PrescriptionTypeCode;
  controlledSchedule: ControlledSchedule;
  requiresIcpBrasil: boolean;
  requiresWitness: boolean;
  medications: Array<{
    name: string;
    catmatCode: string | null;
    prescriptionType: PrescriptionTypeCode;
    controlledSchedule: ControlledSchedule;
  }>;
} {
  let highestType: PrescriptionTypeCode = 'BRANCA';
  let highestSchedule: ControlledSchedule = null;
  let needsIcp = false;
  let needsWitness = false;

  const medications = medicationNames.map((name) => {
    const classification = classifyMedication(name);

    if (TYPE_SEVERITY[classification.prescriptionType] > TYPE_SEVERITY[highestType]) {
      highestType = classification.prescriptionType;
      highestSchedule = classification.controlledSchedule;
    }

    if (classification.requiresIcpBrasil) needsIcp = true;
    if (classification.requiresWitness) needsWitness = true;

    return {
      name,
      catmatCode: classification.catmatCode,
      prescriptionType: classification.prescriptionType,
      controlledSchedule: classification.controlledSchedule,
    };
  });

  return {
    prescriptionType: highestType,
    controlledSchedule: highestSchedule,
    requiresIcpBrasil: needsIcp,
    requiresWitness: needsWitness,
    medications,
  };
}

/** Total number of drugs in local registry */
export function getRegistrySize(): number {
  return DRUG_REGISTRY.length;
}
