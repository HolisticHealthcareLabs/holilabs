/**
 * SNOMED Crosswalk Coverage Validation Test
 *
 * Reads snomed-crosswalk.json and all 7 country procedure-codes JSONs,
 * then validates referential integrity, coverage, and data quality.
 *
 * Run: cd apps/web && pnpm exec jest --config ../../scripts/billing/__tests__/jest.config.cjs validate-crosswalk-coverage
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../../data/master');

interface Mapping {
  country: string;
  code: string;
  system: string;
  mappingType: string;
  confidence: number;
}

interface SnomedConcept {
  snomedConceptId: string;
  snomedFsn: string;
  mappings: Mapping[];
}

interface CrosswalkFile {
  meta: { version: string; source: string; createdAt: string };
  mappings: SnomedConcept[];
}

interface ProcedureCode {
  code: string;
  system: string;
  country: string;
  [key: string]: unknown;
}

interface ProcedureCodeFile {
  meta: Record<string, unknown>;
  codes: ProcedureCode[];
}

const COUNTRIES = ['BR', 'AR', 'BO', 'US', 'CA', 'CO', 'MX'] as const;

const PROCEDURE_CODE_FILES: Record<string, string> = {
  BR: 'procedure-codes/tuss-expanded.json',
  AR: 'procedure-codes/nomenclador-argentina.json',
  BO: 'procedure-codes/cns-bolivia.json',
  US: 'procedure-codes/cpt-united-states.json',
  CA: 'procedure-codes/cci-ohip-canada.json',
  CO: 'procedure-codes/cups-colombia.json',
  MX: 'procedure-codes/cie9mc-causes-mexico.json',
};

const VALID_MAPPING_TYPES = ['EXACT', 'BROAD', 'NARROW', 'APPROXIMATE'];

let crosswalk: CrosswalkFile;
let codesByCountry: Record<string, Set<string>>;

beforeAll(() => {
  // Load crosswalk
  const crosswalkPath = path.join(DATA_DIR, 'procedure-codes/snomed-crosswalk.json');
  crosswalk = JSON.parse(fs.readFileSync(crosswalkPath, 'utf-8'));

  // Load all procedure codes indexed by country → set of codes
  codesByCountry = {};
  for (const [country, filePath] of Object.entries(PROCEDURE_CODE_FILES)) {
    const absPath = path.join(DATA_DIR, filePath);
    const data: ProcedureCodeFile = JSON.parse(fs.readFileSync(absPath, 'utf-8'));
    codesByCountry[country] = new Set(data.codes.map((c) => `${c.code}|${c.system}`));
  }
});

describe('SNOMED Crosswalk Coverage Validation', () => {
  test('crosswalk has ≥50 SNOMED concepts', () => {
    expect(crosswalk.mappings.length).toBeGreaterThanOrEqual(50);
  });

  test('crosswalk has ≥200 SNOMED concepts (full dataset)', () => {
    expect(crosswalk.mappings.length).toBeGreaterThanOrEqual(200);
  });

  test('every concept has mappings for all 7 countries', () => {
    const conceptsMissingCountries: string[] = [];

    for (const concept of crosswalk.mappings) {
      const coveredCountries = new Set(concept.mappings.map((m) => m.country));
      const missing = COUNTRIES.filter((c) => !coveredCountries.has(c));
      if (missing.length > 0) {
        conceptsMissingCountries.push(
          `${concept.snomedConceptId} (${concept.snomedFsn}): missing ${missing.join(', ')}`
        );
      }
    }

    expect(conceptsMissingCountries).toEqual([]);
  });

  test('no duplicate country mappings within a single concept', () => {
    const duplicates: string[] = [];

    for (const concept of crosswalk.mappings) {
      const countryCounts: Record<string, number> = {};
      for (const mapping of concept.mappings) {
        countryCounts[mapping.country] = (countryCounts[mapping.country] || 0) + 1;
      }
      for (const [country, count] of Object.entries(countryCounts)) {
        if (count > 1) {
          duplicates.push(
            `${concept.snomedConceptId}: ${country} appears ${count} times`
          );
        }
      }
    }

    expect(duplicates).toEqual([]);
  });

  test('no duplicate SNOMED concept IDs', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const concept of crosswalk.mappings) {
      if (seen.has(concept.snomedConceptId)) {
        duplicates.push(concept.snomedConceptId);
      }
      seen.add(concept.snomedConceptId);
    }

    expect(duplicates).toEqual([]);
  });

  test('all mappings reference valid procedure codes in their country file', () => {
    const invalid: string[] = [];

    for (const concept of crosswalk.mappings) {
      for (const mapping of concept.mappings) {
        const key = `${mapping.code}|${mapping.system}`;
        const countrySet = codesByCountry[mapping.country];
        if (!countrySet) {
          invalid.push(
            `${concept.snomedConceptId} → ${mapping.country}: no procedure code file loaded`
          );
          continue;
        }
        if (!countrySet.has(key)) {
          invalid.push(
            `${concept.snomedConceptId} → ${mapping.country}: code ${mapping.code} (${mapping.system}) not found`
          );
        }
      }
    }

    if (invalid.length > 0) {
      console.error(`Referential integrity violations (${invalid.length}):`);
      for (const v of invalid.slice(0, 20)) {
        console.error(`  ${v}`);
      }
      if (invalid.length > 20) {
        console.error(`  ... and ${invalid.length - 20} more`);
      }
    }

    expect(invalid).toEqual([]);
  });

  test('all confidence values are between 0 and 1', () => {
    const outOfRange: string[] = [];

    for (const concept of crosswalk.mappings) {
      for (const mapping of concept.mappings) {
        if (mapping.confidence < 0 || mapping.confidence > 1) {
          outOfRange.push(
            `${concept.snomedConceptId} → ${mapping.country}: confidence=${mapping.confidence}`
          );
        }
      }
    }

    expect(outOfRange).toEqual([]);
  });

  test('all mappingType values are valid (EXACT, BROAD, or NARROW)', () => {
    const invalid: string[] = [];

    for (const concept of crosswalk.mappings) {
      for (const mapping of concept.mappings) {
        if (!VALID_MAPPING_TYPES.includes(mapping.mappingType)) {
          invalid.push(
            `${concept.snomedConceptId} → ${mapping.country}: mappingType=${mapping.mappingType}`
          );
        }
      }
    }

    expect(invalid).toEqual([]);
  });

  test('core SNOMED concepts have 7-country coverage', () => {
    const coreConceptIds = [
      '11429006',  // Consultation
      '26604007',  // Complete blood count
      '406547006', // Urgent consultation
      '29303009',  // Electrocardiogram
      '86198006',  // Influenza vaccination
    ];

    for (const conceptId of coreConceptIds) {
      const concept = crosswalk.mappings.find((m) => m.snomedConceptId === conceptId);
      expect(concept).toBeDefined();
      if (concept) {
        const countries = concept.mappings.map((m) => m.country).sort();
        expect(countries).toEqual([...COUNTRIES].sort());
      }
    }
  });

  test('total mapping count matches expected (concepts × 7)', () => {
    const totalMappings = crosswalk.mappings.reduce(
      (sum, c) => sum + c.mappings.length,
      0
    );
    expect(totalMappings).toBe(crosswalk.mappings.length * 7);
  });

  test('every SNOMED concept has a non-empty snomedFsn', () => {
    const empty = crosswalk.mappings.filter(
      (c) => !c.snomedFsn || c.snomedFsn.trim() === ''
    );
    expect(empty).toEqual([]);
  });

  test('every mapping has a non-empty code', () => {
    const empty: string[] = [];
    for (const concept of crosswalk.mappings) {
      for (const mapping of concept.mappings) {
        if (!mapping.code || mapping.code.trim() === '') {
          empty.push(`${concept.snomedConceptId} → ${mapping.country}: empty code`);
        }
      }
    }
    expect(empty).toEqual([]);
  });
});
