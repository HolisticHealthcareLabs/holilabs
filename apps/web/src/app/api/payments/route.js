"use strict";
/**
 * Payments API
 * HIPAA-compliant payment processing and management
 *
 * GET /api/payments - List payments for a patient
 * POST /api/payments - Create new payment (process payment)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
const crypto_1 = __importDefault(require("crypto"));
exports.dynamic = 'force-dynamic';
/**
 * Generate unique payment number
 * Format: PAY-YYYY-NNNN (e.g., PAY-2025-0001)
 */
async function generatePaymentNumber() {
    const year = new Date().getFullYear();
    const prefix = `PAY-${year}-`;
    // Get the latest payment for this year
    const latestPayment = await prisma_1.prisma.payment.findFirst({
        where: {
            paymentNumber: {
                startsWith: prefix,
            },
        },
        orderBy: {
            paymentNumber: 'desc',
        },
    });
    let nextNumber = 1;
    if (latestPayment) {
        const currentNumber = parseInt(latestPayment.paymentNumber.split('-')[2]);
        nextNumber = currentNumber + 1;
    }
    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}
/**
 * GET /api/payments
 * List payments for a patient
 * Query params: patientId (required), invoiceId, status, paymentMethod
 */
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('patientId');
        const invoiceId = searchParams.get('invoiceId');
        const status = searchParams.get('status');
        const paymentMethod = searchParams.get('paymentMethod');
        if (!patientId) {
            return server_1.NextResponse.json({ error: 'patientId query parameter is required' }, { status: 400 });
        }
        // Build filter
        const where = { patientId };
        if (invoiceId) {
            where.invoiceId = invoiceId;
        }
        if (status) {
            where.status = status;
        }
        if (paymentMethod) {
            where.paymentMethod = paymentMethod;
        }
        // Fetch payments
        const payments = await prisma_1.prisma.payment.findMany({
            where,
            include: {
                invoice: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        totalAmount: true,
                        status: true,
                    },
                },
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        mrn: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return server_1.NextResponse.json({
            success: true,
            data: payments,
        });
    }
    catch (error) {
        console.error('Error fetching payments:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch payments', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
});
/**
 * POST /api/payments
 * Create new payment (process payment)
 * NOTE: This is a simplified version. In production, integrate with Stripe API
 */
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const body = await request.json();
        const { patientId, invoiceId, amount, currency = 'MXN', paymentMethod = 'CARD', referenceId, notes, 
        // Card information (for Stripe)
        cardBrand, cardLast4, cardExpMonth, cardExpYear, 
        // Bank transfer information
        bankName, bankAccountLast4, bankTransferDate, bankTransactionId, 
        // Insurance information
        insuranceProvider, insurancePolicyId, insuranceClaimId, 
        // Cash information
        receiptNumber, 
        // Stripe integration fields
        stripePaymentIntentId, stripeChargeId, stripeCustomerId, } = body;
        // Validate required fields
        if (!patientId || !amount || amount <= 0) {
            return server_1.NextResponse.json({ error: 'Missing required fields: patientId, amount (must be > 0)' }, { status: 400 });
        }
        // If invoiceId provided, validate invoice exists and is payable
        let invoice = null;
        if (invoiceId) {
            invoice = await prisma_1.prisma.invoice.findUnique({
                where: { id: invoiceId },
                include: {
                    payments: {
                        where: { status: 'COMPLETED' },
                    },
                },
            });
            if (!invoice) {
                return server_1.NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
            }
            // Check if invoice is already paid
            if (invoice.status === 'PAID') {
                return server_1.NextResponse.json({ error: 'Invoice is already fully paid' }, { status: 400 });
            }
            // Check if invoice is void
            if (invoice.status === 'VOID') {
                return server_1.NextResponse.json({ error: 'Cannot pay voided invoice' }, { status: 400 });
            }
            // Calculate remaining amount
            const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
            const amountDue = invoice.totalAmount - totalPaid;
            if (amount > amountDue) {
                return server_1.NextResponse.json({
                    error: `Payment amount (${amount}) exceeds amount due (${amountDue})`,
                }, { status: 400 });
            }
        }
        // Generate payment number
        const paymentNumber = await generatePaymentNumber();
        // Calculate hash for blockchain integrity
        const paymentData = JSON.stringify({
            paymentNumber,
            patientId,
            invoiceId,
            amount,
            paymentMethod,
        });
        const paymentHash = crypto_1.default
            .createHash('sha256')
            .update(paymentData)
            .digest('hex');
        // Create payment in a transaction
        const payment = await prisma_1.prisma.$transaction(async (tx) => {
            const newPayment = await tx.payment.create({
                data: {
                    paymentNumber,
                    patientId,
                    invoiceId,
                    amount,
                    currency,
                    paymentMethod,
                    status: 'COMPLETED', // In production, this would be PENDING until Stripe confirms
                    referenceId,
                    notes,
                    // Card info
                    cardBrand,
                    cardLast4,
                    cardExpMonth,
                    cardExpYear,
                    // Bank transfer
                    bankName,
                    bankAccountLast4,
                    bankTransferDate: bankTransferDate
                        ? new Date(bankTransferDate)
                        : null,
                    bankTransactionId,
                    // Insurance
                    insuranceProvider,
                    insurancePolicyId,
                    insuranceClaimId,
                    // Cash
                    receiptNumber,
                    // Stripe
                    stripePaymentIntentId,
                    stripeChargeId,
                    stripeCustomerId,
                    // Processing info
                    processedAt: new Date(),
                    processedBy: context.user.id,
                    // Metadata
                    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown',
                },
            });
            // Update invoice if applicable
            if (invoiceId && invoice) {
                const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
                const newTotalPaid = totalPaid + amount;
                const amountDue = invoice.totalAmount - newTotalPaid;
                let newStatus = invoice.status;
                if (amountDue === 0) {
                    newStatus = 'PAID';
                }
                else if (newTotalPaid > 0 && amountDue > 0) {
                    newStatus = 'PARTIALLY_PAID';
                }
                await tx.invoice.update({
                    where: { id: invoiceId },
                    data: {
                        status: newStatus,
                        paidDate: amountDue === 0 ? new Date() : null,
                        paidBy: amountDue === 0 ? context.user.id : null,
                    },
                });
            }
            return newPayment;
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: context.user.id,
                userEmail: context.user.email || 'unknown',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'CREATE',
                resource: 'Payment',
                resourceId: payment.id,
                details: {
                    patientId,
                    invoiceId,
                    amount,
                    paymentMethod,
                    paymentNumber,
                    paymentHash,
                },
                success: true,
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: payment,
            message: `Payment ${paymentNumber} processed successfully`,
        }, { status: 201 });
    }
    catch (error) {
        console.error('Error processing payment:', error);
        return server_1.NextResponse.json({ error: 'Failed to process payment', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
});
//# sourceMappingURL=route.js.map