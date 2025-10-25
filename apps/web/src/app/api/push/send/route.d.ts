/**
 * Push Notification Sending API
 *
 * POST /api/push/send - Send push notification to user(s)
 *
 * IMPORTANT: This endpoint requires VAPID keys in environment variables:
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - VAPID_SUBJECT (mailto:admin@yourdomain.com)
 */
export declare const dynamic = "force-dynamic";
/**
 * POST /api/push/send
 * Send push notification to specific user or all subscribed users
 *
 * Request body:
 * {
 *   "userId": "optional-user-id", // If omitted, sends to all users
 *   "title": "Notification title",
 *   "body": "Notification body",
 *   "icon": "https://...",
 *   "data": { "type": "APPOINTMENT_REMINDER", "appointmentId": "123" }
 * }
 */
export declare const POST: any;
//# sourceMappingURL=route.d.ts.map