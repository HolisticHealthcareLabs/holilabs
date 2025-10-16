# Internationalization (i18n) Setup

**Date**: October 15, 2025  
**Status**: COMPLETE ✅  
**Languages**: Portuguese (primary), English, Spanish

---

## Summary

Successfully implemented multilingual support for the Pequeno Cotolêngo palliative care pilot using **next-intl**. The application now supports three languages with Portuguese as the default for the Brazilian hospital deployment.

---

## Languages Supported

1. **Portuguese (pt)** 🇧🇷 - **PRIMARY** (default for Pequeno Cotolêngo)
2. **English (en)** 🇺🇸 - Secondary
3. **Spanish (es)** 🇪🇸 - Secondary

---

## Files Created/Modified

### **Translation Files**
Location: `apps/web/messages/`

1. **`en.json`** - English translations
2. **`es.json`** - Spanish translations  
3. **`pt.json`** - Portuguese translations (Brazilian Portuguese)

All files contain:
- Common UI elements (save, cancel, edit, etc.)
- Navigation labels
- Patient information fields
- Brazilian identifier labels (CNS, CPF, CNES, IBGE)
- Palliative care terminology
- Code status options (DNR, DNI, AND, etc.)
- Care plan categories
- Pain assessment terminology
- Special needs terminology
- Family portal labels
- Spiritual care terminology

### **Configuration Files Modified**

#### **1. `src/i18n.ts`**
```typescript
// Define supported locales (Portuguese primary)
export const locales = ['pt', 'en', 'es'] as const;
export const defaultLocale = 'pt' as const;
```

**Changes:**
- Set Portuguese ('pt') as default locale
- Reordered locales array to prioritize Portuguese
- Updated `getRequestConfig` to properly handle locale parameter
- Updated locale labels and flags

#### **2. `next.config.js`**
```javascript
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');
```

**Changes:**
- Fixed path from `'./i18n.ts'` to `'./src/i18n.ts'`

#### **3. `src/contexts/LanguageContext.tsx`**
```typescript
const [locale, setLocaleState] = useState<Locale>(defaultLocale);
```

**Changes:**
- Updated default from 'es' to use `defaultLocale` ('pt')
- Fixed translation import path from `../../locales/${locale}/common.json` to `../../messages/${locale}.json`
- Updated locale validation array to ['pt', 'en', 'es']

#### **4. `src/middleware.ts`**
**Status:** Already configured ✅
- Handles locale detection from pathname, cookie, and Accept-Language header
- Redirects to locale-prefixed routes
- Skips locale handling for API routes and static files

---

## How to Use Translations

### **In Client Components**

Use the `useLanguage()` hook from LanguageContext:

```tsx
'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function MyComponent() {
  const { locale, t } = useLanguage();
  
  return (
    <div>
      <h1>{t('patient.title')}</h1>
      <p>{t('palliativeCare.qualityOfLifeScore')}</p>
    </div>
  );
}
```

### **In Server Components**

Use next-intl's `useTranslations`:

```tsx
import { useTranslations } from 'next-intl';

export default function ServerComponent() {
  const t = useTranslations();
  
  return (
    <div>
      <h1>{t('patient.title')}</h1>
    </div>
  );
}
```

### **Translation Key Structure**

Translations use dot notation:

```typescript
t('common.save')                    // "Salvar" (pt)
t('patient.firstName')              // "Nome" (pt)
t('palliativeCare.codeStatus')      // "Status de Código" (pt)
t('codeStatus.DNR')                 // "DNR (Não Reanimar)" (pt)
t('carePlanCategory.PAIN_MANAGEMENT') // "Controle da Dor" (pt)
t('painType.CHRONIC')               // "Crônica" (pt)
```

---

## Language Switcher Component

**Location:** `apps/web/src/components/LanguageSelector.tsx`

**Status:** Already exists ✅

**Usage:**
```tsx
import LanguageSelector from '@/components/LanguageSelector';

<LanguageSelector currentLocale={locale} />
```

**Features:**
- Displays current language with flag emoji
- Dropdown menu with all available languages
- Persists selection to localStorage
- Shows checkmark next to active language

---

## Translation Coverage

### **Complete Sections**
✅ Common UI elements (15 terms)  
✅ Navigation (7 items)  
✅ Patient demographics (14 fields)  
✅ Brazilian identifiers (6 IDs with descriptions)  
✅ Palliative care (15 fields)  
✅ Code status (6 options)  
✅ Advance directives (4 statuses)  
✅ Spiritual care (3 fields)  
✅ Family contacts (9 fields)  
✅ Special needs (7 fields + 3 types)  
✅ Flagged concerns (9 types)  
✅ Care plans (10 fields + 10 categories + 4 statuses)  
✅ Priority levels (4 levels)  
✅ Pain assessments (17 fields + 6 types + 8 qualities)  
✅ Family portal (21 fields + 3 access levels)  
✅ Humanization (4 fields)  
✅ Language selector (4 options)

**Total:** ~280 translation keys across 3 languages

---

## Medical Terminology Highlights

### **Portuguese (Brazilian)**
- **CNS:** "CNS (Cartão Nacional de Saúde)"
- **CPF:** "CPF (Cadastro de Pessoa Física)"
- **DNR:** "DNR (Não Reanimar)"
- **AND:** "AND (Permitir Morte Natural)"
- **Pain:** "Dor" (not "Dolor")
- **Quality of Life:** "Qualidade de Vida"
- **Pressure Ulcer:** "Lesão por Pressão" (Brazilian term)

### **Spanish**
- **CNS:** "CNS (Tarjeta Nacional de Salud)"
- **DNR:** "DNR (No Resucitar)"
- **Pain:** "Dolor"
- **Quality of Life:** "Calidad de Vida"

---

## Locale Detection Priority

1. **Pathname** (`/pt/dashboard`, `/en/patients`, etc.)
2. **Cookie** (`NEXT_LOCALE`)
3. **Accept-Language header** (browser preference)
4. **Default** (Portuguese - 'pt')

---

## URL Structure

The app uses locale prefixes in URLs:

```
/pt/dashboard          → Portuguese dashboard
/en/dashboard          → English dashboard
/es/dashboard          → Spanish dashboard
```

**Root redirect:**
```
/  → /pt/  (redirects to Portuguese)
```

---

## Testing Translations

### **1. Verify Translation Files**
```bash
# Check that all files exist
ls -l apps/web/messages/
# Should show: en.json, es.json, pt.json
```

### **2. Test Language Switching**
1. Open app at `http://localhost:3000`
2. Should default to Portuguese (`/pt/...`)
3. Click language switcher in navigation
4. Select English or Spanish
5. Verify URL changes and content translates

### **3. Test Browser Language Detection**
1. Clear localStorage
2. Set browser language to English
3. Open app
4. Should detect and use English

---

## Future: Adding New Translations

### **Step 1: Add Translation Key**

Add the key to all three language files:

**en.json:**
```json
{
  "newSection": {
    "newKey": "New Translation"
  }
}
```

**es.json:**
```json
{
  "newSection": {
    "newKey": "Nueva Traducción"
  }
}
```

**pt.json:**
```json
{
  "newSection": {
    "newKey": "Nova Tradução"
  }
}
```

### **Step 2: Use in Component**

```tsx
const { t } = useLanguage();
<p>{t('newSection.newKey')}</p>
```

---

## Known Limitations

1. **Dynamic routes:** Locale must be manually handled in dynamic routes
2. **API responses:** API responses are not translated (they return English by default)
3. **Error messages:** Some system error messages may still be in English

---

## Next Steps

1. ✅ **Translation files created** - All 3 languages complete
2. ✅ **Configuration complete** - next-intl, middleware, context
3. ✅ **Language switcher ready** - Existing component works
4. ⏳ **Update UI components** - Replace hardcoded strings with `t()` calls
5. ⏳ **Test in production** - Verify all translations work in deployed environment

---

## Package Dependencies

```json
{
  "next-intl": "^3.x.x"
}
```

**Installation:**
```bash
pnpm add next-intl --filter web
```

---

## Resources

- **next-intl docs:** https://next-intl-docs.vercel.app/
- **Translation files:** `apps/web/messages/`
- **i18n config:** `apps/web/src/i18n.ts`
- **Middleware:** `apps/web/src/middleware.ts`
- **Language Context:** `apps/web/src/contexts/LanguageContext.tsx`
- **Language Switcher:** `apps/web/src/components/LanguageSelector.tsx`

---

**Last Updated:** October 15, 2025  
**Author:** Claude Code  
**Project:** Pequeno Cotolêngo Palliative Care Pilot
