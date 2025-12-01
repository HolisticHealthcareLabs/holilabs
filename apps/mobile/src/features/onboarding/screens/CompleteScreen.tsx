/**
 * CompleteScreen - Onboarding completion with celebration
 *
 * Best Practices:
 * - Celebrate the user's achievement (dopamine moment!)
 * - Show what they've unlocked
 * - Smooth transition to main app
 * - Optional: First-time user tips
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { Button } from '@/shared/components';
import { HapticFeedback } from '@/services/haptics';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { OnboardingStackParamList } from '../navigation/OnboardingNavigator';

type CompleteScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Complete'>;
type CompleteScreenRouteProp = RouteProp<OnboardingStackParamList, 'Complete'>;

const CELEBRATION_EMOJIS = ['🎉', '✨', '🎊', '⭐', '💫'];

export const CompleteScreen = () => {
  const navigation = useNavigation<CompleteScreenNavigationProp>();
  const route = useRoute<CompleteScreenRouteProp>();
  const { theme } = useTheme();
  const { role } = route.params;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const confettiAnims = useRef(
    CELEBRATION_EMOJIS.map(() => ({
      translateY: new Animated.Value(-100),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    // Trigger success haptic
    HapticFeedback.success();

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Confetti animation
    confettiAnims.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.parallel([
          Animated.timing(anim.translateY, {
            toValue: 800,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: 360 * 2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, []);

  const handleGetStarted = async () => {
    await HapticFeedback.medium();

    // Mark onboarding as complete (this will trigger navigation to Main in RootNavigator)
    const { completeOnboarding } = useOnboardingStore.getState();
    completeOnboarding({
      role,
      permissions: route.params.permissions,
      completedAt: new Date().toISOString(),
    });

    // Navigation will automatically update via RootNavigator watching isCompleted state
  };

  const getRoleWelcome = () => {
    const welcomes = {
      doctor: {
        title: "You're all set, Doctor!",
        subtitle: 'Start documenting consultations with AI-powered SOAP notes',
      },
      nurse: {
        title: "You're all set!",
        subtitle: 'Start recording patient vitals and managing care plans',
      },
      admin: {
        title: "You're all set!",
        subtitle: 'Start managing appointments and patient registrations',
      },
    };
    return welcomes[role as keyof typeof welcomes] || welcomes.doctor;
  };

  const welcome = getRoleWelcome();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Confetti */}
      {confettiAnims.map((anim, index) => (
        <Animated.Text
          key={index}
          style={[
            styles.confetti,
            {
              left: `${20 + index * 15}%`,
              transform: [
                { translateY: anim.translateY },
                {
                  rotate: anim.rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
              opacity: anim.opacity,
            },
          ]}
        >
          {CELEBRATION_EMOJIS[index]}
        </Animated.Text>
      ))}

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Success Icon */}
        <View style={[styles.successCircle, { backgroundColor: theme.colors.success }]}>
          <Text style={styles.successIcon}>✓</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {welcome.title}
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {welcome.subtitle}
        </Text>

        {/* Features Unlocked */}
        <View style={styles.featuresContainer}>
          <Text style={[styles.featuresTitle, { color: theme.colors.text }]}>
            What you can do now:
          </Text>

          <View style={styles.featuresList}>
            <FeatureItem
              icon="🎙️"
              text="Record and transcribe consultations"
              theme={theme}
            />
            <FeatureItem
              icon="📋"
              text="Generate AI-powered SOAP notes"
              theme={theme}
            />
            <FeatureItem
              icon="💊"
              text="Prescribe medications securely"
              theme={theme}
            />
            <FeatureItem
              icon="📊"
              text="View patient history and insights"
              theme={theme}
            />
          </View>
        </View>

        {/* Quick Tip */}
        <View style={[styles.tipBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
            <Text style={{ fontWeight: '600', color: theme.colors.text }}>Pro Tip: </Text>
            Tap the microphone button to start recording your first consultation.
            Speak naturally - our AI understands medical terminology!
          </Text>
        </View>
      </Animated.View>

      {/* Fixed Bottom Button */}
      <Animated.View
        style={[
          styles.bottomContainer,
          { backgroundColor: theme.colors.background, opacity: fadeAnim },
        ]}
      >
        <Button
          title="Start Using Holi Labs"
          onPress={handleGetStarted}
          fullWidth
          style={styles.button}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

// Feature Item Component
interface FeatureItemProps {
  icon: string;
  text: string;
  theme: any;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text, theme }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={[styles.featureText, { color: theme.colors.text }]}>
      {text}
    </Text>
    <View style={[styles.featureCheck, { backgroundColor: theme.colors.success }]}>
      <Text style={styles.featureCheckIcon}>✓</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  confetti: {
    position: 'absolute',
    fontSize: 32,
    top: 0,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
    paddingBottom: 100,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    // Shadow for depth
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  successIcon: {
    fontSize: 60,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCheckIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tipBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 'auto',
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  button: {
    marginTop: 0,
  },
});
