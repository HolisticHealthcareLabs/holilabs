# Push Notification Architecture - Visual Diagrams

---

## 1. System Architecture Overview

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                         HOLI LABS BACKEND                          ┃
┃                        (Next.js + Fastify API)                     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐      ┌──────────────────────────┐
        │   Socket.IO Server    │      │ Push Notification Service │
        │                       │      │        (NEW)              │
        │  Events:              │──────▶  Methods:                 │
        │  • COMMENT_ADDED      │      │  • convertSocketToPush()  │
        │  • TEMPLATE_SHARED    │      │  • sendPushNotification() │
        │  • REMINDER_CREATED   │      │  • batchNotifications()   │
        │  • BULK_COMPLETE      │      │  • registerPushToken()    │
        └───────────────────────┘      └──────────┬───────────────┘
                    │                             │
                    │ Socket.IO                   │ HTTPS
                    │ (Real-time)                 │ (Push API)
                    │                             │
                    ▼                             ▼
        ┌───────────────────────┐      ┌──────────────────────────┐
        │  Web App (Connected)  │      │   Expo Push Service      │
        │  Real-time updates    │      │   (push.expo.dev)        │
        └───────────────────────┘      └──────────┬───────────────┘
                                                   │
                                       ┌───────────┴───────────┐
                                       │                       │
                                       ▼                       ▼
                            ┌─────────────────┐    ┌─────────────────┐
                            │  Firebase FCM   │    │   Apple APNs    │
                            │   (Android)     │    │     (iOS)       │
                            └────────┬────────┘    └────────┬────────┘
                                     │                      │
                                     ▼                      ▼
                            ┌─────────────────┐    ┌─────────────────┐
                            │ Android Device  │    │   iOS Device    │
                            └─────────────────┘    └─────────────────┘
                                     │                      │
                                     └──────────┬───────────┘
                                                │
                                                ▼
                               ┌────────────────────────────────┐
                               │   HOLI LABS MOBILE APP         │
                               │   (React Native + Expo)        │
                               │                                │
                               │  • NotificationService         │
                               │  • Deep Link Handler           │
                               │  • Badge Manager               │
                               │  • Navigation System           │
                               └────────────────────────────────┘
```

---

## 2. Notification Flow Sequence

```
User Action (Web)                Backend                    Expo Push Service       Mobile App (Offline User)
      │                             │                              │                         │
      │  1. Comments on Template    │                              │                         │
      ├─────────────────────────────▶                              │                         │
      │                             │                              │                         │
      │                          2. Create                         │                         │
      │                          Comment in DB                     │                         │
      │                             │                              │                         │
      │                          3. Emit Socket.IO                 │                         │
      │                          Event (Real-time)                 │                         │
      │                             │────────────┐                 │                         │
      │                             │            │                 │                         │
      │                             │         4. Also              │                         │
      │                             │         Send Push            │                         │
      │                             ├────────────────────────────▶ │                         │
      │                             │                              │                         │
      │                             │                           5. Route to                  │
      │                             │                           FCM/APNs                     │
      │                             │                              ├─────────────────────────▶
      │                             │                              │                         │
      │                             │                              │                    6. Receive
      │                             │                              │                    Notification
      │                             │                              │                         │
      │                             │                              │                    7. Show on
      │                             │                              │                    Lock Screen
      │                             │                              │                         │
      │                             │                              │  8. User Taps           │
      │                             │                              │  Notification           │
      │                             │                              │ ◀───────────────────────┤
      │                             │                              │                         │
      │                             │                              │                    9. Open App
      │                             │                              │                    Parse Deep Link
      │                             │                              │                         │
      │                             │                              │                    10. Navigate to
      │                             │                              │                    Template Detail
      │                             │                              │                    Scroll to Comment
      │                             │                              │                         │
```

---

## 3. Deep Linking Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION PAYLOAD                                               │
│  {                                                                  │
│    "title": "New Comment",                                          │
│    "body": "Someone commented on your template",                    │
│    "data": {                                                        │
│      "deepLink": "holilabs://prevention/templates/abc-123?comment=xyz-789"
│    }                                                                │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ User taps notification
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  REACT NAVIGATION (linking.ts)                                      │
│                                                                     │
│  subscribe(listener) {                                              │
│    Notifications.addNotificationResponseReceivedListener(           │
│      (response) => {                                                │
│        const url = response.data.deepLink;                          │
│        listener(url);  // Triggers React Navigation                │
│      }                                                              │
│    )                                                                │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Parse URL
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  URL PARSER                                                         │
│                                                                     │
│  holilabs://prevention/templates/abc-123?comment=xyz-789            │
│            │          │         │              │                   │
│            │          │         │              └─ Query Param      │
│            │          │         └─ Template ID                     │
│            │          └─ Screen Path                               │
│            └─ Tab/Stack                                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Map to navigation params
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  NAVIGATION CALL                                                    │
│                                                                     │
│  navigation.navigate('PreventionTab', {                             │
│    screen: 'TemplateDetail',                                        │
│    params: {                                                        │
│      templateId: 'abc-123',                                         │
│      scrollToComment: 'xyz-789'                                     │
│    }                                                                │
│  });                                                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Navigate and render
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TEMPLATE DETAIL SCREEN                                             │
│                                                                     │
│  useEffect(() => {                                                  │
│    if (params.scrollToComment) {                                    │
│      // Find comment position                                       │
│      scrollViewRef.current?.scrollTo({ y: position });              │
│      // Highlight comment                                           │
│    }                                                                │
│  }, [params.scrollToComment]);                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Notification Priority Matrix

```
╔════════════════════════════════════════════════════════════════════╗
║                    NOTIFICATION PRIORITY LEVELS                     ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  URGENT (MAX)                                                      ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │  • System critical alerts                                    │  ║
║  │  • Emergency notifications                                   │  ║
║  │  Sound: LOUD | Vibrate: CONTINUOUS | Badge: YES             │  ║
║  │  Bypasses DND: YES                                           │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
║  HIGH                                                              ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │  • @Mentions in comments                                     │  ║
║  │  • Reminders due soon                                        │  ║
║  │  Sound: DEFAULT | Vibrate: PATTERN | Badge: YES             │  ║
║  │  Bypasses DND: NO                                            │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
║  MEDIUM (DEFAULT)                                                  ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │  • Comments added                                            │  ║
║  │  • Template shared                                           │  ║
║  │  • Reminders created                                         │  ║
║  │  • Bulk operations complete                                  │  ║
║  │  Sound: DEFAULT | Vibrate: NO | Badge: YES                  │  ║
║  │  Bypasses DND: NO                                            │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
║  LOW                                                               ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │  • Template updated                                          │  ║
║  │  • General system notifications                              │  ║
║  │  Sound: NONE | Vibrate: NO | Badge: YES                     │  ║
║  │  Bypasses DND: NO                                            │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## 5. Data Flow - Socket.IO to Push Notification

```
┌─────────────────────────────────────────────────────────────────────┐
│  EVENT TRIGGER (Backend)                                            │
│  • User comments on template                                        │
│  • Template is shared                                               │
│  • Reminder is created                                              │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SOCKET.IO SERVER (server.ts)                                       │
│                                                                     │
│  emitToUser(userId, SocketEvent.COMMENT_ADDED, {                    │
│    id: 'comment-123',                                               │
│    templateId: 'template-456',                                      │
│    content: 'This is a comment',                                    │
│    mentions: ['user-789']                                           │
│  })                                                                 │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ├──────────────────────┬──────────────────────────────┐
              │                      │                              │
              ▼                      ▼                              ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  ONLINE USERS        │  │  OFFLINE USERS       │  │  DATABASE LOG        │
│  (Socket.IO)         │  │  (Push Notification) │  │  (Audit Trail)       │
│                      │  │                      │  │                      │
│  Receive event       │  │  Push sent via Expo  │  │  Store delivery      │
│  immediately         │  │  Delivered to device │  │  status              │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

---

## 6. Push Notification Service Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  PushNotificationService                                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  convertSocketToPush(event, notification)                    │   │
│  │  ├─ Analyze event type                                       │   │
│  │  ├─ Generate HIPAA-compliant title/body                      │   │
│  │  ├─ Create deep link URL                                     │   │
│  │  ├─ Set priority based on urgency                            │   │
│  │  └─ Return push payload                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  sendPushNotification(userIds, event, notification)          │   │
│  │  ├─ Fetch push tokens from database                          │   │
│  │  ├─ Check user preferences (enabled/disabled types)          │   │
│  │  ├─ Check Do Not Disturb settings                            │   │
│  │  ├─ Convert to push payload                                  │   │
│  │  ├─ Batch notifications (chunks of 100)                      │   │
│  │  ├─ Send to Expo Push Service                                │   │
│  │  └─ Log delivery status                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  registerPushToken(userId, token, deviceId, platform)        │   │
│  │  ├─ Validate Expo token format                               │   │
│  │  ├─ Upsert token in database                                 │   │
│  │  └─ Update last_active timestamp                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  handlePushTickets(tickets, userIds)                         │   │
│  │  ├─ Parse delivery receipts                                  │   │
│  │  ├─ Update delivery status in database                       │   │
│  │  ├─ Handle DeviceNotRegistered errors                        │   │
│  │  └─ Retry failed deliveries                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Mobile App Notification Handling

```
┌─────────────────────────────────────────────────────────────────────┐
│  NotificationService (Mobile)                                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  initialize()                                                 │   │
│  │  ├─ Check device (physical required)                         │   │
│  │  ├─ Request permissions                                       │   │
│  │  ├─ Get Expo push token                                      │   │
│  │  ├─ Configure Android channels                               │   │
│  │  └─ Setup listeners                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  setupListeners()                                             │   │
│  │  ├─ Foreground: addNotificationReceivedListener()            │   │
│  │  │   └─ Update in-app notification center                    │   │
│  │  │   └─ Increment badge count                                │   │
│  │  └─ Tap: addNotificationResponseReceivedListener()           │   │
│  │      └─ Parse deep link                                      │   │
│  │      └─ Check authentication                                 │   │
│  │      └─ Navigate to screen                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  handleNotificationTap(notification, navigation)              │   │
│  │  ├─ Extract deep link from data                              │   │
│  │  ├─ Parse URL (holilabs://prevention/templates/123)          │   │
│  │  ├─ Validate authentication                                  │   │
│  │  ├─ Navigate to target screen                                │   │
│  │  └─ Update badge count                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. User Preferences & DND Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER NOTIFICATION PREFERENCES                                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Notification Types:                                         │   │
│  │  ☑ Mentions              [ON]   HIGH Priority                │   │
│  │  ☑ Comments              [ON]   MEDIUM Priority              │   │
│  │  ☑ Template Shared       [ON]   MEDIUM Priority              │   │
│  │  ☐ Template Updated      [OFF]  LOW Priority                 │   │
│  │  ☑ Reminders             [ON]   MEDIUM/HIGH Priority         │   │
│  │  ☑ Bulk Operations       [ON]   MEDIUM Priority              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Do Not Disturb:                                             │   │
│  │  Start Time:  22:00                                          │   │
│  │  End Time:    08:00                                          │   │
│  │  Allow Urgent: [ON]  (Urgent notifications bypass DND)       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION FILTER (Backend)                                      │
│                                                                     │
│  Before sending push notification:                                  │
│  1. Check user preferences (type enabled?)                          │
│  2. Check current time vs DND schedule                              │
│  3. If DND active:                                                  │
│     • Allow if priority = URGENT                                    │
│     • Silent notification otherwise                                 │
│  4. Send notification                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Badge Management Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  BADGE COUNT LIFECYCLE                                              │
│                                                                     │
│  Initial State: Badge = 0                                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Event: Notification Received                                │   │
│  │  Badge Count++                                                │   │
│  │  setBadgeCountAsync(count)                                    │   │
│  │  └─ iOS: Shows on app icon                                   │   │
│  │  └─ Android: Depends on launcher                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Event: User Opens App                                        │   │
│  │  Option 1: Clear badge immediately                            │   │
│  │  Option 2: Keep badge until notifications read               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Event: User Reads Notification                               │   │
│  │  Badge Count--                                                │   │
│  │  setBadgeCountAsync(count)                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Event: "Mark All Read"                                       │   │
│  │  Badge Count = 0                                              │   │
│  │  setBadgeCountAsync(0)                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Error Handling & Retry Logic

```
┌─────────────────────────────────────────────────────────────────────┐
│  SEND NOTIFICATION                                                  │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ▼
        ┌─────────────┐
        │ Send to     │
        │ Expo API    │
        └─────┬───────┘
              │
              ├──────────────────┬──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
     ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
     │  SUCCESS         │  │  DEVICE NOT     │  │  RATE LIMITED   │
     │  (status: ok)    │  │  REGISTERED     │  │                 │
     └────────┬─────────┘  └────────┬────────┘  └────────┬────────┘
              │                     │                     │
              │                     │                     │
              ▼                     ▼                     ▼
     ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
     │  Log delivery   │  │  Remove token   │  │  Wait & Retry   │
     │  Update status  │  │  from database  │  │  (exponential   │
     │  "delivered"    │  │  Mark inactive  │  │   backoff)      │
     └─────────────────┘  └─────────────────┘  └────────┬────────┘
                                                         │
                                                         │
                              ┌──────────────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  RETRY LOGIC    │
                     │  Attempt 1: +1s │
                     │  Attempt 2: +2s │
                     │  Attempt 3: +4s │
                     │  Max: 3 retries │
                     └─────────────────┘
```

---

## 11. HIPAA Compliance Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1: BACKEND EVENT                                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Contains PHI:                                                 │  │
│  │  • Patient name: "John Doe"                                    │  │
│  │  • Diagnosis: "Type 2 Diabetes"                                │  │
│  │  • Lab result: "A1C: 7.2%"                                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ TRANSFORMATION
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2: PUSH NOTIFICATION PAYLOAD (Visible on Lock Screen)        │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Contains NO PHI:                                              │  │
│  │  • Title: "New Comment"                                        │  │
│  │  • Body: "Someone commented on your template"                  │  │
│  │  ✓ HIPAA COMPLIANT                                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ USER TAPS NOTIFICATION
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 3: AUTHENTICATION CHECK                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Before showing PHI:                                           │  │
│  │  • Verify JWT token valid                                      │  │
│  │  • Check session not expired                                   │  │
│  │  • Re-authenticate if needed (Face ID / PIN)                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ AUTHENTICATED
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 4: SECURE SCREEN DISPLAY                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Now show PHI:                                                 │  │
│  │  • Template details                                            │  │
│  │  • Comment content                                             │  │
│  │  • Patient information                                         │  │
│  │  ✓ Within secure app environment                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 12. Testing Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  TESTING PHASES                                                     │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ├───────────────────┬───────────────────┬────────────────┐
              │                   │                   │                │
              ▼                   ▼                   ▼                ▼
     ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
     │  UNIT TESTS     │  │  INTEGRATION    │  │  DEVICE      │  │  HIPAA       │
     │                 │  │  TESTS          │  │  TESTING     │  │  COMPLIANCE  │
     └────────┬────────┘  └────────┬────────┘  └──────┬───────┘  └──────┬───────┘
              │                    │                   │                 │
              ▼                    ▼                   ▼                 ▼
     ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
     │ • Payload       │  │ • Backend sends │  │ • iOS device │  │ • No PHI in  │
     │   generation    │  │   to Expo API   │  │ • Android    │  │   title/body │
     │ • Deep link     │  │ • Socket.IO +   │  │   device     │  │ • Audit logs │
     │   parsing       │  │   Push both     │  │ • Lock screen│  │ • Encryption │
     │ • Badge count   │  │   triggered     │  │ • Tap flow   │  │   verified   │
     │                 │  │ • Token stored  │  │ • Navigation │  │              │
     └─────────────────┘  └─────────────────┘  └──────────────┘  └──────────────┘
```

---

**Document Version**: 1.0
**Created**: December 14, 2025
**Purpose**: Visual reference for push notification architecture
