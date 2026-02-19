'use client';

import { useState, useEffect } from 'react';
import { Language, translations } from '@/lib/translations';

// Aligned with LanguageContext (contexts/LanguageContext.tsx) so landing,
// login, and dashboard all read/write the same localStorage key.
const LANGUAGE_KEY = 'locale';

export function useLanguage() {
  // Default to English (landing page default). We still hydrate from localStorage after mount.
  const [language, setLanguageState] = useState<Language>('en');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // After hydration, check localStorage
    const stored = localStorage.getItem(LANGUAGE_KEY) as Language | null;
    if (stored && ['en', 'es', 'pt'].includes(stored)) {
      setLanguageState(stored);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(LANGUAGE_KEY, language);
    }
  }, [language, isHydrated]);

  const t = translations[language];

  return { language, setLanguage: setLanguageState, t };
}

