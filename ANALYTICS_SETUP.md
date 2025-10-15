# PostHog Analytics & Feature Flags Setup

This document describes the analytics and feature flags implementation for A/B testing and user behavior tracking in Holi Labs.

## 🎯 Overview

We use **PostHog** for:
- **Product Analytics**: Track user behavior, engagement, and feature usage
- **Feature Flags**: A/B testing and gradual feature rollouts
- **Session Replay** (disabled by default for HIPAA compliance)
- **Funnel Analysis**: Understand user journeys

## 🔒 HIPAA Compliance

Our PostHog configuration is HIPAA-compliant:

- ✅ **Autocapture disabled**: No automatic collection of user interactions
- ✅ **Manual tracking only**: Explicit event tracking without PHI
- ✅ **Session recording disabled**: No video recording of user sessions
- ✅ **Property sanitization**: Automatic removal of sensitive fields (email, CPF, CNS, patient data)
- ✅ **Opt-out respected**: Users can opt out of tracking

### Sensitive Fields (Always Excluded)
- email, phone, cpf, cns, dateOfBirth
- patientId, patientName, diagnosis, medication
- firstName, lastName, address, ssn

## 📦 Installation

Already installed in the project:
```bash
pnpm add --filter web posthog-js posthog-node
```

## 🔧 Configuration

### 1. Environment Variables

Add to `.env.local`:
```bash
# PostHog Configuration
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com  # or your self-hosted instance
```

### 2. Get PostHog API Key

1. Sign up at https://posthog.com
2. Create a new project for "Holi Labs - Production" and "Holi Labs - Development"
3. Get the API key from Project Settings > API Keys
4. Copy the key to your `.env.local` file

## 📊 Usage

### Track Events

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function MyComponent() {
  const analytics = useAnalytics();

  const handleClick = () => {
    // Track a custom event
    analytics.track(analytics.events.BUTTON_CLICKED, {
      buttonName: 'create-patient',
      location: 'dashboard',
    });
  };

  return <button onClick={handleClick}>Create Patient</button>;
}
```

### Identify Users

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function LoginComponent() {
  const analytics = useAnalytics();

  const handleLogin = async (userId: string) => {
    // Identify user (use hashed ID, never PHI)
    analytics.identify(userId, {
      role: 'clinician',
      specialty: 'cardiology',
      // NEVER include: email, name, CPF, etc.
    });

    analytics.track(analytics.events.LOGIN);
  };
}
```

### Feature Flags

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FeatureFlags } from '@/lib/featureFlags';

function MyComponent() {
  const isAIScribeEnabled = useFeatureFlag(FeatureFlags.AI_SCRIBE_REAL_TIME);

  return (
    <div>
      {isAIScribeEnabled ? (
        <AIScribeButton />
      ) : (
        <ManualNoteButton />
      )}
    </div>
  );
}
```

### Multiple Feature Flags

```typescript
import { useFeatureFlags } from '@/hooks/useFeatureFlag';
import { FeatureFlags } from '@/lib/featureFlags';

function Dashboard() {
  const flags = useFeatureFlags([
    FeatureFlags.NEW_DASHBOARD_LAYOUT,
    FeatureFlags.ANALYTICS_DASHBOARD,
    FeatureFlags.PATIENT_TIMELINE_VIEW,
  ]);

  return (
    <div>
      {flags[FeatureFlags.NEW_DASHBOARD_LAYOUT] ? (
        <NewDashboard />
      ) : (
        <OldDashboard />
      )}
    </div>
  );
}
```

## 📈 Pre-defined Events

All events are defined in `src/lib/posthog.ts`:

### Authentication Events
- `user_login`
- `user_logout`
- `user_signup`

### Patient Management
- `patient_created`
- `patient_updated`
- `patient_viewed`
- `patient_searched`

### Clinical Notes
- `clinical_note_created`
- `clinical_note_updated`
- `clinical_note_viewed`
- `clinical_note_printed`

### AI Scribe
- `scribe_session_started`
- `scribe_session_completed`
- `scribe_recording_started`
- `scribe_recording_stopped`
- `scribe_transcription_generated`
- `scribe_soap_generated`

### Prescriptions
- `prescription_created`
- `prescription_sent`
- `medication_added`

### PWA Events
- `pwa_installed`
- `pwa_prompt_shown`
- `pwa_prompt_dismissed`

## 🚩 Feature Flags

All feature flags are defined in `src/lib/featureFlags.ts`:

### AI Scribe Features
- `ai-scribe-real-time`: Real-time transcription
- `ai-scribe-voice-commands`: Voice control
- `ai-scribe-multilingual`: Multi-language support
- `ai-scribe-smart-suggestions`: AI suggestions

### Clinical Notes
- `clinical-notes-templates`: Note templates
- `clinical-notes-ai-summary`: AI-generated summaries
- `clinical-notes-blockchain`: Blockchain verification

### Patient Management
- `patient-search-advanced`: Advanced search
- `patient-timeline-view`: Timeline visualization
- `patient-bulk-actions`: Bulk operations

### UI/UX Experiments
- `new-dashboard-layout`: New dashboard design
- `dark-mode-default`: Dark mode by default
- `sidebar-collapsed-default`: Collapsed sidebar

### Mobile Features
- `offline-mode`: Offline sync
- `pwa-push-notifications`: Push notifications
- `mobile-quick-actions`: Quick action buttons

## 🧪 A/B Testing

### Setting Up an A/B Test

1. **Create Feature Flag in PostHog**:
   - Go to PostHog Dashboard > Feature Flags
   - Click "New feature flag"
   - Name: `new-dashboard-layout`
   - Rollout: 50% (for 50/50 split)
   - Save

2. **Use in Code**:
```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FeatureFlags } from '@/lib/featureFlags';

function Dashboard() {
  const showNewLayout = useFeatureFlag(FeatureFlags.NEW_DASHBOARD_LAYOUT);

  return showNewLayout ? <NewDashboardLayout /> : <OldDashboardLayout />;
}
```

3. **Track Variant Exposure**:
```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function Dashboard() {
  const analytics = useAnalytics();
  const showNewLayout = useFeatureFlag(FeatureFlags.NEW_DASHBOARD_LAYOUT);

  useEffect(() => {
    analytics.track(analytics.events.FEATURE_FLAG_EVALUATED, {
      flagKey: FeatureFlags.NEW_DASHBOARD_LAYOUT,
      variant: showNewLayout ? 'new' : 'old',
    });
  }, [showNewLayout]);
}
```

4. **Track Outcomes**:
```typescript
const handleCreatePatient = () => {
  analytics.track(analytics.events.PATIENT_CREATED, {
    dashboardVariant: showNewLayout ? 'new' : 'old',
  });
};
```

5. **Analyze in PostHog**:
   - Go to Insights > Trends
   - Event: `patient_created`
   - Breakdown by: `dashboardVariant`
   - Compare conversion rates

## 📊 PostHog Dashboard Setup

### Key Insights to Track

1. **User Activation**:
   - First patient created
   - First clinical note created
   - First scribe session

2. **Feature Adoption**:
   - AI Scribe usage rate
   - Note template usage
   - Search feature usage

3. **Retention**:
   - Daily active clinicians
   - Weekly active clinicians
   - Feature stickiness

4. **Funnel Analysis**:
   - Login → Create Patient → Create Note
   - Scribe Start → Recording → Generate SOAP

## 🔍 Debugging

### Enable Debug Mode

In development, PostHog automatically runs in debug mode:
```typescript
if (process.env.NODE_ENV === 'development') {
  posthog.debug();
}
```

Check browser console for PostHog events.

### Test Feature Flags Locally

You can override feature flags locally:
```typescript
// In browser console
posthog.featureFlags.override({'ai-scribe-real-time': true})
```

## 🚀 Production Checklist

Before deploying to production:

- [ ] PostHog API key added to production environment variables
- [ ] Feature flags configured in PostHog dashboard
- [ ] No PHI in event properties (audit all tracking calls)
- [ ] Session recording disabled
- [ ] Autocapture disabled
- [ ] Privacy policy updated to mention analytics
- [ ] User consent mechanism in place (if required)

## 📚 Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog Feature Flags](https://posthog.com/docs/feature-flags)
- [HIPAA Compliance Guide](https://posthog.com/docs/privacy/hipaa-compliance)
- [React Integration](https://posthog.com/docs/libraries/react)

## 🆘 Support

For issues with PostHog integration:
1. Check browser console for errors
2. Verify API key is correct
3. Check network tab for failed requests to PostHog
4. Review PostHog project settings

For feature flag issues:
1. Verify flag exists in PostHog dashboard
2. Check rollout percentage
3. Verify user is in target audience
4. Clear local storage and reload
