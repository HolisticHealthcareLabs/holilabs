# 📊 PostHog Funnels & Dashboards Setup Guide

**Time Required:** 30 minutes
**Prerequisites:** PostHog configured, events tracking

---

## Part 1: Funnels

### 🎯 What are Funnels?

Funnels track user journeys through multi-step processes:
- **Onboarding:** signup → create patient → create note
- **Activation:** signup → 5+ notes in 7 days
- **Feature Adoption:** view feature → use feature → use again

---

## 1️⃣ Funnel #1: User Onboarding

**Goal:** Measure how many users complete first clinical workflow

### Create the Funnel

1. Go to PostHog → **Insights** → **New insight**
2. Select: **Funnel**
3. Configure:
   - **Name:** User Onboarding Funnel
   - **Step 1:** Event = `user_signup` or `otp_verified`
   - **Step 2:** Event = `patient_created`
   - **Step 3:** Event = `clinical_note_created`
   - **Time window:** 7 days (user must complete all steps within 7 days)

4. **Breakdown by:**
   - Property: `user_role` (CLINICIAN vs NURSE)
   - Or: `signup_method` (email vs SMS)

5. Click **Save & add to dashboard**

### Interpret Results

**Good Funnel:**
- Step 1 → Step 2: >80% conversion
- Step 2 → Step 3: >70% conversion
- Overall: >50% complete all 3 steps

**Poor Funnel:**
- <50% at any step = investigate
- High drop-off at Step 2 = onboarding UX issue
- High drop-off at Step 3 = feature too complex

---

## 2️⃣ Funnel #2: Activation (5+ Notes)

**Goal:** Measure "activated" users (those who create 5+ notes in first week)

### Create the Funnel

1. **Insights** → **New insight** → **Funnel**
2. Configure:
   - **Name:** User Activation (5+ Notes)
   - **Step 1:** Event = `user_signup`
   - **Step 2:** Event = `clinical_note_created` (must occur **5 times**)
   - **Time window:** 7 days

3. **Filters:**
   - Only users who signed up in last 30 days

4. Click **Save & add to dashboard**

### Target Metrics

- **Week 1:** 20% activation rate (goal)
- **Week 4:** 40% activation rate
- **Month 3:** 50% activation rate

---

## 3️⃣ Funnel #3: AI Scribe Adoption

**Goal:** Track users trying and adopting AI scribe

### Create the Funnel

1. **Insights** → **New insight** → **Funnel**
2. Configure:
   - **Name:** AI Scribe Adoption
   - **Step 1:** Event = `scribe_session_started`
   - **Step 2:** Event = `scribe_recording_started`
   - **Step 3:** Event = `scribe_soap_generated`
   - **Step 4:** Event = `clinical_note_signed`
   - **Time window:** Same session (1 hour)

3. Click **Save & add to dashboard**

### Analyze Drop-offs

- **High drop at Step 2:** Users don't understand how to start recording
- **High drop at Step 3:** Transcription quality issues
- **High drop at Step 4:** Generated SOAP notes need too much editing

---

## 4️⃣ Funnel #4: Weekly Retention

**Goal:** How many users come back each week?

### Create Retention Insight

1. **Insights** → **New insight** → **Retention**
2. Configure:
   - **Name:** Weekly Active Clinicians
   - **Cohort by:** Users who performed `clinical_note_created`
   - **Came back to:** Perform `clinical_note_created` again
   - **Time interval:** Weekly
   - **Date range:** Last 8 weeks

3. Click **Save & add to dashboard**

### Good Retention

- **Week 1:** 60% return (Day 7)
- **Week 2:** 50% return (Day 14)
- **Week 4:** 40% return (Day 28)
- **Week 8:** 30% return (Day 56)

---

## 5️⃣ Funnel #5: Patient Portal Usage

**Goal:** Track patient engagement

### Create the Funnel

1. **Insights** → **New insight** → **Funnel**
2. Configure:
   - **Name:** Patient Portal Engagement
   - **Step 1:** Event = `portal_login`
   - **Step 2:** Event = `portal_document_uploaded` or `portal_appointment_booked`
   - **Step 3:** Event = `portal_message_sent`
   - **Time window:** 14 days

3. Click **Save & add to dashboard**

---

## Part 2: Production Dashboard

### 🎯 Create Main Dashboard

1. Go to PostHog → **Dashboards** → **New dashboard**
2. **Name:** Holi Labs - Week 1 Launch Metrics
3. **Description:** Key metrics for first week after launch

---

## 6️⃣ Dashboard Panels

### Panel #1: Daily Active Users (DAU)

1. Click **Add insight** → **Trends**
2. Configure:
   - **Name:** Daily Active Users
   - **Event:** Any event
   - **Aggregation:** Unique users
   - **Date range:** Last 30 days
   - **Interval:** Daily

3. Add to dashboard

**Target:** 5+ DAU by end of Week 1

---

### Panel #2: Clinical Notes Created

1. **Add insight** → **Trends**
2. Configure:
   - **Name:** Clinical Notes per Day
   - **Event:** `clinical_note_created`
   - **Aggregation:** Total count
   - **Date range:** Last 30 days
   - **Breakdown by:** `noteType`

3. Add to dashboard

**Target:** 50+ notes by end of Week 1

---

### Panel #3: Onboarding Funnel

Add the funnel you created earlier:
1. Click **Add insight**
2. Select **Existing insight**
3. Choose **User Onboarding Funnel**
4. Add to dashboard

---

### Panel #4: Activation Rate

1. **Add insight** → **Formula**
2. Configure:
   - **Name:** Activation Rate (%)
   - **Formula:**
     ```
     (Users with 5+ notes / Total signups) * 100
     ```
   - **Series A:** Event = `user_signup` (Unique users)
   - **Series B:** Event = `clinical_note_created` (Unique users with 5+ events)
   - **Formula:** `(B / A) * 100`

3. Add to dashboard

**Target:** >20% activation in first week

---

### Panel #5: AI Scribe Usage Rate

1. **Add insight** → **Trends**
2. Configure:
   - **Name:** AI Scribe Sessions per Day
   - **Event:** `scribe_session_started`
   - **Aggregation:** Total count
   - **Date range:** Last 7 days

3. Add to dashboard

---

### Panel #6: Feature Adoption

1. **Add insight** → **Trends**
2. Configure:
   - **Name:** Feature Usage This Week
   - **Events:**
     - `patient_created`
     - `clinical_note_created`
     - `scribe_session_started`
     - `prescription_created`
     - `appointment_created`
   - **Aggregation:** Total count
   - **Date range:** Last 7 days

3. Display as: **Bar chart**
4. Add to dashboard

---

### Panel #7: Top User Activities

1. **Add insight** → **Trends**
2. Configure:
   - **Name:** Most Active Users
   - **Event:** Any event
   - **Aggregation:** Unique events per user
   - **Date range:** Last 7 days
   - **Breakdown by:** `user_id` (top 10)

3. Display as: **Table**
4. Add to dashboard

---

### Panel #8: Error Rate

1. **Add insight** → **Trends**
2. Configure:
   - **Name:** API Errors per Day
   - **Event:** `api_error`
   - **Aggregation:** Total count
   - **Date range:** Last 7 days

3. Add to dashboard

**Target:** <5 errors per day

---

## 7️⃣ Advanced Insights

### User Stickiness (DAU/MAU Ratio)

1. **Add insight** → **Trends**
2. Configure:
   - **Name:** User Stickiness (DAU/MAU)
   - **Series A:** Unique users (Last 1 day)
   - **Series B:** Unique users (Last 30 days)
   - **Formula:** `(A / B) * 100`

3. Add to dashboard

**Good stickiness:** >20%

---

### Time to First Value

1. **Add insight** → **Formula**
2. Configure:
   - **Name:** Avg Time to First Note (minutes)
   - Track: Time between `user_signup` and `clinical_note_created`
   - Use: **Session duration** or custom property

---

### Feature Flag Performance

1. **Add insight** → **Trends**
2. Configure:
   - **Name:** New Dashboard A/B Test
   - **Event:** `patient_created`
   - **Breakdown by:** `dashboard_variant`
   - **Compare:** new vs old conversion rates

---

## 8️⃣ Dashboard Organization

### Create Multiple Dashboards

**Dashboard 1: Launch Metrics (Week 1)**
- DAU, notes created, onboarding funnel

**Dashboard 2: Product Health**
- Error rate, API latency, user stickiness

**Dashboard 3: A/B Tests**
- All feature flag experiments

**Dashboard 4: Patient Portal**
- Patient engagement, portal usage

---

## 9️⃣ Alerts & Monitoring

### Set Up Alerts

1. Go to any insight
2. Click **⋯** (More) → **Create alert**
3. Configure:
   - **Trigger:** When value drops below X
   - **Threshold:** DAU < 3
   - **Notification:** Email or Slack

4. Save alert

### Common Alerts

| Metric | Threshold | Action |
|--------|-----------|--------|
| DAU | <3 users | Investigate churn |
| Error Rate | >10/day | Check logs |
| Activation Rate | <10% | Improve onboarding |
| Session Duration | <2 min | UX issues |

---

## 🔟 Weekly Review Checklist

Every Monday morning:

- [ ] Check DAU trend (growing?)
- [ ] Review onboarding funnel (any drop-offs?)
- [ ] Check activation rate (>20%?)
- [ ] Review top events (expected patterns?)
- [ ] Check error rate (<5/day?)
- [ ] Review A/B test results (clear winner?)
- [ ] Read user feedback (support tickets)

---

## 📊 Example Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│ Holi Labs - Week 1 Launch Metrics                  │
├─────────────────────┬───────────────────────────────┤
│ Daily Active Users  │  Clinical Notes per Day       │
│ [Line chart: 📈]   │  [Bar chart: 📊]              │
├─────────────────────┴───────────────────────────────┤
│ User Onboarding Funnel                              │
│ [Funnel: 100% → 85% → 72%]                         │
├─────────────────────┬───────────────────────────────┤
│ Activation Rate     │  AI Scribe Usage              │
│ [Big number: 24%]   │  [Line chart: 📈]            │
├─────────────────────┴───────────────────────────────┤
│ Feature Adoption This Week                          │
│ [Horizontal bar chart showing all features]        │
└─────────────────────────────────────────────────────┘
```

---

## 🆘 Troubleshooting

### Funnel shows 0% conversion

**Problem:** Events not tracking

**Solutions:**
1. Verify events are being sent: PostHog → Events → Live
2. Check event names match exactly (case-sensitive!)
3. Wait 2-3 minutes for data to appear
4. Verify time window is correct

### Dashboard not updating

**Problem:** Data stale

**Solutions:**
1. Click **Refresh** button
2. Clear dashboard cache
3. Check date range is correct
4. Verify events are still being tracked

---

## 📚 Additional Resources

- [PostHog Funnels Docs](https://posthog.com/docs/user-guides/funnels)
- [Dashboard Best Practices](https://posthog.com/blog/dashboard-best-practices)
- [Retention Analysis](https://posthog.com/docs/user-guides/retention)

---

**Total Setup Time:** 30 minutes

**What You Get:**
- 5 key funnels tracking user journeys
- 8 dashboard panels for daily monitoring
- Alerts for critical metrics
- Weekly review checklist

**Next Steps:**
1. Create all 5 funnels
2. Build main dashboard with 8 panels
3. Set up 3 alerts (DAU, errors, activation)
4. Review dashboard daily for first week
5. Iterate based on what you learn
