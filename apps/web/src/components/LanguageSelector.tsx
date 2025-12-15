'use client';

import { useState } from 'react';
import { locales, localeLabels, localeFlags, type Locale } from '../i18n';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSelector({ currentLocale }: { currentLocale: Locale }) {
  const [isOpen, setIsOpen] = useState(false);
  const { setLocale } = useLanguage();

  const handleLocaleChange = (newLocale: Locale) => {
    setIsOpen(false);
    setLocale(newLocale);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        aria-label="Select language"
      >
        <span className="text-xl">{localeFlags[currentLocale]}</span>
        <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-200">
          {localeLabels[currentLocale]}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
            {locales.map((locale) => (
              <button
                key={locale}
                onClick={() => handleLocaleChange(locale)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${
                  locale === currentLocale
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                <span className="text-xl">{localeFlags[locale]}</span>
                <span className="font-medium">{localeLabels[locale]}</span>
                {locale === currentLocale && (
                  <svg
                    className="w-4 h-4 ml-auto text-blue-600 dark:text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
