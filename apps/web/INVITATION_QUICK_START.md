# Invitation System - Quick Start Guide

## 🚀 Quick Setup

### 1. Run Migration (Required First!)
```bash
cd apps/web
npx prisma migrate dev --name add-invitation-beta-models
npx prisma generate
```

### 2. Set Environment Variable
Add to `.env`:
```env
ADMIN_API_KEY=your-secret-admin-key-change-me
```

### 3. Start Server
```bash
npm run dev
```

---

## 📋 Common Tasks

### Create an Invitation Code (cURL)
```bash
curl -X POST http://localhost:3000/api/admin/invitations \
  -H "Authorization: Bearer your-secret-admin-key-change-me" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "friend@example.com",
    "role": "DOCTOR",
    "maxUses": 1,
    "expiresInDays": 30,
    "createdBy": "YOUR_ADMIN_USER_ID"
  }'
```

### List All Invitation Codes (cURL)
```bash
curl http://localhost:3000/api/admin/invitations \
  -H "Authorization: Bearer your-secret-admin-key-change-me"
```

### Deactivate a Code (cURL)
```bash
curl -X DELETE http://localhost:3000/api/admin/invitations \
  -H "Authorization: Bearer your-secret-admin-key-change-me" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "HOLI-12ABC-XYZ9"
  }'
```

### Submit Beta Signup (cURL)
```bash
curl -X POST http://localhost:3000/api/beta-signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "fullName": "John Doe",
    "role": "DOCTOR",
    "inviteCode": "HOLI-12ABC-XYZ9"
  }'
```

---

## 💻 Prisma Queries

### Find Pending Beta Signups
```typescript
const pending = await prisma.betaSignup.findMany({
  where: { status: 'pending' },
  orderBy: { createdAt: 'asc' },
});
```

### Get Today's Signup Stats
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
const stats = await prisma.signupCounter.findUnique({
  where: { date: today },
});
console.log(`Signups today: ${stats?.signups || 0}`);
```

### Check Code Validity
```typescript
const code = await prisma.invitationCode.findUnique({
  where: { code: 'HOLI-12ABC-XYZ9' },
});

const isValid = code
  && code.isActive
  && code.uses < code.maxUses
  && new Date() < code.expiresAt;
```

### Approve Beta Signup
```typescript
await prisma.betaSignup.update({
  where: { email: 'user@example.com' },
  data: {
    status: 'approved',
    approvedAt: new Date(),
    approvedBy: adminUserId,
  },
});
```

### Track Conversion to Full User
```typescript
await prisma.betaSignup.update({
  where: { email: 'user@example.com' },
  data: {
    status: 'converted',
    convertedAt: new Date(),
  },
});

// Update counter
const today = new Date();
today.setHours(0, 0, 0, 0);
await prisma.signupCounter.update({
  where: { date: today },
  data: { conversions: { increment: 1 } },
});
```

---

## 🎯 API Endpoints at a Glance

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/invitations` | Admin | List all codes |
| POST | `/api/admin/invitations` | Admin | Create code |
| DELETE | `/api/admin/invitations` | Admin | Deactivate code |
| POST | `/api/beta-signup` | Public | Submit signup |

---

## 🔒 Authentication

Admin endpoints require:
```
Authorization: Bearer YOUR_ADMIN_API_KEY
```

Get your admin API key from `.env`:
```env
ADMIN_API_KEY=your-secret-admin-key-change-me
```

---

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "code": { ... },
  "message": "..."
}
```

### Error Response
```json
{
  "error": "Error message in Spanish"
}
```

---

## 🐛 Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### "Table 'invitation_codes' does not exist"
```bash
npx prisma migrate dev
```

### "Unauthorized"
Check `Authorization` header has correct Bearer token

### "Este email ya está registrado"
Email already used in beta_signups table

### "Código de invitación inválido"
Code doesn't exist, is expired, deactivated, or maxed out

---

## 📈 Monitoring

### Check Logs
Look for these events in your logs:
- `invitation_code_created`
- `invitation_code_deactivated`
- `beta_signup_success`
- `beta_signup_error`

### View in Prisma Studio
```bash
npx prisma studio
```
Then navigate to:
- `invitation_codes`
- `beta_signups`
- `signup_counters`

---

## 🎨 Frontend Integration

### React Hook Example
```typescript
import { useState } from 'react';

export function useBetaSignup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signup = async (data: {
    email: string;
    fullName: string;
    role?: string;
    inviteCode?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }

      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { signup, loading, error };
}
```

### Usage in Component
```typescript
function BetaSignupForm() {
  const { signup, loading, error } = useBetaSignup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    try {
      const result = await signup({
        email: formData.get('email') as string,
        fullName: formData.get('fullName') as string,
        inviteCode: formData.get('inviteCode') as string,
      });

      alert(result.message);
    } catch (err) {
      console.error('Signup error:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="fullName" type="text" required />
      <input name="inviteCode" type="text" placeholder="Optional" />
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Sign Up'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

---

## 🔗 Related Files

- **Schema**: `prisma/schema.prisma`
- **Migration**: `prisma/migration_add_invitation_beta_models.sql`
- **Admin API**: `src/app/api/admin/invitations/route.ts`
- **Beta API**: `src/app/api/beta-signup/route.ts`
- **Validation**: `src/lib/validations/invitation.ts`
- **Full Docs**: `INVITATION_SYSTEM_IMPLEMENTATION.md`

---

## 💡 Tips

1. **First 100 Users**: Track progress via `signup_counters.signups`
2. **Bulk Invites**: Loop POST requests with different emails
3. **Analytics**: Query `signup_counters` for daily trends
4. **Email Campaigns**: Filter `beta_signups` by status='approved' and notified=false
5. **Cleanup**: Deactivate expired codes regularly

---

## 🎓 Best Practices

1. ✅ Always validate invite codes before creating users
2. ✅ Update `convertedAt` when beta user becomes full user
3. ✅ Set `notified=true` after sending welcome email
4. ✅ Use transactions for atomic operations
5. ✅ Log all admin actions for audit trail

---

## 📞 Need Help?

- Full documentation: `INVITATION_SYSTEM_IMPLEMENTATION.md`
- Implementation summary: `AGENT17_IMPLEMENTATION_SUMMARY.md`
- Code examples: Check API route files
