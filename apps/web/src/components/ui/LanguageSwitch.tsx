/**
 * Language Switcher Component
 *
 * Features:
 * - Toggle between Spanish (es) and English (en)
 * - Stores preference in localStorage
 * - Clean, minimal UI for auth pages
 * - Icon-based design
 */

'use client';

import { useState, useEffect } from 'react';

interface LanguageSwitchProps {
  onChange?: (language: string) => void;
  className?: string;
}

export function LanguageSwitch({ onChange, className = '' }: LanguageSwitchProps) {
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved language preference
    const saved = localStorage.getItem('language') as 'es' | 'en';
    if (saved) {
      setLanguage(saved);
    }
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === 'es' ? 'en' : 'es';
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
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
      aria-label={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      <span className="font-medium">{language === 'es' ? 'ES' : 'EN'}</span>
    </button>
  );
}

/**
 * Hook to get current language
 */
export function useLanguage() {
  const [language, setLanguage] = useState<'es' | 'en'>('es');

  useEffect(() => {
    const saved = localStorage.getItem('language') as 'es' | 'en';
    if (saved) {
      setLanguage(saved);
    }
  }, []);

  return language;
}

/**
 * Translation helper function
 */
export function t(translations: { es: string; en: string }) {
  if (typeof window === 'undefined') return translations.es;

  const language = localStorage.getItem('language') as 'es' | 'en' || 'es';
  return translations[language];
}
