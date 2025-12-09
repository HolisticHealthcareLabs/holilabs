# Invitation System Guide - Holi Labs

## Overview

The invitation system allows you to:
1. **Automatically give free 1-year access to the first 100 signups**
2. **Generate custom invitation codes for friends and family**
3. **Track and manage all invitation codes**

---

## How It Works

### First 100 Signups

- The first 100 people to sign up **automatically** get 1 year of free access
- They don't need any special code
- The system tracks this with a global counter
- Each person gets assigned a sequential number (1-100)

### Friend & Family Codes

- Admins can generate custom invitation codes
- Each code can be configured with:
  - **Max uses**: How many times the code can be used (default: 1)
  - **Expiration**: Optional expiration date
  - **Notes**: Internal notes (e.g., "For Dr. Juan Pérez")
- Anyone with a valid code gets 1 year of free access

---

## For Users

### How to Sign Up

1. Go to `holilabs.xyz`
2. Enter your email in the form
3. **(Optional)** Click "¿Tienes un código de invitación?" to enter a code
4. Click "Prueba Gratis 30 Días"
5. Check your email for access credentials

### What You Get

**If you're in the first 100:**
- 🎉 Automatic 1 year free access
- Email notification: "Eres el usuario #[N] y tienes acceso GRATIS por 1 año"
- Full platform access (not limited demo)

**If you use an invitation code:**
- 🎁 1 year free access
- Email notification: "Tienes acceso GRATIS por 1 año"
- Full platform access

**Regular signup:**
- 30-day free trial
- Then $25 USD/month

---

## For Admins

### Accessing the Admin Panel

1. Go to `holilabs.xyz/admin/invitations`
2. Enter your admin API key
3. Click "Autenticar"

### Admin API Key

Set in your environment variables:

```bash
ADMIN_API_KEY=your-secret-admin-key-change-me
```

**⚠️ IMPORTANT**: Change this to a secure random string in production!

### Generating Invitation Codes

1. Go to the admin panel
2. Fill in the form:
   - **Usos máximos**: How many times the code can be used
   - **Expira en (días)**: Leave empty for no expiration
   - **Notas**: Who this code is for
3. Click "✨ Generar Código"
4. **The code is automatically copied to your clipboard**
5. Share the code with your friend/family

### Managing Codes

The admin panel shows:
- **First 100 counter**: How many of the first 100 spots are taken
- **Active codes**: Codes that can still be used
- **Total uses**: Total number of signups from invitation codes

You can:
- View all codes and their status
- See who used each code
- Deactivate codes

---

## Database Schema

### BetaSignup

Tracks all signups:

```prisma
model BetaSignup {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String    @default("")
  
  // Invitation tracking
  invitationCode  String?   @unique
  usedInviteCode  InvitationCode? @relation(fields: [invitationCode], references: [code])
  
  // First 100 tracking
  signupNumber    Int?      @unique  // 1-100 for first 100
  isFirst100      Boolean   @default(false)
  
  // Free year tracking
  freeYearStart   DateTime?
  freeYearEnd     DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### InvitationCode

Stores all invitation codes:

```prisma
model InvitationCode {
  id              String    @id @default(cuid())
  code            String    @unique @default(cuid())
  
  codeType        InvitationCodeType @default(FRIEND_FAMILY)
  isActive        Boolean   @default(true)
  isUsed          Boolean   @default(false)
  
  maxUses         Int       @default(1)
  usedCount       Int       @default(0)
  
  notes           String?   @db.Text
  
  usedBy          BetaSignup[] @relation("UsedInvites")
  
  createdAt       DateTime  @default(now())
  expiresAt       DateTime?
  usedAt          DateTime?
  updatedAt       DateTime  @updatedAt
}
```

### SignupCounter

Global counter for first 100:

```prisma
model SignupCounter {
  id           String   @id @default("singleton")
  currentCount Int      @default(0)
  updatedAt    DateTime @updatedAt
}
```

---

## API Endpoints

### POST `/api/beta-signup`

Sign up for beta access.

**Request:**
```json
{
  "email": "doctor@example.com",
  "name": "Dr. Juan",
  "inviteCode": "optional-invite-code"
}
```

**Response (first 100):**
```json
{
  "success": true,
  "isFirst100": true,
  "signupNumber": 42,
  "hasFreeYear": true,
  "freeYearEnd": "2026-01-15T00:00:00.000Z",
  "message": "🎉 ¡Felicidades! Eres el usuario #42 y tienes acceso GRATIS por 1 año"
}
```

**Response (with invite code):**
```json
{
  "success": true,
  "isFirst100": false,
  "signupNumber": null,
  "hasFreeYear": true,
  "freeYearEnd": "2026-01-15T00:00:00.000Z",
  "message": "🎁 ¡Acceso GRATIS por 1 año activado! Revisa tu email."
}
```

### GET `/api/admin/invitations`

List all invitation codes (requires admin auth).

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_API_KEY
```

**Response:**
```json
{
  "codes": [...],
  "first100Count": 42,
  "first100Remaining": 58
}
```

### POST `/api/admin/invitations`

Generate a new invitation code (requires admin auth).

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_API_KEY
```

**Request:**
```json
{
  "codeType": "FRIEND_FAMILY",
  "maxUses": 1,
  "notes": "Para Dr. Juan Pérez",
  "expiresInDays": 30
}
```

**Response:**
```json
{
  "success": true,
  "code": "clrx123abc...",
  "data": {...}
}
```

### DELETE `/api/admin/invitations`

Deactivate an invitation code (requires admin auth).

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_API_KEY
```

**Request:**
```json
{
  "code": "clrx123abc..."
}
```

---

## Email Notifications

### For Users

When a user signs up:
- Subject line varies based on status:
  - First 100: "🎁 First [N] - FREE 1 Year Access to Holi Labs"
  - Friend/Family: "🎁 Friend & Family - FREE 1 Year Access to Holi Labs"
  - Regular: "🎉 Welcome to Holi Labs BETA - Instant Access"
- Email includes:
  - Special badge if they have free access
  - Expiration date
  - Dashboard access link
  - Full feature list

### For Admins

Admin receives notification with:
- User email and name
- Signup number (if first 100)
- Invitation code used (if any)
- Free year expiration date
- Dashboard access link

---

## Testing

### Test First 100 Flow

1. Clear the `signup_counter` table (or set count < 100)
2. Sign up with a test email
3. Check you receive "First [N]" email
4. Verify `betaSignup.isFirst100 = true`
5. Verify `betaSignup.signupNumber` is set
6. Verify `betaSignup.freeYearEnd` is 1 year from now

### Test Invitation Code Flow

1. Generate a test code in admin panel
2. Sign up with the code
3. Check you receive "Friend & Family" email
4. Verify `betaSignup.invitationCode` is set
5. Verify `betaSignup.freeYearEnd` is 1 year from now
6. Verify `invitationCode.usedCount` incremented

### Test Code Validation

1. Try using an expired code → Should fail
2. Try using a code at max uses → Should fail
3. Try using an inactive code → Should fail
4. Try using an invalid code → Should fail

---

## Best Practices

1. **Keep admin key secure**: Use environment variables, never commit it
2. **Set expiration dates**: For codes you share publicly
3. **Use descriptive notes**: So you know who each code is for
4. **Monitor usage**: Check the admin panel regularly
5. **Deactivate old codes**: Clean up unused codes

---

## Future Enhancements

Potential additions:
- [ ] Bulk code generation
- [ ] Code usage analytics
- [ ] Email notifications when codes are used
- [ ] Custom free period duration per code
- [ ] Partner/affiliate code types with different permissions
- [ ] Public code redemption page

---

## Support

For issues or questions:
- Email: nicolacapriroloteran@gmail.com
- Admin Panel: `holilabs.xyz/admin/invitations`

---

**Last Updated**: December 8, 2024

