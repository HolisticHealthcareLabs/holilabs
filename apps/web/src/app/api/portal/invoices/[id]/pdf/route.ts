/**
 * Generate and Download Invoice PDF
 * API Route: /api/portal/invoices/[id]/pdf
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth/server';
import { InvoicePDF, type InvoiceData } from '@/lib/invoices/pdf-generator';
import { generateCFDIQRCode } from '@/lib/invoices/cfdi-generator';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // Check authorization - patients can only see their own invoices
    if (user.role === 'PATIENT' && invoice.patientId !== user.patientId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Generate QR code if CFDI is stamped
    let cfdiQRCodeUrl: string | undefined;
    if (invoice.cfdiUUID && invoice.rfc) {
      cfdiQRCodeUrl = await generateCFDIQRCode(
        process.env.HOLI_LABS_RFC || 'HOL123456ABC',
        invoice.rfc,
        invoice.totalAmount / 100,
        invoice.cfdiUUID
      );
    }

    // Prepare invoice data for PDF
    const invoiceData: InvoiceData = {
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
    const pdfBuffer = await renderToBuffer(<InvoicePDF invoice={invoiceData} />);

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: 'Error al generar el PDF' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
