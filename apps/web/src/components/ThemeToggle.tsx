'use client';

import { useEffect, useState } from 'react';
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
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipText, setTooltipText] = useState('');

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

  // Get tooltip text based on current theme
  const getThemeLabel = () => {
    if (theme === 'auto') {
      return `Auto (${resolvedTheme === 'light' ? 'Light' : 'Dark'})`;
    }
    return theme === 'light' ? 'Light' : 'Dark';
  };

  // Handle tooltip display
  const handleMouseEnter = () => {
    setTooltipText(getThemeLabel());
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Theme icons
  const icons = {
    light: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    dark: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    ),
    auto: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label={`Current theme: ${getThemeLabel()}. Click to cycle themes. Keyboard shortcut: ${
          navigator.platform.indexOf('Mac') > -1 ? 'Cmd' : 'Ctrl'
        } + Shift + L`}
        aria-live="polite"
        type="button"
      >
        <div className="text-gray-700 dark:text-gray-300 transition-transform duration-200 hover:scale-110">
          {getCurrentIcon()}
        </div>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-fadeIn z-50"
          role="tooltip"
        >
          {tooltipText}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </div>
        </div>
      )}

      {/* Theme indicator badge (optional visual cue) */}
      {theme === 'auto' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
      )}

      {/* CSS for smooth animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
