# Browser-Specific Fixes & Workarounds

This document outlines all browser-specific issues encountered and their solutions.

## Table of Contents

1. [Safari Desktop & iOS](#safari-desktop--ios)
2. [Firefox](#firefox)
3. [Edge](#edge)
4. [Mobile Browsers](#mobile-browsers)
5. [Applied Fixes](#applied-fixes)
6. [Testing Procedures](#testing-procedures)

---

## Safari Desktop & iOS

### Issue 1: WebRTC getUserMedia Constraints

**Problem:** Safari doesn't support all MediaTrackConstraints properties that Chrome/Firefox support.

**Solution:**
```typescript
// Use browser detection utility
import { getWebRTCConstraints } from '@/lib/utils/browser-detection';

// Instead of:
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: { ideal: 1280 }, height: { ideal: 720 } }
});

// Use:
const constraints = getWebRTCConstraints({
  video: { width: { ideal: 1280 }, height: { ideal: 720 } }
});
const stream = await navigator.mediaDevices.getUserMedia(constraints);
```

**Files Affected:**
- `/src/components/video/VideoRoom.tsx`
- `/src/components/scribe/RealTimeTranscription.tsx`

**Status:** ✅ Utility function created at `/src/lib/utils/browser-detection.ts`

---

### Issue 2: Backdrop Filter Prefix Required

**Problem:** Safari requires `-webkit-backdrop-filter` prefix.

**Solution:**
```css
.glass-effect {
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px); /* Safari */
}
```

**Files Affected:**
- `/src/app/globals.css`
- `/src/styles/mobile.css`

**Status:** ✅ Already implemented in globals.css (lines 191, 207)

---

### Issue 3: LocalStorage with ITP (Intelligent Tracking Prevention)

**Problem:** Safari's ITP may block or limit localStorage in certain contexts (cross-site, private browsing).

**Solution:**
```typescript
// Always check for availability
import { hasLocalStorageSupport } from '@/lib/utils/browser-detection';

function saveToStorage(key: string, value: string) {
  if (!hasLocalStorageSupport()) {
    // Fallback to server-side storage
    return saveToServer(key, value);
  }

  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // ITP blocked or quota exceeded
    console.warn('localStorage unavailable:', error);
    return saveToServer(key, value);
  }
}
```

**Files Affected:**
- `/src/hooks/useDeviceSync.ts` (line 266)
- Any component using localStorage

**Status:** ⚠️ Utility function created, needs implementation in affected files

---

### Issue 4: Date Input Format

**Problem:** Safari's native date picker format differs from Chrome/Firefox.

**Solution:**
```typescript
// Always use ISO format (YYYY-MM-DD)
<input
  type="date"
  value="2024-01-15" // ISO format works in all browsers
/>

// When parsing, use date-fns for consistency
import { format, parse } from 'date-fns';

const dateString = format(new Date(), 'yyyy-MM-dd');
```

**Files Affected:**
- All forms with date inputs
- Patient registration forms
- Appointment booking

**Status:** ⚠️ Needs audit of all date inputs

---

### Issue 5: 100vh on Mobile Safari

**Problem:** Safari mobile includes address bar in 100vh, causing content to be cut off.

**Solution:**
```typescript
// Use custom CSS variable (already set up)
import { setupViewportHeight } from '@/lib/utils/browser-detection';

// In _app.tsx or layout.tsx
useEffect(() => {
  setupViewportHeight();
}, []);
```

```css
/* Use custom --vh variable instead of 100vh */
.full-height {
  height: 100vh; /* Fallback */
  height: calc(var(--vh, 1vh) * 100); /* Safari fix */
}
```

**Status:** ⚠️ Utility function created, needs integration in layout

---

### Issue 6: Cookie SameSite Restrictions

**Problem:** Safari enforces strict SameSite cookie policies.

**Solution:**
```typescript
// In Next.js API routes
export default function handler(req, res) {
  res.setHeader('Set-Cookie', [
    `session=${token}; Path=/; HttpOnly; Secure; SameSite=None`
  ]);
}
```

**Files Affected:**
- `/src/app/api/auth/[...nextauth]/route.ts`
- All API routes setting cookies

**Status:** ⚠️ Needs verification in auth configuration

---

### Issue 7: Web Push Notifications Not Supported on iOS

**Problem:** iOS Safari doesn't support Web Push API.

**Solution:**
```typescript
import { hasPushNotificationSupport } from '@/lib/utils/browser-detection';

function NotificationSettings() {
  const canUsePush = hasPushNotificationSupport();

  return (
    <div>
      {canUsePush ? (
        <PushNotificationToggle />
      ) : (
        <AlertMessage>
          Push notifications are not available on iOS.
          You'll receive notifications via email instead.
        </AlertMessage>
      )}
    </div>
  );
}
```

**Status:** ✅ Detection function created

---

### Issue 8: Screen Sharing Not Supported on iOS

**Problem:** iOS doesn't support getDisplayMedia for screen sharing.

**Solution:**
```typescript
import { hasScreenShareSupport } from '@/lib/utils/browser-detection';

function VideoControls() {
  const canShareScreen = hasScreenShareSupport();

  return (
    <div>
      {canShareScreen && (
        <button onClick={startScreenShare}>
          Share Screen
        </button>
      )}
    </div>
  );
}
```

**Files Affected:**
- `/src/components/video/VideoRoom.tsx` (line 141-166)

**Status:** ⚠️ Detection added, needs conditional rendering

---

### Issue 9: Form Input Autofill Styling

**Problem:** Safari's autofill background color can clash with dark mode.

**Solution:**
```css
/* Override autofill styles for both themes */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px white inset !important;
  box-shadow: 0 0 0 30px white inset !important;
}

/* Dark mode autofill */
.dark input:-webkit-autofill,
.dark input:-webkit-autofill:hover,
.dark input:-webkit-autofill:focus,
.dark input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px hsl(var(--background)) inset !important;
  box-shadow: 0 0 0 30px hsl(var(--background)) inset !important;
  -webkit-text-fill-color: hsl(var(--foreground)) !important;
}
```

**Status:** ⚠️ Needs to be added to globals.css

---

## Firefox

### Issue 1: Flexbox min-height with flex-direction: column

**Problem:** Firefox calculates flex container height differently.

**Solution:**
```css
.flex-container {
  display: flex;
  flex-direction: column;
  min-height: 0; /* Firefox needs explicit min-height */
}

.flex-item {
  flex: 1 1 auto;
  min-height: 0; /* Allows shrinking in Firefox */
}
```

**Status:** ⚠️ Audit needed for flex layouts

---

### Issue 2: Form Validation Message Styling

**Problem:** Firefox's default validation bubbles have different styling.

**Solution:**
```typescript
// Use custom validation instead of browser default
<input
  type="email"
  onInvalid={(e) => {
    e.preventDefault();
    setCustomError('Please enter a valid email');
  }}
/>
```

**Status:** ⚠️ Consider custom validation UI

---

### Issue 3: Date Input Support

**Problem:** Firefox has limited styling options for native date picker.

**Solution:**
```typescript
// Use custom date picker library if needed
import DatePicker from 'react-datepicker';

// Or detect and show appropriate UI
import { needsDatePickerPolyfill } from '@/lib/utils/browser-detection';

function DateInput({ value, onChange }) {
  if (needsDatePickerPolyfill()) {
    return <CustomDatePicker value={value} onChange={onChange} />;
  }

  return <input type="date" value={value} onChange={onChange} />;
}
```

**Status:** ⚠️ Utility function created, needs implementation

---

## Edge (Chromium)

### Status

Edge (Chromium-based) has excellent compatibility with Chrome. No specific fixes needed for modern Edge.

**Legacy Edge (EdgeHTML):** Not supported. Minimum supported version is Edge 88+ (Chromium).

---

## Mobile Browsers

### Issue 1: Touch Target Size

**Problem:** Touch targets smaller than 44x44px are difficult to tap.

**Solution:**
```css
/* Already implemented in mobile.css */
button, a.clickable, [role="button"] {
  min-height: 44px;
  min-width: 44px;
}
```

**Status:** ✅ Implemented in `/src/styles/mobile.css` (lines 66-76)

---

### Issue 2: iOS Keyboard Viewport Shift

**Problem:** iOS keyboard causes viewport to shift and content to be hidden.

**Solution:**
```css
/* Already implemented */
.ios-keyboard-fix {
  position: fixed;
  width: 100%;
}

/* Prevent zoom on focus */
input, textarea, select {
  font-size: 16px !important;
}
```

**Status:** ✅ Implemented in `/src/styles/mobile.css` (lines 31-41, 145-148)

---

### Issue 3: Pull-to-Refresh Conflict

**Problem:** Native pull-to-refresh may conflict with custom scroll behavior.

**Solution:**
```css
/* Disable native pull-to-refresh if implementing custom */
body {
  overscroll-behavior-y: contain;
}
```

**Status:** ⚠️ Add if implementing custom pull-to-refresh

---

### Issue 4: Active State for Touch Devices

**Problem:** Hover states don't work on touch devices.

**Solution:**
```css
/* Already implemented */
@media (hover: none) {
  button:active,
  a:active {
    opacity: 0.7;
    transform: scale(0.98);
  }
}
```

**Status:** ✅ Implemented in `/src/styles/mobile.css` (lines 79-87)

---

### Issue 5: Safe Area Insets (Notch)

**Problem:** Content gets hidden behind iOS notch and home indicator.

**Solution:**
```css
/* Already implemented */
@supports (padding: max(0px)) {
  body {
    padding-top: max(0px, env(safe-area-inset-top));
    padding-bottom: max(0px, env(safe-area-inset-bottom));
  }
}
```

**Status:** ✅ Implemented in `/src/styles/mobile.css` (lines 12-19)

---

## Applied Fixes

### ✅ Completed

1. **Backdrop filter prefix** - Added -webkit prefix in globals.css
2. **iOS safe area** - Implemented with env() variables
3. **Touch-friendly targets** - Minimum 44x44px buttons
4. **Tap highlight removal** - Disabled iOS tap highlight
5. **Keyboard zoom prevention** - 16px minimum font size on inputs
6. **Browser detection utilities** - Created comprehensive detection library
7. **WebRTC constraints helper** - Cross-browser compatible constraints
8. **Feature detection functions** - For all major Web APIs

### ⚠️ Needs Implementation

1. **localStorage fallback** - Add server-side fallback in critical flows
2. **Date input audit** - Ensure all date inputs use ISO format
3. **Cookie SameSite** - Verify auth cookies have correct attributes
4. **Viewport height setup** - Integrate into layout component
5. **Screen share conditional** - Hide button on iOS
6. **Autofill styling** - Add dark mode compatible autofill styles
7. **Custom validation UI** - Consider replacing browser default validation
8. **Flexbox audit** - Check all flex layouts for Firefox compatibility

---

## Testing Procedures

### Manual Testing Checklist

#### Safari Desktop (macOS)
```bash
# Test with Safari 17+
1. Open Safari
2. Navigate to http://localhost:3000
3. Test:
   - Login flow
   - Date pickers
   - Video call (WebRTC)
   - LocalStorage persistence
   - Dark mode
   - Form validation
```

#### Safari Mobile (iOS)
```bash
# Test on iPhone/iPad with iOS 17+
1. Open in Safari
2. Test:
   - Touch targets (tap accuracy)
   - Viewport with keyboard open
   - Safe area around notch
   - Portrait/landscape
   - Add to Home Screen (PWA)
   - No push notifications available
   - No screen sharing available
```

#### Firefox
```bash
# Test with Firefox 121+
1. Open Firefox
2. Navigate to http://localhost:3000
3. Test:
   - Form validation messages
   - Flexbox layouts
   - Date/time inputs
   - WebRTC video calls
```

#### Chrome Android
```bash
# Test on Android device
1. Open Chrome
2. Test:
   - Touch interactions
   - Pull-to-refresh
   - Address bar scrolling
   - Landscape mode
   - Add to Home Screen
```

### Automated Testing

```bash
# Run Playwright tests across all browsers
pnpm test:e2e

# Run specific browser
pnpm playwright test --project=webkit    # Safari
pnpm playwright test --project=firefox   # Firefox
pnpm playwright test --project=chromium  # Chrome

# Run mobile tests
pnpm playwright test --project=mobile-safari-iphone
pnpm playwright test --project=mobile-chrome-android

# Generate report
pnpm playwright show-report
```

### Continuous Integration

Add to GitHub Actions:
```yaml
- name: Run Playwright Tests
  run: |
    pnpm install
    pnpm playwright install --with-deps
    pnpm test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

---

## Quick Reference

### Browser Detection

```typescript
import {
  isSafari,
  isIOSSafari,
  isFirefox,
  isChrome,
  isMobile,
  getBrowserInfo,
} from '@/lib/utils/browser-detection';

const browserInfo = getBrowserInfo();
console.log(browserInfo);
// {
//   name: 'safari',
//   version: '17',
//   isMobile: true,
//   isIOS: true,
//   supportsWebRTC: true,
//   supportsPushNotifications: false,
// }
```

### Feature Detection

```typescript
import {
  hasWebRTCSupport,
  hasPushNotificationSupport,
  hasScreenShareSupport,
  hasLocalStorageSupport,
} from '@/lib/utils/browser-detection';

// Always check before using features
if (hasWebRTCSupport()) {
  startVideoCall();
} else {
  showAudioOnlyOption();
}
```

### WebRTC Cross-Browser

```typescript
import { getWebRTCConstraints } from '@/lib/utils/browser-detection';

const constraints = getWebRTCConstraints({
  video: { width: { ideal: 1280 }, height: { ideal: 720 } },
  audio: true,
});

const stream = await navigator.mediaDevices.getUserMedia(constraints);
```

### Clipboard

```typescript
import { copyToClipboard } from '@/lib/utils/browser-detection';

const success = await copyToClipboard('Text to copy');
if (success) {
  showToast('Copied!');
}
```

---

## Resources

- [Safari Web Content Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/Introduction/Introduction.html)
- [Firefox Browser Compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox)
- [Can I Use](https://caniuse.com/) - Browser support tables
- [WebKit Blog](https://webkit.org/blog/) - Safari updates
- [iOS Web App Meta Tags](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)

---

## Maintenance

**Review Schedule:**
- After each major browser update (quarterly)
- When adding new Web API features
- When user reports browser-specific issues
- Before major releases

**Update Process:**
1. Test new browser versions
2. Update compatibility matrix
3. Add new fixes to this document
4. Update browser detection utility if needed
5. Run full test suite
6. Update documentation

---

Last Updated: 2025-12-15
Next Review: 2026-03-15
