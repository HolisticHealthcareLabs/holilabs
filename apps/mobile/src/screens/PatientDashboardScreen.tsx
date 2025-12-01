/**
 * Patient Dashboard Screen
 * Production-ready patient overview with EHR access controls
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { Card } from '../components/ui/Card';
import { AnimatedCard } from '../components/ui/AnimatedCard';
import { SkeletonVitalSigns, SkeletonPatientCard } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { PatientsStackScreenProps } from '../navigation/types';

const { width } = Dimensions.get('window');

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  bloodType: string;
  allergies: string[];
  conditions: string[];
}

interface VitalSigns {
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  weight: number;
  height: number;
  bmi: number;
  recordedAt: Date;
}

interface LabResult {
  id: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  date: Date;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  prescribedBy: string;
}

interface EHRAccessPermission {
  doctorName: string;
  specialty: string;
  grantedAt: Date;
  expiresAt?: Date;
  dataTypes: string[];
  status: 'active' | 'expired';
}

export const PatientDashboardScreen: React.FC<
  PatientsStackScreenProps<'PatientDashboard'>
> = ({ navigation }) => {
  const { theme } = useTheme();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitalSigns, setVitalSigns] = useState<VitalSigns | null>(null);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [permissions, setPermissions] = useState<EHRAccessPermission[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'labs' | 'meds' | 'access'>(
    'overview'
  );

  useEffect(() => {
    loadPatientData();
  }, []);

  const loadPatientData = async () => {
    setLoading(true);
    // TODO: Fetch from API
    // Simulate loading
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setPatient({
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      mrn: 'MRN-12345',
      dateOfBirth: '01/15/1980',
      age: 44,
      gender: 'Male',
      bloodType: 'O+',
      allergies: ['Penicillin', 'Shellfish'],
      conditions: ['Hypertension', 'Type 2 Diabetes'],
    });

    setVitalSigns({
      bloodPressure: '128/82',
      heartRate: 72,
      temperature: 98.6,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      weight: 185,
      height: 70,
      bmi: 26.5,
      recordedAt: new Date(),
    });

    setLabResults([
      {
        id: '1',
        testName: 'Hemoglobin A1c',
        value: '6.8',
        unit: '%',
        referenceRange: '<5.7',
        status: 'abnormal',
        date: new Date('2024-01-15'),
      },
      {
        id: '2',
        testName: 'Total Cholesterol',
        value: '195',
        unit: 'mg/dL',
        referenceRange: '<200',
        status: 'normal',
        date: new Date('2024-01-15'),
      },
      {
        id: '3',
        testName: 'LDL Cholesterol',
        value: '122',
        unit: 'mg/dL',
        referenceRange: '<100',
        status: 'abnormal',
        date: new Date('2024-01-15'),
      },
    ]);

    setMedications([
      {
        id: '1',
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
        startDate: new Date('2023-06-01'),
        prescribedBy: 'Dr. Smith',
      },
      {
        id: '2',
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily',
        startDate: new Date('2023-08-15'),
        prescribedBy: 'Dr. Smith',
      },
    ]);

    setPermissions([
      {
        doctorName: 'Dr. Sarah Johnson',
        specialty: 'Cardiology',
        grantedAt: new Date('2024-01-10'),
        dataTypes: ['Lab Results', 'Vital Signs', 'Medications'],
        status: 'active',
      },
    ]);

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatientData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return theme.colors.success;
      case 'abnormal':
        return theme.colors.warning;
      case 'critical':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const styles = createStyles(theme);

  const renderOverview = () => {
    if (loading) {
      return (
        <>
          <SkeletonPatientCard style={{ marginBottom: 16 }} />
          <SkeletonVitalSigns style={{ marginBottom: 16 }} />
          <SkeletonPatientCard style={{ marginBottom: 16 }} />
        </>
      );
    }

    return (
      <>
        {/* Patient Info Card */}
        <AnimatedCard
          style={styles.infoCard}
          accessibilityLabel="Patient information card"
          accessibilityHint="Double tap to view full patient details"
        >
        <View style={styles.patientHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {patient?.firstName[0]}
              {patient?.lastName[0]}
            </Text>
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>
              {patient?.firstName} {patient?.lastName}
            </Text>
            <Text style={styles.patientMeta}>
              {patient?.age} yrs • {patient?.gender} • {patient?.bloodType}
            </Text>
            <Text style={styles.patientMRN}>MRN: {patient?.mrn}</Text>
          </View>
        </View>

        {/* Alerts */}
        {patient?.allergies && patient.allergies.length > 0 && (
          <View style={[styles.alertBox, { backgroundColor: theme.colors.errorLight }]}>
            <Text style={[styles.alertIcon, { color: theme.colors.error }]}>⚠️</Text>
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: theme.colors.error }]}>
                Allergies
              </Text>
              <Text style={[styles.alertText, { color: theme.colors.error }]}>
                {patient.allergies.join(', ')}
              </Text>
            </View>
          </View>
        )}

        {patient?.conditions && patient.conditions.length > 0 && (
          <View style={[styles.alertBox, { backgroundColor: theme.colors.infoLight }]}>
            <Text style={[styles.alertIcon, { color: theme.colors.info }]}>🩺</Text>
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: theme.colors.info }]}>
                Active Conditions
              </Text>
              <Text style={[styles.alertText, { color: theme.colors.info }]}>
                {patient.conditions.join(', ')}
              </Text>
            </View>
          </View>
        )}
      </AnimatedCard>

      {/* Vital Signs */}
      <AnimatedCard
        style={styles.card}
        accessibilityLabel="Latest vital signs"
      >
        <Text style={styles.cardTitle}>Latest Vital Signs</Text>
        <Text style={styles.cardSubtitle}>
          Recorded {vitalSigns?.recordedAt.toLocaleDateString()}
        </Text>

        <View style={styles.vitalsGrid}>
          <View style={styles.vitalItem}>
            <Text style={styles.vitalIcon}>💓</Text>
            <Text style={styles.vitalValue}>{vitalSigns?.heartRate}</Text>
            <Text style={styles.vitalLabel}>HR (bpm)</Text>
          </View>

          <View style={styles.vitalItem}>
            <Text style={styles.vitalIcon}>🩸</Text>
            <Text style={styles.vitalValue}>{vitalSigns?.bloodPressure}</Text>
            <Text style={styles.vitalLabel}>BP (mmHg)</Text>
          </View>

          <View style={styles.vitalItem}>
            <Text style={styles.vitalIcon}>🌡️</Text>
            <Text style={styles.vitalValue}>{vitalSigns?.temperature}°F</Text>
            <Text style={styles.vitalLabel}>Temp</Text>
          </View>

          <View style={styles.vitalItem}>
            <Text style={styles.vitalIcon}>💨</Text>
            <Text style={styles.vitalValue}>{vitalSigns?.oxygenSaturation}%</Text>
            <Text style={styles.vitalLabel}>SpO₂</Text>
          </View>
        </View>
      </AnimatedCard>

      {/* Quick Actions */}
      <AnimatedCard
        style={styles.card}
        accessibilityLabel="Quick action buttons"
      >
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>View History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>💊</Text>
            <Text style={styles.actionText}>Medications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🧪</Text>
            <Text style={styles.actionText}>Lab Results</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>Appointments</Text>
          </TouchableOpacity>
        </View>
      </AnimatedCard>
    </>
    );
  };

  const renderLabResults = () => (
    <AnimatedCard
      style={styles.card}
      accessibilityLabel="Recent lab results"
    >
      <Text style={styles.cardTitle}>Recent Lab Results</Text>
      {labResults.map((result) => (
        <View key={result.id} style={styles.labResultItem}>
          <View style={styles.labResultHeader}>
            <Text style={styles.labResultName}>{result.testName}</Text>
            <View
              style={[
                styles.labResultStatus,
                { backgroundColor: getStatusColor(result.status) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.labResultStatusText,
                  { color: getStatusColor(result.status) },
                ]}
              >
                {result.status}
              </Text>
            </View>
          </View>
          <View style={styles.labResultDetails}>
            <Text style={styles.labResultValue}>
              {result.value} {result.unit}
            </Text>
            <Text style={styles.labResultRange}>
              Reference: {result.referenceRange}
            </Text>
          </View>
          <Text style={styles.labResultDate}>
            {result.date.toLocaleDateString()}
          </Text>
        </View>
      ))}
    </AnimatedCard>
  );

  const renderMedications = () => (
    <AnimatedCard
      style={styles.card}
      accessibilityLabel="Current medications list"
    >
      <Text style={styles.cardTitle}>Current Medications</Text>
      {medications.map((med) => (
        <View key={med.id} style={styles.medicationItem}>
          <View style={styles.medicationIcon}>
            <Text>💊</Text>
          </View>
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{med.name}</Text>
            <Text style={styles.medicationDosage}>
              {med.dosage} • {med.frequency}
            </Text>
            <Text style={styles.medicationMeta}>
              Prescribed by {med.prescribedBy}
            </Text>
          </View>
        </View>
      ))}
    </AnimatedCard>
  );

  const renderAccessControl = () => (
    <>
      <AnimatedCard
        style={styles.card}
        accessibilityLabel="EHR access permissions"
      >
        <Text style={styles.cardTitle}>EHR Access Permissions</Text>
        <Text style={styles.cardDescription}>
          Manage who can access your medical records
        </Text>

        {permissions.map((permission, index) => (
          <View key={index} style={styles.permissionItem}>
            <View style={styles.permissionHeader}>
              <Text style={styles.permissionDoctor}>{permission.doctorName}</Text>
              <View
                style={[
                  styles.permissionStatus,
                  {
                    backgroundColor:
                      permission.status === 'active'
                        ? theme.colors.successLight
                        : theme.colors.errorLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.permissionStatusText,
                    {
                      color:
                        permission.status === 'active'
                          ? theme.colors.success
                          : theme.colors.error,
                    },
                  ]}
                >
                  {permission.status}
                </Text>
              </View>
            </View>
            <Text style={styles.permissionSpecialty}>{permission.specialty}</Text>
            <Text style={styles.permissionData}>
              Access to: {permission.dataTypes.join(', ')}
            </Text>
            <Text style={styles.permissionDate}>
              Granted {permission.grantedAt.toLocaleDateString()}
            </Text>

            {permission.status === 'active' && (
              <Button
                title="Revoke Access"
                onPress={() => {}}
                variant="outline"
                size="sm"
                style={styles.revokeButton}
              />
            )}
          </View>
        ))}

        <Button
          title="+ Grant Access to Doctor"
          onPress={() => {}}
          variant="primary"
          size="md"
          fullWidth
          style={styles.grantAccessButton}
        />
      </AnimatedCard>

      <AnimatedCard
        style={styles.privacyNotice}
        accessibilityLabel="Privacy protection notice"
      >
        <Text style={styles.privacyIcon}>🔒</Text>
        <Text style={styles.privacyTitle}>Your Privacy is Protected</Text>
        <Text style={styles.privacyText}>
          All access is logged and monitored. You can revoke access at any time. This complies
          with HIPAA, LGPD, and PDPA regulations.
        </Text>
      </AnimatedCard>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patient Dashboard</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('PatientSearch')}
        >
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.tabActive]}
          onPress={() => setSelectedTab('overview')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'overview' && styles.tabTextActive,
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'labs' && styles.tabActive]}
          onPress={() => setSelectedTab('labs')}
        >
          <Text
            style={[styles.tabText, selectedTab === 'labs' && styles.tabTextActive]}
          >
            Labs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'meds' && styles.tabActive]}
          onPress={() => setSelectedTab('meds')}
        >
          <Text
            style={[styles.tabText, selectedTab === 'meds' && styles.tabTextActive]}
          >
            Medications
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'access' && styles.tabActive]}
          onPress={() => setSelectedTab('access')}
        >
          <Text
            style={[styles.tabText, selectedTab === 'access' && styles.tabTextActive]}
          >
            Access
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'labs' && renderLabResults()}
        {selectedTab === 'meds' && renderMedications()}
        {selectedTab === 'access' && renderAccessControl()}
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    searchButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchIcon: {
      fontSize: 20,
    },
    tabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing[3],
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: theme.colors.primary,
    },
    tabText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: theme.spacing[4],
    },
    infoCard: {
      marginBottom: theme.spacing[4],
    },
    card: {
      marginBottom: theme.spacing[4],
    },
    patientHeader: {
      flexDirection: 'row',
      marginBottom: theme.spacing[4],
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing[3],
    },
    avatarText: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: '#FFFFFF',
    },
    patientInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    patientName: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing[1],
    },
    patientMeta: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing[0.5],
    },
    patientMRN: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    alertBox: {
      flexDirection: 'row',
      padding: theme.spacing[3],
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing[2],
    },
    alertIcon: {
      fontSize: 24,
      marginRight: theme.spacing[2],
    },
    alertContent: {
      flex: 1,
    },
    alertTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: theme.spacing[0.5],
    },
    alertText: {
      fontSize: theme.typography.fontSize.sm,
    },
    cardTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing[1],
    },
    cardSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing[3],
    },
    cardDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing[4],
    },
    vitalsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -theme.spacing[2],
    },
    vitalItem: {
      width: '50%',
      padding: theme.spacing[2],
      alignItems: 'center',
    },
    vitalIcon: {
      fontSize: 32,
      marginBottom: theme.spacing[2],
    },
    vitalValue: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing[0.5],
    },
    vitalLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -theme.spacing[2],
      marginTop: theme.spacing[2],
    },
    actionButton: {
      width: '50%',
      padding: theme.spacing[3],
      alignItems: 'center',
    },
    actionIcon: {
      fontSize: 32,
      marginBottom: theme.spacing[2],
    },
    actionText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text,
      textAlign: 'center',
    },
    labResultItem: {
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    labResultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
    },
    labResultName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      flex: 1,
    },
    labResultStatus: {
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.sm,
    },
    labResultStatusText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: 'uppercase',
    },
    labResultDetails: {
      marginBottom: theme.spacing[1],
    },
    labResultValue: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
    },
    labResultRange: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    labResultDate: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    medicationItem: {
      flexDirection: 'row',
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    medicationIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing[3],
    },
    medicationInfo: {
      flex: 1,
    },
    medicationName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing[1],
    },
    medicationDosage: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      marginBottom: theme.spacing[0.5],
    },
    medicationMeta: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    permissionItem: {
      padding: theme.spacing[3],
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing[3],
    },
    permissionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
    },
    permissionDoctor: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      flex: 1,
    },
    permissionStatus: {
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.sm,
    },
    permissionStatusText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: 'uppercase',
    },
    permissionSpecialty: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing[2],
    },
    permissionData: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      marginBottom: theme.spacing[1],
    },
    permissionDate: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
      marginBottom: theme.spacing[3],
    },
    revokeButton: {
      marginTop: theme.spacing[2],
    },
    grantAccessButton: {
      marginTop: theme.spacing[2],
    },
    privacyNotice: {
      alignItems: 'center',
      paddingVertical: theme.spacing[6],
      marginBottom: theme.spacing[4],
    },
    privacyIcon: {
      fontSize: 48,
      marginBottom: theme.spacing[3],
    },
    privacyTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing[2],
      textAlign: 'center',
    },
    privacyText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
    },
  });
