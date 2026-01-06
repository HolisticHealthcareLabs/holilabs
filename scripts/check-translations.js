#!/usr/bin/env node

/**
 * Check translation completeness across en, es, pt
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking translation completeness...\n');

const messagesDir = path.join(__dirname, '../apps/web/messages');

// Read all translation files
const en = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'));
const es = JSON.parse(fs.readFileSync(path.join(messagesDir, 'es.json'), 'utf8'));
const pt = JSON.parse(fs.readFileSync(path.join(messagesDir, 'pt.json'), 'utf8'));

// Flatten nested objects to get all keys
function flattenObject(obj, prefix = '') {
  const flattened = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}

const enFlat = flattenObject(en);
const esFlat = flattenObject(es);
const ptFlat = flattenObject(pt);

const enKeys = Object.keys(enFlat);
const esKeys = Object.keys(esFlat);
const ptKeys = Object.keys(ptFlat);

console.log('📊 Translation Statistics:');
console.log(`  English (en): ${enKeys.length} keys`);
console.log(`  Spanish (es): ${esKeys.length} keys`);
console.log(`  Portuguese (pt): ${ptKeys.length} keys`);
console.log('');

// Find missing keys
const missingInEs = enKeys.filter(k => !esKeys.includes(k));
const missingInPt = enKeys.filter(k => !ptKeys.includes(k));
const extraInEs = esKeys.filter(k => !enKeys.includes(k));
const extraInPt = ptKeys.filter(k => !enKeys.includes(k));

// Find untranslated (values same as English)
const untranslatedEs = enKeys.filter(k =>
  esFlat[k] && enFlat[k] &&
  esFlat[k] === enFlat[k] &&
  typeof esFlat[k] === 'string' &&
  esFlat[k].length > 0
);

const untranslatedPt = enKeys.filter(k =>
  ptFlat[k] && enFlat[k] &&
  ptFlat[k] === enFlat[k] &&
  typeof ptFlat[k] === 'string' &&
  ptFlat[k].length > 0
);

// Report issues
let issueCount = 0;

if (missingInEs.length > 0) {
  console.log('❌ Missing in Spanish (es):');
  missingInEs.slice(0, 10).forEach(k => console.log(`  - ${k}`));
  if (missingInEs.length > 10) console.log(`  ... and ${missingInEs.length - 10} more`);
  console.log('');
  issueCount += missingInEs.length;
}

if (missingInPt.length > 0) {
  console.log('❌ Missing in Portuguese (pt):');
  missingInPt.slice(0, 10).forEach(k => console.log(`  - ${k}`));
  if (missingInPt.length > 10) console.log(`  ... and ${missingInPt.length - 10} more`);
  console.log('');
  issueCount += missingInPt.length;
}

if (extraInEs.length > 0) {
  console.log('⚠️  Extra keys in Spanish (not in English):');
  extraInEs.slice(0, 5).forEach(k => console.log(`  - ${k}`));
  if (extraInEs.length > 5) console.log(`  ... and ${extraInEs.length - 5} more`);
  console.log('');
}

if (extraInPt.length > 0) {
  console.log('⚠️  Extra keys in Portuguese (not in English):');
  extraInPt.slice(0, 5).forEach(k => console.log(`  - ${k}`));
  if (extraInPt.length > 5) console.log(`  ... and ${extraInPt.length - 5} more`);
  console.log('');
}

if (untranslatedEs.length > 0) {
  console.log('⚠️  Untranslated in Spanish (same as English):');
  untranslatedEs.slice(0, 10).forEach(k => console.log(`  - ${k}: "${esFlat[k]}"`));
  if (untranslatedEs.length > 10) console.log(`  ... and ${untranslatedEs.length - 10} more`);
  console.log('');
  issueCount += untranslatedEs.length;
}

if (untranslatedPt.length > 0) {
  console.log('⚠️  Untranslated in Portuguese (same as English):');
  untranslatedPt.slice(0, 10).forEach(k => console.log(`  - ${k}: "${ptFlat[k]}"`));
  if (untranslatedPt.length > 10) console.log(`  ... and ${untranslatedPt.length - 10} more`);
  console.log('');
  issueCount += untranslatedPt.length;
}

if (issueCount === 0) {
  console.log('✅ All translations are complete!\n');
} else {
  console.log(`\n📝 Summary: Found ${issueCount} translation issues\n`);
  console.log('Run this script again after fixing to verify.\n');
}

// Export issue counts for other scripts
module.exports = {
  missingInEs: missingInEs.length,
  missingInPt: missingInPt.length,
  untranslatedEs: untranslatedEs.length,
  untranslatedPt: untranslatedPt.length,
  total: issueCount,
};
