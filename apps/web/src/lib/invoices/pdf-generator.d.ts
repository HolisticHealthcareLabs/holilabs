/**
 * PDF Invoice Generator
 * Professional Mexican invoice PDF with CFDI compliance
 */
import React from 'react';
export interface InvoiceData {
    invoiceNumber: string;
    issueDate: Date;
    dueDate: Date;
    status: string;
    patient: {
        name: string;
        email: string;
        phone?: string;
    };
    billingName?: string;
    billingAddress?: string;
    billingCity?: string;
    billingState?: string;
    billingPostalCode?: string;
    rfc?: string;
    fiscalAddress?: string;
    taxRegime?: string;
    currency: string;
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    discountAmount: number;
    totalAmount: number;
    lineItems: {
        description: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }[];
    cfdiUUID?: string;
    cfdiStampDate?: Date;
    cfdiSerie?: string;
    cfdiNumber?: string;
    cfdiQRCodeUrl?: string;
    description?: string;
    notes?: string;
}
export declare const InvoicePDF: React.FC<{
    invoice: InvoiceData;
}>;
//# sourceMappingURL=pdf-generator.d.ts.map