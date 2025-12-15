# Accessibility Testing Guide - Agent 9, 10, 12 Fixes

## Overview

This guide provides comprehensive testing instructions for verifying WCAG AA compliance across all accessibility fixes implemented by Agent 9, 10, and 12.

**Total Fixes:**
- Agent 12: 3 edits (Theme toggle in dashboard)
- Agent 9 Critical: 4 labels (MedicationPrescription.tsx)
- Agent 9 Tier 1: 50 fixes across 20 clinical files
- Agent 10 High-Priority: 41 fixes across 5 portal files

**Total: 98 accessibility improvements**

---

## Automated Testing

### Quick Start (Recommended)

1. **Install dependencies (if not already done):**
   ```bash
   cd apps/web
   pnpm install
   ```

2. **Run accessibility tests:**
   ```bash
   # Run all accessibility tests (light + dark mode)
   pnpm test:e2e tests/e2e/accessibility-fixes.spec.ts --project=chromium

   # Run only light mode tests
   pnpm test:e2e tests/e2e/accessibility-fixes.spec.ts --grep "Light Mode" --project=chromium

   # Run only dark mode tests
   pnpm test:e2e tests/e2e/accessibility-fixes.spec.ts --grep "Dark Mode" --project=chromium

   # Run contrast ratio verification
   pnpm test:e2e tests/e2e/accessibility-fixes.spec.ts --grep "Contrast Ratio" --project=chromium
   ```

3. **View test report:**
   ```bash
   pnpm test:report
   ```

### Cross-Browser Testing

Test across all browsers to ensure compatibility:

```bash
# Chrome
pnpm test:e2e tests/e2e/accessibility-fixes.spec.ts --project=chromium

# Firefox
pnpm test:e2e tests/e2e/accessibility-fixes.spec.ts --project=firefox

# Safari
pnpm test:e2e tests/e2e/accessibility-fixes.spec.ts --project=webkit

# Mobile (iPhone + Android)
pnpm test:e2e tests/e2e/accessibility-fixes.spec.ts --project=mobile-safari-iphone --project=mobile-chrome-android
```

---

## Manual Testing Checklist

### Pre-Testing Setup

1. **Start the development server:**
   ```bash
   cd apps/web
   pnpm dev
   ```

2. **Install browser extensions:**
   - [axe DevTools](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd) (Chrome/Edge)
   - [WAVE Extension](https://wave.webaim.org/extension/) (Chrome/Firefox)
   - [Lighthouse](https://developers.google.com/web/tools/lighthouse) (Built into Chrome DevTools)

---

## Testing by Component

### ✅ Agent 12: Dashboard Theme Toggle

**Files Modified:**
- `apps/web/src/app/dashboard/layout.tsx` (3 changes)

**Test Steps:**

1. **Navigate to Dashboard:**
   - URL: `http://localhost:3000/dashboard`
   - Requires authentication

2. **Verify Theme Toggle Visibility:**
   - [ ] Theme toggle button is visible in top navigation
   - [ ] Button has clear icon (sun/moon/auto)
   - [ ] Button has proper ARIA label

3. **Test Theme Switching:**
   - [ ] Click theme toggle
   - [ ] Verify 3 states cycle: Light → Dark → Auto → Light
   - [ ] Each state applies correctly to entire dashboard
   - [ ] No FOUC (Flash of Unstyled Content)

4. **Keyboard Accessibility:**
   - [ ] Tab to theme toggle button
   - [ ] Press `Enter` or `Space` to activate
   - [ ] Verify keyboard shortcut (Cmd+Shift+L or Ctrl+Shift+L)

5. **ARIA and Screen Reader:**
   - [ ] Button has `aria-label` describing current theme
   - [ ] State change is announced by screen reader

6. **axe DevTools Scan:**
   ```
   1. Open Chrome DevTools (F12)
   2. Go to "axe DevTools" tab
   3. Click "Scan ALL of my page"
   4. Verify 0 critical/serious issues
   ```

---

### ✅ Agent 9 Critical: MedicationPrescription.tsx

**Files Modified:**
- `apps/web/src/components/clinical/MedicationPrescription.tsx` (4 labels, lines 534-546)

**Test Steps:**

1. **Navigate to Medication Prescription Component:**
   - URL: Typically accessed via patient dashboard → medications
   - Requires authentication

2. **Verify Label Contrast (Light Mode):**
   - [ ] "Dosis:" label is clearly readable (text-gray-600)
   - [ ] "Vía:" label is clearly readable (text-gray-600)
   - [ ] "Frecuencia:" label is clearly readable (text-gray-600)
   - [ ] "Duración:" label is clearly readable (text-gray-600)

3. **Verify Label Contrast (Dark Mode):**
   - [ ] Toggle to dark mode
   - [ ] All 4 labels remain clearly readable (text-gray-400)
   - [ ] No white-on-white or dark-on-dark issues

4. **Contrast Ratio Verification:**
   - Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
   - [ ] Light mode: #4B5563 (gray-600) on white = **7.48:1** ✅ (exceeds 4.5:1)
   - [ ] Dark mode: #9CA3AF (gray-400) on dark = **7.02:1** ✅ (exceeds 4.5:1)

5. **Functional Testing:**
   - [ ] Labels accurately describe their fields
   - [ ] Form remains usable in both themes
   - [ ] No layout shifts when switching themes

---

### ✅ Agent 9 Tier 1: Clinical Components (20 files)

**Files Modified:**
- 8 clinical/ directory files
- 8 dashboard/patient files
- 2 page files
- 2 verified files (already compliant)

**Test Priority Order:**

#### Priority 1: Critical Clinical Files (10 min)

1. **DiagnosisAssistant.tsx**
   - [ ] Navigate to Diagnosis Assistant
   - [ ] Verify 5 collapsible sections (Demographics, Clinical Presentation, Medical History, Vital Signs, Physical Examination)
   - [ ] Chevron icons have consistent low contrast (gray-500) in both modes
   - [ ] Decorative comment explains intentional design

2. **ClinicalDecisionSupport.tsx**
   - [ ] Navigate to Clinical Decision Support panel
   - [ ] Verify alert summary text is readable (upgraded from gray-500 to gray-600)
   - [ ] Verify "Basadas en condiciones del paciente" subtitle is readable
   - [ ] Metadata (source, timestamps) uses intentional low contrast

3. **AnalyticsDashboard.tsx**
   - [ ] Navigate to CDS Analytics Dashboard
   - [ ] Verify 4 metric cards (Total Alerts, Acceptance Rate, Override Rate, Avg Response Time)
   - [ ] Primary metrics are bold and high contrast
   - [ ] Secondary details (breakdown numbers, percentages) have documented low contrast

#### Priority 2: Dashboard/Patient Files (10 min)

4. **CorrectionMetricsWidget.tsx**
   - [ ] Verify RLHF metrics widget displays
   - [ ] Empty state message is readable (upgraded to gray-600)
   - [ ] Trend icons and time range use intentional low contrast
   - [ ] "Última 30 días" label is properly styled

5. **CommandKPatientSelector.tsx**
   - [ ] Press Cmd+K (or Ctrl+K) to open patient selector
   - [ ] Empty state message "No patients found" is readable
   - [ ] Patient MRN numbers have documented decorative styling

6. **DataIngestion.tsx & EHRAccessControl.tsx**
   - [ ] Verify data ingestion flow displays
   - [ ] Incomplete step indicators have intentional low contrast (gray-400)
   - [ ] Close buttons (✕) use decorative styling

#### Priority 3: Verify Already-Compliant Files (5 min)

7. **EnhancedClinicalDecisionSupport.tsx**
   - [ ] All text already uses text-gray-600 (no changes needed)

8. **MedicalImageViewer.tsx**
   - [ ] All text already uses text-gray-600 (no changes needed)

---

### ✅ Agent 10: Portal Pages (5 files)

**Files Modified:**
- profile/page.tsx (421 lines) - 12 upgrades + 3 decorative
- privacy/page.tsx (252 lines) - 5 upgrades
- security/page.tsx (314 lines) - 5 upgrades + 3 pre-existing decorative
- PatientNavigation.tsx (442 lines) - Already compliant
- PatientOnboardingWizard.tsx (316 lines) - 9 upgrades + 2 decorative

**Test Priority Order:**

#### Priority 1: Profile Page (5 min)

1. **Navigate to Patient Profile:**
   - URL: `http://localhost:3000/portal/dashboard/profile`
   - Requires patient authentication

2. **Verify 12 Upgraded Labels (Light Mode):**
   - [ ] Page subtitle: "Información personal y configuración de cuenta"
   - [ ] Field labels:
     - [ ] "Número de Registro Médico"
     - [ ] "Correo Electrónico"
     - [ ] "Teléfono"
     - [ ] "Fecha de Nacimiento"
     - [ ] "Género"
   - [ ] Security section descriptions:
     - [ ] "Ver inicios de sesión y eventos de seguridad"
     - [ ] "Actualiza tu contraseña de acceso"
     - [ ] "Añade una capa extra de seguridad"
   - [ ] Notification descriptions:
     - [ ] "Recibe actualizaciones importantes"
     - [ ] "Recordatorios de citas"
   - [ ] Language preference: "Español"

3. **Verify Dark Mode (Press theme toggle):**
   - [ ] All 12 labels remain clearly readable (text-gray-400)
   - [ ] No text disappears or becomes hard to read

4. **Verify Decorative Elements:**
   - [ ] "Próximamente" badges (2 instances) use intentional low contrast
   - [ ] PencilIcons next to settings have decorative comments

#### Priority 2: Privacy Page (5 min)

1. **Navigate to Privacy Controls:**
   - URL: `http://localhost:3000/portal/dashboard/privacy`

2. **Verify Stats Cards:**
   - [ ] "Permisos Activos" label is readable
   - [ ] "Permisos Revocados" label is readable
   - [ ] "Accesos Este Mes" label is readable

3. **Dark Mode Verification:**
   - [ ] All stats labels have dark:text-gray-400
   - [ ] Card backgrounds adapt properly

#### Priority 3: Security Page (5 min)

1. **Navigate to Security Settings:**
   - URL: `http://localhost:3000/portal/dashboard/security`

2. **Verify Session Details:**
   - [ ] Page subtitle: "Revisa tu actividad de inicio de sesión"
   - [ ] Device browser label (e.g., "Chrome 120 on Windows")
   - [ ] IP address display
   - [ ] Last activity timestamp
   - [ ] Security event descriptions

3. **Verify Pre-Existing Decorative Elements:**
   - [ ] MapPinIcon (location) - intentional low contrast
   - [ ] ClockIcon (time) - intentional low contrast
   - [ ] Timestamp metadata - intentional low contrast

#### Priority 4: Onboarding Wizard (5 min)

1. **Navigate to Patient Onboarding:**
   - URL: `http://localhost:3000/portal/onboarding` (or trigger from new patient flow)

2. **Verify Step Descriptions (9 upgrades):**
   - [ ] Current step description is readable
   - [ ] "Basic Information" description
   - [ ] "Medical History" description
   - [ ] "Family History" description
   - [ ] Insurance upload instruction
   - [ ] Appointment booking description
   - [ ] Stats labels: "Providers", "Available", "Avg Wait"

3. **Verify Decorative Elements:**
   - [ ] Step indicator helper text ("Step 1", "Step 2", etc.) has low contrast
   - [ ] Inactive step circles use gray-400 (intentional)

---

## Contrast Ratio Verification

### Tools

1. **WebAIM Contrast Checker:**
   - URL: https://webaim.org/resources/contrastchecker/
   - Enter foreground and background colors
   - Verify ratio ≥ 4.5:1 for AA compliance

2. **Browser DevTools:**
   - Chrome: Inspect element → Styles → Color picker shows contrast ratio
   - Firefox: Accessibility Inspector → Check for Contrast

3. **axe DevTools:**
   - Chrome extension automatically checks contrast
   - Reports violations with specific elements

### Color Combinations to Verify

| Mode | Text Color | Background | Ratio | Status |
|------|-----------|------------|-------|--------|
| Light | `#4B5563` (gray-600) | `#FFFFFF` (white) | 7.48:1 | ✅ AAA |
| Dark | `#9CA3AF` (gray-400) | `#1F2937` (gray-800) | 7.02:1 | ✅ AAA |
| Light | `#6B7280` (gray-500) | `#FFFFFF` (white) | 4.64:1 | ⚠️ AA (decorative only) |
| Dark | `#6B7280` (gray-500) | `#1F2937` (gray-800) | 3.38:1 | ❌ (decorative only) |

**Note:** Gray-500 is only used for decorative elements (icons, meta info) and has been documented as intentional low contrast.

---

## Visual Regression Testing

### Setup

1. **Install Percy (optional):**
   ```bash
   pnpm add -D @percy/cli @percy/playwright
   ```

2. **Take baseline screenshots:**
   ```bash
   # Light mode
   pnpm test:e2e tests/e2e/accessibility-fixes.spec.ts --project=chromium --headed

   # Dark mode
   pnpm test:e2e tests/e2e/accessibility-fixes.spec.ts --grep "Dark Mode" --project=chromium --headed
   ```

### Manual Visual Testing Checklist

For each modified page, verify:

#### Light Mode
- [ ] No layout shifts
- [ ] All text is readable
- [ ] Colors are consistent with design system
- [ ] No unexpected bold/italic changes
- [ ] Interactive states work (hover, focus, active)

#### Dark Mode
- [ ] Background adapts to dark theme
- [ ] Text color changes to light (gray-400)
- [ ] All text remains readable
- [ ] No white-on-white or dark-on-dark text
- [ ] Interactive states maintain contrast

#### Theme Switching
- [ ] No Flash of Unstyled Content (FOUC)
- [ ] Smooth transition between themes
- [ ] All elements update simultaneously
- [ ] Theme preference persists on refresh

---

## Screen Reader Testing (Optional)

### Tools

- **macOS:** VoiceOver (Cmd+F5)
- **Windows:** NVDA (free) or JAWS
- **Chrome:** ChromeVox extension

### Test Scenarios

1. **Navigation:**
   - [ ] Can navigate to all modified pages
   - [ ] Headings announce correctly
   - [ ] Form labels announce correctly

2. **Theme Toggle:**
   - [ ] Button announces current theme
   - [ ] State change is announced
   - [ ] Keyboard shortcut works with screen reader

3. **Interactive Elements:**
   - [ ] All buttons have accessible names
   - [ ] Form fields have associated labels
   - [ ] Error messages are announced

---

## Performance Testing

Verify that accessibility fixes don't impact performance:

1. **Lighthouse Audit:**
   ```bash
   # In Chrome DevTools
   1. Open DevTools (F12)
   2. Go to "Lighthouse" tab
   3. Select "Accessibility" category
   4. Run audit
   ```

   **Target Scores:**
   - Accessibility: ≥ 95
   - Performance: ≥ 90
   - Best Practices: ≥ 90

2. **Bundle Size Impact:**
   ```bash
   pnpm build
   ```
   - Verify no significant increase in bundle size
   - CSS variables and dark mode classes should be minimal impact

---

## Issue Reporting Template

If you find any accessibility issues:

```markdown
### Issue Description
[Brief description of the issue]

### Location
- **File:** [path/to/file.tsx]
- **Line:** [line number]
- **Component:** [component name]

### Steps to Reproduce
1. Navigate to [URL]
2. [Action]
3. [Result]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Screenshot
[Attach screenshot if applicable]

### Contrast Ratio
- **Foreground:** #XXXXXX
- **Background:** #XXXXXX
- **Ratio:** X.XX:1
- **WCAG Level:** [AA/AAA/Fail]

### Browser/Environment
- **Browser:** [Chrome/Firefox/Safari]
- **Version:** [version number]
- **OS:** [macOS/Windows/Linux]
- **Theme:** [Light/Dark]
```

---

## Success Criteria

All tests pass when:

- ✅ **0 critical/serious axe violations** on all tested pages
- ✅ **All text meets WCAG AA contrast ratio (4.5:1)**
- ✅ **Theme toggle works in all 3 states (light/dark/auto)**
- ✅ **Dark mode maintains readability across all components**
- ✅ **No visual regressions or layout shifts**
- ✅ **Keyboard navigation works for all interactive elements**
- ✅ **Screen readers announce all content correctly**

---

## Test Results Summary

After completing tests, fill in:

### Automated Tests

| Test Suite | Status | Violations | Notes |
|------------|--------|------------|-------|
| Light Mode - Dashboard | ⬜ | _ | _ |
| Light Mode - Portal | ⬜ | _ | _ |
| Dark Mode - Dashboard | ⬜ | _ | _ |
| Dark Mode - Portal | ⬜ | _ | _ |
| Contrast Ratios | ⬜ | _ | _ |
| Theme Toggle | ⬜ | _ | _ |

### Manual Tests

| Component | Light Mode | Dark Mode | Notes |
|-----------|------------|-----------|-------|
| Dashboard Theme Toggle | ⬜ | ⬜ | _ |
| MedicationPrescription | ⬜ | ⬜ | _ |
| Clinical Components | ⬜ | ⬜ | _ |
| Portal Profile | ⬜ | ⬜ | _ |
| Portal Privacy | ⬜ | ⬜ | _ |
| Portal Security | ⬜ | ⬜ | _ |
| Portal Onboarding | ⬜ | ⬜ | _ |

### Overall Status

- **Total Tests:** _
- **Passed:** _
- **Failed:** _
- **Skipped:** _
- **Pass Rate:** _%

---

## Next Steps After Testing

1. **If all tests pass:**
   - Document results in this file
   - Commit all changes
   - Create pull request
   - Request code review

2. **If tests fail:**
   - Document failures using Issue Reporting Template
   - Fix identified issues
   - Re-run tests
   - Verify fixes

3. **Production deployment:**
   - Merge to main branch
   - Run tests in staging environment
   - Monitor for any user-reported issues
   - Update accessibility documentation

---

**Testing Completed By:** _________________
**Date:** _________________
**Reviewed By:** _________________
**Date:** _________________
