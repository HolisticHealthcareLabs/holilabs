/**
 * Holi Labs Design System
 * Central theme configuration for consistent branding
 *
 * Update these values when your designer provides brand guidelines
 */
export declare const theme: {
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        gradientFrom: string;
        gradientTo: string;
        success: string;
        warning: string;
        error: string;
        info: string;
        gray: {
            50: string;
            100: string;
            200: string;
            300: string;
            500: string;
            700: string;
            900: string;
        };
    };
    typography: {
        fontFamily: {
            sans: string;
            mono: string;
        };
        fontSize: {
            xs: string;
            sm: string;
            base: string;
            lg: string;
            xl: string;
            '2xl': string;
            '3xl': string;
            '4xl': string;
        };
    };
    spacing: {
        borderRadius: {
            sm: string;
            md: string;
            lg: string;
            xl: string;
        };
        container: {
            padding: string;
            maxWidth: string;
        };
    };
    shadows: {
        sm: string;
        md: string;
        lg: string;
    };
    animations: {
        transition: string;
        transitionFast: string;
    };
};
export declare const getGradient: (direction?: "r" | "l" | "br" | "bl") => string;
export declare const colors: {
    primary: string;
    secondary: string;
    accent: string;
    gradientFrom: string;
    gradientTo: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    gray: {
        50: string;
        100: string;
        200: string;
        300: string;
        500: string;
        700: string;
        900: string;
    };
}, typography: {
    fontFamily: {
        sans: string;
        mono: string;
    };
    fontSize: {
        xs: string;
        sm: string;
        base: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };
}, spacing: {
    borderRadius: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    container: {
        padding: string;
        maxWidth: string;
    };
}, shadows: {
    sm: string;
    md: string;
    lg: string;
}, animations: {
    transition: string;
    transitionFast: string;
};
export default theme;
//# sourceMappingURL=theme.d.ts.map