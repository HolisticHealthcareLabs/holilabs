/**
 * App Navigator
 * Production-ready navigation with bottom tabs and stack navigation
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { CoPilotScreen } from '../screens/CoPilotScreen';
import { PatientDashboardScreen } from '../screens/PatientDashboardScreen';
import { SmartDiagnosisScreen } from '../screens/SmartDiagnosisScreen';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

// Placeholder screens (to be implemented)
import { View, Text } from 'react-native';

const HomeScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Home</Text>
    <Text style={{ marginTop: 8, color: '#666' }}>Dashboard overview coming soon</Text>
  </View>
);

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Tab bar icon component
const TabBarIcon = ({ focused, icon }: { focused: boolean; icon: string }) => {
  const { theme } = useTheme();
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

export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
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
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} icon="📅" />,
        }}
      />

      <Tab.Screen
        name="Patients"
        component={PatientDashboardScreen}
        options={{
          tabBarLabel: 'Patients',
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} icon="👥" />,
        }}
      />

      <Tab.Screen
        name="CoPilot"
        component={CoPilotScreen}
        options={{
          tabBarLabel: 'Co-Pilot',
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} icon="🎙️" />,
        }}
      />

      <Tab.Screen
        name="Diagnosis"
        component={SmartDiagnosisScreen}
        options={{
          tabBarLabel: 'Diagnosis',
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} icon="🩺" />,
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} icon="⚙️" />,
        }}
      />
    </Tab.Navigator>
  );
};
