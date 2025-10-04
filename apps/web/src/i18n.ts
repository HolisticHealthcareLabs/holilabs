import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Define supported locales
export const locales = ['es', 'pt', 'en'] as const;
export const defaultLocale = 'es' as const;

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
