import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonProps = {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
};
export declare const Button: ({ title, onPress, variant, size, disabled, loading, fullWidth, style, textStyle, }: ButtonProps) => React.JSX.Element;
export {};
//# sourceMappingURL=Button.d.ts.map