# File Upload System

## Overview

Production-grade file upload system for patient documents with:
- ✅ **Drag-and-drop interface** with `react-dropzone`
- ✅ **AES-256-GCM encryption** for HIPAA compliance
- ✅ **Cloudflare R2 storage** (S3-compatible)
- ✅ **File deduplication** via SHA-256 hashing
- ✅ **Category management** (Lab Results, Imaging, Prescriptions, etc.)
- ✅ **Audit logging** for all uploads
- ✅ **Animated upload progress**

---

## Architecture

```
┌─────────────────┐
│  FileUploadZone │ (React Component)
└────────┬────────┘
         │
         ↓
┌──────────────────────┐
│ POST /api/upload/    │
│ patient-document     │
└────────┬─────────────┘
         │
         ├→ Validate file (type, size)
         ├→ Encrypt with AES-256-GCM
         ├→ Hash with SHA-256
         ├→ Upload to Cloudflare R2
         ├→ Save metadata to PostgreSQL
         └→ Create audit log
```

---

## Components

### 1. FileUploadZone Component

**Location:** `src/components/upload/FileUploadZone.tsx`

**Features:**
- Drag-and-drop file upload
- Category selector (Lab Results, Imaging, Prescriptions, Referrals, Insurance, Other)
- File type validation (PDF, Images, Word, Excel, Text)
- File size validation (50MB max)
- Real-time upload progress
- Animated success/error states
- Multiple file support

**Usage:**
```tsx
import FileUploadZone from '@/components/upload/FileUploadZone';

<FileUploadZone
  patientId="patient-123"
  onUploadComplete={(files) => console.log('Uploaded:', files)}
  onUploadError={(error) => console.error(error)}
  maxFiles={10}
  maxSizeBytes={50 * 1024 * 1024}
/>
```

### 2. DocumentList Component

**Location:** `src/components/upload/DocumentList.tsx`

**Features:**
- Grid layout of uploaded documents
- Category filtering
- File icons based on type
- Download button
- Delete button
- Responsive design
- Smooth animations with Framer Motion

**Usage:**
```tsx
import DocumentList from '@/components/upload/DocumentList';

<DocumentList
  patientId="patient-123"
  onDownload={(documentId) => downloadDocument(documentId)}
  onDelete={(documentId) => deleteDocument(documentId)}
/>
```

---

## Security

### Encryption (`src/lib/encryption.ts`)

**Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Size:** 256 bits
- **IV Length:** 128 bits (16 bytes)
- **Auth Tag Length:** 128 bits (16 bytes)

**Functions:**
```typescript
// Encrypt file buffer
encryptFile(buffer: Buffer): Buffer

// Decrypt file buffer
decryptFile(encryptedBuffer: Buffer): Buffer

// Generate SHA-256 hash
hashFile(buffer: Buffer): string

// Generate unique file ID
generateFileId(): string

// Sanitize filename
sanitizeFilename(filename: string): string

// Validate file type
isAllowedFileType(filename: string): boolean

// Validate file size
isAllowedFileSize(sizeBytes: number, maxSizeMB: number): boolean
```

**Environment Variables:**
```bash
FILE_ENCRYPTION_KEY=your-secret-key-here  # 256-bit key
```

---

## Cloud Storage

### Cloudflare R2 (`src/lib/storage/r2-client.ts`)

**Storage Structure:**
```
patients/{patientId}/{year}/{month}/{fileId}.{ext}

Example:
patients/abc123/2025/10/file_a1b2c3d4.pdf
```

**Functions:**
```typescript
// Upload encrypted file
uploadToR2(key: string, buffer: Buffer, contentType: string, metadata?: Record<string, string>): Promise<string>

// Download encrypted file
downloadFromR2(key: string): Promise<Buffer>

// Delete file
deleteFromR2(key: string): Promise<void>

// Generate pre-signed URL (temporary download)
generatePresignedUrl(key: string, expiresIn?: number): Promise<string>

// Generate storage key
generateStorageKey(patientId: string, fileId: string, extension: string): string
```

**Environment Variables:**
```bash
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=patient-documents
```

---

## API Endpoints

### Upload Document

**POST** `/api/upload/patient-document`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (required) - File to upload
- `patientId` (required) - Patient ID
- `category` (optional) - Document category (default: "other")
- `description` (optional) - Document description

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "doc_abc123",
    "name": "lab_results.pdf",
    "size": 1048576,
    "type": "pdf",
    "category": "lab_results",
    "uploadedAt": "2025-10-12T12:00:00Z"
  }
}
```

**Error Responses:**
```json
// 400 - Invalid file type
{
  "error": "File type not allowed. Supported: PDF, Images, Word, Excel, Text"
}

// 400 - File too large
{
  "error": "File size exceeds 50MB limit"
}

// 404 - Patient not found
{
  "error": "Patient not found"
}

// 409 - Duplicate file
{
  "error": "This file has already been uploaded for this patient"
}
```

### Get Patient Documents

**GET** `/api/patients/{patientId}/documents`

**Query Parameters:**
- `category` (optional) - Filter by category
- `limit` (optional) - Number of documents to return (default: 50)

**Response:**
```json
{
  "documents": [
    {
      "id": "doc_abc123",
      "fileName": "lab_results.pdf",
      "fileType": "pdf",
      "fileSize": 1048576,
      "documentType": "LAB_RESULT",
      "uploadedAt": "2025-10-12T12:00:00Z",
      "status": "READY",
      "tags": ["lab_results"]
    }
  ],
  "total": 10
}
```

---

## File Categories

| Category | Icon | Database Value | Use Case |
|----------|------|----------------|----------|
| Lab Results | 🔬 | `LAB_RESULT` | Blood work, urinalysis, etc. |
| Imaging/X-Rays | 🩻 | `IMAGING` | X-rays, MRI, CT scans |
| Prescriptions | 💊 | `PRESCRIPTION` | Medication orders |
| Referrals | 📋 | `REFERRAL` | Specialist referrals |
| Insurance | 🏥 | `INSURANCE` | Insurance cards, authorization |
| Other Documents | 📄 | `OTHER` | Miscellaneous documents |

---

## Database Schema

**Document Model:**
```prisma
model Document {
  id                String      @id @default(cuid())
  patientId         String
  patient           Patient     @relation(fields: [patientId], references: [id])

  // File details
  fileName          String
  fileType          String
  fileSize          Int

  // Security
  documentHash      String      @unique  // SHA-256 hash
  storageUrl        String      @db.Text // R2 storage key

  // Classification
  documentType      DocumentType
  tags              String[]

  // Status
  status            String      // PROCESSING, READY, ERROR
  uploadedBy        String
  uploadedAt        DateTime    @default(now())

  // Metadata
  metadata          Json?
}
```

---

## Workflow

### Upload Flow

1. **User selects files** via drag-and-drop or file browser
2. **Client validates** file type and size
3. **File sent to API** via FormData
4. **Server validates** inputs and checks patient exists
5. **File read into buffer** and hashed with SHA-256
6. **Deduplication check** - skip if already uploaded
7. **Encryption** with AES-256-GCM
8. **Upload to R2** with metadata
9. **Save record to database** with storage key
10. **Create audit log** for compliance
11. **Return success response** to client

### Download Flow

1. **User clicks download** button
2. **API authenticates** user and checks permissions
3. **Fetch document record** from database
4. **Download encrypted file** from R2
5. **Decrypt file** with AES-256-GCM
6. **Stream to user** with proper content-type

---

## Security Best Practices

✅ **Encryption at Rest** - All files encrypted with AES-256-GCM
✅ **Encryption in Transit** - HTTPS only
✅ **Access Control** - Per-patient document access
✅ **Audit Logging** - All uploads/downloads logged
✅ **File Validation** - Type and size restrictions
✅ **Deduplication** - Prevent duplicate uploads
✅ **Secure Deletion** - Remove from R2 and database
✅ **HIPAA Compliance** - Encrypted storage, audit trails
✅ **No PHI in Logs** - Patient data never logged

---

## Performance

- **Upload Speed:** ~5-10 MB/s (depends on connection)
- **Encryption Overhead:** ~50-100ms for 10MB file
- **Storage Cost:** ~$0.015/GB/month (R2 pricing)
- **Max File Size:** 50MB (configurable)
- **Concurrent Uploads:** 10 files (configurable)

---

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm add react-dropzone @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Configure Environment Variables

Create `.env.local`:
```bash
# File Encryption
FILE_ENCRYPTION_KEY=your-256-bit-secret-key

# Cloudflare R2
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=patient-documents
```

### 3. Create R2 Bucket

```bash
# Using Wrangler CLI
wrangler r2 bucket create patient-documents

# Set CORS if needed
wrangler r2 bucket cors put patient-documents --config cors.json
```

### 4. Use Components

```tsx
import FileUploadZone from '@/components/upload/FileUploadZone';
import DocumentList from '@/components/upload/DocumentList';

function PatientDocuments({ patientId }: { patientId: string }) {
  return (
    <div>
      <h2>Upload Documents</h2>
      <FileUploadZone
        patientId={patientId}
        onUploadComplete={() => alert('Uploaded!')}
      />

      <h2>Existing Documents</h2>
      <DocumentList patientId={patientId} />
    </div>
  );
}
```

---

## Future Enhancements

- [ ] OCR for scanned documents
- [ ] PDF preview in browser
- [ ] Image compression
- [ ] Batch download (ZIP)
- [ ] Document versioning
- [ ] Automatic categorization with AI
- [ ] Virus scanning
- [ ] E-signature on upload
- [ ] Document expiration dates

---

**Last Updated:** October 12, 2025
**Status:** ✅ Production Ready
