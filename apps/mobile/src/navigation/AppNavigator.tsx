/**
 * App Navigator
 * Production-ready navigation with bottom tabs and nested stack navigation
 *
 * Architecture:
 * - Bottom tabs for main navigation
 * - Stack navigator per tab for detail views
 * - Deep linking support for notifications and sharing
 * - Type-safe navigation with TypeScript
 */

import React from 'react';
import { Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';

// Screen imports
import { HomeDashboardScreen } from '../screens/HomeDashboardScreen';
import { PatientDashboardScreen } from '../screens/PatientDashboardScreen';
import { PatientSearchScreen } from '../screens/PatientSearchScreen';
import { CoPilotScreen } from '../screens/CoPilotScreen';
import { MessagingScreen } from '../screens/MessagingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

// Stack screen imports (to be created)
// import { PatientDetailsScreen } from '../screens/PatientDetailsScreen';
// import { AppointmentDetailsScreen } from '../screens/AppointmentDetailsScreen';
// import { RecordingDetailsScreen } from '../screens/RecordingDetailsScreen';
// import { ConversationScreen } from '../screens/ConversationScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const PatientsStack = createNativeStackNavigator();
const CoPilotStack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

// Tab bar icon component
const TabBarIcon = ({ focused, icon }: { focused: boolean; icon: string }) => {
  return (
    <Text
      style={{
        fontSize: 24,
        opacity: focused ? 1 : 0.5,
      }}
    >
      {icon}
    </Text>
  );
};

// Stack Navigators for each tab
const HomeStackNavigator = () => {
  const { theme } = useTheme();

  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: true,
      }}
    >
      <HomeStack.Screen
        name="HomeDashboard"
        component={HomeDashboardScreen}
        options={{
          headerShown: false, // Dashboard has its own header
        }}
      />
      {/* Future screens:
      <HomeStack.Screen
        name="PatientDetails"
        component={PatientDetailsScreen}
        options={{ title: 'Patient Details' }}
      />
      <HomeStack.Screen
        name="AppointmentDetails"
        component={AppointmentDetailsScreen}
        options={{ title: 'Appointment' }}
      />
      */}
    </HomeStack.Navigator>
  );
};

const PatientsStackNavigator = () => {
  const { theme } = useTheme();

  return (
    <PatientsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <PatientsStack.Screen
        name="PatientDashboard"
        component={PatientDashboardScreen}
        options={{ title: 'Patients' }}
      />
      <PatientsStack.Screen
        name="PatientSearch"
        component={PatientSearchScreen}
        options={{ title: 'Search Patients' }}
      />
      {/* Future screens:
      <PatientsStack.Screen
        name="PatientDetails"
        component={PatientDetailsScreen}
        options={{ title: 'Patient Chart' }}
      />
      */}
    </PatientsStack.Navigator>
  );
};

const CoPilotStackNavigator = () => {
  const { theme } = useTheme();

  return (
    <CoPilotStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <CoPilotStack.Screen
        name="CoPilotMain"
        component={CoPilotScreen}
        options={{ title: 'Co-Pilot' }}
      />
      {/* Future screens:
      <CoPilotStack.Screen
        name="RecordingDetails"
        component={RecordingDetailsScreen}
        options={{ title: 'Recording' }}
      />
      <CoPilotStack.Screen
        name="NoteEditor"
        component={NoteEditorScreen}
        options={{ title: 'Edit Note' }}
      />
      */}
    </CoPilotStack.Navigator>
  );
};

const MessagesStackNavigator = () => {
  const { theme } = useTheme();

  return (
    <MessagesStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <MessagesStack.Screen
        name="MessagesList"
        component={MessagingScreen}
        options={{
          headerShown: false, // MessagingScreen has its own header
        }}
      />
      {/* Future screens:
      <MessagesStack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={({ route }) => ({ title: route.params?.patientName || 'Chat' })}
      />
      <MessagesStack.Screen
        name="PatientProfile"
        component={PatientDetailsScreen}
        options={{ title: 'Patient Profile' }}
      />
      */}
    </MessagesStack.Navigator>
  );
};

const SettingsStackNavigator = () => {
  const { theme } = useTheme();

  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <SettingsStack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      {/* Future screens:
      <SettingsStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <SettingsStack.Screen
        name="Notifications"
        component={NotificationsSettingsScreen}
        options={{ title: 'Notifications' }}
      />
      <SettingsStack.Screen
        name="Privacy"
        component={PrivacySettingsScreen}
        options={{ title: 'Privacy & Security' }}
      />
      */}
    </SettingsStack.Navigator>
  );
};

// Main App Navigator with Bottom Tabs
export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Stack navigators handle their own headers
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          ...theme.shadows.lg,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} icon="🏠" />,
        }}
      />

      <Tab.Screen
        name="PatientsTab"
        component={PatientsStackNavigator}
        options={{
          tabBarLabel: 'Patients',
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} icon="👥" />,
        }}
      />

      <Tab.Screen
        name="CoPilotTab"
        component={CoPilotStackNavigator}
        options={{
          tabBarLabel: 'Co-Pilot',
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} icon="🎙️" />,
        }}
      />

      <Tab.Screen
        name="MessagesTab"
        component={MessagesStackNavigator}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} icon="💬" />,
        }}
      />

      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} icon="⚙️" />,
        }}
      />
    </Tab.Navigator>
  );
};
