# Push Notification Implementation Guide
**Step-by-Step Implementation for Holi Labs Mobile App**

Version: 1.0 | Date: December 14, 2025

---

## Quick Start (5-Minute Setup)

The mobile app already has `expo-notifications` installed and basic notification infrastructure in place. Here's how to enable Phase 7 push notifications:

### Prerequisites Checklist
- [x] `expo-notifications` installed (v0.32.13)
- [x] Basic `NotificationService` exists
- [x] React Navigation with deep linking configured
- [x] app.json includes notification plugin
- [ ] Backend push notification service (to be created)
- [ ] Database tables for push tokens (to be created)

---

## Implementation Phases

### Phase 1: Backend Setup (Backend Developer - 2-3 days)

#### Step 1.1: Install Dependencies

```bash
cd apps/api
npm install expo-server-sdk
```

#### Step 1.2: Create Push Notification Service

Create file: `apps/api/src/services/pushNotificationService.ts`

Copy the full implementation from the Architecture document, Section 6.1.

**Key Methods**:
- `convertSocketToPush()` - Converts Socket.IO events to push payloads
- `sendPushNotification()` - Sends notifications to users
- `registerPushToken()` - Registers user's device token
- `unregisterPushToken()` - Removes token on logout

#### Step 1.3: Create Database Tables

Run migration:

```sql
-- File: apps/api/src/migrations/001_add_push_notifications.sql

CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  push_token VARCHAR(255) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  is_active BOOLEAN DEFAULT true,
  last_active TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(is_active);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentions BOOLEAN DEFAULT true,
  comments BOOLEAN DEFAULT true,
  template_shared BOOLEAN DEFAULT true,
  template_updated BOOLEAN DEFAULT false,
  reminders BOOLEAN DEFAULT true,
  bulk_operations BOOLEAN DEFAULT true,
  do_not_disturb_start TIME,
  do_not_disturb_end TIME,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  push_token VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'device_not_registered')),
  error_message TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMP
);

CREATE INDEX idx_delivery_log_user_id ON notification_delivery_log(user_id);
CREATE INDEX idx_delivery_log_sent_at ON notification_delivery_log(sent_at);
```

Run migration:
```bash
npm run prisma:migrate
```

#### Step 1.4: Create API Routes

Create file: `apps/api/src/routes/notifications.ts`

```typescript
import { FastifyPluginAsync } from 'fastify';
import { pushNotificationService } from '@/services/pushNotificationService';
import { z } from 'zod';

const registerTokenSchema = z.object({
  pushToken: z.string(),
  deviceId: z.string(),
  platform: z.enum(['ios', 'android']),
});

const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  // Register push token
  fastify.post('/notifications/register', {
    schema: { body: registerTokenSchema },
  }, async (request, reply) => {
    const { pushToken, deviceId, platform } = request.body;
    const userId = request.user.id;

    try {
      await pushNotificationService.registerPushToken(
        userId,
        pushToken,
        deviceId,
        platform
      );
      return { success: true };
    } catch (error) {
      return reply.status(400).send({ error: 'Failed to register push token' });
    }
  });

  // Unregister push token
  fastify.delete('/notifications/unregister', async (request, reply) => {
    const { deviceId } = request.query as { deviceId: string };
    const userId = request.user.id;

    await pushNotificationService.unregisterPushToken(userId, deviceId);
    return { success: true };
  });

  // Get notification preferences
  fastify.get('/notifications/preferences', async (request, reply) => {
    const userId = request.user.id;
    // TODO: Query from database
    return {
      mentions: true,
      comments: true,
      templateShared: true,
      templateUpdated: false,
      reminders: true,
      bulkOperations: true,
    };
  });

  // Update notification preferences
  fastify.put('/notifications/preferences', async (request, reply) => {
    const userId = request.user.id;
    const preferences = request.body;
    // TODO: Update in database
    return { success: true };
  });
};

export default notificationsRoutes;
```

Register routes in `apps/api/src/index.ts`:
```typescript
import notificationsRoutes from './routes/notifications';

// ... existing code ...

fastify.register(notificationsRoutes, { prefix: '/api' });
```

#### Step 1.5: Integrate with Socket.IO

Modify `apps/web/src/lib/socket/server.ts`:

```typescript
import { pushNotificationService } from '@/services/pushNotificationService';

export async function emitToUser(
  userId: string,
  event: SocketEvent,
  notification: SocketNotification
) {
  if (!io) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  const userRoom = createRoomName(SocketRoom.USER, userId);
  io.to(userRoom).emit(event, notification);

  // ALSO send push notification
  try {
    await pushNotificationService.sendPushNotification(userId, event, notification);
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}
```

#### Step 1.6: Test Backend

```bash
# Start the API server
npm run dev

# Test token registration (use Postman or curl)
curl -X POST http://localhost:3001/api/notifications/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pushToken": "ExponentPushToken[test]",
    "deviceId": "test-device-123",
    "platform": "ios"
  }'
```

---

### Phase 2: Mobile App Enhancement (Mobile Developer - 2-3 days)

#### Step 2.1: Enhance NotificationService

Edit existing file: `apps/mobile/src/services/notificationService.ts`

Add these imports at the top:
```typescript
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/services/api'; // Your API client
```

Add new notification categories:
```typescript
export enum PreventionNotificationType {
  COMMENT_ADDED = 'COMMENT_ADDED',
  MENTION = 'MENTION',
  TEMPLATE_SHARED = 'TEMPLATE_SHARED',
  TEMPLATE_UPDATED = 'TEMPLATE_UPDATED',
  REMINDER_CREATED = 'REMINDER_CREATED',
  BULK_OPERATION_COMPLETED = 'BULK_OPERATION_COMPLETED',
}
```

Add method to register token with backend:
```typescript
static async initializeAndRegister(): Promise<string | null> {
  const pushToken = await this.initialize();

  if (pushToken) {
    try {
      const deviceId = await this.getDeviceId();
      await apiClient.post('/notifications/register', {
        pushToken,
        deviceId,
        platform: Platform.OS,
      });
      console.log('✓ Push token registered with backend');
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }

  return pushToken;
}

private static async getDeviceId(): Promise<string> {
  return Device.deviceId ||
         await SecureStore.getItemAsync('deviceId') ||
         this.generateDeviceId();
}

private static generateDeviceId(): string {
  const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  SecureStore.setItemAsync('deviceId', id);
  return id;
}

static async unregister(): Promise<void> {
  try {
    const deviceId = await this.getDeviceId();
    await apiClient.delete(`/notifications/unregister?deviceId=${deviceId}`);
    console.log('✓ Push token unregistered');
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
}
```

Update `configureAndroidChannels()` to add prevention channels:
```typescript
private static async configureAndroidChannels() {
  // ... existing channels ...

  // NEW: Prevention channels
  await Notifications.setNotificationChannelAsync('collaboration', {
    name: 'Collaboration',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync('mentions', {
    name: 'Mentions',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync('operations', {
    name: 'Operations',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync('updates', {
    name: 'Updates',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    showBadge: true,
  });
}
```

#### Step 2.2: Create Notification Store

Create file: `apps/mobile/src/stores/notificationStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationPreferences {
  mentions: boolean;
  comments: boolean;
  templateShared: boolean;
  templateUpdated: boolean;
  reminders: boolean;
  bulkOperations: boolean;
  doNotDisturbStart?: string;
  doNotDisturbEnd?: string;
}

interface InAppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  data: Record<string, any>;
}

interface NotificationState {
  preferences: NotificationPreferences;
  inAppNotifications: InAppNotification[];
  unreadCount: number;

  setPreferences: (preferences: Partial<NotificationPreferences>) => void;
  addNotification: (notification: InAppNotification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      preferences: {
        mentions: true,
        comments: true,
        templateShared: true,
        templateUpdated: false,
        reminders: true,
        bulkOperations: true,
      },
      inAppNotifications: [],
      unreadCount: 0,

      setPreferences: (preferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        })),

      addNotification: (notification) =>
        set((state) => ({
          inAppNotifications: [notification, ...state.inAppNotifications],
          unreadCount: state.unreadCount + 1,
        })),

      markAsRead: (notificationId) =>
        set((state) => ({
          inAppNotifications: state.inAppNotifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),

      markAllAsRead: () =>
        set((state) => ({
          inAppNotifications: state.inAppNotifications.map((n) => ({
            ...n,
            read: true,
          })),
          unreadCount: 0,
        })),

      clearNotifications: () =>
        set({ inAppNotifications: [], unreadCount: 0 }),
    }),
    {
      name: 'notification-storage',
      storage: AsyncStorage,
    }
  )
);
```

#### Step 2.3: Update Deep Linking Configuration

Edit `apps/mobile/src/navigation/linking.ts`:

Add prevention screens to the config:
```typescript
config: {
  screens: {
    // ... existing screens ...

    // NEW: Prevention Tab
    PreventionTab: {
      screens: {
        PreventionDashboard: 'prevention',
        TemplateList: 'prevention/templates',
        TemplateDetail: 'prevention/templates/:templateId',
        PlanList: 'prevention/plans',
        PlanDetail: 'prevention/plans/:planId',
        ActivityLog: 'prevention/activity',
      },
    },
  },
}
```

Uncomment the notification handling in `getInitialURL()`:
```typescript
async getInitialURL() {
  const url = await Linking.getInitialURL();
  if (url != null) {
    return url;
  }

  // Check if app was opened from a notification
  const notification = await Notifications.getLastNotificationResponseAsync();
  if (notification && notification.notification.request.content.data.deepLink) {
    return notification.notification.request.content.data.deepLink as string;
  }

  return null;
}
```

Uncomment the notification listener in `subscribe()`:
```typescript
subscribe(listener) {
  const onReceiveURL = ({ url }: { url: string }) => {
    listener(url);
  };

  const subscription = Linking.addEventListener('url', onReceiveURL);

  // Listen for push notifications
  const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const url = response.notification.request.content.data.deepLink;
      if (url) {
        listener(url as string);
      }
    }
  );

  return () => {
    subscription.remove();
    notificationSubscription.remove();
  };
}
```

#### Step 2.4: Update Navigation Types

Edit `apps/mobile/src/navigation/types.ts`:

Add prevention stack:
```typescript
export type PreventionStackParamList = {
  PreventionDashboard: undefined;
  TemplateList: undefined;
  TemplateDetail: {
    templateId: string;
    scrollToComment?: string;
    view?: 'changes' | 'comments' | 'overview';
  };
  PlanList: undefined;
  PlanDetail: {
    planId: string;
    highlightReminder?: string;
  };
  ActivityLog: {
    filterOperation?: string;
  };
};

// Add to RootTabParamList
export type RootTabParamList = {
  // ... existing tabs ...
  PreventionTab: NavigatorScreenParams<PreventionStackParamList>;
};
```

#### Step 2.5: Initialize in App.tsx

Edit `apps/mobile/App.tsx`:

```typescript
import NotificationService from '@/services/notificationService';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    const initNotifications = async () => {
      const pushToken = await NotificationService.initializeAndRegister();
      if (pushToken) {
        console.log('✓ Push notifications initialized');
      }
    };

    initNotifications();

    return () => {
      NotificationService.cleanup();
    };
  }, []);

  // ... rest of app
}
```

#### Step 2.6: Handle Logout

In your logout function, unregister the push token:

```typescript
// In your auth service or logout handler
async function logout() {
  await NotificationService.unregister();
  // ... rest of logout logic
}
```

---

### Phase 3: Build Prevention Screens (Frontend Developer - 3-4 days)

#### Step 3.1: Create Prevention Tab Navigator

Create file: `apps/mobile/src/navigation/PreventionNavigator.tsx`

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PreventionStackParamList } from './types';

// Import screens (to be created)
import PreventionDashboard from '@/screens/prevention/PreventionDashboard';
import TemplateList from '@/screens/prevention/TemplateList';
import TemplateDetail from '@/screens/prevention/TemplateDetail';
import PlanList from '@/screens/prevention/PlanList';
import PlanDetail from '@/screens/prevention/PlanDetail';
import ActivityLog from '@/screens/prevention/ActivityLog';

const Stack = createNativeStackNavigator<PreventionStackParamList>();

export function PreventionNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="PreventionDashboard" component={PreventionDashboard} />
      <Stack.Screen name="TemplateList" component={TemplateList} />
      <Stack.Screen name="TemplateDetail" component={TemplateDetail} />
      <Stack.Screen name="PlanList" component={PlanList} />
      <Stack.Screen name="PlanDetail" component={PlanDetail} />
      <Stack.Screen name="ActivityLog" component={ActivityLog} />
    </Stack.Navigator>
  );
}
```

#### Step 3.2: Create Template Detail Screen (with comment scrolling)

Create file: `apps/mobile/src/screens/prevention/TemplateDetail.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { PreventionStackScreenProps } from '@/navigation/types';

type Props = PreventionStackScreenProps<'TemplateDetail'>;

export default function TemplateDetail({ route }: Props) {
  const { templateId, scrollToComment, view } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch template data
  // const { data: template } = useQuery(...);

  useEffect(() => {
    // If scrollToComment is provided, scroll to that comment
    if (scrollToComment) {
      // Find comment position and scroll
      setTimeout(() => {
        // scrollViewRef.current?.scrollTo({ y: commentPosition, animated: true });
      }, 100);
    }
  }, [scrollToComment]);

  return (
    <ScrollView ref={scrollViewRef}>
      <Text>Template Detail: {templateId}</Text>
      {view === 'changes' && <Text>Show changes view</Text>}
      {/* Render template content */}
    </ScrollView>
  );
}
```

#### Step 3.3: Create Notification Center Screen

Create file: `apps/mobile/src/screens/NotificationCenterScreen.tsx`

```typescript
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNotificationStore } from '@/stores/notificationStore';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationCenterScreen() {
  const { inAppNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const navigation = useNavigation();

  const handleNotificationPress = (notification: any) => {
    markAsRead(notification.id);

    // Navigate using deep link
    if (notification.data.deepLink) {
      // Deep link will be handled by React Navigation
      const url = notification.data.deepLink;
      // Extract navigation info from URL and navigate
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllRead}>Mark All Read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={inAppNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.notificationItem,
              !item.read && styles.unreadNotification,
            ]}
            onPress={() => handleNotificationPress(item)}
          >
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationBody}>{item.body}</Text>
              <Text style={styles.notificationTime}>
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  markAllRead: { color: '#428CD4', fontSize: 14 },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadNotification: { backgroundColor: '#f5f9ff' },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  notificationBody: { fontSize: 14, color: '#666', marginBottom: 4 },
  notificationTime: { fontSize: 12, color: '#999' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#428CD4',
    marginLeft: 8,
    marginTop: 8,
  },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999' },
});
```

---

### Phase 4: Testing (QA - 2 days)

#### Step 4.1: Test on Physical Devices

**iOS Testing**:
```bash
# Build for iOS
cd apps/mobile
npx expo run:ios --device
```

**Android Testing**:
```bash
# Build for Android
npx expo run:android --device
```

#### Step 4.2: Test Notification Scenarios

- [ ] **App Closed**: Tap notification opens correct screen
- [ ] **App Background**: Tap notification brings to foreground and navigates
- [ ] **App Foreground**: Notification appears in-app
- [ ] **Deep Links**: All notification types navigate correctly
- [ ] **Badge Count**: Updates when notifications received/read
- [ ] **Sound**: Plays correctly based on priority
- [ ] **Preferences**: Can disable specific notification types
- [ ] **Deduplication**: No duplicate notifications (Socket.IO + Push)

#### Step 4.3: HIPAA Compliance Review

Review all notification content:
- [ ] No patient names in titles/bodies
- [ ] No diagnoses in visible text
- [ ] No lab results in visible text
- [ ] All PHI is in encrypted data field only
- [ ] Deep links use UUIDs, not sequential IDs

#### Step 4.4: Test Backend

Send test notifications using Expo push tool:
```
https://expo.dev/notifications
```

Or use curl:
```bash
curl -H "Content-Type: application/json" -X POST https://exp.host/--/api/v2/push/send -d '{
  "to": "ExponentPushToken[YOUR_TOKEN]",
  "title": "Test",
  "body": "Testing push notifications"
}'
```

---

## Troubleshooting

### Issue: Notifications not received on iOS

**Solution**:
1. Check `app.json` has `UIBackgroundModes: ["remote-notification"]`
2. Verify physical device (not simulator)
3. Check notification permissions granted
4. Rebuild with `npx expo run:ios`

### Issue: Notifications not received on Android

**Solution**:
1. Check Firebase Cloud Messaging is configured
2. Verify `useNextNotificationsApi: true` in `app.json`
3. Check notification channels are created
4. Rebuild with `npx expo run:android`

### Issue: Deep links not working

**Solution**:
1. Verify URL scheme in `app.json` matches deep links
2. Check linking config in `navigation/linking.ts`
3. Test deep link with: `npx uri-scheme open holilabs://prevention/templates --ios`

### Issue: Badge count not updating

**Solution**:
1. Call `Notifications.setBadgeCountAsync(count)` after each notification
2. Clear badge on app open
3. iOS: Ensure entitlements are configured

---

## Deployment Checklist

### Backend
- [ ] `expo-server-sdk` installed
- [ ] `pushNotificationService.ts` created
- [ ] Database migrations run
- [ ] API routes registered
- [ ] Socket.IO integration complete
- [ ] Environment variables configured
- [ ] Tested on staging

### Mobile App
- [ ] `NotificationService` enhanced
- [ ] Notification store created
- [ ] Deep linking configured
- [ ] Prevention screens created
- [ ] Notification center screen created
- [ ] Tested on iOS physical device
- [ ] Tested on Android physical device
- [ ] HIPAA compliance reviewed

### App Store / Play Store
- [ ] iOS: Push notification entitlement enabled
- [ ] Android: FCM configured (if needed)
- [ ] Privacy policy updated (mentions push notifications)
- [ ] App submission includes notification permissions

---

## Next Steps

After successful implementation:

1. **Monitor Metrics** (Week 1-2 post-launch)
   - Delivery rate
   - Open rate
   - Error rate
   - User feedback

2. **Iterate** (Month 2)
   - Add rich notifications (images, actions)
   - Implement smart timing (ML-based)
   - Add notification categories with actions

3. **Scale** (Month 3+)
   - Migrate to direct FCM/APNs if needed
   - Implement advanced analytics
   - A/B test notification content

---

## Support & Resources

- **Expo Docs**: https://docs.expo.dev/push-notifications/
- **React Navigation Deep Linking**: https://reactnavigation.org/docs/deep-linking/
- **HIPAA Guidelines**: See Architecture document Section 2

---

**Document Version**: 1.0
**Last Updated**: December 14, 2025
