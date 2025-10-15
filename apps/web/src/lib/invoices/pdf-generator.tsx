/**
 * PDF Invoice Generator
 * Professional Mexican invoice PDF with CFDI compliance
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

// TypeScript interfaces
export interface InvoiceData {
  // Basic info
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  status: string;

  // Patient/Client info
  patient: {
    name: string;
    email: string;
    phone?: string;
  };

  // Billing address
  billingName?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;

  // Tax info (Mexican)
  rfc?: string;
  fiscalAddress?: string;
  taxRegime?: string;

  // Financial
  currency: string;
  subtotal: number; // in cents
  taxAmount: number; // in cents
  taxRate: number; // percentage
  discountAmount: number; // in cents
  totalAmount: number; // in cents

  // Line items
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number; // in cents
    totalPrice: number; // in cents
  }[];

  // CFDI info
  cfdiUUID?: string;
  cfdiStampDate?: Date;
  cfdiSerie?: string;
  cfdiNumber?: string;
  cfdiQRCodeUrl?: string;

  // Notes
  description?: string;
  notes?: string;
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2 solid #10b981',
  },
  logo: {
    width: 60,
    height: 60,
  },
  companyInfo: {
    textAlign: 'left',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 5,
  },
  invoiceTitle: {
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  invoiceLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    borderBottom: '1 solid #e5e7eb',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '30%',
    fontSize: 9,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  value: {
    width: '70%',
    fontSize: 9,
    color: '#1f2937',
  },
  table: {
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontWeight: 'bold',
    borderBottom: '1 solid #d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #e5e7eb',
  },
  tableColDescription: {
    width: '50%',
  },
  tableColQuantity: {
    width: '15%',
    textAlign: 'right',
  },
  tableColPrice: {
    width: '15%',
    textAlign: 'right',
  },
  tableColTotal: {
    width: '20%',
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    marginLeft: '50%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  totalLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 10,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    paddingHorizontal: 10,
    borderTop: '2 solid #10b981',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10b981',
  },
  cfdiSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    border: '1 solid #10b981',
  },
  cfdiTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#047857',
    marginBottom: 10,
  },
  qrCode: {
    width: 80,
    height: 80,
    marginTop: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
  },
  notesSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
  },
});

// Format currency
const formatCurrency = (cents: number, currency: string = 'MXN'): string => {
  const amount = cents / 100;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Format date
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

// PDF Document Component
export const InvoicePDF: React.FC<{ invoice: InvoiceData }> = ({ invoice }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>🌿 Holi Labs</Text>
          <Text style={{ fontSize: 9, color: '#6b7280' }}>
            Plataforma de Salud Digital
          </Text>
          <Text style={{ fontSize: 8, color: '#9ca3af', marginTop: 5 }}>
            RFC: HOL123456ABC
          </Text>
          <Text style={{ fontSize: 8, color: '#9ca3af' }}>
            Av. Reforma 123, CDMX 01000
          </Text>
        </View>

        <View style={styles.invoiceTitle}>
          <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          <Text style={styles.invoiceLabel}>Fecha: {formatDate(invoice.issueDate)}</Text>
          <Text style={styles.invoiceLabel}>Vencimiento: {formatDate(invoice.dueDate)}</Text>
          <Text style={{ fontSize: 10, color: '#10b981', fontWeight: 'bold', marginTop: 5 }}>
            Estado: {invoice.status}
          </Text>
        </View>
      </View>

      {/* Client Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información del Cliente</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nombre:</Text>
          <Text style={styles.value}>{invoice.billingName || invoice.patient.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{invoice.patient.email}</Text>
        </View>
        {invoice.patient.phone && (
          <View style={styles.row}>
            <Text style={styles.label}>Teléfono:</Text>
            <Text style={styles.value}>{invoice.patient.phone}</Text>
          </View>
        )}
        {invoice.rfc && (
          <View style={styles.row}>
            <Text style={styles.label}>RFC:</Text>
            <Text style={styles.value}>{invoice.rfc}</Text>
          </View>
        )}
        {invoice.taxRegime && (
          <View style={styles.row}>
            <Text style={styles.label}>Régimen Fiscal:</Text>
            <Text style={styles.value}>{invoice.taxRegime}</Text>
          </View>
        )}
        {invoice.billingAddress && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Dirección:</Text>
              <Text style={styles.value}>{invoice.billingAddress}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Ciudad:</Text>
              <Text style={styles.value}>
                {invoice.billingCity}, {invoice.billingState} {invoice.billingPostalCode}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Line Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableColDescription}>Descripción</Text>
          <Text style={styles.tableColQuantity}>Cantidad</Text>
          <Text style={styles.tableColPrice}>Precio Unit.</Text>
          <Text style={styles.tableColTotal}>Total</Text>
        </View>

        {invoice.lineItems.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableColDescription}>{item.description}</Text>
            <Text style={styles.tableColQuantity}>{item.quantity}</Text>
            <Text style={styles.tableColPrice}>
              {formatCurrency(item.unitPrice, invoice.currency)}
            </Text>
            <Text style={styles.tableColTotal}>
              {formatCurrency(item.totalPrice, invoice.currency)}
            </Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(invoice.subtotal, invoice.currency)}
          </Text>
        </View>

        {invoice.discountAmount > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Descuento:</Text>
            <Text style={styles.totalValue}>
              -{formatCurrency(invoice.discountAmount, invoice.currency)}
            </Text>
          </View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>IVA ({invoice.taxRate}%):</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(invoice.taxAmount, invoice.currency)}
          </Text>
        </View>

        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>TOTAL:</Text>
          <Text style={styles.grandTotalValue}>
            {formatCurrency(invoice.totalAmount, invoice.currency)}
          </Text>
        </View>
      </View>

      {/* CFDI Section */}
      {invoice.cfdiUUID && (
        <View style={styles.cfdiSection}>
          <Text style={styles.cfdiTitle}>
            ✓ Comprobante Fiscal Digital por Internet (CFDI)
          </Text>
          <View style={styles.row}>
            <Text style={styles.label}>UUID:</Text>
            <Text style={{ ...styles.value, fontSize: 8 }}>{invoice.cfdiUUID}</Text>
          </View>
          {invoice.cfdiSerie && invoice.cfdiNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Folio Fiscal:</Text>
              <Text style={styles.value}>
                {invoice.cfdiSerie}-{invoice.cfdiNumber}
              </Text>
            </View>
          )}
          {invoice.cfdiStampDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Fecha Timbrado:</Text>
              <Text style={styles.value}>{formatDate(invoice.cfdiStampDate)}</Text>
            </View>
          )}
          {invoice.cfdiQRCodeUrl && <Image style={styles.qrCode} src={invoice.cfdiQRCodeUrl} />}
        </View>
      )}

      {/* Notes */}
      {(invoice.description || invoice.notes) && (
        <View style={styles.notesSection}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 5 }}>
            Notas:
          </Text>
          <Text style={{ fontSize: 8, color: '#6b7280' }}>
            {invoice.description || invoice.notes}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text>
          Este documento fue generado electrónicamente y es válido sin firma ni sello.
        </Text>
        <Text style={{ marginTop: 3 }}>
          Para verificar la validez de este CFDI, visite: https://verificacfdi.facturaelectronica.sat.gob.mx/
        </Text>
      </View>
    </Page>
  </Document>
);
