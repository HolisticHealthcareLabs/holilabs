import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../src/main/ontology/cortex-knowledge.db');
const SCHEMA_PATH = path.join(__dirname, '../src/main/ontology/osmosis.sql');

async function main() {
    console.log('🧪 Starting Synthetic Hydration (Architecture Validation Mode)...');

    // 1. Initialize Database
    // Ensure directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log(`📂 Opening Knowledge Base: ${DB_PATH}`);
    const db = new Database(DB_PATH);

    // 2. Apply Schema
    console.log('🏗️  Applying Truth Schema (Osmosis)...');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
    console.log('✅ Schema applied.');

    // 3. Inject Synthetic Data (The "Golden Path" Test Cases)
    console.log('💉 Injecting Synthetic Reference Data...');

    // 3. Inject Synthetic Data (The "Golden Path" Test Cases)
    console.log('💉 Injecting Synthetic Reference Data...');

    const insertDrug = db.prepare('INSERT OR REPLACE INTO rxnorm_concepts (rxcui, name, tty) VALUES (?, ?, ?)');
    const insertDrugSearch = db.prepare('INSERT INTO rxnorm_search (rxcui, name) VALUES (?, ?)'); // FTS5

    const insertDisease = db.prepare('INSERT OR REPLACE INTO snomed_concepts (sctid, term) VALUES (?, ?)');
    const insertDiseaseSearch = db.prepare('INSERT INTO snomed_search (sctid, term) VALUES (?, ?)'); // FTS5

    const insertContraindication = db.prepare('INSERT OR REPLACE INTO contraindications (rxcui, sctid, severity, reason) VALUES (?, ?, ?, ?)');
    const insertInteraction = db.prepare('INSERT OR REPLACE INTO interaction_rules (rxcui_a, rxcui_b, severity, description) VALUES (?, ?, ?, ?)');

    const transaction = db.transaction(() => {
        // A. Concepts: Metformin (Diabetes Drug)
        insertDrug.run('860975', 'Metformin 500 MG Oral Tablet', 'SCD');
        insertDrugSearch.run('860975', 'Metformin 500 MG Oral Tablet');

        insertDrug.run('6809', 'Metformin', 'IN'); // Ingredient
        insertDrugSearch.run('6809', 'Metformin');

        // B. Concepts: Sildenafil (Viagra) - Interaction Case
        insertDrug.run('123456', 'Sildenafil 50 MG', 'SCD');
        insertDrugSearch.run('123456', 'Sildenafil 50 MG');

        // C. Concepts: Nitroglycerin (Heart Med) - Interaction Case
        insertDrug.run('987654', 'Nitroglycerin', 'IN');
        insertDrugSearch.run('987654', 'Nitroglycerin');

        // D. Diseases: Type 2 Diabetes
        insertDisease.run('44054006', 'Type 2 diabetes mellitus');
        insertDiseaseSearch.run('44054006', 'Type 2 diabetes mellitus');

        insertDisease.run('73211009', 'Diabetes mellitus');
        insertDiseaseSearch.run('73211009', 'Diabetes mellitus');

        // E. Diseases: Heart Failure
        insertDisease.run('84114007', 'Heart failure');
        insertDiseaseSearch.run('84114007', 'Heart failure');

        // F. Rule: Metformin is GOOD for Diabetes (No contraindication, but maybe we track indications later)
        // Rule: Metformin is BAD for specific kidney issues (Mocking a contraindication for demonstration)
        insertDisease.run('431855005', 'Chronic kidney disease stage 5');
        insertDiseaseSearch.run('431855005', 'Chronic kidney disease stage 5');

        insertContraindication.run('860975', '431855005', 'Absolute', 'Risk of lactic acidosis accumulation');

        // G. Rule: Sildenafil + Nitroglycerin = DEADLY
        insertInteraction.run('123456', '987654', 'High', 'Severe hypotension (fatal drop in blood pressure)');
    });

    transaction();

    console.log('✅ Synthetic Data Injected.');
    console.log('   - Metformin (860975)');
    console.log('   - Diabetes (44054006)');
    console.log('   - CKD Stage 5 (431855005) [Contraindicated with Metformin]');
    console.log('   - Sildenafil + Nitrates [High Severity Interaction]');

    console.log('🚀 Knowledge Base Ready for Testing.');
    db.close();
}

main().catch(console.error);
