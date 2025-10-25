import React, { ReactNode } from 'react';
import { Theme } from '@/config/theme';
type ThemeMode = 'light' | 'dark' | 'auto';
type ThemeContextType = {
    theme: Theme;
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    isDark: boolean;
};
export declare const ThemeProvider: ({ children }: {
    children: ReactNode;
}) => React.JSX.Element;
export declare const useTheme: () => ThemeContextType;
export {};
//# sourceMappingURL=ThemeContext.d.ts.map