'use client';

/**
 * Faturamento Anulações — Invoice Cancellation Workflow
 *
 * Scaffold for /dashboard/faturamento/anulacoes/page.tsx
 *
 * API: POST /api/billing/void/:invoiceId (see api-contracts.json)
 * CYRUS: Void creates IMMUTABLE AuditLog entry. Original invoice preserved. Stripe refund triggered.
 * RUTH: Void reason is MANDATORY. Full audit trail retained.
 *
 * @see sprint5-assets/api-contracts.json — faturamento.POST /api/billing/void/:invoiceId
 * @see sprint5-assets/i18n-sprint6.json — billing.void* keys
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileX,
  RefreshCw,
  Search,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VoidedInvoice {
  id: string;
  invoiceNumber: string;
  patientName: string;
  totalAmount: number;
  originalStatus: string;
  voidedAt: string;
  voidedBy: string;
  voidReason: VoidReason;
  reasonDetail?: string;
  refundStatus?: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  refundAmount?: number;
}

type VoidReason = 'DUPLICATE' | 'PATIENT_REQUEST' | 'BILLING_ERROR' | 'INSURANCE_DENIAL' | 'OTHER';

// ─── Void Confirmation Modal ─────────────────────────────────────────────────

function VoidConfirmationModal({
  invoice,
  onConfirm,
  onClose,
  loading,
  t,
}: {
  invoice: { id: string; invoiceNumber: string; totalAmount: number } | null;
  onConfirm: (reason: VoidReason, detail: string, initiateRefund: boolean) => void;
  onClose: () => void;
  loading: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const [reason, setReason] = useState<VoidReason | ''>('');
  const [detail, setDetail] = useState('');
  const [initiateRefund, setInitiateRefund] = useState(true);

  if (!invoice) return null;

  const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const reasons: { value: VoidReason; label: string }[] = [
    { value: 'DUPLICATE', label: t('voidReasonDuplicate') },
    { value: 'PATIENT_REQUEST', label: t('voidReasonPatient') },
    { value: 'BILLING_ERROR', label: t('voidReasonError') },
    { value: 'INSURANCE_DENIAL', label: t('voidReasonDenial') },
    { value: 'OTHER', label: t('voidReasonOther') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="void-dialog">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-sm px-lg py-md border-b border-gray-100 dark:border-gray-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-clinical-critical/10">
            <FileX className="h-5 w-5 text-clinical-critical" />
          </div>
          <div>
            <h2 className="text-h3 font-semibold text-gray-900 dark:text-white">{t('voidInvoice')}</h2>
            <p className="text-caption text-gray-500">#{invoice.invoiceNumber} — {formatBRL(invoice.totalAmount)}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-lg py-md space-y-md">
          {/* Warning */}
          <div className="flex items-start gap-sm rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 px-md py-sm">
            <AlertTriangle className="h-5 w-5 text-clinical-caution shrink-0 mt-px" />
            <p className="text-body-dense text-amber-800 dark:text-amber-300">{t('voidConfirm')}</p>
          </div>

          {/* Reason selector — MANDATORY per RUTH invariant */}
          <div>
            <label className="text-body-dense font-semibold text-gray-700 dark:text-gray-300 mb-xs block">
              {t('voidReason')} <span className="text-clinical-critical">*</span>
            </label>
            <div className="space-y-xs">
              {reasons.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-sm rounded-xl border px-md py-sm cursor-pointer min-h-touch-sm transition-colors ${
                    reason === r.value
                      ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="void-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="sr-only"
                  />
                  <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    reason === r.value ? 'border-gray-900 dark:border-white' : 'border-gray-300'
                  }`}>
                    {reason === r.value && <div className="h-2 w-2 rounded-full bg-gray-900 dark:bg-white" />}
                  </div>
                  <span className="text-body-dense text-gray-700 dark:text-gray-300">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Detail textarea — required if OTHER */}
          {(reason === 'OTHER' || reason) && (
            <div>
              <label className="text-body-dense font-semibold text-gray-700 dark:text-gray-300 mb-xs block">
                {reason === 'OTHER' ? 'Detail (required)' : 'Additional detail (optional)'}
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Explain the reason for voiding this invoice..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-md py-sm text-body min-h-[80px] resize-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              />
            </div>
          )}

          {/* Refund toggle */}
          <label className="flex items-center gap-sm cursor-pointer">
            <input
              type="checkbox"
              checked={initiateRefund}
              onChange={(e) => setInitiateRefund(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-body-dense text-gray-700 dark:text-gray-300">
              {t('refundInitiated') || 'Initiate refund via Stripe'} ({formatBRL(invoice.totalAmount)})
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-sm px-lg py-md border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-md py-sm text-body-dense font-semibold min-h-touch-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('statusCancelled') || 'Cancel'}
          </button>
          <button
            onClick={() => reason && onConfirm(reason, detail, initiateRefund)}
            disabled={!reason || (reason === 'OTHER' && !detail.trim()) || loading}
            className="rounded-xl bg-clinical-critical px-md py-sm text-body-dense font-semibold text-white min-h-touch-sm disabled:opacity-50 flex items-center gap-xs"
          >
            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
            {t('voidInvoice')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function FaturamentoAnulacoesPage() {
  const t = useTranslations('billing');
  const [voided, setVoided] = useState<VoidedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [voidTarget, setVoidTarget] = useState<{ id: string; invoiceNumber: string; totalAmount: number } | null>(null);
  const [voiding, setVoiding] = useState(false);

  // ─── Fetch voided invoices ───────────────────────────────────────────────

  const fetchVoided = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: holilabsv2 — create this endpoint or filter from /api/billing/invoices?status=VOID
      const res = await fetch('/api/billing/invoices?status=VOID,CANCELLED', {
        headers: { 'X-Access-Reason': 'PAYMENT' },
      });
      if (!res.ok) return;
      const data = await res.json();
      setVoided(data.invoices || []);
    } catch {
      // TODO: holilabsv2 — error handling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVoided(); }, [fetchVoided]);

  // ─── Void Invoice ────────────────────────────────────────────────────────

  const handleVoid = async (reason: VoidReason, detail: string, initiateRefund: boolean) => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      const res = await fetch(`/api/billing/void/${voidTarget.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Reason': 'PAYMENT',
        },
        body: JSON.stringify({ reason, reasonDetail: detail, initiateRefund }),
      });
      if (!res.ok) {
        const err = await res.json();
        // TODO: holilabsv2 — show error toast (err.message)
        return;
      }
      setVoidTarget(null);
      fetchVoided(); // Refresh list
    } catch {
      // TODO: holilabsv2 — error toast
    } finally {
      setVoiding(false);
    }
  };

  const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-lg px-xl py-lg max-w-7xl mx-auto">
      <h1 className="text-h2 font-bold text-gray-900 dark:text-white">{t('cancellations')}</h1>

      {/* Empty State */}
      {!loading && voided.length === 0 && (
        <div className="flex flex-col items-center justify-center py-2xl text-center" data-testid="anulacoes-empty">
          <CheckCircle2 className="h-16 w-16 text-clinical-safe mb-md" />
          <h2 className="text-h3 font-semibold text-gray-900 dark:text-white mb-sm">
            {/* empty-states-i18n.json: faturamento-anulacoes */}
            No cancellations
          </h2>
          <p className="text-body text-gray-500 dark:text-gray-400 max-w-md">
            {"That's a good thing. Cancellation requests and refund workflows will appear here when needed."}
          </p>
        </div>
      )}

      {/* Voided Invoices Table */}
      {voided.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-gray-500">{t('invoiceNumber') || 'Invoice'}</th>
                <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-gray-500">Patient</th>
                <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-gray-500">{t('voidReason')}</th>
                <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-gray-500">Voided By</th>
                <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-gray-500">Refund</th>
              </tr>
            </thead>
            <tbody>
              {voided.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-md py-sm text-body-dense font-medium text-gray-900 dark:text-white">
                    #{inv.invoiceNumber}
                  </td>
                  <td className="px-md py-sm text-body-dense text-gray-600 dark:text-gray-300">
                    {inv.patientName}
                  </td>
                  <td className="px-md py-sm text-body-dense text-gray-900 dark:text-white font-medium">
                    {formatBRL(inv.totalAmount)}
                  </td>
                  <td className="px-md py-sm">
                    <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-sm py-xs text-caption font-semibold text-gray-700 dark:text-gray-300">
                      {t(`voidReason${inv.voidReason.charAt(0) + inv.voidReason.slice(1).toLowerCase()}`) || inv.voidReason}
                    </span>
                    {inv.reasonDetail && (
                      <p className="text-caption text-gray-400 mt-xs truncate max-w-[200px]">{inv.reasonDetail}</p>
                    )}
                  </td>
                  <td className="px-md py-sm text-body-dense text-gray-600 dark:text-gray-300">
                    {inv.voidedBy}
                  </td>
                  <td className="px-md py-sm text-body-dense text-gray-500 whitespace-nowrap">
                    {new Date(inv.voidedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-md py-sm">
                    {inv.refundStatus === 'SUCCEEDED' && (
                      <span className="inline-flex items-center gap-xs text-caption font-semibold text-clinical-safe">
                        <CheckCircle2 className="h-3 w-3" />
                        {formatBRL(inv.refundAmount || 0)}
                      </span>
                    )}
                    {inv.refundStatus === 'PENDING' && (
                      <span className="inline-flex items-center gap-xs text-caption font-semibold text-clinical-caution">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Pending
                      </span>
                    )}
                    {inv.refundStatus === 'FAILED' && (
                      <span className="inline-flex items-center gap-xs text-caption font-semibold text-clinical-critical">
                        <XCircle className="h-3 w-3" />
                        Failed
                      </span>
                    )}
                    {!inv.refundStatus && (
                      <span className="text-caption text-gray-400">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Void Modal */}
      <VoidConfirmationModal
        invoice={voidTarget}
        onConfirm={handleVoid}
        onClose={() => setVoidTarget(null)}
        loading={voiding}
        t={t}
      />
    </div>
  );
}
