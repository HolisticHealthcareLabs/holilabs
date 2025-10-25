"use strict";
/**
 * Invoices API
 * HIPAA-compliant invoice management for healthcare billing
 *
 * GET /api/invoices - List invoices for a patient
 * POST /api/invoices - Create new invoice with line items
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
 * Generate unique invoice number
 * Format: INV-YYYY-NNNN (e.g., INV-2025-0001)
 */
async function generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    // Get the latest invoice for this year
    const latestInvoice = await prisma_1.prisma.invoice.findFirst({
        where: {
            invoiceNumber: {
                startsWith: prefix,
            },
        },
        orderBy: {
            invoiceNumber: 'desc',
        },
    });
    let nextNumber = 1;
    if (latestInvoice) {
        const currentNumber = parseInt(latestInvoice.invoiceNumber.split('-')[2]);
        nextNumber = currentNumber + 1;
    }
    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}
/**
 * Calculate invoice totals
 */
function calculateInvoiceTotals(lineItems, taxRate = 16.0, discountAmount = 0) {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
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
 * GET /api/invoices
 * List invoices for a patient
 * Query params: patientId (required), status, dateFrom, dateTo
 */
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('patientId');
        const status = searchParams.get('status');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        if (!patientId) {
            return server_1.NextResponse.json({ error: 'patientId query parameter is required' }, { status: 400 });
        }
        // Build filter
        const where = { patientId };
        if (status) {
            where.status = status;
        }
        if (dateFrom || dateTo) {
            where.issueDate = {};
            if (dateFrom) {
                where.issueDate.gte = new Date(dateFrom);
            }
            if (dateTo) {
                where.issueDate.lte = new Date(dateTo);
            }
        }
        // Fetch invoices with line items
        const invoices = await prisma_1.prisma.invoice.findMany({
            where,
            include: {
                lineItems: {
                    orderBy: { createdAt: 'asc' },
                },
                payments: {
                    orderBy: { processedAt: 'desc' },
                },
            },
            orderBy: { issueDate: 'desc' },
        });
        // Compute derived fields
        const invoicesWithStatus = invoices.map((invoice) => {
            const now = new Date();
            const isOverdue = invoice.dueDate < now &&
                invoice.status === 'PENDING' &&
                !invoice.paidDate;
            const totalPaid = invoice.payments
                .filter((p) => p.status === 'COMPLETED')
                .reduce((sum, p) => sum + p.amount, 0);
            const amountDue = invoice.totalAmount - totalPaid;
            return {
                ...invoice,
                isOverdue,
                totalPaid,
                amountDue,
            };
        });
        return server_1.NextResponse.json({
            success: true,
            data: invoicesWithStatus,
        });
    }
    catch (error) {
        console.error('Error fetching invoices:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch invoices', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
});
/**
 * POST /api/invoices
 * Create new invoice with line items
 */
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const body = await request.json();
        const { patientId, description, notes, currency = 'MXN', taxRate = 16.0, discountAmount = 0, discountPercent, dueDate, billingName, billingAddress, billingCity, billingState, billingPostalCode, billingCountry = 'MX', rfc, fiscalAddress, taxRegime, lineItems = [], } = body;
        // Validate required fields
        if (!patientId || !dueDate || lineItems.length === 0) {
            return server_1.NextResponse.json({
                error: 'Missing required fields: patientId, dueDate, and at least one line item',
            }, { status: 400 });
        }
        // Validate line items
        for (const item of lineItems) {
            if (!item.description ||
                !item.itemType ||
                !item.quantity ||
                !item.unitPrice) {
                return server_1.NextResponse.json({
                    error: 'Each line item must have: description, itemType, quantity, unitPrice',
                }, { status: 400 });
            }
        }
        // Calculate totals
        const totals = calculateInvoiceTotals(lineItems, taxRate, discountAmount);
        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber();
        // Calculate hash for blockchain integrity
        const invoiceData = JSON.stringify({
            invoiceNumber,
            patientId,
            lineItems,
            totals,
        });
        const invoiceHash = crypto_1.default
            .createHash('sha256')
            .update(invoiceData)
            .digest('hex');
        // Create invoice with line items in a transaction
        const invoice = await prisma_1.prisma.$transaction(async (tx) => {
            const newInvoice = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    patientId,
                    description,
                    notes,
                    currency,
                    status: 'DRAFT',
                    subtotal: totals.subtotal,
                    taxAmount: totals.taxAmount,
                    taxRate,
                    discountAmount,
                    discountPercent,
                    totalAmount: totals.totalAmount,
                    issueDate: new Date(),
                    dueDate: new Date(dueDate),
                    billingName,
                    billingAddress,
                    billingCity,
                    billingState,
                    billingPostalCode,
                    billingCountry,
                    rfc,
                    fiscalAddress,
                    taxRegime,
                    issuedBy: context.user.id,
                },
            });
            // Create line items
            const createdLineItems = await Promise.all(lineItems.map((item) => {
                const totalPrice = item.quantity * item.unitPrice;
                return tx.invoiceLineItem.create({
                    data: {
                        invoiceId: newInvoice.id,
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
                        performedAt: item.performedAt ? new Date(item.performedAt) : null,
                    },
                });
            }));
            return {
                ...newInvoice,
                lineItems: createdLineItems,
            };
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: context.user.id,
                userEmail: context.user.email || 'unknown',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'CREATE',
                resource: 'Invoice',
                resourceId: invoice.id,
                details: {
                    patientId,
                    invoiceNumber,
                    totalAmount: totals.totalAmount,
                    lineItemsCount: lineItems.length,
                    invoiceHash,
                },
                success: true,
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: invoice,
            message: `Invoice ${invoiceNumber} created successfully`,
        }, { status: 201 });
    }
    catch (error) {
        console.error('Error creating invoice:', error);
        return server_1.NextResponse.json({ error: 'Failed to create invoice', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
});
//# sourceMappingURL=route.js.map