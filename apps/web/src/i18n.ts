import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Define supported locales (Portuguese primary for Pequeno Cotolêngo pilot)
export const locales = ['pt', 'en', 'es'] as const;
export const defaultLocale = 'pt' as const;
export type Locale = (typeof locales)[number];

// Locale display labels
export const localeLabels: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
};

// Locale flag emojis
export const localeFlags: Record<Locale, string> = {
  pt: '🇧🇷',
  en: '🇺🇸',
  es: '🇪🇸',
};

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
