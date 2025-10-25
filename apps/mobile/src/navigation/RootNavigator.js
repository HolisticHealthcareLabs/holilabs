"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RootNavigator = void 0;
const react_1 = __importDefault(require("react"));
const native_1 = require("@react-navigation/native");
const native_stack_1 = require("@react-navigation/native-stack");
const authStore_1 = require("@/store/authStore");
const AuthNavigator_1 = require("./AuthNavigator");
const MainNavigator_1 = require("./MainNavigator");
const ThemeContext_1 = require("@/shared/contexts/ThemeContext");
const Stack = (0, native_stack_1.createNativeStackNavigator)();
const RootNavigator = () => {
    const isAuthenticated = (0, authStore_1.useAuthStore)((state) => state.isAuthenticated);
    const { theme } = (0, ThemeContext_1.useTheme)();
    return (<native_1.NavigationContainer theme={{
            dark: theme.isDark,
            colors: {
                primary: theme.colors.primary,
                background: theme.colors.background,
                card: theme.colors.surface,
                text: theme.colors.text,
                border: theme.colors.border,
                notification: theme.colors.error,
            },
        }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (<Stack.Screen name="Main" component={MainNavigator_1.MainNavigator}/>) : (<Stack.Screen name="Auth" component={AuthNavigator_1.AuthNavigator}/>)}
      </Stack.Navigator>
    </native_1.NavigationContainer>);
};
exports.RootNavigator = RootNavigator;
//# sourceMappingURL=RootNavigator.js.map