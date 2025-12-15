# Prevention Hub - Quick Demo Guide

## 🎯 What You'll See

The Prevention Hub is now fully integrated into the AI Copilot with **automatic condition detection** and **real-time protocol suggestions**.

## 🚀 Start the Demo

```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
pnpm dev
```

Navigate to: **http://localhost:3000/dashboard/ai**

## 📋 Demo Scenarios

### Scenario 1: Diabetes & Hypertension (María González)

**What Happens Automatically:**
1. Select patient **"María González"** (50 years old, female)
2. **Prevention sidebar appears immediately** on the right side
3. Shows detected conditions from her ICD-10 codes (E11.9, I10) and medications:
   - ✅ **Diabetes Type 2** (100% confidence from ICD-10 + 95% from Metformin)
   - ✅ **Hypertension** (100% confidence from ICD-10 + 90% from Lisinopril)
4. Protocol suggestions appear:
   - **[HIGH] WHO 25 by 25 Hypertension Protocol**
   - **[HIGH] NHS Lipid Management** (from Atorvastatin)
   - **[MEDIUM] ADA Diabetes Type 2 Management**

**Medications Detected:**
- Metformin 1000mg → Infers Diabetes
- Lisinopril 10mg → Infers Hypertension
- Atorvastatin 20mg → Infers Hyperlipidemia

**Try Adding:**
Type in chat: "Patient mentions feeling tired lately. Recent HbA1c is 8.1%, up from 7.2%."

**Result:**
- Sidebar updates in real-time
- May trigger additional diabetes management protocols
- Notification badge blinks if new protocols detected

---

### Scenario 2: Post-MI Cardiovascular Disease (Carlos Silva)

**What Happens Automatically:**
1. Select patient **"Carlos Silva"** (65 years old, male)
2. Prevention sidebar appears with cardiovascular protocols
3. Detected from ICD-10 codes (I21.9 MI, I25.10 CAD, I50.9 HF):
   - ✅ **Myocardial Infarction** (100% confidence)
   - ✅ **Coronary Artery Disease** (100% confidence)
   - ✅ **Heart Failure** (100% confidence)
4. **CRITICAL priority protocols** appear:
   - **[CRITICAL] Post-MI Secondary Prevention**
   - **[HIGH] WHO HEARTS Initiative**
   - **[HIGH] NHS CVD Prevention**

**Medications Detected:**
- Aspirin 81mg → Post-MI antiplatelet
- Atorvastatin 80mg → Lipid management
- Metoprolol 50mg → Beta-blocker for MI
- Lisinopril 20mg → ACE inhibitor for HF

**Lab Values Considered:**
- LDL: 85 mg/dL (at goal)
- BP: 128/78 (controlled)
- Ejection Fraction: 45% (reduced)

**Try Adding:**
Type: "Patient reports occasional chest discomfort with exertion. Stopped smoking 6 months ago."

**Result:**
- Adds tobacco cessation success note
- May trigger Canadian Task Force Tobacco protocols
- Updates cardiovascular risk assessment

---

### Scenario 3: Sickle Cell Disease - PREGNANCY (Fatima Hassan) 🚨

**What Happens Automatically:**
1. Select patient **"Fatima Hassan"** (28 years old, female, pregnant)
2. **CRITICAL priority notification** appears immediately
3. Detected from ICD-10 codes (D57.1, Z34.00) and medications:
   - ✅ **Sickle Cell Disease** (100% confidence from ICD-10 + 98% from Hydroxyurea)
   - ✅ **Pregnancy Status** (100% confidence from ICD-10)
4. **WHO SCD Pregnancy Protocol appears** (June 2025 guideline):
   - **[CRITICAL] WHO SCD Pregnancy Management (2025)**
   - "Women with SCD have 4-11x higher maternal mortality risk"
   - Shows pregnancy-specific interventions

**Medications Detected:**
- Hydroxyurea 500mg → 98% confidence SCD
- Folic acid 5mg → Pregnancy supplementation (increased dose for SCD)

**Lab Values:**
- Hemoglobin: 9.2 g/dL (anemia)
- Fetal Hemoglobin: 18.5% (therapeutic response to hydroxyurea)

**Protocol Interventions Shown:**
1. ✅ Folic acid 5mg daily (already on this!)
2. 📅 Monthly antenatal visits starting at 16 weeks
3. 🔬 Ultrasound growth scans every 4 weeks from 24 weeks
4. 💉 Low-dose aspirin 75-150mg for pre-eclampsia prevention
5. 🏥 Multidisciplinary care coordination
6. 🩺 Continuous fetal monitoring during labor

**Try Clicking:**
- **"Apply Protocol"** →
  - Shows loading message: "⏳ Aplicando protocolo..."
  - Creates prevention plan in database
  - Shows success message with plan ID
  - Includes intervention count and guideline source
  - ✅ **FULLY PERSISTED TO DATABASE**
- **"View Guideline"** → Opens WHO SCD pregnancy guideline (external link)
- **"Open Full Prevention Hub"** → Navigates to full prevention hub with patient context

**What Gets Saved:**
```
Prevention Plan Database Entry:
- Plan Name: "WHO SCD Pregnancy Management (2025)"
- Plan Type: COMPREHENSIVE
- Patient: Fatima Hassan (pt-004)
- Status: ACTIVE
- 7 Goals (interventions as actionable tasks)
- Guideline Source: WHO June 2025
- Evidence Level: Grade A
- Created At: [timestamp]
- Plan ID: clxxxxx123456
```

---

### Scenario 4: Asthma (Ana Rodríguez)

**What Happens:**
1. Select patient **"Ana Rodríguez"** (35 years old, female)
2. Sidebar shows asthma detection from ICD-10 (J45.40)
3. Currently fewer prevention protocols for respiratory conditions
4. Shows importance of expanding protocol database

**Try Adding:**
Type: "Patient also has seasonal allergies and family history of cardiovascular disease. Mother had MI at age 55."

**Result:**
- May detect cardiovascular risk factors
- Family history triggers additional screening protocols

---

## 🎬 Visual Guide to UI States

### Collapsed State (No Conditions)
```
Right side → Floating Shield icon (green gradient)
Click → Expands to full sidebar
```

### Collapsed State (With Protocols)
```
Right side → Shield icon with RED BADGE showing count
Badge BOUNCES when new protocols detected
Icon PULSES (subtle blink animation)
Click → Expands to 384px sidebar
```

### Expanded State
```
┌─────────────────────────────────────┐
│ 🛡️ Prevention Hub                   │
│ International Guidelines            │
├─────────────────────────────────────┤
│ ⭐ New protocols available (blinks) │
├─────────────────────────────────────┤
│ 📊 Detected Conditions (3)          │
│                                     │
│ • Diabetes Type 2         [95%]    │
│ • Hypertension           [100%]    │
│ • Hyperlipidemia          [88%]    │
├─────────────────────────────────────┤
│ ✅ Suggested Protocols (5)          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [CRITICAL] WHO SCD Pregnancy    │ │
│ │ 🌍 WHO June 2025                │ │
│ │                                 │ │
│ │ Women with SCD have 4-11x...    │ │
│ │                                 │ │
│ │ 💊 Folic acid 5mg daily         │ │
│ │ 📅 Monthly antenatal visits     │ │
│ │                                 │ │
│ │ [Apply Protocol] [View Guide]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ View all 5 protocols →              │
├─────────────────────────────────────┤
│ [Open Full Prevention Hub]          │
└─────────────────────────────────────┘
```

---

## 🔍 What to Look For

### ✅ Automatic Detection Works:
- [ ] Sidebar appears when patient is selected
- [ ] ICD-10 codes detected (100% confidence)
- [ ] Medications infer conditions (80-98% confidence)
- [ ] Clinical notes trigger NLP detection
- [ ] Multiple sources combine intelligently

### ✅ UI Animations Work:
- [ ] Shield icon pulses when protocols available
- [ ] Notification badge bounces on new protocols
- [ ] Smooth 300ms transition between collapsed/expanded
- [ ] Yellow notification bar appears and auto-dismisses

### ✅ Priority System Works:
- [ ] CRITICAL = Red background/border
- [ ] HIGH = Orange background/border
- [ ] MEDIUM = Yellow background/border
- [ ] LOW = Blue background/border
- [ ] Protocols sorted by priority in UI

### ✅ Applicability Criteria Work:
- [ ] WHO SCD Pregnancy only shows for pregnant females aged 15-49
- [ ] Age-restricted protocols filter correctly
- [ ] Gender-specific protocols filter correctly
- [ ] Lab value thresholds considered

### ✅ Interactions Work:
- [ ] "Apply Protocol" creates system message in chat
- [ ] External guideline links open in new tab
- [ ] "Open Full Prevention Hub" navigates correctly
- [ ] Patient switching resets context properly

---

## 🧪 Advanced Testing

### Test Real-Time Updates:
1. Select María González
2. Wait for initial protocols to appear
3. Type: "Patient started taking insulin glargine 20 units at bedtime"
4. **Expected:** New protocol suggestions appear for insulin therapy
5. **Expected:** Notification badge updates and blinks

### Test Multiple Condition Detection:
1. Select any patient
2. Type: "Patient has hypertension, diabetes, CKD stage 3, and depression. On multiple medications."
3. **Expected:** 4+ conditions detected
4. **Expected:** Combined protocols from multiple guidelines
5. **Expected:** No duplicate protocols shown

### Test Pregnancy Applicability:
1. Select Fatima Hassan (pregnant)
2. **Expected:** WHO SCD Pregnancy protocol appears (CRITICAL)
3. Switch to María González (not pregnant)
4. **Expected:** WHO SCD Pregnancy protocol does NOT appear

### Test Dark Mode:
1. Enable dark mode in browser/OS
2. **Expected:** All colors adapt appropriately
3. **Expected:** Text remains readable
4. **Expected:** Priority colors still distinguishable

---

## 📊 Detection Confidence Levels

| Source | Confidence | Example |
|--------|-----------|---------|
| ICD-10 Code Match | **100%** | E11.9 → Diabetes Type 2 |
| Medication Inference | **80-98%** | Metformin → 95% Diabetes |
| NLP Pattern Match | **70-90%** | "sickle cell" → 85% SCD |
| Lab Value Threshold | **85-95%** | HbA1c >6.5% → 90% Diabetes |

---

## 🎓 Protocol Sources Integrated

| Organization | Guidelines | Latest Update |
|-------------|-----------|---------------|
| 🌍 **WHO** | Global Action Plan, HEARTS, SCD Pregnancy | June 2025 |
| 🇬🇧 **NHS England** | CVD Prevention Toolkit | October 2025 |
| 🇪🇺 **ESC** | Dyslipidaemia Focused Update | 2025 |
| 🇨🇦 **Canadian Task Force** | Tobacco Cessation | August 2025 |
| 🇦🇺 **RACGP** | Red Book 10th Edition | August 2025 |
| 🩸 **NASCC** | Sickle Cell Consensus | January 2025 |

---

## 💡 Tips for Best Experience

1. **Start with Fatima Hassan** - Most dramatic demo (CRITICAL priority SCD pregnancy protocol)
2. **Try Carlos Silva next** - Shows post-MI cardiovascular protocols
3. **Use María González** - Shows typical diabetes/hypertension management
4. **Type natural clinical notes** - The NLP detection works best with realistic text

---

## 🐛 Troubleshooting

**Sidebar doesn't appear?**
- Check browser console for errors
- Verify patient has medications or ICD-10 codes
- Try refreshing the page

**Protocols not showing?**
- Check that patient conditions match protocol criteria
- Verify condition detection in browser console
- Check age/gender/pregnancy applicability

**TypeScript errors?**
```bash
pnpm tsc --noEmit --project apps/web/tsconfig.json
```

**Can't see animations?**
- Check that animations aren't disabled in OS accessibility settings
- Verify Tailwind CSS is loading properly
- Check for conflicting CSS

---

## 🚀 Next Steps After Demo

1. **Add more protocols** - Expand coverage for respiratory, oncology, mental health
2. **Implement persistence** - Save applied protocols to database
3. **Connect real patient data** - Use actual EHR/FHIR data
4. **Add analytics** - Track protocol suggestion and application rates
5. **Enhance NLP** - Improve condition detection accuracy with ML models

---

## 📞 Support

Questions? Check:
- `PREVENTION_HUB_TESTING.md` - Full testing guide
- `INTERNATIONAL_PREVENTION_PROTOCOLS.md` - Research documentation
- Browser console - Real-time detection logs
- React DevTools - Component state inspection

---

## 💾 Database Persistence (NEW!)

**Every protocol application is now saved to the database!**

### Verify in Database:
```sql
-- Check prevention plans were created
SELECT
  id,
  "planName",
  "planType",
  "patientId",
  status,
  "guidelineSource",
  "evidenceLevel",
  "createdAt"
FROM prevention_plans
ORDER BY "createdAt" DESC
LIMIT 10;

-- Get plans for Fatima Hassan
SELECT * FROM prevention_plans
WHERE "patientId" = 'pt-004'
ORDER BY "createdAt" DESC;

-- View recommendations JSON
SELECT
  "planName",
  recommendations
FROM prevention_plans
WHERE "planName" LIKE '%WHO SCD%';
```

### Retrieve via API:
```bash
# Get prevention plans for a patient
curl -X GET \
  'http://localhost:3000/api/prevention/plans?patientId=pt-004' \
  -H 'Cookie: next-auth.session-token=YOUR_SESSION_TOKEN'
```

### What's Stored:
- **Plan metadata:** Name, type, description
- **Interventions:** 7 goals with categories and evidence
- **Guideline source:** WHO June 2025
- **Evidence level:** Grade A, B, or C
- **Status tracking:** ACTIVE, COMPLETED, or DEACTIVATED
- **Timestamps:** Created, activated, reviewed
- **AI metadata:** Generation source and confidence

**See full details:** `PROTOCOL_PERSISTENCE_GUIDE.md`

---

**Ready to see it in action? Start the dev server and open `/dashboard/ai`! 🎉**
