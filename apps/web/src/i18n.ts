import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Define supported locales (English primary, Spanish/Portuguese for LATAM)
export const locales = ['en', 'es', 'pt'] as const;
export const defaultLocale = 'en' as const;
export type Locale = (typeof locales)[number];

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

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  return {
    locale: locale as string,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
