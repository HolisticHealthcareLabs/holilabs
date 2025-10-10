# 🎯 Holi Labs - Product Roadmap to MVP

**Status**: Planning Phase
**Target MVP Launch**: 4-6 weeks
**Last Updated**: October 9, 2025

---

## 📊 Current Product Status: 65% Complete

### ✅ **What's BUILT (Clinician Dashboard)**

#### 1. **Core Authentication** ✅
- [x] Supabase authentication (login/signup)
- [x] Session management
- [x] Protected routes with middleware

#### 2. **Patient Management** ✅
- [x] Patient list view with search
- [x] Patient creation with PHI encryption
- [x] Patient detail view (History, Medications, Documents, Appointments)
- [x] Patient metadata display
- [x] Patient code generation (PT-xxxx)

#### 3. **AI Scribe** ✅
- [x] Audio recording with VAD (Voice Activity Detection)
- [x] Real-time waveform visualization
- [x] AssemblyAI transcription
- [x] 14 specialty SOAP templates (Cardiology, Pediatrics, etc.)
- [x] Gemini 2.0 Flash for SOAP note generation
- [x] Note signing with blockchain hashing

#### 4. **Clinical Notes Editor** ✅
- [x] Full SOAP note editor modal
- [x] 4 note templates (Follow-up, Initial, Procedure, Emergency)
- [x] Vital signs integration
- [x] Diagnosis selection (ICD-10 codes)
- [x] Procedure selection (CPT codes)
- [x] Auto-save functionality

#### 5. **Smart Prescriptions (Rx)** ✅
- [x] NLP prescription parsing ("Rx Metformina 500mg BID")
- [x] Safety alerts
- [x] Drug interaction warnings (UI ready)

#### 6. **Document Intelligence** ✅
- [x] Document upload
- [x] HIPAA de-identification
- [x] PHI removal with hashing

#### 7. **Appointments** ✅
- [x] Appointment scheduling
- [x] Calendar view
- [x] Google/Microsoft/Apple calendar sync (code ready)

#### 8. **Billing & Export** ✅
- [x] Bulk billing export (CSV)
- [x] Date range filtering
- [x] ICD-10/CPT code extraction
- [x] IMSS/ISSSTE/GNP format support

#### 9. **PWA Features** ✅
- [x] Offline support with IndexedDB queue
- [x] Service Worker configured
- [x] Push notifications infrastructure (VAPID keys generated)
- [x] Auto-sync when back online

#### 10. **Infrastructure** ✅
- [x] PostgreSQL database with 12 tables
- [x] Prisma ORM with migrations
- [x] Supabase Storage (encrypted audio)
- [x] Audit logging
- [x] Structured logging (Pino)

---

## 🔴 **What's MISSING (Critical for MVP)**

### 🚨 **Priority 1: Patient Portal (NEW)**

**Status**: ❌ **NOT BUILT**

#### **What Patients Need**:

1. **Patient Authentication** ❌
   - [ ] Separate login page (`/patient/login`)
   - [ ] Email + magic link authentication (passwordless)
   - [ ] SMS OTP for 2FA
   - [ ] Session management

2. **Patient Dashboard** ❌
   - [ ] Home view with summary
   - [ ] Upcoming appointments
   - [ ] Recent prescriptions
   - [ ] Unread messages from doctor
   - [ ] Health metrics timeline

3. **Medical Records Access** ❌
   - [ ] View all clinical notes (SOAP notes)
   - [ ] Filter by date, specialty, clinician
   - [ ] Download as PDF
   - [ ] Share with other clinicians (generate access token)

4. **Medications Management** ❌
   - [ ] Current medications list
   - [ ] Medication history
   - [ ] Prescription refill requests
   - [ ] Medication reminders (push notifications)

5. **Appointments** ❌
   - [ ] View upcoming appointments
   - [ ] Cancel/reschedule (with clinician approval)
   - [ ] Add to personal calendar
   - [ ] Pre-appointment questionnaire

6. **Lab Results** ❌
   - [ ] View lab results
   - [ ] Visualize trends over time (charts)
   - [ ] Doctor's comments/interpretation

7. **Document Wallet** ❌
   - [ ] View all medical documents
   - [ ] Upload personal documents (vaccine cards, etc.)
   - [ ] Download/share documents
   - [ ] Blockchain verification status

8. **Messaging** ❌
   - [ ] Secure messaging with clinician
   - [ ] Read/unread status
   - [ ] Attach images/documents
   - [ ] Push notifications for new messages

9. **Health Metrics** ❌
   - [ ] Manual data entry (weight, blood pressure, glucose)
   - [ ] Visualize trends with charts
   - [ ] Export data as CSV
   - [ ] Share with clinician

10. **Settings & Privacy** ❌
    - [ ] Update contact information
    - [ ] Manage notifications preferences
    - [ ] Download all data (GDPR compliance)
    - [ ] Delete account

**Estimated Time**: 2-3 weeks

---

### ⚠️ **Priority 2: Missing Clinician Features**

1. **Messaging System** ❌
   - [ ] Send messages to patients
   - [ ] Inbox/outbox views
   - [ ] Mark as read/unread
   - [ ] Attach files

2. **Lab Results Management** ❌
   - [ ] Upload lab results
   - [ ] Link to patient
   - [ ] Add interpretation notes
   - [ ] Visualize trends

3. **Prescription Submission** ❌
   - [ ] Actually submit Rx to pharmacy
   - [ ] Integration with Surescripts/DrFirst (US)
   - [ ] Integration with Mexican pharmacy networks
   - [ ] Refill management

4. **WhatsApp Bot** ⚠️ (50% complete)
   - [ ] Twilio credentials setup
   - [ ] Webhook endpoints
   - [ ] Message template approval
   - [ ] Automated reminders

5. **Calendar Sync** ⚠️ (80% complete)
   - [ ] Production OAuth credentials (Google, Microsoft)
   - [ ] Automatic appointment sync
   - [ ] Conflict detection

6. **Analytics Dashboard** ❌
   - [ ] Patient volume trends
   - [ ] Revenue tracking
   - [ ] Most common diagnoses
   - [ ] Avg consultation time

**Estimated Time**: 1-2 weeks

---

### 🟡 **Priority 3: Polish & UX Improvements**

1. **Onboarding Flow** ❌
   - [ ] Welcome wizard for new clinicians
   - [ ] Sample patient data
   - [ ] Interactive tutorial
   - [ ] Video walkthrough

2. **Mobile Responsiveness** ⚠️
   - [ ] Test all pages on mobile
   - [ ] Fix layout issues
   - [ ] Mobile-optimized scribe interface

3. **Loading States** ⚠️
   - [ ] Skeleton loaders for all pages
   - [ ] Progress indicators for uploads
   - [ ] Better error messages

4. **Empty States** ⚠️
   - [ ] "No patients yet" with CTA
   - [ ] "No appointments" with scheduling button
   - [ ] Helpful illustrations

5. **Accessibility** ⚠️
   - [ ] Keyboard navigation
   - [ ] Screen reader support
   - [ ] ARIA labels
   - [ ] Color contrast compliance

**Estimated Time**: 1 week

---

## 🗓️ **Recommended Implementation Timeline**

### **Week 1-2: Patient Portal Foundation**
- [ ] Day 1-2: Database schema updates (patient auth tables)
- [ ] Day 3-4: Patient authentication (magic link + OTP)
- [ ] Day 5-7: Patient dashboard home view
- [ ] Day 8-10: Medical records access
- [ ] Day 11-14: Medications + appointments views

### **Week 3-4: Patient Portal Advanced Features**
- [ ] Day 15-17: Document wallet
- [ ] Day 18-20: Messaging system (both sides)
- [ ] Day 21-23: Lab results visualization
- [ ] Day 24-26: Health metrics entry + charts
- [ ] Day 27-28: Settings + privacy controls

### **Week 5: Missing Clinician Features**
- [ ] Day 29-30: Prescription submission (pharmacy integration)
- [ ] Day 31-32: WhatsApp bot completion
- [ ] Day 33-34: Analytics dashboard
- [ ] Day 35: Calendar sync OAuth setup

### **Week 6: Polish & Testing**
- [ ] Day 36-37: Mobile responsiveness fixes
- [ ] Day 38-39: Loading states + empty states
- [ ] Day 40: Onboarding flow
- [ ] Day 41-42: End-to-end testing with real users

---

## 🎯 **MVP Feature Priority Matrix**

| Feature | Impact | Effort | Priority | Status |
|---------|--------|--------|----------|--------|
| **Patient Portal - Auth** | 🔴 Critical | Medium | P0 | ❌ Not Started |
| **Patient Portal - Medical Records** | 🔴 Critical | High | P0 | ❌ Not Started |
| **Patient Portal - Medications** | 🔴 Critical | Medium | P0 | ❌ Not Started |
| **Patient Portal - Appointments** | 🟡 High | Medium | P1 | ❌ Not Started |
| **Messaging System** | 🟡 High | High | P1 | ❌ Not Started |
| **Lab Results Visualization** | 🟡 High | Medium | P1 | ❌ Not Started |
| **Document Wallet (Patient)** | 🟡 High | Low | P1 | ❌ Not Started |
| **Prescription Pharmacy Submit** | 🟢 Medium | High | P2 | ❌ Not Started |
| **WhatsApp Bot Complete** | 🟢 Medium | Medium | P2 | 🟡 50% Done |
| **Analytics Dashboard** | 🟢 Medium | Medium | P2 | ❌ Not Started |
| **Onboarding Flow** | 🟢 Medium | Low | P3 | ❌ Not Started |
| **Mobile Polish** | 🟢 Medium | Medium | P3 | ❌ Not Started |

---

## 📐 **Architecture Decisions**

### **Patient Portal Architecture**

#### **Option 1: Separate Subdomain (Recommended)**
```
clinician.holilabs.com → /dashboard (existing)
patient.holilabs.com → /portal (new)
```

**Pros**:
- Clear separation of concerns
- Different auth flows
- Independent deployments
- Better SEO

**Cons**:
- More complex setup
- Two domains to manage

#### **Option 2: Shared Domain with Route Prefix**
```
holilabs.com/dashboard → Clinician
holilabs.com/portal → Patient
```

**Pros**:
- Single deployment
- Easier to manage
- Shared components

**Cons**:
- Potential routing conflicts
- Mixed auth contexts

**Recommendation**: Use **Option 2** (shared domain) for MVP, migrate to Option 1 later.

---

### **Database Schema Changes Needed**

#### **New Tables**:

1. **`patient_users`** (separate from clinician users)
   ```sql
   id          UUID PRIMARY KEY
   patient_id  UUID REFERENCES patients(id)
   email       VARCHAR UNIQUE NOT NULL
   phone       VARCHAR
   email_verified_at TIMESTAMP
   phone_verified_at TIMESTAMP
   created_at  TIMESTAMP
   updated_at  TIMESTAMP
   ```

2. **`magic_links`** (passwordless auth)
   ```sql
   id          UUID PRIMARY KEY
   patient_user_id UUID REFERENCES patient_users(id)
   token       VARCHAR UNIQUE NOT NULL
   expires_at  TIMESTAMP NOT NULL
   used_at     TIMESTAMP
   created_at  TIMESTAMP
   ```

3. **`messages`** (clinician ↔ patient)
   ```sql
   id              UUID PRIMARY KEY
   from_user_id    UUID NOT NULL
   from_user_type  ENUM('clinician', 'patient')
   to_user_id      UUID NOT NULL
   to_user_type    ENUM('clinician', 'patient')
   patient_id      UUID REFERENCES patients(id)
   subject         VARCHAR
   body            TEXT NOT NULL
   read_at         TIMESTAMP
   parent_message_id UUID REFERENCES messages(id)
   created_at      TIMESTAMP
   ```

4. **`health_metrics`** (patient-entered data)
   ```sql
   id          UUID PRIMARY KEY
   patient_id  UUID REFERENCES patients(id)
   metric_type ENUM('weight', 'blood_pressure', 'glucose', 'temperature', etc.)
   value       JSONB NOT NULL
   recorded_at TIMESTAMP NOT NULL
   source      ENUM('patient', 'clinician', 'device')
   created_at  TIMESTAMP
   ```

5. **`document_shares`** (patient shares records)
   ```sql
   id              UUID PRIMARY KEY
   patient_id      UUID REFERENCES patients(id)
   document_type   ENUM('clinical_note', 'prescription', 'lab_result', etc.)
   document_id     UUID NOT NULL
   share_token     VARCHAR UNIQUE NOT NULL
   recipient_email VARCHAR
   expires_at      TIMESTAMP
   accessed_at     TIMESTAMP
   created_at      TIMESTAMP
   ```

---

## 🔄 **Decentralization Roadmap (Phase 2)**

**Current**: Web2 (PostgreSQL + Supabase)
**Future**: Web3 (IPFS + Polygon)

### **Migration Plan**:

1. **Phase 1 (Now)**: Build everything with Web2
   - PostgreSQL for data storage
   - Supabase for file storage
   - Blockchain hashing for verification

2. **Phase 2 (3-6 months)**: Add Web3 Layer
   - Store encrypted medical records on IPFS
   - NFT-based access control (ERC-721)
   - Smart contracts for consent management
   - Patient owns private key → controls data

3. **Phase 3 (6-12 months)**: Full Decentralization
   - IPFS as primary storage
   - PostgreSQL as index/cache only
   - Patients can self-host their data
   - Zero-knowledge proofs for privacy

**For Now**: Focus on Web2 MVP, but keep architecture flexible for migration.

---

## 🎨 **Design System**

### **Patient Portal Design Principles**:

1. **Simple & Clear**: Patients aren't medical professionals - use plain language
2. **Mobile-First**: 70% of patients will access from phones
3. **Large Touch Targets**: Minimum 44x44px for buttons
4. **High Contrast**: Accessibility for older patients
5. **Emoji/Icons**: Visual cues for quick understanding
6. **Green = Safe**: Use green for verified/safe actions

### **Color Palette (Patient Portal)**:
```scss
Primary: #10B981 (green - trust & health)
Secondary: #3B82F6 (blue - calm)
Accent: #8B5CF6 (purple - premium)
Success: #10B981
Warning: #F59E0B
Danger: #EF4444
Gray: #6B7280
```

---

## 📦 **Tech Stack Additions**

### **For Patient Portal**:

1. **Charts**: `recharts` or `chart.js` (health metrics visualization)
2. **Calendar**: `react-big-calendar` (appointments view)
3. **QR Codes**: `qrcode.react` (for document sharing)
4. **Magic Links**: `nodemailer` or Resend (already have)
5. **SMS**: Twilio (already installed)
6. **File Preview**: `react-pdf` (view medical documents)

**Install**:
```bash
pnpm add recharts react-big-calendar qrcode.react react-pdf
```

---

## 🧪 **Testing Strategy**

### **Before Launch**:

1. **Unit Tests**: 80% coverage (critical paths)
2. **Integration Tests**: All API endpoints
3. **E2E Tests**: Main user flows (scribe, prescriptions, patient portal)
4. **Load Testing**: 100 concurrent users
5. **Security Audit**: OWASP Top 10 checks
6. **HIPAA Compliance**: PHI encryption, audit logs, BAAs

---

## 🚀 **MVP Launch Checklist**

### **Functional Requirements**:
- [ ] Clinician can create patients
- [ ] Clinician can record audio → generate SOAP note
- [ ] Clinician can sign notes
- [ ] Clinician can create prescriptions
- [ ] Clinician can export billing data
- [ ] **Patient can log in**
- [ ] **Patient can view medical records**
- [ ] **Patient can view medications**
- [ ] **Patient can view appointments**
- [ ] **Patient can message clinician**

### **Non-Functional Requirements**:
- [ ] Page load < 2 seconds
- [ ] Mobile responsive (all pages)
- [ ] Offline mode works
- [ ] Push notifications work
- [ ] All PHI encrypted at rest
- [ ] Audit logs capture all access
- [ ] HIPAA BAAs signed

---

## 💰 **Pricing Strategy (Recommendations)**

### **Tiered Pricing**:

| Tier | Price | Target |
|------|-------|--------|
| **Solo** | $99/mo | 1 clinician, 50 patients |
| **Clinic** | $299/mo | 5 clinicians, 500 patients |
| **Enterprise** | Custom | Unlimited clinicians + patients |

### **Add-ons**:
- WhatsApp Reminders: +$20/mo
- E-Prescribing (Surescripts): +$50/mo
- Telehealth (Twilio Video): +$30/mo
- Advanced Analytics: +$40/mo

---

## 📞 **Next Steps**

**Decision Point**: Which features to build first?

**Recommended Order**:
1. ✅ **Patient Portal Auth** (3 days) - Foundation for everything
2. ✅ **Patient Dashboard Home** (2 days) - First impression
3. ✅ **Medical Records View** (4 days) - Core value prop
4. ✅ **Medications View** (2 days) - High usage feature
5. ✅ **Document Wallet** (2 days) - Easy win
6. ✅ **Messaging System** (5 days) - High engagement
7. ⚠️ **Lab Results** (3 days) - Differentiation
8. ⚠️ **Health Metrics** (3 days) - Patient engagement

**Total MVP Completion**: 24 days (4-5 weeks with testing)

---

**Document Version**: 1.0
**Last Updated**: October 9, 2025
**Owner**: Product Team
**Next Review**: Weekly during development
