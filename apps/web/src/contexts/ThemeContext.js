"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeProvider = ThemeProvider;
exports.useTheme = useTheme;
const react_1 = require("react");
const ThemeContext = (0, react_1.createContext)(undefined);
function ThemeProvider({ children }) {
    const [theme, setTheme] = (0, react_1.useState)('light');
    const [mounted, setMounted] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
            setTheme(savedTheme);
            document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        }
        else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const defaultTheme = prefersDark ? 'dark' : 'light';
            setTheme(defaultTheme);
            document.documentElement.classList.toggle('dark', prefersDark);
        }
    }, []);
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };
    // Prevent flash of unstyled content
    if (!mounted) {
        return null;
    }
    return (<ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>);
}
function useTheme() {
    const context = (0, react_1.useContext)(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
//# sourceMappingURL=ThemeContext.js.map