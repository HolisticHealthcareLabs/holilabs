# Holi Labs Design Assets Guide

## 📁 Directory Structure

```
apps/web/public/
├── logos/              # Brand logos (SVG preferred, PNG as backup)
│   ├── holi-labs-full.svg       # Full logo with text
│   ├── holi-labs-icon.svg       # Icon only (for favicons)
│   ├── holi-labs-white.svg      # White version for dark backgrounds
│   └── holi-labs-horizontal.svg # Horizontal layout
│
├── images/             # Marketing and UI images
│   ├── hero-image.png
│   ├── og-image.png             # Open Graph (social sharing)
│   └── screenshots/
│
├── icons/              # UI icons and custom illustrations
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── favicon-32x32.png
│
└── fonts/              # Custom fonts (if any)
    └── [Your-Custom-Font]/
```

---

## 🎨 How to Use Assets in Your App

### 1. **Logos in Components**

```typescript
// Import in any component
import Image from 'next/image';

<Image
  src="/logos/holi-labs-full.svg"
  alt="Holi Labs"
  width={180}
  height={40}
  priority
/>
```

### 2. **Favicon Setup**

Place these files in `apps/web/public/icons/`:
- `favicon.ico` (32x32)
- `apple-touch-icon.png` (180x180)
- `favicon-32x32.png`
- `favicon-16x16.png`

Then update `apps/web/src/app/layout.tsx`:

```typescript
export const metadata = {
  icons: {
    icon: '/icons/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
}
```

### 3. **Theme Configuration**

Create `apps/web/src/styles/theme.ts`:

```typescript
export const theme = {
  colors: {
    primary: '#YOUR_BRAND_COLOR',      // Main brand color
    secondary: '#YOUR_SECONDARY_COLOR',
    accent: '#YOUR_ACCENT_COLOR',

    // Current gradient (blue to purple)
    gradientFrom: '#3B82F6',  // blue-500
    gradientTo: '#9333EA',    // purple-600
  },

  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },

  borderRadius: {
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
  },
}
```

### 4. **Update globals.css**

In `apps/web/src/app/globals.css`, add your brand colors:

```css
@layer base {
  :root {
    --brand-primary: #YOUR_HEX;
    --brand-secondary: #YOUR_HEX;
    --brand-accent: #YOUR_HEX;
  }
}
```

---

## 🖼️ Recommended File Formats

| Asset Type | Recommended Format | Notes |
|------------|-------------------|-------|
| Logos | SVG | Scalable, small file size |
| Photos | WebP or PNG | WebP for smaller size |
| Icons | SVG | Crisp at any size |
| Favicon | ICO + PNG | Browser compatibility |
| Social Sharing | PNG (1200x630) | Open Graph standard |

---

## 📐 Recommended Sizes

- **Logo (full):** SVG (scalable) or PNG at 2x resolution (360x80)
- **Logo (icon):** 512x512 (for various icon needs)
- **Favicon:** 32x32, 16x16
- **Apple Touch Icon:** 180x180
- **Open Graph Image:** 1200x630

---

## 🎨 Where to Update Brand Colors

### 1. **Sidebar Gradient** (`apps/web/src/app/dashboard/layout.tsx`):
```typescript
// Line 73-74
<div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
```

### 2. **Button Gradients** (Search for `bg-gradient`):
```typescript
className="bg-gradient-to-r from-blue-600 to-purple-600"
```

### 3. **Active States** (Search for `from-blue-50`):
```typescript
className="bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700"
```

### 4. **Tailwind Config** (if using custom colors):
Update `apps/web/tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      brand: {
        primary: '#YOUR_COLOR',
        secondary: '#YOUR_COLOR',
      }
    }
  }
}
```

---

## 🚀 Quick Start

1. **Get your design assets** from your designer (logos, brand colors, fonts)

2. **Place files in correct folders:**
   - Logos → `public/logos/`
   - Favicon → `public/icons/`
   - Brand images → `public/images/`

3. **Update brand colors** in:
   - `src/app/globals.css`
   - `tailwind.config.ts` (optional)
   - Components with `bg-gradient-to-*`

4. **Update logo references:**
   - Replace the "H" letter in gradients with `<Image src="/logos/holi-labs-icon.svg" />`
   - Update sidebar logo (`apps/web/src/app/dashboard/layout.tsx` line 72-78)

---

## 📞 Need Help?

If your designer provides a style guide or brand guidelines, share it and I can help you:
1. Extract exact color codes
2. Update all components to match
3. Set up custom fonts
4. Configure responsive logo usage
