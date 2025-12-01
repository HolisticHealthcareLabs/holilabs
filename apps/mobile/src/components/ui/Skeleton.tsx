/**
 * Skeleton Component - Healthcare-appropriate loading placeholders
 * Inspired by Epic MyChart and competitive analysis
 *
 * Features:
 * - Gentle pulse animation (calm, not urgent - healthcare-appropriate)
 * - Smooth shimmer animation option
 * - Multiple variants (text, circle, rect, rounded)
 * - Customizable sizes
 * - Theme-aware colors
 * - Reduced motion support
 * - Performance optimized
 * - Healthcare-specific presets
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { useAccessibility } from '../../hooks/useAccessibility';

export interface SkeletonProps {
  variant?: 'text' | 'circle' | 'rect' | 'rounded';
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
  animationType?: 'shimmer' | 'pulse'; // pulse is calmer for healthcare
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width = '100%',
  height,
  borderRadius,
  style,
  children,
  animationType = 'pulse', // Default to pulse for healthcare calm
}) => {
  const { theme } = useTheme();
  const { shouldReduceMotion } = useAccessibility();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Disable animation if user prefers reduced motion
    if (shouldReduceMotion()) {
      return;
    }

    // Gentle pulse animation (1000ms in/out) - calm and healthcare-appropriate
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shouldReduceMotion]);

  const getDefaultHeight = () => {
    if (height) return height;
    switch (variant) {
      case 'text': return 16;
      case 'circle': return 40;
      case 'rect': return 100;
      default: return 16;
    }
  };

  const getDefaultBorderRadius = () => {
    if (borderRadius !== undefined) return borderRadius;
    switch (variant) {
      case 'text': return 4;
      case 'circle': return getDefaultHeight() / 2;
      case 'rect': return 0;
      case 'rounded': return theme.borderRadius?.md || 8;
      default: return 4;
    }
  };

  // Use different opacity ranges based on animation type
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: animationType === 'pulse' ? [0.5, 1] : [0.3, 1],
  });

  const styles = createStyles(theme);

  const skeletonStyle: ViewStyle = {
    width: variant === 'circle' ? getDefaultHeight() : width,
    height: getDefaultHeight(),
    borderRadius: getDefaultBorderRadius(),
    backgroundColor: theme.colors.surfaceSecondary,
    overflow: 'hidden',
  };

  return (
    <View style={[skeletonStyle, style]}>
      {animationType === 'shimmer' ? (
        <Animated.View style={[styles.shimmer, { opacity }]}>
          <LinearGradient
            colors={[
              theme.colors.surfaceSecondary,
              theme.colors.surface,
              theme.colors.surfaceSecondary,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} />
      )}
      {children}
    </View>
  );
};

// Skeleton Presets
export const SkeletonText: React.FC<{ lines?: number; style?: ViewStyle }> = ({
  lines = 3,
  style,
}) => {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? '70%' : '100%'}
          style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
        />
      ))}
    </View>
  );
};

export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <Skeleton variant="circle" height={48} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton variant="text" width="40%" height={14} />
        </View>
      </View>
      <SkeletonText lines={2} />
    </View>
  );
};

export const SkeletonList: React.FC<{ items?: number; style?: ViewStyle }> = ({
  items = 3,
  style,
}) => {
  return (
    <View style={style}>
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonCard
          key={index}
          style={{ marginBottom: index < items - 1 ? 12 : 0 }}
        />
      ))}
    </View>
  );
};

// Healthcare-Specific Presets (inspired by Epic MyChart and competitive analysis)

export const SkeletonPatientCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <Skeleton variant="circle" height={48} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={18} style={{ marginBottom: 6 }} />
          <Skeleton variant="text" width="40%" height={14} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Skeleton variant="rounded" width={80} height={24} />
        <Skeleton variant="rounded" width={100} height={24} />
      </View>
    </View>
  );
};

export const SkeletonAppointmentCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Skeleton variant="rounded" width={60} height={60} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Skeleton variant="text" width="80%" height={18} style={{ marginBottom: 6 }} />
          <Skeleton variant="text" width="50%" height={14} style={{ marginBottom: 4 }} />
          <Skeleton variant="text" width="60%" height={14} />
        </View>
      </View>
    </View>
  );
};

export const SkeletonVitalSigns: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        },
        style,
      ]}
    >
      {[1, 2, 3, 4].map((item) => (
        <View
          key={item}
          style={{
            width: '48%',
            backgroundColor: theme.colors.surface,
            borderRadius: 8,
            padding: 12,
            alignItems: 'center',
            marginBottom: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Skeleton variant="circle" width={40} height={40} />
          <Skeleton variant="text" width={60} height={12} style={{ marginTop: 8 }} />
          <Skeleton variant="text" width={80} height={20} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
};

export const SkeletonStatCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <Skeleton variant="text" width={100} height={14} />
      <Skeleton variant="text" width={60} height={32} style={{ marginTop: 8 }} />
      <Skeleton variant="rounded" width={80} height={20} style={{ marginTop: 8 }} />
    </View>
  );
};

export const SkeletonListItem: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        style,
      ]}
    >
      <Skeleton variant="circle" width={40} height={40} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Skeleton variant="text" width="70%" height={16} style={{ marginBottom: 6 }} />
        <Skeleton variant="text" width="50%" height={14} />
      </View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    shimmer: {
      ...StyleSheet.absoluteFillObject,
    },
  });
