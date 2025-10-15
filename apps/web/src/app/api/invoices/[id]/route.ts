/**
 * Invoice Detail API
 *
 * GET /api/invoices/[id] - Get single invoice with line items
 * PATCH /api/invoices/[id] - Update invoice (change status, add line items, mark paid)
 * DELETE /api/invoices/[id] - Void invoice (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Calculate invoice totals from line items
 */
function calculateInvoiceTotals(
  lineItems: Array<{ quantity: number; unitPrice: number; taxable: boolean }>,
  taxRate: number = 16.0,
  discountAmount: number = 0
) {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const taxableAmount = lineItems
    .filter((item) => item.taxable)
    .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const taxAmount = Math.round((taxableAmount * taxRate) / 100);
  const totalAmount = subtotal + taxAmount - discountAmount;

  return {
    subtotal,
    taxAmount,
    totalAmount,
  };
}

/**
 * GET /api/invoices/[id]
 * Get single invoice with full details
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const invoiceId = context.params.id;

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
              email: true,
              phone: true,
            },
          },
          lineItems: {
            orderBy: { createdAt: 'asc' },
          },
          payments: {
            orderBy: { processedAt: 'desc' },
          },
        },
      });

      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      // Compute derived fields
      const now = new Date();
      const isOverdue =
        invoice.dueDate < now &&
        invoice.status === 'PENDING' &&
        !invoice.paidDate;

      const totalPaid = invoice.payments
        .filter((p) => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + p.amount, 0);

      const amountDue = invoice.totalAmount - totalPaid;

      return NextResponse.json({
        success: true,
        data: {
          ...invoice,
          isOverdue,
          totalPaid,
          amountDue,
        },
      });
    } catch (error: any) {
      console.error('Error fetching invoice:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invoice', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
  }
);

/**
 * PATCH /api/invoices/[id]
 * Update invoice - change status, add line items, modify details, mark paid/void
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const invoiceId = context.params.id;
      const body = await request.json();

      // Check if invoice exists
      const existing = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          lineItems: true,
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      // Can't modify paid/voided invoices
      if (
        ['PAID', 'VOID', 'REFUNDED'].includes(existing.status) &&
        !body.allowModifyPaid
      ) {
        return NextResponse.json(
          {
            error: `Cannot modify invoice with status: ${existing.status}`,
          },
          { status: 400 }
        );
      }

      const {
        status,
        markPaid,
        markVoid,
        voidReason,
        addLineItems,
        description,
        notes,
        dueDate,
        discountAmount,
        discountPercent,
        taxRate,
        billingName,
        billingAddress,
        billingCity,
        billingState,
        billingPostalCode,
        rfc,
        fiscalAddress,
        taxRegime,
      } = body;

      // Prepare update data
      const updateData: any = {};

      // Handle status changes
      if (status && status !== existing.status) {
        updateData.status = status;
      }

      // Mark as paid
      if (markPaid === true && !existing.paidDate) {
        updateData.status = 'PAID';
        updateData.paidDate = new Date();
        updateData.paidBy = context.user.id;
      }

      // Mark as void
      if (markVoid === true && !existing.voidedDate) {
        updateData.status = 'VOID';
        updateData.voidedDate = new Date();
        updateData.voidReason = voidReason || 'Voided by user';
      }

      // Update basic fields
      if (description !== undefined) updateData.description = description;
      if (notes !== undefined) updateData.notes = notes;
      if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);

      // Update billing fields
      if (billingName !== undefined) updateData.billingName = billingName;
      if (billingAddress !== undefined)
        updateData.billingAddress = billingAddress;
      if (billingCity !== undefined) updateData.billingCity = billingCity;
      if (billingState !== undefined) updateData.billingState = billingState;
      if (billingPostalCode !== undefined)
        updateData.billingPostalCode = billingPostalCode;
      if (rfc !== undefined) updateData.rfc = rfc;
      if (fiscalAddress !== undefined) updateData.fiscalAddress = fiscalAddress;
      if (taxRegime !== undefined) updateData.taxRegime = taxRegime;

      // Handle line items addition (in transaction)
      let updatedInvoice;
      if (addLineItems && Array.isArray(addLineItems)) {
        updatedInvoice = await prisma.$transaction(async (tx) => {
          // Add new line items
          const newLineItems = await Promise.all(
            addLineItems.map((item: any) => {
              const totalPrice = item.quantity * item.unitPrice;
              return tx.invoiceLineItem.create({
                data: {
                  invoiceId,
                  description: item.description,
                  itemType: item.itemType,
                  itemId: item.itemId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice,
                  taxable: item.taxable ?? true,
                  cptCode: item.cptCode,
                  icd10Code: item.icd10Code,
                  hcpcsCode: item.hcpcsCode,
                  notes: item.notes,
                  performedBy: item.performedBy,
                  performedAt: item.performedAt
                    ? new Date(item.performedAt)
                    : null,
                },
              });
            })
          );

          // Recalculate totals
          const allLineItems = [...existing.lineItems, ...newLineItems];
          const totals = calculateInvoiceTotals(
            allLineItems,
            taxRate ?? existing.taxRate,
            discountAmount ?? existing.discountAmount
          );

          updateData.subtotal = totals.subtotal;
          updateData.taxAmount = totals.taxAmount;
          updateData.totalAmount = totals.totalAmount;
          if (taxRate !== undefined) updateData.taxRate = taxRate;
          if (discountAmount !== undefined)
            updateData.discountAmount = discountAmount;
          if (discountPercent !== undefined)
            updateData.discountPercent = discountPercent;

          // Update the invoice
          return await tx.invoice.update({
            where: { id: invoiceId },
            data: updateData,
            include: {
              lineItems: {
                orderBy: { createdAt: 'asc' },
              },
              payments: {
                orderBy: { processedAt: 'desc' },
              },
            },
          });
        });
      } else {
        // Update discount or tax rate if provided without new line items
        if (
          discountAmount !== undefined ||
          discountPercent !== undefined ||
          taxRate !== undefined
        ) {
          const totals = calculateInvoiceTotals(
            existing.lineItems,
            taxRate ?? existing.taxRate,
            discountAmount ?? existing.discountAmount
          );

          updateData.subtotal = totals.subtotal;
          updateData.taxAmount = totals.taxAmount;
          updateData.totalAmount = totals.totalAmount;
          if (taxRate !== undefined) updateData.taxRate = taxRate;
          if (discountAmount !== undefined)
            updateData.discountAmount = discountAmount;
          if (discountPercent !== undefined)
            updateData.discountPercent = discountPercent;
        }

        // Update the invoice
        updatedInvoice = await prisma.invoice.update({
          where: { id: invoiceId },
          data: updateData,
          include: {
            lineItems: {
              orderBy: { createdAt: 'asc' },
            },
            payments: {
              orderBy: { processedAt: 'desc' },
            },
          },
        });
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'UPDATE',
          resource: 'Invoice',
          resourceId: invoiceId,
          details: {
            changes: body,
            previousState: {
              status: existing.status,
              totalAmount: existing.totalAmount,
              paidDate: existing.paidDate,
              voidedDate: existing.voidedDate,
            },
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedInvoice,
        message: 'Invoice updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      return NextResponse.json(
        { error: 'Failed to update invoice', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
  }
);

/**
 * DELETE /api/invoices/[id]
 * Void invoice (soft delete)
 * Note: In production, prefer voiding invoices over deleting them for audit trail
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const invoiceId = context.params.id;

      // Check if invoice exists
      const existing = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          payments: true,
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      // Don't allow deletion if invoice has payments
      if (existing.payments.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot delete invoice with payments. Please void instead.',
            suggestion:
              'Use PATCH with markVoid=true to void this invoice while maintaining audit trail',
          },
          { status: 403 }
        );
      }

      // Don't allow deletion if already paid or voided
      if (['PAID', 'VOID', 'REFUNDED'].includes(existing.status)) {
        return NextResponse.json(
          {
            error: `Cannot delete invoice with status: ${existing.status}`,
          },
          { status: 403 }
        );
      }

      // Void the invoice (soft delete)
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'VOID',
          voidedDate: new Date(),
          voidReason: 'Deleted by user',
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'DELETE',
          resource: 'Invoice',
          resourceId: invoiceId,
          details: {
            voidedInvoice: {
              invoiceNumber: existing.invoiceNumber,
              patientId: existing.patientId,
              totalAmount: existing.totalAmount,
              status: existing.status,
            },
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Invoice voided successfully',
      });
    } catch (error: any) {
      console.error('Error voiding invoice:', error);
      return NextResponse.json(
        { error: 'Failed to void invoice', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  }
);
