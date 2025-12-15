import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Audio } from 'expo-av';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { Button, Card } from '@/shared/components';
import { RecordingStatus } from '@/shared/types';

export const HomeScreen = () => {
  const { theme } = useTheme();

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [status, setStatus] = useState<RecordingStatus>('completed');
  const [duration, setDuration] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  useEffect(() => {
    // Request audio permissions on mount
    requestPermissions();

    return () => {
      // Cleanup: stop recording if component unmounts
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    // Update duration every second while recording
    let interval: ReturnType<typeof setInterval> | undefined;

    if (status === 'recording') {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Microphone access is required to record patient consultations.'
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const startRecording = async () => {
    if (!selectedPatient) {
      Alert.alert('No Patient Selected', 'Please select a patient before recording.');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setStatus('recording');
      setDuration(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const pauseRecording = async () => {
    if (!recording) return;

    try {
      await recording.pauseAsync();
      setStatus('paused');
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  };

  const resumeRecording = async () => {
    if (!recording) return;

    try {
      await recording.startAsync();
      setStatus('recording');
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecording(null);
      setStatus('processing');

      // Here you would:
      // 1. Upload the recording to your backend
      // 2. Trigger transcription
      // 3. Generate SOAP notes

      Alert.alert(
        'Recording Complete',
        `Recording saved: ${formatDuration(duration)}\n\nProcessing transcription...`,
        [
          {
            text: 'OK',
            onPress: () => {
              setStatus('completed');
              setDuration(0);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectPatient = () => {
    // Mock patient selection
    setSelectedPatient({
      id: '1',
      name: 'María González García',
      mrn: 'PT-892a-4f3e-b1c2',
    });
  };

  const getRecordingColor = () => {
    if (status === 'recording') return theme.colors.recording;
    if (status === 'paused') return theme.colors.recordingPaused;
    return theme.colors.textTertiary;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Record</Text>

        {/* Patient Selection */}
        <Card style={styles.card}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Patient</Text>
          {selectedPatient ? (
            <View>
              <Text style={[styles.patientName, { color: theme.colors.text }]}>
                {selectedPatient.name}
              </Text>
              <Text style={[styles.patientMrn, { color: theme.colors.textSecondary }]}>
                MRN: {selectedPatient.mrn}
              </Text>
            </View>
          ) : (
            <Button title="Select Patient" onPress={selectPatient} variant="outline" fullWidth />
          )}
        </Card>

        {/* Recording Visualizer */}
        <Card style={[styles.recordingCard, { borderColor: getRecordingColor() }]}>
          <View style={styles.recordingContent}>
            <View
              style={[
                styles.recordingIndicator,
                { backgroundColor: getRecordingColor() },
                status === 'recording' ? styles.recordingIndicatorPulse : undefined,
              ]}
            />

            <Text style={[styles.duration, { color: theme.colors.text }]}>
              {formatDuration(duration)}
            </Text>

            <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
              {status === 'recording' && 'Recording...'}
              {status === 'paused' && 'Paused'}
              {status === 'processing' && 'Processing...'}
              {status === 'completed' && 'Ready to record'}
            </Text>
          </View>
        </Card>

        {/* Recording Controls */}
        <View style={styles.controls}>
          {status === 'completed' && (
            <Button
              title="Start Recording"
              onPress={startRecording}
              variant="primary"
              size="lg"
              fullWidth
              disabled={!selectedPatient}
            />
          )}

          {status === 'recording' && (
            <View style={styles.controlRow}>
              <Button
                title="Pause"
                onPress={pauseRecording}
                variant="secondary"
                size="lg"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Stop"
                onPress={stopRecording}
                variant="danger"
                size="lg"
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          )}

          {status === 'paused' && (
            <View style={styles.controlRow}>
              <Button
                title="Resume"
                onPress={resumeRecording}
                variant="primary"
                size="lg"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Stop"
                onPress={stopRecording}
                variant="danger"
                size="lg"
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          )}
        </View>

        {/* Instructions */}
        <Card style={{ marginTop: 24, backgroundColor: theme.colors.surfaceVariant }}>
          <Text style={[styles.instructionsTitle, { color: theme.colors.text }]}>
            📝 Recording Tips
          </Text>
          <Text style={[styles.instructionsText, { color: theme.colors.textSecondary }]}>
            • Speak clearly and at a normal pace{'\n'}
            • Position your device 1-2 feet away{'\n'}
            • Minimize background noise{'\n'}
            • Maximum recording time: 60 minutes
          </Text>
        </Card>
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
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
  },
  card: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  patientMrn: {
    fontSize: 14,
  },
  recordingCard: {
    alignItems: 'center',
    paddingVertical: 48,
    borderWidth: 3,
    marginBottom: 24,
  },
  recordingContent: {
    alignItems: 'center',
  },
  recordingIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 24,
  },
  recordingIndicatorPulse: {
    // Add animation here with Animated API or Reanimated
  },
  duration: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  controls: {
    marginBottom: 24,
  },
  controlRow: {
    flexDirection: 'row',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 24,
  },
});
