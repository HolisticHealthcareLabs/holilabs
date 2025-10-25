"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainNavigator = void 0;
const react_1 = __importDefault(require("react"));
const bottom_tabs_1 = require("@react-navigation/bottom-tabs");
const react_native_1 = require("react-native");
const ThemeContext_1 = require("@/shared/contexts/ThemeContext");
const HomeScreen_1 = require("@/features/recording/screens/HomeScreen");
const HistoryScreen_1 = require("@/features/recording/screens/HistoryScreen");
const PatientsScreen_1 = require("@/features/patients/screens/PatientsScreen");
const ProfileScreen_1 = require("@/features/auth/screens/ProfileScreen");
const Tab = (0, bottom_tabs_1.createBottomTabNavigator)();
// Simple icon component (replace with actual icons later)
const TabIcon = ({ name, color }) => (<react_native_1.Text style={{ fontSize: 24, color }}>{name}</react_native_1.Text>);
const MainNavigator = () => {
    const { theme } = (0, ThemeContext_1.useTheme)();
    return (<Tab.Navigator screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarStyle: {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.border,
                borderTopWidth: 1,
                paddingTop: theme.spacing.xs,
                paddingBottom: theme.spacing.xs,
            },
            tabBarLabelStyle: {
                fontSize: theme.typography.sizes.xs,
                fontWeight: theme.typography.weights.medium,
            },
        }}>
      <Tab.Screen name="Home" component={HomeScreen_1.HomeScreen} options={{
            tabBarLabel: 'Record',
            tabBarIcon: ({ color }) => <TabIcon name="🎙️" color={color}/>,
        }}/>
      <Tab.Screen name="History" component={HistoryScreen_1.HistoryScreen} options={{
            tabBarLabel: 'History',
            tabBarIcon: ({ color }) => <TabIcon name="📋" color={color}/>,
        }}/>
      <Tab.Screen name="Patients" component={PatientsScreen_1.PatientsScreen} options={{
            tabBarLabel: 'Patients',
            tabBarIcon: ({ color }) => <TabIcon name="👥" color={color}/>,
        }}/>
      <Tab.Screen name="Profile" component={ProfileScreen_1.ProfileScreen} options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => <TabIcon name="⚙️" color={color}/>,
        }}/>
    </Tab.Navigator>);
};
exports.MainNavigator = MainNavigator;
//# sourceMappingURL=MainNavigator.js.map