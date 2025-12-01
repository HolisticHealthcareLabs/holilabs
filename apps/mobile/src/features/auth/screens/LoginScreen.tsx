import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { Button, Input, Card } from '@/shared/components';
import { useAuthStore } from '@/store/authStore';
import { handleApiError } from '@/shared/services/api';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { HapticFeedback } from '@/services/haptics';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { theme } = useTheme();
  const signIn = useAuthStore((state) => state.signIn);
  const biometric = useBiometricAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Auto-fill email if biometric is enabled
  useEffect(() => {
    if (biometric.isEnabled && biometric.storedEmail) {
      setEmail(biometric.storedEmail);
    }
  }, [biometric.isEnabled, biometric.storedEmail]);

  // Attempt biometric auth on mount if enabled
  useEffect(() => {
    const attemptBiometricAuth = async () => {
      if (biometric.isEnabled && !biometric.isLoading) {
        // Small delay to let the screen render
        setTimeout(() => {
          handleBiometricLogin();
        }, 500);
      }
    };

    attemptBiometricAuth();
  }, [biometric.isEnabled, biometric.isLoading]);

  const handleLogin = async (skipBiometricPrompt = false) => {
    if (!email || !password) {
      await HapticFeedback.error();
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      await HapticFeedback.success();

      // Prompt to enable biometric auth if available and not already enabled
      if (
        !skipBiometricPrompt &&
        !biometric.isEnabled &&
        biometric.capabilities?.isAvailable
      ) {
        setTimeout(() => {
          Alert.alert(
            `Enable ${biometric.biometricTypeName}?`,
            `Sign in faster next time using ${biometric.biometricTypeName}`,
            [
              {
                text: 'Not Now',
                style: 'cancel',
                onPress: () => HapticFeedback.light(),
              },
              {
                text: 'Enable',
                onPress: async () => {
                  const success = await biometric.enable(email, password);
                  if (success) {
                    await HapticFeedback.success();
                    Alert.alert(
                      'Success',
                      `${biometric.biometricTypeName} enabled for faster sign in`
                    );
                  } else {
                    await HapticFeedback.error();
                  }
                },
              },
            ]
          );
        }, 500);
      }
    } catch (error) {
      await HapticFeedback.error();
      Alert.alert('Login Failed', handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometric.isEnabled) return;

    setLoading(true);
    try {
      const result = await biometric.authenticate();

      if (result.success && result.email && result.password) {
        // Sign in with stored credentials
        await signIn(result.email, result.password);
        // Success haptic is handled by biometric service
      } else if (result.error) {
        // Only show error if it's not a user cancellation
        if (!result.error.includes('cancel')) {
          await HapticFeedback.error();
          Alert.alert('Authentication Failed', result.error);
        }
      }
    } catch (error) {
      await HapticFeedback.error();
      Alert.alert('Authentication Failed', handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo/Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.primaryDark }]}>
              Holi Labs
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              AI Medical Scribe
            </Text>
          </View>

          {/* Login Form */}
          <Card style={styles.card}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="doctor@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              textContentType="password"
              rightIcon={<Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <Button
              title="Sign In"
              onPress={() => handleLogin()}
              loading={loading}
              fullWidth
              style={{ marginTop: theme.spacing.md }}
            />

            {/* Biometric Auth Button */}
            {biometric.isEnabled && biometric.capabilities?.isAvailable && (
              <TouchableOpacity
                onPress={handleBiometricLogin}
                disabled={loading}
                style={[styles.biometricButton, { borderColor: theme.colors.border }]}
                accessibilityLabel={`Sign in with ${biometric.biometricTypeName}`}
                accessibilityRole="button"
              >
                <Text style={[styles.biometricIcon]}>
                  {biometric.biometricTypeName.includes('Face') ? '🔐' : '👆'}
                </Text>
                <Text style={[styles.biometricText, { color: theme.colors.primary }]}>
                  Sign in with {biometric.biometricTypeName}
                </Text>
              </TouchableOpacity>
            )}

            <Button
              title="Create Account"
              onPress={() => {
                HapticFeedback.light();
                navigation.navigate('Register');
              }}
              variant="ghost"
              fullWidth
              style={{ marginTop: theme.spacing.sm }}
            />
          </Card>

          {/* Demo Credentials */}
          <Text style={[styles.demoText, { color: theme.colors.textTertiary }]}>
            Demo: doctor@holilabs.com / password123
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
  },
  card: {
    marginBottom: 24,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '600',
  },
  demoText: {
    textAlign: 'center',
    fontSize: 12,
  },
});
