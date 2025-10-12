# Enhanced Features - Complete Implementation Plan

## User Requirements Summary

### 1. Multi-language Support ✅
- **Languages:** Spanish (primary), English, Portuguese
- **Implementation:** next-intl (already installed)
- **Location:** Language selector on main screen (navbar)
- **Scope:** All UI text, forms, notifications, emails

### 2. Synthetic Patient Data Generator 🆕
- **Quantity:** 30 realistic patients
- **Quality:** Industry-grade medical data
- **Purpose:** Testing/demo without real PHI
- **Data includes:**
  - Demographics (ES/EN/PT names)
  - Medical history
  - Medications
  - Appointments
  - Lab results
  - Documents

### 3. Patient Metadata for AI Prompts 🆕
- **Purpose:** Optimize patient context for AI (SOAP notes, scribe, etc.)
- **Format:** Structured prompt template
- **Includes:**
  - Demographics
  - Active medications
  - Allergies
  - Chronic conditions
  - Recent visits
  - Relevant lab results

### 4. Patient File Upload System 🆕
- **Requirements:**
  - Industry-grade UX
  - Dummy-proof (drag-and-drop)
  - Flows like wine (smooth animations)
  - Multiple file types
  - Bulk upload
  - OCR for scanned documents (future)

---

## Implementation

## 1. Multi-language Support

### A. Setup i18n Structure

```
src/i18n/
├── locales/
│   ├── en/
│   │   ├── common.json       # Shared translations
│   │   ├── dashboard.json    # Dashboard UI
│   │   ├── portal.json       # Patient portal
│   │   ├── forms.json        # Forms system
│   │   └── medical.json      # Medical terminology
│   ├── es/
│   │   ├── common.json
│   │   ├── dashboard.json
│   │   ├── portal.json
│   │   ├── forms.json
│   │   └── medical.json
│   └── pt/
│       ├── common.json
│       ├── dashboard.json
│       ├── portal.json
│       ├── forms.json
│       └── medical.json
├── config.ts                  # next-intl configuration
└── middleware.ts              # Locale detection
```

### B. Language Selector Component

**Location:** Navbar (top-right)
**Design:** Inspired by Notion/Linear
- 🌐 Globe icon
- Dropdown menu
- Flag emojis for visual recognition
- Current language highlighted

```tsx
<LanguageSelector>
  <Button>
    🌐 {currentLocale}
  </Button>
  <DropdownMenu>
    <Item onClick={() => setLocale('en')}>🇺🇸 English</Item>
    <Item onClick={() => setLocale('es')}>🇲🇽 Español</Item>
    <Item onClick={() => setLocale('pt')}>🇧🇷 Português</Item>
  </DropdownMenu>
</LanguageSelector>
```

### C. Translation Priority

**Phase 1 (Critical):**
- Navigation menu
- Dashboard home
- Patient list
- Form labels/placeholders
- Error messages
- Success notifications

**Phase 2 (Important):**
- Forms templates
- Settings pages
- Email templates
- SMS notifications

**Phase 3 (Nice-to-have):**
- Help documentation
- Onboarding tooltips
- Marketing pages

### D. Medical Terminology Translation

**Challenge:** Medical terms must be accurate across languages

**Solution:**
- Use medical dictionaries (ICD-10 translations)
- Consult with medical translators
- Allow clinicians to customize terms per practice

**Examples:**
```json
{
  "en": {
    "diabetes": "Diabetes",
    "hypertension": "High Blood Pressure",
    "prescription": "Prescription"
  },
  "es": {
    "diabetes": "Diabetes",
    "hypertension": "Hipertensión",
    "prescription": "Receta Médica"
  },
  "pt": {
    "diabetes": "Diabetes",
    "hypertension": "Hipertensão",
    "prescription": "Prescrição"
  }
}
```

---

## 2. Synthetic Patient Generator

### A. Patient Data Schema

```typescript
interface SyntheticPatient {
  // Demographics
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'M' | 'F';
  language: 'en' | 'es' | 'pt';

  // Contact
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };

  // Medical
  mrn: string; // Medical Record Number
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  medications: Medication[];

  // Clinical history
  lastVisit?: Date;
  nextAppointment?: Date;
  primaryConcern?: string;

  // Insurance
  insuranceProvider?: string;
  insuranceId?: string;
}
```

### B. Data Generation Libraries

```bash
pnpm add @faker-js/faker
pnpm add --save-dev @types/faker
```

**Features:**
- Realistic names (locale-aware)
- Valid addresses
- Phone numbers
- Medical conditions from ICD-10
- Medications from FDA database

### C. Sample Patient Profiles

**Profile Mix (30 patients):**
- 10 English-speaking (US)
- 15 Spanish-speaking (Mexico/Latin America)
- 5 Portuguese-speaking (Brazil)

**Age distribution:**
- 5 pediatric (0-17)
- 15 adult (18-64)
- 10 elderly (65+)

**Condition mix:**
- 10 healthy (preventive care)
- 15 chronic disease management
- 5 acute conditions

### D. Generator Script

**File:** `prisma/seed-patients.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const LOCALES = ['en', 'es', 'pt'];
const CHRONIC_CONDITIONS = [
  'Type 2 Diabetes',
  'Hypertension',
  'Asthma',
  'Arthritis',
  'COPD',
  'Depression',
  'Anxiety',
  'Hyperlipidemia',
];

const COMMON_ALLERGIES = [
  'Penicillin',
  'Sulfa drugs',
  'Pollen',
  'Peanuts',
  'Latex',
  'Shellfish',
];

const COMMON_MEDICATIONS = [
  { name: 'Metformin', dosage: '500mg', frequency: 'twice daily' },
  { name: 'Lisinopril', dosage: '10mg', frequency: 'once daily' },
  { name: 'Atorvastatin', dosage: '20mg', frequency: 'once daily at bedtime' },
  { name: 'Albuterol', dosage: '90mcg', frequency: 'as needed' },
  { name: 'Omeprazole', dosage: '20mg', frequency: 'once daily' },
];

async function generatePatient(locale: string, clinicianId: string) {
  faker.setLocale(locale);

  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  const dateOfBirth = faker.date.birthdate({ min: 1940, max: 2015, mode: 'year' });

  // Generate realistic medical history
  const hasChronicConditions = Math.random() > 0.3;
  const conditions = hasChronicConditions
    ? faker.helpers.arrayElements(CHRONIC_CONDITIONS, faker.datatype.number({ min: 1, max: 3 }))
    : [];

  const hasAllergies = Math.random() > 0.4;
  const allergies = hasAllergies
    ? faker.helpers.arrayElements(COMMON_ALLERGIES, faker.datatype.number({ min: 1, max: 2 }))
    : [];

  // Create patient
  const patient = await prisma.patient.create({
    data: {
      mrn: `PT-${faker.random.alphaNumeric(12).toUpperCase()}`,
      firstName,
      lastName,
      dateOfBirth,
      gender: faker.helpers.arrayElement(['M', 'F']),
      email: faker.internet.email(firstName, lastName).toLowerCase(),
      phone: faker.phone.number('+1-###-###-####'),
      address: faker.address.streetAddress(),
      city: faker.address.city(),
      state: faker.address.stateAbbr(),
      zipCode: faker.address.zipCode(),
      assignedClinicianId: clinicianId,
      dataHash: faker.random.alphaNumeric(64), // SHA-256 hash
    },
  });

  // Create medications if chronic conditions exist
  if (hasChronicConditions) {
    const medCount = faker.datatype.number({ min: 1, max: 4 });
    const meds = faker.helpers.arrayElements(COMMON_MEDICATIONS, medCount);

    for (const med of meds) {
      await prisma.medication.create({
        data: {
          patientId: patient.id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          startDate: faker.date.past(2),
          isActive: true,
        },
      });
    }
  }

  // Create appointment (50% have upcoming appointment)
  if (Math.random() > 0.5) {
    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        clinicianId,
        title: faker.helpers.arrayElement([
          'Follow-up Visit',
          'Annual Physical',
          'Consultation',
          'Lab Review',
        ]),
        startTime: faker.date.soon(30),
        endTime: faker.date.soon(30),
        type: 'IN_PERSON',
        status: 'SCHEDULED',
      },
    });
  }

  console.log(`✅ Created patient: ${firstName} ${lastName} (${locale})`);
  return patient;
}

async function seedPatients() {
  // Get first clinician
  const clinician = await prisma.user.findFirst({
    where: { role: 'CLINICIAN' },
  });

  if (!clinician) {
    console.error('❌ No clinician found. Please seed clinicians first.');
    return;
  }

  console.log(`🏥 Generating 30 synthetic patients for Dr. ${clinician.firstName} ${clinician.lastName}...\n`);

  // Generate patients by locale
  const localeDistribution = [
    ...Array(10).fill('en'),
    ...Array(15).fill('es'),
    ...Array(5).fill('pt'),
  ];

  for (const locale of localeDistribution) {
    await generatePatient(locale, clinician.id);
  }

  console.log('\n✅ Successfully generated 30 synthetic patients!');
}

seedPatients()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Run:** `pnpm tsx prisma/seed-patients.ts`

---

## 3. Patient Metadata for AI Prompts

### A. Prompt Template Format

**Purpose:** Provide rich context to AI (for SOAP notes, clinical decisions, etc.)

**File:** `src/lib/ai/patient-context.ts`

```typescript
import { Patient, Medication, Appointment } from '@prisma/client';

export interface PatientContext {
  patient: Patient & {
    medications: Medication[];
    appointments: Appointment[];
  };
}

export function formatPatientForPrompt(context: PatientContext): string {
  const { patient } = context;

  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
  const gender = patient.gender === 'M' ? 'Male' : 'Female';

  // Active medications
  const activeMeds = patient.medications
    .filter(m => m.isActive)
    .map(m => `- ${m.name} ${m.dosage} ${m.frequency}`)
    .join('\n');

  // Upcoming appointments
  const nextAppt = patient.appointments
    .filter(a => new Date(a.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  return `
PATIENT INFORMATION
═══════════════════════════════════════

Demographics:
─────────────────────────────────────
Name: ${patient.firstName} ${patient.lastName}
MRN: ${patient.mrn}
Age: ${age} years old
Sex: ${gender}
Date of Birth: ${patient.dateOfBirth.toISOString().split('T')[0]}

Contact:
─────────────────────────────────────
Phone: ${patient.phone}
Email: ${patient.email}
Address: ${patient.address}, ${patient.city}, ${patient.state} ${patient.zipCode}

${activeMeds ? `
Current Medications:
─────────────────────────────────────
${activeMeds}
` : ''}

${patient.allergies?.length > 0 ? `
Known Allergies:
─────────────────────────────────────
${patient.allergies.map(a => `- ${a}`).join('\n')}
` : ''}

${patient.chronicConditions?.length > 0 ? `
Chronic Conditions:
─────────────────────────────────────
${patient.chronicConditions.map(c => `- ${c}`).join('\n')}
` : ''}

${nextAppt ? `
Next Appointment:
─────────────────────────────────────
${nextAppt.title} - ${new Date(nextAppt.startTime).toLocaleDateString()}
` : ''}

═══════════════════════════════════════
  `.trim();
}
```

### B. Usage in AI Features

```typescript
// In SOAP note generation
const patientPrompt = formatPatientForPrompt({ patient });

const soapPrompt = `
${patientPrompt}

VISIT TRANSCRIPTION
═══════════════════════════════════════
${transcriptionText}

Generate SOAP notes based on the above patient information and visit transcript.
`;
```

---

## 4. File Upload System for Patient History

### A. Requirements

✅ **Industry-grade UX:**
- Drag-and-drop zone
- Click to browse
- Multiple file selection
- File type validation
- Size limit (50MB per file)
- Progress bars for each file
- Preview thumbnails

✅ **Dummy-proof:**
- Clear visual feedback
- Error messages in plain language
- Undo capability
- Confirmation before delete

✅ **Flows like wine:**
- Smooth animations (Framer Motion)
- Instant feedback
- No page reloads
- Real-time updates

### B. Component Architecture

```tsx
<FileUploadZone patientId={patientId}>
  <DropZone>
    <Icon>📁</Icon>
    <Text>Drag files here or click to browse</Text>
    <Subtext>PDF, JPG, PNG, DOCX (max 50MB per file)</Subtext>
  </DropZone>

  <FileList>
    <FileItem>
      <Thumbnail />
      <FileName />
      <FileSize />
      <ProgressBar />
      <DeleteButton />
    </FileItem>
  </FileList>
</FileUploadZone>
```

### C. Upload Flow

**Step 1: Select files**
- Drag-and-drop OR click to browse
- Validate file types
- Validate file sizes
- Show file list with thumbnails

**Step 2: Add metadata (optional)**
- Document type (Lab Result, X-Ray, Prescription, etc.)
- Date of document
- Notes/description

**Step 3: Upload**
- Encrypt file (AES-256-GCM)
- Upload to Cloudflare R2
- Create Document record in database
- Show progress bar

**Step 4: Success**
- Show checkmark animation
- File appears in patient documents list
- Auto-categorize by type

### D. Technical Implementation

**Libraries:**
```bash
pnpm add react-dropzone
pnpm add @uppy/core @uppy/dashboard @uppy/xhr-upload  # Alternative: Uppy
```

**API Route:** `/api/patients/[id]/documents/upload`

```typescript
// POST /api/patients/[id]/documents/upload

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const documentType = formData.get('documentType') as string;
  const documentDate = formData.get('documentDate') as string;

  // Encrypt file
  const encryptedBuffer = await encryptFile(await file.arrayBuffer());

  // Upload to R2
  const fileUrl = await uploadToR2(encryptedBuffer, file.name);

  // Create database record
  const document = await prisma.document.create({
    data: {
      patientId: params.id,
      fileName: file.name,
      fileUrl,
      fileSize: file.size,
      mimeType: file.type,
      documentType,
      documentDate: new Date(documentDate),
      encryptionIv: '...',  // Store IV for decryption
      uploadedBy: session.user.id,
    },
  });

  return NextResponse.json({ success: true, document });
}
```

### E. File Organization

**Categories (auto-detect from filename/content):**
- 📋 Lab Results
- 📷 Imaging (X-Ray, MRI, CT)
- 💊 Prescriptions
- 📝 Clinical Notes
- 📄 Insurance Documents
- 📋 Consent Forms
- 🩺 Referrals
- 📊 Other

**View Options:**
- List view (table)
- Grid view (thumbnails)
- Timeline view (chronological)

**Filters:**
- By type
- By date range
- By keyword search

---

## 5. Forms System (Continued)

### Quick Win: Seed Form Templates

Create `prisma/seed-forms.ts` and run to populate built-in templates.

### Clinician Dashboard: Forms Tab

**Path:** `/dashboard/forms`

**Features:**
- Template gallery
- Send form button
- Sent forms tracker
- Analytics widget

---

## Implementation Order

### Week 1: Foundation
1. ✅ Multi-language setup (2 days)
2. ✅ Synthetic patient generator (1 day)
3. ✅ Patient metadata formatter (1 day)
4. ✅ File upload system (3 days)

### Week 2: Forms System
5. ✅ Seed form templates (1 day)
6. ✅ Clinician forms dashboard (2 days)
7. ✅ Patient form experience (3 days)

### Week 3: Polish & Deploy
8. ✅ Testing & bug fixes (2 days)
9. ✅ Documentation (1 day)
10. ✅ Deploy to production (1 day)

---

## Success Criteria

✅ **Multi-language:**
- User can switch language from any page
- All critical UI text translated
- Medical terms accurate in all languages

✅ **Synthetic Patients:**
- 30 diverse, realistic patients generated
- Clinicians can test all features
- Data feels authentic (not obviously fake)

✅ **Patient Context:**
- AI receives rich patient metadata
- Prompts are well-formatted
- Context improves AI output quality

✅ **File Upload:**
- "Just works" - intuitive for any user
- Fast (< 3 seconds for 10MB file)
- Secure (encrypted, HIPAA-compliant)
- Beautiful (animations, feedback)

✅ **Forms System:**
- Clinicians can send forms in < 1 minute
- Patients complete forms on mobile easily
- >80% completion rate
- Secure e-signatures captured

---

**Ready to start implementing!** Let's begin with multi-language support.
