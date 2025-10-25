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
exports.RegisterScreen = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const native_1 = require("@react-navigation/native");
const ThemeContext_1 = require("@/shared/contexts/ThemeContext");
const components_1 = require("@/shared/components");
const authStore_1 = require("@/store/authStore");
const api_1 = require("@/shared/services/api");
const RegisterScreen = () => {
    const navigation = (0, native_1.useNavigation)();
    const { theme } = (0, ThemeContext_1.useTheme)();
    const signUp = (0, authStore_1.useAuthStore)((state) => state.signUp);
    const [name, setName] = (0, react_1.useState)('');
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [confirmPassword, setConfirmPassword] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            react_native_1.Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            react_native_1.Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (password.length < 8) {
            react_native_1.Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }
        setLoading(true);
        try {
            await signUp(email, password, {
                name,
                role: 'doctor', // Default role for new users
            });
            react_native_1.Alert.alert('Success', 'Account created successfully! You are now logged in.', [{ text: 'OK' }]);
        }
        catch (error) {
            react_native_1.Alert.alert('Registration Failed', (0, api_1.handleApiError)(error));
        }
        finally {
            setLoading(false);
        }
    };
    return (<react_native_1.KeyboardAvoidingView style={styles.container} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'}>
      <react_native_1.ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <react_native_1.View style={styles.content}>
          <react_native_1.View style={styles.header}>
            <react_native_1.Text style={[styles.title, { color: theme.colors.primaryDark }]}>
              Create Account
            </react_native_1.Text>
            <react_native_1.Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Join Holi Labs AI Scribe
            </react_native_1.Text>
          </react_native_1.View>

          <components_1.Card style={styles.card}>
            <components_1.Input label="Full Name" value={name} onChangeText={setName} placeholder="Dr. John Smith" autoCapitalize="words" textContentType="name"/>

            <components_1.Input label="Email" value={email} onChangeText={setEmail} placeholder="doctor@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress"/>

            <components_1.Input label="Password" value={password} onChangeText={setPassword} placeholder="Minimum 8 characters" secureTextEntry textContentType="newPassword"/>

            <components_1.Input label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" secureTextEntry textContentType="newPassword"/>

            <components_1.Button title="Create Account" onPress={handleRegister} loading={loading} fullWidth style={{ marginTop: theme.spacing.md }}/>

            <components_1.Button title="Already have an account? Sign In" onPress={() => navigation.navigate('Login')} variant="ghost" fullWidth style={{ marginTop: theme.spacing.sm }}/>
          </components_1.Card>
        </react_native_1.View>
      </react_native_1.ScrollView>
    </react_native_1.KeyboardAvoidingView>);
};
exports.RegisterScreen = RegisterScreen;
const styles = react_native_1.StyleSheet.create({
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
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
    },
    card: {
        marginBottom: 24,
    },
});
//# sourceMappingURL=RegisterScreen.js.map