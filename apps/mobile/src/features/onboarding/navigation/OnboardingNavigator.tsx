/**
 * OnboardingNavigator - Navigation flow for first-time users
 *
 * Flow: Welcome → Role Selection → Profile Setup → Permissions → Complete
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { RoleSelectionScreen } from '../screens/RoleSelectionScreen';
import { ProfileSetupScreen } from '../screens/ProfileSetupScreen';
import { PermissionsScreen } from '../screens/PermissionsScreen';
import { CompleteScreen } from '../screens/CompleteScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  RoleSelection: undefined;
  ProfileSetup: {
    role: 'doctor' | 'nurse' | 'admin';
  };
  Permissions: {
    role: 'doctor' | 'nurse' | 'admin';
    profile: {
      fullName: string;
      specialty: string;
      licenseNumber: string;
      institution: string;
    };
  };
  Complete: {
    role: 'doctor' | 'nurse' | 'admin';
    permissions?: {
      microphone: boolean;
      notifications: boolean;
      biometric: boolean;
    };
  };
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false, // Prevent swiping back during onboarding
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
      <Stack.Screen
        name="Complete"
        component={CompleteScreen}
        options={{
          gestureEnabled: false, // Can't go back from completion
        }}
      />
    </Stack.Navigator>
  );
};
