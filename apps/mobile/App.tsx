import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useOnboardingStore } from './src/stores/onboardingStore';
import { ThemeProvider } from './src/shared/contexts/ThemeContext';
import {
  queryClient,
  asyncStoragePersister,
  NetworkStatusManager,
  SyncQueueManager,
} from './src/config/queryClient';
import { NotificationService } from './src/services/notificationService';
import { AnalyticsService } from './src/services/analyticsService';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { LoadingScreen } from './src/components/LoadingScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const authHasHydrated = useAuthStore((state) => state._hasHydrated);
  const onboardingHasHydrated = useOnboardingStore((state) => state._hasHydrated);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const [isReady, setIsReady] = useState(false);

  // Initialize offline sync system, notifications, analytics, and auth
  useEffect(() => {
    const initialize = async () => {
      try {
        // Wait for store hydration
        if (!authHasHydrated || !onboardingHasHydrated) {
          return;
        }

        // Initialize network status monitoring
        NetworkStatusManager.initialize();

        // Initialize sync queue
        await SyncQueueManager.initialize();

        // Initialize push notifications
        const pushToken = await NotificationService.initialize();
        if (pushToken) {
          console.log('Push token:', pushToken);
          // TODO: Send push token to backend for registration
        }

        // Initialize analytics
        await AnalyticsService.initialize();

        // Initialize auth
        await initializeAuth();

        // Smooth transition delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        setIsReady(true);

        // Hide splash screen
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('App initialization error:', error);
        // Still set ready to true to prevent infinite loading
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      NotificationService.cleanup();
      AnalyticsService.flushEvents();
    };
  }, [authHasHydrated, onboardingHasHydrated, initializeAuth]);

  if (!authHasHydrated || !onboardingHasHydrated || !isReady) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister }}
        >
          <ThemeProvider>
            <SafeAreaProvider>
              <RootNavigator />
              <StatusBar style="auto" />
            </SafeAreaProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
