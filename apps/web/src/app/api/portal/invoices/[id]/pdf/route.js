"use strict";
/**
 * Generate and Download Invoice PDF
 * API Route: /api/portal/invoices/[id]/pdf
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const renderer_1 = require("@react-pdf/renderer");
const react_1 = require("react");
const client_1 = require("@prisma/client");
const server_2 = require("@/lib/auth/server");
const pdf_generator_1 = require("@/lib/invoices/pdf-generator");
const cfdi_generator_1 = require("@/lib/invoices/cfdi-generator");
const prisma = new client_1.PrismaClient();
async function GET(request, { params }) {
    try {
        // Verify authentication
        const user = await (0, server_2.getCurrentUser)();
        if (!user) {
            return server_1.NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }
        const invoiceId = params.id;
        // Fetch invoice with all relations
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                patient: true,
                lineItems: true,
            },
        });
        if (!invoice) {
            return server_1.NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
        }
        // Check authorization - patients can only see their own invoices
        if (user.role === 'PATIENT' && invoice.patientId !== user.patientId) {
            return server_1.NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
        // Generate QR code if CFDI is stamped
        let cfdiQRCodeUrl;
        if (invoice.cfdiUUID && invoice.rfc) {
            cfdiQRCodeUrl = await (0, cfdi_generator_1.generateCFDIQRCode)(process.env.HOLI_LABS_RFC || 'HOL123456ABC', invoice.rfc, invoice.totalAmount / 100, invoice.cfdiUUID);
        }
        // Prepare invoice data for PDF
        const invoiceData = {
            invoiceNumber: invoice.invoiceNumber,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            status: invoice.status,
            patient: {
                name: invoice.patient.firstName + ' ' + invoice.patient.lastName,
                email: invoice.patient.email,
                phone: invoice.patient.phone || undefined,
            },
            billingName: invoice.billingName || undefined,
            billingAddress: invoice.billingAddress || undefined,
            billingCity: invoice.billingCity || undefined,
            billingState: invoice.billingState || undefined,
            billingPostalCode: invoice.billingPostalCode || undefined,
            rfc: invoice.rfc || undefined,
            fiscalAddress: invoice.fiscalAddress || undefined,
            taxRegime: invoice.taxRegime || undefined,
            currency: invoice.currency,
            subtotal: invoice.subtotal,
            taxAmount: invoice.taxAmount,
            taxRate: invoice.taxRate,
            discountAmount: invoice.discountAmount,
            totalAmount: invoice.totalAmount,
            lineItems: invoice.lineItems.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
            })),
            cfdiUUID: invoice.cfdiUUID || undefined,
            cfdiStampDate: invoice.cfdiStampDate || undefined,
            cfdiSerie: invoice.cfdiSerie || undefined,
            cfdiNumber: invoice.cfdiNumber || undefined,
            cfdiQRCodeUrl,
            description: invoice.description || undefined,
            notes: invoice.notes || undefined,
        };
        // Generate PDF
        const pdfBuffer = await (0, renderer_1.renderToBuffer)((0, react_1.createElement)(pdf_generator_1.InvoicePDF, { invoice: invoiceData }));
        // Return PDF as download
        return new server_1.NextResponse(Buffer.from(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    }
    catch (error) {
        console.error('Error generating invoice PDF:', error);
        return server_1.NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 });
    }
    finally {
        await prisma.$disconnect();
    }
}
//# sourceMappingURL=route.js.map