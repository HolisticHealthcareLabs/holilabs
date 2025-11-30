/**
 * useTheme Hook
 * Access theme configuration throughout the app
 */

import { useContext } from 'react';
import { ThemeContext } from '../shared/contexts/ThemeContext';

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
