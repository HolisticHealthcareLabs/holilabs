# Push Notification Payload Reference
**Quick Reference Guide for Holi Labs Push Notifications**

---

## Payload Structure Template

```typescript
{
  // Expo Push Notification Fields
  to: string,                    // ExponentPushToken[xxxxxx] or array of tokens
  title: string,                 // Notification title (max 65 chars)
  body: string,                  // Notification body (max 240 chars)
  data?: object,                 // Custom data payload
  sound?: 'default' | null,      // Sound to play
  badge?: number,                // Badge count
  priority?: 'default' | 'normal' | 'high',
  channelId?: string,            // Android notification channel

  // iOS Specific
  expiration?: number,           // Unix timestamp
  subtitle?: string,             // iOS subtitle
  _displayInForeground?: boolean,

  // Android Specific
  ttl?: number,                  // Time to live in seconds
}
```

---

## Notification Type Payloads

### 1. Comment Added (Not Mentioned)

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "New Comment",
  "body": "Someone commented on your template",
  "priority": "normal",
  "channelId": "collaboration",
  "badge": 1,
  "data": {
    "type": "COMMENT_ADDED",
    "templateId": "a3b5c7d9-1234-5678-90ab-cdef12345678",
    "commentId": "e4f6g8h0-9876-5432-10dc-ba9876543210",
    "userId": "user-uuid",
    "userName": "Dr. Smith",
    "priority": "medium",
    "timestamp": "2025-12-14T10:30:00Z",
    "deepLink": "holilabs://prevention/templates/a3b5c7d9-1234-5678-90ab-cdef12345678?comment=e4f6g8h0-9876-5432-10dc-ba9876543210"
  }
}
```

**Screen Flow**:
1. User taps notification
2. App opens to Prevention Tab
3. Navigates to Template Detail
4. Scrolls to specific comment
5. Highlights comment

---

### 2. User @Mentioned (HIGH Priority)

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "You Were Mentioned",
  "body": "Someone mentioned you in a comment",
  "priority": "high",
  "channelId": "mentions",
  "badge": 1,
  "data": {
    "type": "MENTION",
    "templateId": "a3b5c7d9-1234-5678-90ab-cdef12345678",
    "commentId": "e4f6g8h0-9876-5432-10dc-ba9876543210",
    "mentionedBy": "user-uuid",
    "mentionedByName": "Dr. Johnson",
    "priority": "high",
    "timestamp": "2025-12-14T10:35:00Z",
    "deepLink": "holilabs://prevention/templates/a3b5c7d9-1234-5678-90ab-cdef12345678?comment=e4f6g8h0-9876-5432-10dc-ba9876543210&highlight=mention"
  }
}
```

**Screen Flow**:
1. User taps notification
2. App opens to Prevention Tab
3. Navigates to Template Detail
4. Scrolls to comment with @mention
5. Highlights mention and animates attention

**Special Handling**:
- Vibration pattern on Android
- Critical alert sound on iOS (if permitted)
- Cannot be silenced by notification preferences

---

### 3. Template Shared

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "Template Shared",
  "body": "A prevention template has been shared with you",
  "priority": "normal",
  "channelId": "collaboration",
  "badge": 1,
  "data": {
    "type": "TEMPLATE_SHARED",
    "templateId": "b4c6d8e0-2345-6789-01bc-def123456789",
    "templateName": "Diabetes Prevention Protocol",
    "permission": "EDIT",
    "sharedBy": "user-uuid",
    "sharedByName": "Dr. Williams",
    "priority": "medium",
    "timestamp": "2025-12-14T11:00:00Z",
    "deepLink": "holilabs://prevention/templates/b4c6d8e0-2345-6789-01bc-def123456789"
  }
}
```

**Screen Flow**:
1. User taps notification
2. App opens to Prevention Tab
3. Shows Template Detail with "New Shared Template" badge
4. Displays permission level (VIEW/EDIT/ADMIN)

**Permission Types**:
- `VIEW`: Read-only access
- `EDIT`: Can modify template content
- `ADMIN`: Can modify and share with others

---

### 4. Template Updated (Silent/Low Priority)

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": null,
  "title": "Template Updated",
  "body": "A shared template has been updated",
  "priority": "low",
  "channelId": "updates",
  "badge": 1,
  "data": {
    "type": "TEMPLATE_UPDATED",
    "templateId": "c5d7e9f1-3456-7890-12cd-ef1234567890",
    "templateName": "Hypertension Management",
    "updatedBy": "user-uuid",
    "updatedByName": "Dr. Chen",
    "changesSummary": "Modified 3 goals, added 2 reminders",
    "priority": "low",
    "timestamp": "2025-12-14T12:00:00Z",
    "deepLink": "holilabs://prevention/templates/c5d7e9f1-3456-7890-12cd-ef1234567890?view=changes"
  }
}
```

**Screen Flow**:
1. User taps notification
2. App opens to Prevention Tab
3. Shows Template Detail
4. Automatically displays "What's Changed" view
5. Shows diff/changelog of modifications

**Special Handling**:
- Silent notification (no sound)
- Can be batched (multiple updates = single notification)
- Users can disable in preferences

---

### 5. Reminder Created

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "New Reminder",
  "body": "A prevention plan reminder has been created",
  "priority": "normal",
  "channelId": "reminders",
  "badge": 1,
  "data": {
    "type": "REMINDER_CREATED",
    "reminderId": "d6e8f0g2-4567-8901-23de-f12345678901",
    "planId": "plan-uuid",
    "planName": "Annual Wellness Visit - Smith, John",
    "reminderText": "Follow up on lab results",
    "dueDate": "2025-12-20T10:00:00Z",
    "priority": "medium",
    "timestamp": "2025-12-14T13:00:00Z",
    "deepLink": "holilabs://prevention/plans/plan-uuid?reminder=d6e8f0g2-4567-8901-23de-f12345678901"
  }
}
```

**Screen Flow**:
1. User taps notification
2. App opens to Prevention Tab
3. Shows Prevention Plan Detail
4. Scrolls to Reminders section
5. Highlights newly created reminder

**Due Date Handling**:
- If due date is within 24 hours: Show urgency indicator
- If overdue: Show red warning badge
- If completed: Don't show notification

---

### 6. Reminder Due Soon (Scheduled)

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "Reminder Due Soon",
  "body": "You have a prevention plan reminder due in 1 hour",
  "priority": "high",
  "channelId": "reminders",
  "badge": 1,
  "data": {
    "type": "REMINDER_DUE",
    "reminderId": "d6e8f0g2-4567-8901-23de-f12345678901",
    "planId": "plan-uuid",
    "reminderText": "Follow up on lab results",
    "dueDate": "2025-12-14T15:00:00Z",
    "minutesUntilDue": 60,
    "priority": "high",
    "timestamp": "2025-12-14T14:00:00Z",
    "deepLink": "holilabs://prevention/plans/plan-uuid?reminder=d6e8f0g2-4567-8901-23de-f12345678901"
  }
}
```

**Scheduling Logic**:
- 24 hours before: First reminder
- 1 hour before: Second reminder
- At due time: Final reminder
- Can be snoozed by user

---

### 7. Bulk Operation Completed (Success)

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "Bulk Operation Complete",
  "body": "Your bulk operation has finished processing",
  "priority": "normal",
  "channelId": "operations",
  "badge": 1,
  "data": {
    "type": "BULK_OPERATION_COMPLETED",
    "operationId": "e7f9g1h3-5678-9012-34ef-123456789012",
    "operationType": "TEMPLATE_ACTIVATION",
    "success": true,
    "itemsProcessed": 50,
    "itemsFailed": 0,
    "duration": 45000,
    "priority": "medium",
    "timestamp": "2025-12-14T14:30:00Z",
    "deepLink": "holilabs://prevention/activity?operation=e7f9g1h3-5678-9012-34ef-123456789012"
  }
}
```

**Operation Types**:
- `TEMPLATE_ACTIVATION`: Activating multiple templates
- `PLAN_GENERATION`: Generating prevention plans for multiple patients
- `BULK_UPDATE`: Updating multiple records
- `BULK_DELETE`: Deleting multiple items

**Screen Flow**:
1. User taps notification
2. App opens to Prevention Tab
3. Shows Activity Log
4. Filters to specific operation
5. Shows detailed results and any errors

---

### 8. Bulk Operation Failed

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "Bulk Operation Failed",
  "body": "Your bulk operation encountered an error",
  "priority": "normal",
  "channelId": "operations",
  "badge": 1,
  "data": {
    "type": "BULK_OPERATION_FAILED",
    "operationId": "f8g0h2i4-6789-0123-45fg-234567890123",
    "operationType": "PLAN_GENERATION",
    "success": false,
    "itemsProcessed": 23,
    "itemsFailed": 27,
    "errorMessage": "Database connection timeout",
    "priority": "medium",
    "timestamp": "2025-12-14T15:00:00Z",
    "deepLink": "holilabs://prevention/activity?operation=f8g0h2i4-6789-0123-45fg-234567890123"
  }
}
```

**Error Handling**:
- Shows detailed error log in Activity screen
- Allows retry of failed items
- Exports error report for debugging

---

## Deep Link URL Patterns

### Prevention Templates
```
holilabs://prevention/templates
  → Template List Screen

holilabs://prevention/templates/{templateId}
  → Template Detail Screen

holilabs://prevention/templates/{templateId}?comment={commentId}
  → Template Detail → Scroll to Comment

holilabs://prevention/templates/{templateId}?comment={commentId}&highlight=mention
  → Template Detail → Scroll to Comment → Highlight @mention

holilabs://prevention/templates/{templateId}?view=changes
  → Template Detail → Show Change Log
```

### Prevention Plans
```
holilabs://prevention/plans
  → Plans List Screen

holilabs://prevention/plans/{planId}
  → Plan Detail Screen

holilabs://prevention/plans/{planId}?reminder={reminderId}
  → Plan Detail → Reminders Tab → Highlight Reminder
```

### Activity & Operations
```
holilabs://prevention/activity
  → Activity Log Screen

holilabs://prevention/activity?operation={operationId}
  → Activity Log → Filter to Operation
```

---

## Android Notification Channels

| Channel ID | Name | Importance | Sound | Vibrate | Badge |
|-----------|------|------------|-------|---------|-------|
| `mentions` | Mentions | HIGH | ✓ | ✓ | ✓ |
| `collaboration` | Collaboration | DEFAULT | ✓ | ✗ | ✓ |
| `reminders` | Reminders | DEFAULT | ✓ | ✗ | ✓ |
| `operations` | Operations | DEFAULT | ✓ | ✗ | ✓ |
| `updates` | Updates | LOW | ✗ | ✗ | ✓ |

**User Control**: Users can customize each channel's behavior in Android settings.

---

## Priority Mapping

| Priority | Expo | iOS | Android | Use Case |
|----------|------|-----|---------|----------|
| LOW | `low` | Passive | LOW | Template updates |
| MEDIUM | `normal` | Active | DEFAULT | Comments, reminders |
| HIGH | `high` | Time-Sensitive | HIGH | Mentions, urgent |
| URGENT | `high` | Critical | MAX | Emergency alerts |

---

## Badge Count Logic

Badge count represents total unread notifications:

```typescript
// Calculate badge count
const badgeCount = notifications.filter(n => !n.read).length;

// Update badge
await Notifications.setBadgeCountAsync(badgeCount);

// Clear badge when all notifications read
await Notifications.setBadgeCountAsync(0);
```

**Platform Differences**:
- **iOS**: Badge appears on app icon automatically
- **Android**: Badge behavior depends on launcher (not all launchers support badges)

---

## Sound Guidelines

| Notification Type | Sound | Rationale |
|------------------|-------|-----------|
| Mentions | `default` | Needs attention |
| Comments | `default` | Standard notification |
| Template Shared | `default` | Standard notification |
| Template Updated | `null` (silent) | Low priority, informational |
| Reminders | `default` | Needs attention |
| Bulk Operations | `default` | Standard notification |

**Custom Sounds**: Can be added later for branding (e.g., "holilabs_notification.wav")

---

## HIPAA Compliance Checklist

### ✅ COMPLIANT Examples
```json
"title": "New Comment"
"body": "Someone commented on your template"

"title": "Template Shared"
"body": "A prevention template has been shared with you"

"title": "New Reminder"
"body": "A prevention plan reminder has been created"
```

### ❌ NON-COMPLIANT Examples
```json
// ❌ Contains patient name
"body": "New comment on John Doe's diabetes plan"

// ❌ Contains diagnosis
"body": "Reminder: Follow up on diabetes screening for patient 12345"

// ❌ Contains medical details
"body": "Lab results for hemoglobin A1C are ready: 7.2%"
```

### Key Rules
1. **No patient names** in title or body
2. **No diagnoses** or medical conditions
3. **No lab results** or clinical data
4. **No appointment times** with patient context
5. **Generic language only** in visible notification

**Safe Data Location**: All PHI must be in the `data` field (encrypted at rest, never displayed on lock screen)

---

## Testing Payloads

### Send Test Notification (Expo Push Tool)

Use Expo's push notification tool: https://expo.dev/notifications

```json
{
  "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
  "title": "Test Notification",
  "body": "This is a test notification from Holi Labs",
  "data": {
    "type": "TEST",
    "deepLink": "holilabs://prevention/templates"
  }
}
```

### cURL Example

```bash
curl -H "Content-Type: application/json" -X POST https://exp.host/--/api/v2/push/send -d '{
  "to": "ExponentPushToken[YOUR_TOKEN]",
  "title": "Test",
  "body": "Testing push notifications",
  "data": {"type": "TEST"}
}'
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `DeviceNotRegistered` | Token expired or app uninstalled | Remove token from database |
| `InvalidCredentials` | Invalid Expo credentials | Check EXPO_ACCESS_TOKEN |
| `MessageTooBig` | Payload exceeds 4KB | Reduce data field size |
| `MessageRateExceeded` | Sending too fast | Implement batching |

### Example Error Response
```json
{
  "data": [
    {
      "status": "error",
      "message": "\"ExponentPushToken[xxx]\" is not a registered push notification recipient",
      "details": {
        "error": "DeviceNotRegistered"
      }
    }
  ]
}
```

**Handling Strategy**:
1. Log error to database
2. Mark token as inactive
3. Don't retry `DeviceNotRegistered` errors
4. Retry other errors up to 3 times with exponential backoff

---

## Performance Optimization

### Batching Recommendations

```typescript
// BAD: Sending one by one
for (const user of users) {
  await sendNotification(user.pushToken, payload);
}

// GOOD: Batching
const messages = users.map(user => ({
  to: user.pushToken,
  ...payload
}));

const chunks = expo.chunkPushNotifications(messages);
for (const chunk of chunks) {
  await expo.sendPushNotificationsAsync(chunk);
}
```

**Batch Size**: 100 notifications per chunk (Expo recommendation)

### Rate Limits

- **Expo Free Tier**: Unlimited push notifications
- **API Rate Limit**: ~1000 requests/second
- **Best Practice**: Use batching for >100 notifications

---

## Debugging Tips

### 1. Check Token Validity
```typescript
import { Expo } from 'expo-server-sdk';

if (!Expo.isExpoPushToken(token)) {
  console.error('Invalid push token:', token);
}
```

### 2. Test on Physical Device
Push notifications don't work on simulators/emulators. Always test on:
- Physical iPhone
- Physical Android device

### 3. Check Permissions
```typescript
const { status } = await Notifications.getPermissionsAsync();
console.log('Notification permissions:', status);
```

### 4. Monitor Delivery Receipts
```typescript
const receipts = await expo.getPushNotificationReceiptsAsync(receiptIds);
for (const [id, receipt] of Object.entries(receipts)) {
  console.log('Receipt:', id, receipt);
}
```

---

## Quick Reference Card

| Notification Type | Priority | Sound | Badge | Channel |
|------------------|----------|-------|-------|---------|
| Comment Added | MEDIUM | ✓ | ✓ | collaboration |
| @Mention | HIGH | ✓ | ✓ | mentions |
| Template Shared | MEDIUM | ✓ | ✓ | collaboration |
| Template Updated | LOW | ✗ | ✓ | updates |
| Reminder Created | MEDIUM | ✓ | ✓ | reminders |
| Reminder Due | HIGH | ✓ | ✓ | reminders |
| Bulk Complete | MEDIUM | ✓ | ✓ | operations |
| Bulk Failed | MEDIUM | ✓ | ✓ | operations |

---

**Document Version**: 1.0
**Last Updated**: December 14, 2025
