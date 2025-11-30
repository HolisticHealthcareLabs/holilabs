/**
 * App Theme Configuration
 * Production-ready theme system for iOS and Android
 */

import { colorPalette, spacing, typography, borderRadius, shadows } from './designTokens';

export interface AppTheme {
  colors: {
    // Brand
    primary: string;
    primaryLight: string;
    primaryDark: string;

    // Backgrounds
    background: string;
    surface: string;
    surfaceVariant: string;
    card: string;

    // Text
    text: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;

    // Borders
    border: string;
    borderLight: string;
    borderFocus: string;

    // States
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    error: string;
    errorLight: string;
    info: string;
    infoLight: string;

    // Interactive
    buttonPrimary: string;
    buttonPrimaryPressed: string;
    buttonSecondary: string;
    buttonSecondaryPressed: string;

    // Overlays
    overlay: string;
    scrim: string;

    // Clinical Colors
    recording: string;
    recordingPaused: string;

    // SOAP Note Colors
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  spacing: typeof spacing;
  typography: typeof typography;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  isDark: boolean;
}

// Light Theme
export const lightTheme: AppTheme = {
  colors: {
    // Brand
    primary: colorPalette.primary[500],
    primaryLight: colorPalette.primary[100],
    primaryDark: colorPalette.primary[700],

    // Backgrounds
    background: '#FFFFFF',
    surface: colorPalette.gray[50],
    surfaceVariant: colorPalette.gray[100],
    card: '#FFFFFF',

    // Text
    text: colorPalette.gray[900],
    textSecondary: colorPalette.gray[700],
    textTertiary: colorPalette.gray[600],
    textInverse: '#FFFFFF',

    // Borders
    border: colorPalette.gray[200],
    borderLight: colorPalette.gray[100],
    borderFocus: colorPalette.primary[500],

    // States
    success: colorPalette.success[500],
    successLight: colorPalette.success[50],
    warning: colorPalette.warning[500],
    warningLight: colorPalette.warning[50],
    error: colorPalette.error[500],
    errorLight: colorPalette.error[50],
    info: colorPalette.primary[500],
    infoLight: colorPalette.primary[50],

    // Interactive
    buttonPrimary: colorPalette.primary[500],
    buttonPrimaryPressed: colorPalette.primary[600],
    buttonSecondary: colorPalette.gray[100],
    buttonSecondaryPressed: colorPalette.gray[200],

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.5)',
    scrim: 'rgba(0, 0, 0, 0.3)',

    // Clinical Colors
    recording: colorPalette.error[500],
    recordingPaused: colorPalette.warning[500],

    // SOAP Note Colors
    subjective: colorPalette.primary[500],
    objective: colorPalette.success[500],
    assessment: '#8B5CF6',
    plan: colorPalette.warning[500],
  },
  spacing,
  typography,
  borderRadius,
  shadows,
  isDark: false,
};

// Dark Theme
export const darkTheme: AppTheme = {
  colors: {
    // Brand
    primary: colorPalette.primary[400],
    primaryLight: colorPalette.primary[900],
    primaryDark: colorPalette.primary[300],

    // Backgrounds
    background: '#0F172A',
    surface: '#1E293B',
    surfaceVariant: '#334155',
    card: '#1E293B',

    // Text
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    textInverse: colorPalette.gray[900],

    // Borders
    border: '#475569',
    borderLight: '#334155',
    borderFocus: colorPalette.primary[400],

    // States
    success: colorPalette.success[500],
    successLight: 'rgba(16, 185, 129, 0.1)',
    warning: colorPalette.warning[500],
    warningLight: 'rgba(245, 158, 11, 0.1)',
    error: colorPalette.error[500],
    errorLight: 'rgba(239, 68, 68, 0.1)',
    info: colorPalette.primary[400],
    infoLight: 'rgba(66, 140, 212, 0.1)',

    // Interactive
    buttonPrimary: colorPalette.primary[500],
    buttonPrimaryPressed: colorPalette.primary[600],
    buttonSecondary: '#334155',
    buttonSecondaryPressed: '#475569',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.7)',
    scrim: 'rgba(0, 0, 0, 0.5)',

    // Clinical Colors
    recording: colorPalette.error[500],
    recordingPaused: colorPalette.warning[500],

    // SOAP Note Colors
    subjective: colorPalette.primary[400],
    objective: colorPalette.success[500],
    assessment: '#A78BFA',
    plan: colorPalette.warning[500],
  },
  spacing,
  typography,
  borderRadius,
  shadows,
  isDark: true,
};

// Get theme based on color scheme
export const getTheme = (isDark: boolean): AppTheme => {
  return isDark ? darkTheme : lightTheme;
};
