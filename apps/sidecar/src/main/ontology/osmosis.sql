-- ═══════════════════════════════════════════════════════════════════════════════
-- CORTEX KNOWLEDGE BASE SCHEMA (THE TRUST ANCHOR)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Version: 1.0 (Synthetic/Production Ready)
-- Architecture: Local Embedded SQLite (Zero Latency)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. DRUG CONCEPTS (RxNorm)
-- Maps raw text from OCR ("Metformin 500mg") to normalized IDs (RxCUI).
CREATE TABLE IF NOT EXISTS rxnorm_concepts (
    rxcui TEXT PRIMARY KEY,        -- The unique RxNorm ID (e.g., "860975")
    name TEXT NOT NULL,            -- The clinical drug name (e.g., "Metformin 500 MG Oral Tablet")
    tty TEXT,                      -- Term Type (SCD = Semantic Clinical Drug, BN = Brand Name)
    active INTEGER DEFAULT 1       -- Is this code still valid?
);

-- Index for fast text lookups from OCR
CREATE INDEX IF NOT EXISTS idx_rxnorm_name ON rxnorm_concepts(name);

-- 1b. FULL TEXT SEARCH (FTS5) for Drugs
-- Enables extremely fast fuzzy matching ("metform" -> "Metformin")
-- content='rxnorm_concepts' means it's an external content table (saves space) but for simplicity we keep separate for now.
CREATE VIRTUAL TABLE IF NOT EXISTS rxnorm_search USING fts5(
    name, 
    rxcui UNINDEXED
);

-- 2. DRUG INGREDIENTS
-- Maps a finished drug (Metformin 500mg) to its active ingredient (Metformin).
-- Essential for allergy checks (Patient allergic to "Cillin" -> Flag "Amoxicillin").
CREATE TABLE IF NOT EXISTS rxnorm_ingredients (
    drug_rxcui TEXT NOT NULL,      -- The drug (e.g., "860975")
    ingredient_rxcui TEXT NOT NULL,-- The ingredient (e.g., "6809" for Metformin)
    PRIMARY KEY (drug_rxcui, ingredient_rxcui),
    FOREIGN KEY (drug_rxcui) REFERENCES rxnorm_concepts(rxcui)
);

-- 3. INTERACTION RULES (The "Hard Brakes")
-- Binary rules: Drug A + Drug B = Danger Level X.
CREATE TABLE IF NOT EXISTS interaction_rules (
    rxcui_a TEXT NOT NULL,
    rxcui_b TEXT NOT NULL,
    severity TEXT CHECK(severity IN ('High', 'Moderate', 'Low')),
    description TEXT,              -- "Risk of lactic acidosis"
    source TEXT DEFAULT 'RxNav',   -- Where did this rule come from?
    PRIMARY KEY (rxcui_a, rxcui_b)
);

-- 4. CLINICAL FINDINGS (SNOMED-CT)
-- Maps diagnoses and findings to SCTID.
CREATE TABLE IF NOT EXISTS snomed_concepts (
    sctid TEXT PRIMARY KEY,        -- SNOMED CT Identifier
    term TEXT NOT NULL,            -- "Type 2 diabetes mellitus"
    active INTEGER DEFAULT 1
);

-- Index for fast diagnosis lookups
CREATE INDEX IF NOT EXISTS idx_snomed_term ON snomed_concepts(term);

-- 4b. FULL TEXT SEARCH (FTS5) for Diseases
-- Enables fast lookup for "Diabetes" -> "Type 2 diabetes mellitus"
CREATE VIRTUAL TABLE IF NOT EXISTS snomed_search USING fts5(
    term, 
    sctid UNINDEXED
);

-- 5. CONTRAINDICATIONS (The "Universal Rules")
-- Links a Drug (RxNorm) to a Disease (SNOMED-CT) that it worsens.
CREATE TABLE IF NOT EXISTS contraindications (
    rxcui TEXT NOT NULL,           -- Drug
    sctid TEXT NOT NULL,           -- Disease
    severity TEXT NOT NULL,        -- "Absolute" or "Relative"
    reason TEXT,                   -- "Increases risk of heart failure"
    PRIMARY KEY (rxcui, sctid)
);

-- 6. METADATA
-- Tracks schema version and hydration status.
CREATE TABLE IF NOT EXISTS meta_info (
    key TEXT PRIMARY KEY,
    value TEXT
);

INSERT OR IGNORE INTO meta_info (key, value) VALUES ('schema_version', '1.0');
