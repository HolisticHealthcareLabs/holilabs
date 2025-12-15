# Mobile Testing Checklist

**Project:** Holi Labs v2
**Purpose:** Ensure mobile responsiveness across all key application pages
**Target:** 60% of healthcare users access platform on mobile

---

## Quick Reference

### Mobile Breakpoints (Tailwind)
- **sm:** 640px and up
- **md:** 768px and up
- **lg:** 1024px and up
- **xl:** 1280px and up
- **2xl:** 1536px and up

### Touch Target Sizes
- ✅ **Minimum:** 44x44px (iOS HIG)
- ✅ **Recommended:** 48x48px (Material Design)
- ❌ **Too Small:** < 40x40px

### Text Sizes
- ✅ **Body:** 16px (1rem) minimum
- ✅ **Small:** 14px (0.875rem) minimum for non-interactive text
- ❌ **Avoid:** < 14px for any readable text

---

## Testing Viewports

### Mobile Phones
- [ ] **iPhone SE** - 375 x 667 (smallest modern iPhone)
- [ ] **iPhone 14** - 390 x 844 (standard)
- [ ] **iPhone 14 Pro Max** - 430 x 932 (largest iPhone)
- [ ] **Android Small** - 360 x 640 (most common Android)
- [ ] **Android Medium** - 360 x 800 (Samsung Galaxy S20)
- [ ] **Android Large** - 412 x 915 (Pixel 6)

### Tablets
- [ ] **iPad Mini** - 744 x 1133
- [ ] **iPad** - 820 x 1180
- [ ] **iPad Pro** - 1024 x 1366

### Landscape Mode
- [ ] Test all key pages in landscape orientation
- [ ] Verify navigation works in landscape
- [ ] Check that modals fit in landscape

---

## Page-by-Page Checklist

### 1. Landing Page (/)

#### Layout
- [ ] Hero section displays correctly
- [ ] No horizontal scrolling
- [ ] Navigation collapses to hamburger menu on mobile
- [ ] Text is readable without zooming
- [ ] Images load and scale properly
- [ ] CTA buttons are visible and tappable

#### Navigation
- [ ] Mobile menu opens/closes smoothly
- [ ] All navigation links accessible
- [ ] Language selector works on mobile
- [ ] Theme toggle accessible
- [ ] Touch targets ≥ 44x44px

#### Forms
- [ ] Email signup form works
- [ ] Input fields full width on mobile
- [ ] Submit button clearly visible
- [ ] Keyboard doesn't obscure fields
- [ ] Success/error messages visible

#### Performance
- [ ] Page loads in < 3 seconds on 3G
- [ ] Images optimized for mobile
- [ ] No layout shift (CLS < 0.1)

---

### 2. Dashboard (/dashboard)

#### Layout
- [ ] Stats cards stack vertically on mobile
- [ ] Sidebar hidden by default on mobile
- [ ] Hamburger menu opens sidebar
- [ ] Content doesn't overflow
- [ ] White space appropriate for small screens

#### Navigation
- [ ] Mobile menu accessible
- [ ] Can navigate to all sections
- [ ] Back button works correctly
- [ ] Breadcrumbs readable
- [ ] Profile menu accessible

#### Widgets
- [ ] All KPI widgets display correctly
- [ ] Charts/graphs scale properly
- [ ] Interactive elements work on touch
- [ ] Command palette (Cmd+K) works
- [ ] Notifications accessible

#### Quick Actions
- [ ] FAB (Floating Action Button) visible
- [ ] Quick actions menu works
- [ ] Patient search works on mobile
- [ ] Create new actions accessible

---

### 3. Patient List (/dashboard/patients)

#### Layout
- [ ] Patient cards stack on mobile
- [ ] Search bar full width
- [ ] Filters accessible
- [ ] Sort options work
- [ ] Pagination visible

#### Table View
- [ ] Table scrolls horizontally if needed
- [ ] Most important columns visible
- [ ] Row actions accessible
- [ ] Can view patient details

#### Actions
- [ ] Add patient button visible
- [ ] Tap on patient opens details
- [ ] Bulk actions work (if applicable)
- [ ] Export options accessible

---

### 4. Patient Details (/dashboard/patients/[id])

#### Layout
- [ ] Patient header displays correctly
- [ ] Tabs work on mobile
- [ ] Content scrolls properly
- [ ] No horizontal overflow

#### Forms
- [ ] Edit patient form works
- [ ] All fields accessible
- [ ] Save button visible
- [ ] Validation messages clear

#### Documents
- [ ] Documents list readable
- [ ] Can view documents
- [ ] Upload works on mobile
- [ ] Download works

---

### 5. Patient Portal (/portal/dashboard)

#### Layout
- [ ] Circular navigation works
- [ ] Stats cards display correctly
- [ ] Quick access circles appropriately sized
- [ ] Content readable

#### Navigation
- [ ] Bottom nav bar (if used) accessible
- [ ] All sections reachable
- [ ] Back navigation works
- [ ] Sidebar collapsible

#### Patient Actions
- [ ] Book appointment works
- [ ] View medications accessible
- [ ] Messages readable and sendable
- [ ] Lab results viewable

---

### 6. Appointments (/dashboard/appointments)

#### Layout
- [ ] Calendar view works on mobile
- [ ] List view as fallback
- [ ] Appointment cards readable
- [ ] Time slots clear

#### Booking
- [ ] Date picker works on mobile
- [ ] Time selection works
- [ ] Patient selection accessible
- [ ] Confirmation clear

---

### 7. Messaging (/dashboard/messages)

#### Layout
- [ ] Conversation list displays
- [ ] Message thread readable
- [ ] Input field accessible
- [ ] Send button always visible

#### Functionality
- [ ] Can send messages
- [ ] Can attach files
- [ ] Keyboard behavior correct
- [ ] Scroll to latest message

---

### 8. Co-Pilot AI (/dashboard/co-pilot)

#### Layout
- [ ] Tile grid responsive
- [ ] Tools accessible
- [ ] Chat interface works
- [ ] Results readable

#### Interaction
- [ ] Voice input works (if enabled)
- [ ] Text input always accessible
- [ ] Suggestions tappable
- [ ] AI responses formatted well

---

### 9. Forms

#### Input Fields
- [ ] All inputs ≥ 44px height
- [ ] Text ≥ 16px (prevents iOS zoom)
- [ ] Proper input types (email, tel, number)
- [ ] Autocomplete attributes set
- [ ] Labels always visible

#### Buttons
- [ ] Primary actions clearly visible
- [ ] Touch targets ≥ 44x44px
- [ ] Loading states clear
- [ ] Disabled states obvious

#### Validation
- [ ] Error messages visible
- [ ] Success feedback clear
- [ ] Inline validation works
- [ ] Form submission feedback

---

### 10. Modals & Dialogs

#### Display
- [ ] Modal fits screen with padding
- [ ] Close button accessible
- [ ] Content scrollable if tall
- [ ] Backdrop dismisses modal
- [ ] Escape key closes (if keyboard)

#### Content
- [ ] Title readable
- [ ] Body text clear
- [ ] Actions visible
- [ ] No overflow

---

## Common Issues Checklist

### Layout Issues
- [ ] No horizontal scrolling (except intentional)
- [ ] Content doesn't overflow viewport
- [ ] Fixed elements don't obscure content
- [ ] Z-index layering correct
- [ ] Spacing appropriate for screen size

### Text Issues
- [ ] All text readable without zoom
- [ ] Line height appropriate
- [ ] Contrast ratio sufficient (4.5:1 for body)
- [ ] Font sizes responsive
- [ ] Text doesn't overflow containers

### Touch Targets
- [ ] All buttons ≥ 44x44px
- [ ] Links have adequate spacing
- [ ] Form inputs ≥ 44px height
- [ ] Icon buttons large enough
- [ ] No accidental taps

### Images & Media
- [ ] Images scale properly
- [ ] Aspect ratios maintained
- [ ] Loading states shown
- [ ] Alt text present
- [ ] Videos playable

### Navigation
- [ ] Mobile menu accessible
- [ ] Can navigate to all pages
- [ ] Back button works
- [ ] Active state clear
- [ ] Breadcrumbs responsive

### Forms
- [ ] Input fields full width
- [ ] Labels visible
- [ ] Placeholders clear
- [ ] Submit button accessible
- [ ] Error handling works

### Performance
- [ ] Page load < 3s on 3G
- [ ] Smooth scrolling
- [ ] No jank in animations
- [ ] Touch response immediate
- [ ] Assets optimized

---

## Browser Testing

### iOS Safari
- [ ] Latest iOS version
- [ ] iOS 15 (older devices)
- [ ] Portrait mode
- [ ] Landscape mode
- [ ] Private browsing mode

### Chrome Mobile
- [ ] Latest version
- [ ] Android Chrome
- [ ] iOS Chrome
- [ ] Incognito mode

### Firefox Mobile
- [ ] Latest version
- [ ] Private browsing

### Samsung Internet
- [ ] Latest version (popular in Asia)

---

## Accessibility Tests

### Screen Reader
- [ ] VoiceOver (iOS) works
- [ ] TalkBack (Android) works
- [ ] All interactive elements announced
- [ ] Proper heading structure
- [ ] Alt text for images

### Keyboard Navigation
- [ ] Can tab through form
- [ ] Focus visible
- [ ] Logical tab order
- [ ] Escape closes modals
- [ ] Enter submits forms

### Touch Gestures
- [ ] Swipe navigation works (if implemented)
- [ ] Pinch zoom works (if allowed)
- [ ] Long press works (if used)
- [ ] Double tap works (if used)

---

## Performance Metrics

### Core Web Vitals (Mobile)
- [ ] **LCP** (Largest Contentful Paint) < 2.5s
- [ ] **FID** (First Input Delay) < 100ms
- [ ] **CLS** (Cumulative Layout Shift) < 0.1

### Additional Metrics
- [ ] **FCP** (First Contentful Paint) < 1.8s
- [ ] **TTI** (Time to Interactive) < 3.8s
- [ ] **TBT** (Total Blocking Time) < 200ms
- [ ] **SI** (Speed Index) < 3.4s

### Network Conditions
- [ ] 4G (fast mobile)
- [ ] 3G (slow mobile)
- [ ] Offline mode (if applicable)
- [ ] Flaky connection

---

## Device-Specific Tests

### iOS Specific
- [ ] Safe area insets respected
- [ ] Status bar doesn't overlap content
- [ ] Notch/Dynamic Island considered
- [ ] Scroll bounce works appropriately
- [ ] Form inputs don't cause zoom

### Android Specific
- [ ] Material Design guidelines followed
- [ ] Hardware back button works
- [ ] App bar behavior correct
- [ ] Keyboard handling proper
- [ ] Various screen sizes work

---

## Quick Test Commands

### Chrome DevTools
```
1. Open DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select device preset or enter custom dimensions
4. Test responsive design mode
5. Throttle network to "Fast 3G"
```

### Lighthouse Mobile Audit
```bash
# Run mobile audit
npm run lighthouse -- --preset=mobile

# Or in DevTools
1. Open DevTools > Lighthouse tab
2. Select "Mobile" device
3. Select categories
4. Click "Generate report"
```

### Browser Testing
```bash
# Test on real iOS device via Safari
1. Connect iPhone via USB
2. Enable Web Inspector on iPhone
3. Safari > Develop > [Device] > Page
```

---

## Bug Reporting Template

When you find a mobile issue:

```markdown
### [MOBILE] Issue Title

**Device:** iPhone 14 Pro (390x844)
**Browser:** Safari 17.2
**Page:** /dashboard/patients
**Severity:** High

**Description:**
[Clear description of the issue]

**Steps to Reproduce:**
1. Step one
2. Step two
3. See error

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshot:**
[Attach screenshot]

**Proposed Fix:**
[Suggested solution if known]
```

---

## Sign-Off Checklist

Before marking mobile responsiveness as complete:

- [ ] All P0 (Critical) issues resolved
- [ ] All P1 (High) issues resolved
- [ ] Tested on minimum 3 real devices
- [ ] Lighthouse mobile score ≥ 90
- [ ] All key user flows work on mobile
- [ ] No horizontal scrolling (except intentional)
- [ ] All touch targets meet size requirements
- [ ] Forms work properly on mobile
- [ ] Navigation accessible on mobile
- [ ] Performance metrics met
- [ ] Stakeholder approval obtained

---

## Resources

- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [iOS Simulator](https://developer.apple.com/documentation/safari-developer-tools)
- [BrowserStack](https://www.browserstack.com/) - Real device testing
- [WebPageTest Mobile Testing](https://www.webpagetest.org/)
- [Can I Use](https://caniuse.com/) - Browser compatibility

---

**Version:** 1.0
**Last Updated:** December 15, 2025
**Maintained By:** Agent 28
