/**
 * Payment Detail API
 *
 * GET /api/payments/[id] - Get single payment with full details
 * PATCH /api/payments/[id] - Update payment (refund, update status)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/[id]
 * Get single payment with full details
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const paymentId = context.params.id;

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
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
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              description: true,
              totalAmount: true,
              status: true,
              issueDate: true,
              dueDate: true,
            },
          },
        },
      });

      if (!payment) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: payment,
      });
    } catch (error: any) {
      console.error('Error fetching payment:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment', message: error.message },
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
 * PATCH /api/payments/[id]
 * Update payment - refund, update status, update metadata
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const paymentId = context.params.id;
      const body = await request.json();

      // Check if payment exists
      const existing = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          invoice: true,
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        );
      }

      // Can't modify already refunded payments
      if (
        existing.status === 'REFUNDED' ||
        existing.status === 'PARTIALLY_REFUNDED'
      ) {
        if (!body.allowModifyRefunded) {
          return NextResponse.json(
            {
              error: `Cannot modify payment with status: ${existing.status}`,
            },
            { status: 400 }
          );
        }
      }

      const {
        status,
        refund,
        refundAmount,
        refundReason,
        notes,
        receiptUrl,
        failureReason,
        failureCode,
      } = body;

      // Prepare update data
      const updateData: any = {};

      // Handle refund
      if (refund === true) {
        if (existing.status !== 'COMPLETED') {
          return NextResponse.json(
            { error: 'Only completed payments can be refunded' },
            { status: 400 }
          );
        }

        const refundAmountValue = refundAmount || existing.amount;

        if (refundAmountValue > existing.amount) {
          return NextResponse.json(
            { error: 'Refund amount cannot exceed payment amount' },
            { status: 400 }
          );
        }

        updateData.refundedAt = new Date();
        updateData.refundedAmount = refundAmountValue;
        updateData.refundReason = refundReason || 'Refunded by user';
        updateData.refundedBy = context.user.id;

        // Set status based on refund amount
        if (refundAmountValue === existing.amount) {
          updateData.status = 'REFUNDED';
        } else {
          updateData.status = 'PARTIALLY_REFUNDED';
        }
      }

      // Update status directly if provided
      if (status && status !== existing.status) {
        updateData.status = status;
      }

      // Update notes
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      // Update receipt URL
      if (receiptUrl !== undefined) {
        updateData.receiptUrl = receiptUrl;
        if (receiptUrl && !existing.receiptSentAt) {
          updateData.receiptSentAt = new Date();
        }
      }

      // Mark as failed
      if (status === 'FAILED' || failureReason || failureCode) {
        updateData.status = 'FAILED';
        updateData.failedAt = new Date();
        if (failureReason) updateData.failureReason = failureReason;
        if (failureCode) updateData.failureCode = failureCode;
      }

      // Update payment in a transaction
      const updatedPayment = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.update({
          where: { id: paymentId },
          data: updateData,
          include: {
            invoice: true,
          },
        });

        // If refunded, update invoice status
        if (refund && payment.invoiceId) {
          const invoice = await tx.invoice.findUnique({
            where: { id: payment.invoiceId },
            include: {
              payments: {
                where: {
                  status: {
                    in: ['COMPLETED', 'PARTIALLY_REFUNDED'],
                  },
                },
              },
            },
          });

          if (invoice) {
            // Recalculate total paid
            const totalPaid = invoice.payments.reduce((sum, p) => {
              if (p.id === paymentId) {
                // This payment
                if (updateData.status === 'REFUNDED') {
                  return sum; // Don't count refunded payment
                } else if (updateData.status === 'PARTIALLY_REFUNDED') {
                  return sum + (p.amount - (updateData.refundedAmount || 0));
                }
              }
              return sum + p.amount;
            }, 0);

            const amountDue = invoice.totalAmount - totalPaid;

            let newStatus = invoice.status;
            if (amountDue === invoice.totalAmount) {
              newStatus = 'PENDING'; // Fully refunded
            } else if (amountDue > 0 && totalPaid > 0) {
              newStatus = 'PARTIALLY_PAID';
            } else if (amountDue === 0) {
              newStatus = 'PAID';
            }

            await tx.invoice.update({
              where: { id: payment.invoiceId },
              data: {
                status: newStatus,
                paidDate: amountDue === 0 ? invoice.paidDate : null,
              },
            });
          }
        }

        return payment;
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: refund ? 'REVOKE' : 'UPDATE',
          resource: 'Payment',
          resourceId: paymentId,
          details: {
            changes: body,
            previousState: {
              status: existing.status,
              amount: existing.amount,
              refundedAmount: existing.refundedAmount,
            },
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedPayment,
        message: refund
          ? 'Payment refunded successfully'
          : 'Payment updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating payment:', error);
      return NextResponse.json(
        { error: 'Failed to update payment', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
  }
);
