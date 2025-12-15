# Prevention Plans History - User Guide

## 🎯 Overview

The **Prevention Plans History** page provides a comprehensive view of all prevention protocols that have been applied to patients. This allows clinicians to track longitudinal prevention efforts, monitor progress, and manage interventions over time.

**URL:** `/dashboard/prevention/plans`

---

## ✨ Features

### 1. **Multi-Patient View**
- Select any patient from the sidebar
- View their complete prevention plan history
- Quick stats dashboard showing active/completed plans
- Real-time plan updates

### 2. **Plan Overview Cards**
Each plan displays:
- ✅ **Plan name** with status badge (ACTIVE/COMPLETED/DEACTIVATED)
- 📋 **Plan type** (CARDIOVASCULAR, DIABETES, COMPREHENSIVE)
- 📅 **Creation date** and guideline source
- 📊 **Progress bar** showing intervention completion
- 👁️ **Quick preview** of first 4 interventions
- 🔗 **Click to expand** full details

### 3. **Detailed Plan View (Modal)**
Click any plan to see:
- Complete description
- All interventions with evidence levels
- Guideline source and version
- Category icons (medication, screening, lifestyle, etc.)
- Frequency information
- Plan metadata (ID, timestamps)
- Action buttons (Export PDF, Update Status)

### 4. **Status Tracking**
Three plan statuses:
- 🟢 **ACTIVE** - Currently in use
- 🔵 **COMPLETED** - All goals met
- ⚪ **DEACTIVATED** - No longer relevant

### 5. **Progress Monitoring**
- Visual progress bar for each plan
- Shows completed vs total interventions
- Percentage completion display
- Color-coded status indicators

---

## 🎬 How to Use

### Access from AI Copilot

1. **In AI Copilot header**, click **"🛡️ Ver Planes de Prevención"** button
2. Automatically shows plans for current patient
3. Or navigate directly to `/dashboard/prevention/plans`

### Access from Prevention Sidebar

1. Click **"Open Full Prevention Hub"** button in sidebar
2. Redirects to plans history page for current patient

### Direct URL Access

```
/dashboard/prevention/plans?patientId=pt-004
```

---

## 📊 Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🛡️ Planes de Prevención                                    │
│  Historial de protocolos aplicados • Holi Labs             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────────────────────────────┐│
│  │  Pacientes   │  │  Planes de [Patient Name]            ││
│  │              │  │                                       ││
│  │  María       │  │  📊 Stats Dashboard:                 ││
│  │  González    │  │     3 Planes Activos                 ││
│  │              │  │     1 Completado                     ││
│  │  Carlos      │  │     12 Intervenciones Totales        ││
│  │  Silva   ◄   │  │                                       ││
│  │              │  │  ┌─────────────────────────────────┐ ││
│  │  Ana         │  │  │ WHO SCD Pregnancy (2025)        │ ││
│  │  Rodríguez   │  │  │ 🟢 ACTIVE | COMPREHENSIVE       │ ││
│  │              │  │  │                                 │ ││
│  │  Fatima      │  │  │ First global guideline for...  │ ││
│  │  Hassan      │  │  │                                 │ ││
│  └──────────────┘  │  │ WHO June 2025 • Grade A         │ ││
│                    │  │                                 │ ││
│                    │  │ Progress: 2 of 7 ▓▓░░░░░ 29%   │ ││
│                    │  │                                 │ ││
│                    │  │ 💊 Folic acid 5mg daily         │ ││
│                    │  │ 📅 Monthly antenatal visits     │ ││
│                    │  │ 🔬 Ultrasound growth scans      │ ││
│                    │  │ 💉 Low-dose aspirin             │ ││
│                    │  └─────────────────────────────────┘ ││
│                    │                                       ││
│                    │  [More plans...]                      ││
│                    └───────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Visual Design

### Status Colors:
- **ACTIVE**: Green (🟢) - "bg-green-100 text-green-800"
- **COMPLETED**: Blue (🔵) - "bg-blue-100 text-blue-800"
- **DEACTIVATED**: Gray (⚪) - "bg-gray-100 text-gray-800"

### Plan Type Colors:
- **CARDIOVASCULAR**: Red border
- **DIABETES**: Purple border
- **COMPREHENSIVE**: Blue border

### Category Icons:
- 💊 Medication
- 🔬 Screening
- 📈 Monitoring
- 🏃 Lifestyle
- 📚 Education
- 👥 Referral

---

## 🔍 Example Scenarios

### Scenario 1: View Fatima Hassan's SCD Plans

1. Navigate to `/dashboard/prevention/plans?patientId=pt-004`
2. **Sidebar shows**: "Fatima Hassan" selected
3. **Stats show**:
   - 1 Plan Activo
   - 0 Completados
   - 7 Intervenciones Totales
4. **Plan card displays**:
   - "WHO SCD Pregnancy Management (2025)"
   - 🟢 ACTIVE | COMPREHENSIVE
   - Progress: 0 of 7 (0%)
   - First 4 interventions preview
5. **Click plan card** to see full details
6. **Modal shows**:
   - Complete description
   - All 7 interventions with evidence
   - WHO June 2025 guideline source
   - Plan ID and timestamps

### Scenario 2: Track Progress Over Time

1. Apply protocol in AI Copilot
2. View in Prevention Plans History
3. See initial progress: 0%
4. Mark interventions as completed (future feature)
5. Progress bar updates in real-time
6. When all complete: Status changes to COMPLETED

### Scenario 3: Multi-Patient Review

1. Select **María González**
   - View diabetes + hypertension plans
2. Select **Carlos Silva**
   - View post-MI cardiovascular plans
3. Compare intervention counts
4. Identify gaps in preventive care

---

## 📊 Stats Dashboard

### Active Plans
Shows number of plans with status = ACTIVE
- Indicates ongoing prevention efforts
- Green color scheme

### Completed Plans
Shows number of plans with status = COMPLETED
- Tracks successful prevention outcomes
- Blue color scheme

### Total Interventions
Sum of all interventions across all plans
- Measures scope of prevention efforts
- Purple color scheme

---

## 🔄 Plan Lifecycle

```
1. CREATED (in AI Copilot)
   ↓
2. ACTIVE (immediately upon creation)
   ↓ (clinician marks goals complete)
3. Progress increases: 0% → 50% → 100%
   ↓ (when all goals complete)
4. COMPLETED
   ↓ (if no longer relevant)
5. DEACTIVATED (optional)
```

---

## 🎯 Use Cases

### 1. **Quality Improvement**
- Track protocol adoption rates
- Identify patients with no active plans
- Measure intervention completion rates
- Generate quality metrics reports

### 2. **Care Coordination**
- Review patient's prevention history before visit
- Share plans with care team
- Ensure continuity of preventive care
- Coordinate follow-up interventions

### 3. **Regulatory Compliance**
- Document preventive services provided
- Support HEDIS/MIPS reporting
- Maintain audit trail
- Demonstrate evidence-based practice

### 4. **Patient Engagement**
- Review plans with patients
- Explain evidence-based recommendations
- Track progress together
- Celebrate completed goals

### 5. **Population Health**
- Identify high-risk patients
- Target prevention efforts
- Measure population-level outcomes
- Reduce preventable complications

---

## 🔮 Future Enhancements (Planned)

### Phase 1 - Goal Management
- [ ] Mark individual goals as complete/incomplete
- [ ] Set target dates for interventions
- [ ] Add clinical notes to goals
- [ ] Track adherence and barriers

### Phase 2 - Status Updates
- [ ] Update plan status (ACTIVE → COMPLETED)
- [ ] Deactivate plans no longer relevant
- [ ] Add completion notes
- [ ] Document outcomes

### Phase 3 - Export & Sharing
- [ ] Export to PDF
- [ ] Send to patient portal
- [ ] Share with care team
- [ ] Generate progress reports

### Phase 4 - Analytics
- [ ] Protocol adoption dashboard
- [ ] Intervention completion trends
- [ ] Patient outcome tracking
- [ ] Population health metrics

### Phase 5 - Integration
- [ ] Sync with EMR
- [ ] HL7 FHIR CarePlan export
- [ ] Appointment scheduling integration
- [ ] Automated reminders

---

## 🐛 Troubleshooting

### No Plans Showing

**Symptom:** Empty state displayed

**Possible Causes:**
1. No protocols have been applied yet
2. Wrong patient selected
3. API connection issue
4. Database query error

**Solutions:**
1. Go to AI Copilot and apply a protocol first
2. Select different patient from sidebar
3. Click "Actualizar" button to refresh
4. Check browser console for errors

### Plans Not Loading

**Symptom:** Loading spinner doesn't stop

**Possible Causes:**
1. API endpoint not responding
2. Network timeout
3. Session expired
4. Database connection issue

**Solutions:**
1. Refresh the page
2. Check network tab in DevTools
3. Sign in again if session expired
4. Contact system administrator

### Progress Not Updating

**Symptom:** Progress bar shows 0% even with work done

**Reason:** Goal completion tracking not yet implemented

**Workaround:** Wait for Phase 1 enhancement (goal management)

---

## 🔐 Security & Privacy

### Authentication
- Requires valid NextAuth session
- Unauthorized users redirected to login

### Authorization
- Users can only view plans for their patients
- Role-based access control (future)

### Data Privacy
- PHI protected according to HIPAA
- Audit trail maintained
- Secure database connections

---

## 📱 Responsive Design

### Desktop (1024px+)
- 4-column grid (1 sidebar + 3 content)
- Full feature display
- Modal overlays

### Tablet (768px - 1023px)
- Stacked layout
- Patient selector collapsible
- Scrollable plan list

### Mobile (< 768px)
- Single column
- Touch-optimized
- Simplified views

---

## 🎓 Technical Details

### API Integration

**Endpoint:** `GET /api/prevention/plans?patientId={id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "patientId": "pt-004",
    "preventionPlans": [...],
    "totalPlans": 1,
    "activePlans": 1
  }
}
```

### State Management
```typescript
const [plans, setPlans] = useState<PreventionPlan[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [selectedPlan, setSelectedPlan] = useState<PreventionPlan | null>(null);
```

### Data Structure
```typescript
interface PreventionPlan {
  id: string;
  planName: string;
  planType: 'CARDIOVASCULAR' | 'DIABETES' | 'COMPREHENSIVE';
  description: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DEACTIVATED';
  guidelineSource: string;
  evidenceLevel: string;
  goals: Goal[];
  recommendations: Recommendation[];
  activatedAt: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🚀 Quick Start

### For Clinicians

1. **Apply a protocol** in AI Copilot
2. **Click** "Ver Planes de Prevención" button in header
3. **View** the plan in history page
4. **Click** plan card to see full details
5. **Track** progress over time

### For Administrators

1. **Navigate** to `/dashboard/prevention/plans`
2. **Select** each patient to review their plans
3. **Identify** gaps in preventive care
4. **Generate** quality metrics (future)

### For Developers

1. **File:** `src/app/dashboard/prevention/plans/page.tsx`
2. **API:** `src/app/api/prevention/plans/route.ts`
3. **Schema:** `prisma/schema.prisma` (PreventionPlan model)
4. **Docs:** This file

---

## 📚 Related Documentation

- `PREVENTION_HUB_SUMMARY.md` - Complete system overview
- `PREVENTION_HUB_DEMO.md` - Demo scenarios
- `PROTOCOL_PERSISTENCE_GUIDE.md` - Database details
- `PREVENTION_HUB_TESTING.md` - Testing guide

---

## ✅ Implementation Checklist

- [x] Create prevention plans history page
- [x] Add patient selector
- [x] Display plans with status badges
- [x] Show progress bars
- [x] Implement plan detail modal
- [x] Add navigation from AI Copilot
- [x] Add navigation from Prevention Sidebar
- [x] TypeScript compilation passes
- [x] Responsive design
- [x] Dark mode support
- [ ] Goal completion tracking (Phase 1)
- [ ] Status update functionality (Phase 2)
- [ ] PDF export (Phase 3)

---

## 🎉 Success!

The Prevention Plans History page provides a complete longitudinal view of all prevention efforts for each patient. Clinicians can now:

✅ Track all applied protocols in one place
✅ Monitor intervention progress over time
✅ Review evidence-based recommendations
✅ Coordinate preventive care across the team
✅ Document compliance with guidelines
✅ Improve patient outcomes through better tracking

**Start using it now by applying a protocol in AI Copilot! 🚀**
