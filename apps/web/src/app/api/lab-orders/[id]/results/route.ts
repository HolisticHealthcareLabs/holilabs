/**
 * POST /api/lab-orders/[id]/results — Attach lab results to an order
 *
 * Typically called by a lab integration webhook or manually by staff.
 *
 * ELENA: results MUST include sourceAuthority and citationUrl provenance.
 * CYRUS: protected route, org scoped.
 * RUTH:  audit log on result attachment (LGPD Art. 37).
 *
 * @compliance HIPAA, LGPD Art. 37
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const ResultItemSchema = z.object({
  loincCode: z.string().min(1),
  testName: z.string().min(1),
  value: z.number(),
  unit: z.string(),
  refMin: z.number(),
  refMax: z.number(),
  interpretation: z.enum(['NORMAL', 'LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH']).optional(),
  notes: z.string().optional(),
});

const AttachResultsSchema = z.object({
  results: z.array(ResultItemSchema).min(1),
  sourceAuthority: z.string().min(1, 'ELENA: sourceAuthority is required'),
  citationUrl: z.string().url().optional(),
  labReportId: z.string().optional(),
  resultDate: z.string().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? {});
    const orderId = params?.id;
    const body = await request.json();
    const parsed = AttachResultsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const lr = await prisma.labResult.findUnique({ where: { id: orderId } });

    if (!lr || !lr.testName?.startsWith('LAB_ORDER:')) {
      return NextResponse.json({ success: false, error: 'Lab order not found' }, { status: 404 });
    }

    // CYRUS: org scoping
    const patient = await prisma.patient.findUnique({
      where: { id: lr.patientId },
      select: { organizationId: true },
    });

    if (patient?.organizationId && patient.organizationId !== context.user.organizationId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const meta = JSON.parse(lr.notes ?? '{}');

    // Attach results with provenance (ELENA invariant)
    meta.results = {
      items: parsed.data.results.map((r) => ({
        ...r,
        isAbnormal: r.value < r.refMin || r.value > r.refMax,
        isCritical: r.interpretation?.startsWith('CRITICAL') ?? false,
      })),
      sourceAuthority: parsed.data.sourceAuthority,
      citationUrl: parsed.data.citationUrl,
      labReportId: parsed.data.labReportId,
      receivedAt: new Date().toISOString(),
      resultDate: parsed.data.resultDate ?? new Date().toISOString(),
    };

    // Auto-advance status to RESULTS_READY if currently IN_PROGRESS
    if (meta.orderStatus === 'IN_PROGRESS') {
      meta.statusHistory = meta.statusHistory ?? [];
      meta.statusHistory.push({
        from: 'IN_PROGRESS',
        to: 'RESULTS_READY',
        at: new Date().toISOString(),
        by: context.user.id,
        notes: 'Auto-advanced on results attachment',
      });
      meta.orderStatus = 'RESULTS_READY';
    }

    await prisma.labResult.update({
      where: { id: orderId },
      data: {
        notes: JSON.stringify(meta),
        status: 'FINAL',
        resultAt: new Date(),
      },
    });

    // RUTH: audit log (LGPD Art. 37)
    await createAuditLog({
      action: 'UPDATE',
      resource: 'LabOrder',
      resourceId: orderId,
      details: {
        action: 'results_attached',
        resultCount: parsed.data.results.length,
        sourceAuthority: parsed.data.sourceAuthority,
        patientId: lr.patientId,
        accessType: 'LAB_RESULTS_ATTACH',
      },
      success: true,
    });

    logger.info({
      event: 'lab_results_attached',
      orderId,
      resultCount: parsed.data.results.length,
      sourceAuthority: parsed.data.sourceAuthority,
    });

    const abnormalCount = meta.results.items.filter((r: any) => r.isAbnormal).length;
    const criticalCount = meta.results.items.filter((r: any) => r.isCritical).length;

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId,
          status: meta.orderStatus,
          resultCount: parsed.data.results.length,
          abnormalCount,
          criticalCount,
        },
      },
      { status: 201 }
    );
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'], skipCsrf: true }
);
