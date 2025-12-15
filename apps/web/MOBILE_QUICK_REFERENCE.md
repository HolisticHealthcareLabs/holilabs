# Mobile Responsiveness Quick Reference

**TL;DR:** Quick fixes for common mobile issues

---

## 1. Fixed Width Elements → Responsive

### Problem
```tsx
// ❌ WRONG - Causes horizontal scroll on mobile
<div className="min-w-[800px]">
```

### Solution
```tsx
// ✅ CORRECT - Responsive with mobile-first approach
<div className="min-w-full md:min-w-[800px]">
```

**Files to Fix:**
- `/src/app/dashboard/prevention/hub/page.tsx:440`
- `/src/app/dashboard/patients/[id]/mar/page.tsx`

---

## 2. Touch Targets → Minimum 44x44px

### Problem
```tsx
// ❌ WRONG - Too small to tap reliably (36px²)
<button className="w-9 h-9">
  <svg className="w-5 h-5" />
</button>
```

### Solution
```tsx
// ✅ CORRECT - Meeting Apple/Google guidelines (44px²)
<button className="w-11 h-11 min-w-[44px] min-h-[44px]">
  <svg className="w-6 h-6" />
</button>
```

**Files to Fix:**
- `/src/app/page.tsx:219` - Language selector
- Various icon buttons throughout

---

## 3. Text Size → Prevent iOS Zoom

### Problem
```tsx
// ❌ WRONG - iOS will zoom on input focus
<input className="text-[14px]" />
<span className="text-[10px]">Badge</span>
```

### Solution
```tsx
// ✅ CORRECT - 16px minimum for inputs
<input className="text-base" /> {/* 16px */}
<span className="text-xs">Badge</span> {/* 12px OK for non-interactive */}
```

**Files to Fix:**
- `/src/app/dashboard/layout.tsx:263` - Badge text

---

## 4. Navigation → Mobile Menu

### Problem
```tsx
// ❌ WRONG - Desktop-only navigation
<div className="hidden md:flex items-center space-x-8">
  {/* Nav links */}
</div>
```

### Solution
```tsx
// ✅ CORRECT - Mobile hamburger menu
<div>
  {/* Mobile menu button */}
  <button
    className="md:hidden"
    onClick={() => setMobileMenuOpen(true)}
  >
    <svg>☰</svg>
  </button>

  {/* Desktop nav */}
  <div className="hidden md:flex items-center space-x-8">
    {/* Nav links */}
  </div>
</div>
```

**Files to Fix:**
- `/src/app/page.tsx` - Landing page nav

---

## 5. Modals → Mobile-Friendly

### Problem
```tsx
// ❌ WRONG - May overflow on mobile
<div className="max-w-2xl w-full">
  {/* Modal content */}
</div>
```

### Solution
```tsx
// ✅ CORRECT - Padding and max height for mobile
<div className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
  {/* Modal content */}
</div>
```

**Files to Fix:**
- `/src/components/onboarding/WelcomeModal.tsx`
- Various modal components

---

## 6. Responsive Grid → Mobile Stack

### Problem
```tsx
// ❌ WRONG - Grid always 4 columns
<div className="grid grid-cols-4 gap-6">
```

### Solution
```tsx
// ✅ CORRECT - Mobile-first responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
```

---

## 7. Responsive Spacing

### Problem
```tsx
// ❌ WRONG - Same padding on all screens
<div className="p-8">
```

### Solution
```tsx
// ✅ CORRECT - Mobile-first spacing
<div className="p-4 md:p-6 lg:p-8">
```

---

## 8. Tables → Horizontal Scroll

### Problem
```tsx
// ❌ WRONG - Table overflows
<table className="min-w-full">
```

### Solution
```tsx
// ✅ CORRECT - Wrapper with scroll
<div className="overflow-x-auto">
  <table className="min-w-full">
    {/* Table content */}
  </table>
</div>
```

---

## 9. Text Hierarchy → Responsive

### Problem
```tsx
// ❌ WRONG - Too large on small screens
<h1 className="text-7xl">
```

### Solution
```tsx
// ✅ CORRECT - Responsive text scale
<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl">
```

---

## 10. Form Inputs → Mobile Optimization

### Problem
```tsx
// ❌ WRONG - No mobile optimization
<input type="text" />
```

### Solution
```tsx
// ✅ CORRECT - Proper mobile attributes
<input
  type="email"
  inputMode="email"
  autoComplete="email"
  className="w-full min-h-[44px] text-base"
/>
```

---

## Tailwind Breakpoints Reference

```tsx
// Default (mobile-first)
<div className="text-sm">         // 0px and up (all screens)

// sm: 640px
<div className="sm:text-base">    // 640px and up

// md: 768px
<div className="md:text-lg">      // 768px and up

// lg: 1024px
<div className="lg:text-xl">      // 1024px and up

// xl: 1280px
<div className="xl:text-2xl">     // 1280px and up

// 2xl: 1536px
<div className="2xl:text-3xl">    // 1536px and up
```

---

## Common Class Patterns

### Container Width
```tsx
// Full width on mobile, constrained on desktop
<div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

### Flex Direction
```tsx
// Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row">
```

### Hide/Show
```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">

// Show on mobile, hide on desktop
<div className="md:hidden">
```

### Grid Layout
```tsx
// 1 column mobile, 2 tablet, 3 desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## Testing Commands

### Run Mobile Audit Script
```bash
./scripts/check-mobile-responsiveness.sh
```

### Chrome DevTools Mobile Testing
```
1. F12 to open DevTools
2. Ctrl+Shift+M for device mode
3. Select device preset
4. Test interactions
```

### Lighthouse Mobile Audit
```bash
npm run lighthouse -- --preset=mobile
```

---

## Priority Order for Fixes

### P0 (Critical) - Fix Immediately
1. Fixed-width elements causing horizontal scroll
2. Touch targets < 44x44px
3. Text causing iOS zoom
4. Mobile navigation missing

### P1 (High) - Fix This Week
1. Modal overflow on mobile
2. Form input optimization
3. Table scroll handling
4. Hover-only interactions

### P2 (Medium) - Fix Next Week
1. Responsive spacing
2. Text hierarchy
3. Image optimization
4. Animation performance

---

## Quick Testing Viewports

```tsx
// iPhone SE (smallest)
375 x 667

// iPhone 14 (standard)
390 x 844

// Most common Android
360 x 640

// iPad
820 x 1180
```

---

## Resources

- Full Audit: `MOBILE_RESPONSIVENESS_AUDIT.md`
- Testing Checklist: `MOBILE_TESTING_CHECKLIST.md`
- Audit Script: `scripts/check-mobile-responsiveness.sh`

---

## Need Help?

1. Run the audit script: `./scripts/check-mobile-responsiveness.sh`
2. Check the full audit report: `MOBILE_RESPONSIVENESS_AUDIT.md`
3. Use the testing checklist: `MOBILE_TESTING_CHECKLIST.md`
4. Test on real devices before deploying

---

**Last Updated:** December 15, 2025
