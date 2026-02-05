import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import readline from 'readline';

// CONFIGURATION
const DB_PATH = path.join(__dirname, '../src/main/ontology/cortex-knowledge.db');
const RRF_DIR = process.env.RXNORM_PATH || path.join(__dirname, '../data/rxnorm'); // User must provide this

async function main() {
    console.log('💊 Starting RxNorm Ingestion Pipeline...');

    // 1. Check for Data
    const consofPath = path.join(RRF_DIR, 'RXNCONSO.RRF');
    if (!fs.existsSync(consofPath)) {
        console.error(`❌ RxNorm RXNCONSO.RRF not found at: ${consofPath}`);
        console.error('   Please download the full RxNorm release from UMLS and place schema files in data/rxnorm/');
        process.exit(1);
    }

    const db = new Database(DB_PATH);

    // 2. Prepare Statements
    // We only want English, Active, Clinical Drugs
    console.log('⚙️  Preparing SQL statements...');

    // RXNCONSO Format (Pipe separated):
    // RXCUI|LAT|TS|LUI|STT|SUI|ISPREF|RXAUI|SAUI|SCUI|SDUI|SAB|TTY|CODE|STR|...
    // 0     1   2  3   4   5   6      7     8    9    10   11  12  13   14

    const insertConcept = db.prepare(`
        INSERT OR IGNORE INTO rxnorm_concepts (rxcui, name, tty) 
        VALUES (?, ?, ?)
    `);

    const insertSearch = db.prepare(`
        INSERT INTO rxnorm_search (rxcui, name) 
        VALUES (?, ?)
    `);

    // 3. Stream Process
    // Use transaction batches for speed
    const BATCH_SIZE = 10000;
    let batch = [];

    const processBatch = db.transaction((rows) => {
        for (const row of rows) {
            insertConcept.run(row.rxcui, row.str, row.tty);
            insertSearch.run(row.rxcui, row.str);
        }
    });

    console.log('🚀 Reading RXNCONSO.RRF (this may take a while)...');

    const fileStream = fs.createReadStream(consofPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        const parts = line.split('|');
        // Filter: SAB=RXNORM, LAT=ENG
        // Index 11 = SAB, Index 1 = LAT
        if (parts[11] === 'RXNORM' && parts[1] === 'ENG') {
            const rxcui = parts[0];
            const tty = parts[12]; // SCD (Semantic Clinical Drug), SBD (Semantic Branded Drug), IN (Ingredient)
            const str = parts[14]; // The name

            // Optional: Filter for only useful types to keep DB small?
            // For now, take everything from RxNorm

            batch.push({ rxcui, str, tty });
            count++;

            if (batch.length >= BATCH_SIZE) {
                processBatch(batch);
                batch = [];
                process.stdout.write(`\r   Processed ${count.toLocaleString()} concepts...`);
            }
        }
    }

    // Final batch
    if (batch.length > 0) {
        processBatch(batch);
    }

    console.log(`\n✅ Ingestion Complete! Imported ${count.toLocaleString()} concepts.`);
    console.log('   Running Optimize...');
    db.exec('INSERT INTO rxnorm_search(rxnorm_search) VALUES("optimize");');

    db.close();
}

main().catch(console.error);
