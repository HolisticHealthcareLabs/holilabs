import React from 'react';
import { TextInputProps } from 'react-native';
type InputProps = TextInputProps & {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onRightIconPress?: () => void;
};
export declare const Input: ({ label, error, helperText, leftIcon, rightIcon, onRightIconPress, style, ...props }: InputProps) => React.JSX.Element;
export {};
//# sourceMappingURL=Input.d.ts.map