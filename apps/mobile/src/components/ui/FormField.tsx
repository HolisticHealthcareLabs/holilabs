/**
 * FormField Component - Production-ready form inputs with validation
 *
 * Features:
 * - React Hook Form integration
 * - Zod schema validation
 * - Multiple input types (text, email, phone, number, password, textarea)
 * - Real-time validation feedback
 * - Accessibility (screen reader labels, error announcements)
 * - Healthcare-optimized styling
 * - Floating labels
 * - Secure password inputs
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
  Animated,
} from 'react-native';
import { Controller, Control, FieldError } from 'react-hook-form';
import { useTheme } from '../../hooks/useTheme';

export interface FormFieldProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  name: string;
  control: Control<any>;
  label: string;
  placeholder?: string;
  helperText?: string;
  type?: 'text' | 'email' | 'phone' | 'number' | 'password' | 'textarea';
  disabled?: boolean;
  required?: boolean;
  containerStyle?: ViewStyle;
  icon?: string;
  maxLength?: number;
  onSubmit?: () => void;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  control,
  label,
  placeholder,
  helperText,
  type = 'text',
  disabled = false,
  required = false,
  containerStyle,
  icon,
  maxLength,
  onSubmit,
  ...textInputProps
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const labelAnimation = React.useRef(new Animated.Value(0)).current;

  const getKeyboardType = () => {
    switch (type) {
      case 'email': return 'email-address';
      case 'phone': return 'phone-pad';
      case 'number': return 'numeric';
      default: return 'default';
    }
  };

  const getAutoCapitalize = () => {
    if (type === 'email') return 'none';
    return textInputProps.autoCapitalize || 'sentences';
  };

  const animateLabel = (toValue: number) => {
    Animated.timing(labelAnimation, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const styles = createStyles(theme, isFocused, disabled);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
        const hasValue = value && value.length > 0;
        const hasError = !!error;

        React.useEffect(() => {
          if (isFocused || hasValue) {
            animateLabel(1);
          } else {
            animateLabel(0);
          }
        }, [isFocused, hasValue]);

        const labelStyle = {
          top: labelAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [18, 4],
          }),
          fontSize: labelAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 12],
          }),
          color: hasError
            ? theme.colors.error
            : isFocused
            ? theme.colors.primary
            : theme.colors.textSecondary,
        };

        return (
          <View style={[styles.container, containerStyle]}>
            {/* Input Container */}
            <View
              style={[
                styles.inputContainer,
                hasError && styles.inputContainerError,
                disabled && styles.inputContainerDisabled,
              ]}
            >
              {/* Icon */}
              {icon && (
                <Text style={styles.icon} accessibilityLabel={`${label} icon`}>
                  {icon}
                </Text>
              )}

              {/* Text Input */}
              <View style={styles.inputWrapper}>
                <Animated.Text
                  style={[styles.label, labelStyle]}
                  accessibilityLabel={`${label}${required ? ' (required)' : ''}`}
                >
                  {label}
                  {required && <Text style={styles.required}>*</Text>}
                </Animated.Text>

                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={() => {
                    onBlur();
                    setIsFocused(false);
                  }}
                  onFocus={() => setIsFocused(true)}
                  placeholder={isFocused ? placeholder : ''}
                  placeholderTextColor={theme.colors.textTertiary}
                  style={[
                    styles.input,
                    type === 'textarea' && styles.textarea,
                  ]}
                  editable={!disabled}
                  keyboardType={getKeyboardType()}
                  autoCapitalize={getAutoCapitalize()}
                  secureTextEntry={type === 'password' && !showPassword}
                  maxLength={maxLength}
                  multiline={type === 'textarea'}
                  numberOfLines={type === 'textarea' ? 4 : 1}
                  textAlignVertical={type === 'textarea' ? 'top' : 'center'}
                  returnKeyType={onSubmit ? 'done' : 'next'}
                  onSubmitEditing={onSubmit}
                  accessible={true}
                  accessibilityLabel={label}
                  accessibilityHint={helperText}
                  accessibilityState={{
                    disabled,
                    selected: isFocused,
                  }}
                  {...textInputProps}
                />
              </View>

              {/* Password Toggle */}
              {type === 'password' && (
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                >
                  <Text style={styles.passwordToggleIcon}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Character Count */}
              {maxLength && hasValue && (
                <Text style={styles.charCount} accessibilityLabel={`${value.length} of ${maxLength} characters`}>
                  {value.length}/{maxLength}
                </Text>
              )}
            </View>

            {/* Helper Text / Error */}
            {(helperText || hasError) && (
              <View style={styles.helperContainer}>
                {hasError ? (
                  <Text
                    style={styles.errorText}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    ⚠️ {error?.message}
                  </Text>
                ) : (
                  <Text style={styles.helperText}>{helperText}</Text>
                )}
              </View>
            )}
          </View>
        );
      }}
    />
  );
};

const createStyles = (theme: any, isFocused: boolean, disabled: boolean) =>
  StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: isFocused ? theme.colors.primary : theme.colors.border,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      minHeight: 60,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      ...theme.shadows.sm,
    },
    inputContainerError: {
      borderColor: theme.colors.error,
    },
    inputContainerDisabled: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderColor: theme.colors.border,
      opacity: 0.6,
    },
    icon: {
      fontSize: 20,
      marginRight: 12,
      color: theme.colors.textSecondary,
    },
    inputWrapper: {
      flex: 1,
      position: 'relative',
    },
    label: {
      position: 'absolute',
      left: 0,
      fontWeight: '500',
      backgroundColor: 'transparent',
    },
    required: {
      color: theme.colors.error,
      fontSize: 14,
    },
    input: {
      fontSize: 16,
      color: theme.colors.text,
      paddingTop: 16,
      paddingBottom: 0,
      minHeight: 44,
    },
    textarea: {
      minHeight: 100,
      textAlignVertical: 'top',
      paddingTop: 16,
    },
    passwordToggle: {
      padding: 8,
      marginLeft: 8,
    },
    passwordToggleIcon: {
      fontSize: 20,
    },
    charCount: {
      position: 'absolute',
      right: 16,
      bottom: 8,
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    helperContainer: {
      marginTop: 6,
      marginLeft: 16,
    },
    helperText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    errorText: {
      fontSize: 13,
      color: theme.colors.error,
      lineHeight: 18,
      fontWeight: '500',
    },
  });

// Preset form field types for common healthcare use cases
export const EmailField: React.FC<Omit<FormFieldProps, 'type'>> = (props) => (
  <FormField {...props} type="email" icon="📧" />
);

export const PhoneField: React.FC<Omit<FormFieldProps, 'type'>> = (props) => (
  <FormField {...props} type="phone" icon="📱" />
);

export const PasswordField: React.FC<Omit<FormFieldProps, 'type'>> = (props) => (
  <FormField {...props} type="password" icon="🔒" />
);

export const TextAreaField: React.FC<Omit<FormFieldProps, 'type'>> = (props) => (
  <FormField {...props} type="textarea" />
);

// Clinical-specific fields
export const VitalSignField: React.FC<Omit<FormFieldProps, 'type'> & { unit: string }> = ({
  unit,
  helperText,
  ...props
}) => (
  <FormField
    {...props}
    type="number"
    helperText={helperText || `Enter value in ${unit}`}
    icon="📊"
  />
);

export const DateOfBirthField: React.FC<Omit<FormFieldProps, 'type' | 'placeholder'>> = (
  props
) => (
  <FormField
    {...props}
    type="text"
    placeholder="MM/DD/YYYY"
    icon="📅"
    maxLength={10}
    helperText="Format: MM/DD/YYYY"
  />
);
