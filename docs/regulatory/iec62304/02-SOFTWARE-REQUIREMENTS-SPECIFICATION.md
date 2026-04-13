# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
**IEC 62304 Compliance - Software Lifecycle**

## 1. INTRODUCTION
This document specifies the functional, non-functional, and performance requirements for the HoliLabs Clinical Intelligence Platform.

## 2. FUNCTIONAL REQUIREMENTS

### 2.1 Electronic Health Record (EHR / PEP)
- **REQ-PEP-01:** The system shall allow authorized clinicians to view, create, and edit patient demographics and clinical history.
- **REQ-PEP-02:** The system shall log all access to patient records for auditing purposes.
- **REQ-PEP-03:** The system shall support structured clinical notes (SOAP format).

### 2.2 Clinical Decision Support (CDS)
- **REQ-CDS-01:** The system shall analyze prescriptions against known patient allergies and provide a visual alert if a conflict is detected.
- **REQ-CDS-02:** The system shall present CDS alerts as *informative* only; the clinician must always have the ability to override or dismiss the alert.
- **REQ-CDS-03:** The system shall log when a CDS alert is triggered, dismissed, or accepted.

### 2.3 Electronic Prescribing
- **REQ-RX-01:** The system shall allow clinicians to select medications, dosages, and instructions.
- **REQ-RX-02:** The system shall require clinician authentication (PIN/Signature) to finalize a prescription.
- **REQ-RX-03:** The system shall generate prescriptions compliant with ICP-Brasil standards (where applicable).

### 2.4 AI Scribe & Auditing
- **REQ-AI-01:** The system shall record audio during clinical encounters (with explicit user activation).
- **REQ-AI-02:** The system shall transcribe audio to text using speech-to-text models (e.g., Deepgram/Whisper).
- **REQ-AI-03:** The system shall utilize an LLM (e.g., Anthropic/OpenAI) to summarize the transcription into a structured SOAP note.
- **REQ-AI-04:** The system shall mandate that a human clinician review, edit, and approve the AI-generated SOAP note before saving it to the permanent medical record.

### 2.5 Patient Portal
- **REQ-PORTAL-01:** The system shall allow patients to securely view their clinical summaries, prescriptions, and shared documents.

## 3. NON-FUNCTIONAL REQUIREMENTS
- **Security:** All PHI shall be encrypted at rest (AES-256) and in transit (TLS 1.2+).
- **Availability:** The system target SLA is 99.5% uptime.
- **Auditability:** Every database mutation on clinical data shall generate an immutable audit log entry.