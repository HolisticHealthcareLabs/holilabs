"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InvoiceForm;
const react_1 = require("react");
function InvoiceForm({ patientId, onSuccess, onCancel, }) {
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    // Form state
    const [description, setDescription] = (0, react_1.useState)('');
    const [notes, setNotes] = (0, react_1.useState)('');
    const [dueDate, setDueDate] = (0, react_1.useState)('');
    const [taxRate, setTaxRate] = (0, react_1.useState)(16.0);
    const [discountAmount, setDiscountAmount] = (0, react_1.useState)(0);
    // Billing info
    const [billingName, setBillingName] = (0, react_1.useState)('');
    const [billingAddress, setBillingAddress] = (0, react_1.useState)('');
    const [billingCity, setBillingCity] = (0, react_1.useState)('');
    const [billingState, setBillingState] = (0, react_1.useState)('');
    const [billingPostalCode, setBillingPostalCode] = (0, react_1.useState)('');
    const [rfc, setRfc] = (0, react_1.useState)('');
    const [fiscalAddress, setFiscalAddress] = (0, react_1.useState)('');
    const [taxRegime, setTaxRegime] = (0, react_1.useState)('');
    // Line items
    const [lineItems, setLineItems] = (0, react_1.useState)([
        {
            description: '',
            itemType: 'CONSULTATION',
            quantity: 1,
            unitPrice: 0,
            taxable: true,
        },
    ]);
    // Add line item
    function addLineItem() {
        setLineItems([
            ...lineItems,
            {
                description: '',
                itemType: 'CONSULTATION',
                quantity: 1,
                unitPrice: 0,
                taxable: true,
            },
        ]);
    }
    // Remove line item
    function removeLineItem(index) {
        if (lineItems.length === 1)
            return;
        setLineItems(lineItems.filter((_, i) => i !== index));
    }
    // Update line item
    function updateLineItem(index, field, value) {
        const updated = [...lineItems];
        updated[index] = { ...updated[index], [field]: value };
        setLineItems(updated);
    }
    // Calculate totals
    function calculateTotals() {
        const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const taxableAmount = lineItems
            .filter((item) => item.taxable)
            .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const taxAmount = Math.round((taxableAmount * taxRate) / 100);
        const total = subtotal + taxAmount - discountAmount;
        return { subtotal, taxAmount, total };
    }
    // Format currency
    function formatMXN(cents) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(cents / 100);
    }
    // Handle submit
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        // Validate
        if (!dueDate) {
            setError('La fecha de vencimiento es requerida');
            return;
        }
        if (lineItems.length === 0) {
            setError('Debe agregar al menos un concepto');
            return;
        }
        for (const item of lineItems) {
            if (!item.description || item.unitPrice <= 0) {
                setError('Todos los conceptos deben tener descripción y precio válido');
                return;
            }
        }
        try {
            setLoading(true);
            // Convert prices from pesos to cents
            const lineItemsInCents = lineItems.map((item) => ({
                ...item,
                unitPrice: Math.round(item.unitPrice * 100),
            }));
            const discountInCents = Math.round(discountAmount * 100);
            const response = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId,
                    description,
                    notes,
                    dueDate: new Date(dueDate).toISOString(),
                    taxRate,
                    discountAmount: discountInCents,
                    billingName: billingName || undefined,
                    billingAddress: billingAddress || undefined,
                    billingCity: billingCity || undefined,
                    billingState: billingState || undefined,
                    billingPostalCode: billingPostalCode || undefined,
                    rfc: rfc || undefined,
                    fiscalAddress: fiscalAddress || undefined,
                    taxRegime: taxRegime || undefined,
                    lineItems: lineItemsInCents,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create invoice');
            }
            if (onSuccess) {
                onSuccess();
            }
        }
        catch (err) {
            console.error('Error creating invoice:', err);
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }
    const totals = calculateTotals();
    return (<form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {error && (<div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        </div>)}

      {/* Basic Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Información General
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Consulta médica general"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Vencimiento <span className="text-red-600">*</span>
            </label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas Internas
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Notas adicionales sobre esta factura..."/>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Conceptos</h3>
          <button type="button" onClick={addLineItem} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            + Agregar Concepto
          </button>
        </div>

        <div className="space-y-4">
          {lineItems.map((item, index) => (<div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Concepto {index + 1}
                </span>
                {lineItems.length > 1 && (<button type="button" onClick={() => removeLineItem(index)} className="text-red-600 hover:text-red-700 text-sm font-medium">
                    Eliminar
                  </button>)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Descripción *
                  </label>
                  <input type="text" value={item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Consulta médica"/>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select value={item.itemType} onChange={(e) => updateLineItem(index, 'itemType', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="CONSULTATION">Consulta</option>
                    <option value="LAB_TEST">Prueba de Laboratorio</option>
                    <option value="IMAGING">Imagen</option>
                    <option value="PROCEDURE">Procedimiento</option>
                    <option value="MEDICATION">Medicamento</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cantidad *
                  </label>
                  <input type="number" value={item.quantity} onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)} min="1" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"/>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Precio Unitario (MXN) *
                  </label>
                  <input type="number" value={item.unitPrice} onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} min="0" step="0.01" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"/>
                </div>

                <div className="flex items-center">
                  <input type="checkbox" checked={item.taxable} onChange={(e) => updateLineItem(index, 'taxable', e.target.checked)} className="w-4 h-4 text-blue-600 rounded"/>
                  <label className="ml-2 text-xs font-medium text-gray-700">
                    Gravado con IVA
                  </label>
                </div>

                <div className="text-right lg:col-span-2">
                  <div className="text-xs text-gray-500 mb-1">Total</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatMXN(Math.round(item.quantity * item.unitPrice * 100))}
                  </div>
                </div>
              </div>
            </div>))}
        </div>
      </div>

      {/* Billing Info (Optional) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Información Fiscal (Opcional)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RFC
            </label>
            <input type="text" value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="XAXX010101000"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razón Social
            </label>
            <input type="text" value={billingName} onChange={(e) => setBillingName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Nombre o Razón Social"/>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Domicilio Fiscal
            </label>
            <input type="text" value={fiscalAddress} onChange={(e) => setFiscalAddress(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Calle y número"/>
          </div>
        </div>
      </div>

      {/* Totals Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-4">Resumen</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">Subtotal</span>
            <span className="text-sm font-medium text-blue-900">
              {formatMXN(Math.round(totals.subtotal * 100))}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">IVA ({taxRate}%)</span>
            <span className="text-sm font-medium text-blue-900">
              {formatMXN(totals.taxAmount)}
            </span>
          </div>
          {discountAmount > 0 && (<div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Descuento</span>
              <span className="text-sm font-medium text-red-600">
                -{formatMXN(Math.round(discountAmount * 100))}
              </span>
            </div>)}
          <div className="border-t border-blue-300 pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-blue-900">Total</span>
              <span className="text-2xl font-bold text-blue-900">
                {formatMXN(totals.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? 'Creando Factura...' : 'Crear Factura'}
        </button>
        {onCancel && (<button type="button" onClick={onCancel} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            Cancelar
          </button>)}
      </div>
    </form>);
}
//# sourceMappingURL=InvoiceForm.js.map