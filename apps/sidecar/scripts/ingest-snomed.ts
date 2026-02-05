import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import readline from 'readline';

// CONFIGURATION
// SNOMED is distributed as a deeply nested zip, usually users extract it.
// We look for the "Snapshot" folder.
const DB_PATH = path.join(__dirname, '../src/main/ontology/cortex-knowledge.db');
const SNOMED_DIR = process.env.SNOMED_PATH || path.join(__dirname, '../data/snomed');

async function main() {
    console.log('🧬 Starting SNOMED-CT Ingestion Pipeline...');

    // 1. Locate the Description Snapshot file
    // Pattern: sct2_Description_Snapshot-en_US_...txt
    if (!fs.existsSync(SNOMED_DIR)) {
        console.error(`❌ SNOMED Directory not found: ${SNOMED_DIR}`);
        process.exit(1);
    }

    // Find the file
    const files = fs.readdirSync(SNOMED_DIR, { recursive: true }) as string[];
    const descFile = files.find(f => f.includes('sct2_Description_Snapshot') && f.endsWith('.txt'));

    if (!descFile) {
        console.error('❌ Could not find "sct2_Description_Snapshot" file in the provided directory.');
        process.exit(1);
    }

    const fullPath = path.join(SNOMED_DIR, descFile);
    console.log(`📂 Found Snapshot: ${descFile}`);

    const db = new Database(DB_PATH);

    // 2. Prepare SQL
    const insertConcept = db.prepare(`
        INSERT OR IGNORE INTO snomed_concepts (sctid, term, active) 
        VALUES (?, ?, ?)
    `);

    const insertSearch = db.prepare(`
        INSERT INTO snomed_search (sctid, term) 
        VALUES (?, ?)
    `);

    // 3. Process
    // RF2 Format (Tab separated):
    // id	effectiveTime	active	moduleId	conceptId	languageCode	typeId	term	caseSignificanceId
    // 0    1               2       3           4           5             6       7       8

    const BATCH_SIZE = 10000;
    let batch = [];

    const processBatch = db.transaction((rows) => {
        for (const row of rows) {
            // Check active=1
            insertConcept.run(row.conceptId, row.term, 1);
            insertSearch.run(row.conceptId, row.term);
        }
    });

    console.log('🚀 Reading SNOMED Snapshot (this is huge)...');

    const fileStream = fs.createReadStream(fullPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    let isHeader = true;

    for await (const line of rl) {
        if (isHeader) {
            isHeader = false;
            continue;
        }

        const parts = line.split('\t');

        // Filter: Active = 1, Language = 'en'
        const active = parts[2];
        const lang = parts[5];

        if (active === '1' && lang === 'en') {
            const conceptId = parts[4];
            const term = parts[7];

            // Only create entries for the Fully Specified Name (FSN) or Synonym?
            // Currently typeId '900000000000003001' is FSN.
            // But we probably want ALL active synonyms for search.

            batch.push({ conceptId, term });
            count++;

            if (batch.length >= BATCH_SIZE) {
                processBatch(batch);
                batch = [];
                process.stdout.write(`\r   Processed ${count.toLocaleString()} concepts...`);
            }
        }
    }

    if (batch.length > 0) {
        processBatch(batch);
    }

    console.log(`\n✅ Ingestion Complete! Imported ${count.toLocaleString()} concepts.`);
    console.log('   Running Optimize...');
    db.exec('INSERT INTO snomed_search(snomed_search) VALUES("optimize");');

    db.close();
}

main().catch(console.error);
