# Translation Architecture Documentation

## Overview

Holi Labs uses **two separate translation systems** for different parts of the application:

1. **Landing Page System** - Static TypeScript constants
2. **Dashboard System** - Dynamic JSON files with React Context

---

## System 1: Landing Page Translation System

**Location:** `/src/lib/translations.ts`

**Used By:**
- Landing page (`/src/app/page.tsx`)
- AI Command Center (`/src/components/AICommandCenter.tsx`)
- Skip Link (`/src/components/SkipLink.tsx`)
- Feedback buttons and modals

**How It Works:**
```typescript
// Import hook and translations
import { useLanguage } from '@/hooks/useLanguage';
import { translations } from '@/lib/translations';

// Use in component
const { language, setLanguage, t } = useLanguage();

// Access translations with dot notation
<h1>{t.hero.headline}</h1>
<p>{t.aiCommandCenter.navigation.cdss}</p>
```

**Key Features:**
- ✅ No provider needed (works in any client component)
- ✅ TypeScript type safety
- ✅ Fast - no runtime imports
- ✅ localStorage persistence
- ❌ Cannot be extended at runtime
- ❌ Increases bundle size with all translations

**Supported Languages:**
- English (`en`)
- Spanish (`es`)
- Portuguese (`pt`)

**Translation Structure:**
```typescript
{
  common: { save, cancel, edit, ... },
  signup: { success, error, ... },
  nav: { platform, cases, pricing, ... },
  hero: { badge, headline, ... },
  paradigm: { ... },
  onePlatform: { ... },
  footer: { ... },
  aiCommandCenter: {
    navigation: { cdss, scribe, prevention, ... },
    defaultResponse: "..."
  }
}
```

---

## System 2: Dashboard Translation System

**Location:** `/messages/*.json` files

**Used By:**
- All dashboard pages (`/dashboard/*`)
- Dashboard layout
- Patient portal pages
- Clinical components
- SOAP templates
- Prevention hub

**How It Works:**
```typescript
// Import hook from context
import { useLanguage } from '@/contexts/LanguageContext';

// Use in component (must be inside LanguageProvider)
const { locale, t } = useLanguage();

// Access translations with function call
<h1>{t('patient.title')}</h1>
<p>{t('aiCommandCenter.navigation.cdss')}</p>
```

**Provider Setup:**
```typescript
// In dashboard layout.tsx
<LanguageProvider>
  <DashboardContent>{children}</DashboardContent>
</LanguageProvider>
```

**Key Features:**
- ✅ Dynamic imports (smaller initial bundle)
- ✅ Can be extended at runtime
- ✅ Better for large translation sets
- ✅ Locale-specific formatting
- ❌ Requires LanguageProvider wrapper
- ❌ Less type safety

**Supported Languages:**
- English (`en`)
- Spanish (`es`)
- Portuguese (`pt`)

**Translation Files:**
- `/messages/en.json` - English translations (335 lines)
- `/messages/es.json` - Spanish translations (335 lines)
- `/messages/pt.json` - Portuguese translations (335 lines)

**Translation Structure:**
```json
{
  "common": { "save": "Save", ... },
  "navigation": { "dashboard": "Dashboard", ... },
  "patient": { "title": "Patients", ... },
  "brazilianIds": { ... },
  "palliativeCare": { ... },
  "carePlan": { ... },
  "painAssessment": { ... },
  "familyPortal": { ... },
  "soapTemplates": { ... },
  "aiCommandCenter": {
    "navigation": { ... },
    "defaultResponse": "..."
  }
}
```

---

## Common Pitfall: Mixing Translation Systems

### ❌ INCORRECT - Using dashboard context in landing page:

```typescript
// In src/components/AICommandCenter.tsx (landing page component)
import { useLanguage } from '@/contexts/LanguageContext'; // ❌ WRONG!

export function AICommandCenter() {
  const { t } = useLanguage(); // ❌ Error: "must be used within LanguageProvider"
  return <div>{t('aiCommandCenter.navigation.cdss')}</div>;
}
```

**Error:** `useLanguage must be used within a LanguageProvider`

**Why:** Landing page doesn't have LanguageProvider wrapper

### ✅ CORRECT - Using landing page system:

```typescript
// In src/components/AICommandCenter.tsx
import { useLanguage } from '@/hooks/useLanguage'; // ✅ CORRECT
import { translations } from '@/lib/translations';

export function AICommandCenter() {
  const { language } = useLanguage();
  const t = translations[language];
  return <div>{t.aiCommandCenter.navigation.cdss}</div>; // ✅ Dot notation
}
```

---

## Adding New Translations

### For Landing Page Components:

1. **Add to TypeScript constant** (`/src/lib/translations.ts`)

```typescript
export const translations = {
  en: {
    // ... existing translations
    newFeature: {
      title: "New Feature",
      description: "Feature description"
    }
  },
  es: {
    // ... existing translations
    newFeature: {
      title: "Nueva Funcionalidad",
      description: "Descripción de la funcionalidad"
    }
  },
  pt: {
    // ... existing translations
    newFeature: {
      title: "Nova Funcionalidade",
      description: "Descrição da funcionalidade"
    }
  }
}
```

2. **Use in component:**

```typescript
import { useLanguage } from '@/hooks/useLanguage';
import { translations } from '@/lib/translations';

export function MyComponent() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div>
      <h1>{t.newFeature.title}</h1>
      <p>{t.newFeature.description}</p>
    </div>
  );
}
```

### For Dashboard Components:

1. **Add to JSON files** (`/messages/*.json`)

```json
// en.json
{
  "newFeature": {
    "title": "New Feature",
    "description": "Feature description"
  }
}

// es.json
{
  "newFeature": {
    "title": "Nueva Funcionalidad",
    "description": "Descripción de la funcionalidad"
  }
}

// pt.json
{
  "newFeature": {
    "title": "Nova Funcionalidade",
    "description": "Descrição da funcionalidade"
  }
}
```

2. **Use in component:**

```typescript
import { useLanguage } from '@/contexts/LanguageContext';

export function MyDashboardComponent() {
  const { t } = useLanguage();

  return (
    <div>
      <h1>{t('newFeature.title')}</h1>
      <p>{t('newFeature.description')}</p>
    </div>
  );
}
```

---

## Translation Key Naming Conventions

### Hierarchical Structure:
```
domain.feature.element
```

### Examples:
- `patient.title` - Main title for patient section
- `patient.firstName` - First name field label
- `carePlan.newCarePlan` - New care plan button
- `soapTemplates.palliativeCare.title` - Palliative care template title
- `aiCommandCenter.navigation.cdss` - CDSS navigation response

### Best Practices:
1. ✅ Use descriptive, hierarchical keys
2. ✅ Group related translations together
3. ✅ Keep consistent naming across languages
4. ✅ Use camelCase for keys
5. ❌ Don't use generic keys like `text1`, `label2`
6. ❌ Don't nest more than 3 levels deep

---

## Language-Specific Formatting

### Dates:
```typescript
// Use locale-specific formatting
const formattedDate = new Date().toLocaleDateString(locale, {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
```

### Numbers:
```typescript
// Use locale-specific number formatting
const formattedNumber = (12345.67).toLocaleString(locale);
```

### Currency:
```typescript
// Use locale-specific currency
const formattedPrice = (99.99).toLocaleString(locale, {
  style: 'currency',
  currency: locale === 'pt' ? 'BRL' : locale === 'es' ? 'MXN' : 'USD'
});
```

---

## Testing Translations

### Manual Testing:
1. Switch language using language selector
2. Verify all text changes
3. Check for missing translations (shows key instead of text)
4. Verify layout doesn't break with longer text

### Automated Testing:
```bash
# Check for missing keys (recommended tool)
npx i18n-check messages/en.json messages/es.json messages/pt.json
```

---

## Common Issues and Solutions

### Issue 1: Missing Translation Key
**Symptom:** Shows `aiCommandCenter.navigation.cdss` instead of translated text

**Cause:** Key doesn't exist in translation file

**Solution:** Add key to all language files

### Issue 2: Wrong Translation System
**Symptom:** `useLanguage must be used within a LanguageProvider` error

**Cause:** Using dashboard context in landing page component

**Solution:** Use landing page hook (`@/hooks/useLanguage`) instead

### Issue 3: Translation Not Updating
**Symptom:** Text doesn't change when switching language

**Cause:** Not using translation function, hardcoded text

**Solution:** Replace hardcoded text with translation key

```typescript
// ❌ Wrong
<h1>Patient Details</h1>

// ✅ Correct
<h1>{t('patient.patientDetails')}</h1>
```

---

## Migration Strategy

If unifying the two systems in the future:

### Option A: Move Everything to JSON
**Pros:**
- Smaller initial bundle
- Easier for translators
- Can use external translation services

**Cons:**
- Lose TypeScript type safety
- Need LanguageProvider everywhere

### Option B: Move Everything to TypeScript
**Pros:**
- Full type safety
- No provider needed
- Faster access

**Cons:**
- Larger bundle size
- Harder to update translations

### Recommended: Keep Both
- Landing page doesn't need provider overhead
- Dashboard benefits from dynamic imports
- Each system optimized for its use case

---

## Translation Coverage

### Landing Page System (`translations.ts`):
- ✅ Navigation
- ✅ Hero section
- ✅ Paradigm shift section
- ✅ Feature descriptions
- ✅ Footer
- ✅ AI Command Center
- ✅ Signup messages
- ✅ Feedback modal

### Dashboard System (`messages/*.json`):
- ✅ Common actions (save, cancel, etc.)
- ✅ Navigation
- ✅ Patient management
- ✅ Brazilian identifiers
- ✅ Palliative care
- ✅ Care plans
- ✅ Pain assessments
- ✅ Family portal
- ✅ SOAP templates
- ✅ Language selector

---

## File Locations Reference

### Translation Files:
- `/src/lib/translations.ts` - Landing page translations (TypeScript)
- `/messages/en.json` - Dashboard English translations
- `/messages/es.json` - Dashboard Spanish translations
- `/messages/pt.json` - Dashboard Portuguese translations

### Hooks:
- `/src/hooks/useLanguage.ts` - Landing page hook
- `/src/contexts/LanguageContext.tsx` - Dashboard context + hook

### Components Using Landing Page System:
- `/src/app/page.tsx` - Main landing page
- `/src/components/AICommandCenter.tsx` - AI navigation
- `/src/components/SkipLink.tsx` - Accessibility

### Components Using Dashboard System:
- `/src/app/dashboard/layout.tsx` - Dashboard wrapper
- All `/src/app/dashboard/**/*.tsx` pages
- `/src/components/scribe/VoiceInputButton.tsx`
- `/src/components/scribe/PainScaleSelector.tsx`
- `/src/components/scribe/QuickInterventionsPanel.tsx`
- `/src/components/LanguageSelector.tsx`

---

## Recent Fixes (2025-01-07)

### Fixed: AICommandCenter Translation Error
**Issue:** Component was using dashboard context (`@/contexts/LanguageContext`) but was used on landing page without LanguageProvider

**Error:** `useLanguage must be used within a LanguageProvider`

**Solution:**
1. Reverted to landing page hook (`@/hooks/useLanguage`)
2. Added AICommandCenter translations to `translations.ts` for all 3 languages
3. Changed translation syntax from function call `t('key')` to dot notation `t.key`

**Files Modified:**
- `/src/lib/translations.ts` - Added `aiCommandCenter` section (EN, ES, PT)
- `/src/components/AICommandCenter.tsx` - Fixed import and translation access

---

## Support

For questions about the translation system:
1. Check this documentation first
2. Review the code in the referenced files
3. Test in both landing page and dashboard contexts
4. Verify language switching works correctly

**Last Updated:** 2025-01-07
**Version:** 2.0 (Two-System Architecture)
