import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { HomeScreen } from '@/features/recording/screens/HomeScreen';
import { HistoryScreen } from '@/features/recording/screens/HistoryScreen';
import { PatientsScreen } from '@/features/patients/screens/PatientsScreen';
import { ProfileScreen } from '@/features/auth/screens/ProfileScreen';

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Patients: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// Simple icon component (replace with actual icons later)
const TabIcon = ({ name, color }: { name: string; color: string }) => (
  <Text style={{ fontSize: 24, color }}>{name}</Text>
);

export const MainNavigator = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
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
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Record',
          tabBarIcon: ({ color }) => <TabIcon name="🎙️" color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color }) => <TabIcon name="📋" color={color} />,
        }}
      />
      <Tab.Screen
        name="Patients"
        component={PatientsScreen}
        options={{
          tabBarLabel: 'Patients',
          tabBarIcon: ({ color }) => <TabIcon name="👥" color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="⚙️" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
