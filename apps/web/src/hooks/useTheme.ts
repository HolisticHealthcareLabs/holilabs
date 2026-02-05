'use client';

import { useState, useEffect } from 'react';

const THEME_KEY = 'holilabs_theme';

export function useTheme() {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window === 'undefined') return 'dark';
        if (localStorage.getItem(THEME_KEY) === 'light') return 'light';
        return 'dark'; // Default to dark for premium feel
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.remove('dark');
            root.classList.add('light');
        }
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
    return { theme, toggleTheme };
}
