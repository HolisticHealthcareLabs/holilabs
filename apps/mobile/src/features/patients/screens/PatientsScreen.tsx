import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { Input, Card } from '@/shared/components';
import { api, handleApiError } from '@/shared/services/api';
import { API_CONFIG } from '@/config/api';
import { Patient } from '@/shared/types';

export const PatientsScreen = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch patients
  const { data: patients, isLoading, error } = useQuery<Patient[]>({
    queryKey: ['patients', searchQuery],
    queryFn: async () => {
      if (searchQuery) {
        return api.get(API_CONFIG.ENDPOINTS.PATIENT_SEARCH, { q: searchQuery });
      }
      return api.get(API_CONFIG.ENDPOINTS.PATIENTS);
    },
  });

  const handlePatientPress = (patient: Patient) => {
    Alert.alert(
      patient.firstName + ' ' + patient.lastName,
      `MRN: ${patient.mrn}\nDOB: ${patient.dateOfBirth}\nPhone: ${patient.phone || 'N/A'}`
    );
  };

  const renderPatient = ({ item }: { item: Patient }) => (
    <TouchableOpacity onPress={() => handlePatientPress(item)}>
      <Card style={styles.patientCard}>
        <View style={styles.patientRow}>
          <View style={styles.patientInfo}>
            <Text style={[styles.patientName, { color: theme.colors.text }]}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={[styles.patientDetail, { color: theme.colors.textSecondary }]}>
              MRN: {item.mrn}
            </Text>
            <Text style={[styles.patientDetail, { color: theme.colors.textSecondary }]}>
              DOB: {new Date(item.dateOfBirth).toLocaleDateString()}
            </Text>
          </View>
          <Text style={{ fontSize: 20 }}>▶</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Patients</Text>
      </View>

      <View style={styles.content}>
        <Input
          placeholder="Search patients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ marginBottom: theme.spacing.md }}
        />

        {isLoading ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Loading patients...
          </Text>
        ) : error ? (
          <Text style={[styles.emptyText, { color: theme.colors.error }]}>
            Error: {handleApiError(error)}
          </Text>
        ) : patients && patients.length > 0 ? (
          <FlatList
            data={patients}
            renderItem={renderPatient}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No patients found
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  patientCard: {
    marginBottom: 12,
  },
  patientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  patientDetail: {
    fontSize: 14,
    marginBottom: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 48,
    fontSize: 16,
  },
});
