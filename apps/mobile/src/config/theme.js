"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.darkTheme = exports.lightTheme = exports.shadows = exports.typography = exports.borderRadius = exports.spacing = exports.colors = void 0;
exports.colors = {
    // Brand Colors (VidaBanq/Holi Labs)
    primary: '#428CD4', // Blue
    primaryDark: '#0A3758', // Navy
    secondary: '#031019', // Charcoal
    // Functional Colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    // Neutral Colors - Light Mode
    light: {
        background: '#FFFFFF',
        surface: '#F9FAFB',
        surfaceVariant: '#F3F4F6',
        text: '#111827',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        border: '#E5E7EB',
        borderFocused: '#428CD4',
        disabled: '#D1D5DB',
        overlay: 'rgba(0, 0, 0, 0.5)',
    },
    // Neutral Colors - Dark Mode
    dark: {
        background: '#0F172A',
        surface: '#1E293B',
        surfaceVariant: '#334155',
        text: '#F8FAFC',
        textSecondary: '#CBD5E1',
        textTertiary: '#94A3B8',
        border: '#475569',
        borderFocused: '#428CD4',
        disabled: '#64748B',
        overlay: 'rgba(0, 0, 0, 0.7)',
    },
    // Recording States
    recording: {
        active: '#EF4444',
        paused: '#F59E0B',
        inactive: '#6B7280',
    },
    // SOAP Note Sections
    soap: {
        subjective: '#3B82F6', // Blue
        objective: '#10B981', // Green
        assessment: '#8B5CF6', // Purple
        plan: '#F59E0B', // Orange
    },
};
exports.spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};
exports.borderRadius = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
};
exports.typography = {
    fonts: {
        regular: 'System',
        medium: 'System',
        bold: 'System',
    },
    sizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 32,
    },
    lineHeights: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.8,
    },
    weights: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },
};
exports.shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
};
exports.lightTheme = {
    colors: {
        ...exports.colors,
        background: exports.colors.light.background,
        surface: exports.colors.light.surface,
        surfaceVariant: exports.colors.light.surfaceVariant,
        text: exports.colors.light.text,
        textSecondary: exports.colors.light.textSecondary,
        textTertiary: exports.colors.light.textTertiary,
        border: exports.colors.light.border,
        borderFocused: exports.colors.light.borderFocused,
        disabled: exports.colors.light.disabled,
        overlay: exports.colors.light.overlay,
        primary: exports.colors.primary,
        primaryDark: exports.colors.primaryDark,
        secondary: exports.colors.secondary,
        success: exports.colors.success,
        warning: exports.colors.warning,
        error: exports.colors.error,
        info: exports.colors.info,
        recording: exports.colors.recording,
        soap: exports.colors.soap,
    },
    spacing: exports.spacing,
    borderRadius: exports.borderRadius,
    typography: exports.typography,
    shadows: exports.shadows,
    isDark: false,
};
exports.darkTheme = {
    colors: {
        ...exports.colors,
        background: exports.colors.dark.background,
        surface: exports.colors.dark.surface,
        surfaceVariant: exports.colors.dark.surfaceVariant,
        text: exports.colors.dark.text,
        textSecondary: exports.colors.dark.textSecondary,
        textTertiary: exports.colors.dark.textTertiary,
        border: exports.colors.dark.border,
        borderFocused: exports.colors.dark.borderFocused,
        disabled: exports.colors.dark.disabled,
        overlay: exports.colors.dark.overlay,
        primary: exports.colors.primary,
        primaryDark: exports.colors.primaryDark,
        secondary: exports.colors.secondary,
        success: exports.colors.success,
        warning: exports.colors.warning,
        error: exports.colors.error,
        info: exports.colors.info,
        recording: exports.colors.recording,
        soap: exports.colors.soap,
    },
    spacing: exports.spacing,
    borderRadius: exports.borderRadius,
    typography: exports.typography,
    shadows: exports.shadows,
    isDark: true,
};
//# sourceMappingURL=theme.js.map