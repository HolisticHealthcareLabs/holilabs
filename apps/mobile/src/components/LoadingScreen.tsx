/**
 * LoadingScreen Component
 *
 * Full-screen loading indicator with white background.
 * Matches the native splash screen for a seamless transition.
 *
 * Used during app initialization while critical resources are loading.
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
}) => {
  return (
    <View style={styles.container}>
      {/* Logo/Brand */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>H</Text>
        </View>
        <Text style={styles.brandText}>Holi Labs</Text>
        <Text style={styles.taglineText}>AI Medical Scribe</Text>
      </View>

      {/* Loading Indicator */}
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#428CD4" />
        {message && <Text style={styles.messageText}>{message}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#428CD4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#428CD4',
  },
  brandText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#428CD4',
    marginBottom: 8,
  },
  taglineText: {
    fontSize: 18,
    color: '#666666',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  messageText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666666',
  },
});
