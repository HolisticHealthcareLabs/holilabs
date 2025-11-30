import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { ThemeProvider } from './src/shared/contexts/ThemeContext';
import {
  queryClient,
  asyncStoragePersister,
  NetworkStatusManager,
  SyncQueueManager,
} from './src/config/queryClient';
import { NotificationService } from './src/services/notificationService';

export default function App() {
  const isHydrated = useAuthStore((state) => state._hasHydrated);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const [isReady, setIsReady] = useState(false);

  // Initialize offline sync system, notifications, and auth
  useEffect(() => {
    const initialize = async () => {
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

      // Initialize auth
      if (isHydrated) {
        initializeAuth();
      }

      setIsReady(true);
    };

    initialize();

    // Cleanup on unmount
    return () => {
      NotificationService.cleanup();
    };
  }, [isHydrated, initializeAuth]);

  if (!isHydrated || !isReady) {
    return null; // Or a splash screen
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
