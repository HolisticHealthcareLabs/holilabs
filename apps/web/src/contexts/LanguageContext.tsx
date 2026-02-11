'use client';

/**
 * Language Context Provider
 * Manages language selection with localStorage persistence
 * Priority: User preference → English default
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type Locale } from '@/i18n/shared';
import { logger } from '@/lib/logger';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const DEFAULT_LOCALE: Locale = 'en';
const LOCALE_STORAGE_KEY = 'locale';
const SUPPORTED_LOCALES: Locale[] = ['en', 'es', 'pt'];

const isLocale = (value: string | null): value is Locale => {
  return value !== null && SUPPORTED_LOCALES.includes(value as Locale);
};

/**
 * Detect user's preferred language
 * Priority order:
 * 1. User's saved preference (localStorage)
 * 2. Default (English)
 */
const detectUserLanguage = (): Locale => {
  // 1. Check localStorage first (explicit user preference)
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(savedLocale)) {
      return savedLocale;
    }
  }

  // 2. Default to English (no browser auto-override)
  return DEFAULT_LOCALE;
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const parentContext = useContext(LanguageContext);
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [translations, setTranslations] = useState<Record<string, any>>({});

  // Detect and set initial locale on mount
  useEffect(() => {
    if (parentContext) {
      return;
    }
    const detectedLocale = detectUserLanguage();
    setLocaleState(detectedLocale);
    if (typeof window !== 'undefined' && window.localStorage && !window.localStorage.getItem(LOCALE_STORAGE_KEY)) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, DEFAULT_LOCALE);
    }
  }, [parentContext]);

  // Load translations when locale changes
  useEffect(() => {
    if (parentContext) {
      return;
    }
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
  }, [locale, parentContext]);

  const setLocale = (newLocale: Locale) => {
    if (parentContext) {
      parentContext.setLocale(newLocale);
      return;
    }
    setLocaleState(newLocale);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    }
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

  if (parentContext) {
    return <>{children}</>;
  }

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
