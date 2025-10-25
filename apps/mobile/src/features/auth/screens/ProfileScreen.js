"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileScreen = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const ThemeContext_1 = require("@/shared/contexts/ThemeContext");
const components_1 = require("@/shared/components");
const authStore_1 = require("@/store/authStore");
const ProfileScreen = () => {
    const { theme, themeMode, setThemeMode } = (0, ThemeContext_1.useTheme)();
    const { user, logout } = (0, authStore_1.useAuthStore)();
    const handleLogout = () => {
        react_native_1.Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
        ]);
    };
    const handleThemeChange = () => {
        const modes = ['light', 'dark', 'auto'];
        const currentIndex = modes.indexOf(themeMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        setThemeMode(nextMode);
    };
    return (<react_native_1.ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <react_native_1.View style={styles.content}>
        <react_native_1.Text style={[styles.title, { color: theme.colors.text }]}>Profile</react_native_1.Text>

        {/* User Info Card */}
        <components_1.Card style={styles.card}>
          <react_native_1.Text style={[styles.label, { color: theme.colors.textSecondary }]}>Name</react_native_1.Text>
          <react_native_1.Text style={[styles.value, { color: theme.colors.text }]}>{user?.name}</react_native_1.Text>

          <react_native_1.Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
            Email
          </react_native_1.Text>
          <react_native_1.Text style={[styles.value, { color: theme.colors.text }]}>{user?.email}</react_native_1.Text>

          <react_native_1.Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
            Role
          </react_native_1.Text>
          <react_native_1.Text style={[styles.value, { color: theme.colors.text }]}>
            {user?.role?.toUpperCase()}
          </react_native_1.Text>
        </components_1.Card>

        {/* Settings Card */}
        <components_1.Card style={styles.card}>
          <react_native_1.Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Settings</react_native_1.Text>

          <components_1.Button title={`Theme: ${themeMode}`} onPress={handleThemeChange} variant="outline" fullWidth style={{ marginTop: theme.spacing.md }}/>
        </components_1.Card>

        {/* Logout */}
        <components_1.Button title="Logout" onPress={handleLogout} variant="danger" fullWidth style={{ marginTop: theme.spacing.lg }}/>

        <react_native_1.Text style={[styles.version, { color: theme.colors.textTertiary }]}>
          Version 1.0.0
        </react_native_1.Text>
      </react_native_1.View>
    </react_native_1.ScrollView>);
};
exports.ProfileScreen = ProfileScreen;
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 24,
        marginTop: 48,
    },
    card: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    value: {
        fontSize: 16,
        fontWeight: '400',
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        marginTop: 32,
        marginBottom: 24,
    },
});
//# sourceMappingURL=ProfileScreen.js.map