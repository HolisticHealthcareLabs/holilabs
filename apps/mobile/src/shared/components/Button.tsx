import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { HapticFeedback } from '@/services/haptics';

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
  hapticFeedback?: boolean; // Enable/disable haptic feedback (default: true)
};

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  hapticFeedback = true,
}: ButtonProps) => {
  const { theme } = useTheme();

  const handlePress = () => {
    // Trigger haptic feedback based on button variant
    if (hapticFeedback && !disabled && !loading) {
      if (variant === 'danger') {
        HapticFeedback.heavy();
      } else if (variant === 'primary') {
        HapticFeedback.medium();
      } else {
        HapticFeedback.light();
      }
    }
    onPress();
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size
    switch (size) {
      case 'sm':
        baseStyle.paddingVertical = theme.spacing.sm;
        baseStyle.paddingHorizontal = theme.spacing.md;
        break;
      case 'lg':
        baseStyle.paddingVertical = theme.spacing.lg;
        baseStyle.paddingHorizontal = theme.spacing.xl;
        break;
      default:
        baseStyle.paddingVertical = theme.spacing.md;
        baseStyle.paddingHorizontal = theme.spacing.lg;
    }

    // Variant
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = theme.colors.primary;
        break;
      case 'secondary':
        baseStyle.backgroundColor = theme.colors.surface;
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = theme.colors.border;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 2;
        baseStyle.borderColor = theme.colors.primary;
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        break;
      case 'danger':
        baseStyle.backgroundColor = theme.colors.error;
        break;
    }

    // Disabled
    if (disabled || loading) {
      baseStyle.opacity = 0.5;
    }

    // Full width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: theme.typography.weights.semibold,
    };

    // Size
    switch (size) {
      case 'sm':
        baseStyle.fontSize = theme.typography.sizes.sm;
        break;
      case 'lg':
        baseStyle.fontSize = theme.typography.sizes.lg;
        break;
      default:
        baseStyle.fontSize = theme.typography.sizes.md;
    }

    // Variant colors
    switch (variant) {
      case 'primary':
      case 'danger':
        baseStyle.color = '#FFFFFF';
        break;
      case 'secondary':
      case 'ghost':
        baseStyle.color = theme.colors.text;
        break;
      case 'outline':
        baseStyle.color = theme.colors.primary;
        break;
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      style={[getButtonStyle(), style]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : theme.colors.primary}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};
