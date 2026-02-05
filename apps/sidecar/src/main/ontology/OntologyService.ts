import Database from 'better-sqlite3';
import path from 'path';

interface DrugConcept {
    rxcui: string;
    name: string;
    tty: string;
}

interface InteractionResult {
    severity: 'High' | 'Moderate' | 'Low';
    description: string;
}

interface ContraindicationResult {
    sctid: string;
    severity: string;
    reason: string;
}

export class OntologyService {
    private db: Database.Database;

    constructor(dbPath?: string) {
        // Default to the standard location if not provided
        const targetPath = dbPath || path.join(__dirname, 'cortex-knowledge.db');
        console.log(`🔌 Initializing OntologyService with DB: ${targetPath}`);

        this.db = new Database(targetPath, {
            readonly: true, // Safety: The app should NEVER write to the Truth Anchor
            fileMustExist: true
        });
    }

    /**
     * Fast lookup: "Is this text a known drug?"
     * @param text Raw text from OCR (e.g., "Metformin 500 MG")
     */
    public findDrug(text: string): DrugConcept | null {
        // 1. Try exact match
        const stmt = this.db.prepare('SELECT rxcui, name, tty FROM rxnorm_concepts WHERE name = ? COLLATE NOCASE');
        const result = stmt.get(text) as DrugConcept | null;

        if (result) return result;

        // 2. Try partial match (fuzzy-ish) - simple LIKE for now
        // In production, we'd use FTS5 (Full Text Search)
        const partialStmt = this.db.prepare('SELECT rxcui, name, tty FROM rxnorm_concepts WHERE name LIKE ? COLLATE NOCASE LIMIT 1');
        return partialStmt.get(`%${text}%`) as DrugConcept | null;
    }

    /**
     * Fast lookup: "Is this text a known diagnosis?"
     */
    public findDiagnosis(text: string): string | null {
        const stmt = this.db.prepare('SELECT sctid FROM snomed_concepts WHERE term = ? COLLATE NOCASE');
        const result = stmt.get(text) as { sctid: string } | null;
        return result ? result.sctid : null;
    }

    /**
     * Check for Drug-Drug Interactions
     * @param rxcuiA First drug
     * @param rxcuiB Second drug
     */
    public checkInteraction(rxcuiA: string, rxcuiB: string): InteractionResult | null {
        // Check A -> B and B -> A (Interaction rules are symmetric generally, but we store specific pairs)
        // Our schema primary key (rxcui_a, rxcui_b) implies order mattering or we insert both.
        // For safety, query both directions.
        const stmt = this.db.prepare(`
      SELECT severity, description FROM interaction_rules 
      WHERE (rxcui_a = ? AND rxcui_b = ?) OR (rxcui_a = ? AND rxcui_b = ?)
    `);
        return stmt.get(rxcuiA, rxcuiB, rxcuiB, rxcuiA) as InteractionResult | null;
    }

    /**
     * Check for Contraindications (Drug vs. Disease)
     */
    public checkContraindication(rxcui: string, sctid: string): ContraindicationResult | null {
        const stmt = this.db.prepare(`
      SELECT sctid, severity, reason FROM contraindications
      WHERE rxcui = ? AND sctid = ?
    `);
        return stmt.get(rxcui, sctid) as ContraindicationResult | null;
    }

    public close() {
        this.db.close();
    }
}
