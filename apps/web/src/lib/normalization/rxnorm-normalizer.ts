/**
 * RxNorm Normalizer (Security Hardening)
 * --------------------------------------
 * Replaces brittle "string-includes" logic with targeted Concept lookup.
 * 
 * In a full production environment, this would query a local vector DB or
 * the UMLS API. For this High-Fidelity Prototype, we use a comprehensive
 * in-memory lookup map for critical path medications.
 */

export interface NormalizedDrug {
    conceptId: string; // RxNorm CUI (e.g., '8640')
    name: string;      // Generic Name (e.g., 'Metoprolol')
    classes: string[]; // Drug Classes (e.g., ['Beta-blocker', 'Antihypertensive'])
}

// The "Hardened Dictionary"
// Maps Brand Names, Synonyms, and Generics to Concepts
const CONCEPT_MAP: Record<string, NormalizedDrug> = {
    // BETA BLOCKERS
    'metoprolol': { conceptId: '6918', name: 'Metoprolol', classes: ['Beta-blocker', 'Cardioselective Beta-blocker'] },
    'toprol': { conceptId: '6918', name: 'Metoprolol', classes: ['Beta-blocker', 'Cardioselective Beta-blocker'] },
    'toprol-xl': { conceptId: '6918', name: 'Metoprolol', classes: ['Beta-blocker', 'Cardioselective Beta-blocker'] },
    'lopressor': { conceptId: '6918', name: 'Metoprolol', classes: ['Beta-blocker', 'Cardioselective Beta-blocker'] },
    'propranolol': { conceptId: '8787', name: 'Propranolol', classes: ['Beta-blocker', 'Non-selective Beta-blocker'] },
    'inderal': { conceptId: '8787', name: 'Propranolol', classes: ['Beta-blocker', 'Non-selective Beta-blocker'] },

    // ANTIBIOTICS (Penicillins)
    'penicillin': { conceptId: '70618', name: 'Penicillin', classes: ['Penicillin', 'Beta-lactam'] },
    'amoxicillin': { conceptId: '723', name: 'Amoxicillin', classes: ['Penicillin', 'Beta-lactam'] },
    'amoxil': { conceptId: '723', name: 'Amoxicillin', classes: ['Penicillin', 'Beta-lactam'] },
    'augmentin': { conceptId: '10660', name: 'Amoxicillin / Clavulanate', classes: ['Penicillin', 'Beta-lactam'] },
    'ampicillin': { conceptId: '733', name: 'Ampicillin', classes: ['Penicillin', 'Beta-lactam'] },

    // NSAIDS
    'ibuprofen': { conceptId: '5640', name: 'Ibuprofen', classes: ['NSAID', 'Analgesic'] },
    'advil': { conceptId: '5640', name: 'Ibuprofen', classes: ['NSAID', 'Analgesic'] },
    'motrin': { conceptId: '5640', name: 'Ibuprofen', classes: ['NSAID', 'Analgesic'] },
    'naproxen': { conceptId: '7258', name: 'Naproxen', classes: ['NSAID', 'Analgesic'] },
    'aleve': { conceptId: '7258', name: 'Naproxen', classes: ['NSAID', 'Analgesic'] },
    'aspirin': { conceptId: '1191', name: 'Aspirin', classes: ['NSAID', 'Antiplatelet'] },

    // ANTICOAGULANTS
    'warfarin': { conceptId: '11289', name: 'Warfarin', classes: ['Anticoagulant', 'Vitamin K Antagonist'] },
    'coumadin': { conceptId: '11289', name: 'Warfarin', classes: ['Anticoagulant', 'Vitamin K Antagonist'] },
    'janloven': { conceptId: '11289', name: 'Warfarin', classes: ['Anticoagulant', 'Vitamin K Antagonist'] },

    // PDE5 INHIBITORS
    'sildenafil': { conceptId: '360357', name: 'Sildenafil', classes: ['PDE5 Inhibitor'] },
    'viagra': { conceptId: '360357', name: 'Sildenafil', classes: ['PDE5 Inhibitor'] },
    'tadalafil': { conceptId: '330366', name: 'Tadalafil', classes: ['PDE5 Inhibitor'] },
    'cialis': { conceptId: '330366', name: 'Tadalafil', classes: ['PDE5 Inhibitor'] },

    // NITRATES
    'nitroglycerin': { conceptId: '4917', name: 'Nitroglycerin', classes: ['Nitrate', 'Vasodilator'] },
    'nitrostat': { conceptId: '4917', name: 'Nitroglycerin', classes: ['Nitrate', 'Vasodilator'] },
    'isosorbide': { conceptId: '6054', name: 'Isosorbide', classes: ['Nitrate', 'Vasodilator'] }
};

export class RxNormNormalizer {
    /**
     * Normalize a raw text string into a structured Drug Concept
     * Returns NULL if no match found (Fail Safe).
     */
    static normalize(text: string): NormalizedDrug | null {
        // 1. Clean input
        const clean = text.toLowerCase().trim();

        // 2. Exact match lookup (Fastest)
        if (CONCEPT_MAP[clean]) {
            return CONCEPT_MAP[clean];
        }

        // 3. Substring / Token matching (Heuristic)
        // Splits "Toprol XL 50mg" -> ["toprol", "xl", "50mg"]
        const tokens = clean.split(/[\s-]+/); // Split on space or dash

        for (const token of tokens) {
            // Check each token against dictionary
            // This allows identifying "Toprol" inside "Prescribe Toprol please"
            if (CONCEPT_MAP[token]) {
                return CONCEPT_MAP[token];
            }
        }

        return null;
    }

    /**
     * Check if a raw text mentions a drug belonging to a specific class.
     * e.g. "Toprol" belongs to "Beta-blocker" -> TRUE
     */
    static matchesClass(rawText: string, targetClasses: string[]): boolean {
        const drug = this.normalize(rawText);
        if (!drug) return false;

        return drug.classes.some(cls => targetClasses.includes(cls));
    }
}
