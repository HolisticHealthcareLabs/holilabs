import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Define supported locales
export const locales = ['es', 'pt', 'en'] as const;
export const defaultLocale = 'es' as const;
export type Locale = (typeof locales)[number];

// Locale display labels
export const localeLabels: Record<Locale, string> = {
  es: 'Español',
  pt: 'Português',
  en: 'English',
};

// Locale flag emojis
export const localeFlags: Record<Locale, string> = {
  es: '🇪🇸',
  pt: '🇧🇷',
  en: '🇺🇸',
};

export default getRequestConfig(async () => {
  // Default to Spanish
  const locale = defaultLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
