# Forms System - Complete Implementation Guide

## Overview
World-class patient forms system inspired by TypeForm, Google Forms, and healthcare leaders like Elation Health & Athenahealth.

## ✅ Completed

### 1. Database Schema (Prisma)
- **Form Template** model - stores pre-built and custom form templates
- **FormInstance** model - tracks sent forms and responses
- **FormAuditLog** model - HIPAA-compliant audit trail
- **Enums**: FormCategory, FormStatus, FormAuditEvent

### 2. Pre-built Templates (JSON)
Created 3 industry-standard templates:
- `general-consent.json` - General medical consent (5 min)
- `hipaa-authorization.json` - HIPAA release form (8 min)
- `medical-history-intake.json` - New patient intake (15 min)

## 🚀 Next Steps

### Phase 1: Seed Database with Templates
Create `prisma/seed-forms.ts`:

```typescript
import { prisma } from '../src/lib/prisma';
import generalConsent from '../src/lib/forms/templates/general-consent.json';
import hipaaAuth from '../src/lib/forms/templates/hipaa-authorization.json';
import medicalHistory from '../src/lib/forms/templates/medical-history-intake.json';

async function seedForms() {
  const templates = [
    {
      title: generalConsent.title,
      description: generalConsent.description,
      category: generalConsent.category,
      isBuiltIn: true,
      isActive: true,
      structure: generalConsent,
      estimatedMinutes: generalConsent.estimatedMinutes,
      tags: ['consent', 'general', 'treatment'],
      version: 1,
    },
    {
      title: hipaaAuth.title,
      description: hipaaAuth.description,
      category: hipaaAuth.category,
      isBuiltIn: true,
      isActive: true,
      structure: hipaaAuth,
      estimatedMinutes: hipaaAuth.estimatedMinutes,
      tags: ['hipaa', 'authorization', 'privacy', 'release'],
      version: 1,
    },
    {
      title: medicalHistory.title,
      description: medicalHistory.description,
      category: medicalHistory.category,
      isBuiltIn: true,
      isActive: true,
      structure: medicalHistory,
      estimatedMinutes: medicalHistory.estimatedMinutes,
      tags: ['intake', 'new-patient', 'history'],
      version: 1,
    },
  ];

  for (const template of templates) {
    await prisma.formTemplate.upsert({
      where: { title: template.title },
      update: template,
      create: template,
    });
  }

  console.log('✅ Forms seeded successfully');
}

seedForms();
```

Run: `pnpm tsx prisma/seed-forms.ts`

### Phase 2: Clinician Dashboard - Forms Management

#### A. Forms List Page (`/dashboard/forms/page.tsx`)
**Features:**
- Gallery view of all templates
- Categories filter (Consent, HIPAA, Medical History, etc.)
- Search forms
- "Send Form" button
- Usage statistics per template
- Create custom form button

**UI Inspiration:** Notion database, Airtable gallery view

#### B. Send Form Modal
**Workflow:**
1. Select patient (dropdown with search)
2. Choose template
3. Set expiration (7 days default, custom)
4. Add custom message (optional)
5. Preview form
6. Send (email + SMS notification)

**Success:** Show unique link, option to copy, automatic email sent

#### C. Sent Forms Tracker (`/dashboard/forms/sent`)
**Table Columns:**
- Patient name
- Form title
- Status badge (Pending/Viewed/In Progress/Completed/Signed)
- Sent date
- Progress % (if in progress)
- Actions (View, Resend, Revoke)

**Real-time Updates:** WebSocket for status changes

### Phase 3: Patient Experience

#### A. Magic Link Landing (`/portal/forms/[token]`)
**Design Principles:**
- Mobile-first (80% of patients fill forms on phone)
- One question at a time (TypeForm style)
- Progress bar at top
- Auto-save every 10 seconds
- "Save & Continue Later" button

**Security:**
- Verify token (SHA-256 hash)
- Check expiration
- Log access (IP, user agent)
- Rate limit (prevent brute force)

#### B. Form Renderer Component
**Features:**
- Conditional logic (show/hide fields based on answers)
- Field types:
  - Text, textarea, number, email, tel, date
  - Select, radio, checkbox, checkbox_group
  - Signature pad (smooth canvas drawing)
  - File upload (attach documents)
  - Section headers, info boxes
- Validation (required, pattern, min/max)
- Auto-fill patient data (name, DOB, etc.)
- Keyboard navigation (accessibility)

**Libraries to use:**
- `react-hook-form` - form state management
- `react-signature-canvas` - e-signatures
- `zod` - validation schemas
- `framer-motion` - page transitions

#### C. Signature & Submit
**Flow:**
1. Review all answers (editable)
2. E-signature capture
   - Canvas with "Clear" and "Done"
   - Save as base64 PNG
3. Final consent checkbox
4. Submit button
5. Success screen with:
   - Confirmation message
   - Download PDF button
   - "Return to Portal" link

**Backend:**
- Hash submission data (SHA-256)
- Store signature + IP + timestamp
- Send confirmation email to patient & clinician
- Update FormInstance status to SIGNED
- Create audit log entry

### Phase 4: Custom Form Upload

#### A. Upload Flow (`/dashboard/forms/upload`)
**Supported formats:**
- PDF (fillable or scanned)
- DOCX (Word documents)
- JSON (structured form definitions)

**Process:**
1. Upload file → Cloudflare R2
2. Parse file:
   - PDF: Extract fields with `pdf-lib`
   - DOCX: Parse with `mammoth.js`
   - JSON: Validate structure
3. Generate preview
4. Save as FormTemplate with `fileUrl`

#### B. PDF Fillable Forms
**Library:** `pdf-lib` for PDF manipulation
**Flow:**
1. Patient fills web form
2. Backend maps responses to PDF fields
3. Generate filled PDF
4. Store in R2
5. Email to clinician & patient

### Phase 5: Form Builder (Advanced)

**Drag-and-drop form builder** (like Google Forms/TypeForm):
- Left sidebar: Field types palette
- Center: Form canvas (drag to reorder)
- Right sidebar: Field properties
- Preview mode
- Conditional logic builder
- Branching (skip to section based on answer)

**Libraries:**
- `@dnd-kit/core` - drag and drop
- `react-beautiful-dnd` - alternative
- Custom field registry

### Phase 6: Analytics & Reporting

#### Dashboard Metrics:
- Forms sent this month
- Completion rate by template
- Average time to complete
- Status breakdown (pie chart)
- Top forms by usage

#### Per-Form Analytics:
- Field completion rate
- Drop-off points (where patients abandon)
- Average time per field
- Signature rate

### Phase 7: Reminders & Notifications

**Auto-reminders:**
- Day 3: "Gentle reminder to complete form"
- Day 6: "Your form expires in 24 hours"
- Customizable frequency

**Notification channels:**
- Email (Resend)
- SMS (Twilio) - future
- Push notifications (if patient has app)

**Clinician notifications:**
- Instant: Form completed & signed
- Daily digest: Pending forms summary

## Technical Implementation

### API Routes to Create:

1. **`/api/forms/templates`**
   - GET: List all templates (filter by category)
   - POST: Create custom template

2. **`/api/forms/send`**
   - POST: Send form to patient
   - Body: `{ patientId, templateId, expiresAt?, message? }`
   - Returns: `{ formInstanceId, accessToken, publicUrl }`

3. **`/api/forms/[instanceId]`**
   - GET: Get form instance details
   - PATCH: Update progress/responses
   - DELETE: Revoke form

4. **`/api/forms/[instanceId]/submit`**
   - POST: Submit completed form
   - Body: `{ responses, signatureDataUrl, ipAddress }`

5. **`/api/forms/public/[token]`**
   - GET: Patient access form (verify token)
   - POST: Save progress (auto-save)

6. **`/api/forms/[instanceId]/remind`**
   - POST: Send manual reminder

7. **`/api/forms/[instanceId]/download`**
   - GET: Generate filled PDF

### Components to Build:

```
src/components/forms/
├── FormGallery.tsx          # Template gallery
├── FormCard.tsx             # Template card with preview
├── SendFormModal.tsx        # Send form workflow
├── SentFormsTable.tsx       # Sent forms tracker
├── FormRenderer.tsx         # Patient form viewer
├── FormField.tsx            # Individual field renderer
├── SignaturePad.tsx         # E-signature capture
├── FormProgress.tsx         # Progress bar
├── ConditionalField.tsx     # Conditional logic handler
└── FormAnalytics.tsx        # Analytics dashboard
```

## Best Practices Borrowed From:

### TypeForm:
- One question at a time
- Beautiful transitions
- Conversational tone
- Progress indication

### Google Forms:
- Multi-page sections
- Response validation
- Summary page before submit
- Automatic email notifications

### Elation Health:
- HIPAA-compliant design
- E-signature workflow
- Auto-fill patient demographics
- Clinician-facing analytics

### Athenahealth:
- Smart forms (conditional logic)
- Integration with EHR data
- Automated reminders
- PDF generation

## Compliance Checklist

✅ HIPAA:
- Encrypted storage (AES-256)
- Audit logs for all access
- Signed BAA with all vendors
- Access token expiration
- Data minimization

✅ Accessibility (WCAG 2.1 AA):
- Keyboard navigation
- Screen reader labels
- High contrast mode
- Focus indicators
- Skip links

✅ Security:
- Rate limiting
- CSRF tokens
- SQL injection prevention (Prisma)
- XSS protection
- Content Security Policy

## Estimated Timeline

- **Phase 1** (Seeding): 1 hour
- **Phase 2** (Clinician UI): 2 days
- **Phase 3** (Patient Experience): 3 days
- **Phase 4** (Custom Upload): 2 days
- **Phase 5** (Form Builder): 5 days (optional)
- **Phase 6** (Analytics): 2 days
- **Phase 7** (Reminders): 1 day

**Total MVP (Phases 1-4):** ~1 week
**Complete System (All phases):** ~2-3 weeks

## Launch Strategy

1. **Soft launch:** Release with 3 pre-built templates
2. **Gather feedback:** Monitor completion rates & user feedback
3. **Iterate:** Add most-requested templates
4. **Custom forms:** Enable PDF/DOCX upload
5. **Form builder:** Launch drag-and-drop builder
6. **Advanced features:** Analytics, branching logic, integrations

## Success Metrics

- **Adoption:** % of clinicians using forms
- **Completion rate:** >80% of sent forms completed
- **Time saved:** vs. paper forms or fax
- **Patient satisfaction:** NPS score
- **Form abandonment:** <15%

---

**Ready to build!** Start with Phase 1 (seeding) and Phase 2 (Clinician UI).
