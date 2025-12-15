# Protocol Persistence Implementation Guide

## 🎯 Overview

The Prevention Hub now includes **full database persistence** for applied protocols. When users click "Apply Protocol" in the AI Copilot, the system automatically creates a structured prevention plan in the database.

---

## ✅ What Was Implemented

### 1. **API Endpoint**
**File:** `src/app/api/prevention/plans/route.ts`

**POST /api/prevention/plans**
- Creates a new prevention plan from an applied protocol
- Validates protocol data with Zod schema
- Maps protocol to appropriate PreventionPlanType
- Stores interventions as goals and recommendations
- Links to international guideline source

**GET /api/prevention/plans?patientId=xxx**
- Retrieves all prevention plans for a patient
- Returns active and completed plans
- Includes full intervention details

### 2. **Database Integration**
Uses existing `PreventionPlan` model from Prisma schema:

```prisma
model PreventionPlan {
  id              String                @id @default(cuid())
  patientId       String
  patient         Patient               @relation(...)

  // Plan metadata
  planName        String
  planType        PreventionPlanType
  description     String?

  // Interventions stored as JSON
  goals           Json
  recommendations Json

  // Evidence & Guidelines
  guidelineSource String?
  evidenceLevel   String?

  // Status tracking
  status          PreventionPlanStatus  @default(ACTIVE)
  activatedAt     DateTime              @default(now())
  reviewedBy      String?
  reviewedAt      DateTime?

  // AI metadata
  aiGeneratedBy   String?
  aiConfidence    Float?

  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
}
```

### 3. **UI Integration**
**File:** `src/app/dashboard/ai/page.tsx`

Enhanced `handleProtocolApply` function:
- Shows loading message while saving
- Calls API endpoint with protocol data
- Displays success message with plan ID
- Shows error messages if save fails
- Provides detailed feedback to user

---

## 🔄 Data Flow

```
User clicks "Apply Protocol"
        ↓
handleProtocolApply() called
        ↓
Show loading message: "⏳ Aplicando protocolo..."
        ↓
POST /api/prevention/plans
        ↓
API validates data (Zod schema)
        ↓
API checks patient exists
        ↓
API maps protocol to PreventionPlanType
        ↓
API creates PreventionPlan in database
        ↓
API returns success with plan ID
        ↓
UI shows success message with details
        ↓
Prevention plan now stored in database ✅
```

---

## 📊 Protocol to PlanType Mapping

| Condition Key | PreventionPlanType | Example |
|---------------|-------------------|---------|
| `cardiovascular` | CARDIOVASCULAR | Post-MI, Hypertension |
| `coronary_heart_disease` | CARDIOVASCULAR | CHD protocols |
| `myocardial_infarction` | CARDIOVASCULAR | MI prevention |
| `hypertension` | CARDIOVASCULAR | WHO 25 by 25 |
| `hyperlipidemia` | CARDIOVASCULAR | Lipid management |
| `diabetes_type_2` | DIABETES | ADA guidelines |
| `diabetes_type_1` | DIABETES | Type 1 management |
| `prediabetes` | DIABETES | Prevention programs |
| `sickle_cell_anemia` | COMPREHENSIVE | WHO SCD pregnancy |
| `chronic_kidney_disease` | COMPREHENSIVE | KDIGO guidelines |
| `depression` | COMPREHENSIVE | Mental health screening |
| `tobacco_use` | COMPREHENSIVE | Cessation programs |
| *Others* | COMPREHENSIVE | Default fallback |

---

## 🎬 Testing the Feature

### Test 1: Apply Protocol (Success)

1. Start dev server: `pnpm dev`
2. Navigate to `/dashboard/ai`
3. Select **Fatima Hassan** (SCD pregnancy patient)
4. Prevention sidebar shows WHO SCD Pregnancy protocol
5. Click **"Apply Protocol"** button
6. **Expected:**
   - Loading message appears: "⏳ Aplicando protocolo..."
   - Success message appears with plan ID
   - Database now contains prevention plan

**Success Message Format:**
```
✅ Protocolo aplicado exitosamente: "WHO SCD Pregnancy Management (2025)"

📋 Plan de prevención creado para Fatima Hassan
• 7 intervenciones agregadas
• Fuente: WHO June 2025
• Nivel de evidencia: Grade A

ID del Plan: clxxxxx123456
```

### Test 2: Verify in Database

```sql
-- Check prevention plan was created
SELECT * FROM prevention_plans
WHERE "planName" = 'WHO SCD Pregnancy Management (2025)'
ORDER BY "createdAt" DESC
LIMIT 1;

-- Check goals/recommendations JSON
SELECT
  id,
  "planName",
  "planType",
  status,
  "guidelineSource",
  "evidenceLevel",
  goals,
  recommendations,
  "createdAt"
FROM prevention_plans
WHERE "patientId" = 'pt-004' -- Fatima Hassan
ORDER BY "createdAt" DESC;
```

### Test 3: Retrieve via API

```bash
# Get prevention plans for a patient
curl -X GET \
  'http://localhost:3000/api/prevention/plans?patientId=pt-004' \
  -H 'Cookie: next-auth.session-token=YOUR_SESSION_TOKEN'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "patientId": "pt-004",
    "preventionPlans": [
      {
        "id": "clxxxxx123456",
        "planName": "WHO SCD Pregnancy Management (2025)",
        "planType": "COMPREHENSIVE",
        "description": "First global guideline for managing sickle cell disease during pregnancy...",
        "status": "ACTIVE",
        "guidelineSource": "WHO June 2025",
        "evidenceLevel": "Grade A",
        "goals": [...],
        "recommendations": [...],
        "activatedAt": "2025-01-21T10:30:00.000Z",
        "createdAt": "2025-01-21T10:30:00.000Z"
      }
    ],
    "totalPlans": 1,
    "activePlans": 1
  }
}
```

---

## 📦 Data Structure

### Goals Format (JSON)
```json
[
  {
    "goal": "Folic acid 5mg daily (increased dose for SCD)",
    "targetDate": null,
    "status": "PENDING",
    "category": "medication",
    "evidence": "WHO 2025 - Grade A: Prevents neural tube defects...",
    "frequency": "daily"
  },
  {
    "goal": "Monthly antenatal visits starting at 16 weeks",
    "targetDate": null,
    "status": "PENDING",
    "category": "monitoring",
    "evidence": "WHO 2025 - Grade A: Earlier detection of complications",
    "frequency": "monthly"
  }
]
```

### Recommendations Format (JSON)
```json
[
  {
    "category": "medication",
    "intervention": "Folic acid 5mg daily (increased dose for SCD)",
    "evidence": "WHO 2025 - Grade A: Prevents neural tube defects...",
    "frequency": "daily",
    "priority": "CRITICAL"
  },
  {
    "category": "screening",
    "intervention": "Ultrasound growth scans every 4 weeks from 24 weeks",
    "evidence": "WHO 2025 - Grade A: Detects IUGR early",
    "frequency": "every 4 weeks from 24 weeks gestation",
    "priority": "CRITICAL"
  }
]
```

---

## 🔐 Security & Validation

### Request Validation (Zod Schema)
```typescript
const CreatePlanSchema = z.object({
  patientId: z.string(),
  protocol: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    conditionKey: z.string(),
    source: z.string(),
    guidelineVersion: z.string(),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    evidenceGrade: z.enum(['A', 'B', 'C']),
    interventions: z.array(...),
    guidelineUrl: z.string().optional(),
  }),
});
```

### Authentication & Authorization
- ✅ Requires valid session (NextAuth)
- ✅ Verifies patient exists before creating plan
- ✅ Links plan to reviewing clinician (reviewedBy field)
- ✅ Tracks creation timestamp
- ✅ Records AI generation metadata

### Data Integrity
- ✅ All fields validated before insertion
- ✅ Foreign key constraints enforced (patientId)
- ✅ JSON fields validated by Zod schema
- ✅ Timestamps automatically managed by Prisma

---

## 🎯 Benefits of Persistence

### 1. **Longitudinal Tracking**
- Full history of prevention plans for each patient
- Track when protocols were applied
- Monitor adherence to interventions
- Review outcomes over time

### 2. **Clinical Decision Support**
- Avoid duplicate protocol applications
- Check for conflicting interventions
- Track completion status of goals
- Generate reports on prevention effectiveness

### 3. **Quality Improvement**
- Measure protocol adoption rates
- Identify gaps in preventive care
- Track evidence-based practice compliance
- Support quality metrics reporting

### 4. **Care Coordination**
- Share prevention plans across care team
- Export to EMR systems
- Generate patient summaries
- Support transitions of care

### 5. **Regulatory Compliance**
- Document preventive care interventions
- Support quality measure reporting (HEDIS, MIPS)
- Maintain audit trail
- Demonstrate evidence-based practice

---

## 📈 Future Enhancements

### Planned Features:

1. **Goal Tracking**
   - Mark individual goals as completed
   - Set target dates for interventions
   - Track progress percentages
   - Generate reminders

2. **Plan Updates**
   - PUT endpoint to update plan status
   - Modify goals and recommendations
   - Add clinical notes
   - Document adherence

3. **Deactivation & Completion**
   - Mark plans as COMPLETED when goals met
   - DEACTIVATE plans no longer relevant
   - Archive historical plans
   - Generate completion reports

4. **Integration with Care Plans**
   - Link prevention plans to care plans
   - Sync with appointment scheduler
   - Generate task lists for providers
   - Patient-facing prevention dashboard

5. **Analytics Dashboard**
   - Protocol application rates by condition
   - Provider adoption metrics
   - Patient outcome tracking
   - Population health insights

6. **Export Capabilities**
   - PDF prevention plan summaries
   - HL7 FHIR CarePlan resources
   - Integration with EMRs
   - Patient education materials

---

## 🐛 Error Handling

### Common Errors:

**401 Unauthorized**
```json
{
  "error": "Unauthorized - Please log in"
}
```
**Solution:** User needs to sign in

**404 Patient Not Found**
```json
{
  "error": "Patient not found"
}
```
**Solution:** Verify patientId is correct

**400 Invalid Request**
```json
{
  "error": "Invalid request data",
  "details": [
    {
      "path": ["protocol", "interventions"],
      "message": "Required"
    }
  ]
}
```
**Solution:** Check protocol structure matches schema

**500 Server Error**
```json
{
  "error": "Failed to create prevention plan",
  "message": "Database connection error"
}
```
**Solution:** Check database connection, Prisma setup

---

## 🔍 Debugging

### Check API Logs
```bash
# View server logs
pnpm dev

# Look for POST /api/prevention/plans requests
# Check for errors in console
```

### Check Database
```sql
-- Count prevention plans
SELECT COUNT(*) FROM prevention_plans;

-- Recent plans
SELECT
  "planName",
  "planType",
  status,
  "createdAt"
FROM prevention_plans
ORDER BY "createdAt" DESC
LIMIT 10;

-- Plans by type
SELECT
  "planType",
  COUNT(*) as count
FROM prevention_plans
GROUP BY "planType";
```

### Check Browser Console
```javascript
// In browser console after clicking "Apply Protocol"
// Check for fetch errors
// Verify request payload
// Check response status
```

---

## 📝 Code Files Modified

### New Files:
1. **`src/app/api/prevention/plans/route.ts`** (~260 lines)
   - POST endpoint for creating plans
   - GET endpoint for retrieving plans
   - Zod validation schemas
   - Error handling

### Modified Files:
1. **`src/app/dashboard/ai/page.tsx`**
   - Updated `handleProtocolApply()` to async
   - Added API call with fetch
   - Added loading/success/error messages
   - Improved user feedback

### Documentation:
1. **`PROTOCOL_PERSISTENCE_GUIDE.md`** (this file)
   - Implementation details
   - Testing instructions
   - Data structures
   - Error handling

---

## ✅ Implementation Checklist

- [x] Create API endpoint for prevention plan creation
- [x] Implement Zod validation schema
- [x] Add authentication checks
- [x] Verify patient existence
- [x] Map protocol to PreventionPlanType
- [x] Store goals and recommendations as JSON
- [x] Link to guideline sources
- [x] Update UI to call API
- [x] Add loading/success/error states
- [x] Test with demo patients
- [x] TypeScript compilation passes
- [x] Document implementation

### Still To Do:
- [ ] Add toast notifications for better UX
- [ ] Create prevention plan history view
- [ ] Add goal tracking functionality
- [ ] Implement plan update endpoint
- [ ] Add analytics dashboard
- [ ] Export to PDF/FHIR

---

## 🎉 Success!

The Prevention Hub now has **full database persistence**! Every protocol applied in the AI Copilot is automatically saved to the database, creating a complete longitudinal record of preventive care interventions for each patient.

**Test it now:**
1. `pnpm dev`
2. Navigate to `/dashboard/ai`
3. Select Fatima Hassan
4. Click "Apply Protocol" on WHO SCD Pregnancy
5. Watch the success message with plan ID
6. Check database to see stored plan! 🎉
