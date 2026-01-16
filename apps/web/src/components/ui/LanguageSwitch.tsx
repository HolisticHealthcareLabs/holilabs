/**
 * Language Switcher Component
 *
 * Features:
 * - Toggle between English (en), Spanish (es) and Portuguese (pt)
 * - Stores preference in localStorage
 * - Clean, minimal UI for auth pages
 * - Icon-based design
 */

'use client';

import { useState, useEffect } from 'react';

interface LanguageSwitchProps {
  onChange?: (language: 'en' | 'es' | 'pt') => void;
  className?: string;
}

export function LanguageSwitch({ onChange, className = '' }: LanguageSwitchProps) {
  const [language, setLanguage] = useState<'en' | 'es' | 'pt'>('en');
  const [mounted, setMounted] = useState(false);

  const STORAGE_KEY = 'holilabs_language';

  useEffect(() => {
    setMounted(true);
    // Load saved language preference
    const saved = localStorage.getItem(STORAGE_KEY) as 'en' | 'es' | 'pt' | null;
    if (saved && ['en', 'es', 'pt'].includes(saved)) {
      setLanguage(saved);
    }
  }, []);

  const toggleLanguage = () => {
    const order: Array<'en' | 'es' | 'pt'> = ['en', 'es', 'pt'];
    const idx = order.indexOf(language);
    const newLanguage = order[(idx + 1) % order.length];
    setLanguage(newLanguage);
    localStorage.setItem(STORAGE_KEY, newLanguage);
    if (onChange) {
      onChange(newLanguage);
    }
    // Reload page to apply new language
    window.location.reload();
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
      aria-label={
        language === 'en'
          ? 'Switch language'
          : language === 'es'
            ? 'Cambiar idioma'
            : 'Mudar idioma'
      }
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      <span className="font-medium">
        {language === 'en' ? 'EN' : language === 'es' ? 'ES' : 'PT'}
      </span>
    </button>
  );
}
