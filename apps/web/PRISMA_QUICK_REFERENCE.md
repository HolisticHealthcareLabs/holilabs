# Prisma Quick Reference Guide

## Quick Commands

```bash
# Generate Prisma Client (run after schema changes)
pnpm prisma generate

# Validate schema without database
pnpm prisma validate

# Format schema file
pnpm prisma format

# Check TypeScript errors
pnpm tsc --noEmit

# Create a migration
pnpm prisma migrate dev --name your_migration_name

# Push schema changes without migration (dev only)
pnpm prisma db push

# Open Prisma Studio (database GUI)
pnpm prisma studio
```

---

## When to Run `prisma generate`

**ALWAYS run after:**
- Adding a new model to schema.prisma
- Adding a new field to an existing model
- Modifying relations between models
- Changing enum values
- Pulling from main/other branches that changed the schema

**Symptoms of outdated Prisma types:**
```
Property 'modelName' does not exist on type 'PrismaClient'
Property 'fieldName' does not exist on type 'ModelName'
```

---

## Key Schema Models and Relations

### Patient Relations
```typescript
// Patient has many:
patient.appointments      // Appointment[]
patient.medications       // Medication[]
patient.prescriptions     // Prescription[]
patient.clinicalNotes     // ClinicalNote[]
patient.preventionPlans   // PreventionPlan[]
patient.allergies         // Allergy[]
patient.documents         // Document[]

// Patient belongs to:
patient.assignedClinician // User (optional)
patient.primaryCaregiver  // User (optional)
```

### Appointment Relations
```typescript
// Appointment belongs to:
appointment.patient     // Patient
appointment.clinician   // User

// Appointment has many:
appointment.situations  // AppointmentSituation[]
```

### Prescription Relations
```typescript
// Prescription belongs to:
prescription.patient    // Patient
prescription.clinician  // User

// Prescription has many:
prescription.dispenses  // MedicationDispense[]
```

### Clinical Note Relations
```typescript
// ClinicalNote belongs to:
clinicalNote.patient   // Patient

// ClinicalNote has many:
clinicalNote.versions  // ClinicalNoteVersion[]
```

---

## Common Query Patterns

### 1. Get Patient with Relations
```typescript
const patient = await prisma.patient.findUnique({
  where: { id: patientId },
  include: {
    assignedClinician: true,
    appointments: {
      orderBy: { startTime: 'desc' },
      take: 10,
      include: {
        clinician: true
      }
    },
    medications: {
      where: { isActive: true }
    }
  }
});
```

### 2. Create Appointment with Patient Check
```typescript
// First verify patient exists
const patient = await prisma.patient.findUnique({
  where: { id: patientId }
});

if (!patient) {
  throw new Error('Patient not found');
}

// Then create appointment
const appointment = await prisma.appointment.create({
  data: {
    patientId,
    clinicianId,
    title: 'Follow-up',
    startTime: new Date(),
    endTime: addHours(new Date(), 1),
    type: 'IN_PERSON',
    status: 'SCHEDULED'
  },
  include: {
    patient: true,
    clinician: true
  }
});
```

### 3. Update with Cascade
```typescript
// This will cascade delete all related records if configured
await prisma.patient.delete({
  where: { id: patientId }
});
// Deletes: appointments, prescriptions, clinical notes, etc.
```

### 4. Transaction Example
```typescript
await prisma.$transaction(async (tx) => {
  // Create prescription
  const prescription = await tx.prescription.create({
    data: { ... }
  });

  // Create audit log
  await tx.auditLog.create({
    data: {
      action: 'CREATE',
      resource: 'Prescription',
      resourceId: prescription.id,
      userId: clinicianId
    }
  });

  // Send notification
  await tx.notification.create({
    data: {
      userId: patientId,
      type: 'PRESCRIPTION_CREATED',
      message: 'New prescription available'
    }
  });
});
```

---

## Schema Organization (97 Models)

### Core Medical Models
- Patient, User, PatientUser
- Appointment, RecurringAppointment
- Prescription, Medication, MedicationSchedule
- ClinicalNote, ClinicalNoteVersion, SOAPNote
- Document, MedicalImage
- LabResult, ImagingStudy

### Clinical Decision Support
- Diagnosis, Allergy
- VitalSign, HealthMetric
- PreventiveCareReminder
- CarePlan, PreventionPlan
- RiskScore

### Authentication & Security
- MagicLink, OTPCode
- PasswordResetToken
- TokenMap, AuditLog
- CasbinRule
- Consent

### Notifications & Messaging
- Notification, NotificationTemplate
- Message
- PushSubscription
- ScheduledReminder
- EmailQueue

### Scheduling & Availability
- ProviderAvailability
- ProviderTimeOff
- AppointmentTypeConfig
- WaitingList
- NoShowHistory

### Billing & Payments
- Invoice, InvoiceLineItem
- Payment
- Pharmacy, PharmacyPrescription

### AI & Analytics
- AIUsageLog
- AIContentFeedback
- AISentenceConfidence
- AIQualityMetrics
- ManualReviewQueueItem

### Administrative
- InvitationCode, BetaSignup
- ReferralCode, Referral, ReferralReward
- SubscriptionTier
- FormTemplate, FormInstance
- ProviderTask, ProviderCredential

---

## Troubleshooting

### Issue: Type errors after pulling latest code
**Solution:**
```bash
pnpm install
pnpm prisma generate
```

### Issue: Database out of sync with schema
**Solution:**
```bash
# Dev environment only
pnpm prisma db push

# Production
pnpm prisma migrate deploy
```

### Issue: Relation not found
**Check:**
1. Field exists in schema.prisma
2. Relation is properly defined with `@relation`
3. Foreign key field exists (e.g., `patientId` for `patient` relation)
4. Ran `pnpm prisma generate`

### Issue: Optional fields showing as required (or vice versa)
**Check:**
```prisma
// Optional: Use ?
email String?

// Required: No ?
email String
```

---

## Best Practices

1. **Always include relations you need**
   ```typescript
   // Bad - will cause additional queries
   const patient = await prisma.patient.findUnique({ where: { id } });
   const appointments = await prisma.appointment.findMany({
     where: { patientId: id }
   });

   // Good - single query with relations
   const patient = await prisma.patient.findUnique({
     where: { id },
     include: { appointments: true }
   });
   ```

2. **Use select for performance**
   ```typescript
   // Only get fields you need
   const patient = await prisma.patient.findUnique({
     where: { id },
     select: {
       id: true,
       firstName: true,
       lastName: true,
       email: true
     }
   });
   ```

3. **Always handle null cases**
   ```typescript
   const patient = await prisma.patient.findUnique({ where: { id } });

   if (!patient) {
     throw new Error('Patient not found');
   }

   // Now TypeScript knows patient is not null
   console.log(patient.firstName);
   ```

4. **Use transactions for atomic operations**
   ```typescript
   // Ensure all operations succeed or none
   await prisma.$transaction([
     prisma.patient.update({ ... }),
     prisma.auditLog.create({ ... }),
     prisma.notification.create({ ... })
   ]);
   ```

---

## Schema File Location

```
/Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web/prisma/schema.prisma
```

**Total Models:** 95
**Database:** PostgreSQL
**Prisma Version:** 6.7.0

---

## Need Help?

1. Check this guide first
2. Read the schema comments - they include HIPAA/SOC 2 compliance notes
3. Check existing API routes for query patterns
4. Run `pnpm prisma studio` to browse the database visually
5. Consult the full report: `AGENT16_PRISMA_SCHEMA_FIX_REPORT.md`

---

Last Updated: 2025-12-15
Agent: Agent 16
