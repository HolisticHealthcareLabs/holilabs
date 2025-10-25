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
exports.PatientsScreen = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_query_1 = require("@tanstack/react-query");
const ThemeContext_1 = require("@/shared/contexts/ThemeContext");
const components_1 = require("@/shared/components");
const api_1 = require("@/shared/services/api");
const api_2 = require("@/config/api");
const PatientsScreen = () => {
    const { theme } = (0, ThemeContext_1.useTheme)();
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    // Fetch patients
    const { data: patients, isLoading, error } = (0, react_query_1.useQuery)({
        queryKey: ['patients', searchQuery],
        queryFn: async () => {
            if (searchQuery) {
                return api_1.api.get(api_2.API_CONFIG.ENDPOINTS.PATIENT_SEARCH, { q: searchQuery });
            }
            return api_1.api.get(api_2.API_CONFIG.ENDPOINTS.PATIENTS);
        },
    });
    const handlePatientPress = (patient) => {
        react_native_1.Alert.alert(patient.firstName + ' ' + patient.lastName, `MRN: ${patient.mrn}\nDOB: ${patient.dateOfBirth}\nPhone: ${patient.phone || 'N/A'}`);
    };
    const renderPatient = ({ item }) => (<react_native_1.TouchableOpacity onPress={() => handlePatientPress(item)}>
      <components_1.Card style={styles.patientCard}>
        <react_native_1.View style={styles.patientRow}>
          <react_native_1.View style={styles.patientInfo}>
            <react_native_1.Text style={[styles.patientName, { color: theme.colors.text }]}>
              {item.firstName} {item.lastName}
            </react_native_1.Text>
            <react_native_1.Text style={[styles.patientDetail, { color: theme.colors.textSecondary }]}>
              MRN: {item.mrn}
            </react_native_1.Text>
            <react_native_1.Text style={[styles.patientDetail, { color: theme.colors.textSecondary }]}>
              DOB: {new Date(item.dateOfBirth).toLocaleDateString()}
            </react_native_1.Text>
          </react_native_1.View>
          <react_native_1.Text style={{ fontSize: 20 }}>▶</react_native_1.Text>
        </react_native_1.View>
      </components_1.Card>
    </react_native_1.TouchableOpacity>);
    return (<react_native_1.View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={[styles.title, { color: theme.colors.text }]}>Patients</react_native_1.Text>
      </react_native_1.View>

      <react_native_1.View style={styles.content}>
        <components_1.Input placeholder="Search patients..." value={searchQuery} onChangeText={setSearchQuery} style={{ marginBottom: theme.spacing.md }}/>

        {isLoading ? (<react_native_1.Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Loading patients...
          </react_native_1.Text>) : error ? (<react_native_1.Text style={[styles.emptyText, { color: theme.colors.error }]}>
            Error: {(0, api_1.handleApiError)(error)}
          </react_native_1.Text>) : patients && patients.length > 0 ? (<react_native_1.FlatList data={patients} renderItem={renderPatient} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingBottom: 24 }}/>) : (<react_native_1.Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No patients found
          </react_native_1.Text>)}
      </react_native_1.View>
    </react_native_1.View>);
};
exports.PatientsScreen = PatientsScreen;
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
//# sourceMappingURL=PatientsScreen.js.map