import React from 'react';
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
import { Card } from '@/shared/components';
import { api, handleApiError } from '@/shared/services/api';
import { API_CONFIG } from '@/config/api';
import { Recording } from '@/shared/types';

export const HistoryScreen = () => {
  const { theme } = useTheme();

  // Fetch recording history
  const { data: recordings, isLoading, error } = useQuery<Recording[]>({
    queryKey: ['recordings'],
    queryFn: async () => {
      return api.get(API_CONFIG.ENDPOINTS.RECORDINGS);
    },
  });

  const handleRecordingPress = (recording: Recording) => {
    Alert.alert(
      'Recording Details',
      `Patient: ${recording.patient?.firstName} ${recording.patient?.lastName}\n` +
        `Date: ${new Date(recording.startTime).toLocaleDateString()}\n` +
        `Duration: ${formatDuration(recording.duration)}\n` +
        `Status: ${recording.status}`
    );
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.success;
      case 'processing':
        return theme.colors.warning;
      case 'failed':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderRecording = ({ item }: { item: Recording }) => (
    <TouchableOpacity onPress={() => handleRecordingPress(item)}>
      <Card style={styles.recordingCard}>
        <View style={styles.recordingRow}>
          <View style={styles.recordingInfo}>
            <Text style={[styles.recordingTitle, { color: theme.colors.text }]}>
              {item.patient?.firstName} {item.patient?.lastName}
            </Text>
            <Text style={[styles.recordingDetail, { color: theme.colors.textSecondary }]}>
              {new Date(item.startTime).toLocaleDateString()} at{' '}
              {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={[styles.recordingDetail, { color: theme.colors.textSecondary }]}>
              Duration: {formatDuration(item.duration)}
            </Text>
          </View>
          <View style={styles.recordingRight}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>
                {item.status === 'completed' ? '✓' : item.status === 'processing' ? '⏳' : '✗'}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>History</Text>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Loading recordings...
          </Text>
        ) : error ? (
          <Text style={[styles.emptyText, { color: theme.colors.error }]}>
            Error: {handleApiError(error)}
          </Text>
        ) : recordings && recordings.length > 0 ? (
          <FlatList
            data={recordings}
            renderItem={renderRecording}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyEmoji, { color: theme.colors.textTertiary }]}>
              📼
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No recordings yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
              Your recordings will appear here
            </Text>
          </View>
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
  recordingCard: {
    marginBottom: 12,
  },
  recordingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  recordingDetail: {
    fontSize: 14,
    marginBottom: 2,
  },
  recordingRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    fontSize: 14,
  },
});
