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
exports.default = App;
const react_1 = __importStar(require("react"));
const expo_status_bar_1 = require("expo-status-bar");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const react_native_gesture_handler_1 = require("react-native-gesture-handler");
const react_native_1 = require("react-native");
const RootNavigator_1 = require("./src/navigation/RootNavigator");
const authStore_1 = require("./src/store/authStore");
const ThemeContext_1 = require("./src/shared/contexts/ThemeContext");
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
        },
    },
});
function App() {
    const isHydrated = (0, authStore_1.useAuthStore)((state) => state._hasHydrated);
    const initializeAuth = (0, authStore_1.useAuthStore)((state) => state.initializeAuth);
    // Initialize Supabase authentication on app start
    (0, react_1.useEffect)(() => {
        if (isHydrated) {
            initializeAuth();
        }
    }, [isHydrated, initializeAuth]);
    if (!isHydrated) {
        return null; // Or a splash screen
    }
    return (<react_native_gesture_handler_1.GestureHandlerRootView style={styles.container}>
      <react_query_1.QueryClientProvider client={queryClient}>
        <ThemeContext_1.ThemeProvider>
          <react_native_safe_area_context_1.SafeAreaProvider>
            <RootNavigator_1.RootNavigator />
            <expo_status_bar_1.StatusBar style="auto"/>
          </react_native_safe_area_context_1.SafeAreaProvider>
        </ThemeContext_1.ThemeProvider>
      </react_query_1.QueryClientProvider>
    </react_native_gesture_handler_1.GestureHandlerRootView>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
    },
});
//# sourceMappingURL=App.js.map