# Authentication Quick Reference Guide

**Last Updated**: December 15, 2025
**Status**: ✅ Production Ready

---

## 🚀 Quick Start

### For Developers:

**Authentication is now required for all protected API routes.**

```typescript
// Use the createProtectedRoute wrapper
import { createProtectedRoute } from '@/lib/api/middleware';

export const GET = createProtectedRoute(
  async (request, context) => {
    // context.user is automatically populated with authenticated user
    const userId = context.user.id;
    const userRole = context.user.role;

    // Your handler logic here
    return NextResponse.json({ data: 'Your data' });
  },
  {
    roles: ['CLINICIAN', 'ADMIN'], // Optional: restrict by role
    rateLimit: { windowMs: 60000, maxRequests: 100 }, // Optional
    audit: { action: 'VIEW', resource: 'patients' }, // Optional
  }
);
```

---

## 🔑 How Authentication Works

### 1. User Login Flow:

```
User → /auth/login → Google OAuth / Credentials
  ↓
NextAuth v5 validates credentials
  ↓
Creates JWT session token
  ↓
Stores in secure cookie
  ↓
Redirects to /dashboard
```

### 2. API Request Flow:

```
Client Request + Session Cookie
  ↓
Middleware: requireAuth()
  ↓
Extract session from cookie
  ↓
Validate JWT signature
  ↓
Lookup user in database
  ↓
Attach user to context
  ↓
API handler processes request
```

---

## 📋 Available Authentication Methods

### Production:

1. **Google OAuth** (Recommended)
   - Automatic user creation
   - Secure token management
   - Single Sign-On

2. **Supabase OAuth** (Optional)
   - Requires configuration
   - See `.env.example`

### Development:

1. **Email-only Login**
   - Any email creates a user
   - Only enabled in `NODE_ENV=development`
   - Visit: http://localhost:3000/auth/login

---

## 🛡️ Security Features

### ✅ Implemented:

- **Real Session Validation**: NextAuth v5 JWT tokens
- **Database Verification**: User must exist in database
- **Role-Based Access Control**: Restrict endpoints by role
- **Audit Logging**: All auth events logged
- **CSRF Protection**: Automatic for protected routes
- **Rate Limiting**: Configurable per endpoint
- **Secure Cookies**: HttpOnly, SameSite, Secure (prod)
- **Session Expiration**: 30 days

---

## 👤 Session Structure

### Session Object:

```typescript
interface Session {
  user: {
    id: string;          // Database user ID
    email: string;       // User email
    firstName: string;   // First name
    lastName: string;    // Last name
    role: UserRole;      // ADMIN | CLINICIAN | NURSE | STAFF | PATIENT
  }
}
```

### Context Object (in API handlers):

```typescript
interface ApiContext {
  requestId?: string;  // For request tracing
  params?: Record<string, string>;  // Route params
  user?: {
    id: string;
    email: string;
    role: string;
  }
}
```

---

## 🔐 Role-Based Access Control

### Available Roles:

```typescript
type UserRole =
  | 'ADMIN'      // Full system access
  | 'CLINICIAN'  // Patient care and records
  | 'NURSE'      // Limited patient care
  | 'STAFF'      // Administrative tasks
  | 'PATIENT';   // Portal access only
```

### Example: Restrict by Role

```typescript
export const GET = createProtectedRoute(
  async (request, context) => {
    // Only ADMIN and CLINICIAN can access
    return NextResponse.json({ data: 'Sensitive data' });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'], // 403 for other roles
  }
);
```

---

## 🧪 Testing Authentication

### Test Unauthenticated Request:

```bash
curl http://localhost:3000/api/patients
```

**Expected**: `401 Unauthorized`

### Test Authenticated Request:

1. Login via browser: http://localhost:3000/auth/login
2. Open DevTools → Application → Cookies
3. Copy `next-auth.session-token` value
4. Make request:

```bash
curl http://localhost:3000/api/patients \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN_HERE"
```

**Expected**: `200 OK` with data

### Test Role Restriction:

```bash
# As CLINICIAN, try to access admin endpoint
curl http://localhost:3000/api/admin/users \
  -H "Cookie: next-auth.session-token=CLINICIAN_TOKEN"
```

**Expected**: `403 Forbidden`

---

## 🔧 Environment Setup

### Required Variables:

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=your-32-character-random-string
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Generate Secret:

```bash
openssl rand -base64 32
```

### Optional Variables:

```bash
# Supabase (if using)
SUPABASE_CLIENT_ID=your-supabase-client-id
SUPABASE_CLIENT_SECRET=your-supabase-client-secret
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

---

## 📖 Common Patterns

### 1. Protected Route (Basic):

```typescript
import { createProtectedRoute } from '@/lib/api/middleware';

export const GET = createProtectedRoute(
  async (request, context) => {
    // User is authenticated, context.user is available
    return NextResponse.json({
      message: `Hello ${context.user.email}`
    });
  }
);
```

### 2. Protected Route with Role:

```typescript
export const POST = createProtectedRoute(
  async (request, context) => {
    // Only admins can create users
    const body = await request.json();
    // ... create user logic
    return NextResponse.json({ success: true });
  },
  {
    roles: ['ADMIN'],
  }
);
```

### 3. Protected Route with Audit:

```typescript
export const DELETE = createProtectedRoute(
  async (request, context) => {
    const { id } = context.params;
    // ... delete logic
    return NextResponse.json({ success: true });
  },
  {
    roles: ['ADMIN'],
    audit: { action: 'DELETE', resource: 'users' },
  }
);
```

### 4. Get Current User in API:

```typescript
import { getServerSession } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({ user: session.user });
}
```

### 5. Get Current User in Server Component:

```typescript
import { getServerSession } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  return (
    <div>
      <h1>Welcome, {session.user.firstName}!</h1>
    </div>
  );
}
```

---

## 🚨 Common Errors

### Error: "Authentication required"

**Cause**: No session cookie or invalid session

**Fix**:
1. Ensure user is logged in
2. Check session cookie exists
3. Verify `NEXTAUTH_SECRET` is set

### Error: "User not found"

**Cause**: Session is valid but user doesn't exist in database

**Fix**:
1. Check user exists: `SELECT * FROM "User" WHERE id = 'user-id'`
2. Re-authenticate user
3. Check database connection

### Error: "Insufficient permissions"

**Cause**: User doesn't have required role

**Fix**:
1. Check user role: `SELECT role FROM "User" WHERE id = 'user-id'`
2. Update route to allow user's role
3. Or update user's role in database

---

## 📝 Audit Logging

### Authentication Events:

All authentication events are automatically logged:

```json
{
  "event": "auth_success",
  "userId": "clx123...",
  "role": "CLINICIAN",
  "msg": "Authentication successful"
}
```

### Query Logs:

```bash
# View authentication logs
grep "auth_success" logs/*.log

# View failed attempts
grep "auth_session_missing" logs/*.log

# View unauthorized access attempts
grep "auth_user_not_found" logs/*.log
```

---

## 🔍 Debugging

### Enable Debug Mode:

```bash
# In .env.local
NEXTAUTH_DEBUG=true
NODE_ENV=development
```

### Check Session:

```typescript
// In any server component or API route
const session = await getServerSession();
console.log('Current session:', JSON.stringify(session, null, 2));
```

### Verify Cookie:

1. Open browser DevTools
2. Go to Application → Cookies
3. Check for: `next-auth.session-token` (dev) or `__Secure-next-auth.session-token` (prod)
4. Decode JWT: https://jwt.io

---

## 📚 Additional Resources

- **Full Documentation**: `/docs/DEMO_AUTH_REMOVAL.md`
- **Completion Report**: `/AGENT_1_COMPLETION_REPORT.md`
- **NextAuth v5 Docs**: https://authjs.dev/
- **Environment Setup**: `/.env.example`

---

## 🆘 Need Help?

### For Issues:
- **Authentication not working**: Check `.env` variables
- **Build failing**: Run `pnpm build` and check errors
- **Session expired**: User needs to re-login

### Contact:
- **Technical Support**: dev@holilabs.com
- **Security Issues**: security@holilabs.com

---

**Quick Reference Version**: 1.0
**Last Updated**: December 15, 2025
