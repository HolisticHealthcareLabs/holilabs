import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { Button, Card } from '@/shared/components';
import { useAuthStore } from '@/store/authStore';

export const ProfileScreen = () => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleThemeChange = () => {
    const modes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setThemeMode(nextMode);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Profile</Text>

        {/* User Info Card */}
        <Card style={styles.card}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Name</Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>{user?.name}</Text>

          <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
            Email
          </Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>{user?.email}</Text>

          <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
            Role
          </Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {user?.role?.toUpperCase()}
          </Text>
        </Card>

        {/* Settings Card */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Settings</Text>

          <Button
            title={`Theme: ${themeMode}`}
            onPress={handleThemeChange}
            variant="outline"
            fullWidth
            style={{ marginTop: theme.spacing.md }}
          />
        </Card>

        {/* Logout */}
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          fullWidth
          style={{ marginTop: theme.spacing.lg }}
        />

        <Text style={[styles.version, { color: theme.colors.textTertiary }]}>
          Version 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
    marginTop: 48,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '400',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 32,
    marginBottom: 24,
  },
});
