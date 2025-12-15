# Screen Reader Testing Guide

## Overview

This guide provides instructions for testing the Holi Labs platform with screen readers to ensure WCAG 2.1 Level AA compliance for visually impaired users.

---

## Why Screen Reader Testing?

Screen readers are essential assistive technology for:
- **Blind users** - Navigate entirely by audio
- **Low vision users** - Supplement visual information
- **Cognitive disabilities** - Simplify complex interfaces
- **Motor disabilities** - Navigate without mouse

**WCAG Requirements:**
- All interactive elements must be keyboard accessible
- All content must have proper semantic markup
- All images/icons must have alt text or ARIA labels
- All forms must have associated labels
- All dynamic content changes must be announced

---

## Screen Readers Overview

### NVDA (Windows) - Free

**Download:** https://www.nvaccess.org/download/

**Why NVDA:**
- ✅ Free and open source
- ✅ Most popular on Windows (40% market share)
- ✅ Excellent standards compliance
- ✅ Regular updates

**Basic Commands:**
- `Insert + Down Arrow` - Read all
- `Tab` - Next interactive element
- `H` - Next heading
- `B` - Next button
- `Insert + F7` - List all links
- `Insert + Q` - Quit NVDA

### JAWS (Windows) - Commercial

**Download:** https://www.freedomscientific.com/products/software/jaws/

**Why JAWS:**
- ✅ Most comprehensive features
- ✅ Enterprise standard (30% market share)
- ✅ Best compatibility with complex web apps
- ❌ Expensive ($1,000+)
- ✅ 40-minute demo mode available

**Basic Commands:**
- `Insert + Down Arrow` - Read all
- `Tab` - Next interactive element
- `H` - Next heading
- `B` - Next button
- `Insert + F6` - List all headings
- `Insert + F4` - Quit JAWS

### VoiceOver (macOS/iOS) - Built-in

**Enable:** System Preferences → Accessibility → VoiceOver

**Why VoiceOver:**
- ✅ Free, built into macOS/iOS
- ✅ Native Safari integration
- ✅ Good for testing mobile web
- ✅ 20% market share

**Basic Commands (macOS):**
- `Cmd + F5` - Toggle VoiceOver on/off
- `VO + A` - Read all (VO = Ctrl + Option)
- `Tab` - Next interactive element
- `VO + H` - Next heading
- `VO + Cmd + H` - Headings menu
- `VO + U` - Rotor (navigation menu)

**Basic Commands (iOS):**
- Triple-click home button - Toggle VoiceOver
- Swipe right - Next element
- Swipe left - Previous element
- Double tap - Activate element
- Two-finger swipe down - Read all

---

## Testing Strategy

### Priority 1: Critical User Flows (30 minutes)

Test the most important user journeys:

1. **Landing Page → Login**
   - Navigate to login form
   - Fill out email/password fields
   - Submit form
   - Verify error messages are announced

2. **Dashboard Navigation**
   - Navigate main menu items
   - Verify all links are announced correctly
   - Test keyboard shortcuts (Cmd+K for search)
   - Verify notifications are announced

3. **Patient Search & View**
   - Use search functionality
   - Navigate to patient record
   - Verify all patient data is readable
   - Test form interactions

4. **Clinical Workflows**
   - Start new clinical note
   - Fill out SOAP note sections
   - Verify AI suggestions are announced
   - Save and submit note

### Priority 2: Component Testing (1 hour)

Test individual components systematically:

1. **Forms**
   - All inputs have associated labels
   - Required fields are indicated
   - Error messages are linked to fields
   - Validation feedback is announced

2. **Tables**
   - Table headers are properly marked
   - Row/column relationships are clear
   - Sorting/filtering is accessible
   - Empty states are announced

3. **Modals/Dialogs**
   - Focus is trapped inside modal
   - Escape key closes modal
   - Modal title is announced
   - Focus returns to trigger element on close

4. **Dynamic Content**
   - AJAX updates are announced (ARIA live regions)
   - Loading states are communicated
   - Error states are announced
   - Success messages are announced

### Priority 3: Comprehensive Audit (2-3 hours)

Full platform audit:

1. **Semantic HTML**
   - Headings are hierarchical (h1 → h2 → h3)
   - Landmarks are used (main, nav, aside)
   - Lists use proper markup (ul, ol)
   - Buttons vs links are used correctly

2. **ARIA Attributes**
   - aria-label for icon-only buttons
   - aria-describedby for help text
   - aria-live for dynamic content
   - aria-expanded for collapsible sections
   - aria-current for active navigation

3. **Keyboard Navigation**
   - All interactive elements are focusable
   - Tab order is logical
   - Focus indicators are visible
   - No keyboard traps
   - Skip links are available

---

## Testing Checklist

### Before You Start

- [ ] Install screen reader (NVDA/JAWS/VoiceOver)
- [ ] Learn basic navigation commands
- [ ] Close mouse/trackpad or don't touch it
- [ ] Use only keyboard + screen reader
- [ ] Have test credentials ready

### Landing Page

- [ ] Page title is announced
- [ ] Main heading is h1
- [ ] Navigation menu is accessible
- [ ] All links are announced with descriptive text
- [ ] Theme toggle is announced
- [ ] CTA buttons are clearly labeled

### Authentication

- [ ] Login form labels are associated with inputs
- [ ] Email field has correct type and autocomplete
- [ ] Password field is properly marked
- [ ] Submit button is clearly labeled
- [ ] Error messages are announced
- [ ] Success/redirect is communicated

### Dashboard Layout

- [ ] Main navigation is in a nav landmark
- [ ] Content area is in main landmark
- [ ] Sidebar is in aside landmark (if present)
- [ ] All navigation items are announced
- [ ] Theme toggle state is announced
- [ ] Notifications are announced with count
- [ ] Search shortcut (Cmd+K) works

### Patient Records

- [ ] Patient name is announced as main heading
- [ ] All patient data fields are labeled
- [ ] Vital signs have units announced
- [ ] Medication list is properly structured
- [ ] Lab results table is accessible
- [ ] Document links are descriptive
- [ ] Action buttons are clearly labeled

### Clinical Notes

- [ ] SOAP sections are announced as headings
- [ ] Text editor is accessible
- [ ] Voice recording button is labeled
- [ ] AI suggestions are announced
- [ ] Save/submit buttons are clear
- [ ] Validation errors are announced
- [ ] Success messages are communicated

### Portal (Patient View)

- [ ] Appointment list is accessible
- [ ] Medication details are clear
- [ ] Lab results are readable
- [ ] Document upload is accessible
- [ ] Form submissions work
- [ ] Consent flows are clear

### Theme Toggle

- [ ] Current theme state is announced
- [ ] Cycling through themes is communicated
- [ ] Light/Dark/Auto are announced
- [ ] Theme persists on page reload
- [ ] Keyboard shortcut works (Cmd+Shift+L)

### Forms & Inputs

- [ ] All inputs have associated labels
- [ ] Required fields are indicated
- [ ] Placeholder text is not the only label
- [ ] Error messages are linked to fields (aria-describedby)
- [ ] Validation feedback is announced
- [ ] Success messages are communicated
- [ ] Help text is accessible

### Modals & Dialogs

- [ ] Modal title is announced on open
- [ ] Focus moves into modal
- [ ] Focus is trapped in modal
- [ ] Escape key closes modal
- [ ] Close button is accessible
- [ ] Focus returns to trigger on close
- [ ] Background content is hidden (aria-hidden)

### Tables

- [ ] Table has caption or aria-label
- [ ] Column headers use th with scope="col"
- [ ] Row headers use th with scope="row" (if applicable)
- [ ] Sorting controls are accessible
- [ ] Empty state is announced
- [ ] Pagination is accessible

### Dynamic Content

- [ ] Loading states are announced
- [ ] AJAX updates use aria-live
- [ ] Error messages are announced
- [ ] Success toasts are announced
- [ ] Progress indicators are accessible
- [ ] Real-time updates are communicated

---

## Common Issues to Look For

### 🚫 Critical Issues (Block Release)

1. **Keyboard Traps**
   - User cannot tab out of element
   - Focus gets stuck in modal/dropdown
   - **Fix:** Implement focus trap with Escape key

2. **Unlabeled Interactive Elements**
   - Button has no accessible name
   - Link text is "click here" or icon only
   - **Fix:** Add aria-label or visible text

3. **Inaccessible Forms**
   - Input has no associated label
   - Error message not announced
   - **Fix:** Use label element or aria-labelledby

4. **Missing Skip Links**
   - No way to bypass navigation
   - Keyboard users must tab through everything
   - **Fix:** Add skip to main content link

### ⚠️ Serious Issues (Fix Soon)

1. **Poor Heading Structure**
   - Skipping heading levels (h1 → h3)
   - Multiple h1 elements
   - **Fix:** Ensure hierarchical h1 → h2 → h3

2. **Vague Link Text**
   - "Read more" without context
   - "Click here" links
   - **Fix:** Make link text descriptive

3. **Missing ARIA States**
   - Expandable sections don't announce state
   - Active navigation item not marked
   - **Fix:** Add aria-expanded, aria-current

4. **Poor Focus Indicators**
   - Focus outline removed without alternative
   - Focus indicator too subtle
   - **Fix:** Ensure 3:1 contrast ratio for focus

### ℹ️ Minor Issues (Nice to Have)

1. **Missing Landmarks**
   - No nav, main, or aside elements
   - Entire page in divs
   - **Fix:** Use semantic HTML5 landmarks

2. **Redundant ARIA**
   - aria-label on button with text
   - Unnecessary role attributes
   - **Fix:** Remove redundant ARIA

3. **Poor Table Structure**
   - Tables without th elements
   - Missing caption/summary
   - **Fix:** Add proper table markup

---

## Testing Workflow

### 1. Setup (5 minutes)

```bash
# Start development server
cd apps/web
pnpm dev

# Open in browser
open http://localhost:3000

# Enable screen reader
# NVDA: Insert + N (Windows)
# JAWS: Insert + J (Windows)
# VoiceOver: Cmd + F5 (macOS)
```

### 2. Navigation Test (10 minutes)

**Keyboard Only:**
- Tab through entire page
- Verify logical tab order
- Check focus indicators visible
- Ensure no keyboard traps
- Test skip links

**Screen Reader:**
- Use heading navigation (H key)
- Use landmark navigation (D key in NVDA)
- List all links (Insert + F7 in NVDA)
- List all buttons (B key)
- List all form fields (F key)

### 3. Interaction Test (15 minutes)

**Forms:**
- Fill out login form
- Submit with errors (blank fields)
- Verify error announcement
- Fill correctly and submit
- Verify success announcement

**Dynamic Content:**
- Trigger AJAX updates
- Verify announcements
- Test loading states
- Test error states

**Modals:**
- Open modal
- Verify focus trap
- Close with Escape
- Close with button
- Verify focus return

### 4. Content Test (10 minutes)

**Readability:**
- Read entire page (Insert + Down Arrow)
- Verify all content is announced
- Check for missing alt text
- Verify icon buttons are labeled
- Check table structure

**Structure:**
- Navigate by headings
- Verify heading hierarchy
- Check landmark navigation
- Verify list structures

---

## Recording Results

### Issue Template

```markdown
## Issue: [Brief Description]

**Severity:** Critical | Serious | Minor
**Screen Reader:** NVDA | JAWS | VoiceOver
**Browser:** Chrome | Firefox | Safari
**Page:** /dashboard/patients

**Steps to Reproduce:**
1. Navigate to /dashboard/patients
2. Tab to patient search
3. Enter patient name
4. Press Enter

**Expected Behavior:**
Search results should be announced with "3 patients found"

**Actual Behavior:**
No announcement, user doesn't know results loaded

**Suggested Fix:**
Add aria-live="polite" to results container:
```tsx
<div aria-live="polite" aria-atomic="true">
  {results.length} patients found
</div>
```

**WCAG Criteria:** 4.1.3 Status Messages (Level AA)
```

### Test Report Template

```markdown
# Screen Reader Test Report

**Date:** 2025-12-15
**Tester:** [Name]
**Screen Reader:** NVDA 2024.1
**Browser:** Chrome 120
**Platform:** Windows 11

## Summary

- ✅ 45 checks passed
- ⚠️ 3 serious issues found
- ℹ️ 5 minor issues found
- 🚫 0 critical issues

## Critical User Flows

### Login Flow
- ✅ Form labels accessible
- ✅ Error messages announced
- ✅ Success redirect communicated

### Dashboard Navigation
- ✅ All menu items accessible
- ⚠️ Theme toggle state not announced
- ✅ Notifications work

### Patient Records
- ✅ Patient data readable
- ✅ Forms accessible
- ⚠️ Table headers missing scope

## Issues Found

[Use issue template above for each issue]

## Recommendations

1. Add aria-label to theme toggle
2. Add scope attribute to table headers
3. Improve modal focus management
```

---

## Tools & Resources

### Testing Tools

1. **axe DevTools** (Browser Extension)
   - Automated accessibility testing
   - Chrome/Firefox extension
   - https://www.deque.com/axe/devtools/

2. **WAVE** (Browser Extension)
   - Visual accessibility evaluation
   - Shows ARIA attributes
   - https://wave.webaim.org/extension/

3. **Lighthouse** (Chrome DevTools)
   - Built into Chrome
   - Accessibility audit included
   - Run via DevTools → Lighthouse

4. **Screen Reader Testing Tools**
   - NVDA Speech Viewer - See what's announced
   - JAWS Text Viewer - View speech output
   - VoiceOver Caption Panel - See announcements

### Learning Resources

1. **WebAIM Screen Reader Testing Guide**
   - https://webaim.org/articles/screenreader_testing/

2. **NVDA User Guide**
   - https://www.nvaccess.org/files/nvda/documentation/userGuide.html

3. **JAWS Quick Start Guide**
   - https://support.freedomscientific.com/Downloads/JAWS

4. **VoiceOver Getting Started**
   - https://support.apple.com/guide/voiceover/welcome/mac

5. **WCAG 2.1 Guidelines**
   - https://www.w3.org/WAI/WCAG21/quickref/

6. **ARIA Authoring Practices**
   - https://www.w3.org/WAI/ARIA/apg/

---

## Quick Reference: Common ARIA Patterns

### Icon Buttons

```tsx
// Bad
<button><XIcon /></button>

// Good
<button aria-label="Close">
  <XIcon aria-hidden="true" />
</button>
```

### Form Labels

```tsx
// Bad
<input placeholder="Email" />

// Good
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### Error Messages

```tsx
// Bad
{error && <p className="text-red-500">{error}</p>}

// Good
<input
  id="email"
  aria-describedby={error ? "email-error" : undefined}
  aria-invalid={!!error}
/>
{error && (
  <p id="email-error" role="alert" className="text-red-500">
    {error}
  </p>
)}
```

### Live Regions

```tsx
// Announce updates
<div aria-live="polite" aria-atomic="true">
  {results.length} results found
</div>

// Announce errors
<div aria-live="assertive" role="alert">
  Error: Failed to save
</div>
```

### Expandable Sections

```tsx
<button
  aria-expanded={isOpen}
  aria-controls="section-content"
  onClick={() => setIsOpen(!isOpen)}
>
  {sectionTitle}
</button>
<div id="section-content" hidden={!isOpen}>
  {content}
</div>
```

### Modal Focus Trap

```tsx
import { Dialog } from '@headlessui/react';

<Dialog open={isOpen} onClose={closeModal}>
  <Dialog.Panel>
    <Dialog.Title>Modal Title</Dialog.Title>
    <Dialog.Description>
      Modal content
    </Dialog.Description>
    <button onClick={closeModal}>Close</button>
  </Dialog.Panel>
</Dialog>
```

---

## Platform-Specific Testing Notes

### Holi Labs Dashboard

**Key Areas:**
- Theme toggle - Must announce current state
- Patient search (Cmd+K) - Must work with keyboard
- Clinical note editor - Must be accessible
- AI suggestions - Must be announced
- Notifications - Must use aria-live

### Holi Labs Patient Portal

**Key Areas:**
- Appointment booking - All forms accessible
- Medication list - Table structure correct
- Lab results - Charts have text alternatives
- Document upload - Accessible file picker
- Messaging - Real-time updates announced

---

## Next Steps After Testing

1. **Document Issues**
   - Use issue template above
   - Prioritize by severity
   - Link to WCAG criteria

2. **Create Fix Plan**
   - Group related issues
   - Estimate effort
   - Assign to developers

3. **Implement Fixes**
   - Follow ARIA best practices
   - Test each fix with screen reader
   - Update automated tests

4. **Regression Testing**
   - Re-test all critical flows
   - Verify no new issues introduced
   - Update test documentation

5. **Continuous Monitoring**
   - Add screen reader tests to CI/CD
   - Regular accessibility audits
   - User testing with real screen reader users

---

## Success Criteria

### WCAG 2.1 Level AA Compliance

- ✅ All functionality available via keyboard
- ✅ All content has accessible name
- ✅ All form inputs have labels
- ✅ All images have alt text
- ✅ All dynamic content is announced
- ✅ Color is not the only visual indicator
- ✅ Focus indicators are visible
- ✅ Heading structure is hierarchical
- ✅ Tables have proper markup
- ✅ Error messages are accessible

### Real User Testing

Consider hiring actual screen reader users for:
- **Usability testing** - Can they complete tasks?
- **Feedback sessions** - What improvements needed?
- **Acceptance testing** - Does it meet their needs?

**Organizations to contact:**
- National Federation of the Blind (NFB)
- American Council of the Blind (ACB)
- Local disability advocacy groups

---

**Last Updated:** December 15, 2025
**Maintained By:** Accessibility Team
**Next Review:** March 2026
