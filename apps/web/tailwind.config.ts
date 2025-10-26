import type { Config } from 'tailwindcss';
import { designTokens } from './src/styles/design-tokens';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Override default breakpoints with our design tokens
    screens: {
      xs: designTokens.breakpoints.xs,
      sm: designTokens.breakpoints.sm,
      md: designTokens.breakpoints.md,
      lg: designTokens.breakpoints.lg,
      xl: designTokens.breakpoints.xl,
      '2xl': designTokens.breakpoints['2xl'],
      '3xl': designTokens.breakpoints['3xl'],
    },
    extend: {
      // ============================================================================
      // COLORS - Hospital-grade palette with medical semantics
      // ============================================================================
      colors: {
        // Legacy CSS variable support (backward compatibility)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        // Design Token Colors
        primary: {
          ...designTokens.colors.primary,
          DEFAULT: designTokens.colors.primary[500],
          foreground: 'hsl(var(--primary-foreground))',
        },
        success: {
          ...designTokens.colors.success,
          DEFAULT: designTokens.colors.success[500],
        },
        warning: {
          ...designTokens.colors.warning,
          DEFAULT: designTokens.colors.warning[500],
        },
        error: {
          ...designTokens.colors.error,
          DEFAULT: designTokens.colors.error[500],
        },
        info: {
          ...designTokens.colors.info,
          DEFAULT: designTokens.colors.info[500],
        },
        neutral: designTokens.colors.neutral,

        // Medical semantic colors
        medical: {
          vitals: designTokens.colors.medical.vitals,
          risk: designTokens.colors.medical.risk,
          prescription: designTokens.colors.medical.prescription,
        },

        // AI colors
        ai: designTokens.colors.ai,

        // Legacy semantic colors (mapped to new tokens)
        secondary: {
          DEFAULT: designTokens.colors.neutral[600],
          foreground: designTokens.colors.neutral[0],
        },
        destructive: {
          DEFAULT: designTokens.colors.error[500],
          foreground: designTokens.colors.neutral[0],
        },
        muted: {
          DEFAULT: designTokens.colors.neutral[100],
          foreground: designTokens.colors.neutral[600],
        },
        accent: {
          DEFAULT: designTokens.colors.primary[100],
          foreground: designTokens.colors.primary[900],
        },
        popover: {
          DEFAULT: designTokens.colors.neutral[0],
          foreground: designTokens.colors.neutral[900],
        },
        card: {
          DEFAULT: designTokens.colors.neutral[0],
          foreground: designTokens.colors.neutral[900],
        },

        // Dark mode colors
        dark: designTokens.colors.dark,
      },

      // ============================================================================
      // SPACING - 8px grid system
      // ============================================================================
      spacing: designTokens.spacing,

      // ============================================================================
      // TYPOGRAPHY - Modular scale with proper hierarchy
      // ============================================================================
      fontFamily: {
        sans: designTokens.typography.fontFamily.sans.split(', '),
        mono: designTokens.typography.fontFamily.mono.split(', '),
      },
      // @ts-ignore - Tailwind types are strict about readonly
      fontSize: designTokens.typography.fontSize,
      // @ts-ignore - Tailwind types are strict about readonly
      fontWeight: designTokens.typography.fontWeight,

      // ============================================================================
      // BORDER RADIUS - Clean, modern radii
      // ============================================================================
      borderRadius: {
        ...designTokens.borderRadius,
        // Legacy CSS variable support
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // ============================================================================
      // SHADOWS - Layered depth system
      // ============================================================================
      // @ts-ignore - Tailwind types are strict about readonly
      boxShadow: {
        ...designTokens.shadows,
        // Named shadow utilities
        'primary-sm': designTokens.shadows['primary-sm'],
        'primary-md': designTokens.shadows['primary-md'],
        'primary-lg': designTokens.shadows['primary-lg'],
        'glow-sm': designTokens.shadows['glow-sm'],
        'glow-md': designTokens.shadows['glow-md'],
        'glow-lg': designTokens.shadows['glow-lg'],
      },

      // ============================================================================
      // Z-INDEX - Layered stacking context
      // ============================================================================
      // @ts-ignore - Tailwind types are strict about readonly
      zIndex: designTokens.zIndex,

      // ============================================================================
      // ANIMATIONS - Apple-inspired natural motion
      // ============================================================================
      transitionDuration: designTokens.animations.duration,
      transitionTimingFunction: designTokens.animations.easing,
      // @ts-ignore - Tailwind types are strict about readonly
      keyframes: designTokens.animations.keyframes,
      animation: {
        // Pre-configured animations
        'fade-in': `fadeIn ${designTokens.animations.duration.fast} ${designTokens.animations.easing.smooth}`,
        'fade-out': `fadeOut ${designTokens.animations.duration.fast} ${designTokens.animations.easing.smooth}`,
        'slide-in-right': `slideInRight ${designTokens.animations.duration.normal} ${designTokens.animations.easing.smooth}`,
        'slide-in-left': `slideInLeft ${designTokens.animations.duration.normal} ${designTokens.animations.easing.smooth}`,
        'slide-in-up': `slideInUp ${designTokens.animations.duration.normal} ${designTokens.animations.easing.smooth}`,
        'slide-in-down': `slideInDown ${designTokens.animations.duration.normal} ${designTokens.animations.easing.smooth}`,
        'scale-in': `scaleIn ${designTokens.animations.duration.normal} ${designTokens.animations.easing.spring}`,
        'scale-out': `scaleOut ${designTokens.animations.duration.normal} ${designTokens.animations.easing.spring}`,
        pulse: `pulse ${designTokens.animations.duration.slower} ${designTokens.animations.easing.easeInOut} infinite`,
        spin: `spin ${designTokens.animations.duration.slowest} ${designTokens.animations.easing.linear} infinite`,
        shimmer: `shimmer 2s ${designTokens.animations.easing.linear} infinite`,
        bounce: `bounce ${designTokens.animations.duration.slow} ${designTokens.animations.easing.easeInOut} infinite`,
      },

      // ============================================================================
      // CONTAINERS - Max widths for content
      // ============================================================================
      maxWidth: designTokens.containers,

      // ============================================================================
      // ICON SIZES - Consistent icon sizing
      // ============================================================================
      width: {
        'icon-xs': `${designTokens.iconSizes.xs}px`,
        'icon-sm': `${designTokens.iconSizes.sm}px`,
        'icon-md': `${designTokens.iconSizes.md}px`,
        'icon-lg': `${designTokens.iconSizes.lg}px`,
        'icon-xl': `${designTokens.iconSizes.xl}px`,
        'icon-2xl': `${designTokens.iconSizes['2xl']}px`,
        'icon-3xl': `${designTokens.iconSizes['3xl']}px`,
      },
      height: {
        'icon-xs': `${designTokens.iconSizes.xs}px`,
        'icon-sm': `${designTokens.iconSizes.sm}px`,
        'icon-md': `${designTokens.iconSizes.md}px`,
        'icon-lg': `${designTokens.iconSizes.lg}px`,
        'icon-xl': `${designTokens.iconSizes.xl}px`,
        'icon-2xl': `${designTokens.iconSizes['2xl']}px`,
        'icon-3xl': `${designTokens.iconSizes['3xl']}px`,
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Custom plugin for focus ring utilities (WCAG AAA)
    function ({ addUtilities }: any) {
      addUtilities({
        '.focus-ring': {
          '&:focus': {
            outline: 'none',
            'box-shadow': `0 0 0 ${designTokens.focus.ring.offset} #fff, 0 0 0 ${parseInt(designTokens.focus.ring.offset) + parseInt(designTokens.focus.ring.width)}px ${designTokens.focus.ring.color}`,
          },
        },
        '.focus-ring-error': {
          '&:focus': {
            outline: 'none',
            'box-shadow': `0 0 0 ${designTokens.focus.ring.offset} #fff, 0 0 0 ${parseInt(designTokens.focus.ring.offset) + parseInt(designTokens.focus.ring.width)}px ${designTokens.colors.error[500]}`,
          },
        },
      });
    },
  ],
};

export default config;
