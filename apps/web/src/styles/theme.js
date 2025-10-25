"use strict";
/**
 * Holi Labs Design System
 * Central theme configuration for consistent branding
 *
 * Update these values when your designer provides brand guidelines
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.animations = exports.shadows = exports.spacing = exports.typography = exports.colors = exports.getGradient = exports.theme = void 0;
exports.theme = {
    // Brand Colors
    colors: {
        // Update these with your actual brand colors
        primary: '#3B82F6', // Current: blue-500
        secondary: '#9333EA', // Current: purple-600
        accent: '#06B6D4', // cyan-500
        // Gradient colors (currently blue → purple)
        gradientFrom: '#3B82F6',
        gradientTo: '#9333EA',
        // Semantic colors (leave these for now)
        success: '#10B981', // green-500
        warning: '#F59E0B', // amber-500
        error: '#EF4444', // red-500
        info: '#3B82F6', // blue-500
        // Neutral palette
        gray: {
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            500: '#6B7280',
            700: '#374151',
            900: '#111827',
        },
    },
    // Typography
    typography: {
        fontFamily: {
            sans: 'Inter, system-ui, -apple-system, sans-serif',
            mono: 'Monaco, Courier, monospace',
        },
        fontSize: {
            xs: '0.75rem', // 12px
            sm: '0.875rem', // 14px
            base: '1rem', // 16px
            lg: '1.125rem', // 18px
            xl: '1.25rem', // 20px
            '2xl': '1.5rem', // 24px
            '3xl': '1.875rem', // 30px
            '4xl': '2.25rem', // 36px
        },
    },
    // Spacing & Layout
    spacing: {
        borderRadius: {
            sm: '0.375rem', // 6px
            md: '0.5rem', // 8px
            lg: '0.75rem', // 12px
            xl: '1rem', // 16px
        },
        container: {
            padding: '1rem',
            maxWidth: '1280px',
        },
    },
    // Shadows
    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    },
    // Animations
    animations: {
        transition: 'all 0.3s ease-in-out',
        transitionFast: 'all 0.15s ease-in-out',
    },
};
// Helper function to get gradient class
const getGradient = (direction = 'r') => {
    return `bg-gradient-to-${direction} from-[${exports.theme.colors.gradientFrom}] to-[${exports.theme.colors.gradientTo}]`;
};
exports.getGradient = getGradient;
// Export individual values for easy import
exports.colors = exports.theme.colors, exports.typography = exports.theme.typography, exports.spacing = exports.theme.spacing, exports.shadows = exports.theme.shadows, exports.animations = exports.theme.animations;
exports.default = exports.theme;
//# sourceMappingURL=theme.js.map