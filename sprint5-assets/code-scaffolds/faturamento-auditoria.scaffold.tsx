'use client';

/**
 * Faturamento Auditoria — Audit Trail Viewer with Hash Chain Integrity
 *
 * Scaffold for /dashboard/faturamento/auditoria/page.tsx
 *
 * Data source: POST /api/billing/audit (see api-contracts.json)
 * CYRUS invariant: AuditLog records are IMMUTABLE. Never delete. Hash chain verification.
 * RUTH invariant: Audit page without integrity verification = VETO
 *
 * @see sprint5-assets/api-contracts.json — faturamento.POST /api/billing/audit
 * @see sprint5-assets/i18n-sprint6.json — billing.audit* keys
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Download,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Trash2,
  Edit,
  UserCheck,
} from 'lucide-react';

// ─── Types (match api-contracts.json POST /api/billing/audit response) ───────

interface AuditEntry {
  id: string;
  timestamp: string;
  actionType: string;
  userId: string;
  userName: string;
  entityType: string;
  entityId: string;
  accessReason: string;
  dataHash: string;
  isPhiAccess: boolean;
}

interface IntegrityStatus {
  verified: boolean;
  totalLinks: number;
  brokenAt: string | null;
  lastVerified: string;
}

interface AuditFilters {
  actionType: string;
  userId: string;
  entityType: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}

// ─── Action Type Icons ───────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, React.ElementType> = {
  CREATE: FileText,
  UPDATE: Edit,
  DELETE: Trash2,
  READ: Eye,
  INVOICE_CREATED: FileText,
  INVOICE_VOIDED: Trash2,
  PHI_ACCESS: Eye,
  LOGIN: UserCheck,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#10B981',
  UPDATE: '#3B82F6',
  DELETE: '#EF4444',
  READ: '#94a3b8',
  INVOICE_CREATED: '#10B981',
  INVOICE_VOIDED: '#EF4444',
  PHI_ACCESS: '#F59E0B',
  LOGIN: '#3B82F6',
};

// ─── Integrity Banner ────────────────────────────────────────────────────────

function IntegrityBanner({
  status,
  verifying,
  onVerify,
  t,
}: {
  status: IntegrityStatus | null;
  verifying: boolean;
  onVerify: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="rounded-2xl border px-md py-md flex items-center justify-between"
      style={{
        borderColor: status?.verified === false ? '#EF4444' : status?.verified ? '#10B981' : '#e5e7eb',
        backgroundColor: status?.verified === false ? '#FEF2F2' : status?.verified ? '#F0FDF4' : 'transparent',
      }}
      data-testid="integrity-status"
    >
      <div className="flex items-center gap-sm">
        {status?.verified === true && (
          <>
            <ShieldCheck className="h-6 w-6 text-clinical-safe" data-testid="integrity-status-ok" />
            <div>
              <p className="text-body font-semibold text-clinical-safe">{t('auditIntact')}</p>
              <p className="text-caption text-gray-500">
                {status.totalLinks} {t('auditEntity') || 'entries'} — {t('lastSync') || 'Last verified'}: {new Date(status.lastVerified).toLocaleString('pt-BR')}
              </p>
            </div>
          </>
        )}
        {status?.verified === false && (
          <>
            <ShieldAlert className="h-6 w-6 text-clinical-critical" />
            <div>
              <p className="text-body font-semibold text-clinical-critical">{t('auditBroken')}</p>
              <p className="text-caption text-clinical-critical">
                Broken at entry: {status.brokenAt}
              </p>
            </div>
          </>
        )}
        {status === null && !verifying && (
          <p className="text-body text-gray-500">{t('auditVerifyIntegrity') || 'Hash chain not yet verified'}</p>
        )}
        {verifying && (
          <>
            <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
            <p className="text-body text-gray-500">{t('auditVerifying')}</p>
          </>
        )}
      </div>
      <button
        onClick={onVerify}
        disabled={verifying}
        className="flex items-center gap-xs rounded-xl bg-gray-900 dark:bg-white px-md py-xs text-body-dense font-semibold text-white dark:text-gray-900 min-h-touch-sm disabled:opacity-50"
        data-testid="verify-integrity-button"
      >
        <ShieldCheck className="h-4 w-4" />
        {verifying ? t('auditVerifying') : t('auditVerifyIntegrity')}
      </button>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function FaturamentoAuditoriaPage() {
  const t = useTranslations('billing');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [integrity, setIntegrity] = useState<IntegrityStatus | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>({
    actionType: '',
    userId: '',
    entityType: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
  });

  const LIMIT = 20;

  // ─── Fetch Audit Entries ─────────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Reason': 'OPERATIONS',
        },
        body: JSON.stringify({
          action: 'query',
          filters: {
            ...(filters.actionType && { actionType: filters.actionType }),
            ...(filters.userId && { userId: filters.userId }),
            ...(filters.entityType && { entityType: filters.entityType }),
            ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
            ...(filters.dateTo && { dateTo: filters.dateTo }),
          },
          page: filters.page,
          limit: LIMIT,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch {
      // TODO: holilabsv2 — show error toast
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // ─── Verify Hash Chain Integrity ─────────────────────────────────────────

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/billing/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Reason': 'OPERATIONS',
        },
        body: JSON.stringify({ action: 'verify_integrity' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setIntegrity(data.integrityStatus);
    } catch {
      // TODO: holilabsv2 — show error toast
    } finally {
      setVerifying(false);
    }
  };

  // ─── CSV Export ──────────────────────────────────────────────────────────

  const handleExport = () => {
    const header = 'Timestamp,User,Action,Entity Type,Entity ID,Access Reason,PHI Access,Hash\n';
    const rows = entries
      .map((e) => `${e.timestamp},${e.userName},${e.actionType},${e.entityType},${e.entityId},${e.accessReason},${e.isPhiAccess},${e.dataHash}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / LIMIT);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-lg px-xl py-lg max-w-7xl mx-auto" data-testid="audit-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-h2 font-bold text-gray-900 dark:text-white">{t('audit')}</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-xs rounded-xl border border-gray-200 dark:border-gray-700 px-sm py-xs text-body-dense min-h-touch-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <Download className="h-4 w-4" />
          {t('auditExport')}
        </button>
      </div>

      {/* Integrity Banner — RUTH invariant: this MUST exist */}
      <IntegrityBanner status={integrity} verifying={verifying} onVerify={handleVerify} t={t} />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-md py-sm">
        <Filter className="h-4 w-4 text-gray-400" />
        {/* TODO: holilabsv2 — replace with your Select components */}
        <select
          value={filters.entityType}
          onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-sm py-xs text-body-dense bg-transparent min-h-touch-sm"
        >
          <option value="">{t('auditEntity') || 'All Entities'}</option>
          <option value="Invoice">Invoice</option>
          <option value="Encounter">Encounter</option>
          <option value="ClinicalNote">ClinicalNote</option>
          <option value="Prescription">Prescription</option>
          <option value="Patient">Patient</option>
        </select>
        <select
          value={filters.actionType}
          onChange={(e) => setFilters((f) => ({ ...f, actionType: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-sm py-xs text-body-dense bg-transparent min-h-touch-sm"
        >
          <option value="">{t('auditAction') || 'All Actions'}</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="READ">Read</option>
          <option value="INVOICE_VOIDED">Invoice Voided</option>
          <option value="PHI_ACCESS">PHI Access</option>
        </select>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-sm py-xs text-body-dense bg-transparent min-h-touch-sm"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-sm py-xs text-body-dense bg-transparent min-h-touch-sm"
        />
      </div>

      {/* Audit Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden" data-testid="audit-table">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-gray-500">{t('auditTimestamp')}</th>
              <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-gray-500">{t('auditUser')}</th>
              <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-gray-500">{t('auditAction')}</th>
              <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-gray-500">{t('auditEntity')}</th>
              <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-gray-500">PHI</th>
              <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-gray-500">Hash</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-md py-sm">
                      <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-md py-xl text-center">
                  <ShieldCheck className="h-12 w-12 text-clinical-safe mx-auto mb-sm" />
                  <p className="text-body font-semibold text-gray-900 dark:text-white">
                    {/* empty-states-i18n.json: faturamento-auditoria */}
                    Clean audit trail
                  </p>
                  <p className="text-body-dense text-gray-500">All actions are being logged.</p>
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const Icon = ACTION_ICONS[entry.actionType] || FileText;
                const color = ACTION_COLORS[entry.actionType] || '#94a3b8';
                return (
                  <tr
                    key={entry.id}
                    className={`border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${
                      entry.isPhiAccess ? 'bg-amber-50/30 dark:bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="px-md py-sm text-body-dense text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-md py-sm text-body-dense text-gray-900 dark:text-white">
                      {entry.userName}
                    </td>
                    <td className="px-md py-sm">
                      <span
                        className="inline-flex items-center gap-xs rounded-full px-sm py-xs text-caption font-semibold"
                        style={{ backgroundColor: `${color}15`, color }}
                      >
                        <Icon className="h-3 w-3" />
                        {entry.actionType}
                      </span>
                    </td>
                    <td className="px-md py-sm text-body-dense text-gray-600 dark:text-gray-300">
                      {entry.entityType}
                      <span className="text-caption text-gray-400 ml-xs">#{entry.entityId.slice(0, 8)}</span>
                    </td>
                    <td className="px-md py-sm">
                      {entry.isPhiAccess && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-500/10 px-sm py-xs text-caption font-semibold text-amber-700 dark:text-amber-400">
                          PHI
                        </span>
                      )}
                    </td>
                    <td className="px-md py-sm text-caption font-mono text-gray-400 truncate max-w-[120px]">
                      {entry.dataHash.slice(0, 12)}...
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-md py-sm border-t border-gray-100 dark:border-gray-800">
            <p className="text-caption text-gray-500">
              {((filters.page - 1) * LIMIT) + 1}–{Math.min(filters.page * LIMIT, total)} of {total}
            </p>
            <div className="flex items-center gap-xs">
              <button
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                disabled={filters.page <= 1}
                className="rounded-lg p-xs min-h-touch-sm min-w-touch-sm flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-body-dense text-gray-600 dark:text-gray-300 px-sm">
                {filters.page} / {totalPages}
              </span>
              <button
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                disabled={filters.page >= totalPages}
                className="rounded-lg p-xs min-h-touch-sm min-w-touch-sm flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
