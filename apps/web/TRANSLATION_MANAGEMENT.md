# Translation Management Guide

Complete guide for managing HoliLabs translations across English, Spanish, and Portuguese.

## 🎯 Overview

HoliLabs uses a custom translation system with support for 3 languages:
- **English (EN)** - Primary language
- **Español (ES)** - Spanish for LATAM
- **Português (PT)** - Portuguese for Brazil

## 📁 File Structure

```
apps/web/
├── src/
│   ├── lib/
│   │   └── translations.ts           # Main translation file (source of truth)
│   ├── hooks/
│   │   └── useLanguage.ts           # Language hook with localStorage persistence
│   └── app/
│       └── dashboard/admin/
│           └── translations/
│               └── page.tsx          # Visual translation manager
└── scripts/
    └── validate-translations.ts      # CLI validator script
```

## 🛠️ Tools Available

### 1. Translation Validator (CLI)

**Purpose:** Validates that all translation keys exist across all languages and reports missing or empty translations.

**Usage:**
```bash
cd apps/web
pnpm validate-translations
```

**Output:**
```
╔════════════════════════════════════════╗
║   Translation Validator - HoliLabs    ║
╚════════════════════════════════════════╝

EN: 49 translation keys
ES: 49 translation keys
PT: 49 translation keys

Total unique keys: 49

✓ EN has all keys
✓ ES has all keys
✓ PT has all keys

Checking for empty translations...

✓ EN has no empty translations
✓ ES has no empty translations
✓ PT has no empty translations

════════════════════════════════════════
✓ ALL TRANSLATIONS VALID
All languages have complete, non-empty translations.
```

**When to use:**
- Before committing translation changes
- In CI/CD pipeline to prevent broken translations
- After adding new translation keys

---

### 2. Visual Translation Manager (Web UI)

**Purpose:** View, compare, and export all translations in a user-friendly interface.

**Access:**
Navigate to: `https://holilabs.xyz/dashboard/admin/translations`

**Features:**
- ✅ View all 49 translation keys side-by-side
- ✅ Search translations by key or content
- ✅ Filter by section (hero, nav, footer, etc.)
- ✅ Highlight missing/empty translations
- ✅ Export as JSON or CSV
- ✅ Statistics dashboard

**Screenshot sections:**
1. **Stats Dashboard** - Total keys, sections, languages, missing count
2. **Search & Filters** - Find specific translations quickly
3. **Comparison Table** - Side-by-side view of EN/ES/PT
4. **Export Options** - Download as JSON or CSV for external editors

**Export CSV workflow:**
```bash
# 1. Export CSV from web UI
# 2. Share with translators
# 3. Update translations.ts manually with changes
# 4. Run validator: pnpm validate-translations
# 5. Commit changes
```

---

### 3. Translation System (Code)

**Hook: `useLanguage()`**

```tsx
import { useLanguage } from '@/hooks/useLanguage';

function MyComponent() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div>
      <h1>{t.hero.headline}</h1>
      <button onClick={() => setLanguage('es')}>Español</button>
    </div>
  );
}
```

**Direct access:**
```tsx
import { translations } from '@/lib/translations';

const spanishHeroTitle = translations.es.hero.headline;
```

---

## 📝 How to Add New Translations

### Step 1: Edit translations.ts

```typescript
// apps/web/src/lib/translations.ts

export const translations = {
  en: {
    newSection: {
      title: 'New Feature',
      description: 'This is a new feature description',
    }
  },
  es: {
    newSection: {
      title: 'Nueva Funcionalidad',
      description: 'Esta es una descripción de nueva funcionalidad',
    }
  },
  pt: {
    newSection: {
      title: 'Novo Recurso',
      description: 'Esta é uma descrição do novo recurso',
    }
  }
}
```

### Step 2: Validate

```bash
cd apps/web
pnpm validate-translations
```

### Step 3: Use in Components

```tsx
function MyComponent() {
  const { t } = useLanguage();

  return (
    <div>
      <h2>{t.newSection.title}</h2>
      <p>{t.newSection.description}</p>
    </div>
  );
}
```

---

## 🔍 Translation Sections

Current translation structure:

```typescript
translations.{language}.{section}.{key}
```

### Available Sections:

1. **Common** - Global UI elements
   - `skipToMain`, `sendFeedback`, `cancel`, `send`, `tellUsWhatYouThink`

2. **Signup** - Beta signup messages
   - `success`, `successFirst100`, `successFreeYear`, `error`, `networkError`, `placeholder`

3. **Nav** - Navigation bar
   - `platform`, `cases`, `pricing`, `signIn`, `demo`

4. **Hero** - Landing page hero section
   - `badge`, `headline`, `subheadline`, `ctaPrimary`, `ctaSecondary`

5. **Paradigm** - Paradigm shift section
   - `badge`, `headline`, `headlineHighlight`, `subheadline`
   - `legacyTitle`, `legacyItems[]`, `health3Title`, `health3Items[]`, `result`

6. **OnePlatform** - Platform description
   - `badge`, `headline`, `subheadline`

7. **Footer** - Footer links and content
   - Product, company, legal sections
   - Vision roadmap with yearly milestones

---

## ✅ Best Practices

### DO ✓

1. **Always validate before committing**
   ```bash
   pnpm validate-translations
   ```

2. **Keep translations in sync**
   - If you add an EN key, add ES and PT immediately
   - Don't leave empty strings (validator will fail)

3. **Use semantic keys**
   ```typescript
   // Good
   hero.ctaPrimary

   // Bad
   hero.button1
   ```

4. **Keep line breaks consistent**
   ```typescript
   headline: 'Line 1\nLine 2'  // Use \n for breaks
   ```

5. **Export to CSV for professional translators**
   - Easier for non-technical translators
   - Track changes with version control

### DON'T ✗

1. **Don't hardcode strings**
   ```tsx
   // Bad
   <h1>Get Started</h1>

   // Good
   <h1>{t.hero.ctaPrimary}</h1>
   ```

2. **Don't mix languages in one key**
   ```typescript
   // Bad
   title: 'Welcome to Holi Labs / Bienvenido'

   // Good - separate keys
   en: { title: 'Welcome to Holi Labs' }
   es: { title: 'Bienvenido a Holi Labs' }
   ```

3. **Don't use translation keys for dynamic content**
   ```typescript
   // Bad - put in translations.ts
   const userName = t.user.name

   // Good - use props/state
   const userName = user.name
   ```

---

## 🚀 CI/CD Integration

Add to your deployment pipeline:

```yaml
# .github/workflows/deploy.yml

jobs:
  validate-translations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: cd apps/web && pnpm install
      - run: cd apps/web && pnpm validate-translations
```

This prevents deploying broken translations.

---

## 🌍 Adding a New Language

To add French (FR) support:

### 1. Update Language Type

```typescript
// apps/web/src/lib/translations.ts

export type Language = 'en' | 'es' | 'pt' | 'fr';  // Add 'fr'
```

### 2. Add French Translations

```typescript
export const translations = {
  // ... existing languages
  fr: {
    hero: {
      badge: 'Co-Pilote Clinique d\'Intelligence Générative',
      headline: 'Du Traitement Réactif\nà la Santé Proactive',
      // ... all other keys
    }
  }
}
```

### 3. Update Language Names

```typescript
export const languageNames: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',  // Add
};

export const languageCodes: Record<Language, string> = {
  en: 'ENG',
  es: 'ESP',
  pt: 'PT',
  fr: 'FR',  // Add
};
```

### 4. Validate

```bash
pnpm validate-translations
```

The validator will automatically detect the new language and validate it!

---

## 📊 Translation Statistics

As of latest update:
- **Total Keys:** 49
- **Languages:** 3 (EN, ES, PT)
- **Sections:** 7
- **Missing:** 0
- **Status:** ✅ ALL VALID

---

## 🆘 Troubleshooting

### Problem: Validator fails with "missing keys"

**Solution:**
1. Check which language is missing keys in the validator output
2. Compare with other languages to find missing keys
3. Add missing keys to translations.ts

### Problem: Empty translation values

**Solution:**
Don't leave empty strings. Either:
- Add meaningful content: `ctaSecondary: 'Learn More'`
- Or use a placeholder: `ctaSecondary: 'N/A'`

### Problem: Translations not updating on website

**Solution:**
1. Clear localStorage: `localStorage.removeItem('holilabs_language')`
2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Check that you're using `t.section.key` not hardcoded strings

### Problem: Can't access /dashboard/admin/translations

**Solution:**
Ensure you're authenticated and have admin permissions. The route is protected.

---

## 📞 Support

Questions? Contact the development team or check:
- Translation file: `apps/web/src/lib/translations.ts`
- Validator script: `apps/web/scripts/validate-translations.ts`
- Admin UI: `apps/web/src/app/dashboard/admin/translations/page.tsx`

---

**Last Updated:** December 12, 2025
**Maintained by:** HoliLabs Engineering Team
