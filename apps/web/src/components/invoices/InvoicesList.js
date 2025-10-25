"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InvoicesList;
const react_1 = require("react");
/**
 * Format currency in Mexican Pesos
 */
function formatMXN(cents) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(cents / 100);
}
/**
 * Format date for display
 */
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
/**
 * Get status badge color and text
 */
function getStatusBadge(status, isOverdue) {
    if (isOverdue) {
        return { color: 'bg-red-100 text-red-800', text: 'Vencida' };
    }
    switch (status) {
        case 'DRAFT':
            return { color: 'bg-gray-100 text-gray-800', text: 'Borrador' };
        case 'PENDING':
            return { color: 'bg-yellow-100 text-yellow-800', text: 'Pendiente' };
        case 'PAID':
            return { color: 'bg-green-100 text-green-800', text: 'Pagada' };
        case 'PARTIALLY_PAID':
            return { color: 'bg-blue-100 text-blue-800', text: 'Pago Parcial' };
        case 'OVERDUE':
            return { color: 'bg-red-100 text-red-800', text: 'Vencida' };
        case 'CANCELLED':
            return { color: 'bg-gray-100 text-gray-800', text: 'Cancelada' };
        case 'REFUNDED':
            return { color: 'bg-purple-100 text-purple-800', text: 'Reembolsada' };
        case 'VOID':
            return { color: 'bg-gray-100 text-gray-800', text: 'Anulada' };
        default:
            return { color: 'bg-gray-100 text-gray-800', text: status };
    }
}
function InvoicesList({ patientId, onInvoiceCreated, }) {
    const [invoices, setInvoices] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [expandedInvoice, setExpandedInvoice] = (0, react_1.useState)(null);
    const [filter, setFilter] = (0, react_1.useState)('ALL');
    // Fetch invoices
    (0, react_1.useEffect)(() => {
        async function fetchInvoices() {
            try {
                setLoading(true);
                const params = new URLSearchParams({ patientId });
                if (filter !== 'ALL') {
                    params.append('status', filter);
                }
                const response = await fetch(`/api/invoices?${params.toString()}`);
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch invoices');
                }
                setInvoices(data.data || []);
                setError(null);
            }
            catch (err) {
                console.error('Error fetching invoices:', err);
                setError(err.message);
            }
            finally {
                setLoading(false);
            }
        }
        fetchInvoices();
    }, [patientId, filter]);
    // Handle invoice void
    async function handleVoidInvoice(invoiceId) {
        if (!confirm('¿Estás seguro de que deseas anular esta factura? Esta acción no se puede deshacer.')) {
            return;
        }
        try {
            const response = await fetch(`/api/invoices/${invoiceId}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to void invoice');
            }
            // Refresh list
            window.location.reload();
        }
        catch (err) {
            alert(`Error: ${err.message}`);
        }
    }
    // Handle mark as paid
    async function handleMarkPaid(invoiceId) {
        if (!confirm('¿Marcar esta factura como pagada?')) {
            return;
        }
        try {
            const response = await fetch(`/api/invoices/${invoiceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markPaid: true }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to mark invoice as paid');
            }
            // Refresh list
            window.location.reload();
        }
        catch (err) {
            alert(`Error: ${err.message}`);
        }
    }
    if (loading) {
        return (<div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    if (error) {
        return (<div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl">⚠️</div>
          <div>
            <h3 className="text-lg font-bold text-red-900">Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>);
    }
    return (<div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Filtrar:</span>
          {[
            { value: 'ALL', label: 'Todas' },
            { value: 'PENDING', label: 'Pendientes' },
            { value: 'PAID', label: 'Pagadas' },
            { value: 'OVERDUE', label: 'Vencidas' },
            { value: 'DRAFT', label: 'Borradores' },
        ].map((f) => (<button key={f.value} onClick={() => setFilter(f.value)} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {f.label}
            </button>))}
        </div>
      </div>

      {/* Invoice List */}
      {invoices.length === 0 ? (<div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            No hay facturas
          </h3>
          <p className="text-sm text-gray-600">
            {filter === 'ALL'
                ? 'No se encontraron facturas para este paciente.'
                : `No hay facturas con estado: ${filter}`}
          </p>
        </div>) : (<div className="space-y-4">
          {invoices.map((invoice) => {
                const statusBadge = getStatusBadge(invoice.status, invoice.isOverdue);
                const isExpanded = expandedInvoice === invoice.id;
                return (<div key={invoice.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {/* Invoice Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {invoice.invoiceNumber}
                        </h3>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusBadge.color}`}>
                          {statusBadge.text}
                        </span>
                      </div>
                      {invoice.description && (<p className="text-sm text-gray-600">
                          {invoice.description}
                        </p>)}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatMXN(invoice.totalAmount)}
                      </div>
                      {invoice.amountDue > 0 && invoice.status !== 'PAID' && (<div className="text-sm text-red-600 font-medium">
                          Adeudo: {formatMXN(invoice.amountDue)}
                        </div>)}
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        Fecha de Emisión
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(invoice.issueDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        Fecha de Vencimiento
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(invoice.dueDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Subtotal</div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatMXN(invoice.subtotal)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">IVA (16%)</div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatMXN(invoice.taxAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setExpandedInvoice(isExpanded ? null : invoice.id)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      {isExpanded ? 'Ocultar Detalles' : 'Ver Detalles'}
                    </button>

                    {invoice.status === 'PENDING' && (<button onClick={() => handleMarkPaid(invoice.id)} className="text-sm text-green-600 hover:text-green-700 font-medium">
                        Marcar como Pagada
                      </button>)}

                    {['DRAFT', 'PENDING'].includes(invoice.status) && (<button onClick={() => handleVoidInvoice(invoice.id)} className="text-sm text-red-600 hover:text-red-700 font-medium">
                        Anular
                      </button>)}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (<div className="border-t border-gray-200 bg-gray-50 p-6">
                    {/* Line Items */}
                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-gray-900 mb-3">
                        Conceptos ({invoice.lineItems.length})
                      </h4>
                      <div className="space-y-2">
                        {invoice.lineItems.map((item) => (<div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-md">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {item.description}
                              </div>
                              <div className="text-xs text-gray-500">
                                Cantidad: {item.quantity} × {formatMXN(item.unitPrice)}
                              </div>
                            </div>
                            <div className="text-sm font-bold text-gray-900">
                              {formatMXN(item.totalPrice)}
                            </div>
                          </div>))}
                      </div>
                    </div>

                    {/* Payments */}
                    {invoice.payments.length > 0 && (<div>
                        <h4 className="text-sm font-bold text-gray-900 mb-3">
                          Pagos ({invoice.payments.length})
                        </h4>
                        <div className="space-y-2">
                          {invoice.payments.map((payment) => (<div key={payment.id} className="flex items-center justify-between bg-white p-3 rounded-md">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {payment.paymentNumber}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {payment.processedAt
                                    ? formatDate(payment.processedAt)
                                    : 'Pendiente'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-green-600">
                                  {formatMXN(payment.amount)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {payment.status}
                                </div>
                              </div>
                            </div>))}
                        </div>
                      </div>)}
                  </div>)}
              </div>);
            })}
        </div>)}

      {/* Summary Stats */}
      {invoices.length > 0 && (<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm font-medium text-blue-900 mb-1">
                Total Facturado
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {formatMXN(invoices.reduce((sum, inv) => sum + inv.totalAmount, 0))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-green-900 mb-1">
                Total Pagado
              </div>
              <div className="text-2xl font-bold text-green-900">
                {formatMXN(invoices.reduce((sum, inv) => sum + inv.totalPaid, 0))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-red-900 mb-1">
                Saldo Pendiente
              </div>
              <div className="text-2xl font-bold text-red-900">
                {formatMXN(invoices.reduce((sum, inv) => sum + inv.amountDue, 0))}
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
//# sourceMappingURL=InvoicesList.js.map