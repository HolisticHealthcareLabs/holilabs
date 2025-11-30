/**
 * WCAG AA Contrast-Compliant Color Utilities
 *
 * This file provides color combinations that meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
 * for both light and dark modes.
 *
 * Usage: Replace low-contrast classes like text-gray-400 with these utilities
 */

export const contrastColors = {
  // Primary text colors (high contrast)
  primary: 'text-gray-900 dark:text-white',

  // Secondary text colors (medium-high contrast) - WCAG AA compliant
  secondary: 'text-gray-700 dark:text-gray-200',

  // Tertiary/muted text (minimum WCAG AA compliant)
  muted: 'text-gray-600 dark:text-gray-300',

  // Placeholder/disabled text (use sparingly, may not meet WCAG AA on all backgrounds)
  placeholder: 'text-gray-500 dark:text-gray-400',

  // Status colors (WCAG AA compliant)
  success: 'text-green-700 dark:text-green-300',
  warning: 'text-amber-700 dark:text-amber-300',
  error: 'text-red-700 dark:text-red-300',
  info: 'text-blue-700 dark:text-blue-300',

  // Interactive elements
  link: 'text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200',
  linkMuted: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',

  // Badge/chip text colors
  badgeSuccess: 'text-green-800 dark:text-green-200',
  badgeWarning: 'text-amber-900 dark:text-amber-200',
  badgeError: 'text-red-800 dark:text-red-200',
  badgeInfo: 'text-blue-800 dark:text-blue-200',
  badgeNeutral: 'text-gray-800 dark:text-gray-200',

  // Icon colors
  iconPrimary: 'text-gray-700 dark:text-gray-200',
  iconSecondary: 'text-gray-600 dark:text-gray-300',
  iconMuted: 'text-gray-500 dark:text-gray-400',

  // Background + text combinations (guaranteed WCAG AA)
  onLight: {
    primary: 'text-gray-900',
    secondary: 'text-gray-700',
    muted: 'text-gray-600',
  },
  onDark: {
    primary: 'text-white',
    secondary: 'text-gray-200',
    muted: 'text-gray-300',
  },

  // On colored backgrounds
  onBlue: 'text-blue-50 dark:text-blue-900',
  onGreen: 'text-green-50 dark:text-green-900',
  onRed: 'text-red-50 dark:text-red-900',
  onYellow: 'text-yellow-900 dark:text-yellow-100',
  onPurple: 'text-purple-50 dark:text-purple-900',
} as const;

// Background colors with guaranteed text contrast
export const contrastBackgrounds = {
  // Light backgrounds with dark text
  lightPrimary: 'bg-white dark:bg-gray-900',
  lightSecondary: 'bg-gray-50 dark:bg-gray-800',
  lightTertiary: 'bg-gray-100 dark:bg-gray-700',

  // Colored backgrounds with appropriate text
  successBg: 'bg-green-50 dark:bg-green-900/20',
  successBorder: 'border-green-200 dark:border-green-700',

  warningBg: 'bg-amber-50 dark:bg-amber-900/20',
  warningBorder: 'border-amber-200 dark:border-amber-700',

  errorBg: 'bg-red-50 dark:bg-red-900/20',
  errorBorder: 'border-red-200 dark:border-red-700',

  infoBg: 'bg-blue-50 dark:bg-blue-900/20',
  infoBorder: 'border-blue-200 dark:border-blue-700',

  neutralBg: 'bg-gray-50 dark:bg-gray-800/50',
  neutralBorder: 'border-gray-200 dark:border-gray-700',
} as const;

// Helper function to get contrast-compliant text class
export function getContrastText(variant: keyof typeof contrastColors = 'primary'): string {
  return contrastColors[variant];
}

// Helper function to check if a color combination is likely WCAG AA compliant
export function isLikelyWCAGCompliant(textClass: string): boolean {
  const nonCompliantPatterns = [
    'text-gray-400',
    'text-gray-500 ',
    'text-blue-400',
    'text-green-400',
    'text-red-400',
    'text-yellow-400',
    'text-purple-400',
    'text-pink-400',
    'text-indigo-400',
  ];

  return !nonCompliantPatterns.some(pattern => textClass.includes(pattern));
}

/**
 * Migration guide for common patterns:
 *
 * OLD: className="text-gray-400 dark:text-gray-500"
 * NEW: className={contrastColors.muted}
 *
 * OLD: className="text-gray-500"
 * NEW: className={contrastColors.muted} or className="text-gray-600 dark:text-gray-300"
 *
 * OLD: className="text-blue-400 dark:text-blue-500"
 * NEW: className={contrastColors.info}
 *
 * OLD: className="text-green-400"
 * NEW: className={contrastColors.success}
 */
