/**
 * Theme Initialization Script
 *
 * This script runs BEFORE React hydration to prevent FOUC (Flash of Unstyled Content).
 * It must be inline in the HTML <head> to execute immediately.
 *
 * Usage: Insert in app/layout.tsx <head> as inline script
 */

export const themeInitScript = `
(function() {
  const storageKey = 'holilabs-theme';

  function getSystemTheme() {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function resolveTheme(theme) {
    if (theme === 'auto' || !theme) {
      return getSystemTheme();
    }
    return theme;
  }

  function applyTheme(theme) {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'dark' ? '#0a0a0a' : '#ffffff'
      );
    }
  }

  // Load and apply theme immediately
  try {
    const savedTheme = localStorage.getItem(storageKey);
    const resolvedTheme = resolveTheme(savedTheme);
    applyTheme(resolvedTheme);
  } catch (error) {
    // Fallback to system theme if localStorage fails
    applyTheme(getSystemTheme());
  }
})();
`;
