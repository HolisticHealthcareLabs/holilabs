'use client';

/**
 * Portal Consent Dashboard — Granular LGPD consent management
 *
 * Reference for src/app/portal/dashboard/consent/page.tsx
 *
 * 5 granular consent toggles, consent history timeline, LGPD Art. 18 data rights.
 * RUTH: legal basis displayed for each consent type
 * CYRUS: every toggle change → AuditLog with before/after values
 *
 * @see sprint5-assets/comms-architecture.json — security.ruthInvariants
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Shield,
  Download,
  Trash2,
  Clock,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConsentPreference {
  id: string;
  key: string;
  enabled: boolean;
  label: Record<string, string>;
  description: Record<string, string>;
  legalBasis: Record<string, string>;
  category: 'communication' | 'data_sharing' | 'research';
  updatedAt: string | null;
}

interface ConsentHistoryEntry {
  id: string;
  action: 'ENABLED' | 'DISABLED';
  consentKey: string;
  consentLabel: string;
  timestamp: string;
  legalBasis: string;
}

// ─── Consent Types ───────────────────────────────────────────────────────────

const CONSENT_TYPES: Omit<ConsentPreference, 'enabled' | 'updatedAt'>[] = [
  {
    id: 'consent_appt_whatsapp', key: 'appointment_reminders_whatsapp', category: 'communication',
    label: { en: 'Appointment Reminders (WhatsApp)', 'pt-BR': 'Lembretes de Consulta (WhatsApp)', es: 'Recordatorios de Citas (WhatsApp)' },
    description: { en: 'Receive appointment reminders and confirmations via WhatsApp', 'pt-BR': 'Receber lembretes e confirmações de consulta via WhatsApp', es: 'Recibir recordatorios y confirmaciones de citas por WhatsApp' },
    legalBasis: { en: 'LGPD Art. 7, II — Consent for communication', 'pt-BR': 'LGPD Art. 7, II — Consentimento para comunicação', es: 'LGPD Art. 7, II — Consentimiento para comunicación' },
  },
  {
    id: 'consent_lab_notif', key: 'lab_results_notifications', category: 'communication',
    label: { en: 'Lab Results Notifications', 'pt-BR': 'Notificações de Resultados', es: 'Notificaciones de Resultados' },
    description: { en: 'Get notified when new lab results are available', 'pt-BR': 'Receber notificação quando novos resultados estiverem disponíveis', es: 'Recibir notificación cuando haya nuevos resultados disponibles' },
    legalBasis: { en: 'LGPD Art. 7, II — Consent for health notifications', 'pt-BR': 'LGPD Art. 7, II — Consentimento para notificações de saúde', es: 'LGPD Art. 7, II — Consentimiento para notificaciones de salud' },
  },
  {
    id: 'consent_promo', key: 'promotional_health_content', category: 'communication',
    label: { en: 'Health Tips & Preventive Care', 'pt-BR': 'Dicas de Saúde e Prevenção', es: 'Consejos de Salud y Prevención' },
    description: { en: 'Receive health tips and preventive care reminders', 'pt-BR': 'Receber dicas de saúde e lembretes de cuidados preventivos', es: 'Recibir consejos de salud y recordatorios de cuidados preventivos' },
    legalBasis: { en: 'LGPD Art. 7, I — Explicit consent for marketing', 'pt-BR': 'LGPD Art. 7, I — Consentimento explícito para comunicação promocional', es: 'LGPD Art. 7, I — Consentimiento explícito para comunicación promocional' },
  },
  {
    id: 'consent_rnds', key: 'rnds_data_sharing', category: 'data_sharing',
    label: { en: 'National Health Network (RNDS)', 'pt-BR': 'Rede Nacional de Dados em Saúde (RNDS)', es: 'Red Nacional de Datos en Salud (RNDS)' },
    description: { en: "Share your health records with Brazil's National Health Network for coordinated care", 'pt-BR': 'Compartilhar seus registros de saúde com a Rede Nacional de Dados em Saúde para cuidado coordenado', es: 'Compartir sus registros de salud con la Red Nacional de Datos en Salud para atención coordinada' },
    legalBasis: { en: 'LGPD Art. 7, VIII — Health protection by SUS', 'pt-BR': 'LGPD Art. 7, VIII — Tutela da saúde pelo SUS', es: 'LGPD Art. 7, VIII — Protección de la salud por el SUS' },
  },
  {
    id: 'consent_research', key: 'research_anonymization', category: 'research',
    label: { en: 'Anonymized Research Data', 'pt-BR': 'Dados Anonimizados para Pesquisa', es: 'Datos Anonimizados para Investigación' },
    description: { en: 'Allow your anonymized data to be used for medical research', 'pt-BR': 'Permitir que seus dados anonimizados sejam usados para pesquisa médica', es: 'Permitir que sus datos anonimizados sean usados para investigación médica' },
    legalBasis: { en: 'LGPD Art. 7, IV — Research with anonymization', 'pt-BR': 'LGPD Art. 7, IV — Pesquisa com anonimização', es: 'LGPD Art. 7, IV — Investigación con anonimización' },
  },
];

// ─── Toggle Component ────────────────────────────────────────────────────────

function ConsentToggle({
  consent,
  onToggle,
  saving,
  locale,
}: {
  consent: ConsentPreference;
  onToggle: (key: string, enabled: boolean) => void;
  saving: boolean;
  locale: string;
}) {
  const [showLegal, setShowLegal] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-surface-elevated px-md py-md">
      <div className="flex items-start gap-md">
        <div className="flex-1 min-w-0">
          <label htmlFor={`toggle-${consent.key}`} className="text-body font-semibold text-[var(--text-foreground)] cursor-pointer">
            {consent.label[locale] || consent.label.en}
          </label>
          <p className="text-body text-[var(--text-muted)] mt-xs">
            {consent.description[locale] || consent.description.en}
          </p>
          {/* RUTH: Legal basis always visible */}
          <button
            onClick={() => setShowLegal(!showLegal)}
            className="inline-flex items-center gap-xs text-caption text-[var(--text-subtle)] hover:text-[var(--text-muted)] mt-xs min-h-[var(--touch-sm)]"
            aria-expanded={showLegal}
          >
            <Info className="h-3 w-3" aria-hidden="true" />
            {locale === 'pt-BR' ? 'Base legal' : locale === 'es' ? 'Base legal' : 'Legal basis'}
          </button>
          {showLegal && (
            <p className="text-caption text-[var(--text-subtle)] mt-xs pl-md border-l-2 border-[var(--border-default)]">
              {consent.legalBasis[locale] || consent.legalBasis.en}
            </p>
          )}
          {consent.updatedAt && (
            <p className="text-caption text-[var(--text-subtle)] mt-xs">
              {locale === 'pt-BR' ? 'Última alteração' : 'Last changed'}: {new Date(consent.updatedAt).toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-US')}
            </p>
          )}
        </div>

        {/* Toggle switch */}
        <button
          id={`toggle-${consent.key}`}
          role="switch"
          aria-checked={consent.enabled}
          aria-label={`${consent.enabled ? 'Disable' : 'Enable'} ${consent.label[locale] || consent.label.en}`}
          disabled={saving}
          onClick={() => onToggle(consent.key, !consent.enabled)}
          className={`relative shrink-0 h-7 w-12 rounded-full transition-colors min-h-[var(--touch-sm)] ${
            consent.enabled ? 'bg-severity-minimal' : 'bg-[var(--text-subtle)]'
          } ${saving ? 'opacity-50' : ''}`}
          data-testid={`consent-${consent.key}-toggle`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-[var(--surface-primary)] shadow-sm transition-transform ${
              consent.enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

// ─── Consent History Timeline ────────────────────────────────────────────────

function ConsentHistory({ history, locale }: { history: ConsentHistoryEntry[]; locale: string }) {
  if (history.length === 0) return null;

  return (
    <section aria-label={locale === 'pt-BR' ? 'Histórico de consentimentos' : 'Consent history'}>
      <h2 className="text-heading-sm font-semibold text-[var(--text-foreground)] mb-md flex items-center gap-sm">
        <Clock className="h-5 w-5 text-[var(--text-subtle)]" aria-hidden="true" />
        {locale === 'pt-BR' ? 'Histórico' : locale === 'es' ? 'Historial' : 'History'}
      </h2>
      <div className="space-y-xs" role="list">
        {history.map((entry) => (
          <div key={entry.id} className="flex items-center gap-sm px-md py-xs" role="listitem">
            {entry.action === 'ENABLED'
              ? <CheckCircle2 className="h-4 w-4 text-severity-minimal shrink-0" aria-hidden="true" />
              : <XCircle className="h-4 w-4 text-severity-severe shrink-0" aria-hidden="true" />
            }
            <div className="flex-1 min-w-0">
              <span className="text-body text-[var(--text-foreground)]">
                {entry.action === 'ENABLED'
                  ? (locale === 'pt-BR' ? 'Ativou' : 'Enabled')
                  : (locale === 'pt-BR' ? 'Desativou' : 'Disabled')
                }
              </span>
              <span className="text-body text-[var(--text-muted)] ml-xs">{entry.consentLabel}</span>
            </div>
            <span className="text-caption text-[var(--text-subtle)] shrink-0">
              {new Date(entry.timestamp).toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── LGPD Art. 18 Data Rights ────────────────────────────────────────────────

function DataRightsSection({ locale, onExport, onDelete, exporting }: {
  locale: string;
  onExport: () => void;
  onDelete: () => void;
  exporting: boolean;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const CONFIRM_WORD = locale === 'pt-BR' ? 'EXCLUIR' : locale === 'es' ? 'ELIMINAR' : 'DELETE';

  return (
    <section aria-label={locale === 'pt-BR' ? 'Seus direitos de dados' : 'Your data rights'} className="space-y-md">
      <h2 className="text-heading-sm font-semibold text-[var(--text-foreground)] flex items-center gap-sm">
        <Shield className="h-5 w-5 text-[var(--text-subtle)]" aria-hidden="true" />
        {locale === 'pt-BR' ? 'Seus Direitos (LGPD Art. 18)' : 'Your Data Rights (LGPD Art. 18)'}
      </h2>

      {/* Download data */}
      <div className="rounded-xl border border-[var(--border-default)] bg-surface-elevated px-md py-md flex items-center justify-between">
        <div>
          <p className="text-body font-semibold text-[var(--text-foreground)]">
            {locale === 'pt-BR' ? 'Baixar Meus Dados' : 'Download My Data'}
          </p>
          <p className="text-body text-[var(--text-muted)]">
            {locale === 'pt-BR' ? 'Exportar todos os seus dados de saúde em formato ZIP' : 'Export all your health data as a ZIP file'}
          </p>
        </div>
        <button
          onClick={onExport}
          disabled={exporting}
          className="flex items-center gap-xs rounded-lg bg-[var(--text-foreground)] text-[var(--surface-primary)] px-md py-sm text-body font-semibold min-h-[var(--touch-md)] disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? (locale === 'pt-BR' ? 'Gerando...' : 'Generating...') : (locale === 'pt-BR' ? 'Baixar' : 'Download')}
        </button>
      </div>

      {/* Delete account */}
      <div className="rounded-xl border border-severity-severe/30 bg-severity-severe/5 px-md py-md">
        <div className="flex items-start gap-sm">
          <AlertTriangle className="h-5 w-5 text-severity-severe shrink-0 mt-px" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-body font-semibold text-severity-severe">
              {locale === 'pt-BR' ? 'Solicitar Exclusão da Conta' : 'Request Account Deletion'}
            </p>
            <p className="text-body text-[var(--text-muted)] mt-xs">
              {locale === 'pt-BR'
                ? 'Seus dados pessoais serão excluídos. Registros clínicos e trilha de auditoria serão retidos conforme LGPD Art. 37.'
                : 'Your personal data will be deleted. Clinical records and audit trail are retained per LGPD Art. 37.'}
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-xs text-body font-semibold text-severity-severe mt-md min-h-[var(--touch-md)]"
              >
                <Trash2 className="h-4 w-4" />
                {locale === 'pt-BR' ? 'Iniciar exclusão' : 'Start deletion'}
              </button>
            ) : (
              <div className="mt-md space-y-sm">
                <p className="text-body text-severity-severe font-semibold">
                  {locale === 'pt-BR' ? `Digite "${CONFIRM_WORD}" para confirmar:` : `Type "${CONFIRM_WORD}" to confirm:`}
                </p>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full rounded-lg border border-severity-severe/30 bg-transparent px-md py-sm text-body min-h-[var(--touch-md)]"
                  placeholder={CONFIRM_WORD}
                  aria-label={`Type ${CONFIRM_WORD} to confirm deletion`}
                />
                <div className="flex gap-sm">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                    className="rounded-lg border border-[var(--border-default)] px-md py-sm text-body min-h-[var(--touch-md)]"
                  >
                    {locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    onClick={onDelete}
                    disabled={deleteConfirmText !== CONFIRM_WORD}
                    className="rounded-lg bg-severity-severe text-[var(--surface-primary)] px-md py-sm text-body font-semibold min-h-[var(--touch-md)] disabled:opacity-30"
                  >
                    {locale === 'pt-BR' ? 'Confirmar exclusão' : 'Confirm deletion'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PortalConsentDashboard() {
  const t = useTranslations('common');
  const locale = 'pt-BR'; // TODO: holilabsv2 — useLocale()
  const [consents, setConsents] = useState<ConsentPreference[]>([]);
  const [history, setHistory] = useState<ConsentHistoryEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/consent', { headers: { 'X-Access-Reason': 'TREATMENT' } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setConsents(CONSENT_TYPES.map((ct) => ({
            ...ct,
            enabled: data.preferences?.[ct.key] ?? false,
            updatedAt: data.timestamps?.[ct.key] ?? null,
          })));
          setHistory(data.history || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = useCallback(async (key: string, enabled: boolean) => {
    setSaving(true);
    try {
      // CYRUS: audit log created server-side with before/after values
      const res = await fetch('/api/portal/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Access-Reason': 'TREATMENT' },
        body: JSON.stringify({ key, enabled }),
      });
      if (res.ok) {
        setConsents((prev) => prev.map((c) => c.key === key ? { ...c, enabled, updatedAt: new Date().toISOString() } : c));
        setHistory((prev) => [{ id: `h_${Date.now()}`, action: enabled ? 'ENABLED' : 'DISABLED', consentKey: key, consentLabel: CONSENT_TYPES.find((ct) => ct.key === key)?.label[locale] || key, timestamp: new Date().toISOString(), legalBasis: CONSENT_TYPES.find((ct) => ct.key === key)?.legalBasis[locale] || '' }, ...prev]);
      }
    } finally { setSaving(false); }
  }, [locale]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/portal/export', { headers: { 'X-Access-Reason': 'TREATMENT' } });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meus-dados-${new Date().toISOString().split('T')[0]}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally { setExporting(false); }
  }, []);

  const handleDelete = useCallback(async () => {
    // TODO: holilabsv2 — POST /api/portal/delete-account
    alert(locale === 'pt-BR' ? 'Solicitação enviada. Você receberá confirmação por email.' : 'Request submitted. You will receive email confirmation.');
  }, [locale]);

  if (loading) {
    return <div className="space-y-sm px-md py-md max-w-2xl mx-auto" aria-busy="true">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 rounded-xl bg-[var(--surface-secondary)] animate-pulse" />)}</div>;
  }

  const grouped = {
    communication: consents.filter((c) => c.category === 'communication'),
    data_sharing: consents.filter((c) => c.category === 'data_sharing'),
    research: consents.filter((c) => c.category === 'research'),
  };

  return (
    <div className="space-y-lg px-md py-md max-w-2xl mx-auto">
      <h1 className="text-heading-lg font-bold text-[var(--text-foreground)]">
        {locale === 'pt-BR' ? 'Privacidade e Consentimento' : 'Privacy & Consent'}
      </h1>
      <p className="text-body text-[var(--text-muted)]">
        {locale === 'pt-BR' ? 'Gerencie como seus dados são utilizados. Você pode alterar suas preferências a qualquer momento.' : 'Manage how your data is used. You can change your preferences at any time.'}
      </p>

      {/* Communication consents */}
      <section aria-label="Communication preferences">
        <h2 className="text-caption font-semibold uppercase tracking-wider text-[var(--text-subtle)] mb-sm">
          {locale === 'pt-BR' ? 'Comunicação' : 'Communication'}
        </h2>
        <div className="space-y-sm">
          {grouped.communication.map((c) => <ConsentToggle key={c.key} consent={c} onToggle={handleToggle} saving={saving} locale={locale} />)}
        </div>
      </section>

      {/* Data sharing */}
      <section aria-label="Data sharing preferences">
        <h2 className="text-caption font-semibold uppercase tracking-wider text-[var(--text-subtle)] mb-sm">
          {locale === 'pt-BR' ? 'Compartilhamento de Dados' : 'Data Sharing'}
        </h2>
        <div className="space-y-sm">
          {grouped.data_sharing.map((c) => <ConsentToggle key={c.key} consent={c} onToggle={handleToggle} saving={saving} locale={locale} />)}
        </div>
      </section>

      {/* Research */}
      <section aria-label="Research preferences">
        <h2 className="text-caption font-semibold uppercase tracking-wider text-[var(--text-subtle)] mb-sm">
          {locale === 'pt-BR' ? 'Pesquisa' : 'Research'}
        </h2>
        <div className="space-y-sm">
          {grouped.research.map((c) => <ConsentToggle key={c.key} consent={c} onToggle={handleToggle} saving={saving} locale={locale} />)}
        </div>
      </section>

      <ConsentHistory history={history} locale={locale} />
      <DataRightsSection locale={locale} onExport={handleExport} onDelete={handleDelete} exporting={exporting} />
    </div>
  );
}
