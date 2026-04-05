# SOFTWARE ARCHITECTURE
**IEC 62304 Compliance - Software Lifecycle**

## 1. SYSTEM OVERVIEW
The HoliLabs platform is a modern, cloud-native web application designed for high availability, security, and interoperability. It acts as an EHR, AI Scribe, and CDS engine.

## 2. HIGH-LEVEL ARCHITECTURE
The system is composed of the following major tiers:
1. **Frontend (Client Tier):** Next.js React application, rendering UI for Clinicians and Patients.
2. **Backend (API/Server Tier):** Next.js API Routes / Node.js services handling business logic, authentication, and integration.
3. **Database Tier:** PostgreSQL relational database managed via Prisma ORM. Redis for caching and background queues.
4. **External Services:**
   - **AI/LLM Providers:** OpenAI, Anthropic, Deepgram (for Scribe and Auditor).
   - **Communication:** Twilio (SMS/MFA), Resend (Email).
   - **Storage:** S3-compatible object storage for audio and documents.

## 3. COMPONENT DIAGRAM & DATA FLOW

```
[ Web Browser ]  <---(HTTPS/TLS)--->  [ Next.js Web Server ]
                                          |        |
                                          |        +---(API calls)---> [ OpenAI / Anthropic / Deepgram ]
                                          |
                                    (Prisma ORM)
                                          |
                                 [ PostgreSQL DB ]
```

## 4. SECURITY ARCHITECTURE
- **Authentication:** JWT-based sessions, MFA via SMS/OTP.
- **Authorization:** Role-Based Access Control (RBAC) defining Admin, Clinician, Patient roles.
- **Data Protection:** Application-level encryption for sensitive fields before storage in PostgreSQL.

## 5. EXTERNAL INTERFACES
- **FHIR Gateway (Medplum):** (Future/Optional) Standardized export and import of healthcare data.
- **Blockchain/Web3:** (Future/Optional) Immutable anchoring of clinical state hashes.