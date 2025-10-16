# 🏥 Pequeno Cotolêngo Pilot: 2-Week Implementation Plan

## Executive Summary

**Goal**: Launch production-ready pilot with Pequeno Cotolêngo (special needs + palliative care hospital) in 14 days.

**Hospital**: https://www.pequenocotolengo.org.br/
- Mission: Care for people with special needs and palliative care
- Focus: Dignity-centered, family-inclusive, compassionate care
- Needs: Extreme simplicity, mobile-first, interdisciplinary coordination

**Strategy**: "Above Industry-Grade Simplicity"
- Radically simple UI (6 core features, 1-2 clicks max)
- Purpose-built for palliative care
- AI-assisted documentation (40% time savings)
- Brazilian healthcare ready (CNS/CPF, Portuguese)
- Family-inclusive care

---

## 📅 2-Week Timeline

### **Week 1: Core Platform Polish**

#### **Days 1-2: Patient Management** ✓ IN PROGRESS
- Add Brazilian identifiers (CNS, CPF, municipality, CNES)
- Add palliative care fields:
  - Comfort care preferences
  - Advance directives status
  - Primary family contacts (hierarchical)
  - Primary caregiver assignment
  - Photo for humanization
- Clean, accessible UI (large fonts, high contrast)
- Mobile-responsive design

#### **Days 3-4: Clinical Documentation**
- Palliative SOAP templates:
  - Pain assessment (0-10 scale + face icons)
  - Symptom management
  - Comfort interventions
  - Family communication notes
- AI diagnosis assistant (already built!)
- Voice-to-text for bedside documentation
- Quick action buttons for common interventions

#### **Days 5-7: Essential Features**
- **Medication Management**: Pain/comfort meds, PRN tracking
- **Care Plans**: Interdisciplinary goals, daily objectives
- **Family Portal**: Secure read-only access for families
- **Appointments/Schedule**: Daily care rounds
- **Team Communication**: Internal messaging

### **Week 2: Specialization + Demo**

#### **Days 8-10: Palliative Features**
- **Pain Tracking**: Visual pain scales, trend graphs
- **Quality of Life Metrics**: Comfort, dignity, spiritual care
- **Symptom Checklist**: Nausea, dyspnea, anxiety tracking
- **Care Plan Dashboard**: Goals, progress, team notes
- **Family Updates System**: Automated daily summaries

#### **Days 11-12: Localization + Accessibility**
- Complete Brazilian Portuguese translation
- Accessibility (screen reader, high contrast, large text)
- Simplified navigation (max 2 clicks)
- Mobile optimization
- Offline mode for hospital WiFi

#### **Days 13-14: Demo Preparation**
- Load sample palliative care data (anonymized)
- Create demo script
- Staff training materials (quick start guide)
- Production deployment
- QA testing + performance optimization

---

## 🎯 Core Features (8 Essential)

### **Must Have (Launch Blockers)**
1. ✅ **Patient Registry** - with photo, family contacts, care preferences
2. ✅ **Clinical Notes** - palliative SOAP templates + AI assistance
3. ✅ **Medication Management** - pain/comfort meds, PRN tracking
4. ✅ **Care Plans** - interdisciplinary goals, daily objectives
5. ✅ **Pain & Symptom Tracking** - visual scales, trend graphs
6. ✅ **Family Portal** - secure read-only access for updates
7. ✅ **Team Communication** - internal messaging between staff
8. ✅ **Schedule/Rounds** - daily care schedule management

### **Enhanced (Pilot Success)**
9. ✅ **Quality of Life Dashboard** - comfort metrics, spiritual care
10. ✅ **Photo Documentation** - positioning, wounds (LGPD compliant)
11. ✅ **Family Video Updates** - short video messages (optional)
12. ✅ **Chaplaincy Notes** - spiritual care documentation

### **Deferred (Post-Pilot)**
- ❌ Billing/invoicing (not needed for non-profit pilot)
- ❌ Full e-SUS integration (Phase 2)
- ❌ Lab results integration (outsourced)
- ❌ Imaging integration (outsourced)
- ❌ Advanced analytics

---

## 💾 Database Schema Changes

### **Patient Model Enhancements**

```prisma
model Patient {
  // ... existing fields

  // ========================================================================
  // BRAZILIAN NATIONAL IDENTIFIERS
  // ========================================================================

  // Primary identifiers
  cns                 String?   @unique     // Cartão Nacional de Saúde (15 digits)
  cpf                 String?   @unique     // CPF (11 digits)
  rg                  String?               // RG (identity document)

  // Healthcare system identifiers
  municipalityCode    String?               // IBGE municipality code (7 digits)
  healthUnitCNES      String?               // CNES health facility code (7 digits)
  susPacientId        String?               // SUS patient ID (if integrated)

  // ========================================================================
  // PALLIATIVE CARE SPECIFIC FIELDS
  // ========================================================================

  // Care preferences
  isPalliativeCare    Boolean   @default(false)
  comfortCareOnly     Boolean   @default(false)
  advanceDirectivesStatus AdvanceDirectivesStatus?
  advanceDirectivesDate   DateTime?
  advanceDirectivesNotes  String?   @db.Text

  // DNR/DNI (Do Not Resuscitate / Do Not Intubate)
  dnrStatus           Boolean   @default(false)
  dnrDate             DateTime?
  dniStatus           Boolean   @default(false)
  dniDate             DateTime?
  codeStatus          CodeStatus?

  // Primary caregiver assignment
  primaryCaregiverId  String?
  primaryCaregiver    User?     @relation("PrimaryCaregiver", fields: [primaryCaregiverId], references: [id])

  // Quality of life
  qualityOfLifeScore  Int?                  // 0-10 scale
  lastQoLAssessment   DateTime?

  // Spiritual care
  religiousAffiliation String?
  spiritualCareNeeds  String?   @db.Text
  chaplainAssigned    Boolean   @default(false)

  // ========================================================================
  // FAMILY CONTACTS (Hierarchical)
  // ========================================================================

  primaryContactName      String?
  primaryContactRelation  String?              // e.g., "Daughter", "Son", "Spouse"
  primaryContactPhone     String?   @db.Text   // Encrypted
  primaryContactEmail     String?   @db.Text   // Encrypted
  primaryContactAddress   String?   @db.Text   // Encrypted

  secondaryContactName    String?
  secondaryContactRelation String?
  secondaryContactPhone   String?   @db.Text
  secondaryContactEmail   String?   @db.Text

  emergencyContactName    String?
  emergencyContactPhone   String?   @db.Text
  emergencyContactRelation String?

  // Family portal access
  familyPortalEnabled Boolean   @default(false)
  familyPortalInviteSent DateTime?

  // ========================================================================
  // HUMANIZATION & DIGNITY
  // ========================================================================

  photoUrl            String?               // Patient photo (with consent)
  photoConsentDate    DateTime?
  photoConsentBy      String?               // Who gave consent

  preferredName       String?               // How they like to be called
  pronouns            String?               // Their pronouns
  culturalPreferences String?   @db.Text    // Cultural/religious preferences

  // ========================================================================
  // SPECIAL NEEDS SUPPORT
  // ========================================================================

  hasSpecialNeeds     Boolean   @default(false)
  specialNeedsType    String[]              // e.g., ["Cognitive", "Physical", "Sensory"]
  communicationNeeds  String?   @db.Text    // How they communicate best
  mobilityNeeds       String?   @db.Text    // Mobility assistance needs
  dietaryNeeds        String?   @db.Text    // Special dietary requirements
  sensoryNeeds        String?   @db.Text    // Sensory sensitivities

  // Care team notes
  careTeamNotes       String?   @db.Text    // Important info for entire care team
  flaggedConcerns     String[]              // e.g., ["Fall Risk", "Seizure Risk"]

  // ... rest of existing fields
}

enum AdvanceDirectivesStatus {
  NOT_COMPLETED
  IN_PROGRESS
  COMPLETED
  REVIEWED_ANNUALLY
}

enum CodeStatus {
  FULL_CODE         // Full resuscitation
  DNR               // Do Not Resuscitate
  DNI               // Do Not Intubate
  DNR_DNI           // Both
  COMFORT_CARE_ONLY // Comfort measures only
  AND               // Allow Natural Death
}
```

### **New Models**

#### **Care Plan**
```prisma
model CarePlan {
  id        String  @id @default(cuid())
  patientId String
  patient   Patient @relation(fields: [patientId], references: [id])

  // Plan details
  title         String
  description   String?   @db.Text
  category      CarePlanCategory
  priority      Priority  @default(MEDIUM)

  // Goals
  goals         String[]              // Array of goal descriptions
  targetDate    DateTime?
  status        CarePlanStatus @default(ACTIVE)

  // Interdisciplinary team
  assignedTeam  String[]              // Array of User IDs (doctor, nurse, therapist, chaplain)

  // Progress tracking
  progressNotes String[]   @db.Text   // Team updates
  lastReviewedAt DateTime?
  nextReviewAt   DateTime?

  // Metadata
  createdAt DateTime @default(now())
  createdBy String  // User ID
  updatedAt DateTime @updatedAt
  updatedBy String? // User ID

  @@index([patientId])
  @@index([status])
  @@map("care_plans")
}

enum CarePlanCategory {
  PAIN_MANAGEMENT
  SYMPTOM_CONTROL
  PSYCHOSOCIAL_SUPPORT
  SPIRITUAL_CARE
  FAMILY_SUPPORT
  QUALITY_OF_LIFE
  END_OF_LIFE_PLANNING
  MOBILITY
  NUTRITION
  WOUND_CARE
}

enum CarePlanStatus {
  ACTIVE
  COMPLETED
  ON_HOLD
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

#### **Pain Assessment**
```prisma
model PainAssessment {
  id        String  @id @default(cuid())
  patientId String
  patient   Patient @relation(fields: [patientId], references: [id])

  // Pain scale (0-10)
  painScore   Int                   // 0 = no pain, 10 = worst pain
  painType    PainType?
  location    String?               // Body location
  description String?   @db.Text    // Patient's description

  // Characteristics
  quality     String[]              // e.g., ["Sharp", "Burning", "Aching"]
  timing      String?               // e.g., "Constant", "Intermittent"
  aggravatingFactors String[]
  relievingFactors   String[]

  // Impact
  functionalImpact String?   @db.Text // How it affects daily activities
  sleepImpact      String?             // Impact on sleep
  moodImpact       String?             // Impact on mood

  // Interventions
  interventionsGiven String[]         // What was done
  responseToTreatment String? @db.Text

  // Metadata
  assessedAt DateTime @default(now())
  assessedBy String  // User ID
  notes      String? @db.Text

  @@index([patientId])
  @@index([assessedAt])
  @@map("pain_assessments")
}

enum PainType {
  ACUTE
  CHRONIC
  BREAKTHROUGH
  NEUROPATHIC
  VISCERAL
  SOMATIC
}
```

#### **Family Portal Access**
```prisma
model FamilyPortalAccess {
  id        String  @id @default(cuid())
  patientId String
  patient   Patient @relation(fields: [patientId], references: [id])

  // Family member details
  familyMemberName  String
  relationship      String              // e.g., "Daughter", "Son"
  email             String
  phone             String?

  // Access control
  accessToken       String  @unique
  accessLevel       FamilyAccessLevel @default(READ_ONLY)

  // Permissions
  canViewClinicalNotes    Boolean @default(true)
  canViewMedications      Boolean @default(true)
  canViewCarePlan         Boolean @default(true)
  canViewPainAssessments  Boolean @default(true)
  canReceiveDailyUpdates  Boolean @default(true)
  canViewPhotos           Boolean @default(false)

  // Status
  isActive          Boolean   @default(true)
  inviteSentAt      DateTime?
  firstAccessAt     DateTime?
  lastAccessAt      DateTime?
  accessCount       Int       @default(0)

  // Expiration
  expiresAt         DateTime?
  revokedAt         DateTime?
  revokedBy         String?   // User ID who revoked

  // Metadata
  createdAt DateTime @default(now())
  createdBy String  // User ID
  updatedAt DateTime @updatedAt

  @@index([patientId])
  @@index([accessToken])
  @@index([isActive])
  @@map("family_portal_access")
}

enum FamilyAccessLevel {
  READ_ONLY
  LIMITED_INTERACTION  // Can send messages but not view all data
  FULL_ACCESS          // Can view everything (for legal guardians)
}
```

---

## 🎨 UI/UX Design Principles

### **1. Radical Simplicity**
- Maximum 6 buttons per screen
- 1-2 clicks to any feature
- Pre-filled forms with smart defaults
- Inline help text (no manuals)

### **2. Compassionate Design**
- Warm color palette (soft blues, gentle greens)
- Respectful language ("Comfort" not "Treatment")
- Patient photos for humanization
- Family-friendly terminology

### **3. Mobile-First**
- All features work on phone
- Large touch targets (min 44px)
- Thumb-reachable navigation
- Offline functionality

### **4. Accessibility**
- Screen reader support
- High contrast mode
- Large text options
- Simple, clear language (8th grade reading level)

---

## 🎭 Demo Script (10 Minutes)

### **Act 1: Patient Admission** (2 min)
"Maria, 78, admitted for end-stage cancer palliative care..."
- Show: Patient registration with photo, CNS/CPF
- Show: Family contacts entered easily
- Show: Advance directives documented (DNR, comfort care only)

### **Act 2: Interdisciplinary Rounds** (3 min)
"Care team reviews Maria's status..."
- Show: Pain scale decreased from 8 to 4 (trend graph)
- Show: Care plan with notes from doctor, nurse, therapist, chaplain
- Show: Medication adjustments based on pain trends

### **Act 3: AI-Assisted Documentation** (2 min)
"Dr. Silva documents with AI assistance..."
- Show: Voice-to-text clinical note
- Show: AI suggests comfort interventions
- Show: Note completed in 30 seconds (vs. 5 minutes)

### **Act 4: Family Communication** (2 min)
"Maria's daughter logs in from home..."
- Show: Family portal with daily updates
- Show: Photo of Maria comfortable
- Show: Message from chaplain

### **Act 5: Quality Metrics** (1 min)
"Administrator reviews outcomes..."
- Show: 90% pain controlled
- Show: Family satisfaction scores
- Show: 40% documentation time saved

---

## 📊 Success Metrics

### **Week 1-2 (Setup)**
- ✅ 20 patients enrolled
- ✅ 10 staff trained (5 doctors, 5 nurses)
- ✅ 15 families using portal

### **Month 1 (Initial Usage)**
- ✅ 80% of notes use AI
- ✅ 50% time savings on documentation
- ✅ 90% staff satisfaction

### **Month 2 (Adoption)**
- ✅ 100 patients in system
- ✅ Daily active usage
- ✅ 70% family portal adoption

### **Month 3 (Expansion)**
- ✅ Full hospital adoption
- ✅ Begin e-SUS integration
- ✅ Reference case for other hospitals

---

## 🚀 Next Steps

**This Week (Days 1-2)**: Patient Management Polish ← WE ARE HERE
**Next**: Clinical Notes + Medications + Care Plans
**Then**: Family Portal + Pain Tracking
**Finally**: Demo Prep + Training

**Timeline**: Ready for Pequeno Cotolêngo demo in 14 days ✅

---

**Last Updated**: October 15, 2025
**Status**: IN PROGRESS - Week 1 Day 1
