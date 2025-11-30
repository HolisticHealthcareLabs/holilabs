/**
 * Button Component
 * Production-ready button with haptic feedback and accessibility
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticFeedback?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
  hapticFeedback = true,
}) => {
  const { theme } = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;

    // Haptic feedback for better UX
    if (hapticFeedback && Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress();
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      paddingVertical: theme.spacing[2],
      paddingHorizontal: theme.spacing[3],
      fontSize: theme.typography.fontSize.sm,
      minHeight: 36,
    },
    md: {
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[4],
      fontSize: theme.typography.fontSize.base,
      minHeight: 44, // iOS minimum touch target
    },
    lg: {
      paddingVertical: theme.spacing[4],
      paddingHorizontal: theme.spacing[6],
      fontSize: theme.typography.fontSize.lg,
      minHeight: 52,
    },
  };

  // Variant styles
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    const config = sizeConfig[size];

    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: disabled
              ? theme.colors.border
              : theme.colors.buttonPrimary,
            paddingVertical: config.paddingVertical,
            paddingHorizontal: config.paddingHorizontal,
            minHeight: config.minHeight,
          },
          text: {
            color: theme.colors.textInverse,
            fontSize: config.fontSize,
            fontWeight: theme.typography.fontWeight.semibold,
          },
        };

      case 'secondary':
        return {
          container: {
            backgroundColor: disabled
              ? theme.colors.borderLight
              : theme.colors.buttonSecondary,
            paddingVertical: config.paddingVertical,
            paddingHorizontal: config.paddingHorizontal,
            minHeight: config.minHeight,
          },
          text: {
            color: disabled ? theme.colors.textTertiary : theme.colors.text,
            fontSize: config.fontSize,
            fontWeight: theme.typography.fontWeight.semibold,
          },
        };

      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: disabled
              ? theme.colors.border
              : theme.colors.primary,
            paddingVertical: config.paddingVertical,
            paddingHorizontal: config.paddingHorizontal,
            minHeight: config.minHeight,
          },
          text: {
            color: disabled ? theme.colors.textTertiary : theme.colors.primary,
            fontSize: config.fontSize,
            fontWeight: theme.typography.fontWeight.semibold,
          },
        };

      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            paddingVertical: config.paddingVertical,
            paddingHorizontal: config.paddingHorizontal,
            minHeight: config.minHeight,
          },
          text: {
            color: disabled ? theme.colors.textTertiary : theme.colors.primary,
            fontSize: config.fontSize,
            fontWeight: theme.typography.fontWeight.medium,
          },
        };

      case 'danger':
        return {
          container: {
            backgroundColor: disabled ? theme.colors.border : theme.colors.error,
            paddingVertical: config.paddingVertical,
            paddingHorizontal: config.paddingHorizontal,
            minHeight: config.minHeight,
          },
          text: {
            color: theme.colors.textInverse,
            fontSize: config.fontSize,
            fontWeight: theme.typography.fontWeight.semibold,
          },
        };

      default:
        return {
          container: {
            backgroundColor: theme.colors.primary,
            paddingVertical: config.paddingVertical,
            paddingHorizontal: config.paddingHorizontal,
            minHeight: config.minHeight,
          },
          text: {
            color: theme.colors.textInverse,
            fontSize: config.fontSize,
            fontWeight: theme.typography.fontWeight.semibold,
          },
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      accessibilityLabel={title}
      style={[
        styles.container,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary' || variant === 'danger'
              ? theme.colors.textInverse
              : theme.colors.primary
          }
          size="small"
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              variantStyles.text,
              icon && styles.textWithIcon,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  textWithIcon: {
    marginLeft: 8,
  },
});
