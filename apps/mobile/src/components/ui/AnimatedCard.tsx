/**
 * Animated Card Component
 * Premium card with spring-based interactions inspired by top healthcare apps
 *
 * Features:
 * - Spring physics for natural feel (Zocdoc-style)
 * - Haptic feedback on press
 * - Smooth scale animations
 * - Elevation changes on interaction
 * - Accessible and performant
 */

import React, { useCallback } from 'react';
import {
  StyleSheet,
  ViewStyle,
  Platform,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { useAccessibility } from '../../hooks/useAccessibility';
import { HapticFeedback } from '@/services/haptics';

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;

  // Animation configuration
  scaleOnPress?: boolean;
  elevateOnPress?: boolean;
  hapticFeedback?: boolean;

  // Spring configuration (based on competitive analysis)
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };

  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  onPress,
  style,
  disabled = false,
  scaleOnPress = true,
  elevateOnPress = true,
  hapticFeedback = true,
  springConfig = {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
}) => {
  const { theme } = useTheme();
  const { shouldReduceMotion } = useAccessibility();

  // Animation values
  const scale = useSharedValue(1);
  const elevation = useSharedValue(0);

  // Disable animations if user prefers reduced motion
  const reduceMotion = shouldReduceMotion();

  const handlePressIn = useCallback(() => {
    if (disabled) return;

    // Haptic feedback using enhanced haptics service
    if (hapticFeedback) {
      HapticFeedback.light();
    }

    if (reduceMotion) {
      // Instant scale for reduced motion preference
      scale.value = scaleOnPress ? 0.95 : 1;
      elevation.value = elevateOnPress ? 1 : 0;
    } else {
      // Spring-based animation for natural feel
      scale.value = withSpring(
        scaleOnPress ? 0.95 : 1,
        springConfig
      );

      elevation.value = withTiming(elevateOnPress ? 1 : 0, {
        duration: 150,
      });
    }
  }, [
    disabled,
    hapticFeedback,
    scaleOnPress,
    elevateOnPress,
    reduceMotion,
    springConfig,
  ]);

  const handlePressOut = useCallback(() => {
    if (disabled) return;

    if (reduceMotion) {
      // Instant return for reduced motion
      scale.value = 1;
      elevation.value = 0;
    } else {
      // Spring back with slightly more bounce
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 180,
        mass: 1,
      });

      elevation.value = withTiming(0, {
        duration: 200,
      });
    }
  }, [disabled, reduceMotion]);

  const handlePress = useCallback(() => {
    if (disabled || !onPress) return;
    onPress();
  }, [disabled, onPress]);

  // Animated style for scale
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  // Animated style for elevation/shadow
  const animatedShadowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      elevation.value,
      [0, 1],
      [0.1, 0.25],
      Extrapolate.CLAMP
    );

    const shadowRadius = interpolate(
      elevation.value,
      [0, 1],
      [4, 12],
      Extrapolate.CLAMP
    );

    const shadowOffset = {
      height: interpolate(
        elevation.value,
        [0, 1],
        [2, 8],
        Extrapolate.CLAMP
      ),
    };

    if (Platform.OS === 'ios') {
      return {
        shadowColor: '#000000',
        shadowOffset: {
          width: 0,
          height: shadowOffset.height,
        },
        shadowOpacity,
        shadowRadius,
      };
    } else {
      // Android elevation
      return {
        elevation: interpolate(
          elevation.value,
          [0, 1],
          [2, 8],
          Extrapolate.CLAMP
        ),
      };
    }
  });

  const styles = createStyles(theme);

  // If no onPress, render as static card
  if (!onPress) {
    return (
      <Animated.View style={[styles.card, style, animatedShadowStyle]}>
        {children}
      </Animated.View>
    );
  }

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled }}
    >
      <Animated.View
        style={[
          styles.card,
          style,
          animatedStyle,
          animatedShadowStyle,
          disabled && styles.disabled,
        ]}
      >
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[4],

      // Base shadow (iOS)
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,

      // Base elevation (Android)
      elevation: 2,
    },
    disabled: {
      opacity: 0.6,
    },
  });
