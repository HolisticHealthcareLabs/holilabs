export const colors = {
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

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
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
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const shadows = {
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

export type Theme = {
  colors: typeof colors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  shadows: typeof shadows;
  isDark: boolean;
};

export const lightTheme: Theme = {
  colors: {
    ...colors,
    background: colors.light.background,
    surface: colors.light.surface,
    surfaceVariant: colors.light.surfaceVariant,
    text: colors.light.text,
    textSecondary: colors.light.textSecondary,
    textTertiary: colors.light.textTertiary,
    border: colors.light.border,
    borderFocused: colors.light.borderFocused,
    disabled: colors.light.disabled,
    overlay: colors.light.overlay,
    primary: colors.primary,
    primaryDark: colors.primaryDark,
    secondary: colors.secondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    recording: colors.recording,
    soap: colors.soap,
  },
  spacing,
  borderRadius,
  typography,
  shadows,
  isDark: false,
};

export const darkTheme: Theme = {
  colors: {
    ...colors,
    background: colors.dark.background,
    surface: colors.dark.surface,
    surfaceVariant: colors.dark.surfaceVariant,
    text: colors.dark.text,
    textSecondary: colors.dark.textSecondary,
    textTertiary: colors.dark.textTertiary,
    border: colors.dark.border,
    borderFocused: colors.dark.borderFocused,
    disabled: colors.dark.disabled,
    overlay: colors.dark.overlay,
    primary: colors.primary,
    primaryDark: colors.primaryDark,
    secondary: colors.secondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    recording: colors.recording,
    soap: colors.soap,
  },
  spacing,
  borderRadius,
  typography,
  shadows,
  isDark: true,
};
