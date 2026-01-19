// Client-safe i18n constants (no server-only imports).
// IMPORTANT: Do not import from `next-intl/server` or `next/navigation` here.

// Define supported locales (English primary, Spanish/Portuguese for LATAM)
export const locales = ['en', 'es', 'pt'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Locale display labels
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};

// Locale flag emojis
export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  pt: '🇧🇷',
};

