/**
 * Badge Component - Status indicators and labels
 *
 * Features:
 * - Multiple variants (default, success, warning, error, info, neutral)
 * - Multiple sizes (small, medium, large)
 * - Icon support
 * - Dot indicator mode
 * - Rounded or pill shapes
 * - Healthcare-optimized colors
 * - Accessibility labels
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'urgent'
  | 'stat';

export type BadgeSize = 'small' | 'medium' | 'large';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: string;
  dot?: boolean;
  rounded?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  onLayout?: (event: any) => void;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'medium',
  icon,
  dot = false,
  rounded = false,
  style,
  textStyle,
  onLayout,
}) => {
  const { theme } = useTheme();
  const colors = getBadgeColors(theme, variant);
  const styles = createStyles(theme, colors, size, rounded);

  return (
    <View
      style={[styles.container, style]}
      onLayout={onLayout}
      accessibilityRole="text"
      accessibilityLabel={`${variant} status: ${label}`}
    >
      {dot && <View style={styles.dot} />}
      {icon && !dot && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[styles.label, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const getBadgeColors = (theme: any, variant: BadgeVariant) => {
  switch (variant) {
    case 'success':
      return {
        background: `${theme.colors.success}20`,
        text: theme.colors.success,
        dot: theme.colors.success,
      };
    case 'warning':
      return {
        background: `${theme.colors.warning}20`,
        text: theme.colors.warning,
        dot: theme.colors.warning,
      };
    case 'error':
      return {
        background: `${theme.colors.error}20`,
        text: theme.colors.error,
        dot: theme.colors.error,
      };
    case 'info':
      return {
        background: `${theme.colors.primary}20`,
        text: theme.colors.primary,
        dot: theme.colors.primary,
      };
    case 'urgent':
      return {
        background: '#FF0000',
        text: '#FFFFFF',
        dot: '#FFFFFF',
      };
    case 'stat':
      return {
        background: '#FF6B00',
        text: '#FFFFFF',
        dot: '#FFFFFF',
      };
    case 'neutral':
      return {
        background: theme.colors.surfaceSecondary,
        text: theme.colors.textSecondary,
        dot: theme.colors.textSecondary,
      };
    default:
      return {
        background: theme.colors.surfaceSecondary,
        text: theme.colors.text,
        dot: theme.colors.text,
      };
  }
};

const createStyles = (
  theme: any,
  colors: any,
  size: BadgeSize,
  rounded: boolean
) => {
  const sizeConfig = {
    small: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      fontSize: 11,
      iconSize: 12,
      dotSize: 6,
    },
    medium: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      fontSize: 13,
      iconSize: 14,
      dotSize: 8,
    },
    large: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      fontSize: 15,
      iconSize: 16,
      dotSize: 10,
    },
  }[size];

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: rounded ? 100 : 8,
      paddingVertical: sizeConfig.paddingVertical,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      alignSelf: 'flex-start',
    },
    label: {
      fontSize: sizeConfig.fontSize,
      fontWeight: '600',
      color: colors.text,
    },
    icon: {
      fontSize: sizeConfig.iconSize,
      marginRight: 6,
    },
    dot: {
      width: sizeConfig.dotSize,
      height: sizeConfig.dotSize,
      borderRadius: sizeConfig.dotSize / 2,
      backgroundColor: colors.dot,
      marginRight: 8,
    },
  });
};

// Preset badges for common healthcare use cases
export const UrgentBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge {...props} variant="urgent" rounded />
);

export const StatBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge {...props} variant="stat" rounded />
);

export const PriorityBadge: React.FC<
  Omit<BadgeProps, 'variant' | 'label'> & {
    priority: 'urgent' | 'stat' | 'routine' | 'follow-up';
  }
> = ({ priority, ...props }) => {
  const config = {
    urgent: { label: 'URGENT', variant: 'urgent' as BadgeVariant },
    stat: { label: 'STAT', variant: 'stat' as BadgeVariant },
    routine: { label: 'Routine', variant: 'info' as BadgeVariant },
    'follow-up': { label: 'Follow-up', variant: 'neutral' as BadgeVariant },
  }[priority];

  return <Badge {...props} label={config.label} variant={config.variant} rounded />;
};

export const AppointmentTypeBadge: React.FC<
  Omit<BadgeProps, 'variant' | 'icon'> & {
    type: 'in-person' | 'telehealth' | 'phone' | 'walk-in';
  }
> = ({ type, ...props }) => {
  const config = {
    'in-person': { icon: '🏥', variant: 'info' as BadgeVariant },
    telehealth: { icon: '💻', variant: 'success' as BadgeVariant },
    phone: { icon: '📞', variant: 'neutral' as BadgeVariant },
    'walk-in': { icon: '🚶', variant: 'warning' as BadgeVariant },
  }[type];

  return <Badge {...props} icon={config.icon} variant={config.variant} />;
};

export const StatusBadge: React.FC<
  Omit<BadgeProps, 'variant' | 'dot'> & {
    status: 'active' | 'pending' | 'completed' | 'cancelled';
  }
> = ({ status, ...props }) => {
  const config = {
    active: { variant: 'success' as BadgeVariant },
    pending: { variant: 'warning' as BadgeVariant },
    completed: { variant: 'neutral' as BadgeVariant },
    cancelled: { variant: 'error' as BadgeVariant },
  }[status];

  return <Badge {...props} variant={config.variant} dot />;
};

// Lab Result Badge
export const LabResultBadge: React.FC<
  Omit<BadgeProps, 'variant'> & {
    result: 'normal' | 'abnormal' | 'critical';
  }
> = ({ result, ...props }) => {
  const config = {
    normal: { variant: 'success' as BadgeVariant },
    abnormal: { variant: 'warning' as BadgeVariant },
    critical: { variant: 'urgent' as BadgeVariant },
  }[result];

  return <Badge {...props} variant={config.variant} />;
};

// Notification Count Badge
export const NotificationBadge: React.FC<{
  count: number;
  style?: ViewStyle;
}> = ({ count, style }) => {
  const { theme } = useTheme();

  if (count === 0) return null;

  return (
    <View
      style={[
        {
          position: 'absolute',
          top: -6,
          right: -6,
          backgroundColor: theme.colors.error,
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 6,
          borderWidth: 2,
          borderColor: theme.colors.card,
        },
        style,
      ]}
      accessibilityLabel={`${count} unread notifications`}
      accessibilityRole="text"
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: '700',
        }}
      >
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
};
