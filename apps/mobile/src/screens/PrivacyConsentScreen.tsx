/**
 * Privacy & Consent Screen (Mobile)
 * Allows patients to manage their consent preferences from mobile app
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { Card } from '../components/ui/Card';

interface ConsentType {
  id: string;
  name: string;
  description: string;
  required: boolean;
  category: string;
  icon: string;
}

interface ConsentStatus {
  consentType: ConsentType;
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  version: string;
}

interface PrivacyConsentScreenProps {
  patientId: string; // Pass from navigation params
}

export const PrivacyConsentScreen: React.FC<PrivacyConsentScreenProps> = ({
  patientId,
}) => {
  const { theme } = useTheme();
  const [consents, setConsents] = useState<ConsentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchConsents();
  }, []);

  const fetchConsents = async () => {
    try {
      // TODO: Replace with your actual API base URL
      const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(
        `${API_BASE}/api/consents?patientId=${patientId}`
      );
      const data = await response.json();

      if (data.success) {
        setConsents(data.consents);
      } else {
        Alert.alert('Error', 'Failed to load consent preferences');
      }
    } catch (error) {
      console.error('Error fetching consents:', error);
      Alert.alert('Error', 'Unable to load consent preferences');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleConsent = async (
    consentTypeId: string,
    currentValue: boolean,
    required: boolean
  ) => {
    if (required && currentValue) {
      Alert.alert(
        'Required Consent',
        'This consent is required to use the platform. It cannot be revoked.',
        [{ text: 'OK' }]
      );
      return;
    }

    const newValue = !currentValue;
    const action = newValue ? 'grant' : 'revoke';

    Alert.alert(
      `${newValue ? 'Grant' : 'Revoke'} Consent`,
      `Are you sure you want to ${action} this consent?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newValue ? 'Grant' : 'Revoke',
          style: newValue ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
              const response = await fetch(`${API_BASE}/api/consents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  patientId,
                  consentTypeId,
                  granted: newValue,
                }),
              });

              const data = await response.json();

              if (data.success) {
                // Refresh consents
                await fetchConsents();
                Alert.alert(
                  'Success',
                  `Consent ${newValue ? 'granted' : 'revoked'} successfully`
                );
              } else {
                Alert.alert('Error', data.error || 'Failed to update consent');
              }
            } catch (error) {
              console.error('Error updating consent:', error);
              Alert.alert('Error', 'Unable to update consent');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConsents();
  };

  const groupedConsents = consents.reduce((acc, consent) => {
    const category = consent.consentType.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(consent);
    return acc;
  }, {} as Record<string, ConsentStatus[]>);

  const styles = createStyles(theme);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading consent preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Privacy & Consent</Text>
        <Text style={styles.headerSubtitle}>
          Manage your data sharing preferences
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerIcon}>ℹ️</Text>
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>Your Privacy Matters</Text>
            <Text style={styles.infoBannerText}>
              You can grant or revoke consent at any time. Required consents are
              necessary for platform functionality.
            </Text>
          </View>
        </View>

        {/* Consent Categories */}
        {Object.entries(groupedConsents).map(([category, categoryConsents]) => (
          <View key={category} style={styles.section}>
            <Text style={styles.sectionTitle}>{category}</Text>

            {categoryConsents.map((consent) => (
              <Card key={consent.consentType.id} style={styles.consentCard}>
                <View style={styles.consentHeader}>
                  <Text style={styles.consentIcon}>
                    {consent.consentType.icon}
                  </Text>
                  <View style={styles.consentInfo}>
                    <View style={styles.consentTitleRow}>
                      <Text style={styles.consentTitle}>
                        {consent.consentType.name}
                      </Text>
                      {consent.consentType.required && (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredBadgeText}>Required</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.consentDescription}>
                      {consent.consentType.description}
                    </Text>

                    {consent.granted && consent.grantedAt && (
                      <Text style={styles.consentDate}>
                        Granted: {new Date(consent.grantedAt).toLocaleDateString()}
                      </Text>
                    )}
                    {!consent.granted && consent.revokedAt && (
                      <Text style={[styles.consentDate, { color: theme.colors.error }]}>
                        Revoked: {new Date(consent.revokedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <Switch
                    value={consent.granted}
                    onValueChange={() =>
                      handleToggleConsent(
                        consent.consentType.id,
                        consent.granted,
                        consent.consentType.required
                      )
                    }
                    disabled={consent.consentType.required && consent.granted}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primary,
                    }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </Card>
            ))}
          </View>
        ))}

        {/* HIPAA Notice */}
        <View style={styles.hipaaNotice}>
          <Text style={styles.hipaaTitle}>HIPAA Compliance Notice</Text>
          <Text style={styles.hipaaText}>
            All consent changes are logged and auditable. You can request a full
            access log of who has viewed your medical records at any time. This
            platform is fully compliant with HIPAA, GDPR, and LGPD regulations.
          </Text>
        </View>

        {/* Link to Web Portal */}
        <TouchableOpacity style={styles.webPortalButton}>
          <Text style={styles.webPortalIcon}>🌐</Text>
          <View style={styles.webPortalInfo}>
            <Text style={styles.webPortalTitle}>Advanced Privacy Settings</Text>
            <Text style={styles.webPortalSubtitle}>
              Visit the web portal for access logs and granular data sharing
            </Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: theme.spacing[3],
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    header: {
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing[1],
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: theme.spacing[4],
    },
    infoBanner: {
      flexDirection: 'row',
      backgroundColor: theme.colors.primaryLight,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing[3],
      marginBottom: theme.spacing[6],
    },
    infoBannerIcon: {
      fontSize: 24,
      marginRight: theme.spacing[3],
    },
    infoBannerContent: {
      flex: 1,
    },
    infoBannerTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
      marginBottom: theme.spacing[1],
    },
    infoBannerText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      lineHeight: 20,
    },
    section: {
      marginBottom: theme.spacing[6],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: theme.spacing[2],
      paddingHorizontal: theme.spacing[1],
    },
    consentCard: {
      marginBottom: theme.spacing[3],
    },
    consentHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    consentIcon: {
      fontSize: 28,
      marginRight: theme.spacing[3],
    },
    consentInfo: {
      flex: 1,
      marginRight: theme.spacing[3],
    },
    consentTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[1],
    },
    consentTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
      marginRight: theme.spacing[2],
    },
    requiredBadge: {
      backgroundColor: theme.colors.warning,
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[0.5],
      borderRadius: theme.borderRadius.full,
    },
    requiredBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: '#FFFFFF',
    },
    consentDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: theme.spacing[2],
    },
    consentDate: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
      fontStyle: 'italic',
    },
    hipaaNotice: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing[4],
      marginVertical: theme.spacing[6],
    },
    hipaaTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing[2],
    },
    hipaaText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    webPortalButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[6],
    },
    webPortalIcon: {
      fontSize: 24,
      marginRight: theme.spacing[3],
    },
    webPortalInfo: {
      flex: 1,
    },
    webPortalTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing[1],
    },
    webPortalSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    settingArrow: {
      fontSize: 24,
      color: theme.colors.textTertiary,
      marginLeft: theme.spacing[2],
    },
  });
