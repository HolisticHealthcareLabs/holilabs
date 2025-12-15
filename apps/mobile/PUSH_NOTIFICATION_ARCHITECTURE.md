# Push Notification Architecture for Phase 7
**Holi Labs Mobile App - Real-Time Notification System**

Version: 1.0
Date: December 14, 2025
Status: Design Document

---

## Executive Summary

This document outlines a comprehensive push notification architecture for the Holi Labs mobile application to support Phase 7 real-time features. The system uses **Expo Push Notifications** with a strategic upgrade path to direct FCM/APNs integration for production scale. The architecture is designed to be **HIPAA-compliant** from day one, with PHI-safe notification payloads and secure deep linking.

---

## 1. Technical Stack Analysis

### Current Mobile Stack
- **Framework**: Expo SDK 54.0.25 (managed workflow)
- **Push Library**: `expo-notifications` v0.32.13 (already installed)
- **Navigation**: React Navigation v6 with deep linking support
- **State Management**: Zustand + React Query
- **Backend**: Socket.IO for real-time events
- **Platform Support**: iOS (Face ID, background modes) and Android (next notifications API)

### Notification Service Selection

#### Phase 1: Expo Push Notifications (Current → Production Launch)
**Recommended for MVP and early production**
- ✅ Already installed in package.json
- ✅ Zero additional configuration needed
- ✅ Handles FCM/APNs complexity automatically
- ✅ Works with EAS Build out of the box
- ✅ Free tier: unlimited notifications
- ✅ Delivery receipts and analytics included
- ⚠️ Requires Expo infrastructure (99.9% uptime SLA)

#### Phase 2: Direct FCM/APNs (Scale & Enterprise)
**Future upgrade path for enterprise requirements**
- 🔄 Migrate when: >100K daily active users or enterprise compliance requires direct control
- 🔄 Benefits: Full control, no third-party dependency, slightly lower latency
- 🔄 Trade-off: More complex setup, must manage APNs certificates/FCM keys

**Decision**: Start with Expo Push Notifications. The app.json already includes the expo-notifications plugin, and the infrastructure is production-ready.

---

## 2. HIPAA Compliance Strategy

### Critical Compliance Rules

#### Rule 1: No PHI in Notification Payloads
Push notifications are transmitted through third-party services (Apple, Google, Expo) and stored on device lock screens. **Never include:**
- Patient names
- Medical record numbers (MRN)
- Diagnosis information
- Lab results
- Appointment details beyond generic references

#### Rule 2: Generic Message Content
All notifications must use generic, non-identifying language:
```typescript
// ❌ WRONG - Contains PHI
"Lab results for John Doe are ready"
"Sarah Johnson mentioned you in diabetes care plan"

// ✅ CORRECT - HIPAA Compliant
"New lab results available"
"You were mentioned in a care plan"
"A template has been shared with you"
```

#### Rule 3: Secure Deep Linking
- Deep link URLs must use encrypted IDs (UUIDs, not sequential integers)
- Authentication required before revealing PHI
- App must re-authenticate if session expired

#### Rule 4: User Consent & Control
- Users must opt-in to push notifications
- Granular controls per notification type
- Do Not Disturb mode available
- Easy opt-out mechanism

### Security Implementation Checklist
- [ ] All notification content reviewed for PHI
- [ ] Deep link URLs use UUIDs only
- [ ] Session validation on every deep link navigation
- [ ] Notification preferences stored securely (expo-secure-store)
- [ ] Audit log for notification delivery
- [ ] User consent flow before enabling notifications

---

## 3. Notification Types & Payloads

### 3.1 Template Comment Added
**Trigger**: Someone comments on a template you own or have shared access to
**Priority**: MEDIUM
**Socket Event**: `COMMENT_ADDED`

```typescript
{
  to: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  sound: "default",
  title: "New Comment",
  body: "Someone commented on your template",
  data: {
    type: "COMMENT_ADDED",
    templateId: "uuid-here",
    commentId: "uuid-here",
    priority: "medium",
    deepLink: "holilabs://prevention/templates/uuid-here?comment=uuid-here"
  },
  badge: 1,
  channelId: "collaboration" // Android
}
```

**Deep Link Target**: Prevention Templates → Template Detail → Comments Section

---

### 3.2 User @Mentioned in Comment
**Trigger**: User is @mentioned in any comment
**Priority**: HIGH (requires immediate attention)
**Socket Event**: `COMMENT_ADDED` with mentions array

```typescript
{
  to: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  sound: "default",
  title: "You Were Mentioned",
  body: "Someone mentioned you in a comment",
  data: {
    type: "MENTION",
    templateId: "uuid-here",
    commentId: "uuid-here",
    priority: "high",
    deepLink: "holilabs://prevention/templates/uuid-here?comment=uuid-here&highlight=mention"
  },
  badge: 1,
  priority: "high",
  channelId: "mentions" // Android
}
```

**Deep Link Target**: Prevention Templates → Template Detail → Specific Comment (highlighted)

---

### 3.3 Template Shared With You
**Trigger**: User receives VIEW, EDIT, or ADMIN permission on a template
**Priority**: MEDIUM
**Socket Event**: `TEMPLATE_SHARED`

```typescript
{
  to: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  sound: "default",
  title: "Template Shared",
  body: "A prevention template has been shared with you",
  data: {
    type: "TEMPLATE_SHARED",
    templateId: "uuid-here",
    permission: "EDIT", // VIEW, EDIT, or ADMIN
    priority: "medium",
    deepLink: "holilabs://prevention/templates/uuid-here"
  },
  badge: 1,
  channelId: "collaboration" // Android
}
```

**Deep Link Target**: Prevention Templates → Shared Template Detail

---

### 3.4 Template Updated
**Trigger**: A shared template you have access to is updated by another user
**Priority**: LOW (informational)
**Socket Event**: `TEMPLATE_UPDATED`

```typescript
{
  to: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  sound: null, // Silent notification
  title: "Template Updated",
  body: "A shared template has been updated",
  data: {
    type: "TEMPLATE_UPDATED",
    templateId: "uuid-here",
    priority: "low",
    deepLink: "holilabs://prevention/templates/uuid-here?view=changes"
  },
  badge: 1,
  channelId: "updates" // Android
}
```

**Deep Link Target**: Prevention Templates → Template Detail → Change Log

---

### 3.5 Reminder Created/Updated
**Trigger**: Auto-generated prevention plan creates a new reminder for the provider
**Priority**: MEDIUM
**Socket Event**: `REMINDER_CREATED`

```typescript
{
  to: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  sound: "default",
  title: "New Reminder",
  body: "A prevention plan reminder has been created",
  data: {
    type: "REMINDER_CREATED",
    reminderId: "uuid-here",
    planId: "uuid-here",
    dueDate: "2025-12-20T10:00:00Z",
    priority: "medium",
    deepLink: "holilabs://prevention/plans/uuid-here?reminder=uuid-here"
  },
  badge: 1,
  channelId: "reminders" // Android
}
```

**Deep Link Target**: Prevention Plans → Plan Detail → Reminders Tab

---

### 3.6 Bulk Operation Completed
**Trigger**: Long-running bulk operation finishes (success or failure)
**Priority**: MEDIUM
**Socket Event**: `BULK_OPERATION_COMPLETED` | `BULK_OPERATION_FAILED`

```typescript
{
  to: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  sound: "default",
  title: "Bulk Operation Complete",
  body: "Your bulk operation has finished processing",
  data: {
    type: "BULK_OPERATION_COMPLETED",
    operationId: "uuid-here",
    operationType: "TEMPLATE_ACTIVATION", // or PLAN_GENERATION
    success: true,
    itemsProcessed: 50,
    priority: "medium",
    deepLink: "holilabs://prevention/activity?operation=uuid-here"
  },
  badge: 1,
  channelId: "operations" // Android
}
```

**Deep Link Target**: Prevention Activity Log → Operation Details

---

## 4. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HOLI LABS BACKEND                             │
│                                                                      │
│  ┌──────────────────┐         ┌─────────────────────────────────┐  │
│  │  Socket.IO       │         │  Push Notification Service      │  │
│  │  Server          │────────▶│  (New Component)                │  │
│  │                  │ Events  │                                 │  │
│  │  - emitToUser()  │         │  - convertSocketToPush()        │  │
│  │  - emitToRoom()  │         │  - sendPushNotification()       │  │
│  │                  │         │  - batchNotifications()         │  │
│  └──────────────────┘         │  - getUserPushTokens()          │  │
│         │                     └───────────┬─────────────────────┘  │
│         │                                 │                         │
│         │ Socket Events                   │ HTTPS                   │
│         │ (Real-time)                     │ Push Requests           │
└─────────┼─────────────────────────────────┼─────────────────────────┘
          │                                 │
          │                                 ▼
          │                     ┌──────────────────────────┐
          │                     │   Expo Push Service      │
          │                     │   (push.expo.dev)        │
          │                     └───────────┬──────────────┘
          │                                 │
          │                     ┌───────────┴──────────────┐
          │                     │                          │
          │                     ▼                          ▼
          │         ┌──────────────────┐      ┌──────────────────┐
          │         │  Firebase FCM    │      │  Apple APNs      │
          │         │  (Android)       │      │  (iOS)           │
          │         └───────┬──────────┘      └────────┬─────────┘
          │                 │                          │
          │                 ▼                          ▼
          │         ┌──────────────────┐      ┌──────────────────┐
          │         │  Android Device  │      │   iOS Device     │
          │         │                  │      │                  │
          │         └──────────────────┘      └──────────────────┘
          │                 │                          │
          │                 │                          │
          ▼                 ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    HOLI LABS MOBILE APP                              │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  NotificationService (Enhanced)                              │  │
│  │  - Dual transport (Socket.IO + Push)                        │  │
│  │  - Deduplication logic                                       │  │
│  │  - Deep link handler                                         │  │
│  │  - Badge management                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Navigation System (React Navigation)                        │  │
│  │  - Deep link resolver                                        │  │
│  │  - Screen routing                                            │  │
│  │  - Authentication check                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Screen Components                                            │  │
│  │  - Prevention Templates                                       │  │
│  │  - Prevention Plans                                           │  │
│  │  - Activity Log                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

NOTIFICATION FLOW:
1. Backend event occurs (comment added, template shared, etc.)
2. Socket.IO emits real-time event to connected clients
3. Push Notification Service ALSO sends push notification for offline users
4. Mobile app receives via Socket.IO (if online) OR Push (if offline/background)
5. Deduplication ensures user doesn't see duplicate notifications
6. User taps notification → Deep link resolver → Navigate to specific screen
7. Screen validates authentication and displays content
```

---

## 5. Deep Linking Strategy

### URL Scheme Design

**Custom Scheme**: `holilabs://`
**Universal Links**: `https://app.holilabs.com/` (production)

### Deep Link Patterns

#### Prevention Templates
```
holilabs://prevention/templates              → Template List
holilabs://prevention/templates/{templateId}  → Template Detail
holilabs://prevention/templates/{templateId}?comment={commentId}  → Specific Comment
holilabs://prevention/templates/{templateId}?view=changes  → Change Log
```

#### Prevention Plans
```
holilabs://prevention/plans                  → Plans List
holilabs://prevention/plans/{planId}         → Plan Detail
holilabs://prevention/plans/{planId}?reminder={reminderId}  → Specific Reminder
```

#### Activity & Operations
```
holilabs://prevention/activity               → Activity Log
holilabs://prevention/activity?operation={operationId}  → Operation Details
```

### Deep Link Handler Implementation

```typescript
// src/services/notificationService.ts (Enhanced)

interface DeepLinkData {
  screen: string;
  params?: Record<string, any>;
  tab?: string;
}

export class NotificationService {
  /**
   * Parse deep link from notification
   */
  static parseDeepLink(url: string): DeepLinkData | null {
    const parsed = Linking.parse(url);

    // Prevention Templates
    if (parsed.path?.startsWith('prevention/templates')) {
      const templateId = parsed.path.split('/')[2];
      const commentId = parsed.queryParams?.comment;
      const view = parsed.queryParams?.view;

      return {
        tab: 'PreventionTab',
        screen: 'TemplateDetail',
        params: {
          templateId,
          scrollToComment: commentId,
          view
        }
      };
    }

    // Prevention Plans
    if (parsed.path?.startsWith('prevention/plans')) {
      const planId = parsed.path.split('/')[2];
      const reminderId = parsed.queryParams?.reminder;

      return {
        tab: 'PreventionTab',
        screen: 'PlanDetail',
        params: {
          planId,
          highlightReminder: reminderId
        }
      };
    }

    // Activity Log
    if (parsed.path?.startsWith('prevention/activity')) {
      const operationId = parsed.queryParams?.operation;

      return {
        tab: 'PreventionTab',
        screen: 'ActivityLog',
        params: {
          filterOperation: operationId
        }
      };
    }

    return null;
  }

  /**
   * Navigate from notification tap
   */
  static async handleNotificationTap(
    notification: Notifications.Notification,
    navigation: any
  ) {
    const { data } = notification.request.content;
    const deepLink = data.deepLink as string;

    if (!deepLink) return;

    // Parse deep link
    const linkData = this.parseDeepLink(deepLink);
    if (!linkData) return;

    // Check authentication
    const isAuthenticated = await this.checkAuthentication();
    if (!isAuthenticated) {
      // Redirect to login with return URL
      navigation.navigate('Login', {
        returnUrl: deepLink
      });
      return;
    }

    // Navigate to target screen
    if (linkData.tab) {
      navigation.navigate(linkData.tab, {
        screen: linkData.screen,
        params: linkData.params
      });
    } else {
      navigation.navigate(linkData.screen, linkData.params);
    }

    // Clear badge if this was the last notification
    const remainingNotifications = await Notifications.getPresentedNotificationsAsync();
    if (remainingNotifications.length === 0) {
      await this.clearBadge();
    }
  }

  private static async checkAuthentication(): Promise<boolean> {
    // Implementation depends on your auth system
    const token = await SecureStore.getItemAsync('authToken');
    return token !== null;
  }
}
```

### Navigation Types Extension

Add new prevention-related screens to navigation types:

```typescript
// src/navigation/types.ts (ADD THESE)

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
  // ... existing tabs
  PreventionTab: NavigatorScreenParams<PreventionStackParamList>;
};
```

---

## 6. Backend Integration Design

### 6.1 Push Notification Service (New Component)

Create a new backend service to convert Socket.IO events to push notifications:

```typescript
// apps/api/src/services/pushNotificationService.ts

import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { SocketEvent, SocketNotification } from '@/lib/socket/events';

interface UserPushToken {
  userId: string;
  pushToken: string;
  deviceId: string;
  platform: 'ios' | 'android';
  lastActive: Date;
}

export class PushNotificationService {
  private expo: Expo;

  constructor() {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN, // Optional, for better rate limits
    });
  }

  /**
   * Convert Socket.IO event to push notification payload
   */
  async convertSocketToPush(
    event: SocketEvent,
    notification: SocketNotification
  ): Promise<Partial<ExpoPushMessage>> {
    const basePayload: Partial<ExpoPushMessage> = {
      sound: 'default',
      badge: 1,
      data: {
        type: event,
        ...notification.data,
        priority: notification.priority,
        timestamp: notification.timestamp.toISOString(),
      },
    };

    // Map Socket events to push notifications with HIPAA-safe content
    switch (event) {
      case SocketEvent.COMMENT_ADDED: {
        const commentData = notification.data as PreventionCommentEvent;

        // Check if user was mentioned (HIGH priority)
        const isMention = commentData.mentions?.includes(notification.userId || '');

        return {
          ...basePayload,
          title: isMention ? 'You Were Mentioned' : 'New Comment',
          body: isMention
            ? 'Someone mentioned you in a comment'
            : 'Someone commented on your template',
          priority: isMention ? 'high' : 'normal',
          channelId: isMention ? 'mentions' : 'collaboration',
          data: {
            ...basePayload.data,
            deepLink: `holilabs://prevention/templates/${commentData.templateId}?comment=${commentData.id}`,
          },
        };
      }

      case SocketEvent.TEMPLATE_SHARED: {
        const templateData = notification.data as PreventionTemplateEvent;
        return {
          ...basePayload,
          title: 'Template Shared',
          body: 'A prevention template has been shared with you',
          priority: 'normal',
          channelId: 'collaboration',
          data: {
            ...basePayload.data,
            deepLink: `holilabs://prevention/templates/${templateData.id}`,
          },
        };
      }

      case SocketEvent.TEMPLATE_UPDATED: {
        const templateData = notification.data as PreventionTemplateEvent;
        return {
          ...basePayload,
          title: 'Template Updated',
          body: 'A shared template has been updated',
          priority: 'low',
          sound: null, // Silent notification
          channelId: 'updates',
          data: {
            ...basePayload.data,
            deepLink: `holilabs://prevention/templates/${templateData.id}?view=changes`,
          },
        };
      }

      case SocketEvent.REMINDER_CREATED: {
        return {
          ...basePayload,
          title: 'New Reminder',
          body: 'A prevention plan reminder has been created',
          priority: 'normal',
          channelId: 'reminders',
          data: {
            ...basePayload.data,
            deepLink: `holilabs://prevention/plans/${notification.data.planId}?reminder=${notification.data.id}`,
          },
        };
      }

      case SocketEvent.BULK_OPERATION_COMPLETED:
      case SocketEvent.BULK_OPERATION_FAILED: {
        const success = event === SocketEvent.BULK_OPERATION_COMPLETED;
        return {
          ...basePayload,
          title: success ? 'Bulk Operation Complete' : 'Bulk Operation Failed',
          body: success
            ? 'Your bulk operation has finished processing'
            : 'Your bulk operation encountered an error',
          priority: 'normal',
          channelId: 'operations',
          data: {
            ...basePayload.data,
            deepLink: `holilabs://prevention/activity?operation=${notification.data.operationId}`,
          },
        };
      }

      default:
        return basePayload;
    }
  }

  /**
   * Send push notification to user(s)
   * Handles both single and batch notifications
   */
  async sendPushNotification(
    userIds: string | string[],
    event: SocketEvent,
    notification: SocketNotification
  ): Promise<void> {
    const userIdArray = Array.isArray(userIds) ? userIds : [userIds];

    // Get push tokens for users
    const tokens = await this.getUserPushTokens(userIdArray);
    if (tokens.length === 0) {
      console.log('No push tokens found for users:', userIdArray);
      return;
    }

    // Convert to push notification payload
    const pushPayload = await this.convertSocketToPush(event, notification);

    // Create messages for each token
    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token.pushToken,
      ...pushPayload,
    })).filter(msg => Expo.isExpoPushToken(msg.to));

    // Batch notifications (Expo recommends chunks of 100)
    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    // Handle receipts later (for delivery tracking)
    await this.handlePushTickets(tickets, userIdArray);
  }

  /**
   * Handle push notification tickets (delivery confirmation)
   */
  private async handlePushTickets(
    tickets: ExpoPushTicket[],
    userIds: string[]
  ): Promise<void> {
    // Store ticket IDs for receipt checking later
    const receiptIds = tickets
      .filter(ticket => ticket.status === 'ok' && 'id' in ticket)
      .map(ticket => 'id' in ticket ? ticket.id : '');

    // Log errors
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'error') {
        console.error('Push notification error:', {
          userId: userIds[index],
          error: 'message' in ticket ? ticket.message : 'Unknown error',
        });
      }
    });

    // TODO: Implement receipt checking for delivery tracking
    // Store receiptIds in database and check later with expo.getPushNotificationReceiptsAsync()
  }

  /**
   * Get push tokens for users from database
   */
  private async getUserPushTokens(userIds: string[]): Promise<UserPushToken[]> {
    // TODO: Implement database query
    // This should query a push_tokens table with columns:
    // - user_id, push_token, device_id, platform, last_active

    // Example query (pseudo-code):
    // return await db.pushTokens.findMany({
    //   where: { userId: { in: userIds }, isActive: true }
    // });

    return [];
  }

  /**
   * Register/update user's push token
   */
  async registerPushToken(
    userId: string,
    pushToken: string,
    deviceId: string,
    platform: 'ios' | 'android'
  ): Promise<void> {
    if (!Expo.isExpoPushToken(pushToken)) {
      throw new Error('Invalid Expo push token');
    }

    // TODO: Implement database upsert
    // await db.pushTokens.upsert({
    //   where: { userId_deviceId: { userId, deviceId } },
    //   create: { userId, pushToken, deviceId, platform, lastActive: new Date() },
    //   update: { pushToken, lastActive: new Date() }
    // });
  }

  /**
   * Unregister user's push token (logout)
   */
  async unregisterPushToken(userId: string, deviceId: string): Promise<void> {
    // TODO: Implement database deletion
    // await db.pushTokens.delete({
    //   where: { userId_deviceId: { userId, deviceId } }
    // });
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();
```

### 6.2 Integration with Socket.IO Events

Modify the Socket.IO server to also send push notifications:

```typescript
// apps/web/src/lib/socket/server.ts (MODIFY)

import { pushNotificationService } from '@/services/pushNotificationService';

/**
 * Emit event to specific user (enhanced with push)
 */
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

  console.log(`→ Emitted ${event} to user ${userId}`);

  // ALSO send push notification (for offline/background users)
  try {
    await pushNotificationService.sendPushNotification(userId, event, notification);
  } catch (error) {
    console.error('Failed to send push notification:', error);
    // Don't fail the Socket.IO emit if push fails
  }
}

/**
 * Emit event to multiple users (enhanced with push)
 */
export async function emitToUsers(
  userIds: string[],
  event: SocketEvent,
  notification: SocketNotification
) {
  if (!io) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  userIds.forEach((userId) => {
    const userRoom = createRoomName(SocketRoom.USER, userId);
    io.to(userRoom).emit(event, notification);
  });

  console.log(`→ Emitted ${event} to ${userIds.length} users`);

  // ALSO send push notifications in batch
  try {
    await pushNotificationService.sendPushNotification(userIds, event, notification);
  } catch (error) {
    console.error('Failed to send push notifications:', error);
  }
}
```

### 6.3 API Endpoint for Token Registration

```typescript
// apps/api/src/routes/notifications.ts (NEW FILE)

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
    schema: {
      body: registerTokenSchema,
    },
  }, async (request, reply) => {
    const { pushToken, deviceId, platform } = request.body;
    const userId = request.user.id; // From JWT middleware

    try {
      await pushNotificationService.registerPushToken(
        userId,
        pushToken,
        deviceId,
        platform
      );

      return { success: true };
    } catch (error) {
      return reply.status(400).send({
        error: 'Failed to register push token'
      });
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
    // TODO: Implement preferences fetching from database
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
    // TODO: Implement preferences update in database
    return { success: true };
  });
};

export default notificationsRoutes;
```

### 6.4 Database Schema

Add push token storage:

```sql
-- Migration: Add push_tokens table

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

-- Migration: Add notification_preferences table

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

-- Migration: Add notification_delivery_log table (for audit/debugging)

CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  push_token VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'device_not_registered')),
  error_message TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMP,

  INDEX idx_delivery_log_user_id (user_id),
  INDEX idx_delivery_log_sent_at (sent_at)
);
```

---

## 7. Mobile App Implementation Plan

### 7.1 Enhanced NotificationService

Update the existing `/apps/mobile/src/services/notificationService.ts`:

```typescript
// ADDITIONS to existing notificationService.ts

import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from '@/services/api';

export enum PreventionNotificationType {
  COMMENT_ADDED = 'COMMENT_ADDED',
  MENTION = 'MENTION',
  TEMPLATE_SHARED = 'TEMPLATE_SHARED',
  TEMPLATE_UPDATED = 'TEMPLATE_UPDATED',
  REMINDER_CREATED = 'REMINDER_CREATED',
  BULK_OPERATION_COMPLETED = 'BULK_OPERATION_COMPLETED',
}

export class NotificationService {
  // ... existing code ...

  /**
   * Initialize and register push token with backend
   */
  static async initializeAndRegister(): Promise<string | null> {
    const pushToken = await this.initialize();

    if (pushToken) {
      // Register with backend
      try {
        const deviceId = await this.getDeviceId();
        await apiClient.post('/notifications/register', {
          pushToken,
          deviceId,
          platform: Platform.OS,
        });
        console.log('Push token registered with backend');
      } catch (error) {
        console.error('Failed to register push token with backend:', error);
      }
    }

    return pushToken;
  }

  /**
   * Get unique device ID
   */
  private static async getDeviceId(): Promise<string> {
    // Use Expo Device ID or generate a UUID
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

  /**
   * Configure Android notification channels for prevention features
   */
  private static async configureAndroidChannels() {
    // ... existing channels ...

    // NEW: Prevention-specific channels
    await Notifications.setNotificationChannelAsync('collaboration', {
      name: 'Collaboration',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      showBadge: true,
      description: 'Notifications about template sharing and comments',
    });

    await Notifications.setNotificationChannelAsync('mentions', {
      name: 'Mentions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      showBadge: true,
      description: 'When someone mentions you in a comment',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      showBadge: true,
      description: 'Prevention plan reminders',
    });

    await Notifications.setNotificationChannelAsync('operations', {
      name: 'Operations',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      showBadge: true,
      description: 'Bulk operation status updates',
    });

    await Notifications.setNotificationChannelAsync('updates', {
      name: 'Updates',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      showBadge: true,
      description: 'Template update notifications',
    });
  }

  /**
   * Setup enhanced notification listeners with deep linking
   */
  private static setupListeners() {
    // Listen for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);

        // Update in-app notification center
        this.updateInAppNotificationCenter(notification);
      }
    );

    // Listen for user tapping on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        console.log('Notification tapped:', response);
        const { data } = response.notification.request.content;

        // Handle deep link navigation
        if (data.deepLink) {
          await this.handleDeepLinkNavigation(data.deepLink as string);
        }
      }
    );
  }

  /**
   * Handle deep link navigation from notification
   */
  private static async handleDeepLinkNavigation(deepLink: string) {
    // This will be implemented using React Navigation's linking config
    // The linking.ts file already has getInitialURL and subscribe set up

    // For now, just log (navigation will be handled by linking.ts)
    console.log('Deep link navigation:', deepLink);
  }

  /**
   * Update in-app notification center (for notification drawer)
   */
  private static updateInAppNotificationCenter(
    notification: Notifications.Notification
  ) {
    // TODO: Integrate with notification store (Zustand)
    // This will update the in-app notification center UI
  }

  /**
   * Unregister push token (on logout)
   */
  static async unregister(): Promise<void> {
    try {
      const deviceId = await this.getDeviceId();
      await apiClient.delete(`/notifications/unregister?deviceId=${deviceId}`);
      console.log('Push token unregistered from backend');
    } catch (error) {
      console.error('Failed to unregister push token:', error);
    }
  }
}
```

### 7.2 Notification Preferences Store

Create a Zustand store for notification preferences:

```typescript
// apps/mobile/src/stores/notificationStore.ts (NEW FILE)

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
  doNotDisturbStart?: string; // HH:MM format
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

  // Actions
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
        set({
          inAppNotifications: [],
          unreadCount: 0,
        }),
    }),
    {
      name: 'notification-storage',
      storage: AsyncStorage,
    }
  )
);
```

### 7.3 In-App Notification Center UI

```typescript
// apps/mobile/src/screens/NotificationCenterScreen.tsx (NEW FILE)

import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNotificationStore } from '@/stores/notificationStore';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';

export function NotificationCenterScreen() {
  const { inAppNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const navigation = useNavigation();

  const handleNotificationPress = (notification: InAppNotification) => {
    // Mark as read
    markAsRead(notification.id);

    // Navigate using deep link
    if (notification.data.deepLink) {
      // Deep link navigation will be handled by React Navigation
      navigation.navigate(notification.data.deepLink);
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  markAllRead: {
    color: '#428CD4',
    fontSize: 14,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadNotification: {
    backgroundColor: '#f5f9ff',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#428CD4',
    marginLeft: 8,
    marginTop: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
```

### 7.4 Notification Preferences Screen

```typescript
// apps/mobile/src/screens/NotificationPreferencesScreen.tsx (NEW FILE)

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNotificationStore } from '@/stores/notificationStore';
import { apiClient } from '@/services/api';

export function NotificationPreferencesScreen() {
  const { preferences, setPreferences } = useNotificationStore();
  const [loading, setLoading] = useState(false);

  const updatePreference = async (key: string, value: boolean) => {
    setPreferences({ [key]: value });

    // Sync with backend
    try {
      await apiClient.put('/notifications/preferences', {
        ...preferences,
        [key]: value,
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Types</Text>

        <PreferenceItem
          title="Mentions"
          description="When someone mentions you in a comment"
          value={preferences.mentions}
          onValueChange={(value) => updatePreference('mentions', value)}
        />

        <PreferenceItem
          title="Comments"
          description="New comments on your templates"
          value={preferences.comments}
          onValueChange={(value) => updatePreference('comments', value)}
        />

        <PreferenceItem
          title="Template Shared"
          description="When a template is shared with you"
          value={preferences.templateShared}
          onValueChange={(value) => updatePreference('templateShared', value)}
        />

        <PreferenceItem
          title="Template Updated"
          description="When shared templates are updated"
          value={preferences.templateUpdated}
          onValueChange={(value) => updatePreference('templateUpdated', value)}
        />

        <PreferenceItem
          title="Reminders"
          description="Prevention plan reminders"
          value={preferences.reminders}
          onValueChange={(value) => updatePreference('reminders', value)}
        />

        <PreferenceItem
          title="Bulk Operations"
          description="When bulk operations complete"
          value={preferences.bulkOperations}
          onValueChange={(value) => updatePreference('bulkOperations', value)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Do Not Disturb</Text>
        <Text style={styles.description}>
          Configure quiet hours when you don't want to receive notifications
        </Text>
        {/* TODO: Add time picker for DND start/end times */}
      </View>
    </ScrollView>
  );
}

function PreferenceItem({ title, description, value, onValueChange }) {
  return (
    <View style={styles.preferenceItem}>
      <View style={styles.preferenceText}>
        <Text style={styles.preferenceTitle}>{title}</Text>
        <Text style={styles.preferenceDescription}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  preferenceText: {
    flex: 1,
    marginRight: 12,
  },
  preferenceTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#666',
  },
});
```

### 7.5 App.tsx Integration

Update the main App.tsx to initialize notifications:

```typescript
// apps/mobile/App.tsx (ADD THIS)

import NotificationService from '@/services/notificationService';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Initialize push notifications
    const initNotifications = async () => {
      const pushToken = await NotificationService.initializeAndRegister();
      if (pushToken) {
        console.log('Push notifications initialized:', pushToken);
      }
    };

    initNotifications();

    // Cleanup on unmount
    return () => {
      NotificationService.cleanup();
    };
  }, []);

  // ... rest of your app
}
```

---

## 8. User Experience Design

### 8.1 Badge Count Management

Badge counts should aggregate unread notifications across all types:

```typescript
// In NotificationService
static async updateBadgeCount() {
  const store = useNotificationStore.getState();
  const count = store.unreadCount;
  await Notifications.setBadgeCountAsync(count);
}
```

### 8.2 Sound & Vibration Patterns

| Priority | Sound | Vibration | Badge |
|----------|-------|-----------|-------|
| LOW      | None  | None      | Yes   |
| MEDIUM   | Default | None    | Yes   |
| HIGH     | Default | Pattern | Yes   |
| URGENT   | Loud  | Continuous | Yes  |

### 8.3 Notification Grouping

Group notifications by type to avoid overwhelming users:
- Collapse multiple comments on same template
- Batch reminder notifications
- Single notification for bulk operations

### 8.4 Do Not Disturb Mode

Respect system DND settings and add app-level DND:
- Time-based quiet hours
- Emergency notifications always delivered
- Silent notifications during DND (badge only)

---

## 9. Testing Strategy

### 9.1 Manual Testing Checklist

- [ ] Notifications received on iOS physical device
- [ ] Notifications received on Android physical device
- [ ] Deep links open correct screens
- [ ] Badge count updates correctly
- [ ] Notifications respect user preferences
- [ ] Do Not Disturb mode works
- [ ] Duplicate notifications prevented (Socket.IO + Push)
- [ ] Offline notifications queued and delivered when online
- [ ] Background notifications work (app not open)
- [ ] Foreground notifications work (app open)
- [ ] Lock screen notifications display correctly
- [ ] Notification tap while app is killed launches app

### 9.2 HIPAA Compliance Testing

- [ ] All notification content reviewed for PHI
- [ ] Patient names never appear in notifications
- [ ] Medical data never in notification body
- [ ] Deep link URLs use encrypted IDs
- [ ] Authentication required before showing PHI
- [ ] Notification logs don't contain PHI
- [ ] Audit trail for all notifications sent

### 9.3 Automated Testing

```typescript
// Example test for notification payload generation

describe('PushNotificationService', () => {
  describe('convertSocketToPush', () => {
    it('should generate HIPAA-compliant comment notification', async () => {
      const event = SocketEvent.COMMENT_ADDED;
      const notification = {
        id: '123',
        event,
        title: 'New Comment',
        message: 'Someone commented',
        priority: NotificationPriority.MEDIUM,
        data: {
          id: 'comment-123',
          templateId: 'template-456',
          userId: 'user-789',
          content: 'This is a comment',
          mentions: [],
        },
        timestamp: new Date(),
      };

      const pushPayload = await pushService.convertSocketToPush(event, notification);

      // Assertions
      expect(pushPayload.title).toBe('New Comment');
      expect(pushPayload.body).toBe('Someone commented on your template');
      expect(pushPayload.body).not.toContain('patient');
      expect(pushPayload.body).not.toContain('diabetes');
      expect(pushPayload.data.deepLink).toContain('templates/template-456');
    });
  });
});
```

---

## 10. Performance & Scalability

### 10.1 Notification Batching

**Problem**: Sending 1000s of notifications individually is slow
**Solution**: Batch notifications in chunks of 100 (Expo recommendation)

```typescript
// Already implemented in PushNotificationService
const chunks = this.expo.chunkPushNotifications(messages);
```

### 10.2 Deduplication Strategy

**Problem**: Users receive duplicate notifications (Socket.IO + Push)
**Solution**: Client-side deduplication

```typescript
// In mobile app's NotificationService
private static receivedNotificationIds = new Set<string>();

static isDuplicate(notificationId: string): boolean {
  if (this.receivedNotificationIds.has(notificationId)) {
    return true;
  }

  this.receivedNotificationIds.add(notificationId);

  // Clean up old IDs after 5 minutes
  setTimeout(() => {
    this.receivedNotificationIds.delete(notificationId);
  }, 5 * 60 * 1000);

  return false;
}
```

### 10.3 Background Task for Delivery Receipts

Check notification delivery receipts periodically:

```typescript
// Backend cron job (runs every 5 minutes)
import { expo } from './services/pushNotificationService';

async function checkDeliveryReceipts() {
  // Get pending receipt IDs from database
  const receiptIds = await db.notificationDeliveryLog.findMany({
    where: { status: 'sent' },
    select: { id: true, receiptId: true },
  });

  if (receiptIds.length === 0) return;

  // Fetch receipts from Expo
  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(
    receiptIds.map(r => r.receiptId)
  );

  for (const chunk of receiptIdChunks) {
    const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

    for (const [receiptId, receipt] of Object.entries(receipts)) {
      if (receipt.status === 'ok') {
        // Update as delivered
        await db.notificationDeliveryLog.updateMany({
          where: { receiptId },
          data: { status: 'delivered', deliveredAt: new Date() },
        });
      } else {
        // Update as failed
        await db.notificationDeliveryLog.updateMany({
          where: { receiptId },
          data: {
            status: 'failed',
            errorMessage: receipt.message,
          },
        });
      }
    }
  }
}
```

---

## 11. Deployment Checklist

### 11.1 Backend Deployment

- [ ] Install `expo-server-sdk` package: `npm install expo-server-sdk`
- [ ] Create `PushNotificationService` class
- [ ] Add push token API endpoints
- [ ] Run database migrations for push_tokens tables
- [ ] Update Socket.IO emitToUser to also send push notifications
- [ ] Set up cron job for delivery receipt checking
- [ ] Configure environment variables (optional EXPO_ACCESS_TOKEN)

### 11.2 Mobile App Deployment

- [ ] Verify `expo-notifications` is in package.json (already there)
- [ ] Update app.json with notification color and permissions
- [ ] Enhance NotificationService with token registration
- [ ] Create notification store (Zustand)
- [ ] Add NotificationCenterScreen
- [ ] Add NotificationPreferencesScreen
- [ ] Update navigation to include prevention deep links
- [ ] Test on iOS physical device
- [ ] Test on Android physical device
- [ ] Submit app to App Store / Play Store with push notification entitlements

### 11.3 iOS Specific

- [ ] Verify UIBackgroundModes includes "remote-notification" in app.json (already there)
- [ ] APNs key/certificate configured in Expo (handled by EAS Build)
- [ ] Test on TestFlight before production

### 11.4 Android Specific

- [ ] Configure Firebase project (if using direct FCM later)
- [ ] Verify "useNextNotificationsApi": true in app.json (already there)
- [ ] Test notification channels work correctly
- [ ] Test on Google Play Internal Testing before production

---

## 12. Monitoring & Analytics

### 12.1 Key Metrics

- **Delivery Rate**: % of push notifications successfully delivered
- **Open Rate**: % of notifications tapped by users
- **Opt-in Rate**: % of users who enable push notifications
- **Conversion Rate**: % of notifications that lead to desired action
- **Error Rate**: % of failed deliveries (device not registered, etc.)

### 12.2 Logging Strategy

Log all notification events for debugging:
```typescript
console.log('[PUSH] Sending notification:', {
  userId,
  type: event,
  timestamp: new Date().toISOString(),
});
```

Add structured logging in production:
```typescript
import pino from 'pino';

const logger = pino();

logger.info({
  service: 'push-notifications',
  action: 'send',
  userId,
  notificationType: event,
  success: true,
}, 'Push notification sent');
```

---

## 13. Future Enhancements (Phase 8+)

### 13.1 Rich Notifications
- Image attachments (template thumbnails)
- Action buttons ("View", "Dismiss", "Snooze")
- Interactive elements (reply to comment from notification)

### 13.2 Notification Categories
- Custom iOS notification categories with actions
- Quick actions (approve, reject, etc.)

### 13.3 Advanced Features
- Scheduled notifications (appointment reminders)
- Location-based notifications (arriving at clinic)
- Smart notification timing (ML-based delivery optimization)

### 13.4 Analytics Dashboard
- Real-time notification delivery tracking
- User engagement metrics
- A/B testing for notification content

---

## 14. References & Resources

### Expo Documentation
- [Expo Push Notifications Overview](https://docs.expo.dev/push-notifications/overview/)
- [Expo Notifications API](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Sending Custom Notifications](https://docs.expo.dev/push-notifications/sending-notifications-custom/)

### React Native Resources
- [Deep Linking with React Navigation](https://reactnavigation.org/docs/deep-linking/)
- [React Native Firebase Push Notifications](https://rnfirebase.io/messaging/usage)

### HIPAA Compliance
- [HIPAA Compliant Push Notifications Guide](https://indigitall.com/en/blog/hipaa-compliant-push-notifications-the-ultimate-guide-for-healthcare-in-2026/)
- [HIPAA Compliant App Development](https://topflightapps.com/ideas/build-a-hipaa-compliant-app/)
- [HIPAA & Health Apps (HHS.gov)](https://www.hhs.gov/hipaa/for-professionals/special-topics/health-apps/index.html)

### Best Practices
- [Expo vs Firebase FCM Comparison](https://www.courier.com/integrations/compare/expo-vs-firebase-fcm)
- [Top Push Notification Services 2025](https://pushbase.dev/blog/top-5-push-notification-services-for-expo-react-native-in-2025)
- [Deep Linking Push Notifications Guide](https://medium.com/cybermonkey/deep-linking-push-notifications-with-react-navigation-5fce260ccca2)

---

## 15. Implementation Timeline

### Week 1: Backend Foundation
- Day 1-2: Create PushNotificationService class
- Day 3-4: Add database tables and API endpoints
- Day 5: Integrate with Socket.IO events

### Week 2: Mobile App Enhancement
- Day 1-2: Enhance NotificationService with token registration
- Day 3: Create notification store and preferences screen
- Day 4-5: Build in-app notification center UI

### Week 3: Deep Linking & Testing
- Day 1-2: Implement deep link handlers for all notification types
- Day 3-4: End-to-end testing on iOS and Android devices
- Day 5: HIPAA compliance review and security testing

### Week 4: Production Deployment
- Day 1: Deploy backend changes
- Day 2-3: Submit mobile app to App Store / Play Store
- Day 4-5: Monitor delivery metrics and fix any issues

---

## Appendix A: Code Structure

```
apps/
├── api/
│   ├── src/
│   │   ├── services/
│   │   │   └── pushNotificationService.ts (NEW)
│   │   ├── routes/
│   │   │   └── notifications.ts (NEW)
│   │   └── migrations/
│   │       └── add_push_tokens.sql (NEW)
│   └── package.json (add expo-server-sdk)
│
├── mobile/
│   ├── src/
│   │   ├── services/
│   │   │   └── notificationService.ts (ENHANCE)
│   │   ├── stores/
│   │   │   └── notificationStore.ts (NEW)
│   │   ├── screens/
│   │   │   ├── NotificationCenterScreen.tsx (NEW)
│   │   │   └── NotificationPreferencesScreen.tsx (NEW)
│   │   └── navigation/
│   │       ├── linking.ts (UPDATE - add prevention deep links)
│   │       └── types.ts (UPDATE - add PreventionStackParamList)
│   └── App.tsx (UPDATE - initialize notifications)
│
└── web/
    └── src/
        └── lib/
            └── socket/
                └── server.ts (UPDATE - add push notification calls)
```

---

## Appendix B: Environment Variables

```bash
# Backend (.env)
EXPO_ACCESS_TOKEN=optional-but-recommended-for-better-rate-limits
DATABASE_URL=postgresql://...

# Mobile (.env or app.json extra)
API_URL=https://api.holilabs.com
EXPO_PROJECT_ID=your-expo-project-id
```

---

## Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-12-14 | Initial architecture design | Claude AI |

---

**End of Document**
