import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/shared/contexts/ThemeContext';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevation?: 'none' | 'sm' | 'md' | 'lg';
};

export const Card = ({
  children,
  style,
  padding = 'md',
  elevation = 'md',
}: CardProps) => {
  const { theme } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return theme.spacing.sm;
      case 'lg':
        return theme.spacing.lg;
      default:
        return theme.spacing.md;
    }
  };

  const getElevation = () => {
    switch (elevation) {
      case 'none':
        return {};
      case 'sm':
        return theme.shadows.sm;
      case 'lg':
        return theme.shadows.lg;
      default:
        return theme.shadows.md;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: getPadding(),
    ...getElevation(),
  };

  return <View style={[cardStyle, style]}>{children}</View>;
};
