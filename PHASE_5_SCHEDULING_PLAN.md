# Phase 5.1: Advanced Scheduling System - Implementation Plan

**Status**: In Progress
**Start Date**: October 27, 2025
**Estimated Completion**: 12-15 hours
**Priority**: CRITICAL (Business Revenue)

---

## 🎯 Objectives

Build a production-grade scheduling system that enables:
1. **Visual Calendar Management** - Drag-and-drop appointment scheduling
2. **Recurring Appointments** - Weekly/monthly therapy, checkups, etc.
3. **Provider Availability** - Working hours, breaks, time off
4. **Automatic Reminders** - SMS, WhatsApp, Email notifications
5. **No-Show Tracking** - Patient history and confirmation requirements
6. **Multi-Provider View** - See all providers' schedules at once

---

## 📊 Current State Analysis

### ✅ What Already Exists
- **Appointment Model** with comprehensive fields:
  - Basic scheduling (start/end time, title, description)
  - Appointment types (IN_PERSON, TELEHEALTH, PHONE, HOME_VISIT)
  - Status tracking (SCHEDULED, CONFIRMED, CHECKED_IN, etc.)
  - Confirmation system with tokens
  - Reschedule requests workflow
  - Calendar integration stubs (Google/Outlook)
  - Reminder fields (sent status, timestamps)

- **API Endpoints**:
  - `POST /api/appointments` - Create appointment
  - `GET /api/appointments` - List appointments with filters
  - `POST /api/appointments/[id]/confirm` - Confirm appointment (inferred)
  - `POST /api/appointments/send-reminder` - Send reminders (inferred)

- **Notification System**:
  - NotificationTemplate model with multi-channel support
  - Variables system for personalization
  - Timing configuration (minutes/hours/days before)
  - Doctor-specific template overrides

### ❌ What's Missing
1. **Recurring Appointments** - No database model or logic
2. **Provider Availability** - No working hours management
3. **Advanced Calendar UI** - No drag-and-drop interface
4. **No-Show History** - Status exists but no tracking/reporting
5. **Appointment Types Configuration** - No duration/color/rules setup
6. **Batch Reminder System** - Manual reminder sending only
7. **Waiting List** - No waitlist management for fully booked slots

---

## 🏗️ Architecture Design

### Database Schema Additions

#### 1. RecurringAppointment Model
```prisma
model RecurringAppointment {
  id          String   @id @default(cuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id])

  clinicianId String
  clinician   User     @relation(fields: [clinicianId], references: [id])

  // Recurrence pattern
  frequency   RecurrenceFrequency // DAILY, WEEKLY, MONTHLY
  interval    Int      @default(1) // Every N days/weeks/months
  daysOfWeek  Int[]    // [0,1,2,3,4,5,6] for Sunday-Saturday
  dayOfMonth  Int?     // For monthly (1-31)

  // Time
  startTime   DateTime
  endTime     DateTime
  duration    Int      // Duration in minutes

  // Recurrence bounds
  seriesStart  DateTime
  seriesEnd    DateTime? // null = no end date
  occurrences  Int?      // Alternative to seriesEnd

  // Template
  title       String
  description String?   @db.Text
  type        AppointmentType

  // Status
  isActive    Boolean   @default(true)

  // Metadata
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  appointments Appointment[] @relation("RecurringSeries")

  @@index([patientId])
  @@index([clinicianId])
  @@index([seriesStart, seriesEnd])
  @@map("recurring_appointments")
}

enum RecurrenceFrequency {
  DAILY
  WEEKLY
  MONTHLY
}
```

#### 2. ProviderAvailability Model
```prisma
model ProviderAvailability {
  id          String   @id @default(cuid())
  clinicianId String
  clinician   User     @relation(fields: [clinicianId], references: [id])

  // Day of week (0 = Sunday, 6 = Saturday)
  dayOfWeek   Int

  // Time slots
  startTime   String   // "09:00" 24-hour format
  endTime     String   // "17:00"

  // Break times (optional)
  breakStart  String?  // "12:00"
  breakEnd    String?  // "13:00"

  // Status
  isActive    Boolean  @default(true)

  // Effective date range (for temporary changes)
  effectiveFrom DateTime @default(now())
  effectiveUntil DateTime?

  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([clinicianId, dayOfWeek])
  @@map("provider_availability")
}
```

#### 3. ProviderTimeOff Model
```prisma
model ProviderTimeOff {
  id          String   @id @default(cuid())
  clinicianId String
  clinician   User     @relation(fields: [clinicianId], references: [id])

  // Date range
  startDate   DateTime
  endDate     DateTime

  // Type
  type        TimeOffType
  reason      String?   @db.Text

  // All-day or specific time
  allDay      Boolean   @default(true)
  startTime   String?   // "09:00"
  endTime     String?   // "17:00"

  // Status
  status      TimeOffStatus @default(APPROVED)

  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([clinicianId])
  @@index([startDate, endDate])
  @@map("provider_time_off")
}

enum TimeOffType {
  VACATION
  SICK_LEAVE
  CONFERENCE
  PERSONAL
  BLOCKED // For admin blocking time
}

enum TimeOffStatus {
  PENDING
  APPROVED
  REJECTED
}
```

#### 4. AppointmentType Configuration Model
```prisma
model AppointmentTypeConfig {
  id              String   @id @default(cuid())

  // Type identification
  name            String   // "New Patient Consultation"
  code            String   @unique // "NEW_PATIENT"
  appointmentType AppointmentType

  // Duration
  defaultDuration Int      // Minutes (e.g., 60)
  bufferBefore    Int      @default(0) // Setup time
  bufferAfter     Int      @default(0) // Cleanup time

  // Display
  color           String   @default("#3b82f6") // Hex color
  icon            String?  // Icon name/emoji

  // Rules
  allowOnline     Boolean  @default(true)
  requireConfirmation Boolean @default(true)
  maxAdvanceBooking Int?   // Days in advance (null = unlimited)

  // Status
  isActive        Boolean  @default(true)

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("appointment_type_configs")
}
```

#### 5. NoShowHistory Model
```prisma
model NoShowHistory {
  id            String   @id @default(cuid())
  patientId     String
  patient       Patient  @relation(fields: [patientId], references: [id])

  appointmentId String   @unique
  appointment   Appointment @relation(fields: [appointmentId], references: [id])

  // No-show details
  scheduledAt   DateTime
  noShowMarkedAt DateTime @default(now())
  markedBy      String?  // User ID

  // Follow-up
  contacted     Boolean  @default(false)
  contactedAt   DateTime?
  contactMethod String?  // "phone", "email", "sms"
  notes         String?  @db.Text

  // Fee
  feeCharged    Boolean  @default(false)
  feeAmount     Decimal? @db.Decimal(10, 2)
  feePaid       Boolean  @default(false)

  @@index([patientId])
  @@map("no_show_history")
}
```

---

## 🛠️ Implementation Steps

### Step 1: Database Schema (1-2 hours)
- [x] Design schema additions
- [ ] Create Prisma migration file
- [ ] Apply migration to database
- [ ] Update Prisma client types
- [ ] Test migrations locally

### Step 2: Provider Availability API (2-3 hours)
- [ ] `POST /api/providers/availability` - Set working hours
- [ ] `GET /api/providers/availability` - Get availability for provider
- [ ] `POST /api/providers/time-off` - Request/block time off
- [ ] `GET /api/providers/time-off` - List time off
- [ ] `GET /api/providers/available-slots` - Get bookable slots

### Step 3: Recurring Appointments API (2-3 hours)
- [ ] `POST /api/appointments/recurring` - Create recurring series
- [ ] `GET /api/appointments/recurring/[id]` - Get series details
- [ ] `PATCH /api/appointments/recurring/[id]` - Update series
- [ ] `DELETE /api/appointments/recurring/[id]` - Cancel series
- [ ] Background job to generate future appointments

### Step 4: FullCalendar Integration (3-4 hours)
- [ ] Install `@fullcalendar/react` and plugins
- [ ] Create `AdvancedCalendar` component
- [ ] Implement drag-and-drop appointment creation
- [ ] Add appointment resizing (change duration)
- [ ] Multi-provider view (resource timeline)
- [ ] Color coding by appointment type
- [ ] Conflict detection (double-booking prevention)

### Step 5: Automatic Reminder System (2-3 hours)
- [ ] Create cron job endpoint `/api/cron/send-reminders`
- [ ] Query appointments 24h/1h before
- [ ] Send SMS via Twilio
- [ ] Send WhatsApp via Twilio
- [ ] Send Email via Resend
- [ ] Track reminder delivery status
- [ ] Handle failures with retry logic

### Step 6: No-Show Management (1-2 hours)
- [ ] `POST /api/appointments/[id]/mark-no-show` - Mark no-show
- [ ] `GET /api/patients/[id]/no-show-history` - Patient history
- [ ] Alert system for high no-show patients
- [ ] Confirmation requirement toggle

### Step 7: Admin UI (2-3 hours)
- [ ] Provider availability settings page
- [ ] Time off request/approval interface
- [ ] Appointment type configuration
- [ ] Reminder template editor
- [ ] No-show reports dashboard

---

## 📦 Dependencies to Install

```bash
# FullCalendar
pnpm add @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/resource-timeline

# Date utilities
pnpm add date-fns date-fns-tz

# Cron jobs (for reminders)
pnpm add node-cron

# (Already have) Twilio, Resend for notifications
```

---

## 🎨 UI Components to Build

### 1. AdvancedCalendar Component
```tsx
<AdvancedCalendar
  providers={providers}
  view="week" | "day" | "month"
  onAppointmentCreate={handleCreate}
  onAppointmentUpdate={handleUpdate}
  onAppointmentClick={handleClick}
  showResourceTimeline={true}
/>
```

### 2. RecurringAppointmentModal
```tsx
<RecurringAppointmentModal
  open={isOpen}
  onClose={handleClose}
  patientId={patientId}
  onSave={handleSave}
/>
```

### 3. ProviderAvailabilityEditor
```tsx
<ProviderAvailabilityEditor
  clinicianId={clinicianId}
  weekSchedule={schedule}
  onSave={handleSave}
/>
```

### 4. TimeOffRequestForm
```tsx
<TimeOffRequestForm
  clinicianId={clinicianId}
  onSubmit={handleSubmit}
/>
```

### 5. NoShowHistoryPanel
```tsx
<NoShowHistoryPanel
  patientId={patientId}
  history={noShowHistory}
/>
```

---

## ✅ Acceptance Criteria

### Functional Requirements
- [ ] Clinicians can view their weekly/monthly schedule
- [ ] Drag-and-drop appointment creation from calendar
- [ ] Resize appointments to change duration
- [ ] Create recurring appointments (weekly physical therapy, etc.)
- [ ] Set working hours per day of week
- [ ] Request time off (vacation, conferences)
- [ ] View multiple providers side-by-side
- [ ] Automatic reminders sent 24h and 1h before
- [ ] Mark no-show appointments
- [ ] View patient no-show history
- [ ] Prevent double-booking (conflict detection)

### Non-Functional Requirements
- [ ] Calendar loads <500ms for 30-day view
- [ ] Drag-and-drop works smoothly (60 FPS)
- [ ] Mobile responsive (tap to create appointments)
- [ ] Accessible (keyboard navigation, ARIA labels)
- [ ] Reminder delivery >95% success rate
- [ ] No data loss on appointment updates

---

## 📊 Success Metrics

### Time Savings
- **Baseline**: 20 minutes to schedule appointments manually
- **Goal**: 2 minutes with drag-and-drop
- **Target**: 90% time reduction

### No-Show Reduction
- **Baseline**: 15-20% no-show rate (industry average)
- **Goal**: <10% with automatic reminders
- **Target**: 50% reduction in no-shows

### Patient Satisfaction
- **Baseline**: Manual confirmation calls
- **Goal**: Self-service confirmation links
- **Target**: 80%+ patients confirm online

---

## 🚨 Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| FullCalendar complexity | High | Medium | Use official examples, allocate extra time |
| Timezone issues | High | High | Use date-fns-tz, store all times in UTC |
| Reminder delivery failures | High | Medium | Implement retry logic, fallback channels |
| Double-booking bugs | Critical | Low | Strict conflict detection, database constraints |
| Performance with many appointments | Medium | Medium | Pagination, virtual scrolling, lazy loading |

---

## 📝 Testing Checklist

### Unit Tests
- [ ] Recurring appointment date calculation
- [ ] Availability slot generation
- [ ] Conflict detection logic
- [ ] Reminder timing calculation

### Integration Tests
- [ ] Create recurring appointment series
- [ ] Update provider availability
- [ ] Send reminder via all channels
- [ ] Mark no-show and track history

### E2E Tests
- [ ] Drag-and-drop appointment creation
- [ ] Reschedule appointment by dragging
- [ ] Create weekly recurring therapy session
- [ ] Receive SMS reminder 24h before

---

## 📚 Documentation to Create

1. **User Guide**: How to use the calendar system
2. **Admin Guide**: Setting up provider availability
3. **API Documentation**: Endpoint reference
4. **Troubleshooting**: Common issues and solutions

---

## 🎯 Next Steps

**Immediate Actions**:
1. Create Prisma migration for new models
2. Install FullCalendar dependencies
3. Build basic calendar view
4. Implement provider availability API

**Priority Order**:
1. Provider Availability (foundation for everything)
2. FullCalendar UI (visual scheduling)
3. Recurring Appointments (high user value)
4. Automatic Reminders (no-show reduction)
5. No-Show Tracking (reporting and accountability)

---

**Created**: October 27, 2025
**Last Updated**: October 27, 2025
**Status**: Ready to implement
**Assigned**: AI Development Agent
