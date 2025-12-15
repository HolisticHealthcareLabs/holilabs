# Phase 7 Mobile API Reference

**Last Updated:** 2025-12-14
**Target:** iOS & Android Mobile Applications
**Base URL:** `https://api.holilabs.xyz` (Production) | `http://localhost:3000` (Development)

## Table of Contents

1. [Authentication](#authentication)
2. [Prevention Plan Templates](#prevention-plan-templates)
3. [Template Versioning](#template-versioning)
4. [Template Comments & Collaboration](#template-comments--collaboration)
5. [Template Sharing](#template-sharing)
6. [Prevention Plans](#prevention-plans)
7. [Reminder Integration](#reminder-integration)
8. [Bulk Operations](#bulk-operations)
9. [WebSocket Events](#websocket-events)
10. [Error Handling](#error-handling)

---

## Authentication

All API requests require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

The mobile app should use the existing authentication flow (likely NextAuth/Supabase Auth).

---

## Prevention Plan Templates

### 1. GET `/api/prevention/templates`

Retrieve all prevention plan templates with filtering and pagination.

**Query Parameters:**
- `planType` (optional): Filter by plan type (e.g., "DIABETES", "CARDIOVASCULAR")
- `isActive` (optional): "true" or "false"
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search template names

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "clx123...",
        "templateName": "Standard Diabetes Prevention Plan",
        "planType": "DIABETES",
        "description": "Comprehensive diabetes prevention...",
        "guidelineSource": "ADA",
        "evidenceLevel": "Grade A",
        "targetPopulation": "Adults with prediabetes",
        "goals": [
          {
            "goal": "Achieve 7% weight loss",
            "category": "Lifestyle",
            "timeframe": "6 months",
            "priority": "HIGH"
          }
        ],
        "recommendations": [
          {
            "title": "Metformin therapy",
            "description": "Consider metformin for high-risk patients",
            "category": "Medication",
            "priority": "MEDIUM"
          }
        ],
        "isActive": true,
        "useCount": 45,
        "createdBy": "user123",
        "createdAt": "2025-01-15T10:00:00.000Z",
        "updatedAt": "2025-03-20T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasMore": true
    }
  }
}
```

---

### 2. GET `/api/prevention/templates/:id`

Retrieve a single template by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "template": {
      "id": "clx123...",
      "templateName": "Standard Diabetes Prevention Plan",
      // ... full template details
    }
  }
}
```

---

### 3. POST `/api/prevention/templates`

Create a new prevention plan template.

**Request Body:**
```json
{
  "templateName": "Custom Prevention Plan",
  "planType": "DIABETES",
  "description": "Custom plan for...",
  "guidelineSource": "ADA",
  "evidenceLevel": "Grade A",
  "targetPopulation": "Adults 40-65 with BMI > 30",
  "goals": [
    {
      "goal": "Reduce HbA1c by 1%",
      "category": "Clinical",
      "timeframe": "3 months",
      "priority": "HIGH"
    }
  ],
  "recommendations": [
    {
      "title": "Dietary modification",
      "description": "Mediterranean diet",
      "category": "Lifestyle",
      "priority": "HIGH"
    }
  ],
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "template": {
      "id": "clx456...",
      "templateName": "Custom Prevention Plan",
      // ... created template
    }
  }
}
```

---

### 4. PUT `/api/prevention/templates/:id`

Update a prevention plan template (automatically creates a version).

**Request Body:**
```json
{
  "templateName": "Updated Template Name",
  "goals": [...],
  "createVersion": true,  // Optional: default true
  "versionLabel": "v2.0", // Optional
  "changeLog": "Updated goals based on new guidelines" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "template": {
      "id": "clx123...",
      // ... updated template
    },
    "version": {
      "id": "clx789...",
      "versionNumber": 2
    },
    "changedFields": ["templateName", "goals"]
  }
}
```

---

### 5. DELETE `/api/prevention/templates/:id`

Delete a prevention plan template.

**Response:**
```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

---

## Template Versioning

### 1. GET `/api/prevention/templates/:id/versions`

Retrieve all versions of a template (for version history timeline).

**Query Parameters:**
- `limit` (optional): Number of versions to retrieve (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "id": "clx789...",
        "templateId": "clx123...",
        "versionNumber": 2,
        "versionLabel": "v2.0",
        "changeLog": "Updated goals based on new ADA guidelines",
        "changedFields": ["goals", "guidelineSource"],
        "createdBy": "user123",
        "createdByName": "Dr. Smith",
        "createdAt": "2025-03-20T14:30:00.000Z"
      },
      {
        "id": "clx456...",
        "versionNumber": 1,
        "versionLabel": "v1.0",
        "changeLog": "Initial version",
        "changedFields": [],
        "createdBy": "user123",
        "createdByName": "Dr. Smith",
        "createdAt": "2025-01-15T10:00:00.000Z"
      }
    ],
    "count": 2,
    "templateName": "Standard Diabetes Prevention Plan"
  }
}
```

---

### 2. GET `/api/prevention/templates/:id/versions/:versionId`

Retrieve a specific version's full data.

**Response:**
```json
{
  "success": true,
  "data": {
    "version": {
      "id": "clx789...",
      "templateId": "clx123...",
      "versionNumber": 2,
      "versionLabel": "v2.0",
      "templateData": {
        "templateName": "Standard Diabetes Prevention Plan",
        "goals": [...],
        "recommendations": [...]
        // Complete template snapshot
      },
      "changeLog": "Updated goals based on new guidelines",
      "changedFields": ["goals"],
      "createdBy": "user123",
      "createdAt": "2025-03-20T14:30:00.000Z"
    }
  }
}
```

---

### 3. POST `/api/prevention/templates/:id/versions`

Manually create a version snapshot (optional - versions are auto-created on update).

**Request Body:**
```json
{
  "versionLabel": "Before major refactor",
  "changeLog": "Snapshot before implementing new guidelines",
  "changedFields": [] // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "version": {
      "id": "clx999...",
      "versionNumber": 3,
      // ... version details
    }
  }
}
```

---

### 4. POST `/api/prevention/templates/:id/compare`

Compare two versions side-by-side.

**Request Body:**
```json
{
  "versionId1": "clx456...",  // Older version
  "versionId2": "clx789..."   // Newer version
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "comparison": {
      "version1": {
        "id": "clx456...",
        "versionNumber": 1,
        "versionLabel": "v1.0",
        "createdAt": "2025-01-15T10:00:00.000Z"
      },
      "version2": {
        "id": "clx789...",
        "versionNumber": 2,
        "versionLabel": "v2.0",
        "createdAt": "2025-03-20T14:30:00.000Z"
      },
      "differences": [
        {
          "field": "templateName",
          "oldValue": "Diabetes Prevention",
          "newValue": "Standard Diabetes Prevention Plan",
          "changed": true
        },
        {
          "field": "goals",
          "oldValue": [{goal: "Weight loss 5%"}],
          "newValue": [{goal: "Weight loss 7%"}],
          "changed": true
        },
        {
          "field": "description",
          "oldValue": "Basic plan",
          "newValue": "Basic plan",
          "changed": false
        }
      ],
      "summary": {
        "totalFields": 9,
        "changedFields": 2,
        "unchangedFields": 7
      }
    }
  }
}
```

---

### 5. POST `/api/prevention/templates/:id/revert`

Revert template to a previous version.

**Request Body:**
```json
{
  "versionId": "clx456...",
  "createSnapshot": true  // Optional: create snapshot before reverting (default: true)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "template": {
      "id": "clx123...",
      // ... reverted template
    },
    "preRevertSnapshot": {
      "id": "clx888...",
      "versionNumber": 4,
      "versionLabel": "Pre-revert snapshot (v4)"
    },
    "revertedToVersion": {
      "id": "clx456...",
      "versionNumber": 1
    }
  },
  "message": "Template reverted to version 1"
}
```

---

## Template Comments & Collaboration

### 1. GET `/api/prevention/templates/:id/comments`

Retrieve all comments for a template.

**Query Parameters:**
- `limit` (optional): Number of comments (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "clc123...",
        "templateId": "clx123...",
        "userId": "user456",
        "user": {
          "id": "user456",
          "firstName": "Jane",
          "lastName": "Doe",
          "email": "jane@example.com",
          "profilePictureUrl": "https://..."
        },
        "content": "Great template! @user789 what do you think about the timeframe?",
        "mentions": ["user789"],
        "createdAt": "2025-03-21T09:15:00.000Z",
        "updatedAt": "2025-03-21T09:15:00.000Z"
      }
    ],
    "count": 15,
    "hasMore": true
  }
}
```

---

### 2. POST `/api/prevention/templates/:id/comments`

Add a comment to a template.

**Request Body:**
```json
{
  "content": "This template needs updating @user789",
  "mentions": ["user789"]  // Optional: array of user IDs mentioned
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "comment": {
      "id": "clc456...",
      "templateId": "clx123...",
      "userId": "user123",
      "user": {
        "id": "user123",
        "firstName": "John",
        "lastName": "Smith",
        "email": "john@example.com",
        "profilePictureUrl": null
      },
      "content": "This template needs updating @user789",
      "mentions": ["user789"],
      "createdAt": "2025-03-21T10:30:00.000Z",
      "updatedAt": "2025-03-21T10:30:00.000Z"
    }
  },
  "message": "Comment added successfully"
}
```

**Note:** When a user is @mentioned, they receive a HIGH priority push notification.

---

### 3. PUT `/api/prevention/templates/:id/comments/:commentId`

Update a comment (only by comment author).

**Request Body:**
```json
{
  "content": "Updated comment text",
  "mentions": ["user789", "user555"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "comment": {
      "id": "clc456...",
      // ... updated comment
    }
  }
}
```

---

### 4. DELETE `/api/prevention/templates/:id/comments/:commentId`

Delete a comment (only by comment author or template owner).

**Response:**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

---

## Template Sharing

### 1. GET `/api/prevention/templates/:id/share`

Retrieve all users who have access to this template.

**Response:**
```json
{
  "success": true,
  "data": {
    "shares": [
      {
        "id": "cls123...",
        "templateId": "clx123...",
        "sharedWith": {
          "id": "user456",
          "firstName": "Jane",
          "lastName": "Doe",
          "email": "jane@example.com",
          "profilePictureUrl": null
        },
        "sharedBy": {
          "id": "user123",
          "firstName": "John",
          "lastName": "Smith"
        },
        "permission": "EDIT",
        "message": "Please review and provide feedback",
        "createdAt": "2025-03-18T14:00:00.000Z",
        "expiresAt": null
      }
    ],
    "count": 5,
    "isOwner": true
  }
}
```

---

### 2. POST `/api/prevention/templates/:id/share`

Share a template with another user.

**Request Body:**
```json
{
  "userId": "user456",
  "permission": "VIEW",  // "VIEW", "EDIT", or "ADMIN"
  "message": "Please review this template",  // Optional
  "expiresAt": "2025-12-31T23:59:59.000Z"  // Optional expiration
}
```

**Permission Levels:**
- `VIEW`: Can only view the template
- `EDIT`: Can view and edit the template
- `ADMIN`: Can view, edit, share, and delete the template

**Response:**
```json
{
  "success": true,
  "data": {
    "share": {
      "id": "cls456...",
      "templateId": "clx123...",
      "sharedWith": "user456",
      "sharedBy": "user123",
      "permission": "VIEW",
      "message": "Please review this template",
      "createdAt": "2025-03-21T11:00:00.000Z",
      "expiresAt": "2025-12-31T23:59:59.000Z"
    }
  },
  "message": "Template shared successfully"
}
```

**Note:** The shared user receives a push notification about the new share.

---

### 3. PUT `/api/prevention/templates/:id/share/:userId`

Update sharing permissions for a user.

**Request Body:**
```json
{
  "permission": "EDIT"  // New permission level
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "share": {
      "id": "cls456...",
      "permission": "EDIT",
      // ... updated share
    }
  }
}
```

---

### 4. DELETE `/api/prevention/templates/:id/share?userId=user456`

Remove access for a user (revoke share).

**Query Parameters:**
- `userId` (required): User ID to remove access from

**Response:**
```json
{
  "success": true,
  "message": "Access removed successfully"
}
```

---

### 5. GET `/api/prevention/templates/shared-with-me`

Retrieve all templates shared with the current user.

**Query Parameters:**
- `permission` (optional): Filter by permission level
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "sharedTemplates": [
      {
        "id": "clx789...",
        "templateName": "Cardiovascular Prevention",
        "planType": "CARDIOVASCULAR",
        "sharedBy": {
          "firstName": "Alice",
          "lastName": "Johnson"
        },
        "permission": "EDIT",
        "sharedAt": "2025-03-15T10:00:00.000Z",
        "expiresAt": null
      }
    ],
    "pagination": {...}
  }
}
```

---

## Prevention Plans

### 1. GET `/api/prevention/plans/:patientId`

Retrieve all prevention plans for a patient.

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "clp123...",
        "patientId": "pat456...",
        "planName": "Cardiovascular Prevention Plan",
        "planType": "CARDIOVASCULAR",
        "goals": [...],
        "recommendations": [...],
        "status": "ACTIVE",
        "activatedAt": "2025-03-01T08:00:00.000Z",
        "createdAt": "2025-03-01T08:00:00.000Z"
      }
    ]
  }
}
```

---

## Reminder Integration

### 1. GET `/api/prevention/plans/:planId/reminders`

Retrieve all reminders associated with a prevention plan.

**Response:**
```json
{
  "success": true,
  "data": {
    "planId": "clp123...",
    "planName": "Cardiovascular Prevention Plan",
    "patientId": "pat456...",
    "reminders": [
      {
        "id": "clr123...",
        "title": "Blood pressure screening",
        "description": "Reminder auto-generated from prevention plan",
        "screeningType": "BLOOD_PRESSURE",
        "dueDate": "2025-06-01T00:00:00.000Z",
        "priority": "HIGH",
        "status": "DUE",
        "goalIndex": 0,
        "goalInfo": {
          "goal": "Monitor blood pressure monthly",
          "timeframe": "3 months",
          "status": "in_progress"
        },
        "createdAt": "2025-03-01T08:00:00.000Z"
      }
    ],
    "summary": {
      "total": 5,
      "due": 3,
      "completed": 2,
      "overdue": 1
    }
  }
}
```

---

### 2. POST `/api/prevention/plans/:planId/reminders/auto-generate`

Auto-generate reminders from a prevention plan's goals.

**Response:**
```json
{
  "success": true,
  "data": {
    "planId": "clp123...",
    "planName": "Diabetes Prevention Plan",
    "patient": {
      "id": "pat456...",
      "firstName": "John",
      "lastName": "Doe"
    },
    "created": [
      {
        "id": "clr456...",
        "goalIndex": 0,
        "goal": "Achieve 7% weight loss",
        "dueDate": "2025-09-01T00:00:00.000Z"
      },
      {
        "id": "clr789...",
        "goalIndex": 1,
        "goal": "Reduce HbA1c below 5.7%",
        "dueDate": "2025-06-01T00:00:00.000Z"
      }
    ],
    "skipped": [
      {
        "index": 2,
        "reason": "Reminder already exists",
        "goal": "Monthly nutrition counseling"
      }
    ],
    "summary": {
      "totalGoals": 3,
      "remindersCreated": 2,
      "goalsSkipped": 1
    }
  },
  "message": "2 reminders created successfully"
}
```

---

## Bulk Operations

### 1. POST `/api/prevention/templates/bulk/activate`

Bulk activate templates.

**Request Body:**
```json
{
  "templateIds": ["clx123...", "clx456...", "clx789..."]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activated": 3,
    "failed": 0,
    "templateIds": ["clx123...", "clx456...", "clx789..."]
  },
  "message": "3 templates activated successfully"
}
```

---

### 2. POST `/api/prevention/templates/bulk/deactivate`

Bulk deactivate templates.

**Request Body:**
```json
{
  "templateIds": ["clx123...", "clx456..."]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deactivated": 2,
    "failed": 0
  }
}
```

---

### 3. POST `/api/prevention/templates/bulk/delete`

Bulk delete templates.

**Request Body:**
```json
{
  "templateIds": ["clx123...", "clx456..."]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": 2,
    "failed": 0
  }
}
```

---

### 4. POST `/api/prevention/templates/bulk/duplicate`

Bulk duplicate templates.

**Request Body:**
```json
{
  "templateIds": ["clx123...", "clx456..."]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "created": [
      {
        "originalId": "clx123...",
        "newId": "clx999...",
        "newTemplateName": "Standard Diabetes Prevention Plan (Copy)"
      },
      {
        "originalId": "clx456...",
        "newId": "clx888...",
        "newTemplateName": "Cardiovascular Plan (Copy)"
      }
    ],
    "count": 2
  }
}
```

---

## WebSocket Events

Connect to WebSocket for real-time updates:

```javascript
import io from 'socket.io-client';

const socket = io('https://api.holilabs.xyz', {
  auth: {
    token: yourJwtToken
  }
});

// Join prevention room
socket.emit('join_prevention_room');

// Listen for events
socket.on('prevention_event', (notification) => {
  console.log('Prevention event:', notification);
});
```

### Event Types:

1. **TEMPLATE_UPDATED**
   - Fired when a template is updated
   - Contains template ID, user info, timestamp

2. **TEMPLATE_CREATED**
   - Fired when a new template is created

3. **TEMPLATE_DELETED**
   - Fired when a template is deleted

4. **TEMPLATE_SHARED**
   - Fired when a template is shared with you
   - Priority: MEDIUM

5. **COMMENT_ADDED**
   - Fired when a comment is added to a template you own/have access to
   - Priority: MEDIUM (HIGH if you're mentioned)

6. **VERSION_CREATED**
   - Fired when a new version is created

7. **REMINDER_CREATED**
   - Fired when reminders are auto-generated
   - Priority: MEDIUM

8. **BULK_OPERATION_COMPLETED**
   - Fired when bulk operations complete

### Notification Payload Structure:

```json
{
  "id": "not123...",
  "event": "COMMENT_ADDED",
  "title": "New Comment",
  "message": "Dr. Smith commented on 'Diabetes Prevention Plan'",
  "priority": "HIGH",
  "data": {
    "templateId": "clx123...",
    "commentId": "clc456...",
    "userId": "user123",
    "timestamp": "2025-03-21T10:30:00.000Z"
  },
  "timestamp": "2025-03-21T10:30:00.000Z"
}
```

---

## Error Handling

All API endpoints follow this error response structure:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### Common Error Codes:

- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists or conflict
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Examples:

**Missing Authentication:**
```json
{
  "success": false,
  "error": "Unauthorized",
  "statusCode": 401
}
```

**Insufficient Permissions:**
```json
{
  "success": false,
  "error": "Only owner or admin can share templates",
  "statusCode": 403
}
```

**Resource Not Found:**
```json
{
  "success": false,
  "error": "Template not found",
  "statusCode": 404
}
```

---

## API Client Example (React Query)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.holilabs.xyz',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = getAuthToken(); // Your auth token retrieval method
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Fetch templates
export function useTemplates(filters) {
  return useQuery({
    queryKey: ['templates', filters],
    queryFn: () => api.get('/api/prevention/templates', { params: filters })
      .then(res => res.data.data),
  });
}

// Fetch version history
export function useVersionHistory(templateId) {
  return useQuery({
    queryKey: ['versions', templateId],
    queryFn: () => api.get(`/api/prevention/templates/${templateId}/versions`)
      .then(res => res.data.data),
    enabled: !!templateId,
  });
}

// Add comment mutation
export function useAddComment(templateId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.post(
      `/api/prevention/templates/${templateId}/comments`,
      data
    ),
    onSuccess: () => {
      // Invalidate and refetch comments
      queryClient.invalidateQueries(['comments', templateId]);
    },
  });
}

// Share template mutation
export function useShareTemplate(templateId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.post(
      `/api/prevention/templates/${templateId}/share`,
      data
    ),
    onSuccess: () => {
      queryClient.invalidateQueries(['shares', templateId]);
    },
  });
}

// Revert to version mutation
export function useRevertVersion(templateId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId) => api.post(
      `/api/prevention/templates/${templateId}/revert`,
      { versionId, createSnapshot: true }
    ),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      queryClient.invalidateQueries(['template', templateId]);
      queryClient.invalidateQueries(['versions', templateId]);
    },
  });
}
```

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authenticated requests:** 100 requests per minute per user
- **Bulk operations:** 10 requests per minute per user
- **WebSocket connections:** 1 connection per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1679424000
```

---

## Pagination

All list endpoints support pagination via query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Pagination response:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasMore": true
  }
}
```

---

## Data Types Reference

### PreventionPlanType Enum
- `DIABETES`
- `CARDIOVASCULAR`
- `CANCER_SCREENING`
- `OBESITY`
- `HYPERTENSION`
- `GENERAL_WELLNESS`
- `CUSTOM`

### SharePermission Enum
- `VIEW` - Read-only access
- `EDIT` - Can view and modify
- `ADMIN` - Full control (view, edit, share, delete)

### PreventionPlanStatus Enum
- `ACTIVE` - Currently active plan
- `COMPLETED` - Plan completed successfully
- `DEACTIVATED` - Plan deactivated/cancelled
- `DRAFT` - Plan in draft state

### PreventiveCareStatus Enum
- `DUE` - Screening is due
- `SCHEDULED` - Screening is scheduled
- `COMPLETED` - Screening completed
- `DISMISSED` - Screening dismissed

### Priority Enum
- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

### NotificationPriority Enum
- `LOW` - Background updates
- `MEDIUM` - Standard notifications
- `HIGH` - Important notifications (mentions, urgent updates)

---

## Testing the API

You can test the API using curl or tools like Postman:

```bash
# Get all templates
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.holilabs.xyz/api/prevention/templates

# Create a comment
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Great template!"}' \
  https://api.holilabs.xyz/api/prevention/templates/clx123.../comments

# Share a template
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user456", "permission": "EDIT"}' \
  https://api.holilabs.xyz/api/prevention/templates/clx123.../share
```

---

## Mobile-Specific Considerations

### 1. Offline Support
- Use React Query's persistence layer to cache API responses
- Implement optimistic updates for better UX
- Queue mutations when offline and sync when back online

### 2. Performance Optimization
- Use pagination for long lists
- Implement infinite scroll for template lists
- Cache frequently accessed data (templates, user info)
- Lazy load images and heavy content

### 3. Push Notifications
- Request notification permissions on app startup
- Handle deep links from notifications
- Update badge counts based on unread notifications
- Test on both iOS (APNS) and Android (FCM)

### 4. Error Handling
- Show user-friendly error messages
- Implement retry logic for failed requests
- Handle token expiration gracefully
- Provide offline indicators

### 5. Security
- Store JWT tokens in secure storage (Expo SecureStore)
- Implement biometric authentication
- Clear sensitive data on logout
- Use HTTPS for all API requests

---

**End of API Reference**

For additional support, contact the API team or refer to the web implementation at:
- `/apps/web/src/app/api/prevention/**/*.ts`
