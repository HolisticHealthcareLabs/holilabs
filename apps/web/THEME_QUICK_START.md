# Theme System - Quick Start Guide

> 5-minute guide to using the consolidated theme system

## Overview

Holi Labs has a unified theme system with **ONE** provider supporting light, dark, and auto modes.

## Quick Reference

### Import the Hook

```tsx
import { useTheme } from '@/providers/ThemeProvider';
```

### Basic Usage

```tsx
function MyComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current: {theme}</p>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('auto')}>Auto</button>
    </div>
  );
}
```

## Available Components

### 1. Full Theme Toggle (3 buttons)

```tsx
import ThemeToggle from '@/components/ThemeToggle';

<ThemeToggle />
```

Features:
- 3-button toggle (light/dark/auto)
- Keyboard shortcut: Cmd/Ctrl + Shift + L
- Tooltips
- Accessible

### 2. Simple Icon Toggle

```tsx
import { ThemeToggleIcon } from '@/providers/ThemeProvider';

<ThemeToggleIcon />
```

Features:
- Single icon button
- Toggles between light/dark
- Perfect for headers/toolbars

## Using with Tailwind

```tsx
<div className="bg-white dark:bg-gray-900">
  <h1 className="text-gray-900 dark:text-white">
    Hello World
  </h1>
  <p className="text-gray-600 dark:text-gray-300">
    This text adapts to theme
  </p>
</div>
```

## API Reference

### useTheme() Hook

```tsx
const {
  theme,          // 'light' | 'dark' | 'auto' (user preference)
  resolvedTheme,  // 'light' | 'dark' (actual applied theme)
  setTheme,       // (theme: Theme) => void
  toggleTheme,    // () => void (cycles light ↔ dark)
} = useTheme();
```

## Examples

### Example 1: Conditional Rendering

```tsx
function MyComponent() {
  const { resolvedTheme } = useTheme();

  return (
    <div>
      {resolvedTheme === 'dark' ? (
        <DarkModeContent />
      ) : (
        <LightModeContent />
      )}
    </div>
  );
}
```

### Example 2: Theme-based Styling

```tsx
function MyComponent() {
  const { resolvedTheme } = useTheme();

  return (
    <div
      style={{
        backgroundColor: resolvedTheme === 'dark' ? '#000' : '#fff',
        color: resolvedTheme === 'dark' ? '#fff' : '#000',
      }}
    >
      Content
    </div>
  );
}
```

### Example 3: Theme Settings Page

```tsx
function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <h2>Choose Theme</h2>
      <div>
        <button
          onClick={() => setTheme('light')}
          disabled={theme === 'light'}
        >
          Light Mode
        </button>
        <button
          onClick={() => setTheme('dark')}
          disabled={theme === 'dark'}
        >
          Dark Mode
        </button>
        <button
          onClick={() => setTheme('auto')}
          disabled={theme === 'auto'}
        >
          Auto (System)
        </button>
      </div>
    </div>
  );
}
```

### Example 4: Header with Theme Toggle

```tsx
function Header() {
  return (
    <header className="bg-white dark:bg-gray-900 border-b">
      <div className="flex items-center justify-between p-4">
        <Logo />
        <nav>
          <ThemeToggleIcon />
        </nav>
      </div>
    </header>
  );
}
```

## Common Tailwind Classes

```tsx
// Backgrounds
bg-white dark:bg-gray-900
bg-gray-50 dark:bg-gray-800
bg-gray-100 dark:bg-gray-700

// Text
text-gray-900 dark:text-white
text-gray-600 dark:text-gray-300
text-gray-500 dark:text-gray-400

// Borders
border-gray-200 dark:border-gray-700
border-gray-300 dark:border-gray-600

// Hover states
hover:bg-gray-100 dark:hover:bg-gray-800
hover:text-gray-900 dark:hover:text-white
```

## Testing Your Component

### Manual Test Checklist

1. **Visual Test**
   - [ ] Component looks good in light mode
   - [ ] Component looks good in dark mode
   - [ ] No contrast issues
   - [ ] All text is readable

2. **Functionality Test**
   - [ ] Theme toggle works
   - [ ] Theme persists on refresh
   - [ ] Auto mode follows system preference

3. **Accessibility Test**
   - [ ] Keyboard navigation works
   - [ ] Screen reader announces changes
   - [ ] Focus indicators visible

## Troubleshooting

### Issue: Hook error "useTheme must be used within ThemeProvider"

**Solution**: Component must be inside ThemeProvider tree

```tsx
// ❌ Wrong
function App() {
  const { theme } = useTheme(); // Error!
  return <ThemeProvider>...</ThemeProvider>;
}

// ✅ Correct
function App() {
  return (
    <ThemeProvider>
      <MyComponent /> {/* useTheme works here */}
    </ThemeProvider>
  );
}
```

### Issue: Theme not persisting

**Solution**: Check browser localStorage is enabled

```tsx
// Debug in browser console:
localStorage.getItem('holilabs-theme')
// Should return: 'light', 'dark', or 'auto'
```

### Issue: Wrong import

**Solution**: Use correct import path

```tsx
// ❌ Wrong (old duplicate - deleted)
import { useTheme } from '@/contexts/ThemeContext';

// ✅ Correct (consolidated provider)
import { useTheme } from '@/providers/ThemeProvider';
```

## File Locations

| What | Where |
|------|-------|
| Hook & Provider | `/src/providers/ThemeProvider.tsx` |
| Toggle Component | `/src/components/ThemeToggle.tsx` |
| Init Script | `/src/scripts/theme-init.ts` |
| Root Layout | `/src/app/layout.tsx` |
| Full Documentation | `/THEME_SYSTEM_DOCUMENTATION.md` |

## Best Practices

1. ✅ Always use `useTheme()` hook (don't access localStorage directly)
2. ✅ Prefer Tailwind `dark:` classes over inline styles
3. ✅ Test in both light and dark modes
4. ✅ Use semantic colors (not hardcoded hex values)
5. ✅ Default to 'auto' mode when possible

## Need More Help?

- **Complete Guide**: See `/THEME_SYSTEM_DOCUMENTATION.md`
- **Architecture**: See `/THEME_ARCHITECTURE_DIAGRAM.md`
- **Implementation**: See `/AGENT11_THEME_CONSOLIDATION_COMPLETE.md`

---

**Remember**: There is only ONE theme provider at `/src/providers/ThemeProvider.tsx`
