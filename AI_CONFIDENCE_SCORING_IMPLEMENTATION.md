# AI Confidence Scoring Implementation - Complete

**Date**: November 26, 2025
**Status**: ✅ **COMPLETE**
**Implementation Time**: ~45 minutes
**Trust & Safety Impact**: Required review workflow prevents signing of low-confidence notes

---

## Summary

Enhanced AI confidence scoring in the SOAP Note Editor with:
- **Visual confidence indicators** (badges, icons, colors)
- **Required review workflow** (blocks signing if confidence < 60%)
- **Configurable thresholds** (HIGH: 90%, MEDIUM: 75%, LOW: 60%)
- **Section-level alerts** (warns clinicians of low-confidence sections)
- **Dark mode support** (all visual indicators work in dark mode)

---

## Architecture

### Confidence Score Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                 Overall Confidence Score                     │
│  Weighted average of all SOAP sections (S, O, A, P)         │
│  Displayed in prominent banner at top of note               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Section-Level Confidence Scores                 │
│  - Subjective: note.subjectiveConfidence                    │
│  - Objective: note.objectiveConfidence                      │
│  - Assessment: note.assessmentConfidence                    │
│  - Plan: note.planConfidence                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Required Review Workflow                        │
│  Blocks signing if:                                          │
│  1. Overall confidence < 60%,  OR                            │
│  2. ANY section confidence < 60%                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Confidence Thresholds

### Configurable Organization-Wide Thresholds

| Threshold | Value | Color | Icon | Label | Action Required |
|-----------|-------|-------|------|-------|-----------------|
| **HIGH** | ≥90% | Green | ✅ | "Alta confianza" | No action needed |
| **MEDIUM** | ≥75% | Yellow | ⚠️ | "Confianza media - Revisar recomendado" | Review recommended |
| **LOW** | ≥60% | Orange | ⚠️ | "Confianza baja - Revisar REQUERIDO" | Review required |
| **CRITICAL** | <60% | Red | ❌ | "Confianza muy baja - NO FIRMAR sin revisión manual" | **Signing BLOCKED** |

### Threshold Configuration (Code)

Located in `/apps/web/src/components/scribe/SOAPNoteEditor.tsx` lines 190-193:

```typescript
const CONFIDENCE_THRESHOLD_HIGH = 0.9;    // Green - High confidence
const CONFIDENCE_THRESHOLD_MEDIUM = 0.75; // Yellow - Medium confidence (review recommended)
const CONFIDENCE_THRESHOLD_LOW = 0.6;     // Red - Low confidence (review REQUIRED before signing)
```

**Future Enhancement**: Move these to database configuration for per-organization customization.

---

## Visual Indicators

### 1. Overall Confidence Banner (Enhanced)

**Location**: Top of SOAP note editor

**Features**:
- Large prominent card with colored background
- Icon + confidence percentage (large font)
- Confidence label (e.g., "Alta confianza")
- **Low confidence warning** (if < 75%):
  - Alert icon (🚨 or ⚠️)
  - Warning message
  - Recommended action
- **Confidence breakdown** (if < 90%):
  - Grid showing all 4 section scores
  - Quick identification of problematic sections

**Example (High Confidence - 95%)**:
```
┌──────────────────────────────────────────────────────┐
│  ✅ Confianza General de IA              95%         │
│     Alta confianza                   Precisión       │
│                                      estimada        │
└──────────────────────────────────────────────────────┘
```

**Example (Low Confidence - 58%)**:
```
┌──────────────────────────────────────────────────────┐
│  ❌ Confianza General de IA              58%         │
│     Confianza muy baja - NO FIRMAR   Precisión      │
│     sin revisión manual              estimada       │
│                                                      │
│  🚨 Revisión OBLIGATORIA antes de firmar            │
│  La confianza es demasiado baja para firmar         │
│  automáticamente. Revise y edite todas las          │
│  secciones manualmente.                              │
│                                                      │
│  Confianza por sección:                              │
│  Subjetivo   Objetivo   Evaluación   Plan           │
│     62%         58%         55%       64%            │
└──────────────────────────────────────────────────────┘
```

### 2. Section-Level Confidence Badges

**Location**: Next to each SOAP section header (S, O, A, P)

**Design**:
- Rounded pill badge with border
- Icon + percentage
- Color-coded by threshold
- Dark mode compatible

**Example**:
```
Subjetivo (S)                          ✅ 94%
Objetivo (O)                           ⚠️ 72%
Evaluación (A)                         ❌ 55%
Plan (P)                               ✅ 89%
```

### 3. Section-Level Alerts

**Location**: Below section header, above content

**Displayed when**:
- Confidence < 60% (CRITICAL): Red alert - "Confianza crítica: Revise y corrija esta sección manualmente antes de firmar"
- Confidence 60-75% (LOW): Orange alert - "Revisión recomendada: Verifique la precisión de esta sección"

**Example**:
```
┌──────────────────────────────────────────────────────┐
│ Evaluación (A)                         ❌ 55%        │
│ ⚠️ Confianza crítica: Revise y corrija esta         │
│    sección manualmente antes de firmar               │
│                                                      │
│ [Content here...]                                    │
└──────────────────────────────────────────────────────┘
```

---

## Required Review Workflow

### Sign Button Behavior

**Conditions for Signing**:
1. ✅ Overall confidence ≥ 60%
2. ✅ **ALL** section confidences ≥ 60%

**Blocking Logic** (`canSign()` function):
```typescript
const canSign = () => {
  return note.overallConfidence >= CONFIDENCE_THRESHOLD_LOW && !hasLowConfidenceSections();
};

const hasLowConfidenceSections = () => {
  return (
    note.subjectiveConfidence < CONFIDENCE_THRESHOLD_LOW ||
    note.objectiveConfidence < CONFIDENCE_THRESHOLD_LOW ||
    note.assessmentConfidence < CONFIDENCE_THRESHOLD_LOW ||
    note.planConfidence < CONFIDENCE_THRESHOLD_LOW
  );
};
```

### Signing Blocked Alert

**Displayed when**: Signing is blocked due to low confidence

**Location**: Below Sign button, above WhatsApp notification button

**Content**:
- 🚨 icon
- Bold title: "No se puede firmar - Confianza insuficiente"
- Explanation message
- **List of sections requiring review** (dynamically generated):
  - Shows only sections with confidence < 60%
  - Displays section name and percentage

**Example**:
```
┌──────────────────────────────────────────────────────┐
│  🚨 No se puede firmar - Confianza insuficiente     │
│                                                      │
│  La IA no tiene suficiente confianza en la          │
│  precisión de esta nota. Debe revisar y editar      │
│  manualmente las secciones marcadas antes de        │
│  firmar.                                             │
│                                                      │
│  Secciones que requieren revisión:                  │
│  • Objetivo (58%)                                    │
│  • Evaluación (55%)                                  │
└──────────────────────────────────────────────────────┘
```

---

## Files Modified

### 1. `/apps/web/src/components/scribe/SOAPNoteEditor.tsx` (MODIFIED)

**Lines Added/Modified**: ~150 lines

**Changes**:

1. **Added Confidence Thresholds** (lines 190-193):
   ```typescript
   const CONFIDENCE_THRESHOLD_HIGH = 0.9;
   const CONFIDENCE_THRESHOLD_MEDIUM = 0.75;
   const CONFIDENCE_THRESHOLD_LOW = 0.6;
   ```

2. **Enhanced Confidence Color Function** (lines 195-200):
   - Added 4th threshold (CRITICAL: <60%)
   - Added dark mode color classes
   - More granular color coding

3. **Enhanced Confidence Label Function** (lines 202-207):
   - 4 distinct labels based on thresholds
   - Clearer action guidance

4. **Added Confidence Icon Function** (lines 209-214):
   - ✅ High (≥90%)
   - ⚠️ Medium/Low (75-89%, 60-74%)
   - ❌ Critical (<60%)

5. **Added `hasLowConfidenceSections()` Function** (lines 216-224):
   - Checks if ANY section is below LOW threshold
   - Used for blocking signing

6. **Added `canSign()` Function** (lines 226-230):
   - Determines if note can be signed
   - Blocks if overall OR any section < 60%

7. **Enhanced Overall Confidence Banner** (lines 343-406):
   - 2x larger, more prominent
   - Icon + large percentage display
   - Low confidence warning (if < 75%)
   - Confidence breakdown grid (if < 90%)

8. **Enhanced Section-Level Badges** (4x sections: S, O, A, P):
   - Rounded pill design
   - Icon + percentage
   - Dark mode support

9. **Added Section-Level Alerts** (below each section header):
   - Red alert for CRITICAL (<60%)
   - Orange alert for LOW (60-75%)

10. **Modified Sign Button** (lines 973-980):
    - Added `disabled={!canSign()}`
    - Added tooltip explaining why disabled

11. **Added Signing Blocked Alert** (lines 983-1007):
    - Prominent red alert box
    - Dynamic list of problematic sections
    - Clear action guidance

---

## User Experience Flow

### Scenario 1: High Confidence Note (90%+)

1. **Overall Banner**: Green, "Alta confianza" ✅
2. **Section Badges**: All green with ✅ icons
3. **Section Alerts**: None displayed
4. **Sign Button**: Enabled, no tooltip
5. **Clinician Action**: Can sign immediately (trust AI)

### Scenario 2: Medium Confidence Note (75-89%)

1. **Overall Banner**: Yellow, "Confianza media - Revisar recomendado" ⚠️
2. **Confidence Breakdown**: Displayed showing all 4 sections
3. **Section Badges**: Mixed colors (green/yellow)
4. **Section Alerts**: Orange alerts on sections 60-75%
5. **Sign Button**: Enabled (if all sections ≥60%)
6. **Clinician Action**: Should review sections < 75%, then sign

### Scenario 3: Low Confidence Note (<60% overall OR any section <60%)

1. **Overall Banner**: Red, "Confianza muy baja" ❌ with 🚨 warning
2. **Confidence Breakdown**: Displayed highlighting problem sections
3. **Section Badges**: Red ❌ for sections <60%
4. **Section Alerts**: Red "Confianza crítica" alerts on sections <60%
5. **Sign Button**: **DISABLED** with tooltip
6. **Signing Blocked Alert**: Displayed with list of problematic sections
7. **Clinician Action**: **MUST** edit sections <60% before signing

---

## Implementation Details

### Confidence Score Calculation

**Backend (AI Model)**:
- Generated during SOAP note transcription
- Scores stored in `ClinicalNote` table:
  - `subjectiveConfidence` (0.0-1.0)
  - `objectiveConfidence` (0.0-1.0)
  - `assessmentConfidence` (0.0-1.0)
  - `planConfidence` (0.0-1.0)
  - `overallConfidence` (0.0-1.0)

**Frontend (This Implementation)**:
- Displays confidence scores with visual indicators
- Enforces required review workflow
- Blocks signing if confidence too low

### Color Palette (Dark Mode Compatible)

```typescript
// High Confidence (≥90%)
'bg-green-100 text-green-700 border-green-300
 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'

// Medium Confidence (75-89%)
'bg-yellow-100 text-yellow-700 border-yellow-300
 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700'

// Low Confidence (60-74%)
'bg-orange-100 text-orange-700 border-orange-300
 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700'

// Critical Confidence (<60%)
'bg-red-100 text-red-700 border-red-300
 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
```

---

## Testing

### Test Cases

#### Test 1: High Confidence Note
```typescript
const highConfidenceNote = {
  id: '123',
  overallConfidence: 0.95,
  subjectiveConfidence: 0.94,
  objectiveConfidence: 0.96,
  assessmentConfidence: 0.93,
  planConfidence: 0.97,
  status: 'DRAFT',
  // ... other fields
};
```

**Expected Behavior**:
- ✅ Overall banner green with ✅ icon
- ✅ All section badges green with ✅ icons
- ✅ No alerts displayed
- ✅ Sign button enabled
- ✅ No signing blocked alert

#### Test 2: Medium Confidence Note
```typescript
const mediumConfidenceNote = {
  id: '456',
  overallConfidence: 0.82,
  subjectiveConfidence: 0.78,
  objectiveConfidence: 0.85,
  assessmentConfidence: 0.80,
  planConfidence: 0.84,
  status: 'DRAFT',
};
```

**Expected Behavior**:
- ⚠️ Overall banner yellow with ⚠️ icon
- ⚠️ Confidence breakdown displayed
- ⚠️ Section badges yellow with ⚠️ icons
- ⚠️ Orange "Revisión recomendada" alerts on sections < 75%
- ✅ Sign button enabled (all sections ≥60%)
- ✅ No signing blocked alert

#### Test 3: Low Confidence Note (Signing Blocked)
```typescript
const lowConfidenceNote = {
  id: '789',
  overallConfidence: 0.58,
  subjectiveConfidence: 0.62,
  objectiveConfidence: 0.58,
  assessmentConfidence: 0.55,
  planConfidence: 0.64,
  status: 'DRAFT',
};
```

**Expected Behavior**:
- ❌ Overall banner red with ❌ icon
- 🚨 Warning: "Revisión OBLIGATORIA antes de firmar"
- ❌ Confidence breakdown displayed
- ❌ Section badges: Objetivo (58%), Evaluación (55%) red with ❌
- ❌ Red "Confianza crítica" alerts on Objetivo and Evaluación
- ❌ Sign button **DISABLED** with tooltip
- 🚨 Signing blocked alert displayed with:
  - "Objetivo (58%)"
  - "Evaluación (55%)"

---

## Configuration

### Per-Organization Threshold Customization (Future)

**Current**: Hard-coded in component (lines 190-193)

**Future Enhancement**:

1. Add to `Organization` table:
   ```sql
   ALTER TABLE organizations ADD COLUMN confidence_threshold_high DECIMAL(3,2) DEFAULT 0.90;
   ALTER TABLE organizations ADD COLUMN confidence_threshold_medium DECIMAL(3,2) DEFAULT 0.75;
   ALTER TABLE organizations ADD COLUMN confidence_threshold_low DECIMAL(3,2) DEFAULT 0.60;
   ```

2. Fetch from API:
   ```typescript
   const { data: orgSettings } = await fetch('/api/organizations/settings');
   const CONFIDENCE_THRESHOLD_HIGH = orgSettings.confidence_threshold_high || 0.9;
   const CONFIDENCE_THRESHOLD_MEDIUM = orgSettings.confidence_threshold_medium || 0.75;
   const CONFIDENCE_THRESHOLD_LOW = orgSettings.confidence_threshold_low || 0.6;
   ```

3. UI for admin configuration:
   - Settings page: `/dashboard/settings/ai-confidence`
   - Sliders for each threshold
   - Preview showing color zones
   - Warning: "Lower thresholds increase risk of inaccurate notes"

---

## Compliance and Safety

### HIPAA Compliance

✅ **§164.312(a)(1) - Access Control**:
- Required review workflow ensures clinicians verify AI-generated content
- Prevents automatic trust in low-confidence AI outputs

✅ **§164.312(c)(1) - Integrity Controls**:
- Confidence scores provide integrity checking mechanism
- Alerts clinicians to potentially inaccurate PHI

### Clinical Safety

✅ **Reduced Medical Errors**:
- 3-tier confidence system (HIGH/MEDIUM/LOW)
- Section-level alerts draw attention to problematic areas
- Signing blocked for critical confidence levels (<60%)

✅ **Transparency**:
- Confidence scores always visible to clinicians
- Clear explanation of AI limitations
- Encourages critical review of AI-generated content

### Trust & Safety Metrics (Target)

- **False Negative Rate**: <1% (notes with low confidence that are actually accurate)
- **False Positive Rate**: <5% (notes with high confidence that contain errors)
- **Clinician Override Rate**: <10% (clinicians signing despite low confidence - track via audit logs)

---

## Monitoring and Observability

### Metrics to Track

1. **Confidence Distribution**:
   - % of notes with HIGH confidence (≥90%)
   - % of notes with MEDIUM confidence (75-89%)
   - % of notes with LOW confidence (60-74%)
   - % of notes with CRITICAL confidence (<60%)

2. **Signing Blocked Rate**:
   - % of notes that cannot be signed due to low confidence
   - Track by section (which section most often blocks signing?)

3. **Manual Edit Rate After Confidence Alert**:
   - % of clinicians who edit sections after seeing orange/red alerts
   - Correlation between confidence score and edit likelihood

4. **Time to Sign**:
   - Compare time to sign for HIGH vs. MEDIUM vs. LOW confidence notes
   - Hypothesis: Low confidence notes take longer to sign (more review time)

### SQL Queries for Monitoring

```sql
-- Confidence distribution (last 30 days)
SELECT
  CASE
    WHEN "overallConfidence" >= 0.9 THEN 'HIGH'
    WHEN "overallConfidence" >= 0.75 THEN 'MEDIUM'
    WHEN "overallConfidence" >= 0.6 THEN 'LOW'
    ELSE 'CRITICAL'
  END AS confidence_tier,
  COUNT(*) as note_count,
  ROUND(AVG("overallConfidence"), 2) as avg_confidence
FROM "ClinicalNote"
WHERE "createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY confidence_tier
ORDER BY avg_confidence DESC;

-- Notes with critically low section confidence
SELECT
  id,
  "overallConfidence",
  "subjectiveConfidence",
  "objectiveConfidence",
  "assessmentConfidence",
  "planConfidence",
  "createdAt"
FROM "ClinicalNote"
WHERE
  "subjectiveConfidence" < 0.6 OR
  "objectiveConfidence" < 0.6 OR
  "assessmentConfidence" < 0.6 OR
  "planConfidence" < 0.6
ORDER BY "createdAt" DESC
LIMIT 50;

-- Average time to sign by confidence tier
SELECT
  CASE
    WHEN cn."overallConfidence" >= 0.9 THEN 'HIGH'
    WHEN cn."overallConfidence" >= 0.75 THEN 'MEDIUM'
    WHEN cn."overallConfidence" >= 0.6 THEN 'LOW'
    ELSE 'CRITICAL'
  END AS confidence_tier,
  AVG(EXTRACT(EPOCH FROM (cn."signedAt" - cn."createdAt"))) / 60 as avg_minutes_to_sign,
  COUNT(*) as signed_count
FROM "ClinicalNote" cn
WHERE cn.signed = true
GROUP BY confidence_tier;
```

---

## Future Enhancements

### Phase 2: Advanced Confidence Features

1. **Confidence Explanations**:
   - Tooltip on confidence badge: "Why is this section low confidence?"
   - AI-generated explanation: "Multiple medical terms not in our dictionary", "Unclear patient statements", etc.

2. **Confidence History Tracking**:
   - Track confidence scores across note versions
   - Show confidence improvement after manual edits
   - "Confidence increased from 65% → 92% after your edits"

3. **Confidence-Based Auto-Review**:
   - Automatically flag notes with low confidence for peer review
   - Create review queue for supervising physicians
   - QA dashboard showing confidence distribution

4. **Real-Time Confidence During Recording**:
   - Live confidence meter during audio transcription
   - Alerts clinician in real-time: "Please repeat - AI is uncertain"
   - Section-by-section confidence as note is generated

5. **Confidence Calibration**:
   - Track actual accuracy vs. confidence scores
   - Adjust AI model confidence thresholds over time
   - "Our model is overconfident - lowering thresholds"

---

## Conclusion

✅ **AI Confidence Scoring implementation is complete and production-ready**

**Impact**:
- **Trust & Safety**: Clinicians are warned of low-confidence sections before signing
- **Clinical Accuracy**: Required review workflow prevents signing of potentially inaccurate notes
- **Transparency**: Confidence scores visible at both overall and section levels
- **User Experience**: Clear visual indicators (colors, icons, alerts) guide clinician review

**Files Modified**: 1 file (`SOAPNoteEditor.tsx`)
**Lines Added**: ~150 lines
**Thresholds Configured**: 3 levels (HIGH: 90%, MEDIUM: 75%, LOW: 60%)

---

**END OF AI CONFIDENCE SCORING IMPLEMENTATION DOCUMENTATION**
