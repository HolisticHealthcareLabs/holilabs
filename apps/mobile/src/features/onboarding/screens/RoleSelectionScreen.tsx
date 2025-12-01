/**
 * RoleSelectionScreen - Role selection during onboarding
 *
 * Allows users to select their role: Doctor, Nurse, or Admin.
 * Tailors the app experience based on role.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { Button } from '@/shared/components';
import { HapticFeedback } from '@/services/haptics';
import { OnboardingStackParamList } from '../navigation/OnboardingNavigator';

type RoleSelectionScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'RoleSelection'>;

type Role = 'doctor' | 'nurse' | 'admin';

interface RoleOption {
  value: Role;
  label: string;
  icon: string;
  description: string;
  features: string[];
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'doctor',
    label: 'Doctor / Physician',
    icon: '👨‍⚕️',
    description: 'Primary care provider or specialist',
    features: [
      'Voice-powered SOAP notes',
      'Prescription management',
      'Clinical decision support',
      'Telemedicine consultations',
    ],
  },
  {
    value: 'nurse',
    label: 'Nurse / Practitioner',
    icon: '👩‍⚕️',
    description: 'Registered nurse or nurse practitioner',
    features: [
      'Patient vital sign recording',
      'Care plan documentation',
      'Medication administration',
      'Patient communication',
    ],
  },
  {
    value: 'admin',
    label: 'Administrator',
    icon: '💼',
    description: 'Office manager or administrative staff',
    features: [
      'Appointment scheduling',
      'Patient registration',
      'Billing and insurance',
      'Analytics and reports',
    ],
  },
];

export const RoleSelectionScreen = () => {
  const navigation = useNavigation<RoleSelectionScreenNavigationProp>();
  const { theme } = useTheme();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleRoleSelect = (role: Role) => {
    HapticFeedback.selection();
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (!selectedRole) {
      HapticFeedback.warning();
      return;
    }

    HapticFeedback.medium();
    navigation.navigate('ProfileSetup', { role: selectedRole });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            What's your role?
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Help us personalize your experience
          </Text>
        </View>

        {/* Role Options */}
        <View style={styles.rolesContainer}>
          {ROLE_OPTIONS.map((option) => {
            const isSelected = selectedRole === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleRoleSelect(option.value)}
                style={[
                  styles.roleCard,
                  { backgroundColor: theme.colors.surface },
                  isSelected && {
                    borderColor: theme.colors.primary,
                    borderWidth: 2,
                  },
                ]}
                activeOpacity={0.7}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.checkmarkIcon}>✓</Text>
                  </View>
                )}

                {/* Icon */}
                <Text style={styles.roleIcon}>{option.icon}</Text>

                {/* Content */}
                <View style={styles.roleContent}>
                  <Text style={[styles.roleLabel, { color: theme.colors.text }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.roleDescription, { color: theme.colors.textSecondary }]}>
                    {option.description}
                  </Text>

                  {/* Features */}
                  <View style={styles.featuresContainer}>
                    {option.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Text style={[styles.featureBullet, { color: theme.colors.primary }]}>
                          •
                        </Text>
                        <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={[styles.bottomContainer, { backgroundColor: theme.colors.background }]}>
        <Button
          title="Continue"
          onPress={handleContinue}
          fullWidth
          disabled={!selectedRole}
          style={styles.button}
        />
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
    paddingBottom: 100, // Space for fixed button
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  rolesContainer: {
    gap: 16,
  },
  roleCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    position: 'relative',
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  roleIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  roleContent: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  featuresContainer: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureBullet: {
    fontSize: 16,
    marginRight: 8,
    marginTop: -2,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
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
    marginTop: 0,
  },
});
