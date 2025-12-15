# Cross-Browser Testing Suite

Automated end-to-end tests using Playwright across multiple browsers and devices.

## Quick Start

```bash
# Install Playwright browsers (one-time setup)
pnpm playwright install --with-deps

# Run all tests
pnpm test:e2e

# View results
pnpm test:report
```

## Available Commands

```bash
# Run all tests across all browsers
pnpm test:e2e

# Run tests with UI (interactive mode)
pnpm test:e2e:ui

# Run specific browser
pnpm test:e2e:chrome    # Chrome/Chromium
pnpm test:e2e:firefox   # Firefox
pnpm test:e2e:safari    # Safari (WebKit)

# Run mobile tests
pnpm test:e2e:mobile    # iOS Safari + Android Chrome

# View test report
pnpm test:report
```

## Test Structure

```
tests/
├── e2e/
│   ├── critical-flows.spec.ts    # Main test suite
│   └── [future tests]
├── results/                       # Test artifacts (gitignored)
└── README.md                      # This file
```

## What's Tested

### Critical User Flows
1. Authentication (login, validation)
2. Dashboard layout & navigation
3. Theme toggling (dark/light)
4. Form validation
5. File uploads
6. Responsive design
7. WebSocket connections
8. LocalStorage persistence
9. Keyboard navigation
10. Print functionality
11. Accessibility
12. Performance

### Browsers Tested
- Desktop: Chrome, Firefox, Safari, Edge
- Mobile: iPhone 14 Pro, iPad Pro, Pixel 5, Galaxy Tab S4

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  await page.goto('/');

  // Your test code
  const element = page.locator('button');
  await expect(element).toBeVisible();
});
```

### Browser-Specific Tests

```typescript
test('Safari: should handle date inputs', async ({ page, browserName }) => {
  if (browserName === 'webkit') {
    // Safari-specific test
  }
});
```

### Mobile Tests

```typescript
test('Mobile: should have touch targets', async ({ page, viewport }) => {
  if (viewport && viewport.width < 768) {
    // Mobile-specific test
  }
});
```

## Test Reports

After running tests, reports are generated in:
- `playwright-report/` - HTML report
- `tests/results/` - Test artifacts (screenshots, videos)

View the HTML report:
```bash
pnpm test:report
```

## CI/CD Integration

Tests can run in CI/CD pipelines. Example GitHub Actions:

```yaml
- name: Install dependencies
  run: pnpm install

- name: Install Playwright
  run: pnpm playwright install --with-deps

- name: Run tests
  run: pnpm test:e2e

- name: Upload results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Debugging Tests

### Run in UI Mode
```bash
pnpm test:e2e:ui
```

### Run with Headed Browser
```bash
pnpm playwright test --headed
```

### Run Single Test
```bash
pnpm playwright test -g "should login"
```

### Debug Mode
```bash
pnpm playwright test --debug
```

## Common Issues

### Tests Fail on CI but Pass Locally
- Increase timeouts in playwright.config.ts
- Check for race conditions
- Verify network connectivity

### Safari/WebKit Tests Fail
- Ensure webkit is installed: `pnpm playwright install webkit`
- Check for Safari-specific issues in BROWSER_SPECIFIC_FIXES.md

### Mobile Tests Not Working
- Verify viewport configuration in playwright.config.ts
- Check touch event handling

## Best Practices

1. Use data attributes for test selectors
   ```html
   <button data-testid="submit-button">Submit</button>
   ```

2. Wait for elements properly
   ```typescript
   await page.waitForSelector('[data-testid="element"]');
   ```

3. Use expect() assertions
   ```typescript
   await expect(page.locator('button')).toBeVisible();
   ```

4. Clean up after tests
   ```typescript
   test.afterEach(async ({ page }) => {
     // Cleanup code
   });
   ```

5. Use Page Object Model for complex flows
   ```typescript
   class LoginPage {
     constructor(private page: Page) {}

     async login(email: string, password: string) {
       await this.page.fill('[name="email"]', email);
       await this.page.fill('[name="password"]', password);
       await this.page.click('button[type="submit"]');
     }
   }
   ```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Browser Compatibility Test Matrix](../BROWSER_COMPATIBILITY_TEST_MATRIX.md)
- [Browser-Specific Fixes](../BROWSER_SPECIFIC_FIXES.md)
- [Quick Start Guide](../BROWSER_COMPATIBILITY_QUICKSTART.md)

## Need Help?

- Check documentation in root directory
- Review existing tests in `e2e/`
- Consult Playwright docs: https://playwright.dev/
- Ask the team!

---

Happy Testing!
