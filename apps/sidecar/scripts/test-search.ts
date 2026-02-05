import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../src/main/ontology/cortex-knowledge.db');
const db = new Database(DB_PATH);

console.log('🔎 Testing FTS5 Search Capabilities...');

// 1. Test Drug Search (Metformin)
const searchDrug = db.prepare(`
    SELECT * FROM rxnorm_search 
    WHERE name MATCH ? 
    ORDER BY rank
`);

// 2. Test Snippet Function (Highlighting)
const searchDrugSnippet = db.prepare(`
    SELECT rxcui, snippet(rxnorm_search, 0, '[', ']', '...', 5) as highlighted 
    FROM rxnorm_search 
    WHERE name MATCH ? 
    ORDER BY rank
`);

// 3. Test Function
function test(query: string) {
    console.log(`\nQuery: "${query}"`);
    try {
        const results = searchDrug.all(query);
        console.log(`Found ${results.length} matches.`);
        results.forEach(r => console.log(` - [${r.rxcui}] ${r.name}`));
    } catch (e) {
        console.error('Search failed:', e.message);
    }
}

// A. Exact Match
test('Metformin');

// B. Prefix Match (Typeahead)
test('Metfor*');

// C. Boolean
test('Metformin OR Sildenafil');

// D. SNOMED Search
console.log('\n--- SNOMED Search ---');
const searchDisease = db.prepare('SELECT * FROM snomed_search WHERE term MATCH ?');
const diseases = searchDisease.all('Diabetes');
console.log(`Found ${diseases.length} diseases for "Diabetes":`);
diseases.forEach(d => console.log(` - [${d.sctid}] ${d.term}`));
