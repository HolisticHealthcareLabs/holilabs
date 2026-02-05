import { OntologyService } from './OntologyService';

// ═══════════════════════════════════════════════════════════════════════════════
// ONTOLOGY INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationResult {
    isValid: boolean;
    confidence: number;
    source: 'SNOMED' | 'ICD-10' | 'RxNorm' | 'LOINC' | 'CPT' | 'NONE';
    concept?: any;
    issues?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class DeterministicValidator {
    private ontology: OntologyService;

    constructor() {
        this.ontology = new OntologyService();
    }

    /**
     * Validate a Diagnosis against SNOMED (via SQLite)
     */
    validateDiagnosis(text: string): ValidationResult {
        const sctid = this.ontology.findDiagnosis(text);

        if (sctid) {
            return {
                isValid: true,
                confidence: 100,
                source: 'SNOMED',
                concept: { id: sctid, term: text }
            };
        }

        return { isValid: false, confidence: 0, source: 'NONE' };
    }

    /**
     * Validate a Prescription against RxNorm and Check Contraindications (via SQLite)
     */
    validatePrescription(drugName: string, contextText: string): ValidationResult {
        const issues: string[] = [];

        // 1. Identify Drug
        const drug = this.ontology.findDrug(drugName);

        if (!drug) {
            // Drug not in our trusted list.
            // For V1, we might let this pass to the AI, or flag it.
            // We'll return neutral validity so AI can take over, but with low confidence.
            return { isValid: true, confidence: 0, source: 'NONE' };
        }

        // 2. Identify Contextual Conditions (Naive extraction for V1)
        // In reality, this would be a structured list of patient conditions.
        // We will scan the context text for known keywords that map to diseases in our DB.

        // TODO: This naive scan should be replaced by a proper entity extraction step.
        // For the prototype/synthetic data, we check for "Diabetes" and "Kidney" specific terms.
        const conditionsToCheck: string[] = [];
        if (contextText.toLowerCase().includes('diabetes') || contextText.toLowerCase().includes('dm')) {
            conditionsToCheck.push('Diabetes mellitus');
        }
        if (contextText.toLowerCase().includes('kidney') || contextText.toLowerCase().includes('renal')) {
            conditionsToCheck.push('Chronic kidney disease stage 5');
        }

        // 3. Check Contraindications
        for (const conditionTerm of conditionsToCheck) {
            const sctid = this.ontology.findDiagnosis(conditionTerm);
            if (sctid) {
                const contra = this.ontology.checkContraindication(drug.rxcui, sctid);
                if (contra) {
                    issues.push(`CONTRAINDICATION (${contra.severity}): ${drug.name} is contraindicated for ${conditionTerm} due to: ${contra.reason}`);
                }
            }
        }

        // 4. Check Interactions (Placeholder integration for demo)
        // Check for specific dangerous combinations if they appear in the text
        if (drug.name.toLowerCase().includes('sildenafil')) {
            if (contextText.toLowerCase().includes('nitroglycerin') || contextText.toLowerCase().includes('nitrate')) {
                // Look up Nitroglycerin
                const nitrate = this.ontology.findDrug('Nitroglycerin');
                if (nitrate) {
                    const interaction = this.ontology.checkInteraction(drug.rxcui, nitrate.rxcui);
                    if (interaction) {
                        issues.push(`FATAL INTERACTION (${interaction.severity}): ${interaction.description}`);
                    }
                }
            }
        }

        return {
            isValid: issues.length === 0,
            confidence: 100,
            source: 'RxNorm',
            concept: drug,
            issues: issues.length > 0 ? issues : undefined
        };
    }

    public close() {
        this.ontology.close();
    }
}
