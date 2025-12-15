# Theme System Documentation

## Overview

Holi Labs uses a unified theme system that provides consistent dark mode, light mode, and auto (system preference) support across the entire application.

## Architecture

### Single Source of Truth

The application uses **ONE** theme provider located at:
- `/src/providers/ThemeProvider.tsx` - Main theme provider with full functionality

**Removed Duplicates:**
- `/src/contexts/ThemeContext.tsx` - DELETED (was causing conflicts)

### Theme Components

1. **ThemeProvider** (`/src/providers/ThemeProvider.tsx`)
   - Main provider component
   - Supports: light, dark, and auto modes
   - Features:
     - System preference detection
     - LocalStorage persistence
     - No FOUC (Flash of Unstyled Content)
     - Smooth transitions
     - Meta theme-color updates for mobile

2. **ThemeToggle** (`/src/components/ThemeToggle.tsx`)
   - 3-state toggle component
   - Keyboard shortcut: Cmd/Ctrl + Shift + L
   - Accessible with ARIA labels
   - Tooltips showing current state

3. **Theme Initialization Script** (`/src/scripts/theme-init.ts`)
   - Runs BEFORE React hydration
   - Prevents FOUC
   - Inline script in HTML head

## Integration

### Root Layout

The ThemeProvider is integrated in `/src/app/layout.tsx`:

```tsx
import { Providers } from '@/components/Providers';
import { themeInitScript } from '@/scripts/theme-init';

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
          suppressHydrationWarning
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### Providers Component

The Providers component wraps all context providers:

```tsx
// /src/components/Providers.tsx
import { ThemeProvider } from '@/providers/ThemeProvider';

export function Providers({ children }) {
  return (
    <SessionProvider>
      <ThemeProvider defaultTheme="auto">
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
```

## Usage

### Using the Theme Hook

```tsx
import { useTheme } from '@/providers/ThemeProvider';

function MyComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  // theme: 'light' | 'dark' | 'auto' (user's preference)
  // resolvedTheme: 'light' | 'dark' (actual applied theme)

  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Resolved theme: {resolvedTheme}</p>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}
```

### Using the Theme Toggle Component

```tsx
import ThemeToggle from '@/components/ThemeToggle';

function Header() {
  return (
    <header>
      <ThemeToggle />
    </header>
  );
}
```

### Using the Theme Toggle Icon (Simple)

```tsx
import { ThemeToggleIcon } from '@/providers/ThemeProvider';

function Toolbar() {
  return (
    <div>
      <ThemeToggleIcon />
    </div>
  );
}
```

## Theme Values

### Storage

- **Key**: `holilabs-theme`
- **Location**: localStorage
- **Values**: `'light'`, `'dark'`, `'auto'`

### Classes

The theme system applies classes to `document.documentElement`:
- `.light` - Light mode
- `.dark` - Dark mode

### Tailwind Integration

Use Tailwind's dark mode utilities:

```tsx
<div className="bg-white dark:bg-gray-900">
  <h1 className="text-gray-900 dark:text-white">Hello</h1>
</div>
```

## Features

### 1. System Preference Detection

When theme is set to 'auto', the system automatically detects and follows the user's system preference:

```tsx
const getSystemTheme = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};
```

### 2. No Flash of Unstyled Content (FOUC)

The theme initialization script runs immediately in the HTML head before React hydration, preventing any visual flash.

### 3. LocalStorage Persistence

User preferences are saved to localStorage and restored on page load.

### 4. Mobile Support

The theme system updates the meta theme-color tag for a consistent experience on mobile devices:

```tsx
<meta name="theme-color" content="#ffffff" /> // Light mode
<meta name="theme-color" content="#0a0a0a" /> // Dark mode
```

### 5. Keyboard Shortcuts

Users can quickly cycle through themes using:
- **Mac**: Cmd + Shift + L
- **Windows/Linux**: Ctrl + Shift + L

### 6. Accessibility

- ARIA labels for screen readers
- Focus indicators
- Tooltips showing current state
- Semantic HTML

## Files Overview

### Core Files

| File | Purpose |
|------|---------|
| `/src/providers/ThemeProvider.tsx` | Main theme provider and hooks |
| `/src/components/ThemeToggle.tsx` | Theme toggle component |
| `/src/components/Providers.tsx` | Combines all providers |
| `/src/scripts/theme-init.ts` | Pre-hydration theme script |
| `/src/app/layout.tsx` | Root layout with theme integration |

### Component Files Using Theme

| File | Usage |
|------|-------|
| `/src/app/dashboard/layout.tsx` | Uses ThemeToggleIcon in header |
| `/src/app/pricing/page.tsx` | Custom theme toggle on pricing page |

## Migration Guide

If you find any old theme imports, update them:

### Before (OLD - DO NOT USE)
```tsx
import { useTheme } from '@/contexts/ThemeContext';
```

### After (CORRECT)
```tsx
import { useTheme } from '@/providers/ThemeProvider';
```

## Troubleshooting

### Issue: Theme not persisting across pages

**Solution**: Ensure you're using the theme hook from the correct provider:
```tsx
import { useTheme } from '@/providers/ThemeProvider';
```

### Issue: Flash of wrong theme on page load

**Solution**: Verify the theme initialization script is in the HTML head:
```tsx
<script
  dangerouslySetInnerHTML={{ __html: themeInitScript }}
  suppressHydrationWarning
/>
```

### Issue: Theme toggle not working

**Solution**: Ensure the component is inside the ThemeProvider:
```tsx
<ThemeProvider>
  <YourComponent />
</ThemeProvider>
```

### Issue: System preference not detected

**Solution**: Set theme to 'auto' mode:
```tsx
const { setTheme } = useTheme();
setTheme('auto');
```

## Best Practices

1. **Always use the hook**: Don't access localStorage directly
2. **Use Tailwind classes**: Prefer `dark:` prefix over custom CSS
3. **Test both themes**: Always verify your UI in both light and dark modes
4. **Respect user preference**: Default to 'auto' mode when possible
5. **Avoid hard-coded colors**: Use theme-aware Tailwind classes

## Testing

### Manual Testing Checklist

- [ ] Theme persists across page navigation
- [ ] Theme persists after browser refresh
- [ ] System preference detection works (auto mode)
- [ ] Toggle cycles through: light → dark → auto → light
- [ ] No FOUC on page load
- [ ] Mobile meta theme-color updates correctly
- [ ] Keyboard shortcut works (Cmd/Ctrl + Shift + L)
- [ ] Theme toggle is accessible with keyboard
- [ ] Screen readers announce theme changes

### Testing in Development

```bash
npm run dev
```

1. Open the application
2. Toggle between themes
3. Refresh the page - theme should persist
4. Change system preference - auto mode should follow
5. Navigate between pages - theme should remain consistent

## Support

For issues or questions about the theme system:
1. Check this documentation first
2. Verify you're using the correct imports
3. Test with browser DevTools
4. Check localStorage for theme value
5. Verify ThemeProvider is in component tree

## Version History

- **v2.0** (Current) - Consolidated to single ThemeProvider
  - Removed duplicate ThemeContext.tsx
  - Added auto mode support
  - Improved accessibility
  - Added keyboard shortcuts

- **v1.0** - Initial implementation
  - Basic light/dark toggle
  - Multiple theme contexts (deprecated)

## References

- [Next.js Dark Mode Guide](https://nextjs.org/docs/app/building-your-application/styling/css-in-js)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Web Accessibility Initiative (WAI)](https://www.w3.org/WAI/)
