/**
 * GET   /api/lab-orders/[id] — Fetch single lab order
 * PATCH /api/lab-orders/[id] — Update order status
 *
 * Status flow: DRAFT → SUBMITTED → RECEIVED_BY_LAB → IN_PROGRESS → RESULTS_READY → REVIEWED → COMPLETED
 *
 * CYRUS: organizationId scoping. RUTH: audit log on every status transition.
 *
 * @compliance LGPD Art. 37
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['RECEIVED_BY_LAB'],
  RECEIVED_BY_LAB: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESULTS_READY'],
  RESULTS_READY: ['REVIEWED'],
  REVIEWED: ['COMPLETED'],
};

const UpdateOrderSchema = z.object({
  status: z.enum([
    'DRAFT', 'SUBMITTED', 'RECEIVED_BY_LAB', 'IN_PROGRESS',
    'RESULTS_READY', 'REVIEWED', 'COMPLETED',
  ]),
  notes: z.string().max(500).optional(),
});

/* ── Helper: parse lab order from LabResult record ───────────── */

function parseLabOrder(lr: any) {
  const meta = JSON.parse(lr.notes ?? '{}');
  if (meta.type !== 'lab_order') return null;
  return {
    id: lr.id,
    patientId: lr.patientId,
    status: meta.orderStatus,
    priority: meta.priority,
    tests: meta.tests,
    clinicalIndication: meta.clinicalIndication,
    icd10Code: meta.icd10Code,
    labFacilityId: meta.labFacilityId,
    labFacilityName: meta.labFacilityName,
    specialInstructions: meta.specialInstructions,
    orderedBy: meta.orderedBy,
    orderedAt: meta.orderedAt,
    encounterId: meta.encounterId,
    results: meta.results,
    _raw: meta,
  };
}

/* ── GET: Single lab order ───────────────────────────────────── */

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? {});
    const orderId = params?.id;

    const lr = await prisma.labResult.findUnique({ where: { id: orderId } });

    if (!lr || !lr.testName?.startsWith('LAB_ORDER:')) {
      return NextResponse.json({ success: false, error: 'Lab order not found' }, { status: 404 });
    }

    // CYRUS: verify org scoping
    const patient = await prisma.patient.findUnique({
      where: { id: lr.patientId },
      select: { organizationId: true },
    });

    if (patient?.organizationId && patient.organizationId !== context.user.organizationId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const order = parseLabOrder(lr);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Invalid lab order record' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: order });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'], skipCsrf: true }
);

/* ── PATCH: Update order status ──────────────────────────────── */

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? {});
    const orderId = params?.id;
    const body = await request.json();
    const parsed = UpdateOrderSchema.safeParse(body);

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
    const currentStatus = meta.orderStatus;
    const newStatus = parsed.data.status;

    // Validate status transition
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status transition: ${currentStatus} → ${newStatus}. Allowed: ${allowed.join(', ')}`,
        },
        { status: 422 }
      );
    }

    // Update the stored metadata
    meta.orderStatus = newStatus;
    meta.statusHistory = meta.statusHistory ?? [];
    meta.statusHistory.push({
      from: currentStatus,
      to: newStatus,
      at: new Date().toISOString(),
      by: context.user.id,
      notes: parsed.data.notes,
    });

    await prisma.labResult.update({
      where: { id: orderId },
      data: { notes: JSON.stringify(meta) },
    });

    // RUTH: audit log for status transition (LGPD Art. 37)
    await createAuditLog({
      action: 'UPDATE',
      resource: 'LabOrder',
      resourceId: orderId,
      details: {
        transition: `${currentStatus} → ${newStatus}`,
        patientId: lr.patientId,
        accessType: 'LAB_ORDER_STATUS_UPDATE',
      },
      success: true,
    });

    logger.info({
      event: 'lab_order_status_updated',
      orderId,
      from: currentStatus,
      to: newStatus,
    });

    return NextResponse.json({
      success: true,
      data: { id: orderId, status: newStatus, previousStatus: currentStatus },
    });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'], skipCsrf: true }
);
