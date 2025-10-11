# Sentry Error Monitoring Setup

This document explains how to set up Sentry error monitoring for the Holi Labs application.

## 🎯 Overview

Sentry is configured to:
- ✅ Capture client-side errors (browser)
- ✅ Capture server-side errors (Node.js)
- ✅ Capture edge runtime errors (middleware)
- ✅ Record session replays on errors
- ✅ Track performance metrics
- ✅ Upload source maps for debugging
- ✅ Sanitize sensitive data (tokens, passwords, PHI)

## 📋 Prerequisites

1. Create a Sentry account at [sentry.io](https://sentry.io)
2. Create a new project in Sentry (select "Next.js" as platform)
3. Get your Sentry DSN from the project settings

## 🔧 Configuration

### 1. Environment Variables

Add these to your `.env.production`:

```bash
# Sentry - Error Monitoring (REQUIRED in production)
NEXT_PUBLIC_SENTRY_DSN=https://your-public-key@o123456.ingest.sentry.io/789012
SENTRY_AUTH_TOKEN=your-auth-token-here
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

### 2. Get Sentry Auth Token

For uploading source maps during build:

1. Go to Sentry → Settings → Auth Tokens
2. Click "Create New Token"
3. Name: "Holi Labs CI/CD"
4. Scopes: Select:
   - `project:read`
   - `project:releases`
   - `org:read`
5. Copy the token and add to `SENTRY_AUTH_TOKEN`

### 3. Find Organization and Project Slugs

- **Organization slug**: In your Sentry URL: `https://sentry.io/organizations/<org-slug>/`
- **Project slug**: In your Sentry URL: `https://sentry.io/organizations/your-org/projects/<project-slug>/`

## 📦 What's Included

### Configuration Files

```
apps/web/
├── sentry.client.config.ts    # Client-side (browser) error tracking
├── sentry.server.config.ts    # Server-side (Node.js) error tracking
├── sentry.edge.config.ts      # Edge runtime (middleware) error tracking
├── instrumentation.ts         # Next.js instrumentation hook
└── src/
    ├── app/
    │   └── global-error.tsx   # Global error boundary
    ├── components/
    │   └── ErrorBoundary.tsx  # Reusable error boundary component
    └── lib/
        └── monitoring/
            └── sentry-utils.ts # Helper functions for error reporting
```

### Features

1. **Automatic Error Capture**
   - All unhandled exceptions
   - Promise rejections
   - React component errors
   - API route errors
   - Database query errors

2. **Session Replay** (Privacy-Safe)
   - Records 10% of normal sessions
   - Records 100% of error sessions
   - Masks all text and media for privacy
   - Helps reproduce bugs

3. **Performance Monitoring**
   - API response times
   - Database query performance
   - Page load times
   - 10% sample rate in production

4. **Privacy & Security**
   - Automatically removes sensitive headers (Authorization, Cookie)
   - Redacts tokens, passwords, API keys
   - Removes PHI from error context
   - Sanitizes environment variables

## 🚀 Usage Examples

### 1. Basic Error Capture

```typescript
import { captureError } from '@/lib/monitoring/sentry-utils';

try {
  await dangerousOperation();
} catch (error) {
  captureError(error, {
    user: { id: userId, type: 'CLINICIAN' },
    tags: { feature: 'patient-management' },
    extra: { patientId: '123' },
  });
  throw error; // Re-throw if needed
}
```

### 2. API Error Reporting

```typescript
import { captureApiError } from '@/lib/monitoring/sentry-utils';

export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    captureApiError(
      error,
      '/api/patients',
      'GET',
      500,
      request.headers.get('x-request-id') || undefined
    );
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
```

### 3. Database Error Reporting

```typescript
import { captureDatabaseError } from '@/lib/monitoring/sentry-utils';

try {
  await prisma.patient.create({ data });
} catch (error) {
  captureDatabaseError(error, 'create', 'patients', patientId);
  throw error;
}
```

### 4. Authentication Error Reporting

```typescript
import { captureAuthError } from '@/lib/monitoring/sentry-utils';

try {
  await signIn(credentials);
} catch (error) {
  captureAuthError(error, 'login', userId);
  throw error;
}
```

### 5. Using Error Boundaries

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function MyPage() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### 6. Performance Tracking

```typescript
import { measurePerformance } from '@/lib/monitoring/sentry-utils';

const result = await measurePerformance(
  'patient.save',
  async () => await savePatient(data)
);
```

### 7. Adding Breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/monitoring/sentry-utils';

addBreadcrumb('User clicked save button', {
  category: 'ui.click',
  level: 'info',
  data: { patientId: '123', action: 'save' },
});
```

### 8. Set User Context

```typescript
import { setUserContext } from '@/lib/monitoring/sentry-utils';

// After login
setUserContext({
  id: user.id,
  email: user.email,
  role: user.role,
  type: 'CLINICIAN',
});

// After logout
clearUserContext();
```

## 🧪 Testing Sentry

### Local Development

Sentry is disabled in development by default. To test:

1. Set `NODE_ENV=production` temporarily
2. Or modify config to `enabled: true` in sentry configs

### Production Test

```typescript
// Add a test error endpoint (remove after testing!)
// app/api/test-error/route.ts
export function GET() {
  throw new Error('Test error for Sentry');
}
```

Visit `/api/test-error` and check Sentry dashboard.

## 📊 What to Monitor in Sentry

### Critical Alerts

Set up alerts for:
1. **Authentication failures** - Tag: `auth_type`
2. **Database errors** - Tag: `db_operation`
3. **File upload failures** - Tag: `file_operation`
4. **API errors** - Tag: `api_endpoint`
5. **Payment failures** (if applicable)

### Performance Monitoring

Watch for:
1. Slow API endpoints (>2s)
2. Slow database queries (>500ms)
3. High error rates (>1% of requests)

### Session Replays

Review replays for:
1. Errors with user impact
2. Critical workflow failures
3. Unclear error messages

## 🔒 Privacy & HIPAA Compliance

Sentry is configured to be HIPAA-compliant:

1. **Data Sanitization**
   - All PII/PHI is redacted from errors
   - Patient IDs are included (but not names/details)
   - Session replays mask all text/media

2. **Data Location**
   - Configure data residency in Sentry settings
   - Recommend: US-based storage

3. **Access Control**
   - Limit Sentry project access to authorized personnel
   - Enable 2FA for Sentry accounts

4. **Data Retention**
   - Set retention policy to 90 days
   - Configure in Sentry → Settings → Data Retention

## 🛠️ Deployment

### DigitalOcean App Platform

Add environment variables in App Settings:

```yaml
# .do/app.yaml
envs:
  - key: NEXT_PUBLIC_SENTRY_DSN
    value: ${NEXT_PUBLIC_SENTRY_DSN}
  - key: SENTRY_AUTH_TOKEN
    value: ${SENTRY_AUTH_TOKEN}
    type: SECRET
  - key: SENTRY_ORG
    value: ${SENTRY_ORG}
  - key: SENTRY_PROJECT
    value: ${SENTRY_PROJECT}
```

### CI/CD (GitHub Actions)

```yaml
- name: Build with Sentry
  env:
    NEXT_PUBLIC_SENTRY_DSN: ${{ secrets.NEXT_PUBLIC_SENTRY_DSN }}
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
    SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
  run: pnpm build
```

## 📚 Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Session Replay Setup](https://docs.sentry.io/platforms/javascript/session-replay/)
- [Source Maps Guide](https://docs.sentry.io/platforms/javascript/sourcemaps/)
- [Privacy & Security](https://docs.sentry.io/security-legal-pii/security/)

## 🆘 Troubleshooting

### Source Maps Not Uploading

1. Check `SENTRY_AUTH_TOKEN` is set
2. Verify token has correct scopes
3. Check build logs for Sentry plugin output

### Errors Not Appearing

1. Verify `NEXT_PUBLIC_SENTRY_DSN` is set
2. Check browser console for Sentry SDK errors
3. Test with intentional error (see Testing section)

### Too Many Errors

1. Review `ignoreErrors` list in configs
2. Add fingerprinting to group similar errors
3. Adjust sample rates if needed

### Missing Context

1. Use `setUserContext()` after login
2. Add breadcrumbs for debugging
3. Include relevant tags in `captureError()`

## 📞 Support

For Sentry-related issues:
- Check [Sentry Status](https://status.sentry.io/)
- Contact Sentry Support through dashboard
- Review Sentry documentation

For application-specific issues:
- Contact dev team
- Check internal documentation
