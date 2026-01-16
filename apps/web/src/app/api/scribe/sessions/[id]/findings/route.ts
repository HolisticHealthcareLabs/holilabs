import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { emitCoPilotEvent } from '@/lib/socket-server';
import crypto from 'crypto';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const FindingsSchema = z.object({
  // Small, stable payload — safe for audit logs.
  chiefComplaint: z.string().trim().min(1).optional(),
  symptoms: z.array(z.string().trim().min(1)).max(50).optional(),
  diagnoses: z.array(z.string().trim().min(1)).max(50).optional(),
  entities: z
    .object({
      vitals: z.array(z.string()).optional(),
      symptoms: z.array(z.string()).optional(),
      diagnoses: z.array(z.string()).optional(),
      medications: z.array(z.string()).optional(),
      procedures: z.array(z.string()).optional(),
      anatomy: z.array(z.string()).optional(),
    })
    .partial()
    .optional(),
  // Client vs server signal. Server can overwrite later with a canonical extraction.
  source: z.enum(['client-heuristic', 'server']).default('client-heuristic'),
  timestamp: z.number().int().positive().optional(),
});

function getClientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

export const GET = createProtectedRoute(
  async (_req: NextRequest, context: any) => {
    const sessionId = context.params?.id as string | undefined;
    if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 });

    // Verify clinician owns this session
    const session = await prisma.scribeSession.findFirst({
      where: { id: sessionId, clinicianId: context.user.id },
      select: { id: true, patientId: true },
    });
    if (!session) return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });

    const logs = await prisma.auditLog.findMany({
      where: {
        resource: 'ScribeSessionFindings',
        resourceId: sessionId,
        userId: context.user.id,
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
      select: {
        id: true,
        timestamp: true,
        details: true,
        dataHash: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: logs.map((l) => ({
          id: l.id,
          timestamp: l.timestamp,
          dataHash: l.dataHash,
          findings: (l.details as any)?.findings || null,
          meta: (l.details as any)?.meta || null,
        })),
      },
      { status: 200 }
    );
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    skipCsrf: true,
    audit: { action: 'READ', resource: 'ScribeSessionFindings' },
  }
);

export const POST = createProtectedRoute(
  async (req: NextRequest, context: any) => {
    const sessionId = context.params?.id as string | undefined;
    if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const parsed = FindingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid findings payload', issues: parsed.error.flatten() }, { status: 400 });
    }

    // Verify clinician owns this session
    const session = await prisma.scribeSession.findFirst({
      where: { id: sessionId, clinicianId: context.user.id },
      select: { id: true, patientId: true },
    });
    if (!session) return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });

    const findings = parsed.data;
    const ts = findings.timestamp ? new Date(findings.timestamp) : new Date();

    // Hash payload for tamper-evident audit trail.
    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ sessionId, patientId: session.patientId, findings, ts: ts.toISOString() }))
      .digest('hex');

    const created = await prisma.auditLog.create({
      data: {
        userId: context.user.id,
        userEmail: context.user.email,
        ipAddress: getClientIp(req),
        userAgent: req.headers.get('user-agent') || undefined,
        action: 'UPDATE',
        resource: 'ScribeSessionFindings',
        resourceId: sessionId,
        accessReason: 'DIRECT_PATIENT_CARE',
        accessPurpose: 'LIVE_EXTRACTION',
        details: {
          findings,
          meta: {
            sessionId,
            patientId: session.patientId,
            clinicianId: context.user.id,
            recordedAt: ts.toISOString(),
          },
        },
        dataHash,
        success: true,
        timestamp: ts,
      },
      select: { id: true, timestamp: true },
    });

    // Emit to co-pilot session room (if socket server is active)
    emitCoPilotEvent(sessionId, 'co_pilot:findings_update', {
      id: created.id,
      timestamp: created.timestamp,
      patientId: session.patientId,
      findings,
      dataHash,
    });

    return NextResponse.json({ success: true, data: { id: created.id, timestamp: created.timestamp } }, { status: 201 });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    skipCsrf: true,
    audit: { action: 'UPDATE', resource: 'ScribeSessionFindings' },
  }
);


