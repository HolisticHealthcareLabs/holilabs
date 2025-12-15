# Invitation System Implementation Guide

## Overview
This document describes the implementation of the Invitation Code, Beta Signup, and Signup Counter systems for Holi Labs.

## Models Implemented

### 1. InvitationCode
Located in: `/apps/web/prisma/schema.prisma` (lines 5264-5286)

**Purpose**: Manage invitation codes for beta access and friend/family invitations.

**Fields**:
- `id`: Unique identifier (CUID)
- `code`: Unique invitation code (e.g., "HOLI-12ABC-XYZ9")
- `email`: Optional - ties code to specific email
- `role`: Optional - target role for signup
- `expiresAt`: Expiration timestamp
- `maxUses`: Maximum number of uses (default: 1)
- `uses`: Current usage count
- `isActive`: Enable/disable code
- `createdBy`: Admin user who created the code
- `createdAt`, `updatedAt`: Audit timestamps

**Relations**:
- `createdByUser`: Reference to User who created it
- `users`: Array of Users who used this code

**Indexes**:
- `[code, expiresAt]` - Fast lookup and expiration check
- `[createdBy]` - Track codes by creator

### 2. BetaSignup
Located in: `/apps/web/prisma/schema.prisma` (lines 5288-5321)

**Purpose**: Track beta program signups, approvals, and conversions.

**Fields**:
- `id`: Unique identifier
- `email`: Unique email address
- `fullName`: User's full name
- `organization`: Optional organization
- `role`: Requested role (DOCTOR, NURSE, ADMIN, etc.)
- `country`: Country of origin
- `referralSource`: How they heard about us
- `interests`: JSON array of interest areas
- `status`: pending | approved | rejected | converted
- `approvedAt`: Approval timestamp
- `convertedAt`: Conversion to full user timestamp
- `approvedBy`: Admin who approved
- `notified`: Email notification sent flag
- `emailsSent`: Count of emails sent
- `lastEmailAt`: Last email timestamp

**Indexes**:
- `[email]` - Unique email lookup
- `[status, createdAt]` - Filter by status and date
- `[approvedAt]` - Track approvals

### 3. SignupCounter
Located in: `/apps/web/prisma/schema.prisma` (lines 5323-5348)

**Purpose**: Track daily signup metrics and analytics.

**Fields**:
- `id`: Unique identifier
- `date`: Unique daily timestamp
- `signups`: Total signups for the day
- `conversions`: Beta to full user conversions
- `invitations`: Invitation codes sent
- `doctorSignups`: Doctor role signups
- `nurseSignups`: Nurse role signups
- `adminSignups`: Admin role signups
- `organicSignups`: Signups without invite code
- `referralSignups`: Signups with invite code

**Index**:
- `[date]` - Fast daily lookup

### 4. User Model Updates
Located in: `/apps/web/prisma/schema.prisma` (lines 106-109)

**New Fields**:
- `invitationCodeId`: Optional reference to InvitationCode
- `invitationCode`: Relation to InvitationCode used during signup
- `createdInvitations`: Array of invitation codes created by this user

## API Endpoints

### 1. Admin Invitations API
**File**: `/apps/web/src/app/api/admin/invitations/route.ts`

#### GET `/api/admin/invitations`
List all invitation codes with usage statistics.

**Authentication**: Requires `Authorization: Bearer {ADMIN_API_KEY}`

**Response**:
```json
{
  "codes": [
    {
      "id": "clxxx...",
      "code": "HOLI-12ABC-XYZ9",
      "email": "friend@example.com",
      "role": "DOCTOR",
      "expiresAt": "2025-01-15T00:00:00.000Z",
      "maxUses": 1,
      "uses": 0,
      "isActive": true,
      "createdBy": {
        "id": "clxxx...",
        "email": "admin@holilabs.com",
        "name": "Admin User"
      },
      "usersCount": 0,
      "createdAt": "2024-12-14T00:00:00.000Z"
    }
  ],
  "first100Count": 45,
  "first100Remaining": 55
}
```

#### POST `/api/admin/invitations`
Create a new invitation code.

**Authentication**: Requires `Authorization: Bearer {ADMIN_API_KEY}`

**Request Body**:
```json
{
  "email": "friend@example.com",
  "role": "DOCTOR",
  "maxUses": 1,
  "expiresInDays": 30,
  "createdBy": "clxxx..." // Admin user ID
}
```

**Response**:
```json
{
  "success": true,
  "code": {
    "id": "clxxx...",
    "code": "HOLI-12ABC-XYZ9",
    "email": "friend@example.com",
    "role": "DOCTOR",
    "expiresAt": "2025-01-15T00:00:00.000Z",
    "maxUses": 1,
    "uses": 0,
    "isActive": true,
    "createdBy": {...},
    "createdAt": "2024-12-14T00:00:00.000Z"
  }
}
```

#### DELETE `/api/admin/invitations`
Deactivate an invitation code.

**Authentication**: Requires `Authorization: Bearer {ADMIN_API_KEY}`

**Request Body**:
```json
{
  "code": "HOLI-12ABC-XYZ9"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Código desactivado exitosamente",
  "code": {
    "id": "clxxx...",
    "code": "HOLI-12ABC-XYZ9",
    "isActive": false
  }
}
```

### 2. Beta Signup API
**File**: `/apps/web/src/app/api/beta-signup/route.ts`

#### POST `/api/beta-signup`
Submit a beta signup request.

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "fullName": "John Doe",
  "organization": "Example Clinic",
  "role": "DOCTOR",
  "country": "US",
  "referralSource": "Google",
  "interests": ["CDSS", "AI Scribe"],
  "inviteCode": "HOLI-12ABC-XYZ9"
}
```

**Response (with invite code)**:
```json
{
  "success": true,
  "message": "¡Bienvenido! Tu acceso ha sido aprobado.",
  "signup": {
    "id": "clxxx...",
    "email": "newuser@example.com",
    "status": "approved"
  }
}
```

**Response (without invite code)**:
```json
{
  "success": true,
  "message": "Te hemos agregado a la lista de espera. Te notificaremos pronto.",
  "signup": {
    "id": "clxxx...",
    "email": "newuser@example.com",
    "status": "pending"
  }
}
```

**Error Responses**:
```json
{
  "error": "Por favor proporciona un email válido"
}

{
  "error": "Este email ya está registrado en la lista beta"
}

{
  "error": "Código de invitación inválido"
}

{
  "error": "Este código de invitación ha expirado"
}
```

## Validation Schema
**File**: `/apps/web/src/lib/validations/invitation.ts`

Provides Zod schemas for type-safe validation:
- `createInvitationCodeSchema`
- `deactivateInvitationCodeSchema`
- `betaSignupSchema`
- `approveBetaSignupSchema`
- `validateInvitationCode()` helper function

## Database Migration

### Automatic Migration (when database is available)
```bash
cd apps/web
npx prisma migrate dev --name add-invitation-beta-models
npx prisma generate
```

### Manual Migration
If automatic migration fails, run the SQL file:
```bash
psql -U your_user -d holi_protocol -f prisma/migration_add_invitation_beta_models.sql
```

**Migration File**: `/apps/web/prisma/migration_add_invitation_beta_models.sql`

This creates:
- `invitation_codes` table
- `beta_signups` table
- `signup_counters` table
- `invitationCodeId` column in `users` table
- All necessary indexes and foreign keys

## Features Implemented

### Invitation Code System
1. **Code Generation**: Automatic unique code generation (format: HOLI-{timestamp}-{random})
2. **Validation**: Checks for:
   - Active status
   - Expiration date
   - Usage limits
   - Email-specific codes
3. **Usage Tracking**: Increments usage count on signup
4. **Admin Control**: Create, list, and deactivate codes

### Beta Signup Flow
1. **Validation**: Email format, required fields, duplicate prevention
2. **Invite Code Support**: Optional invite code for instant approval
3. **Auto-Approval**: With valid invite code, status = "approved"
4. **Waitlist**: Without invite code, status = "pending"
5. **Metrics Tracking**: Updates daily signup counters

### Analytics & Counters
1. **Daily Metrics**: Tracks signups, conversions, invitations by day
2. **Role Breakdown**: Separate counters for doctors, nurses, admins
3. **Source Tracking**: Organic vs. referral signups
4. **First 100 Counter**: Tracks initial user milestone

## Usage Examples

### Create an Invitation Code (Admin)
```typescript
const response = await fetch('/api/admin/invitations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'friend@example.com',
    role: 'DOCTOR',
    maxUses: 1,
    expiresInDays: 30,
    createdBy: currentAdminUserId,
  }),
});
```

### Beta Signup with Invite Code
```typescript
const response = await fetch('/api/beta-signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'newuser@example.com',
    fullName: 'John Doe',
    role: 'DOCTOR',
    inviteCode: 'HOLI-12ABC-XYZ9',
  }),
});
```

### Query Prisma Directly
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Find pending beta signups
const pendingSignups = await prisma.betaSignup.findMany({
  where: { status: 'pending' },
  orderBy: { createdAt: 'asc' },
});

// Get today's signup stats
const today = new Date();
today.setHours(0, 0, 0, 0);
const stats = await prisma.signupCounter.findUnique({
  where: { date: today },
});

// Check invitation code validity
const code = await prisma.invitationCode.findUnique({
  where: { code: 'HOLI-12ABC-XYZ9' },
});
```

## Admin UI Considerations

### Invitation Code Management Page
- List all codes with usage stats
- Create new codes with options:
  - Email-specific or open
  - Role targeting
  - Expiration date
  - Max uses (1 or multiple)
- Deactivate codes
- View usage history

### Beta Signup Approval Workflow
- List pending signups
- Filter by role, date, country
- Approve/reject signups
- Send notification emails
- Track conversion to full users

### Analytics Dashboard
- Daily signup trends
- Role breakdown chart
- Organic vs. referral ratio
- First 100 users progress
- Conversion funnel (beta → approved → converted)

## Security Considerations

1. **Admin Authentication**: All admin endpoints require Bearer token
2. **Input Validation**: Zod schemas validate all inputs
3. **Rate Limiting**: Consider adding rate limits to prevent abuse
4. **Email Verification**: Future enhancement for beta signups
5. **Audit Logging**: All actions logged via `logger`

## Testing Checklist

- [ ] Create invitation code without email
- [ ] Create invitation code with email
- [ ] Create invitation code with role
- [ ] Validate expired code (should fail)
- [ ] Validate max uses exceeded (should fail)
- [ ] Validate email mismatch (should fail)
- [ ] Beta signup with valid code (should auto-approve)
- [ ] Beta signup without code (should pend)
- [ ] Beta signup with duplicate email (should fail)
- [ ] Deactivate code
- [ ] List all codes
- [ ] Check daily counter updates
- [ ] Verify indexes created
- [ ] Test foreign key constraints

## Next Steps

1. **Admin UI**: Build React components for invitation management
2. **Email Notifications**: Send welcome emails to approved beta users
3. **Conversion Tracking**: When beta user becomes full user, update `convertedAt`
4. **Bulk Operations**: Generate multiple codes at once
5. **Export Functionality**: Export beta signups to CSV
6. **Analytics Queries**: Pre-built dashboard queries
7. **Webhook Integration**: Notify external systems on signup

## Environment Variables

Add to `.env`:
```env
# Admin API Key for invitation management
ADMIN_API_KEY=your-secret-admin-key-change-me

# Database URL (already configured)
DATABASE_URL=postgresql://...
```

## Support

For questions or issues, contact the development team or check:
- Schema: `/apps/web/prisma/schema.prisma`
- API Routes: `/apps/web/src/app/api/admin/invitations/` and `/apps/web/src/app/api/beta-signup/`
- Validation: `/apps/web/src/lib/validations/invitation.ts`
- Migration: `/apps/web/prisma/migration_add_invitation_beta_models.sql`
