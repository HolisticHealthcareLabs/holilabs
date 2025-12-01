import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { OnboardingNavigator } from '@/features/onboarding';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { linking } from './linking';

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isOnboardingComplete = useOnboardingStore((state) => state.isCompleted);
  const { theme } = useTheme();

  // Determine which screen to show
  // Priority: Auth -> Onboarding -> Main
  const getInitialScreen = () => {
    if (!isAuthenticated) {
      return 'Auth';
    }
    if (!isOnboardingComplete) {
      return 'Onboarding';
    }
    return 'Main';
  };

  return (
    <NavigationContainer
      linking={linking}
      theme={{
        dark: theme.isDark,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.error,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={getInitialScreen()}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !isOnboardingComplete ? (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingNavigator}
            options={{
              gestureEnabled: false, // Prevent swiping back during onboarding
            }}
          />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
