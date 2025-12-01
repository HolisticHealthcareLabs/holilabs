/**
 * PermissionsScreen - Request necessary permissions with context
 *
 * Best Practices:
 * - Explain WHY each permission is needed (transparency)
 * - Show value before asking (Apple HIG guideline)
 * - Allow skipping non-critical permissions
 * - Progressive permission requests
 * - Visual indicators for granted permissions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { Button } from '@/shared/components';
import { HapticFeedback } from '@/services/haptics';
import { OnboardingStackParamList } from '../navigation/OnboardingNavigator';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import * as Notifications from 'expo-notifications';
import * as LocalAuthentication from 'expo-local-authentication';
import { Audio } from 'expo-av';

type PermissionsScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Permissions'>;
type PermissionsScreenRouteProp = RouteProp<OnboardingStackParamList, 'Permissions'>;

interface Permission {
  id: string;
  icon: string;
  title: string;
  description: string;
  required: boolean;
  granted: boolean;
  type: 'microphone' | 'notifications' | 'biometric';
}

export const PermissionsScreen = () => {
  const navigation = useNavigation<PermissionsScreenNavigationProp>();
  const route = useRoute<PermissionsScreenRouteProp>();
  const { theme } = useTheme();
  const { role } = route.params;

  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'microphone',
      icon: '🎙️',
      title: 'Microphone Access',
      description: 'Record patient consultations and generate AI-powered clinical notes',
      required: true,
      granted: false,
      type: 'microphone',
    },
    {
      id: 'notifications',
      icon: '🔔',
      title: 'Push Notifications',
      description: 'Receive alerts for urgent patient matters, appointments, and lab results',
      required: false,
      granted: false,
      type: 'notifications',
    },
    {
      id: 'biometric',
      icon: Platform.OS === 'ios' ? '🔐' : '👆',
      title: Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Biometric Authentication',
      description: 'Quick and secure access to patient records without entering password',
      required: false,
      granted: false,
      type: 'biometric',
    },
  ]);

  const [isProcessing, setIsProcessing] = useState(false);

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Microphone permission error:', error);
      return false;
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Notification permission error:', error);
      return false;
    }
  };

  const requestBiometricPermission = async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return false;
      }

      // Test biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to enable biometric login',
        fallbackLabel: 'Use passcode',
      });

      return result.success;
    } catch (error) {
      console.error('Biometric permission error:', error);
      return false;
    }
  };

  const requestPermission = async (permission: Permission) => {
    HapticFeedback.medium();
    setIsProcessing(true);

    try {
      let granted = false;

      switch (permission.type) {
        case 'microphone':
          granted = await requestMicrophonePermission();
          break;
        case 'notifications':
          granted = await requestNotificationPermission();
          break;
        case 'biometric':
          granted = await requestBiometricPermission();
          break;
      }

      if (granted) {
        await HapticFeedback.success();
      } else {
        await HapticFeedback.warning();
      }

      // Update permission state
      setPermissions((prev) =>
        prev.map((p) =>
          p.id === permission.id ? { ...p, granted } : p
        )
      );

      // Show feedback for denied critical permissions
      if (!granted && permission.required) {
        Alert.alert(
          'Permission Required',
          `${permission.title} is required for core functionality. Please enable it in Settings.`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // On iOS/Android, this would open app settings
              // For now, just show a message
              Alert.alert('Settings', 'Please go to Settings > Holi Labs to enable permissions');
            }},
          ]
        );
      }
    } catch (error) {
      await HapticFeedback.error();
      Alert.alert('Error', 'Failed to request permission. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = async () => {
    // Check if all required permissions are granted
    const requiredPermissions = permissions.filter((p) => p.required);
    const allRequiredGranted = requiredPermissions.every((p) => p.granted);

    if (!allRequiredGranted) {
      await HapticFeedback.warning();
      Alert.alert(
        'Required Permissions',
        'Microphone access is required to use voice recording features. Please grant the required permissions.',
        [{ text: 'OK' }]
      );
      return;
    }

    await HapticFeedback.success();

    // Navigate to completion screen
    navigation.navigate('Complete', {
      role,
      permissions: permissions.reduce((acc, p) => {
        acc[p.type] = p.granted;
        return acc;
      }, {} as Record<string, boolean>),
    });
  };

  const handleSkipOptional = () => {
    HapticFeedback.light();
    Alert.alert(
      'Skip Optional Permissions',
      'You can enable these permissions later in Settings. However, some features may be limited.',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Skip Anyway',
          style: 'destructive',
          onPress: async () => {
            // Check if microphone is granted (required)
            const micGranted = permissions.find((p) => p.id === 'microphone')?.granted;
            if (micGranted) {
              await handleContinue();
            } else {
              Alert.alert('Required', 'Microphone permission is required to continue.');
            }
          },
        },
      ]
    );
  };

  const allRequiredGranted = permissions
    .filter((p) => p.required)
    .every((p) => p.granted);

  const allGranted = permissions.every((p) => p.granted);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { backgroundColor: theme.colors.primary, width: '100%' }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            Step 3 of 3
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Enable key features
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            These permissions help you get the most out of Holi Labs
          </Text>
        </View>

        {/* Permissions List */}
        <View style={styles.permissionsContainer}>
          {permissions.map((permission) => (
            <AnimatedCard
              key={permission.id}
              style={[
                styles.permissionCard,
                { backgroundColor: theme.colors.surface },
                permission.granted && {
                  borderColor: theme.colors.success,
                  borderWidth: 2,
                },
              ]}
              onPress={
                permission.granted
                  ? undefined
                  : () => requestPermission(permission)
              }
            >
              {/* Icon and Badge */}
              <View style={styles.permissionHeader}>
                <Text style={styles.permissionIcon}>{permission.icon}</Text>
                {permission.granted && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.success }]}>
                    <Text style={styles.badgeText}>✓ Granted</Text>
                  </View>
                )}
                {permission.required && !permission.granted && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.warning }]}>
                    <Text style={styles.badgeText}>Required</Text>
                  </View>
                )}
              </View>

              {/* Content */}
              <View style={styles.permissionContent}>
                <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
                  {permission.title}
                </Text>
                <Text style={[styles.permissionDescription, { color: theme.colors.textSecondary }]}>
                  {permission.description}
                </Text>

                {/* Action Button */}
                {!permission.granted && (
                  <Button
                    title={`Enable ${permission.title}`}
                    onPress={() => requestPermission(permission)}
                    variant={permission.required ? 'primary' : 'outline'}
                    size="sm"
                    style={styles.permissionButton}
                    disabled={isProcessing}
                  />
                )}
              </View>
            </AnimatedCard>
          ))}
        </View>

        {/* Privacy Assurance */}
        <View style={[styles.privacyBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
          <Text style={styles.privacyIcon}>🛡️</Text>
          <View style={styles.privacyContent}>
            <Text style={[styles.privacyTitle, { color: theme.colors.text }]}>
              Your privacy is protected
            </Text>
            <Text style={[styles.privacyText, { color: theme.colors.textSecondary }]}>
              All permissions are used solely to provide healthcare features. We never access your data without your knowledge.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Buttons */}
      <View style={[styles.bottomContainer, { backgroundColor: theme.colors.background }]}>
        {allRequiredGranted && !allGranted && (
          <Button
            title="Skip Optional Permissions"
            onPress={handleSkipOptional}
            variant="ghost"
            fullWidth
            style={styles.skipButton}
          />
        )}
        <Button
          title={allGranted ? "Get Started" : "Continue"}
          onPress={handleContinue}
          fullWidth
          disabled={!allRequiredGranted}
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
    paddingBottom: 140,
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
  permissionsContainer: {
    gap: 16,
  },
  permissionCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  permissionIcon: {
    fontSize: 40,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionContent: {
    gap: 12,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  permissionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  permissionButton: {
    marginTop: 4,
  },
  privacyBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  privacyIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  privacyText: {
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
  skipButton: {
    marginBottom: 8,
  },
  button: {
    marginTop: 0,
  },
});
