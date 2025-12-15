#!/usr/bin/env tsx
/**
 * Translation Validator
 *
 * Validates that all translation keys exist across all languages
 * and reports missing or extra keys.
 *
 * Usage: pnpm validate-translations
 */

import { translations, Language } from '../src/lib/translations';

type TranslationObject = Record<string, any>;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function getAllKeys(obj: TranslationObject, prefix = ''): Set<string> {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively get nested keys
      const nestedKeys = getAllKeys(value, fullKey);
      nestedKeys.forEach(k => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }

  return keys;
}

function validateTranslations() {
  console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║   Translation Validator - HoliLabs    ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

  const languages: Language[] = ['en', 'es', 'pt'];
  const allKeys: Map<Language, Set<string>> = new Map();

  // Collect all keys for each language
  languages.forEach(lang => {
    const keys = getAllKeys(translations[lang]);
    allKeys.set(lang, keys);
    console.log(`${colors.blue}${lang.toUpperCase()}${colors.reset}: ${keys.size} translation keys`);
  });

  console.log('');

  // Find the union of all keys
  const universalKeys = new Set<string>();
  allKeys.forEach(keys => keys.forEach(k => universalKeys.add(k)));

  console.log(`${colors.cyan}Total unique keys: ${universalKeys.size}${colors.reset}\n`);

  let hasErrors = false;

  // Check for missing keys in each language
  languages.forEach(lang => {
    const langKeys = allKeys.get(lang)!;
    const missing = Array.from(universalKeys).filter(k => !langKeys.has(k));

    if (missing.length > 0) {
      hasErrors = true;
      console.log(`${colors.red}✗ ${lang.toUpperCase()} is missing ${missing.length} keys:${colors.reset}`);
      missing.forEach(key => console.log(`  ${colors.yellow}- ${key}${colors.reset}`));
      console.log('');
    } else {
      console.log(`${colors.green}✓ ${lang.toUpperCase()} has all keys${colors.reset}`);
    }
  });

  // Check for empty translations
  console.log(`\n${colors.cyan}Checking for empty translations...${colors.reset}\n`);

  languages.forEach(lang => {
    const emptyKeys: string[] = [];

    function checkEmpty(obj: TranslationObject, prefix = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'string' && value.trim() === '') {
          emptyKeys.push(fullKey);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          checkEmpty(value, fullKey);
        }
      }
    }

    checkEmpty(translations[lang]);

    if (emptyKeys.length > 0) {
      hasErrors = true;
      console.log(`${colors.yellow}⚠ ${lang.toUpperCase()} has ${emptyKeys.length} empty translations:${colors.reset}`);
      emptyKeys.forEach(key => console.log(`  ${colors.yellow}- ${key}${colors.reset}`));
      console.log('');
    } else {
      console.log(`${colors.green}✓ ${lang.toUpperCase()} has no empty translations${colors.reset}`);
    }
  });

  // Summary
  console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
  if (hasErrors) {
    console.log(`${colors.red}✗ VALIDATION FAILED${colors.reset}`);
    console.log(`${colors.yellow}Please fix the issues above before deploying.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✓ ALL TRANSLATIONS VALID${colors.reset}`);
    console.log(`${colors.green}All languages have complete, non-empty translations.${colors.reset}\n`);
    process.exit(0);
  }
}

// Run validation
validateTranslations();
