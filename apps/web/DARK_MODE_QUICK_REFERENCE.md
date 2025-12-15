# Dark Mode Quick Reference

## Quick Start

All CSS variables automatically adapt between light and dark modes. Use semantic names, not colors.

## Most Common Variables

### Backgrounds & Text

```tsx
// Main backgrounds
bg-background        // Main app background (white/dark)
bg-card             // Card background
bg-secondary        // Subtle gray background

// Text colors
text-foreground     // Primary text
text-muted-foreground // Secondary/muted text
text-card-foreground  // Text on cards
```

### Actions & Buttons

```tsx
// Primary actions
bg-primary text-primary-foreground  // Brand green button

// Secondary actions
bg-accent text-accent-foreground    // Blue accent button

// Destructive actions
bg-destructive text-destructive-foreground  // Delete/danger button
```

### States

```tsx
// Success (green)
bg-success text-success-foreground
bg-success-light  // Light background
text-success-dark // Dark text

// Warning (amber)
bg-warning text-warning-foreground
bg-warning-light
text-warning-dark

// Error (red)
bg-error text-error-foreground
bg-error-light
text-error-dark

// Info (blue)
bg-info text-info-foreground
bg-info-light
text-info-dark
```

### Borders & Inputs

```tsx
border-border       // Default border color
border-input        // Input borders
ring-ring          // Focus rings (auto-applied)
```

### Interactive States

```tsx
hover:bg-hover     // Hover background
active:bg-active   // Active/pressed background
disabled:bg-disabled disabled:text-disabled-foreground
```

### Shadows

All shadows automatically adapt to theme:

```tsx
shadow-sm   // Subtle shadow
shadow-md   // Medium shadow (most common)
shadow-lg   // Large shadow
shadow-xl   // Extra large shadow
```

### Charts & Data Visualization

```tsx
bg-chart-1  // Blue
bg-chart-2  // Green
bg-chart-3  // Purple
bg-chart-4  // Orange
bg-chart-5  // Red
bg-chart-6  // Teal
bg-chart-7  // Pink
bg-chart-8  // Yellow
```

### Status Indicators

```tsx
bg-status-online   // Green (online/available)
bg-status-offline  // Gray (offline)
bg-status-busy     // Red (busy/DND)
bg-status-away     // Amber (away/idle)
```

### Skeleton Loading

```tsx
// Loading placeholder
<div className="animate-pulse">
  <div className="h-4 bg-skeleton-base rounded"></div>
  <div className="h-4 bg-skeleton-highlight rounded"></div>
</div>
```

## Common Patterns

### Card Component

```tsx
<div className="bg-card text-card-foreground border-border rounded-lg shadow-md p-4">
  <h3 className="text-foreground">Title</h3>
  <p className="text-muted-foreground">Description</p>
</div>
```

### Alert Components

```tsx
// Success Alert
<div className="bg-success-light border-success border-l-4 p-4 rounded">
  <p className="text-success-dark font-semibold">Success!</p>
  <p className="text-success-dark">Operation completed.</p>
</div>

// Warning Alert
<div className="bg-warning-light border-warning border-l-4 p-4 rounded">
  <p className="text-warning-dark font-semibold">Warning</p>
  <p className="text-warning-dark">Please review this.</p>
</div>

// Error Alert
<div className="bg-error-light border-error border-l-4 p-4 rounded">
  <p className="text-error-dark font-semibold">Error</p>
  <p className="text-error-dark">Something went wrong.</p>
</div>
```

### Button Variants

```tsx
// Primary button
<button className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-lg shadow-sm">
  Primary Action
</button>

// Secondary button
<button className="bg-secondary text-secondary-foreground hover:bg-hover px-4 py-2 rounded-lg shadow-sm">
  Secondary Action
</button>

// Destructive button
<button className="bg-destructive text-destructive-foreground hover:opacity-90 px-4 py-2 rounded-lg shadow-sm">
  Delete
</button>

// Ghost button
<button className="text-foreground hover:bg-hover px-4 py-2 rounded-lg">
  Ghost
</button>
```

### Input Fields

```tsx
<input
  className="bg-background text-foreground border-input border rounded-lg px-3 py-2 focus:ring-2 focus:ring-ring focus:outline-none"
  placeholder="Enter text..."
/>
```

### Modal/Dialog

```tsx
<div className="fixed inset-0 bg-overlay-medium backdrop-blur-sm flex items-center justify-center">
  <div className="bg-card text-card-foreground rounded-lg shadow-xl p-6 max-w-md">
    <h2 className="text-foreground text-xl font-semibold mb-4">Modal Title</h2>
    <p className="text-muted-foreground mb-6">Modal content goes here.</p>
    <div className="flex gap-2 justify-end">
      <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg">
        Cancel
      </button>
      <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">
        Confirm
      </button>
    </div>
  </div>
</div>
```

### Status Badge

```tsx
<span className="inline-flex items-center gap-1 bg-status-online/10 text-status-online px-2 py-1 rounded-full text-sm">
  <span className="w-2 h-2 bg-status-online rounded-full"></span>
  Online
</span>
```

## Don't Use These

Avoid hardcoded colors that won't adapt to theme:

```tsx
// ❌ Bad
bg-white dark:bg-gray-900
text-black dark:text-white
border-gray-200 dark:border-gray-800

// ✅ Good
bg-background
text-foreground
border-border
```

## Theme Toggle

To allow users to switch themes:

```tsx
import { useTheme } from '@/providers/ThemeProvider';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Toggle Theme (Current: {resolvedTheme})
    </button>
  );
}
```

## Testing

Always test components in both themes:

1. Use the theme toggle in the UI
2. Or use browser DevTools:
   - Open DevTools
   - Toggle between `<html class="light">` and `<html class="dark">`

## Need More Info?

See `DARK_MODE_VARIABLES.md` for complete documentation.
