/**
 * ProfileSetupScreen - Collect essential user information
 *
 * Progressive disclosure: Only ask for what's necessary.
 * Smart defaults and validation.
 * Healthcare-appropriate data collection.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { Button, Input } from '@/shared/components';
import { HapticFeedback } from '@/services/haptics';
import { OnboardingStackParamList } from '../navigation/OnboardingNavigator';

type ProfileSetupScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'ProfileSetup'>;
type ProfileSetupScreenRouteProp = RouteProp<OnboardingStackParamList, 'ProfileSetup'>;

interface ProfileFormData {
  fullName: string;
  specialty: string;
  licenseNumber: string;
  institution: string;
}

// Specialty options by role
const DOCTOR_SPECIALTIES = [
  'Family Medicine',
  'Internal Medicine',
  'Pediatrics',
  'Cardiology',
  'Dermatology',
  'Psychiatry',
  'Surgery',
  'Emergency Medicine',
  'Other',
];

const NURSE_SPECIALTIES = [
  'Critical Care',
  'Emergency',
  'Pediatric',
  'Psychiatric',
  'Oncology',
  'Operating Room',
  'General Ward',
  'Other',
];

export const ProfileSetupScreen = () => {
  const navigation = useNavigation<ProfileSetupScreenNavigationProp>();
  const route = useRoute<ProfileSetupScreenRouteProp>();
  const { theme } = useTheme();
  const { role } = route.params;

  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    specialty: '',
    licenseNumber: '',
    institution: '',
  });

  const [errors, setErrors] = useState<Partial<ProfileFormData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const getRoleLabel = (role: string) => {
    const labels = {
      doctor: 'Doctor',
      nurse: 'Nurse',
      admin: 'Administrator',
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getSpecialties = () => {
    if (role === 'doctor') return DOCTOR_SPECIALTIES;
    if (role === 'nurse') return NURSE_SPECIALTIES;
    return [];
  };

  const validate = (): boolean => {
    const newErrors: Partial<ProfileFormData> = {};

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }

    // Specialty validation (only for doctor and nurse)
    if ((role === 'doctor' || role === 'nurse') && !formData.specialty.trim()) {
      newErrors.specialty = 'Specialty is required';
    }

    // License number validation (only for doctor and nurse)
    if ((role === 'doctor' || role === 'nurse')) {
      if (!formData.licenseNumber.trim()) {
        newErrors.licenseNumber = 'License number is required';
      } else if (formData.licenseNumber.trim().length < 4) {
        newErrors.licenseNumber = 'Invalid license number';
      }
    }

    // Institution validation
    if (!formData.institution.trim()) {
      newErrors.institution = 'Institution/Organization is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) {
      HapticFeedback.error();
      return;
    }

    HapticFeedback.medium();
    setIsLoading(true);

    try {
      // Simulate API call to save profile
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Navigate to permissions screen
      navigation.navigate('Permissions', {
        role,
        profile: formData,
      });
    } catch (error) {
      HapticFeedback.error();
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { backgroundColor: theme.colors.primary, width: '66%' }]} />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
              Step 2 of 3
            </Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Set up your profile
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              As a {getRoleLabel(role)}, we need a few details to personalize your experience
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <Input
              label="Full Name"
              placeholder="Dr. Jane Smith"
              value={formData.fullName}
              onChangeText={(value) => updateField('fullName', value)}
              error={errors.fullName}
              autoCapitalize="words"
              textContentType="name"
              autoComplete="name"
              required
            />

            {/* Specialty (Doctor/Nurse only) */}
            {(role === 'doctor' || role === 'nurse') && (
              <Input
                label="Specialty"
                placeholder={`Select your specialty`}
                value={formData.specialty}
                onChangeText={(value) => updateField('specialty', value)}
                error={errors.specialty}
                required
                helperText="This helps us provide relevant clinical insights"
              />
            )}

            {/* License Number (Doctor/Nurse only) */}
            {(role === 'doctor' || role === 'nurse') && (
              <Input
                label={role === 'doctor' ? 'Medical License Number' : 'RN License Number'}
                placeholder="e.g., 123456"
                value={formData.licenseNumber}
                onChangeText={(value) => updateField('licenseNumber', value)}
                error={errors.licenseNumber}
                autoCapitalize="characters"
                required
                secureTextEntry={false}
                helperText="Required for compliance and verification"
              />
            )}

            {/* Institution */}
            <Input
              label="Institution / Organization"
              placeholder="Hospital or Clinic Name"
              value={formData.institution}
              onChangeText={(value) => updateField('institution', value)}
              error={errors.institution}
              autoCapitalize="words"
              required
            />
          </View>

          {/* Privacy Notice */}
          <View style={[styles.privacyNotice, { backgroundColor: theme.colors.surfaceSecondary }]}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <Text style={[styles.privacyText, { color: theme.colors.textSecondary }]}>
              Your information is encrypted and HIPAA/LGPD compliant. We never share your data without consent.
            </Text>
          </View>
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View style={[styles.bottomContainer, { backgroundColor: theme.colors.background }]}>
          <Button
            title="Continue"
            onPress={handleContinue}
            loading={isLoading}
            fullWidth
            style={styles.button}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  privacyNotice: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  privacyIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
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
