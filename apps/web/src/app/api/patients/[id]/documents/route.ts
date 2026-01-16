import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function decodeDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) throw new Error('Invalid dataUrl (expected data:<mime>;base64,...)');
  const mime = match[1];
  const b64 = match[2];
  return { mime, buffer: Buffer.from(b64, 'base64') };
}

export const GET = createProtectedRoute(
  async (_req: NextRequest, context: any) => {
    const patientId = context.params?.id as string | undefined;
    if (!patientId) return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, assignedClinicianId: context.user.id },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found or access denied' }, { status: 404 });
    }

    const docs = await prisma.document.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        storageUrl: true,
        documentType: true,
        processingStatus: true,
        createdAt: true,
        uploadedBy: true,
      },
    });

    return NextResponse.json({ success: true, data: docs }, { status: 200 });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    skipCsrf: true,
    audit: { action: 'READ', resource: 'Document' },
  }
);

export const POST = createProtectedRoute(
  async (req: NextRequest, context: any) => {
    const patientId = context.params?.id as string | undefined;
    if (!patientId) return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, assignedClinicianId: context.user.id },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found or access denied' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { fileName, fileType, fileSize, dataUrl, documentType } = body || {};

    if (!fileName || !fileType || !fileSize || !dataUrl || !documentType) {
      return NextResponse.json({ error: 'fileName, fileType, fileSize, dataUrl, documentType are required' }, { status: 400 });
    }

    // Hard safety limit (demo/prototype): 7MB decoded
    const decoded = decodeDataUrl(String(dataUrl));
    if (decoded.buffer.length > 7 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 7MB for prototype uploads)' }, { status: 413 });
    }

    // We want uploads to reliably appear under the *selected patient*.
    // A global content-hash "dedupe" breaks this UX (e.g., demo files uploaded for different patients),
    // because a reused hash would short-circuit without attaching to the new patient.
    //
    // So we store:
    // - `contentHash`: hash of raw bytes (kept in `deidentifiedHash` as a debug/audit-friendly fingerprint)
    // - `documentHash`: patient-scoped idempotency key (unique in schema)
    const contentHash = crypto.createHash('sha256').update(decoded.buffer).digest('hex');
    const documentHash = crypto
      .createHash('sha256')
      .update(`${contentHash}:${patientId}`)
      .digest('hex');

    const existing = await prisma.document.findUnique({
      where: { documentHash },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ success: true, data: { id: existing.id, deduped: true } }, { status: 200 });
    }

    const created = await prisma.document.create({
      data: {
        patientId,
        documentHash,
        // Not actually a "de-identified hash" here; we repurpose this optional field in dev as a stable
        // content fingerprint so clinicians can confirm the same file bytes across retries.
        deidentifiedHash: contentHash,
        fileName: String(fileName),
        fileType: String(fileType),
        fileSize: Number(fileSize),
        // DEV storage: embed as data URL so it's immediately viewable without S3/Supabase.
        // In production we’ll swap to object storage + signed URLs.
        storageUrl: String(dataUrl),
        originalStorageUrl: null,
        documentType,
        uploadedBy: context.user.id,
        processingStatus: 'SYNCHRONIZED',
        isDeidentified: false,
      },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        documentType: true,
        processingStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    skipCsrf: true,
    audit: { action: 'DOCUMENT_UPLOADED', resource: 'Document' },
  }
);


