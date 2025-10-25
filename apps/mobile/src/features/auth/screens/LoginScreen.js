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
exports.LoginScreen = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const native_1 = require("@react-navigation/native");
const ThemeContext_1 = require("@/shared/contexts/ThemeContext");
const components_1 = require("@/shared/components");
const authStore_1 = require("@/store/authStore");
const api_1 = require("@/shared/services/api");
const LoginScreen = () => {
    const navigation = (0, native_1.useNavigation)();
    const { theme } = (0, ThemeContext_1.useTheme)();
    const signIn = (0, authStore_1.useAuthStore)((state) => state.signIn);
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [showPassword, setShowPassword] = (0, react_1.useState)(false);
    const handleLogin = async () => {
        if (!email || !password) {
            react_native_1.Alert.alert('Error', 'Please enter email and password');
            return;
        }
        setLoading(true);
        try {
            await signIn(email, password);
        }
        catch (error) {
            react_native_1.Alert.alert('Login Failed', (0, api_1.handleApiError)(error));
        }
        finally {
            setLoading(false);
        }
    };
    return (<react_native_1.KeyboardAvoidingView style={styles.container} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'}>
      <react_native_1.ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <react_native_1.View style={styles.content}>
          {/* Logo/Header */}
          <react_native_1.View style={styles.header}>
            <react_native_1.Text style={[styles.title, { color: theme.colors.primaryDark }]}>
              Holi Labs
            </react_native_1.Text>
            <react_native_1.Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              AI Medical Scribe
            </react_native_1.Text>
          </react_native_1.View>

          {/* Login Form */}
          <components_1.Card style={styles.card}>
            <components_1.Input label="Email" value={email} onChangeText={setEmail} placeholder="doctor@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress"/>

            <components_1.Input label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry={!showPassword} textContentType="password" rightIcon={<react_native_1.Text>{showPassword ? '👁️' : '👁️‍🗨️'}</react_native_1.Text>} onRightIconPress={() => setShowPassword(!showPassword)}/>

            <components_1.Button title="Sign In" onPress={handleLogin} loading={loading} fullWidth style={{ marginTop: theme.spacing.md }}/>

            <components_1.Button title="Create Account" onPress={() => navigation.navigate('Register')} variant="ghost" fullWidth style={{ marginTop: theme.spacing.sm }}/>
          </components_1.Card>

          {/* Demo Credentials */}
          <react_native_1.Text style={[styles.demoText, { color: theme.colors.textTertiary }]}>
            Demo: doctor@holilabs.com / password123
          </react_native_1.Text>
        </react_native_1.View>
      </react_native_1.ScrollView>
    </react_native_1.KeyboardAvoidingView>);
};
exports.LoginScreen = LoginScreen;
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
        fontSize: 36,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '400',
    },
    card: {
        marginBottom: 24,
    },
    demoText: {
        textAlign: 'center',
        fontSize: 12,
    },
});
//# sourceMappingURL=LoginScreen.js.map