# Navigation Guide - Deep Linking & Stack Navigation

Complete guide for the production-ready navigation architecture with deep linking support.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Navigation Structure](#navigation-structure)
3. [Type-Safe Navigation](#type-safe-navigation)
4. [Deep Linking](#deep-linking)
5. [Common Patterns](#common-patterns)
6. [Push Notifications](#push-notifications)
7. [Testing Deep Links](#testing-deep-links)

---

## Architecture Overview

### Three-Tier Navigation

```
┌─────────────────────────────────────────────────────────┐
│  RootNavigator (Auth/Main)                               │
│  └─ MainNavigator (Bottom Tabs)                         │
│      ├─ HomeTab (Stack)                                 │
│      │   ├─ HomeDashboard                               │
│      │   ├─ PatientDetails                              │
│      │   └─ AppointmentDetails                          │
│      ├─ PatientsTab (Stack)                             │
│      │   ├─ PatientDashboard                            │
│      │   ├─ PatientDetails                              │
│      │   ├─ PatientSearch                               │
│      │   └─ PatientChart                                │
│      ├─ CoPilotTab (Stack)                              │
│      │   ├─ CoPilotMain                                 │
│      │   ├─ RecordingDetails                            │
│      │   └─ NoteEditor                                  │
│      ├─ MessagesTab (Stack)                             │
│      │   ├─ MessagesList                                │
│      │   ├─ Conversation                                │
│      │   └─ PatientProfile                              │
│      └─ SettingsTab (Stack)                             │
│          ├─ SettingsMain                                │
│          ├─ Profile                                     │
│          └─ Notifications                               │
└─────────────────────────────────────────────────────────┘
```

### Key Features

- **Bottom Tabs**: Main navigation (Home, Patients, Co-Pilot, Messages, Settings)
- **Stack Per Tab**: Each tab has its own navigation history
- **Deep Linking**: Open any screen from external links or notifications
- **Type Safety**: Full TypeScript support with autocomplete
- **Persistence**: Navigation state persists across app restarts

---

## Navigation Structure

### Tab Structure

Each tab is an independent stack navigator with its own screens:

#### Home Tab
```typescript
HomeTab/
  ├─ HomeDashboard (default)
  ├─ PatientDetails/:patientId
  └─ AppointmentDetails/:appointmentId
```

#### Patients Tab
```typescript
PatientsTab/
  ├─ PatientDashboard (default)
  ├─ PatientDetails/:patientId
  ├─ PatientSearch
  ├─ PatientChart/:patientId
  └─ LabResults/:patientId/:labId?
```

#### Co-Pilot Tab
```typescript
CoPilotTab/
  ├─ CoPilotMain (default)
  ├─ RecordingDetails/:recordingId
  ├─ NoteEditor/:recordingId
  └─ TranscriptionView/:recordingId
```

#### Messages Tab
```typescript
MessagesTab/
  ├─ MessagesList (default)
  ├─ Conversation/:conversationId
  └─ PatientProfile/:patientId
```

#### Settings Tab
```typescript
SettingsTab/
  ├─ SettingsMain (default)
  ├─ Profile
  ├─ Notifications
  ├─ Privacy
  ├─ Appearance
  └─ About
```

---

## Type-Safe Navigation

### Using Navigation Types

```typescript
import { HomeStackScreenProps } from '../navigation/types';

// Screen component with typed props
export const PatientDetailsScreen: React.FC<
  HomeStackScreenProps<'PatientDetails'>
> = ({ navigation, route }) => {
  // route.params is type-safe
  const { patientId } = route.params;

  // Navigation is autocompleted
  navigation.navigate('AppointmentDetails', {
    appointmentId: '123',
  });

  return <View>...</View>;
};
```

### Navigate Between Screens

#### Within Same Stack

```typescript
// From HomeDashboard to PatientDetails
navigation.navigate('PatientDetails', { patientId: '123' });

// Go back
navigation.goBack();

// Pop to top of stack
navigation.popToTop();
```

#### Between Different Tabs

```typescript
// From Home tab to Patients tab, then to PatientDetails
navigation.navigate('PatientsTab', {
  screen: 'PatientDetails',
  params: { patientId: '123' },
});

// Navigate and reset the stack
navigation.reset({
  index: 0,
  routes: [{ name: 'PatientDashboard' }],
});
```

#### With useNavigation Hook

```typescript
import { useNavigation } from '@react-navigation/native';
import { HomeStackScreenProps } from '../navigation/types';

export const MyComponent = () => {
  const navigation = useNavigation<HomeStackScreenProps<'HomeDashboard'>['navigation']>();

  const openPatient = (patientId: string) => {
    navigation.navigate('PatientDetails', { patientId });
  };

  return <Button title="View Patient" onPress={() => openPatient('123')} />;
};
```

---

## Deep Linking

### URL Schemes

The app supports three types of deep links:

#### 1. Custom URL Scheme
```
holilabs://patient/123
holilabs://appointment/456
holilabs://messages/789
holilabs://recording/abc
```

#### 2. Universal Links (Production)
```
https://app.holilabs.com/patient/123
https://app.holilabs.com/appointment/456
https://app.holilabs.com/messages/789
```

#### 3. Expo Development URLs
```
exp://192.168.1.100:8081/--/patient/123
```

### Creating Deep Links

Use the helper functions from `linking.ts`:

```typescript
import { deepLinks } from '../navigation/linking';
import * as Sharing from 'expo-sharing';

// Create a deep link to a patient
const patientLink = deepLinks.patient('123');
// Returns: "holilabs://patient/123"

// Share the link
await Sharing.shareAsync(patientLink, {
  dialogTitle: 'Share Patient Link',
});

// Other deep link helpers
const appointmentLink = deepLinks.appointment('456');
const conversationLink = deepLinks.conversation('789');
const recordingLink = deepLinks.recording('abc');
const settingsLink = deepLinks.settingsProfile();
```

### Handling Deep Links in Components

```typescript
import { useEffect } from 'react';
import * as Linking from 'expo-linking';

export const MyScreen = () => {
  useEffect(() => {
    // Get the initial URL if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('App opened with URL:', url);
        // Navigation is handled automatically by React Navigation
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Received deep link:', url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return <View>...</View>;
};
```

---

## Common Patterns

### 1. Navigate to Patient from Dashboard

```typescript
// HomeDashboardScreen.tsx
import { useNavigation } from '@react-navigation/native';

export const HomeDashboardScreen = () => {
  const navigation = useNavigation();

  const handlePatientPress = (patientId: string) => {
    navigation.navigate('PatientsTab', {
      screen: 'PatientDetails',
      params: { patientId },
    });
  };

  return (
    <FlatList
      data={patients}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handlePatientPress(item.id)}>
          <Text>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
};
```

### 2. Navigate from List to Details

```typescript
// PatientDashboardScreen.tsx
export const PatientDashboardScreen: React.FC<
  PatientsStackScreenProps<'PatientDashboard'>
> = ({ navigation }) => {
  const filteredPatients = useFilteredPatients();

  return (
    <FlatList
      data={filteredPatients}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('PatientDetails', { patientId: item.id })
          }
        >
          <Text>{item.firstName} {item.lastName}</Text>
        </TouchableOpacity>
      )}
    />
  );
};
```

### 3. Navigate with Modal Presentation

```typescript
// Open a screen as a modal
navigation.navigate('NoteEditor', {
  recordingId: '123',
  presentation: 'modal', // iOS-style modal
});
```

### 4. Navigate and Replace Current Screen

```typescript
// Replace current screen (no back button)
navigation.replace('PatientDetails', { patientId: '456' });
```

### 5. Navigate with Animation Options

```typescript
navigation.navigate('PatientDetails', {
  patientId: '123',
  animation: 'slide_from_right', // or 'fade', 'slide_from_bottom', etc.
});
```

### 6. Navigate from Notification

```typescript
// In NotificationService.ts
import { deepLinks } from '../navigation/linking';

export const handleNotificationPress = (notification: Notification) => {
  const { type, id } = notification.data;

  switch (type) {
    case 'appointment_reminder':
      // Deep link to appointment
      Linking.openURL(deepLinks.appointment(id));
      break;

    case 'new_message':
      // Deep link to conversation
      Linking.openURL(deepLinks.conversation(id));
      break;

    case 'lab_results':
      // Deep link to patient labs
      Linking.openURL(deepLinks.patientLabs(id));
      break;
  }
};
```

---

## Push Notifications

### Configure Notification Data

When sending push notifications from your backend, include deep link data:

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "New Lab Results Available",
  "body": "Lab results for Patient John Doe are ready",
  "data": {
    "url": "holilabs://patients/123/labs/456",
    "type": "lab_results",
    "patientId": "123",
    "labId": "456"
  }
}
```

### Handle Notification Tap

```typescript
// In App.tsx or RootNavigator.tsx
import * as Notifications from 'expo-notifications';

useEffect(() => {
  // Handle notification tap when app is in foreground
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const url = response.notification.request.content.data.url;
      if (url) {
        Linking.openURL(url);
      }
    }
  );

  return () => subscription.remove();
}, []);
```

---

## Testing Deep Links

### iOS Simulator

```bash
# Test custom URL scheme
xcrun simctl openurl booted "holilabs://patient/123"

# Test universal link
xcrun simctl openurl booted "https://app.holilabs.com/patient/123"
```

### Android Emulator

```bash
# Test custom URL scheme
adb shell am start -W -a android.intent.action.VIEW -d "holilabs://patient/123"

# Test universal link
adb shell am start -W -a android.intent.action.VIEW -d "https://app.holilabs.com/patient/123"
```

### Expo Development

```bash
# In development, use expo-linking to test
npx uri-scheme open "holilabs://patient/123" --ios
npx uri-scheme open "holilabs://patient/123" --android
```

### Browser Testing

Open in mobile browser:
```
https://app.holilabs.com/patient/123
```

This should prompt to open the HoliLabs app if installed.

---

## Advanced Patterns

### 1. Conditional Navigation Based on Auth

```typescript
export const AppointmentCard = ({ appointment }) => {
  const navigation = useNavigation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const handlePress = () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth');
      return;
    }

    navigation.navigate('HomeTab', {
      screen: 'AppointmentDetails',
      params: { appointmentId: appointment.id },
    });
  };

  return <TouchableOpacity onPress={handlePress}>...</TouchableOpacity>;
};
```

### 2. Navigation Guards

```typescript
// useNavigationGuard.ts
export const useNavigationGuard = () => {
  const navigation = useNavigation();
  const hasUnsavedChanges = useRecordingStore((state) => state.drafts.length > 0);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges) {
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Show confirmation dialog
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved recordings. Are you sure you want to leave?',
        [
          { text: "Don't leave", style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);
};
```

### 3. Deep Link Analytics

```typescript
// Track deep link usage
import { AnalyticsService } from '../services/analyticsService';

useEffect(() => {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    AnalyticsService.trackEvent('deep_link_opened', {
      url,
      timestamp: new Date().toISOString(),
    });
  });

  return () => subscription.remove();
}, []);
```

### 4. Share Patient Link

```typescript
import { Share } from 'react-native';
import { deepLinks } from '../navigation/linking';

export const SharePatientButton = ({ patientId }) => {
  const handleShare = async () => {
    const link = deepLinks.patient(patientId);

    await Share.share({
      message: `View this patient in HoliLabs: ${link}`,
      url: link, // iOS only
      title: 'Share Patient',
    });
  };

  return <Button title="Share" onPress={handleShare} />;
};
```

---

## Configuration Files

### app.json (Expo Config)

Add URL schemes and universal links:

```json
{
  "expo": {
    "scheme": "holilabs",
    "ios": {
      "bundleIdentifier": "com.holilabs.app",
      "associatedDomains": ["applinks:app.holilabs.com"]
    },
    "android": {
      "package": "com.holilabs.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "app.holilabs.com",
              "pathPrefix": "/"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### apple-app-site-association (Universal Links)

Place at: `https://app.holilabs.com/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.holilabs.app",
        "paths": ["*"]
      }
    ]
  }
}
```

### assetlinks.json (Android App Links)

Place at: `https://app.holilabs.com/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.holilabs.app",
      "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
    }
  }
]
```

---

## Best Practices

1. **Always use type-safe navigation** - Import navigation types for autocomplete
2. **Use deep links for notifications** - Enable users to jump directly to relevant content
3. **Test on both platforms** - Deep links behave differently on iOS vs Android
4. **Handle edge cases** - What happens if the resource doesn't exist?
5. **Track deep link usage** - Monitor which links users click
6. **Provide fallbacks** - If deep link fails, show appropriate error
7. **Use navigation guards** - Prevent navigation if there are unsaved changes
8. **Persist navigation state** - Users expect to return to where they left off

---

## Troubleshooting

### Deep Link Not Working

1. **Check URL scheme is registered** in app.json
2. **Verify linking config** matches URL pattern
3. **Test with xcrun/adb** commands first
4. **Check if app is installed** - Deep links only work with installed apps
5. **Review console logs** - React Navigation logs navigation attempts

### Universal Links Not Working

1. **Verify HTTPS** - Universal links require HTTPS
2. **Check associated domains** - Must be configured in Xcode/Android Studio
3. **Test apple-app-site-association** - Visit the URL directly
4. **Rebuild app** - Changes to associated domains require rebuild
5. **Check certificate** - SSL certificate must be valid

### Navigation Type Errors

1. **Import correct types** from `navigation/types.ts`
2. **Extend RootParamList** if adding new screens
3. **Use as const** for route names to ensure type safety
4. **Check parameter types** match what screen expects

---

This navigation architecture provides production-ready deep linking, type-safe navigation, and seamless user experience across all navigation patterns. All screens can be reached via deep links, enabling powerful push notification workflows and sharing capabilities.
