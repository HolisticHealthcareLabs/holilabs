/**
 * Co-Pilot Screen - Mobile
 * Production-ready clinical assistant interface for mobile devices
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
}

interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
  confidence: number;
}

interface SOAPNote {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export const CoPilotScreen: React.FC = () => {
  const { theme } = useTheme();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [soapNote, setSOAPNote] = useState<SOAPNote>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Request audio permissions
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant microphone access to use Co-Pilot recording features.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  const requestConsent = () => {
    if (!selectedPatient) {
      Alert.alert('No Patient Selected', 'Please select a patient first.');
      return;
    }

    Alert.alert(
      'Recording Consent Required',
      `Do you have consent from ${selectedPatient.firstName} ${selectedPatient.lastName} to record this consultation?\n\nThis recording will be:\n• Transcribed using AI\n• Used to generate clinical notes\n• Stored securely per HIPAA/LGPD regulations`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'I Have Consent',
          onPress: () => {
            setHasConsent(true);
            startRecording();
          },
          style: 'default',
        },
      ]
    );
  };

  const startRecording = async () => {
    try {
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // Start recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setIsPaused(false);

      // Haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Simulate real-time transcription
      simulateTranscription();
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  };

  const pauseRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.pauseAsync();
        setIsPaused(true);

        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  };

  const resumeRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.startAsync();
        setIsPaused(false);

        timerRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);

        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      setIsProcessing(true);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      setIsRecording(false);
      setIsPaused(false);

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Process recording (send to backend for transcription)
      if (uri) {
        await processRecording(uri);
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsProcessing(false);
      Alert.alert('Recording Error', 'Failed to stop recording. Please try again.');
    }
  };

  const processRecording = async (uri: string) => {
    // TODO: Send recording to backend for transcription and SOAP note generation
    console.log('Processing recording from:', uri);

    // Simulate SOAP note generation
    setTimeout(() => {
      setSOAPNote({
        subjective: 'Patient reports intermittent chest pain for the past 3 days...',
        objective: 'BP: 140/90, HR: 85 bpm, SpO2: 98%...',
        assessment: 'Possible angina, requires further cardiac evaluation...',
        plan: 'Order ECG, cardiac enzyme panel, refer to cardiology...',
      });
    }, 2000);
  };

  const simulateTranscription = () => {
    // Simulate real-time transcription updates
    const mockSegments: TranscriptSegment[] = [
      {
        id: '1',
        speaker: 'Doctor',
        text: 'Good morning. What brings you in today?',
        timestamp: new Date(),
        confidence: 0.95,
      },
      {
        id: '2',
        speaker: 'Patient',
        text: "I've been having chest pain for the past few days.",
        timestamp: new Date(),
        confidence: 0.92,
      },
    ];

    setTimeout(() => {
      setTranscript(mockSegments);
    }, 3000);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clinical Co-Pilot</Text>
        <Text style={styles.headerSubtitle}>AI-powered clinical assistant</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Patient Selector */}
        <Card style={styles.patientCard}>
          <Text style={styles.sectionTitle}>Patient</Text>
          {selectedPatient ? (
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>
                {selectedPatient.firstName} {selectedPatient.lastName}
              </Text>
              <Text style={styles.patientDetails}>
                MRN: {selectedPatient.mrn} • DOB: {selectedPatient.dateOfBirth}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectPatientButton}
              onPress={() => {
                // TODO: Navigate to patient selector
                setSelectedPatient({
                  id: '1',
                  firstName: 'John',
                  lastName: 'Doe',
                  mrn: 'MRN-12345',
                  dateOfBirth: '01/15/1980',
                });
              }}
            >
              <Text style={styles.selectPatientText}>+ Select Patient</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Recording Controls */}
        {selectedPatient && (
          <Card style={styles.recordingCard}>
            <View style={styles.recordingHeader}>
              <Text style={styles.sectionTitle}>Recording</Text>
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
                </View>
              )}
            </View>

            <View style={styles.recordingControls}>
              {!isRecording ? (
                <Button
                  title="Start Recording"
                  onPress={hasConsent ? startRecording : requestConsent}
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={
                    <View style={styles.recordIcon}>
                      <View style={styles.recordIconDot} />
                    </View>
                  }
                />
              ) : (
                <View style={styles.recordingActions}>
                  {!isPaused ? (
                    <Button
                      title="Pause"
                      onPress={pauseRecording}
                      variant="secondary"
                      size="md"
                      style={styles.controlButton}
                    />
                  ) : (
                    <Button
                      title="Resume"
                      onPress={resumeRecording}
                      variant="primary"
                      size="md"
                      style={styles.controlButton}
                    />
                  )}
                  <Button
                    title="Stop"
                    onPress={stopRecording}
                    variant="danger"
                    size="md"
                    style={styles.controlButton}
                    loading={isProcessing}
                  />
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Live Transcript */}
        {transcript.length > 0 && (
          <Card style={styles.transcriptCard}>
            <Text style={styles.sectionTitle}>Live Transcript</Text>
            {transcript.map((segment) => (
              <View key={segment.id} style={styles.transcriptSegment}>
                <Text style={styles.transcriptSpeaker}>{segment.speaker}</Text>
                <Text style={styles.transcriptText}>{segment.text}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* SOAP Note */}
        {Object.keys(soapNote).length > 0 && (
          <Card style={styles.soapCard}>
            <Text style={styles.sectionTitle}>SOAP Note Preview</Text>

            {soapNote.subjective && (
              <View style={styles.soapSection}>
                <Text style={[styles.soapLabel, { color: theme.colors.subjective }]}>
                  Subjective
                </Text>
                <Text style={styles.soapText}>{soapNote.subjective}</Text>
              </View>
            )}

            {soapNote.objective && (
              <View style={styles.soapSection}>
                <Text style={[styles.soapLabel, { color: theme.colors.objective }]}>
                  Objective
                </Text>
                <Text style={styles.soapText}>{soapNote.objective}</Text>
              </View>
            )}

            {soapNote.assessment && (
              <View style={styles.soapSection}>
                <Text style={[styles.soapLabel, { color: theme.colors.assessment }]}>
                  Assessment
                </Text>
                <Text style={styles.soapText}>{soapNote.assessment}</Text>
              </View>
            )}

            {soapNote.plan && (
              <View style={styles.soapSection}>
                <Text style={[styles.soapLabel, { color: theme.colors.plan }]}>
                  Plan
                </Text>
                <Text style={styles.soapText}>{soapNote.plan}</Text>
              </View>
            )}
          </Card>
        )}
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
      padding: theme.spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing[1],
    },
    content: {
      flex: 1,
      padding: theme.spacing[4],
    },
    patientCard: {
      marginBottom: theme.spacing[4],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing[3],
    },
    patientInfo: {
      paddingVertical: theme.spacing[2],
    },
    patientName: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
    },
    patientDetails: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing[1],
    },
    selectPatientButton: {
      paddingVertical: theme.spacing[3],
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      borderStyle: 'dashed',
    },
    selectPatientText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.primary,
    },
    recordingCard: {
      marginBottom: theme.spacing[4],
    },
    recordingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    recordingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.errorLight,
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[2],
      borderRadius: theme.borderRadius.full,
    },
    recordingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.recording,
      marginRight: theme.spacing[2],
    },
    recordingTime: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.error,
    },
    recordingControls: {
      marginTop: theme.spacing[2],
    },
    recordingActions: {
      flexDirection: 'row',
      gap: theme.spacing[3],
    },
    controlButton: {
      flex: 1,
    },
    recordIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'white',
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordIconDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.recording,
    },
    transcriptCard: {
      marginBottom: theme.spacing[4],
    },
    transcriptSegment: {
      marginBottom: theme.spacing[3],
    },
    transcriptSpeaker: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      marginBottom: theme.spacing[1],
    },
    transcriptText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    },
    soapCard: {
      marginBottom: theme.spacing[6],
    },
    soapSection: {
      marginBottom: theme.spacing[4],
    },
    soapLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: theme.spacing[2],
    },
    soapText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    },
  });
