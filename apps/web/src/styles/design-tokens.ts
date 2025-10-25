/**
 * HoliLabs Design Token System
 *
 * Comprehensive design token system combining:
 * - Epic/Cerner institutional trust
 * - Modern healthcare UX patterns
 * - Futuristic, clean, intuitive aesthetics
 *
 * 100x Improvement Mindset
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const colors = {
  // Primary Brand Colors - Medical Trust + Modern Energy
  primary: {
    50: '#f0f9ff',   // Lightest blue - backgrounds
    100: '#e0f2fe',  // Very light - hover states
    200: '#bae6fd',  // Light - badges, pills
    300: '#7dd3fc',  // Medium light - secondary buttons
    400: '#38bdf8',  // Medium - accents
    500: '#0ea5e9',  // Base primary - main CTAs
    600: '#0284c7',  // Dark - hover primary buttons
    700: '#0369a1',  // Darker - active states
    800: '#075985',  // Very dark - headers
    900: '#0c4a6e',  // Darkest - high contrast text
  },

  // Success - Clinical approvals, health improvements
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',   // Base success
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning - Requires attention, medication reminders
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',   // Base warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error - Critical alerts, contraindications
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',   // Base error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Info - Educational content, tips
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',   // Base info
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Neutral Grays - Epic-inspired clean backgrounds
  neutral: {
    0: '#ffffff',     // Pure white
    50: '#fafafa',    // Off-white backgrounds
    100: '#f5f5f5',   // Light gray backgrounds
    200: '#e5e5e5',   // Borders, dividers
    300: '#d4d4d4',   // Disabled states
    400: '#a3a3a3',   // Placeholder text
    500: '#737373',   // Secondary text
    600: '#525252',   // Body text
    700: '#404040',   // Dark text
    800: '#262626',   // Headings
    900: '#171717',   // High contrast
    950: '#0a0a0a',   // Near black
  },

  // Medical Semantic Colors
  medical: {
    vitals: {
      normal: '#22c55e',      // Green - normal vitals
      elevated: '#f59e0b',    // Amber - elevated vitals
      critical: '#ef4444',    // Red - critical vitals
    },
    risk: {
      low: '#22c55e',         // Green - low risk
      medium: '#f59e0b',      // Amber - medium risk
      high: '#ef4444',        // Red - high risk
      critical: '#dc2626',    // Dark red - critical risk
    },
    prescription: {
      active: '#3b82f6',      // Blue - active medication
      completed: '#22c55e',   // Green - completed course
      pending: '#f59e0b',     // Amber - pending approval
      cancelled: '#737373',   // Gray - cancelled
    },
  },

  // AI Assistant Colors
  ai: {
    gradient: {
      from: '#8b5cf6',        // Purple
      to: '#ec4899',          // Pink
    },
    glow: '#a78bfa',          // Soft purple glow
    text: '#7c3aed',          // Deep purple text
  },

  // Dark Mode Colors
  dark: {
    background: {
      primary: '#0a0a0a',     // Main background
      secondary: '#171717',   // Card backgrounds
      tertiary: '#262626',    // Elevated surfaces
    },
    text: {
      primary: '#fafafa',     // Main text
      secondary: '#a3a3a3',   // Secondary text
      tertiary: '#737373',    // Tertiary text
    },
    border: '#404040',        // Dark mode borders
  },
} as const;

// ============================================================================
// SPACING SYSTEM (8px grid)
// ============================================================================

export const spacing = {
  0: '0px',
  0.5: '2px',     // 0.125rem - Fine adjustments
  1: '4px',       // 0.25rem  - Micro spacing
  1.5: '6px',     // 0.375rem
  2: '8px',       // 0.5rem   - Base unit
  3: '12px',      // 0.75rem
  4: '16px',      // 1rem     - Standard spacing
  5: '20px',      // 1.25rem
  6: '24px',      // 1.5rem   - Section spacing
  7: '28px',      // 1.75rem
  8: '32px',      // 2rem     - Large spacing
  10: '40px',     // 2.5rem
  12: '48px',     // 3rem     - Extra large
  16: '64px',     // 4rem     - Section breaks
  20: '80px',     // 5rem
  24: '96px',     // 6rem     - Major sections
  32: '128px',    // 8rem
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

export const typography = {
  // Font Families
  fontFamily: {
    sans: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(', '),
    mono: [
      '"SF Mono"',
      'Monaco',
      '"Cascadia Code"',
      '"Roboto Mono"',
      'Consolas',
      'monospace',
    ].join(', '),
  },

  // Font Sizes (modular scale: 1.25 ratio)
  fontSize: {
    xs: ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],      // Small labels
    sm: ['14px', { lineHeight: '20px', letterSpacing: '0.005em' }],     // Body small
    base: ['16px', { lineHeight: '24px', letterSpacing: '0' }],         // Body text
    lg: ['18px', { lineHeight: '28px', letterSpacing: '-0.005em' }],    // Large body
    xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],     // Subheading
    '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.015em' }], // H3
    '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em' }],  // H2
    '4xl': ['36px', { lineHeight: '40px', letterSpacing: '-0.025em' }], // H1
    '5xl': ['48px', { lineHeight: '1', letterSpacing: '-0.03em' }],     // Display
    '6xl': ['60px', { lineHeight: '1', letterSpacing: '-0.035em' }],    // Hero
  },

  // Font Weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

// ============================================================================
// SHADOW SYSTEM (Layered depth)
// ============================================================================

export const shadows = {
  // Light Mode Shadows
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

  // Colored Shadows (for cards, CTAs)
  'primary-sm': '0 4px 12px rgb(14 165 233 / 0.15)',
  'primary-md': '0 8px 24px rgb(14 165 233 / 0.2)',
  'primary-lg': '0 16px 48px rgb(14 165 233 / 0.25)',

  // Glow Effects (AI, interactive elements)
  'glow-sm': '0 0 12px rgb(139 92 246 / 0.3)',
  'glow-md': '0 0 24px rgb(139 92 246 / 0.4)',
  'glow-lg': '0 0 48px rgb(139 92 246 / 0.5)',

  // Dark Mode Shadows
  dark: {
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.5)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.6), 0 8px 10px -6px rgb(0 0 0 / 0.6)',
  },
} as const;

// ============================================================================
// BORDER RADIUS SYSTEM
// ============================================================================

export const borderRadius = {
  none: '0px',
  sm: '4px',      // Small elements (badges, tags)
  md: '6px',      // Buttons, inputs
  lg: '8px',      // Cards
  xl: '12px',     // Large cards
  '2xl': '16px',  // Featured sections
  '3xl': '24px',  // Hero sections
  full: '9999px', // Pills, avatars
} as const;

// ============================================================================
// ANIMATION SYSTEM
// ============================================================================

export const animations = {
  // Durations (following Apple's HIG)
  duration: {
    instant: '100ms',      // Micro-interactions
    fast: '150ms',         // Hovers, button states
    normal: '250ms',       // Default transitions
    slow: '350ms',         // Modals, drawers
    slower: '500ms',       // Page transitions
    slowest: '750ms',      // Complex animations
  },

  // Easing Functions (Apple-inspired natural motion)
  easing: {
    // Standard eases
    linear: 'linear',
    ease: 'ease',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

    // Custom eases (Apple-like)
    snappy: 'cubic-bezier(0.25, 0.1, 0.25, 1)',        // Quick, responsive
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',            // Default smooth
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Bouncy spring
    elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Elastic bounce
  },

  // Keyframe Animations
  keyframes: {
    // Fade animations
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },

    // Slide animations
    slideInRight: {
      from: { transform: 'translateX(100%)' },
      to: { transform: 'translateX(0)' },
    },
    slideInLeft: {
      from: { transform: 'translateX(-100%)' },
      to: { transform: 'translateX(0)' },
    },
    slideInUp: {
      from: { transform: 'translateY(100%)' },
      to: { transform: 'translateY(0)' },
    },
    slideInDown: {
      from: { transform: 'translateY(-100%)' },
      to: { transform: 'translateY(0)' },
    },

    // Scale animations
    scaleIn: {
      from: { transform: 'scale(0.9)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    },
    scaleOut: {
      from: { transform: 'scale(1)', opacity: 1 },
      to: { transform: 'scale(0.9)', opacity: 0 },
    },

    // Pulse (for notifications)
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },

    // Spin (for loaders)
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },

    // Shimmer (for loading skeletons)
    shimmer: {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },

    // Bounce (for success feedback)
    bounce: {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-10%)' },
    },
  },
} as const;

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080,
  commandPalette: 1090,
  max: 9999,
} as const;

// ============================================================================
// BREAKPOINTS (Mobile-first)
// ============================================================================

export const breakpoints = {
  xs: '375px',    // Small phones
  sm: '640px',    // Large phones
  md: '768px',    // Tablets
  lg: '1024px',   // Small laptops
  xl: '1280px',   // Laptops
  '2xl': '1536px', // Desktops
  '3xl': '1920px', // Large displays
} as const;

// ============================================================================
// CONTAINER SIZES
// ============================================================================

export const containers = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1440px',
  full: '100%',
} as const;

// ============================================================================
// ICON SIZES
// ============================================================================

export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

// ============================================================================
// FOCUS RING STYLES (WCAG AAA)
// ============================================================================

export const focus = {
  ring: {
    width: '2px',
    offset: '2px',
    color: colors.primary[500],
    style: 'solid',
  },
  // Pre-configured focus classes
  default: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  error: 'focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2',
  dark: 'dark:focus:ring-offset-gray-900',
} as const;

// ============================================================================
// EXPORT ALL TOKENS
// ============================================================================

export const designTokens = {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
  animations,
  zIndex,
  breakpoints,
  containers,
  iconSizes,
  focus,
} as const;

export type DesignTokens = typeof designTokens;
