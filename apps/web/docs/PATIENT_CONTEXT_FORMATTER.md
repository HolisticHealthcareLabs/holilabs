# Patient Context Formatter

## Overview

The Patient Context Formatter is a utility system that structures patient data into optimized prompts for AI models. It's used throughout the application for:

- 📝 **SOAP Note Generation** - Clinical documentation
- 🎙️ **Clinical Scribe** - Real-time conversation transcription
- 🤖 **AI Assistant** - Context-aware medical queries
- 📊 **Patient Summaries** - Quick reference views

## Features

✅ **Smart Data Extraction** - Pulls relevant patient information
✅ **Context-Aware Formatting** - Different formats for different use cases
✅ **Medical History Inference** - Derives conditions from medications
✅ **Age Calculation** - Dynamic age from DOB
✅ **Recent Visit Tracking** - Last 3-5 appointments
✅ **Active Medication Filtering** - Only current prescriptions

---

## File Structure

```
src/
├── lib/ai/
│   ├── patient-context-formatter.ts    # Core formatting logic
│   └── patient-data-fetcher.ts         # Database queries
├── app/api/ai/
│   └── patient-context/route.ts        # API endpoint
└── hooks/
    └── usePatientContext.ts            # React hook
```

---

## Usage

### 1. Server-Side (API Routes)

```typescript
import { fetchPatientWithContext } from '@/lib/ai/patient-data-fetcher';
import { formatPatientContextForSOAP } from '@/lib/ai/patient-context-formatter';

// In your API route
const patient = await fetchPatientWithContext(patientId);
const context = formatPatientContextForSOAP(patient, "Patient reports chest pain");

// Use context with AI model
const soapNote = await generateSOAPNote(context);
```

### 2. Client-Side (React Components)

```typescript
import { usePatientContextForSOAP } from '@/hooks/usePatientContext';

function SOAPNoteEditor({ patientId, chiefComplaint }) {
  const { context, loading, error } = usePatientContextForSOAP(patientId, chiefComplaint);

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;

  // Use context to generate SOAP note
  return <Editor initialContext={context} />;
}
```

### 3. API Endpoint

**GET** `/api/ai/patient-context`

**Query Parameters:**
- `patientId` (required) - Patient ID
- `format` (optional) - Output format: `full` | `soap` | `scribe` | `summary`
- `chiefComplaint` (required for SOAP) - Main complaint
- `appointmentReason` (required for scribe) - Appointment reason

**Examples:**

```bash
# Full patient context
GET /api/ai/patient-context?patientId=abc123&format=full

# SOAP note context
GET /api/ai/patient-context?patientId=abc123&format=soap&chiefComplaint=Chest+pain

# Clinical scribe context
GET /api/ai/patient-context?patientId=abc123&format=scribe&appointmentReason=Annual+physical

# Quick summary
GET /api/ai/patient-context?patientId=abc123&format=summary
```

---

## Context Formats

### 1. Full Context (`format=full`)

Complete patient information with all sections.

**Output Structure:**
```markdown
# Patient Context

**Patient Demographics:**
- Name: John Doe
- Age: 45 years old
- Gender: Male
- Date of Birth: 01/15/1980
- MRN: PT-1234-5678-ABCD
- Contact: 555-1234, john@example.com

**Medical History:**
1. Type 2 Diabetes Mellitus
2. Hypertension
3. Hyperlipidemia

**Current Medications:**
1. Metformin 500mg - twice daily with meals, oral
2. Lisinopril 10mg - once daily, oral
3. Atorvastatin 20mg - once daily at bedtime, oral

**Known Allergies:**
Penicillin - Rash

**Recent Visits:**
1. 10/05/2025 - Follow-up for chronic condition management
2. 09/12/2025 - Blood pressure check
3. 08/20/2025 - Annual physical examination
```

### 2. SOAP Note Context (`format=soap`)

Optimized for AI-powered SOAP note generation.

**Output:**
```markdown
# Clinical Context for SOAP Note

**Chief Complaint:** Chest pain

**Patient:** John Doe, 45yo Male

**Medical History:**
1. Type 2 Diabetes Mellitus
2. Hypertension
3. Hyperlipidemia

**Current Medications:**
1. Metformin 500mg - twice daily with meals
2. Lisinopril 10mg - once daily
3. Atorvastatin 20mg - once daily at bedtime

**Instructions:**
Generate a clinical SOAP note based on the patient's chief complaint and context provided above.
Include:
- Subjective: Patient's narrative and symptoms
- Objective: Relevant clinical findings and vital signs
- Assessment: Diagnosis with ICD-10 codes
- Plan: Treatment plan with procedures

Use medical terminology and maintain professional clinical documentation standards.
```

### 3. Clinical Scribe Context (`format=scribe`)

Optimized for real-time conversation transcription.

**Output:**
```markdown
# Clinical Scribe Context

**Today's Appointment:** Annual physical examination
**Patient:** John Doe, 45yo Male (MRN: PT-1234-5678-ABCD)

**Medical History:**
1. Type 2 Diabetes Mellitus
2. Hypertension
3. Hyperlipidemia

**Current Medications:**
1. Metformin 500mg - twice daily with meals
2. Lisinopril 10mg - once daily
3. Atorvastatin 20mg - once daily at bedtime

**Instructions:**
As a clinical scribe, transcribe the conversation between the clinician and patient.
Focus on:
- Chief complaint and history of present illness
- Review of systems
- Physical examination findings
- Clinical decision-making
- Treatment plan and follow-up

Format the output as structured clinical notes ready for EHR entry.
```

### 4. Summary Context (`format=summary`)

Brief one-line summary for quick reference.

**Output:**
```
John Doe, 45yo M | Meds: Metformin, Lisinopril, Atorvastatin
```

---

## React Hooks

### `usePatientContext`

General-purpose hook with full customization.

```typescript
const { context, loading, error, refetch } = usePatientContext({
  patientId: 'abc123',
  format: 'full',
  autoFetch: true,
});
```

### `usePatientContextForSOAP`

Specialized for SOAP notes.

```typescript
const { context, loading, error } = usePatientContextForSOAP(
  patientId,
  "Patient reports chest pain"
);
```

### `usePatientContextForScribe`

Specialized for clinical scribe.

```typescript
const { context, loading, error } = usePatientContextForScribe(
  patientId,
  "Annual physical examination"
);
```

### `usePatientSummary`

Quick patient summary.

```typescript
const { context, loading, error } = usePatientSummary(patientId);
```

---

## Database Queries

### Fetch Patient with Full Context

```typescript
import { fetchPatientWithContext } from '@/lib/ai/patient-data-fetcher';

const patient = await fetchPatientWithContext(patientId);
// Returns patient with:
// - Active medications
// - Last 10 appointments
// - Active consents
```

### Fetch by MRN

```typescript
import { fetchPatientByMRN } from '@/lib/ai/patient-data-fetcher';

const patient = await fetchPatientByMRN('PT-1234-5678-ABCD');
```

### Fetch for Appointment

```typescript
import { fetchPatientForAppointment } from '@/lib/ai/patient-data-fetcher';

const patient = await fetchPatientForAppointment(appointmentId);
```

### Search Patients

```typescript
import { searchPatientsWithContext } from '@/lib/ai/patient-data-fetcher';

const patients = await searchPatientsWithContext('John', 10);
```

---

## Integration Examples

### Example 1: SOAP Note Editor

```typescript
'use client';

import { useState } from 'react';
import { usePatientContextForSOAP } from '@/hooks/usePatientContext';

export default function SOAPNoteEditor({ patientId }: { patientId: string }) {
  const [chiefComplaint, setChiefComplaint] = useState('');
  const { context, loading } = usePatientContextForSOAP(patientId, chiefComplaint);

  const handleGenerate = async () => {
    // Send context to AI API
    const response = await fetch('/api/ai/generate-soap', {
      method: 'POST',
      body: JSON.stringify({ context }),
    });
    const soapNote = await response.json();
    // Display generated SOAP note
  };

  return (
    <div>
      <input
        type="text"
        value={chiefComplaint}
        onChange={(e) => setChiefComplaint(e.target.value)}
        placeholder="Chief complaint..."
      />
      <button onClick={handleGenerate} disabled={loading}>
        Generate SOAP Note
      </button>
    </div>
  );
}
```

### Example 2: Clinical Scribe

```typescript
'use client';

import { usePatientContextForScribe } from '@/hooks/usePatientContext';

export default function ClinicalScribe({ patientId, appointmentId }: Props) {
  const { context } = usePatientContextForScribe(
    patientId,
    "Follow-up visit"
  );

  const startRecording = async () => {
    // Start audio recording
    // Send audio + context to AI transcription service
    const transcription = await transcribeWithContext(audio, context);
  };

  return <RecordingInterface context={context} />;
}
```

---

## Best Practices

✅ **Always include context** when making AI requests
✅ **Use the appropriate format** for each use case
✅ **Cache context** when making multiple AI calls
✅ **Handle loading states** gracefully
✅ **Validate patient data** before formatting
✅ **Log context generation** for debugging
✅ **Respect HIPAA** - never log PHI to external services

---

## Performance Considerations

- **Database Queries:** Optimized with Prisma includes (single query)
- **Caching:** Context is generated on-demand, consider Redis for high-traffic
- **Data Size:** Contexts are typically 500-2000 characters
- **API Response Time:** ~100-300ms for full context

---

## Future Enhancements

- [ ] Add family history section
- [ ] Include lab results
- [ ] Add vital signs trends
- [ ] Support custom templates
- [ ] Multi-language context generation
- [ ] Context summarization for long histories

---

**Last Updated:** October 12, 2025
