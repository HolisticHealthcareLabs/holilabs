/**
 * Billing Invoices API
 *
 * GET  /api/billing/invoices — list invoices (paginated, filterable)
 * POST /api/billing/invoices — create a new invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const status = searchParams.get('status') || undefined;
    const patientId = searchParams.get('patientId') || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
          lineItems: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + invoices.length < total,
      },
    });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'], skipCsrf: true }
);

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json();
    const { patientId, description, currency, lineItems, notes, taxRate, discountPercent, dueDate, dueDays } = body;

    if (!patientId || !lineItems?.length) {
      return NextResponse.json(
        { error: 'patientId and at least one lineItem required' },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Generate invoice number: INV-YYYY-NNNN
    const year = new Date().getFullYear();
    const invoiceCount = await prisma.invoice.count({
      where: { invoiceNumber: { startsWith: `INV-${year}` } },
    });
    const invoiceNumber = `INV-${year}-${String(invoiceCount + 1).padStart(4, '0')}`;

    // Calculate totals from line items
    const rate = typeof taxRate === 'number' ? taxRate : 16.0;
    let subtotal = 0;
    const processedItems = lineItems.map((item: {
      description: string;
      itemType: string;
      itemId?: string;
      quantity?: number;
      unitPrice: number;
      taxable?: boolean;
      cptCode?: string;
      icd10Code?: string;
    }) => {
      const qty = item.quantity || 1;
      const total = qty * item.unitPrice;
      subtotal += total;
      return {
        description: item.description,
        itemType: item.itemType,
        itemId: item.itemId,
        quantity: qty,
        unitPrice: item.unitPrice,
        totalPrice: total,
        taxable: item.taxable !== false,
        cptCode: item.cptCode,
        icd10Code: item.icd10Code,
      };
    });

    const discountAmt = discountPercent ? Math.round(subtotal * (discountPercent / 100)) : 0;
    const taxableAmount = processedItems
      .filter((i: { taxable: boolean }) => i.taxable)
      .reduce((sum: number, i: { totalPrice: number }) => sum + i.totalPrice, 0);
    const taxAmount = Math.round((taxableAmount - discountAmt) * (rate / 100));
    const totalAmount = subtotal - discountAmt + taxAmount;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        patientId,
        description,
        notes,
        currency: currency || 'BRL',
        status: 'DRAFT',
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + (dueDays || 30) * 86400000),
        subtotal,
        taxAmount,
        taxRate: rate,
        discountAmount: discountAmt,
        discountPercent,
        totalAmount,
        issuedBy: context.user!.id,
        lineItems: {
          create: processedItems,
        },
      },
      include: {
        lineItems: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await createAuditLog({
      action: 'CREATE',
      resource: 'Invoice',
      resourceId: invoice.id,
      details: { invoiceNumber, patientId, totalAmount },
      success: true,
    });

    logger.info({
      event: 'invoice_created',
      invoiceId: invoice.id,
      invoiceNumber,
      totalAmount,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'] }
);
