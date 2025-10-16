# 🧪 A/B Testing Guide for Healthcare Providers

**Purpose:** Run safe, compliant A/B tests with healthcare providers to optimize Holi Labs features

**Compliance:** HIPAA-compliant, no PHI in analytics, fully auditable

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [A/B Testing Workflow](#ab-testing-workflow)
4. [Safety Guidelines](#safety-guidelines)
5. [Common Test Scenarios](#common-test-scenarios)
6. [Analysis & Decision Making](#analysis--decision-making)
7. [Rollback Procedures](#rollback-procedures)

---

## 🎯 Overview

### What is A/B Testing?

A/B testing (split testing) shows different versions of a feature to different users to determine which performs better.

**Example:**
- **Control Group (A):** 50% of providers see current dashboard layout
- **Treatment Group (B):** 50% of providers see new dashboard layout
- **Measure:** Which group creates more clinical notes per day?

### Why A/B Test in Healthcare?

- **Evidence-based decisions:** Data > opinions
- **Risk mitigation:** Test with small group before full rollout
- **User-centered design:** Learn what doctors actually need
- **Continuous improvement:** Iterate based on real usage

---

## ✅ Prerequisites

Before running your first A/B test:

### 1. PostHog Configuration

```bash
# Verify PostHog is configured
# Check .env.local or environment variables

NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Verify PostHog is tracking events:
1. Log into PostHog dashboard
2. Navigate to Activity → Live Events
3. Perform an action in Holi Labs (e.g., login)
4. Verify event appears in real-time

### 2. Baseline Metrics

Before testing, establish baseline metrics:

| Metric | Definition | Current Value | Target |
|--------|------------|---------------|--------|
| **Daily Active Clinicians** | Unique users per day | ___ | +10% |
| **Clinical Notes Created** | Notes per clinician/day | ___ | +15% |
| **Scribe Session Duration** | Avg minutes per session | ___ | -20% |
| **Feature Adoption Rate** | % using AI scribe | ___ | +25% |
| **Time to Complete Note** | Avg time (minutes) | ___ | -30% |

**Action:** Record baseline for 1 week before starting tests

### 3. User Consent & Communication

**Required:**
- [ ] Notify providers they're participating in product testing
- [ ] Get consent to track anonymized usage data
- [ ] Provide opt-out mechanism
- [ ] Explain data privacy (no PHI collected)

**Sample Email:**
```
Subject: Holi Labs Feature Testing Program

Hi [Provider Name],

As part of our commitment to building the best AI scribe for healthcare,
we're testing new features with a small group of providers like you.

What this means:
✅ You may see new features before general release
✅ We collect anonymized usage data (no patient information)
✅ You can opt out anytime
✅ Your feedback directly shapes the product

Questions? Reply to this email or contact support@holilabs.com

Thank you!
The Holi Labs Team
```

---

## 🔬 A/B Testing Workflow

### Step 1: Hypothesis & Test Design

**Template:**
```
Hypothesis: [Changing X] will [increase/decrease Y] because [reasoning]

Example:
Hypothesis: Adding a "Quick SOAP" button will increase notes created per day
because providers want faster note creation for simple follow-up visits.

Control (A): Current dashboard (no quick button)
Treatment (B): Dashboard with "Quick SOAP" button
Primary Metric: Clinical notes created per clinician per day
Secondary Metrics: Time to create note, note completion rate
Sample Size: 50 clinicians (25 control, 25 treatment)
Duration: 2 weeks
Success Criteria: 15% increase in notes created
```

**Test Design Checklist:**
- [ ] Clear hypothesis
- [ ] Single variable changed (don't test multiple changes at once)
- [ ] Primary metric defined
- [ ] Secondary metrics defined
- [ ] Sample size calculated
- [ ] Duration determined (minimum 1 week)
- [ ] Success criteria defined
- [ ] Safety checks in place

### Step 2: Create Feature Flag in PostHog

1. **Log into PostHog dashboard**
2. **Navigate to:** Feature Flags → New feature flag
3. **Configure flag:**

```
Name: quick-soap-button
Key: quick-soap-button
Description: Test adding Quick SOAP button to dashboard

Rollout Strategy:
○ Release to everyone: OFF
● Release to a percentage of users: 50%

Rollout Percentage: 50%

Filter by user properties: (optional)
- role = CLINICIAN
- specialty = cardiology  (if testing with specific specialty)

Save
```

4. **Verify flag is active** in PostHog dashboard

### Step 3: Implement Feature Flag in Code

**Option A: Component-level flag**

```typescript
// apps/web/src/app/dashboard/page.tsx

import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FeatureFlags } from '@/lib/featureFlags';

export default function DashboardPage() {
  const showQuickSOAP = useFeatureFlag(FeatureFlags.QUICK_SOAP_BUTTON);

  return (
    <div>
      <h1>Dashboard</h1>

      {showQuickSOAP && (
        <QuickSOAPButton />
      )}

      <PatientList />
    </div>
  );
}
```

**Option B: Entire page variant**

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FeatureFlags } from '@/lib/featureFlags';

export default function DashboardPage() {
  const useNewLayout = useFeatureFlag(FeatureFlags.NEW_DASHBOARD_LAYOUT);

  return useNewLayout ? (
    <NewDashboardLayout />
  ) : (
    <OldDashboardLayout />
  );
}
```

### Step 4: Track Variant Exposure

**CRITICAL:** Track when users see each variant

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FeatureFlags } from '@/lib/featureFlags';
import { useEffect } from 'react';

export default function DashboardPage() {
  const analytics = useAnalytics();
  const showQuickSOAP = useFeatureFlag(FeatureFlags.QUICK_SOAP_BUTTON);

  // Track variant exposure
  useEffect(() => {
    analytics.track('feature_flag_evaluated', {
      flagKey: FeatureFlags.QUICK_SOAP_BUTTON,
      variant: showQuickSOAP ? 'treatment' : 'control',
    });
  }, [showQuickSOAP]);

  // ... rest of component
}
```

### Step 5: Track Outcome Events

Track the primary and secondary metrics:

```typescript
const handleCreateNote = async () => {
  const startTime = Date.now();

  // Create the note
  await createClinicalNote(noteData);

  const duration = Date.now() - startTime;

  // Track outcome
  analytics.track('clinical_note_created', {
    // Test variant
    quickSOAPVariant: showQuickSOAP ? 'treatment' : 'control',

    // Metrics
    creationDuration: duration,
    noteType: 'follow-up',
    usedTemplate: true,

    // NO PHI - only metadata
  });
};
```

### Step 6: Monitor Test Progress

**Daily Checks:**
1. **PostHog Dashboard:** Insights → Trends
   - Event: `clinical_note_created`
   - Breakdown by: `quickSOAPVariant`
   - Time range: Last 7 days

2. **Sample Size Verification:**
   - Event: `feature_flag_evaluated`
   - Breakdown by: `variant`
   - Verify 50/50 split

3. **Error Monitoring:**
   - Check Sentry for errors related to new feature
   - Filter by: `quickSOAPVariant = treatment`

**Red Flags (Stop Test Immediately):**
- ❌ Error rate >5% in treatment group
- ❌ User complaints about new feature
- ❌ Primary metric decreases >20%
- ❌ Critical bug discovered
- ❌ HIPAA violation detected

### Step 7: Analyze Results

**After 2 weeks (minimum), analyze:**

**PostHog Analysis:**
1. **Navigate to:** Insights → Trends
2. **Create insight:**
   - Event: `clinical_note_created`
   - Breakdown by: `quickSOAPVariant`
   - Formula: Count
   - Date range: Last 14 days

3. **Compare groups:**
   - Control group: ___ notes created
   - Treatment group: ___ notes created
   - Difference: ___%
   - Statistical significance: Use PostHog's built-in stats

**Key Questions:**
- Is the difference statistically significant? (p < 0.05)
- Did we reach success criteria? (15% increase)
- Were there unintended consequences? (errors, complaints)
- Is the improvement worth the maintenance cost?

### Step 8: Make Decision

**Decision Matrix:**

| Result | Action | Rollout |
|--------|--------|---------|
| **Strong Positive** (+20% improvement, p<0.05) | Ship it! | 100% rollout |
| **Moderate Positive** (+10-20%, p<0.05) | Ship with monitoring | Gradual rollout (25% → 50% → 100%) |
| **Weak Positive** (+5-10%, p>0.05) | Iterate and re-test | Keep at 50% or disable |
| **No Difference** (0-5%) | Disable or iterate | Turn off flag |
| **Negative** (<0%) | Disable immediately | Turn off flag |

### Step 9: Rollout or Rollback

**Option A: Full Rollout (Winner)**

1. **PostHog:** Change rollout to 100%
2. **Monitor for 48 hours:** Watch for issues
3. **After success:** Remove feature flag, make default
4. **Update code:**
   ```typescript
   // Remove flag - make default behavior
   export default function DashboardPage() {
     return (
       <div>
         <h1>Dashboard</h1>
         <QuickSOAPButton /> {/* Always show */}
         <PatientList />
       </div>
     );
   }
   ```

**Option B: Gradual Rollout**

1. Week 1: 25%
2. Week 2: 50%
3. Week 3: 75%
4. Week 4: 100%

**Option C: Rollback (Loser)**

1. **PostHog:** Set rollout to 0%
2. **Notify users:** Explain feature was experimental
3. **Document learnings:** What did we learn?

---

## 🛡️ Safety Guidelines

### Clinical Safety First

**Never A/B test these:**
- ❌ Patient safety features (drug interaction warnings)
- ❌ HIPAA compliance features (audit logging, encryption)
- ❌ Critical alerts (high pain scores, allergies)
- ❌ Authentication/authorization
- ❌ Data integrity features

**Safe to A/B test:**
- ✅ UI layouts and designs
- ✅ Feature discoverability (button placement)
- ✅ Onboarding flows
- ✅ Non-critical notifications
- ✅ Dashboard widgets
- ✅ Search algorithms
- ✅ AI-generated suggestions (with human review)

### Data Privacy

**HIPAA Compliance Checklist:**
- [ ] No patient names, MRNs, or identifiers in analytics
- [ ] No diagnoses, medications, or clinical data
- [ ] Only track anonymized user actions
- [ ] Property sanitization enabled (see `posthog.ts`)
- [ ] Audit logs capture all access
- [ ] BAA signed with PostHog (required for production)

**Safe properties to track:**
```typescript
analytics.track('clinical_note_created', {
  variant: 'treatment',           // ✅ Safe
  noteType: 'follow-up',           // ✅ Safe
  duration: 120,                   // ✅ Safe (seconds)
  templateUsed: true,              // ✅ Safe
  specialty: 'cardiology',         // ✅ Safe

  // NEVER include:
  patientName: 'John Doe',         // ❌ PHI
  patientMRN: '123456',            // ❌ PHI
  diagnosis: 'Diabetes',           // ❌ PHI
  medication: 'Metformin',         // ❌ PHI
});
```

### Statistical Significance

**Minimum Requirements:**
- **Sample size:** ≥50 users per variant (100 total)
- **Duration:** ≥7 days (2 weeks recommended)
- **Events:** ≥100 events per variant
- **P-value:** <0.05 (95% confidence)

**Use PostHog's Stats Engine:**
PostHog automatically calculates statistical significance for you. Look for:
- **"Significant"** badge = Safe to ship
- **"Not significant"** = Need more data or no real difference

---

## 📊 Common Test Scenarios

### Scenario 1: New Dashboard Layout

**Hypothesis:** New dashboard layout increases daily active usage

```typescript
// Feature flag
const useNewLayout = useFeatureFlag(FeatureFlags.NEW_DASHBOARD_LAYOUT);

// Track exposure
useEffect(() => {
  analytics.track('dashboard_viewed', {
    layoutVariant: useNewLayout ? 'new' : 'old',
  });
}, [useNewLayout]);

// Track outcomes
analytics.track('patient_searched', {
  layoutVariant: useNewLayout ? 'new' : 'old',
});

analytics.track('clinical_note_created', {
  layoutVariant: useNewLayout ? 'new' : 'old',
});
```

**Primary Metric:** Clinical notes created per day
**Secondary Metrics:** Time spent on dashboard, search usage
**Duration:** 2 weeks

---

### Scenario 2: AI SOAP Suggestions

**Hypothesis:** AI-generated SOAP suggestions reduce time to complete notes

```typescript
const showAISuggestions = useFeatureFlag(FeatureFlags.AI_SOAP_SUGGESTIONS);

// Track when AI suggestions are shown
if (showAISuggestions) {
  analytics.track('ai_suggestions_shown', {
    noteType: 'follow-up',
    suggestionCount: 5,
  });
}

// Track if suggestions were accepted
analytics.track('ai_suggestion_accepted', {
  suggestionType: 'assessment',
  variant: 'treatment',
});

// Track note completion
analytics.track('clinical_note_completed', {
  variant: showAISuggestions ? 'treatment' : 'control',
  duration: completionTime,
  usedAISuggestions: acceptedSuggestions.length > 0,
});
```

**Primary Metric:** Time to complete note (minutes)
**Secondary Metrics:** Acceptance rate of suggestions, note quality score
**Duration:** 2 weeks

---

### Scenario 3: Voice Command Feature

**Hypothesis:** Voice commands increase scribe session completion rate

```typescript
const hasVoiceCommands = useFeatureFlag(FeatureFlags.SCRIBE_VOICE_COMMANDS);

// Track feature usage
analytics.track('scribe_session_started', {
  voiceCommandsEnabled: hasVoiceCommands,
});

// Track voice command usage
if (hasVoiceCommands) {
  analytics.track('voice_command_used', {
    command: 'stop_recording',
    sessionDuration: 300, // seconds
  });
}

// Track completion
analytics.track('scribe_session_completed', {
  variant: hasVoiceCommands ? 'treatment' : 'control',
  duration: sessionTime,
  notesGenerated: 1,
});
```

**Primary Metric:** Session completion rate (%)
**Secondary Metrics:** Voice command usage frequency, user satisfaction
**Duration:** 2 weeks

---

## 📈 Analysis & Decision Making

### Key Metrics Dashboard

**Create in PostHog:**
1. **Navigate to:** Dashboards → New dashboard
2. **Name:** "A/B Test: [Feature Name]"
3. **Add insights:**

**Insight 1: Variant Distribution**
- Event: `feature_flag_evaluated`
- Breakdown: `variant`
- Visualization: Pie chart
- Goal: Verify 50/50 split

**Insight 2: Primary Metric**
- Event: `clinical_note_created`
- Breakdown: `variant`
- Formula: Count per user per day
- Visualization: Line chart

**Insight 3: Conversion Funnel**
- Step 1: `dashboard_viewed`
- Step 2: `patient_searched`
- Step 3: `clinical_note_created`
- Breakdown: `variant`
- Visualization: Funnel

**Insight 4: User Retention**
- Cohort: Users who saw feature
- Event: `user_login`
- Breakdown: `variant`
- Time range: 7 days

### Statistical Analysis Template

```
A/B Test Results: [Feature Name]
Test Duration: [Start Date] - [End Date]
Sample Size: [N control] vs [N treatment]

Primary Metric: [Metric Name]
- Control Group (A): [Value] ± [Std Dev]
- Treatment Group (B): [Value] ± [Std Dev]
- Difference: [X]% ([increase/decrease])
- P-value: [p-value]
- Statistically Significant: [Yes/No]

Secondary Metrics:
- [Metric 1]: [Result]
- [Metric 2]: [Result]

Qualitative Feedback:
- User Complaints: [Count]
- Support Tickets: [Count]
- Positive Feedback: [Quotes]

Recommendation: [Ship / Iterate / Kill]
Reasoning: [Explanation]
```

---

## 🔄 Rollback Procedures

### Emergency Rollback (Critical Issue)

**If you discover a critical bug or HIPAA violation:**

1. **Immediate action** (< 5 minutes):
   ```bash
   # Disable feature flag immediately
   PostHog Dashboard → Feature Flags → [Flag Name] → Set to 0%
   ```

2. **Notify users** (< 15 minutes):
   ```
   Subject: [URGENT] Holi Labs Feature Temporarily Disabled

   We've temporarily disabled [feature] due to a technical issue.
   Your patient data is safe and secure.
   We expect to restore functionality within [timeframe].

   Questions? Contact support@holilabs.com
   ```

3. **Investigate** (< 1 hour):
   - Check Sentry for error details
   - Review audit logs for data access
   - Identify root cause
   - Document incident

4. **Fix or remove** (< 24 hours):
   - Deploy hotfix if possible
   - Or remove feature entirely
   - Test thoroughly
   - Post-mortem meeting

### Planned Rollback (Test Loser)

**If test shows negative or neutral results:**

1. **Disable feature flag:**
   - PostHog → Set rollout to 0%

2. **Notify participating providers:**
   ```
   Subject: Thank You for Testing [Feature]

   Thank you for participating in our [feature] test.
   Based on feedback, we're exploring alternative approaches.
   Your insights helped us learn what works best for clinicians.

   We'll keep you updated on future improvements.
   ```

3. **Document learnings:**
   - What worked?
   - What didn't?
   - What did we learn?
   - What should we try next?

4. **Archive test:**
   - Save results to `docs/ab-tests/[feature-name].md`
   - Update feature flag metadata

---

## 📚 Best Practices

### Do's ✅

- **Start small:** Test with 10-20 providers first
- **Test one thing:** Change one variable at a time
- **Run long enough:** Minimum 1 week, ideally 2-4 weeks
- **Communicate:** Tell users they're in a test
- **Monitor closely:** Check daily for issues
- **Document everything:** Results, learnings, decisions
- **Celebrate wins:** Share successes with team

### Don'ts ❌

- **Don't test critical features:** Safety first
- **Don't test without baseline:** Need comparison point
- **Don't stop early:** Need statistical significance
- **Don't ignore qualitative feedback:** Talk to users
- **Don't test multiple changes:** Can't isolate cause
- **Don't forget mobile:** Test on all devices

---

## 🆘 Troubleshooting

### Issue: Flag not showing up

**Debug steps:**
1. Check PostHog dashboard: Feature Flags → Verify flag is active
2. Check browser console: `posthog.isFeatureEnabled('flag-key')`
3. Verify user is identified: `posthog.identify(userId)`
4. Clear browser cache and cookies
5. Check rollout percentage (may be in 50% that doesn't see it)

### Issue: Uneven split (60/40 instead of 50/50)

**Possible causes:**
- Small sample size (needs >100 users)
- User property filtering applied
- Browser caching issues

**Solution:**
- Wait for more users
- Verify no filters applied
- Force even split in PostHog settings

### Issue: No events tracked

**Debug steps:**
1. Check browser console for PostHog errors
2. Verify `NEXT_PUBLIC_POSTHOG_KEY` in environment
3. Test with: `analytics.track('test_event', { test: true })`
4. Check PostHog Activity → Live Events
5. Verify property sanitization isn't blocking events

---

## 📞 Support

**Questions about A/B testing?**
- Technical: engineering@holilabs.com
- Analytics: analytics@holilabs.com
- Compliance: compliance@holilabs.com

**Resources:**
- [PostHog Documentation](https://posthog.com/docs)
- [A/B Testing Best Practices](https://posthog.com/blog/ab-testing-guide)
- [Statistical Significance Calculator](https://www.optimizely.com/sample-size-calculator/)

---

**Document Version:** 1.0
**Last Updated:** October 2025
**Next Review:** After first 3 A/B tests completed
