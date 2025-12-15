/**
 * WelcomeScreen - First screen of onboarding flow
 *
 * Shows app benefits and healthcare-appropriate messaging.
 * Inspired by Epic MyChart and Zocdoc onboarding.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { Button } from '@/shared/components';
import { HapticFeedback } from '@/services/haptics';
import { OnboardingStackParamList } from '../navigation/OnboardingNavigator';
import { AnimatedCard } from '@/components/ui/AnimatedCard';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

const BENEFITS = [
  {
    icon: '🎙️',
    title: 'Voice-Powered Documentation',
    description: 'Speak naturally during consultations. AI transcribes and generates SOAP notes automatically.',
  },
  {
    icon: '⚡',
    title: 'Save Hours Every Day',
    description: 'Reduce documentation time by up to 70%. Spend more time with patients, less time typing.',
  },
  {
    icon: '🔒',
    title: 'HIPAA & LGPD Compliant',
    description: 'Bank-level security with end-to-end encryption. Your patient data is always protected.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Insights',
    description: 'Get clinical decision support, drug interaction warnings, and smart recommendations.',
  },
];

export const WelcomeScreen = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const { theme } = useTheme();

  const handleContinue = () => {
    HapticFeedback.medium();
    navigation.navigate('RoleSelection');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.logo, { borderColor: theme.colors.primary }]}>
            <Text style={styles.logoText}>H</Text>
          </View>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            Welcome to Holi Labs
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Your AI Medical Scribe Assistant
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          {BENEFITS.map((benefit, index) => (
            <AnimatedCard
              key={index}
              style={[styles.benefitCard, { backgroundColor: theme.colors.surface } as const]}
            >
              <Text style={styles.benefitIcon}>{benefit.icon}</Text>
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitTitle, { color: theme.colors.text }]}>
                  {benefit.title}
                </Text>
                <Text style={[styles.benefitDescription, { color: theme.colors.textSecondary }]}>
                  {benefit.description}
                </Text>
              </View>
            </AnimatedCard>
          ))}
        </View>

        {/* Trusted by */}
        <View style={styles.trustedContainer}>
          <Text style={[styles.trustedText, { color: theme.colors.textTertiary }]}>
            Trusted by over 1,000+ healthcare professionals
          </Text>
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={[styles.bottomContainer, { backgroundColor: theme.colors.background }]}>
        <Button
          title="Get Started"
          onPress={handleContinue}
          fullWidth
          style={styles.button}
        />
        <Text style={[styles.termsText, { color: theme.colors.textTertiary }]}>
          By continuing, you agree to our{' '}
          <Text style={{ color: theme.colors.primary }}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={{ color: theme.colors.primary }}>Privacy Policy</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 140, // Space for fixed button
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#428CD4',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  benefitsContainer: {
    gap: 16,
  },
  benefitCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
  },
  benefitIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  trustedContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  trustedText: {
    fontSize: 12,
    textAlign: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 34, // iOS safe area
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  button: {
    marginBottom: 12,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
