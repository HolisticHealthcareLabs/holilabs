/**
 * Navigation Types
 * Type-safe navigation with TypeScript
 *
 * Provides autocomplete and type checking for navigation.navigate() calls
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Stack param lists for each tab
export type HomeStackParamList = {
  HomeDashboard: undefined;
  PatientDetails: { patientId: string };
  AppointmentDetails: { appointmentId: string };
};

export type PatientsStackParamList = {
  PatientDashboard: undefined;
  PatientDetails: { patientId: string };
  PatientSearch: undefined;
  PatientChart: { patientId: string };
  LabResults: { patientId: string; labId?: string };
};

export type CoPilotStackParamList = {
  CoPilotMain: undefined;
  RecordingDetails: { recordingId: string };
  NoteEditor: { recordingId: string };
  TranscriptionView: { recordingId: string };
};

export type MessagesStackParamList = {
  MessagesList: undefined;
  Conversation: { conversationId: string; patientName: string; patientId: string };
  PatientProfile: { patientId: string };
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Profile: undefined;
  Notifications: undefined;
  Privacy: undefined;
  Appearance: undefined;
  About: undefined;
};

// Tab param list
export type RootTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  PatientsTab: NavigatorScreenParams<PatientsStackParamList>;
  CoPilotTab: NavigatorScreenParams<CoPilotStackParamList>;
  MessagesTab: NavigatorScreenParams<MessagesStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

// Screen props types for type-safe navigation
export type HomeStackScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;

export type PatientsStackScreenProps<T extends keyof PatientsStackParamList> =
  NativeStackScreenProps<PatientsStackParamList, T>;

export type CoPilotStackScreenProps<T extends keyof CoPilotStackParamList> =
  NativeStackScreenProps<CoPilotStackParamList, T>;

export type MessagesStackScreenProps<T extends keyof MessagesStackParamList> =
  NativeStackScreenProps<MessagesStackParamList, T>;

export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> =
  NativeStackScreenProps<SettingsStackParamList, T>;

export type RootTabScreenProps<T extends keyof RootTabParamList> =
  BottomTabScreenProps<RootTabParamList, T>;

// Declare global types for navigation (enables type-safe navigation.navigate() throughout the app)
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}
