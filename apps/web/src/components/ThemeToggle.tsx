'use client';

import { useEffect } from 'react';
import { useTheme as useThemeHook } from '@/providers/ThemeProvider';

/**
 * Accessible Theme Toggle Component
 *
 * Features:
 * - 3-state toggle: light / dark / auto (system preference)
 * - Keyboard shortcut: Cmd/Ctrl + Shift + L
 * - Tooltips showing current theme state
 * - ARIA labels for screen readers
 * - Smooth transitions
 * - Focus indicators
 */
export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useThemeHook();
  // Tooltip removed — parent glass circle provides group-hover tooltip

  // Keyboard shortcut: Cmd/Ctrl + Shift + L
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        // Cycle through themes: light -> dark -> auto -> light
        if (theme === 'light') {
          setTheme('dark');
        } else if (theme === 'dark') {
          setTheme('auto');
        } else {
          setTheme('light');
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [theme, setTheme]);

  const getThemeLabel = () => {
    if (theme === 'auto') {
      return `Auto (${resolvedTheme === 'light' ? 'Light' : 'Dark'})`;
    }
    return theme === 'light' ? 'Light' : 'Dark';
  };

  // Theme icons
  const icons = {
    light: (
      <svg
        className="w-[18px] h-[18px]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.25}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    dark: (
      <svg
        className="w-[18px] h-[18px]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.25}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    ),
    auto: (
      <svg
        className="w-[18px] h-[18px]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.25}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  };

  // Get current icon based on theme
  const getCurrentIcon = () => {
    if (theme === 'auto') return icons.auto;
    return theme === 'light' ? icons.light : icons.dark;
  };

  // Cycle through themes
  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('auto');
    } else {
      setTheme('light');
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={cycleTheme}
        className="relative flex items-center justify-center w-full h-full bg-transparent border-none focus:outline-none"
        aria-label={`Current theme: ${getThemeLabel()}. Click to cycle themes. Keyboard shortcut: ${
          typeof navigator !== 'undefined' && typeof navigator.platform === 'string' && navigator.platform.includes('Mac')
            ? 'Cmd'
            : 'Ctrl'
        } + Shift + L`}
        aria-live="polite"
        type="button"
      >
        <div className="text-gray-600 dark:text-gray-300">
          {getCurrentIcon()}
        </div>
      </button>

      {/* Theme indicator badge (optional visual cue) */}
      {theme === 'auto' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-950 animate-pulse" />
      )}
    </div>
  );
}
