/**
 * Deep Linking Configuration
 * Enables navigation from push notifications, emails, and universal links
 *
 * URL Schemes:
 * - holilabs://patient/123 → Opens patient details
 * - holilabs://appointment/456 → Opens appointment
 * - holilabs://message/789 → Opens conversation
 * - holilabs://recording/abc → Opens recording details
 *
 * Universal Links (Production):
 * - https://app.holilabs.com/patient/123
 * - https://app.holilabs.com/appointment/456
 */

import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { RootTabParamList } from './types';

const prefix = Linking.createURL('/');

export const linking: LinkingOptions<RootTabParamList> = {
  prefixes: [
    prefix,
    'holilabs://', // Custom URL scheme
    'https://app.holilabs.com', // Universal links (production)
    'https://staging.holilabs.com', // Universal links (staging)
  ],

  config: {
    screens: {
      // Home Tab
      HomeTab: {
        screens: {
          HomeDashboard: 'home',
          PatientDetails: 'patient/:patientId',
          AppointmentDetails: 'appointment/:appointmentId',
        },
      },

      // Patients Tab
      PatientsTab: {
        screens: {
          PatientDashboard: 'patients',
          PatientDetails: 'patients/:patientId',
          PatientSearch: 'patients/search',
          PatientChart: 'patients/:patientId/chart',
          LabResults: 'patients/:patientId/labs/:labId?',
        },
      },

      // Co-Pilot Tab
      CoPilotTab: {
        screens: {
          CoPilotMain: 'copilot',
          RecordingDetails: 'recording/:recordingId',
          NoteEditor: 'recording/:recordingId/edit',
          TranscriptionView: 'recording/:recordingId/transcription',
        },
      },

      // Messages Tab
      MessagesTab: {
        screens: {
          MessagesList: 'messages',
          Conversation: 'messages/:conversationId',
          PatientProfile: 'messages/patient/:patientId',
        },
      },

      // Settings Tab
      SettingsTab: {
        screens: {
          SettingsMain: 'settings',
          Profile: 'settings/profile',
          Notifications: 'settings/notifications',
          Privacy: 'settings/privacy',
          Appearance: 'settings/appearance',
          About: 'settings/about',
        },
      },
    },
  },

  // Custom getInitialURL for handling deep links on app launch
  async getInitialURL() {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }

    // Check if app was opened from a notification
    // TODO: Integrate with push notification service
    // const notification = await Notifications.getInitialNotificationAsync();
    // if (notification) {
    //   return notification.request.content.data.url;
    // }

    return null;
  },

  // Subscribe to deep links while app is running
  subscribe(listener) {
    // Listen for deep links
    const onReceiveURL = ({ url }: { url: string }) => {
      listener(url);
    };

    // Add event listener
    const subscription = Linking.addEventListener('url', onReceiveURL);

    // Listen for push notifications
    // TODO: Integrate with push notification service
    // const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
    //   (response) => {
    //     const url = response.notification.request.content.data.url;
    //     if (url) {
    //       listener(url);
    //     }
    //   }
    // );

    return () => {
      // Clean up subscriptions
      subscription.remove();
      // notificationSubscription.remove();
    };
  },
};

/**
 * Helper functions for creating deep links
 */

export const deepLinks = {
  // Patient links
  patient: (patientId: string) => `holilabs://patient/${patientId}`,
  patientChart: (patientId: string) => `holilabs://patients/${patientId}/chart`,
  patientLabs: (patientId: string, labId?: string) =>
    `holilabs://patients/${patientId}/labs${labId ? `/${labId}` : ''}`,

  // Appointment links
  appointment: (appointmentId: string) => `holilabs://appointment/${appointmentId}`,

  // Message links
  conversation: (conversationId: string) => `holilabs://messages/${conversationId}`,

  // Recording links
  recording: (recordingId: string) => `holilabs://recording/${recordingId}`,
  noteEditor: (recordingId: string) => `holilabs://recording/${recordingId}/edit`,

  // Settings links
  settingsProfile: () => 'holilabs://settings/profile',
  settingsNotifications: () => 'holilabs://settings/notifications',
};

/**
 * Example usage:
 *
 * // Navigate to a patient from a push notification
 * navigation.navigate('PatientsTab', {
 *   screen: 'PatientDetails',
 *   params: { patientId: '123' }
 * });
 *
 * // Create a shareable deep link
 * const link = deepLinks.patient('123');
 * await Share.share({ message: `Check out this patient: ${link}` });
 */
