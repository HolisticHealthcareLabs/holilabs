"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryScreen = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_query_1 = require("@tanstack/react-query");
const ThemeContext_1 = require("@/shared/contexts/ThemeContext");
const components_1 = require("@/shared/components");
const api_1 = require("@/shared/services/api");
const api_2 = require("@/config/api");
const HistoryScreen = () => {
    const { theme } = (0, ThemeContext_1.useTheme)();
    // Fetch recording history
    const { data: recordings, isLoading, error } = (0, react_query_1.useQuery)({
        queryKey: ['recordings'],
        queryFn: async () => {
            return api_1.api.get(api_2.API_CONFIG.ENDPOINTS.RECORDINGS);
        },
    });
    const handleRecordingPress = (recording) => {
        react_native_1.Alert.alert('Recording Details', `Patient: ${recording.patient?.firstName} ${recording.patient?.lastName}\n` +
            `Date: ${new Date(recording.startTime).toLocaleDateString()}\n` +
            `Duration: ${formatDuration(recording.duration)}\n` +
            `Status: ${recording.status}`);
    };
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };
    const getStatusColor = (status) => {
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
    const renderRecording = ({ item }) => (<react_native_1.TouchableOpacity onPress={() => handleRecordingPress(item)}>
      <components_1.Card style={styles.recordingCard}>
        <react_native_1.View style={styles.recordingRow}>
          <react_native_1.View style={styles.recordingInfo}>
            <react_native_1.Text style={[styles.recordingTitle, { color: theme.colors.text }]}>
              {item.patient?.firstName} {item.patient?.lastName}
            </react_native_1.Text>
            <react_native_1.Text style={[styles.recordingDetail, { color: theme.colors.textSecondary }]}>
              {new Date(item.startTime).toLocaleDateString()} at{' '}
              {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </react_native_1.Text>
            <react_native_1.Text style={[styles.recordingDetail, { color: theme.colors.textSecondary }]}>
              Duration: {formatDuration(item.duration)}
            </react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={styles.recordingRight}>
            <react_native_1.View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <react_native_1.Text style={styles.statusText}>
                {item.status === 'completed' ? '✓' : item.status === 'processing' ? '⏳' : '✗'}
              </react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>
      </components_1.Card>
    </react_native_1.TouchableOpacity>);
    return (<react_native_1.View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={[styles.title, { color: theme.colors.text }]}>History</react_native_1.Text>
      </react_native_1.View>

      <react_native_1.View style={styles.content}>
        {isLoading ? (<react_native_1.Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Loading recordings...
          </react_native_1.Text>) : error ? (<react_native_1.Text style={[styles.emptyText, { color: theme.colors.error }]}>
            Error: {(0, api_1.handleApiError)(error)}
          </react_native_1.Text>) : recordings && recordings.length > 0 ? (<react_native_1.FlatList data={recordings} renderItem={renderRecording} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingBottom: 24 }}/>) : (<react_native_1.View style={styles.emptyState}>
            <react_native_1.Text style={[styles.emptyEmoji, { color: theme.colors.textTertiary }]}>
              📼
            </react_native_1.Text>
            <react_native_1.Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No recordings yet
            </react_native_1.Text>
            <react_native_1.Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
              Your recordings will appear here
            </react_native_1.Text>
          </react_native_1.View>)}
      </react_native_1.View>
    </react_native_1.View>);
};
exports.HistoryScreen = HistoryScreen;
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=HistoryScreen.js.map