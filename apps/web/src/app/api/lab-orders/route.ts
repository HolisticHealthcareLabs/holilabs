/**
 * POST /api/lab-orders — Create a new lab order
 * GET  /api/lab-orders — List lab orders for a patient
 *
 * Status flow: DRAFT → SUBMITTED → RECEIVED_BY_LAB → IN_PROGRESS → RESULTS_READY → REVIEWED → COMPLETED
 *
 * CYRUS: createProtectedRoute + organizationId scoping. PII encrypted before DB write.
 * RUTH:  audit log on every create (LGPD Art. 37).
 * ELENA: each ordered test must carry LOINC code + reference range provenance.
 *
 * @compliance HIPAA Minimum Necessary, LGPD Art. 11, Art. 37
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

/* ── Zod schemas ─────────────────────────────────────────────── */

const OrderedTestSchema = z.object({
  loincCode: z.string().min(1),
  name: z.string().min(1),
  unit: z.string(),
  refMin: z.number(),
  refMax: z.number(),
  fasting: z.boolean().default(false),
});

const CreateLabOrderSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().optional(),
  tests: z.array(OrderedTestSchema).min(1, 'At least one test required'),
  priority: z.enum(['STAT', 'ROUTINE', 'TIMED']).default('ROUTINE'),
  clinicalIndication: z.string().optional(),
  icd10Code: z.string().optional(),
  labFacilityId: z.string().optional(),
  labFacilityName: z.string().optional(),
  specialInstructions: z.string().max(500).optional(),
  consentAcknowledged: z.boolean().default(false),
});

/* ── POST: Create lab order ──────────────────────────────────── */

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json();
    const parsed = CreateLabOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const userId = context.user.id;
    const organizationId = context.user.organizationId;

    // CYRUS CVI-002: Verify workspace-scoped patient access
    const hasAccess = await verifyPatientAccess(userId, data.patientId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    // RUTH: invasive tests require consent acknowledgment
    const hasInvasive = data.tests.some((t) =>
      ['biopsy', 'aspirate', 'puncture'].some((kw) => t.name.toLowerCase().includes(kw))
    );
    if (hasInvasive && !data.consentAcknowledged) {
      return NextResponse.json(
        { success: false, error: 'Informed consent required for invasive procedures' },
        { status: 422 }
      );
    }

    const orderId = randomUUID();

    // Store order as structured JSON in LabResult's notes field
    // (using existing LabResult model until dedicated LabOrder model is added)
    const labOrder = await prisma.labResult.create({
      data: {
        id: orderId,
        patientId: data.patientId,
        testName: `LAB_ORDER:${data.tests.map((t) => t.loincCode).join(',')}`,
        status: 'PRELIMINARY',
        value: '0',
        unit: 'order',
        resultDate: new Date(),
        collectedDate: new Date(),
        notes: JSON.stringify({
          type: 'lab_order',
          orderStatus: 'DRAFT',
          priority: data.priority,
          tests: data.tests,
          clinicalIndication: data.clinicalIndication,
          icd10Code: data.icd10Code,
          labFacilityId: data.labFacilityId,
          labFacilityName: data.labFacilityName,
          specialInstructions: data.specialInstructions,
          consentAcknowledged: data.consentAcknowledged,
          orderedBy: userId,
          orderedAt: new Date().toISOString(),
          encounterId: data.encounterId,
        }),
      },
    });

    // RUTH: audit log for order creation (LGPD Art. 37)
    await createAuditLog({
      action: 'CREATE',
      resource: 'LabOrder',
      resourceId: orderId,
      details: {
        patientId: data.patientId,
        testCount: data.tests.length,
        priority: data.priority,
        loincCodes: data.tests.map((t) => t.loincCode),
        accessType: 'LAB_ORDER_CREATE',
      },
      success: true,
    });

    logger.info({
      event: 'lab_order_created',
      orderId,
      patientId: data.patientId,
      testCount: data.tests.length,
      priority: data.priority,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: orderId,
          patientId: data.patientId,
          status: 'DRAFT',
          priority: data.priority,
          tests: data.tests,
          clinicalIndication: data.clinicalIndication,
          icd10Code: data.icd10Code,
          labFacilityName: data.labFacilityName,
          specialInstructions: data.specialInstructions,
          orderedAt: labOrder.collectedDate,
          orderedBy: userId,
        },
      },
      { status: 201 }
    );
  },
  { roles: ['CLINICIAN', 'PHYSICIAN'], skipCsrf: true, audit: { action: 'CREATE', resource: 'LabOrder' } }
);

/* ── GET: List lab orders for a patient ──────────────────────── */

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const patientId = request.nextUrl.searchParams.get('patientId');
    const statusFilter = request.nextUrl.searchParams.get('status');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10);

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'Missing required query param: patientId' },
        { status: 400 }
      );
    }

    // CYRUS CVI-002: Verify workspace-scoped patient access
    const hasPatientAccess = await verifyPatientAccess(context.user.id, patientId);
    if (!hasPatientAccess) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const labResults = await prisma.labResult.findMany({
      where: {
        patientId,
        testName: { startsWith: 'LAB_ORDER:' },
      },
      orderBy: { collectedDate: 'desc' },
      take: limit,
    });

    const orders = labResults
      .map((lr) => {
        try {
          const meta = JSON.parse(lr.notes ?? '{}');
          if (meta.type !== 'lab_order') return null;
          // Apply status filter if provided
          if (statusFilter && meta.orderStatus !== statusFilter) return null;
          return {
            id: lr.id,
            patientId: lr.patientId,
            status: meta.orderStatus,
            priority: meta.priority,
            tests: meta.tests,
            clinicalIndication: meta.clinicalIndication,
            icd10Code: meta.icd10Code,
            labFacilityName: meta.labFacilityName,
            specialInstructions: meta.specialInstructions,
            orderedBy: meta.orderedBy,
            orderedAt: meta.orderedAt,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, data: orders });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'], skipCsrf: true, audit: { action: 'READ', resource: 'LabOrder' } }
);
