/**
 * Card Component
 * Production-ready card with platform-specific shadows
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '@/config/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'filled';
  onPress?: () => void;
  padding?: keyof typeof spacing;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  onPress,
  padding = 'md',
}) => {
  const { theme } = useTheme();

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.colors.card,
          ...theme.shadows.md,
        };
      case 'outlined':
        return {
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      case 'filled':
        return {
          backgroundColor: theme.colors.surface,
        };
      default:
        return {
          backgroundColor: theme.colors.card,
          ...theme.shadows.md,
        };
    }
  };

  const paddingValue = spacing[padding];

  const containerStyle: ViewStyle = {
    borderRadius: theme.borderRadius.lg,
    padding: paddingValue,
    ...getVariantStyles(),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessible
        accessibilityRole="button"
        style={[containerStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
};
