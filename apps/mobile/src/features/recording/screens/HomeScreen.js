"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeScreen = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const expo_av_1 = require("expo-av");
const ThemeContext_1 = require("@/shared/contexts/ThemeContext");
const components_1 = require("@/shared/components");
const HomeScreen = () => {
    const { theme } = (0, ThemeContext_1.useTheme)();
    const [recording, setRecording] = (0, react_1.useState)(null);
    const [status, setStatus] = (0, react_1.useState)('completed');
    const [duration, setDuration] = (0, react_1.useState)(0);
    const [selectedPatient, setSelectedPatient] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        // Request audio permissions on mount
        requestPermissions();
        return () => {
            // Cleanup: stop recording if component unmounts
            if (recording) {
                recording.stopAndUnloadAsync();
            }
        };
    }, []);
    (0, react_1.useEffect)(() => {
        // Update duration every second while recording
        let interval;
        if (status === 'recording') {
            interval = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval)
                clearInterval(interval);
        };
    }, [status]);
    const requestPermissions = async () => {
        try {
            const { status } = await expo_av_1.Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                react_native_1.Alert.alert('Permission Required', 'Microphone access is required to record patient consultations.');
            }
        }
        catch (error) {
            console.error('Error requesting permissions:', error);
        }
    };
    const startRecording = async () => {
        if (!selectedPatient) {
            react_native_1.Alert.alert('No Patient Selected', 'Please select a patient before recording.');
            return;
        }
        try {
            await expo_av_1.Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });
            const { recording: newRecording } = await expo_av_1.Audio.Recording.createAsync(expo_av_1.Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(newRecording);
            setStatus('recording');
            setDuration(0);
        }
        catch (error) {
            console.error('Failed to start recording:', error);
            react_native_1.Alert.alert('Error', 'Failed to start recording');
        }
    };
    const pauseRecording = async () => {
        if (!recording)
            return;
        try {
            await recording.pauseAsync();
            setStatus('paused');
        }
        catch (error) {
            console.error('Failed to pause recording:', error);
        }
    };
    const resumeRecording = async () => {
        if (!recording)
            return;
        try {
            await recording.startAsync();
            setStatus('recording');
        }
        catch (error) {
            console.error('Failed to resume recording:', error);
        }
    };
    const stopRecording = async () => {
        if (!recording)
            return;
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            setStatus('processing');
            // Here you would:
            // 1. Upload the recording to your backend
            // 2. Trigger transcription
            // 3. Generate SOAP notes
            react_native_1.Alert.alert('Recording Complete', `Recording saved: ${formatDuration(duration)}\n\nProcessing transcription...`, [
                {
                    text: 'OK',
                    onPress: () => {
                        setStatus('completed');
                        setDuration(0);
                    },
                },
            ]);
        }
        catch (error) {
            console.error('Failed to stop recording:', error);
            react_native_1.Alert.alert('Error', 'Failed to stop recording');
        }
    };
    const formatDuration = (seconds) => {
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
        if (status === 'recording')
            return theme.colors.recording.active;
        if (status === 'paused')
            return theme.colors.recording.paused;
        return theme.colors.recording.inactive;
    };
    return (<react_native_1.ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <react_native_1.View style={styles.content}>
        <react_native_1.Text style={[styles.title, { color: theme.colors.text }]}>Record</react_native_1.Text>

        {/* Patient Selection */}
        <components_1.Card style={styles.card}>
          <react_native_1.Text style={[styles.label, { color: theme.colors.textSecondary }]}>Patient</react_native_1.Text>
          {selectedPatient ? (<react_native_1.View>
              <react_native_1.Text style={[styles.patientName, { color: theme.colors.text }]}>
                {selectedPatient.name}
              </react_native_1.Text>
              <react_native_1.Text style={[styles.patientMrn, { color: theme.colors.textSecondary }]}>
                MRN: {selectedPatient.mrn}
              </react_native_1.Text>
            </react_native_1.View>) : (<components_1.Button title="Select Patient" onPress={selectPatient} variant="outline" fullWidth/>)}
        </components_1.Card>

        {/* Recording Visualizer */}
        <components_1.Card style={[styles.recordingCard, { borderColor: getRecordingColor() }]}>
          <react_native_1.View style={styles.recordingContent}>
            <react_native_1.View style={[
            styles.recordingIndicator,
            { backgroundColor: getRecordingColor() },
            status === 'recording' && styles.recordingIndicatorPulse,
        ]}/>

            <react_native_1.Text style={[styles.duration, { color: theme.colors.text }]}>
              {formatDuration(duration)}
            </react_native_1.Text>

            <react_native_1.Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
              {status === 'recording' && 'Recording...'}
              {status === 'paused' && 'Paused'}
              {status === 'processing' && 'Processing...'}
              {status === 'completed' && 'Ready to record'}
            </react_native_1.Text>
          </react_native_1.View>
        </components_1.Card>

        {/* Recording Controls */}
        <react_native_1.View style={styles.controls}>
          {status === 'completed' && (<components_1.Button title="Start Recording" onPress={startRecording} variant="primary" size="lg" fullWidth disabled={!selectedPatient}/>)}

          {status === 'recording' && (<react_native_1.View style={styles.controlRow}>
              <components_1.Button title="Pause" onPress={pauseRecording} variant="secondary" size="lg" style={{ flex: 1, marginRight: 8 }}/>
              <components_1.Button title="Stop" onPress={stopRecording} variant="danger" size="lg" style={{ flex: 1, marginLeft: 8 }}/>
            </react_native_1.View>)}

          {status === 'paused' && (<react_native_1.View style={styles.controlRow}>
              <components_1.Button title="Resume" onPress={resumeRecording} variant="primary" size="lg" style={{ flex: 1, marginRight: 8 }}/>
              <components_1.Button title="Stop" onPress={stopRecording} variant="danger" size="lg" style={{ flex: 1, marginLeft: 8 }}/>
            </react_native_1.View>)}
        </react_native_1.View>

        {/* Instructions */}
        <components_1.Card style={{ marginTop: 24, backgroundColor: theme.colors.surfaceVariant }}>
          <react_native_1.Text style={[styles.instructionsTitle, { color: theme.colors.text }]}>
            📝 Recording Tips
          </react_native_1.Text>
          <react_native_1.Text style={[styles.instructionsText, { color: theme.colors.textSecondary }]}>
            • Speak clearly and at a normal pace{'\n'}
            • Position your device 1-2 feet away{'\n'}
            • Minimize background noise{'\n'}
            • Maximum recording time: 60 minutes
          </react_native_1.Text>
        </components_1.Card>
      </react_native_1.View>
    </react_native_1.ScrollView>);
};
exports.HomeScreen = HomeScreen;
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=HomeScreen.js.map