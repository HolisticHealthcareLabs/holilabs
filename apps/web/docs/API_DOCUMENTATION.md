# Holi Labs API Documentation

Complete API reference for the Holi Labs healthcare platform.

## Base URL

```
Production: https://holilabs-lwp6y.ondigitalocean.app
Development: http://localhost:3000
```

## Authentication

### Clinician Authentication (NextAuth/Supabase)

Include session token in requests:

```bash
# Browser: Automatically included via cookie
# API: Include in Authorization header
Authorization: Bearer <session-token>
```

### Patient Authentication (JWT)

```bash
# Include JWT token in cookie or Authorization header
Cookie: patient-session=<jwt-token>
# OR
Authorization: Bearer <jwt-token>
```

---

## Health & Monitoring

### GET /api/health

Basic health check.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-11T04:41:00.000Z"
}
```

### GET /api/health/live

**Liveness probe** - Checks if application is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-11T04:41:00.000Z",
  "uptime": 3600,
  "pid": 12345,
  "nodeVersion": "v20.0.0",
  "platform": "linux",
  "arch": "x64",
  "memory": {
    "rss": "150MB",
    "heapTotal": "80MB",
    "heapUsed": "45MB",
    "external": "5MB"
  }
}
```

### GET /api/health/ready

**Readiness probe** - Checks if application can serve traffic.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-11T04:41:00.000Z",
  "responseTime": "150ms",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": "50ms",
      "required": true
    },
    "redis": {
      "status": "healthy",
      "responseTime": "20ms",
      "required": false
    },
    "supabase": {
      "status": "healthy",
      "responseTime": "80ms",
      "required": false
    }
  }
}
```

**Status Codes:**
- `200` - Ready to serve traffic
- `503` - Not ready (required service unhealthy)

---

## Push Notifications

### POST /api/push/subscribe

Subscribe to push notifications.

**Authentication:** Required (Clinician or Patient)

**Request:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BDjeg3nfNw...",
    "auth": "B2xvXD5UpeKQ..."
  },
  "enabledTypes": ["APPOINTMENT_REMINDER", "NEW_MESSAGE"]
}
```

**Response:**
```json
{
  "success": true,
  "subscriptionId": "clx1234567890",
  "message": "Push subscription saved successfully"
}
```

### DELETE /api/push/subscribe

Unsubscribe from push notifications.

**Authentication:** Required

**Request:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Push subscription removed successfully"
}
```

### POST /api/push/send

Send push notification to user(s).

**Authentication:** Required (Clinician only)

**Request:**
```json
{
  "userId": "clx1234567890",
  "title": "Appointment Reminder",
  "body": "You have an appointment with Dr. Smith in 30 minutes",
  "icon": "https://example.com/icon.png",
  "badge": "https://example.com/badge.png",
  "data": {
    "type": "APPOINTMENT_REMINDER",
    "appointmentId": "apt123"
  },
  "actions": [
    { "action": "view", "title": "View Details" },
    { "action": "dismiss", "title": "Dismiss" }
  ],
  "requireInteraction": true,
  "tag": "appointment-apt123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Push notifications sent: 2 successful, 0 failed",
  "stats": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

**Error Responses:**
- `404` - No subscriptions found
- `503` - VAPID keys not configured

---

## Patients

### GET /api/patients

Get list of patients.

**Authentication:** Required (Clinician)

**Query Parameters:**
- `search` (optional) - Search by name, MRN, or token ID
- `limit` (optional) - Results per page (default: 20)
- `offset` (optional) - Pagination offset

**Response:**
```json
{
  "patients": [
    {
      "id": "clx1234567890",
      "tokenId": "PT-892a-4f3e-b1c2",
      "firstName": "María",
      "lastName": "González",
      "dateOfBirth": "1985-03-15T00:00:00.000Z",
      "mrn": "MRN-001",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

### GET /api/patients/:id

Get patient by ID.

**Authentication:** Required

**Response:**
```json
{
  "id": "clx1234567890",
  "tokenId": "PT-892a-4f3e-b1c2",
  "firstName": "María",
  "lastName": "González",
  "dateOfBirth": "1985-03-15T00:00:00.000Z",
  "gender": "female",
  "email": "maria@example.com",
  "phone": "+52 555 1234 5678",
  "mrn": "MRN-001",
  "isActive": true,
  "medications": [...],
  "appointments": [...],
  "documents": [...]
}
```

### POST /api/patients

Create new patient.

**Authentication:** Required (Clinician)

**Request:**
```json
{
  "firstName": "María",
  "lastName": "González",
  "dateOfBirth": "1985-03-15",
  "gender": "female",
  "email": "maria@example.com",
  "phone": "+52 555 1234 5678",
  "address": "123 Main St",
  "city": "Mexico City",
  "state": "CDMX",
  "postalCode": "01000",
  "country": "MX"
}
```

**Response:**
```json
{
  "id": "clx1234567890",
  "tokenId": "PT-892a-4f3e-b1c2",
  "mrn": "MRN-001",
  ...
}
```

### PATCH /api/patients/:id

Update patient information.

**Authentication:** Required (Clinician)

**Request:**
```json
{
  "email": "new-email@example.com",
  "phone": "+52 555 9876 5432"
}
```

---

## Appointments

### GET /api/appointments

Get list of appointments.

**Authentication:** Required

**Query Parameters:**
- `clinicianId` (optional) - Filter by clinician
- `patientId` (optional) - Filter by patient
- `status` (optional) - Filter by status
- `startDate` (optional) - Filter by start date (ISO 8601)
- `endDate` (optional) - Filter by end date

**Response:**
```json
{
  "appointments": [
    {
      "id": "apt123",
      "patientId": "clx1234567890",
      "clinicianId": "usr456",
      "title": "Follow-up Consultation",
      "description": "Post-surgery follow-up",
      "startTime": "2025-10-15T10:00:00.000Z",
      "endTime": "2025-10-15T10:30:00.000Z",
      "type": "IN_PERSON",
      "status": "SCHEDULED",
      "patient": {
        "firstName": "María",
        "lastName": "González",
        "tokenId": "PT-892a-4f3e-b1c2"
      }
    }
  ]
}
```

### POST /api/appointments

Create new appointment.

**Authentication:** Required (Clinician)

**Request:**
```json
{
  "patientId": "clx1234567890",
  "clinicianId": "usr456",
  "title": "Follow-up Consultation",
  "description": "Post-surgery follow-up",
  "startTime": "2025-10-15T10:00:00.000Z",
  "endTime": "2025-10-15T10:30:00.000Z",
  "type": "IN_PERSON",
  "timezone": "America/Mexico_City"
}
```

---

## Messages

### GET /api/messages

Get messages for current user.

**Authentication:** Required

**Query Parameters:**
- `patientId` (optional) - Filter by patient
- `limit` (optional) - Results per page
- `offset` (optional) - Pagination offset

**Response:**
```json
{
  "messages": [
    {
      "id": "msg123",
      "fromUserId": "usr456",
      "fromUserType": "CLINICIAN",
      "toUserId": "clx1234567890",
      "toUserType": "PATIENT",
      "subject": "Lab Results Available",
      "body": "Your recent lab results are now available...",
      "readAt": null,
      "createdAt": "2025-10-11T10:00:00.000Z"
    }
  ]
}
```

### POST /api/messages

Send new message.

**Authentication:** Required

**Request:**
```json
{
  "toUserId": "clx1234567890",
  "toUserType": "PATIENT",
  "patientId": "clx1234567890",
  "subject": "Lab Results",
  "body": "Your lab results are ready for review.",
  "attachments": [
    {
      "fileName": "lab-results.pdf",
      "fileUrl": "https://...",
      "fileType": "application/pdf",
      "fileSize": 102400
    }
  ]
}
```

---

## Documents

### POST /api/upload

Upload document for patient.

**Authentication:** Required (Clinician)

**Request:** `multipart/form-data`
```
file: <binary>
patientId: clx1234567890
documentType: LAB_RESULTS
```

**Response:**
```json
{
  "id": "doc123",
  "fileName": "lab-results.pdf",
  "fileType": "pdf",
  "fileSize": 102400,
  "documentType": "LAB_RESULTS",
  "storageUrl": "https://...",
  "processingStatus": "PROCESSING",
  "documentHash": "abc123...",
  "createdAt": "2025-10-11T10:00:00.000Z"
}
```

### GET /api/documents/:id

Get document details.

**Authentication:** Required

**Response:**
```json
{
  "id": "doc123",
  "patientId": "clx1234567890",
  "fileName": "lab-results.pdf",
  "fileType": "pdf",
  "fileSize": 102400,
  "documentType": "LAB_RESULTS",
  "storageUrl": "https://...",
  "processingStatus": "COMPLETED",
  "isDeidentified": true,
  "ocrText": "Extracted text...",
  "documentHash": "abc123...",
  "createdAt": "2025-10-11T10:00:00.000Z"
}
```

---

## Authentication

### POST /api/auth/patient/magic-link/send

Send magic link to patient email.

**Request:**
```json
{
  "email": "patient@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Magic link sent to your email"
}
```

### GET /api/auth/patient/magic-link/verify

Verify magic link token.

**Query Parameters:**
- `token` - Magic link token

**Response:**
Sets `patient-session` cookie and redirects to patient portal.

### POST /api/auth/patient/otp/send

Send OTP code to patient phone.

**Request:**
```json
{
  "phone": "+52 555 1234 5678",
  "channel": "SMS"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your phone",
  "expiresAt": "2025-10-11T10:10:00.000Z"
}
```

### POST /api/auth/patient/otp/verify

Verify OTP code.

**Request:**
```json
{
  "phone": "+52 555 1234 5678",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone verified successfully"
}
```

---

## Rate Limiting

All endpoints are rate-limited:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| File Upload | 10 requests | 1 minute |
| Messages | 30 requests | 1 minute |
| Search | 20 requests | 1 minute |
| General API | 100 requests | 1 minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696987200
```

**429 Response:**
```json
{
  "error": "Too many requests. Please try again later."
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "message": "Detailed error description",
  "code": "ERROR_CODE"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Authentication required |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found |
| `409` | Conflict - Resource already exists |
| `422` | Unprocessable Entity - Validation error |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |
| `503` | Service Unavailable |

---

## Webhooks

### POST /api/webhooks/calendar

Receive calendar integration events.

**Headers:**
```
X-Webhook-Signature: <signature>
```

**Payload:**
```json
{
  "event": "event.created",
  "data": {
    "eventId": "evt123",
    "summary": "Patient Appointment",
    "start": "2025-10-15T10:00:00.000Z",
    "end": "2025-10-15T10:30:00.000Z"
  }
}
```

---

## Testing

### Postman Collection

Import the Postman collection for easy API testing:

```bash
# TODO: Add Postman collection export
```

### cURL Examples

**Health Check:**
```bash
curl https://holilabs-lwp6y.ondigitalocean.app/api/health
```

**Get Patients (with auth):**
```bash
curl -H "Authorization: Bearer <token>" \
  https://holilabs-lwp6y.ondigitalocean.app/api/patients
```

**Send Push Notification:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "clx123",
    "title": "Test",
    "body": "Test notification"
  }' \
  https://holilabs-lwp6y.ondigitalocean.app/api/push/send
```

---

## SDK Support

### JavaScript/TypeScript

```typescript
import { HoliLabsClient } from '@holi-labs/sdk';

const client = new HoliLabsClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://holilabs-lwp6y.ondigitalocean.app',
});

// Get patients
const patients = await client.patients.list();

// Send message
await client.messages.send({
  toUserId: 'clx123',
  subject: 'Test',
  body: 'Test message',
});
```

_Note: SDK coming soon_

---

## Support

For API support:
- Email: dev@holilabs.com
- Docs: https://docs.holilabs.com
- Status: https://status.holilabs.com
