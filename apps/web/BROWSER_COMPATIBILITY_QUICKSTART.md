# Cross-Browser Compatibility - Quick Start Guide

Get up and running with cross-browser testing in 5 minutes.

## Quick Overview

Your app is designed to work on:
- Chrome 120+ ✅
- Firefox 121+ ✅
- Safari 17+ ⚠️ (Some limitations)
- Edge 120+ ✅
- iOS Safari 17+ ⚠️ (No push notifications, no screen share)
- Android Chrome 120+ ✅

## Instant Testing Setup

### 1. Run Playwright Tests (2 minutes)

```bash
# Install Playwright browsers (one-time setup)
pnpm playwright install --with-deps

# Run all cross-browser tests
pnpm playwright test

# Run specific browser
pnpm playwright test --project=webkit     # Safari
pnpm playwright test --project=firefox    # Firefox
pnpm playwright test --project=chromium   # Chrome

# Run mobile tests
pnpm playwright test --project=mobile-safari-iphone
pnpm playwright test --project=mobile-chrome-android

# View report
pnpm playwright show-report
```

### 2. Manual Browser Testing (3 minutes)

Open your app in different browsers:

```bash
# Start dev server
pnpm dev

# Then open in each browser:
# Chrome:   http://localhost:3000
# Firefox:  http://localhost:3000
# Safari:   http://localhost:3000
```

Test these critical flows:
1. ✅ Login/logout
2. ✅ Create a patient
3. ✅ Dark mode toggle
4. ✅ Form validation
5. ✅ File upload

## Common Issues & Quick Fixes

### Safari Date Inputs

**Problem:** Date picker looks different in Safari

**Quick Fix:** Already handled! We use ISO format (YYYY-MM-DD) which works everywhere.

```typescript
// ✅ Good - Works in all browsers
<input type="date" value="2024-01-15" />

// ❌ Bad - May not work in Safari
<input type="date" value="01/15/2024" />
```

### Safari WebRTC

**Problem:** Video calls need special constraints in Safari

**Quick Fix:** Use our utility function:

```typescript
import { getWebRTCConstraints } from '@/lib/utils/browser-detection';

// ✅ Good - Works in all browsers
const constraints = getWebRTCConstraints({ video: true, audio: true });
const stream = await navigator.mediaDevices.getUserMedia(constraints);
```

### iOS No Push Notifications

**Problem:** iOS Safari doesn't support Web Push

**Quick Fix:** Check before showing push notification UI:

```typescript
import { hasPushNotificationSupport } from '@/lib/utils/browser-detection';

if (hasPushNotificationSupport()) {
  // Show push notification toggle
} else {
  // Show alternative (email notifications)
}
```

### Mobile Viewport Height

**Problem:** 100vh includes address bar on mobile Safari

**Quick Fix:** Already handled in CSS:

```css
/* We automatically use --vh variable */
.min-h-screen {
  min-height: calc(var(--vh, 1vh) * 100);
}
```

## Browser Detection Utilities

We've created utilities for common browser checks:

```typescript
import {
  isSafari,
  isIOSSafari,
  isFirefox,
  isMobile,
  hasWebRTCSupport,
  hasScreenShareSupport,
} from '@/lib/utils/browser-detection';

// Check browser
if (isSafari()) {
  // Safari-specific code
}

// Check features (preferred over browser detection)
if (hasScreenShareSupport()) {
  // Show screen share button
}
```

## Testing Checklist

Use this quick checklist for manual testing:

### Desktop Browsers
- [ ] Chrome - Login works
- [ ] Firefox - Forms validate
- [ ] Safari - Video calls work
- [ ] Edge - Dark mode toggles

### Mobile Browsers
- [ ] iOS Safari - Touch targets work (44x44px minimum)
- [ ] Android Chrome - Keyboard doesn't cover inputs
- [ ] Both - Safe area respected (notch area)

### All Browsers
- [ ] Date inputs work
- [ ] File uploads work
- [ ] WebSocket connects
- [ ] LocalStorage persists
- [ ] Theme switches correctly

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
name: Cross-Browser Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: pnpm playwright install --with-deps

      - name: Run tests
        run: pnpm playwright test

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Quick Reference Files

All browser compatibility documentation:

1. **BROWSER_COMPATIBILITY_TEST_MATRIX.md** - Complete test matrix
2. **BROWSER_SPECIFIC_FIXES.md** - All fixes and workarounds
3. **playwright.config.ts** - Test configuration
4. **tests/e2e/critical-flows.spec.ts** - Automated tests
5. **src/lib/utils/browser-detection.ts** - Detection utilities

## Need Help?

### Safari Issues
See: `BROWSER_SPECIFIC_FIXES.md` → Safari section

### Firefox Issues
See: `BROWSER_SPECIFIC_FIXES.md` → Firefox section

### Mobile Issues
See: `BROWSER_SPECIFIC_FIXES.md` → Mobile Browsers section

### All Issues
See: `BROWSER_COMPATIBILITY_TEST_MATRIX.md` → Complete matrix

## Next Steps

1. **Run automated tests** - `pnpm playwright test`
2. **Check test matrix** - Review `BROWSER_COMPATIBILITY_TEST_MATRIX.md`
3. **Read specific fixes** - Check `BROWSER_SPECIFIC_FIXES.md` for issues
4. **Test on real devices** - BrowserStack or physical devices
5. **Set up CI/CD** - Add Playwright to your pipeline

## Tips for Success

✅ **DO:**
- Use feature detection over browser detection
- Test on real mobile devices when possible
- Run automated tests before deploying
- Check Safari specifically (it has the most quirks)

❌ **DON'T:**
- Assume Chrome behavior works everywhere
- Use browser-specific code without fallbacks
- Skip mobile testing
- Ignore Safari/iOS limitations

## Performance Notes

**Safari:** More aggressive memory management - test with large datasets

**Firefox:** Different rendering pipeline - test animations

**Mobile:** Limited memory - test on mid-range devices, not just high-end

## Common Patterns

### Feature Detection Pattern
```typescript
// ✅ Good - Feature detection
if ('mediaDevices' in navigator) {
  // Use camera
}

// ❌ Bad - Browser detection
if (isSafari()) {
  // Different code for Safari
}
```

### Graceful Degradation Pattern
```typescript
// ✅ Good - Fallback for unsupported features
if (hasScreenShareSupport()) {
  return <ScreenShareButton />;
}
return <ScreenShareUnavailableMessage />;
```

### Progressive Enhancement Pattern
```typescript
// ✅ Good - Start with basic, enhance if supported
function VideoCall() {
  const baseConstraints = { video: true, audio: true };
  const enhancedConstraints = hasWebRTCSupport()
    ? getWebRTCConstraints(baseConstraints)
    : baseConstraints;

  return <VideoRoom constraints={enhancedConstraints} />;
}
```

## Resources

- 📚 [Complete Test Matrix](./BROWSER_COMPATIBILITY_TEST_MATRIX.md)
- 🔧 [Specific Fixes](./BROWSER_SPECIFIC_FIXES.md)
- 🎭 [Playwright Docs](https://playwright.dev/)
- 🌐 [Can I Use](https://caniuse.com/)

---

**Time to first test:** 2 minutes
**Time to full test suite:** 5-10 minutes
**Supported browsers:** 8 (desktop + mobile)

Ready to test? Run `pnpm playwright test` now!
