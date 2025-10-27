# 🚩 PostHog Feature Flags Setup Guide

**Time Required:** 20 minutes
**Prerequisites:** PostHog account created and configured

---

## 🎯 Overview

Feature flags enable:
- **A/B Testing** - Test different versions of features
- **Gradual Rollouts** - Release features to % of users
- **Kill Switches** - Disable features instantly if bugs found
- **Beta Testing** - Give early access to select users

---

## 1️⃣ Access Feature Flags

1. Log into PostHog: https://us.posthog.com
2. Select your project: **Holi Labs - Production**
3. Click **Feature Flags** in left sidebar
4. Click **New feature flag**

---

## 2️⃣ Create Essential Feature Flags

### Flag #1: AI Scribe Beta

**Purpose:** Control access to AI-powered clinical note generation

1. **Key:** `ai-scribe-beta`
2. **Name:** AI Scribe Beta Access
3. **Description:** Enable Claude Sonnet 4.5 AI SOAP note generation
4. **Type:** Boolean (on/off)
5. **Rollout Strategy:**
   - Initial: 100% (enabled for all users)
   - Can set to 0% if issues found
6. **Filters:** None (applies to everyone)
7. Click **Save**

**Usage in Code:**
```typescript
import { isFeatureEnabled } from '@/lib/posthog';

const canUseAI = isFeatureEnabled('ai-scribe-beta');
```

---

### Flag #2: New Dashboard Layout

**Purpose:** Test redesigned dashboard UI

1. **Key:** `new-dashboard-layout`
2. **Name:** New Dashboard Layout (2025)
3. **Description:** A/B test new dashboard with improved metrics cards
4. **Type:** Boolean
5. **Rollout Strategy:**
   - Week 1: 0% (disabled)
   - Week 2: 10% (cautious rollout)
   - Week 3: 50% (A/B test)
   - Week 4: 100% (if successful)
6. **Filters:**
   - Can filter by: `user_role = "CLINICIAN"`
   - Or by: `signup_date >= "2025-10-01"` (new users only)
7. Click **Save**

**Usage in Code:**
```typescript
const showNewLayout = isFeatureEnabled('new-dashboard-layout');

return showNewLayout ? <NewDashboard /> : <OldDashboard />;
```

---

### Flag #3: Patient Portal Beta

**Purpose:** Control access to patient-facing features

1. **Key:** `patient-portal-enabled`
2. **Name:** Patient Portal Beta
3. **Description:** Enable patient self-service features
4. **Type:** Boolean
5. **Rollout Strategy:**
   - Start: 100% (for MVP launch)
6. Click **Save**

---

### Flag #4: Voice Recording V2

**Purpose:** Test new WebRTC recorder vs old MediaRecorder

1. **Key:** `voice-recording-v2`
2. **Name:** Voice Recording V2 (WebRTC)
3. **Description:** A/B test new recording technology
4. **Type:** Multivariate
5. **Variants:**
   - `control` (50%) - Current MediaRecorder API
   - `webrtc` (50%) - New WebRTC implementation
6. **Rollout:** 50/50 split
7. Click **Save**

**Usage in Code:**
```typescript
const recordingVariant = getFeatureFlagPayload('voice-recording-v2');

if (recordingVariant === 'webrtc') {
  // Use WebRTC recorder
} else {
  // Use MediaRecorder
}
```

---

### Flag #5: Offline Mode

**Purpose:** Enable/disable PWA offline sync

1. **Key:** `offline-mode-enabled`
2. **Name:** PWA Offline Mode
3. **Description:** Enable offline data sync via IndexedDB
4. **Type:** Boolean
5. **Rollout:** 100%
6. Click **Save**

---

### Flag #6: Advanced Analytics

**Purpose:** Premium feature for paid tier

1. **Key:** `advanced-analytics`
2. **Name:** Advanced Analytics Dashboard
3. **Description:** Revenue tracking, patient volume trends
4. **Type:** Boolean
5. **Rollout:** 0% initially
6. **Filters:**
   - Property: `subscription_tier = "premium"`
   - Only users with premium subscription
7. Click **Save**

---

## 3️⃣ Feature Flag Best Practices

### Naming Convention

Use kebab-case with descriptive names:
- ✅ **Good:** `ai-scribe-beta`, `new-dashboard-layout`
- ❌ **Bad:** `flag1`, `test`, `newFeature`

### Types

- **Boolean:** Simple on/off (most common)
- **Multivariate:** Multiple variants for A/B testing
- **Number:** Percentage or numeric config
- **String:** Text configuration

### Rollout Strategy

**Cautious Rollout (Recommended for critical features):**
1. Day 1: 0% (dev/staging only)
2. Day 2: 5% (canary)
3. Day 5: 25% (if no issues)
4. Day 10: 50% (A/B test)
5. Day 15: 100% (full rollout)

**Fast Rollout (For minor features):**
1. Day 1: 10%
2. Day 2: 50%
3. Day 3: 100%

**Beta Testing:**
- Use filters: `email contains "@holilabs.com"`
- Or: `user_role = "BETA_TESTER"`

---

## 4️⃣ Track Feature Flag Performance

### Set Up Tracking

When a user sees a feature flag, track it:

```typescript
import { trackEvent, AnalyticsEvents } from '@/lib/posthog';

const showNewLayout = isFeatureEnabled('new-dashboard-layout');

// Track that user saw this variant
trackEvent(AnalyticsEvents.FEATURE_FLAG_EVALUATED, {
  flag: 'new-dashboard-layout',
  variant: showNewLayout ? 'new' : 'old',
  timestamp: new Date().toISOString()
});
```

### Measure Outcomes

Track key metrics by variant:

```typescript
// When user completes an action
trackEvent(AnalyticsEvents.PATIENT_CREATED, {
  dashboardVariant: showNewLayout ? 'new' : 'old'
});
```

### Analyze in PostHog

1. Go to: **Insights** → **Trends**
2. Event: `patient_created`
3. **Breakdown by:** `dashboardVariant`
4. Compare:
   - Conversion rate (new vs old)
   - Time to completion
   - Error rate

---

## 5️⃣ Emergency: Disable a Feature

If a feature breaks in production:

1. Go to PostHog → **Feature Flags**
2. Find the flag: `ai-scribe-beta`
3. Set **Rollout** to **0%**
4. Click **Save**
5. Changes take effect **immediately** (within 30 seconds)

**No code deploy needed!** This is the power of feature flags.

---

## 6️⃣ Testing Feature Flags Locally

### Override Flags in Browser Console

```javascript
// Enable a flag locally
posthog.featureFlags.override({'ai-scribe-beta': true})

// Disable a flag locally
posthog.featureFlags.override({'ai-scribe-beta': false})

// Reset overrides
posthog.featureFlags.override(false)

// View current flags
posthog.featureFlags.getFlagVariants()
```

### Test with Different User IDs

```typescript
// Identify as different user
identifyUser('test-user-123', {
  email: 'test@example.com',
  role: 'CLINICIAN'
});

// Check flag value
const enabled = isFeatureEnabled('ai-scribe-beta');
```

---

## 7️⃣ Feature Flag Checklist

Before launching a new flag:

- [ ] Flag has descriptive key (kebab-case)
- [ ] Description explains purpose clearly
- [ ] Rollout strategy planned (0% → 100%)
- [ ] Filters configured (if targeting specific users)
- [ ] Tracking added to measure success
- [ ] Code handles both enabled/disabled cases
- [ ] Tested locally with overrides
- [ ] Team knows how to disable in emergency
- [ ] Documentation updated

---

## 8️⃣ Real-World Examples

### Example 1: A/B Test New Dashboard

**Hypothesis:** New dashboard increases patient creation rate

**Setup:**
1. Create flag: `new-dashboard-layout`
2. Set rollout: 50% (random split)
3. Track both variants:
   ```typescript
   trackEvent('patient_created', {
     dashboard_variant: showNew ? 'new' : 'old'
   });
   ```

**Measure:**
- Conversion rate: signup → first patient created
- Time to first patient
- User satisfaction (survey)

**Decision:**
- If new > 10% better: Roll out to 100%
- If old > 5% better: Keep old, kill new
- If no difference: Keep old (simpler)

---

### Example 2: Beta Feature Access

**Goal:** Give early access to premium users

**Setup:**
1. Create flag: `advanced-analytics`
2. Add filter: `subscription_tier = "premium"`
3. Set rollout: 100% (for filtered users)

**Result:**
- Only premium users see feature
- Can expand to all users later

---

### Example 3: Kill Switch

**Scenario:** AI scribe breaks due to API change

**Action:**
1. Set `ai-scribe-beta` to 0%
2. All users instantly see fallback UI
3. Fix bug at leisure
4. Re-enable when ready

---

## 9️⃣ Advanced: Targeting Rules

### By User Properties

```
user_role = "ADMIN"
email contains "@holilabs.com"
signup_date >= "2025-10-01"
subscription_tier in ["premium", "enterprise"]
```

### By Cohorts

1. Create cohort: "Active Users"
   - Users who created 5+ notes in last 7 days
2. Target flag to cohort

### By Geography

```
country = "BR"
timezone = "America/Sao_Paulo"
```

---

## 🔟 Feature Flag Lifecycle

1. **Create** (Rollout: 0%)
   - Test in dev/staging
   - Code ready but disabled

2. **Beta** (Rollout: 5-10%)
   - Internal team + early adopters
   - Monitor for issues

3. **Rollout** (Rollout: 25% → 50% → 75%)
   - Gradual increase over days/weeks
   - Watch metrics closely

4. **Launch** (Rollout: 100%)
   - Available to all users
   - Feature flag becomes permanent

5. **Cleanup** (Optional)
   - Remove flag from code
   - Archive flag in PostHog
   - Done after 30+ days at 100%

---

## 📊 Success Metrics

Track these for each flag:

- **Adoption Rate:** % of users who use feature
- **Engagement:** Time spent, actions taken
- **Errors:** Error rate by variant
- **Performance:** Load time, API latency
- **Satisfaction:** NPS score, support tickets

---

## 🆘 Troubleshooting

### Flag not working in production

**Symptoms:** `isFeatureEnabled()` always returns false

**Solutions:**
1. Verify PostHog API key is set correctly
2. Check user is identified: `identifyUser(userId)`
3. Wait 30 seconds for flag to propagate
4. Check browser console for PostHog errors
5. Verify flag exists in PostHog dashboard

### Flag stuck at old value

**Symptoms:** Flag doesn't update when changed

**Solutions:**
1. Clear localStorage in browser
2. Wait 60 seconds (cache refresh)
3. Reload page
4. Check PostHog dashboard shows correct value

---

## 📚 Additional Resources

- [PostHog Feature Flags Docs](https://posthog.com/docs/feature-flags)
- [A/B Testing Guide](https://posthog.com/docs/experiments)
- [Feature Flag Best Practices](https://posthog.com/blog/feature-flag-best-practices)

---

**Total Setup Time:** 20 minutes for 6 flags

**Next Steps:**
1. Create all 6 feature flags
2. Set initial rollouts (most at 0% or 100%)
3. Test locally with overrides
4. Plan A/B tests for week 2

**Ready for:** Gradual rollouts, A/B testing, emergency kill switches
