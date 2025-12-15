'use client';

/**
 * Language Context Provider
 * Manages language selection with localStorage persistence
 * Priority: User preference → Browser language → Spanish default
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type Locale, defaultLocale } from '@/i18n';
import { logger } from '@/lib/logger';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Detect user's preferred language
 * Priority order:
 * 1. User's saved preference (localStorage)
 * 2. Browser language
 * 3. Default (Spanish for Mexican market)
 */
const detectUserLanguage = (): Locale => {
  // 1. Check localStorage first
  if (typeof window !== 'undefined') {
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale && ['es', 'en', 'pt'].includes(savedLocale)) {
      return savedLocale;
    }

    // 2. Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (['es', 'en', 'pt'].includes(browserLang)) {
      return browserLang as Locale;
    }
  }

  // 3. Default to English
  return 'en';
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [translations, setTranslations] = useState<Record<string, any>>({});

  // Detect and set initial locale on mount
  useEffect(() => {
    const detectedLocale = detectUserLanguage();
    setLocaleState(detectedLocale);
  }, []);

  // Load translations when locale changes
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const messages = await import(`../../messages/${locale}.json`);
        setTranslations(messages.default);
      } catch (error) {
        logger.error({
          event: 'translation_load_failed',
          locale,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    };
    loadTranslations();
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  // Translation function with dot notation support
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        logger.warn({
          event: 'translation_key_missing',
          translationKey: key,
          locale
        });
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
