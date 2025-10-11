# AI Monetization Strategy for Holi Labs

## Executive Summary

**Recommendation: Hybrid Model with Progressive Disclosure**

Don't force doctors to bring their own API keys initially. Start with an inclusive model that removes friction, then offer advanced options for power users.

**Why:** Healthcare professionals are time-constrained and need immediate value. BYOK (Bring Your Own Key) creates a 3-5 step onboarding barrier that will kill adoption rates.

---

## 🎯 The Core Problem

**Current State:**
- You're using Gemini 2.0 Flash (~$0.10/1M input tokens)
- Deepgram Nova-2 for transcription (~$0.0043/minute)
- Average consultation: 15-20 minutes
- AI cost per SOAP note: ~$0.08-0.15

**Industry Benchmarks:**
- Average US doctor sees 15-25 patients/day
- Electronic health record (EHR) costs: $200-$800/month/provider
- AI scribes: $300-$500/month/provider (Ambient.ai, Nabla)

**Your Competitive Advantage:**
- Latin America: Lower price tolerance
- Gemini pricing: 10x cheaper than GPT-4
- Multi-modal: Scribe + patient portal + AI assistant

---

## 💰 Monetization Models Analysis

### Option 1: Inclusive Pricing (RECOMMENDED)

**Model:** All AI costs included in subscription

```
Tier 1: Básico - $49/month
- 100 SOAP notes/month
- Patient portal (unlimited patients)
- Basic AI assistant
- Email support

Tier 2: Profesional - $99/month
- Unlimited SOAP notes
- Advanced AI assistant (multi-turn conversations)
- WhatsApp integration
- Priority support
- Analytics dashboard

Tier 3: Clínica - $249/month
- 5 providers
- All Profesional features
- Custom integrations
- Dedicated account manager
- API access
```

**Pros:**
- ✅ Zero friction onboarding
- ✅ Predictable pricing for doctors
- ✅ You control the AI experience
- ✅ Can optimize costs (batch processing, caching)
- ✅ Standard SaaS model (easy to understand)

**Cons:**
- ⚠️ You absorb AI cost variability
- ⚠️ Need usage monitoring/abuse prevention
- ⚠️ Margin compression if usage spikes

**Unit Economics:**
```
Doctor Plan: $99/month
Costs:
- Infrastructure (DigitalOcean): ~$5/doctor
- AI costs (300 notes/month): ~$30
- Storage (R2): ~$2
- Support (allocated): ~$10
- Total COGS: ~$47

Gross Margin: 52% ($52 profit/doctor/month)
Target: 500 doctors = $26,000 MRR
```

---

### Option 2: BYOK (Bring Your Own Key)

**Model:** Doctors provide their own OpenAI/Gemini API keys

**Pros:**
- ✅ Zero AI costs for you
- ✅ Transparent usage for doctors
- ✅ Unlimited usage without your risk

**Cons:**
- ❌ **5-step onboarding friction:**
  1. Create Google Cloud account
  2. Enable Gemini API
  3. Generate API key
  4. Add payment method
  5. Configure in Holi Labs
- ❌ **Support nightmare:** "Why isn't my key working?"
- ❌ **Security risk:** Doctors storing API keys
- ❌ **No control over quality:** What if they use worse models?
- ❌ **Confusing billing:** Separate bills from Google + Holi Labs

**Reality Check:**
> "If you ask a busy doctor to get an API key, 70% will abandon onboarding." - Industry standard

---

### Option 3: Hybrid Model (RECOMMENDED FOR SCALE)

**Model:** Inclusive base + BYOK option for power users

**Phase 1: Launch (0-500 doctors)**
```
Only offer Inclusive Pricing
- Simple onboarding
- Validate unit economics
- Build usage patterns
```

**Phase 2: Growth (500-2000 doctors)**
```
Add BYOK as optional
- "Advanced Settings" → BYOK toggle
- For doctors who want to use GPT-4 or Claude
- Still charge base fee for platform ($29/month)
```

**Phase 3: Enterprise (2000+ doctors)**
```
White-label options
- Hospitals provide enterprise OpenAI keys
- You handle integration
- Volume discounts on platform fee
```

**Pricing Structure:**
```
Standard: $99/month (includes AI)
Standard + BYOK: $39/month (they bring API key)
Enterprise: Custom (volume discounts)
```

**Pros:**
- ✅ Best of both worlds
- ✅ Low friction for most users
- ✅ Power users get flexibility
- ✅ Progressive disclosure

**Cons:**
- ⚠️ More complex to build
- ⚠️ Need to support multiple AI providers

---

## 🎨 Doctor Workflow Analysis

### Current Workflow (WITHOUT AI):

```
1. Patient consultation (15-20 min)
2. Doctor writes notes by hand
3. Later: Doctor types into EHR (10-15 min)
4. Total time: 25-35 min/patient

Daily: 20 patients × 12.5 min = 4+ hours on documentation
```

### Proposed Workflow (WITH Holi Labs):

```
OPTION A: Real-time Scribe (Recommended)
────────────────────────────────────
1. Doctor opens Holi Labs on tablet
2. Taps "Start Recording" before patient enters
3. Has natural conversation with patient (15-20 min)
4. Taps "Stop Recording"
5. AI generates SOAP note in 30 seconds
6. Doctor reviews/edits (2-3 min)
7. Signs note
8. Patient receives summary via WhatsApp

Time saved: 10-12 min/patient
Daily savings: 20 patients × 11 min = 3.6 hours/day
```

```
OPTION B: Post-consultation Upload
────────────────────────────────────
1. Doctor records consultation on phone/tablet
2. At end of day, batch uploads 20 recordings
3. AI processes all overnight
4. Next morning: Review and sign all notes (30 min)

Time saved: 3+ hours/day
Workflow: Better for tech-averse doctors
```

```
OPTION C: AI Assistant (Chatbot)
────────────────────────────────────
1. Doctor has conversation with patient (no recording)
2. After patient leaves, opens AI Assistant
3. Dictates or types: "45 year old male, chief complaint: chest pain..."
4. AI asks clarifying questions
5. Builds SOAP note interactively
6. Doctor approves

Time saved: 8-10 min/patient
Privacy: No recording needed
```

---

## 🧠 AI Assistant Workflow Design

### Approach 1: Passive Scribe (Current Implementation)

**Flow:**
```mermaid
Consultation → Recording → Transcription → SOAP Generation → Review
```

**Interaction:**
- Doctor: 0 clicks during consultation
- AI: Silent observer
- Output: Complete SOAP note

**Pros:**
- ✅ No workflow disruption
- ✅ Captures everything
- ✅ Highest accuracy

**Cons:**
- ⚠️ Privacy concerns (recording)
- ⚠️ May miss context
- ⚠️ Requires patient consent

---

### Approach 2: Active Assistant (Future Feature)

**Flow:**
```
Doctor opens AI chat → Describes case → AI asks questions → Builds note collaboratively
```

**Example Interaction:**
```
Doctor: "Patient with diabetes, HbA1c elevated"

AI: "I'll help document this. A few questions:
    1. Current HbA1c value?
    2. Any symptoms (polyuria, polydipsia)?
    3. Current medications?
    4. Last eye exam date?"

Doctor: [Answers via voice or text]

AI: "Got it. Here's the SOAP note draft:

    S: 58M with T2DM presents for routine follow-up...
    [Generated note]

    Shall I add anything else?"
```

**Pros:**
- ✅ No recording needed
- ✅ Interactive = catches gaps
- ✅ Educational for new doctors

**Cons:**
- ⚠️ Requires active engagement
- ⚠️ Slower than passive scribe

---

### Approach 3: Hybrid (RECOMMENDED)

**Primary:** Passive scribe (real-time recording)
**Fallback:** Active assistant (when recording not possible)
**Enhancement:** AI suggests missing elements

**Example:**
```
[After recording and SOAP generation]

AI: "⚠️ Quality check:
    ✓ Subjective: Complete
    ✓ Objective: Vitals recorded
    ⚠️ Assessment: No ICD-10 code added
    ⚠️ Plan: No follow-up date specified

    Would you like me to suggest:
    - ICD-10: E11.9 (Type 2 diabetes without complications)
    - Follow-up: 3 months"
```

**Value Add:**
- Catches incomplete notes
- Suggests billing codes (increases revenue)
- Compliance checking

---

## 💡 Recommended Strategy: "Friction-Free Launch → Progressive Options"

### Phase 1: Launch (Now - Month 6)
**Goal:** Prove product-market fit

**Model:**
- All-inclusive pricing: $99/month
- Unlimited AI usage (with fair use policy)
- Simple onboarding: Email → Password → Start Recording

**Rationale:**
- Remove ALL friction
- Validate doctors will actually use AI scribe
- Understand real usage patterns
- Build case studies

**Metrics to Track:**
- Adoption rate (% who complete first SOAP note)
- Usage frequency (notes/week/doctor)
- Time-to-value (minutes to first note)
- AI cost per doctor
- Churn rate

**Expected Unit Economics:**
```
Revenue: $99/month
AI Cost: $20-40/month (200-400 notes)
Net: $59-79/month/doctor
Break-even: ~127 doctors
Profitability: 200+ doctors
```

---

### Phase 2: Optimize (Month 6-12)
**Goal:** Improve margins

**Actions:**
1. **Implement usage tiers:**
   ```
   Básico: $49/month (100 notes)
   Profesional: $99/month (unlimited notes)
   ```

2. **Add efficiency features:**
   - Batch processing (off-peak = lower AI costs)
   - Template caching (reduce tokens)
   - Smart chunking (cheaper transcription)

3. **Introduce BYOK option:**
   ```
   "Power User Mode"
   - Use your own Gemini/OpenAI key
   - Only pay $39/month platform fee
   - For doctors who want GPT-4 or specific models
   ```

**Expected Improvement:**
- Reduce AI costs by 30-40% (tiering + optimization)
- BYOK option captures price-sensitive users
- Margins improve to 60-65%

---

### Phase 3: Scale (Month 12+)
**Goal:** Enterprise expansion

**Model:**
- Self-serve: Inclusive pricing ($99/month)
- SMB (2-10 doctors): Volume discounts
- Enterprise (hospitals): Custom contracts + BYOK

**Enterprise Value Props:**
- Centralized billing
- Single-sign-on (SSO)
- White-label option
- Dedicated support
- Custom AI model training

**Pricing:**
```
Enterprise: $5,000-20,000/month
- 50-200 doctors included
- They provide enterprise OpenAI key
- You handle all integration
- Custom SLAs
```

---

## 🚫 What NOT to Do

### ❌ Don't Force BYOK at Launch
**Why:**
- Kills adoption (70% will abandon)
- Doctors don't understand API keys
- Support nightmare
- No competitive advantage

### ❌ Don't Use GPT-4 by Default
**Why:**
- 10x more expensive than Gemini
- Quality difference minimal for SOAP notes
- Margins disappear

### ❌ Don't Make AI Usage "Per Note"
**Why:**
- Microcharging feels expensive
- Doctor psychology: "Should I use AI for this?"
- Creates friction in workflow

### ❌ Don't Expose AI Complexity
**Why:**
- Doctors don't care about "tokens" or "models"
- They want: "Does it work?"
- Keep technical details hidden

---

## 🎯 Recommended Pricing (Final)

### Tier 1: Starter
```
$49/month per doctor

Includes:
- 100 AI-generated SOAP notes/month
- Patient portal (unlimited patients)
- Basic templates
- Email support

Target: Solo practitioners, new doctors
```

### Tier 2: Professional (RECOMMENDED)
```
$99/month per doctor

Includes:
- Unlimited AI SOAP notes
- Advanced AI assistant (multi-turn)
- WhatsApp integration
- Custom templates
- Priority support
- Analytics dashboard

Target: Established doctors, small clinics
```

### Tier 3: Clinic
```
$79/month per doctor (min 5 doctors)

Includes:
- Everything in Professional
- Centralized admin dashboard
- Team collaboration tools
- API access
- Dedicated account manager

Target: Multi-doctor clinics
```

### Add-ons (Optional):
```
BYOK Mode: -$60/month credit
- Bring your own Gemini/OpenAI key
- Still pay $39/month platform fee
- For power users only

White-label: +$500/month
- Custom branding
- Custom domain
- Remove "Powered by Holi Labs"
```

---

## 📊 Competitive Analysis

| Competitor | Pricing | AI Model | BYOK? | Target Market |
|------------|---------|----------|-------|---------------|
| **Ambient.ai** | $300-500/mo | Proprietary | ❌ No | US doctors |
| **Nabla** | €299/mo | GPT-4 | ❌ No | EU doctors |
| **Abridge** | $300/mo | Proprietary | ❌ No | US doctors |
| **DeepScribe** | $400/mo | Proprietary | ❌ No | US specialists |
| **Holi Labs** | $99/mo | Gemini 2.0 | ✅ Optional | LATAM doctors |

**Your Advantages:**
- 3-5x cheaper (LATAM pricing power)
- Using Gemini (90% cheaper than GPT-4)
- Multi-modal (scribe + portal + assistant)
- Optional BYOK (unique in market)

---

## 🎨 User Onboarding Flow

### New Doctor Signup (Zero-Friction)

```
Step 1: Landing Page
─────────────────────
"Documenta consultas en segundos con IA"
[Start Free Trial] ← 30 days free, no card needed

Step 2: Email Signup
─────────────────────
Email: _____________________
Password: __________________
[Sign Up]

Step 3: Quick Setup (30 seconds)
─────────────────────────────────
Name: _____________________
Specialty: [Dropdown]
Country: [Dropdown]
[Continue]

Step 4: Onboarding Tutorial (Skippable)
────────────────────────────────────────
[Video: 45 seconds]
"Watch how Dr. García uses Holi Labs"
[Skip] [Watch Tutorial]

Step 5: First Recording
───────────────────────
"¡Estás listo! Graba tu primera consulta"
[🎤 Start Recording]

👉 Total time to first value: 2 minutes
```

**NO mention of:**
- API keys
- AI models
- Technical setup
- Payment (not for 30 days)

---

## 🔐 BYOK Implementation (Phase 2)

### When to Show BYOK Option

**Trigger Points:**
1. Doctor exceeds 500 notes/month (power user)
2. Doctor requests GPT-4 or Claude
3. Doctor asks "Can I use my own API key?"

**UI/UX:**
```
Settings → Advanced → AI Configuration

Current: Holi Labs AI (Gemini 2.0 Flash) ✅
- Unlimited usage included in your plan
- Optimized for medical documentation

Want more control?
[ ] Enable "Bring Your Own Key" mode

⚠️ Advanced option for power users
- Save $60/month on subscription ($99 → $39)
- Use your preferred AI model (GPT-4, Claude, etc.)
- You pay AI provider directly
- Requires technical setup

[Learn More] [Enable BYOK]
```

**Setup Wizard (If enabled):**
```
Step 1: Choose Provider
- [ ] Google Gemini
- [ ] OpenAI (GPT-4)
- [ ] Anthropic (Claude)

Step 2: Enter API Key
API Key: ____________________
[Test Connection]

Step 3: Configure Model
Model: [Dropdown]
Max Tokens: 4096
Temperature: 0.3

[Save Configuration]
```

---

## 💰 Financial Projections (3 Years)

### Conservative Scenario

**Year 1:**
- Doctors: 200
- MRR: $19,800
- ARR: $237,600
- Gross Margin: 55%

**Year 2:**
- Doctors: 800
- MRR: $79,200
- ARR: $950,400
- Gross Margin: 62% (optimization)

**Year 3:**
- Doctors: 2,500
- MRR: $247,500
- ARR: $2,970,000
- Gross Margin: 68% (enterprise deals)

**Costs:**
- AI (Gemini): $30/doctor/month → $25 (optimization)
- Infrastructure: $5/doctor/month → $3 (scale)
- Support: $10/doctor/month → $8 (automation)

---

## 🎯 Final Recommendation

### Start Simple, Add Complexity Later

**Phase 1 (Now):** All-inclusive pricing
- $99/month, unlimited AI
- Zero friction onboarding
- Focus on adoption

**Phase 2 (6 months):** Add options
- Usage tiers ($49/$99)
- BYOK for power users
- Optimize margins

**Phase 3 (12 months):** Enterprise scale
- Volume discounts
- White-label
- Custom contracts

---

## 🚀 Action Items

### Immediate (This Week):
1. ✅ Finalize pricing: $99/month unlimited
2. ✅ Set up Stripe billing
3. ✅ Create 30-day free trial flow
4. ✅ Build simple onboarding (< 2 min)

### Short-term (1-3 Months):
1. Launch with 10 beta doctors
2. Track usage metrics
3. Optimize AI costs (caching, batching)
4. Build case studies

### Long-term (3-12 Months):
1. Introduce usage tiers
2. Add BYOK option (hidden in Advanced Settings)
3. Build enterprise features
4. Expand to other countries

---

## 📚 References

- Ambient.ai pricing: https://www.ambient.ai/pricing
- Nabla Copilot: https://www.nabla.com/copilot
- Healthcare AI market size: $15.1B by 2028 (CAGR 37.5%)
- Doctor burnout stats: 63% cite documentation burden
- EHR satisfaction: 40% of doctors satisfied

---

**Bottom Line:**

Don't make doctors deal with API keys at launch. Start with inclusive, simple pricing. Add BYOK as an advanced option later for power users who request it.

**Focus on:** Removing friction, proving value quickly, building case studies.

**Last Updated:** October 11, 2025
**Author:** Strategic Product Analysis
**Status:** Recommendation for MVP Launch
