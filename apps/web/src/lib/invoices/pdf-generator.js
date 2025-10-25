"use strict";
/**
 * PDF Invoice Generator
 * Professional Mexican invoice PDF with CFDI compliance
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicePDF = void 0;
const react_1 = __importDefault(require("react"));
const renderer_1 = require("@react-pdf/renderer");
// PDF Styles
const styles = renderer_1.StyleSheet.create({
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
const formatCurrency = (cents, currency = 'MXN') => {
    const amount = cents / 100;
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency,
    }).format(amount);
};
// Format date
const formatDate = (date) => {
    return new Intl.DateTimeFormat('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
};
// PDF Document Component
const InvoicePDF = ({ invoice }) => (<renderer_1.Document>
    <renderer_1.Page size="A4" style={styles.page}>
      {/* Header */}
      <renderer_1.View style={styles.header}>
        <renderer_1.View style={styles.companyInfo}>
          <renderer_1.Text style={styles.companyName}>🌿 Holi Labs</renderer_1.Text>
          <renderer_1.Text style={{ fontSize: 9, color: '#6b7280' }}>
            Plataforma de Salud Digital
          </renderer_1.Text>
          <renderer_1.Text style={{ fontSize: 8, color: '#9ca3af', marginTop: 5 }}>
            RFC: HOL123456ABC
          </renderer_1.Text>
          <renderer_1.Text style={{ fontSize: 8, color: '#9ca3af' }}>
            Av. Reforma 123, CDMX 01000
          </renderer_1.Text>
        </renderer_1.View>

        <renderer_1.View style={styles.invoiceTitle}>
          <renderer_1.Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</renderer_1.Text>
          <renderer_1.Text style={styles.invoiceLabel}>Fecha: {formatDate(invoice.issueDate)}</renderer_1.Text>
          <renderer_1.Text style={styles.invoiceLabel}>Vencimiento: {formatDate(invoice.dueDate)}</renderer_1.Text>
          <renderer_1.Text style={{ fontSize: 10, color: '#10b981', fontWeight: 'bold', marginTop: 5 }}>
            Estado: {invoice.status}
          </renderer_1.Text>
        </renderer_1.View>
      </renderer_1.View>

      {/* Client Information */}
      <renderer_1.View style={styles.section}>
        <renderer_1.Text style={styles.sectionTitle}>Información del Cliente</renderer_1.Text>
        <renderer_1.View style={styles.row}>
          <renderer_1.Text style={styles.label}>Nombre:</renderer_1.Text>
          <renderer_1.Text style={styles.value}>{invoice.billingName || invoice.patient.name}</renderer_1.Text>
        </renderer_1.View>
        <renderer_1.View style={styles.row}>
          <renderer_1.Text style={styles.label}>Email:</renderer_1.Text>
          <renderer_1.Text style={styles.value}>{invoice.patient.email}</renderer_1.Text>
        </renderer_1.View>
        {invoice.patient.phone && (<renderer_1.View style={styles.row}>
            <renderer_1.Text style={styles.label}>Teléfono:</renderer_1.Text>
            <renderer_1.Text style={styles.value}>{invoice.patient.phone}</renderer_1.Text>
          </renderer_1.View>)}
        {invoice.rfc && (<renderer_1.View style={styles.row}>
            <renderer_1.Text style={styles.label}>RFC:</renderer_1.Text>
            <renderer_1.Text style={styles.value}>{invoice.rfc}</renderer_1.Text>
          </renderer_1.View>)}
        {invoice.taxRegime && (<renderer_1.View style={styles.row}>
            <renderer_1.Text style={styles.label}>Régimen Fiscal:</renderer_1.Text>
            <renderer_1.Text style={styles.value}>{invoice.taxRegime}</renderer_1.Text>
          </renderer_1.View>)}
        {invoice.billingAddress && (<>
            <renderer_1.View style={styles.row}>
              <renderer_1.Text style={styles.label}>Dirección:</renderer_1.Text>
              <renderer_1.Text style={styles.value}>{invoice.billingAddress}</renderer_1.Text>
            </renderer_1.View>
            <renderer_1.View style={styles.row}>
              <renderer_1.Text style={styles.label}>Ciudad:</renderer_1.Text>
              <renderer_1.Text style={styles.value}>
                {invoice.billingCity}, {invoice.billingState} {invoice.billingPostalCode}
              </renderer_1.Text>
            </renderer_1.View>
          </>)}
      </renderer_1.View>

      {/* Line Items Table */}
      <renderer_1.View style={styles.table}>
        <renderer_1.View style={styles.tableHeader}>
          <renderer_1.Text style={styles.tableColDescription}>Descripción</renderer_1.Text>
          <renderer_1.Text style={styles.tableColQuantity}>Cantidad</renderer_1.Text>
          <renderer_1.Text style={styles.tableColPrice}>Precio Unit.</renderer_1.Text>
          <renderer_1.Text style={styles.tableColTotal}>Total</renderer_1.Text>
        </renderer_1.View>

        {invoice.lineItems.map((item, index) => (<renderer_1.View key={index} style={styles.tableRow}>
            <renderer_1.Text style={styles.tableColDescription}>{item.description}</renderer_1.Text>
            <renderer_1.Text style={styles.tableColQuantity}>{item.quantity}</renderer_1.Text>
            <renderer_1.Text style={styles.tableColPrice}>
              {formatCurrency(item.unitPrice, invoice.currency)}
            </renderer_1.Text>
            <renderer_1.Text style={styles.tableColTotal}>
              {formatCurrency(item.totalPrice, invoice.currency)}
            </renderer_1.Text>
          </renderer_1.View>))}
      </renderer_1.View>

      {/* Totals */}
      <renderer_1.View style={styles.totalsSection}>
        <renderer_1.View style={styles.totalRow}>
          <renderer_1.Text style={styles.totalLabel}>Subtotal:</renderer_1.Text>
          <renderer_1.Text style={styles.totalValue}>
            {formatCurrency(invoice.subtotal, invoice.currency)}
          </renderer_1.Text>
        </renderer_1.View>

        {invoice.discountAmount > 0 && (<renderer_1.View style={styles.totalRow}>
            <renderer_1.Text style={styles.totalLabel}>Descuento:</renderer_1.Text>
            <renderer_1.Text style={styles.totalValue}>
              -{formatCurrency(invoice.discountAmount, invoice.currency)}
            </renderer_1.Text>
          </renderer_1.View>)}

        <renderer_1.View style={styles.totalRow}>
          <renderer_1.Text style={styles.totalLabel}>IVA ({invoice.taxRate}%):</renderer_1.Text>
          <renderer_1.Text style={styles.totalValue}>
            {formatCurrency(invoice.taxAmount, invoice.currency)}
          </renderer_1.Text>
        </renderer_1.View>

        <renderer_1.View style={styles.grandTotalRow}>
          <renderer_1.Text style={styles.grandTotalLabel}>TOTAL:</renderer_1.Text>
          <renderer_1.Text style={styles.grandTotalValue}>
            {formatCurrency(invoice.totalAmount, invoice.currency)}
          </renderer_1.Text>
        </renderer_1.View>
      </renderer_1.View>

      {/* CFDI Section */}
      {invoice.cfdiUUID && (<renderer_1.View style={styles.cfdiSection}>
          <renderer_1.Text style={styles.cfdiTitle}>
            ✓ Comprobante Fiscal Digital por Internet (CFDI)
          </renderer_1.Text>
          <renderer_1.View style={styles.row}>
            <renderer_1.Text style={styles.label}>UUID:</renderer_1.Text>
            <renderer_1.Text style={{ ...styles.value, fontSize: 8 }}>{invoice.cfdiUUID}</renderer_1.Text>
          </renderer_1.View>
          {invoice.cfdiSerie && invoice.cfdiNumber && (<renderer_1.View style={styles.row}>
              <renderer_1.Text style={styles.label}>Folio Fiscal:</renderer_1.Text>
              <renderer_1.Text style={styles.value}>
                {invoice.cfdiSerie}-{invoice.cfdiNumber}
              </renderer_1.Text>
            </renderer_1.View>)}
          {invoice.cfdiStampDate && (<renderer_1.View style={styles.row}>
              <renderer_1.Text style={styles.label}>Fecha Timbrado:</renderer_1.Text>
              <renderer_1.Text style={styles.value}>{formatDate(invoice.cfdiStampDate)}</renderer_1.Text>
            </renderer_1.View>)}
          {invoice.cfdiQRCodeUrl && <renderer_1.Image style={styles.qrCode} src={invoice.cfdiQRCodeUrl}/>}
        </renderer_1.View>)}

      {/* Notes */}
      {(invoice.description || invoice.notes) && (<renderer_1.View style={styles.notesSection}>
          <renderer_1.Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 5 }}>
            Notas:
          </renderer_1.Text>
          <renderer_1.Text style={{ fontSize: 8, color: '#6b7280' }}>
            {invoice.description || invoice.notes}
          </renderer_1.Text>
        </renderer_1.View>)}

      {/* Footer */}
      <renderer_1.View style={styles.footer}>
        <renderer_1.Text>
          Este documento fue generado electrónicamente y es válido sin firma ni sello.
        </renderer_1.Text>
        <renderer_1.Text style={{ marginTop: 3 }}>
          Para verificar la validez de este CFDI, visite: https://verificacfdi.facturaelectronica.sat.gob.mx/
        </renderer_1.Text>
      </renderer_1.View>
    </renderer_1.Page>
  </renderer_1.Document>);
exports.InvoicePDF = InvoicePDF;
//# sourceMappingURL=pdf-generator.js.map