# Dark Mode Fix - Quick Reference Guide

## Quick Copy-Paste Patterns

### Background & Containers
```tsx
// Page backgrounds
"min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800"

// Cards & containers
"bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"

// Rounded cards with shadow
"bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
```

### Text Colors
```tsx
// Primary headings
"text-gray-900 dark:text-white"

// Secondary text
"text-gray-600 dark:text-gray-300"

// Tertiary/descriptive text
"text-gray-500 dark:text-gray-400"

// Colored text (blue example)
"text-blue-900 dark:text-blue-300"
```

### Interactive Elements
```tsx
// Buttons (unselected)
"bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"

// Input fields
"px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"

// Select dropdowns
"w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
```

### Colored Backgrounds
```tsx
// Info cards (blue)
"bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300"

// Success (green)
"bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-300"

// Warning (yellow)
"bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-300"

// Error (red)
"bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-300"
```

### Loading & Empty States
```tsx
// Loading spinner container
"w-16 h-16 bg-white dark:bg-gray-700 rounded-full"

// Empty state icon background
"w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full"

// Empty state icon
"w-10 h-10 text-gray-400 dark:text-gray-500"
```

## Search & Replace Guide

### Step 1: Find All Instances
```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web
grep -n "text-gray-900\"" src/app/portal/settings/page.tsx | grep -v "dark:"
```

### Step 2: Common Replacements

```bash
# Headings
text-gray-900"            → text-gray-900 dark:text-white"

# Secondary text
text-gray-600"            → text-gray-600 dark:text-gray-300"

# Cards
bg-white rounded          → bg-white dark:bg-gray-800 rounded

# Borders
border-gray-200"          → border-gray-200 dark:border-gray-700"

# Page backgrounds
bg-gradient-to-br from-green-50 to-blue-50 → bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800
```

## File-by-File Checklist

### Portal Settings Page
**File:** `/apps/web/src/app/portal/settings/page.tsx`

- [ ] Page background gradient
- [ ] Settings section cards (3-4 cards)
- [ ] Form labels
- [ ] Toggle switch containers
- [ ] Input fields
- [ ] Button elements
- [ ] Dividers/separators

### Portal Records List
**File:** `/apps/web/src/app/portal/records/page.tsx`

- [ ] Page background
- [ ] Record cards
- [ ] Date/timestamp text
- [ ] Category badges
- [ ] Empty state

### Portal Record Detail
**File:** `/apps/web/src/app/portal/records/[id]/page.tsx`

- [ ] Page background
- [ ] Main record card
- [ ] Vital signs section
- [ ] Medical history timeline
- [ ] Attachments section
- [ ] Back button
- [ ] Error state

### Clinician Review Page
**File:** `/apps/web/src/app/clinician/notes/[id]/review/page.tsx`

- [ ] Page background
- [ ] Review card
- [ ] Confidence score displays
- [ ] Metrics cards
- [ ] Action buttons
- [ ] Timeline/history

## Testing Commands

```bash
# Start dev server
cd /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web
npm run dev

# Open in browser
# Navigate to each fixed page and toggle dark mode
```

## Verification Checklist

For each page:
- ✅ Light mode: All text readable against backgrounds
- ✅ Dark mode: All text readable against backgrounds
- ✅ Borders visible in both modes
- ✅ Cards distinguishable from page background
- ✅ Icons maintain proper contrast
- ✅ Hover states work in both modes
- ✅ Focus indicators visible in both modes

## Common Mistakes to Avoid

❌ **Don't do this:**
```tsx
// Missing dark mode entirely
<div className="bg-white text-gray-900">

// Incomplete dark mode (missing border)
<div className="bg-white dark:bg-gray-800 border border-gray-200">

// Wrong dark text color (too light)
<h1 className="text-gray-900 dark:text-gray-300">
```

✅ **Do this instead:**
```tsx
// Complete dark mode
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">

// Complete with border
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">

// Proper heading contrast
<h1 className="text-gray-900 dark:text-white">
```

## Time Estimates

Based on metrics.tsx fix (completed):
- **Read file**: 2 min
- **Identify patterns**: 3 min
- **Apply fixes**: 8 min
- **Verify**: 2 min
- **Total per file**: ~15 min

Remaining files: 3-4 files × 15 min = **45-60 minutes total**

## Example: Before & After

### Before
```tsx
<div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
  <div className="max-w-7xl mx-auto px-4">
    <h1 className="text-3xl font-bold text-gray-900 mb-2">
      Configuración
    </h1>
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <p className="text-gray-600">
        Personaliza tu experiencia
      </p>
    </div>
  </div>
</div>
```

### After
```tsx
<div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8">
  <div className="max-w-7xl mx-auto px-4">
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
      Configuración
    </h1>
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <p className="text-gray-600 dark:text-gray-300">
        Personaliza tu experiencia
      </p>
    </div>
  </div>
</div>
```

## Need Help?

Refer to the completed file for examples:
- **Reference:** `/apps/web/src/app/portal/metrics/page.tsx`
- **Full Report:** `/apps/web/WHITE_ON_WHITE_FIX_REPORT.md`
