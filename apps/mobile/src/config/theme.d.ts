export declare const colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    light: {
        background: string;
        surface: string;
        surfaceVariant: string;
        text: string;
        textSecondary: string;
        textTertiary: string;
        border: string;
        borderFocused: string;
        disabled: string;
        overlay: string;
    };
    dark: {
        background: string;
        surface: string;
        surfaceVariant: string;
        text: string;
        textSecondary: string;
        textTertiary: string;
        border: string;
        borderFocused: string;
        disabled: string;
        overlay: string;
    };
    recording: {
        active: string;
        paused: string;
        inactive: string;
    };
    soap: {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    };
};
export declare const spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
};
export declare const borderRadius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
};
export declare const typography: {
    fonts: {
        regular: string;
        medium: string;
        bold: string;
    };
    sizes: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        xxl: number;
        xxxl: number;
    };
    lineHeights: {
        tight: number;
        normal: number;
        relaxed: number;
    };
    weights: {
        regular: "400";
        medium: "500";
        semibold: "600";
        bold: "700";
    };
};
export declare const shadows: {
    sm: {
        shadowColor: string;
        shadowOffset: {
            width: number;
            height: number;
        };
        shadowOpacity: number;
        shadowRadius: number;
        elevation: number;
    };
    md: {
        shadowColor: string;
        shadowOffset: {
            width: number;
            height: number;
        };
        shadowOpacity: number;
        shadowRadius: number;
        elevation: number;
    };
    lg: {
        shadowColor: string;
        shadowOffset: {
            width: number;
            height: number;
        };
        shadowOpacity: number;
        shadowRadius: number;
        elevation: number;
    };
};
export type Theme = {
    colors: typeof colors;
    spacing: typeof spacing;
    borderRadius: typeof borderRadius;
    typography: typeof typography;
    shadows: typeof shadows;
    isDark: boolean;
};
export declare const lightTheme: Theme;
export declare const darkTheme: Theme;
//# sourceMappingURL=theme.d.ts.map