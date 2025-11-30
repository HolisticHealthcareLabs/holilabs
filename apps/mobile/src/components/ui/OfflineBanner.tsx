/**
 * Offline Banner Component
 * Shows network status and pending sync count
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useOfflineSync } from '../../hooks/useOfflineSync';

export const OfflineBanner: React.FC = () => {
  const { theme } = useTheme();
  const { isOnline, pendingSyncCount, syncNow, isSyncing } = useOfflineSync();

  // Don't show banner if online and no pending syncs
  if (isOnline && pendingSyncCount === 0) {
    return null;
  }

  const styles = createStyles(theme);

  return (
    <View
      style={[
        styles.container,
        isOnline ? styles.containerSyncing : styles.containerOffline,
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{isOnline ? '🔄' : '📡'}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isOnline
              ? pendingSyncCount > 0
                ? `${pendingSyncCount} change${pendingSyncCount > 1 ? 's' : ''} pending sync`
                : 'All changes synced'
              : 'You are offline'}
          </Text>
          <Text style={styles.subtitle}>
            {isOnline
              ? pendingSyncCount > 0
                ? 'Tap to sync now'
                : 'Working in offline mode'
              : 'Changes will sync when connection is restored'}
          </Text>
        </View>
      </View>

      {isOnline && pendingSyncCount > 0 && (
        <TouchableOpacity
          onPress={syncNow}
          disabled={isSyncing}
          style={styles.syncButton}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.syncButtonText}>Sync</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    containerOffline: {
      backgroundColor: theme.colors.warningLight,
    },
    containerSyncing: {
      backgroundColor: theme.colors.infoLight,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    icon: {
      fontSize: 20,
      marginRight: theme.spacing[3],
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    syncButton: {
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[2],
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      minWidth: 60,
      alignItems: 'center',
    },
    syncButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: '#FFFFFF',
    },
  });
