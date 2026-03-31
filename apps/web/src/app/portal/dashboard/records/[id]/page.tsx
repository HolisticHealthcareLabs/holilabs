'use client';

/**
 * Medical Record Detail — Sprint 8 Phase 2B
 *
 * SOAP note display + FHIR export + PDF export + share + access log.
 * Design-token-only styling. CYRUS invariant: every record view logged.
 * i18n via next-intl. Accessibility: aria roles, reduced motion.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es, ptBR, enUS } from 'date-fns/locale';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import ShareRecordModal from '@/components/portal/ShareRecordModal';

/* ── Types ──────────────────────────────────────────────────────── */

interface SOAPNote {
  id: string;
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'SIGNED' | 'AMENDED' | 'ADDENDUM';
  createdAt: string;
  updatedAt: string;
  signedAt: string | null;
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    specialty: string | null;
    licenseNumber: string | null;
  };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    mrn: string;
  };
  session: {
    id: string;
    audioDuration: number | null;
    createdAt: string;
    appointment?: {
      id: string;
      title: string;
      type: string;
      startTime: string;
    };
  } | null;
}

interface AccessLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  timestamp: string;
  reason?: string;
}

/* ── Date locale map ────────────────────────────────────────────── */

const DATE_LOCALES: Record<string, typeof es> = { es, 'pt-BR': ptBR, pt: ptBR, en: enUS };

/* ── Status token mapping ───────────────────────────────────────── */

const STATUS_TOKEN: Record<string, { bg: string; fg: string; label: string }> = {
  DRAFT:          { bg: 'color-mix(in srgb, var(--text-tertiary) 12%, transparent)', fg: 'var(--text-tertiary)', label: 'statusDraftLabel' },
  PENDING_REVIEW: { bg: 'color-mix(in srgb, var(--severity-mild) 12%, transparent)', fg: 'var(--severity-mild)', label: 'statusPendingLabel' },
  SIGNED:         { bg: 'color-mix(in srgb, var(--severity-minimal) 12%, transparent)', fg: 'var(--severity-minimal)', label: 'statusSignedLabel' },
  AMENDED:        { bg: 'color-mix(in srgb, var(--channel-sms) 12%, transparent)', fg: 'var(--channel-sms)', label: 'statusAmendedLabel' },
  ADDENDUM:       { bg: 'color-mix(in srgb, var(--channel-inapp) 12%, transparent)', fg: 'var(--channel-inapp)', label: 'statusAddendumLabel' },
};

/* ── SOAP section colors ────────────────────────────────────────── */

const SOAP_SECTIONS = [
  { key: 'subjective',  letter: 'S', bg: 'color-mix(in srgb, var(--channel-sms) 8%, var(--surface-elevated))', accent: 'var(--channel-sms)' },
  { key: 'objective',   letter: 'O', bg: 'color-mix(in srgb, var(--severity-minimal) 8%, var(--surface-elevated))', accent: 'var(--severity-minimal)' },
  { key: 'assessment',  letter: 'A', bg: 'color-mix(in srgb, var(--channel-inapp) 8%, var(--surface-elevated))', accent: 'var(--channel-inapp)' },
  { key: 'plan',        letter: 'P', bg: 'color-mix(in srgb, var(--severity-moderate) 8%, var(--surface-elevated))', accent: 'var(--severity-moderate)' },
] as const;

/* ── Component ──────────────────────────────────────────────────── */

export default function RecordDetailPage() {
  const t = useTranslations('portal.records');
  const router = useRouter();
  const params = useParams();
  const recordId = (params?.id as string) || '';
  const reducedMotion = usePrefersReducedMotion();

  const locale = typeof window !== 'undefined' ? (document.documentElement.lang || 'en') : 'en';
  const dateLocale = DATE_LOCALES[locale] || enUS;

  const [record, setRecord] = useState<SOAPNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'fhir' | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [showAccessLog, setShowAccessLog] = useState(false);

  const fadeIn = reducedMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

  /* ── Fetch record ───────────────────────────────────────────── */

  const fetchRecord = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/portal/records/${recordId}`, {
        headers: { 'X-Access-Reason': 'patient_viewing_own_record' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('errorLoadingRecord'));
      if (data.success && data.data) setRecord(data.data);
      else throw new Error(t('notFound'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLoadingRecord'));
    } finally {
      setLoading(false);
    }
  }, [recordId, t]);

  /* ── Fetch access log ───────────────────────────────────────── */

  const fetchAccessLog = useCallback(async () => {
    try {
      setLoadingLog(true);
      const res = await fetch(`/api/portal/access-log?resourceId=${recordId}&limit=20`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setAccessLog(data.data.map((e: any) => ({
          id: e.id,
          userId: e.userId || e.actorId,
          userName: e.userName || e.actorName || 'Unknown',
          userRole: e.userRole || e.actorRole || 'Unknown',
          action: e.action || 'VIEW',
          timestamp: e.timestamp || e.createdAt,
          reason: e.reason || e.accessReason,
        })));
      }
    } catch {
      /* non-critical */
    } finally {
      setLoadingLog(false);
    }
  }, [recordId]);

  useEffect(() => { fetchRecord(); }, [fetchRecord]);

  /* ── Export PDF ─────────────────────────────────────────────── */

  const handleExportPDF = async () => {
    if (!record) return;
    setExporting('pdf');
    try {
      const res = await fetch(`/api/portal/records/${recordId}/pdf`);
      if (!res.ok) throw new Error(t('downloadError'));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `record-${record.patient.mrn}-${format(new Date(record.createdAt), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert(t('downloadError'));
    } finally {
      setExporting(null);
    }
  };

  /* ── Export FHIR ────────────────────────────────────────────── */

  const handleExportFHIR = async () => {
    if (!record) return;
    setExporting('fhir');
    try {
      const res = await fetch(`/api/portal/records/${recordId}/export`);
      if (!res.ok) throw new Error(t('downloadError'));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `record-fhir-${record.patient.mrn}-${format(new Date(record.createdAt), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert(t('downloadError'));
    } finally {
      setExporting(null);
    }
  };

  /* ── Toggle access log ──────────────────────────────────────── */

  const toggleAccessLog = () => {
    if (!showAccessLog) fetchAccessLog();
    setShowAccessLog(!showAccessLog);
  };

  /* ── Loading state ──────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-secondary)' }}>
        <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid var(--border-default)', borderTopColor: 'var(--channel-sms)', borderRadius: '50%' }} />
      </div>
    );
  }

  /* ── Error state ────────────────────────────────────────────── */

  if (error || !record) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--surface-secondary)', padding: 'var(--space-lg)' }}>
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.push('/portal/dashboard/records')}
            style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', minHeight: 'var(--touch-md)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 'var(--space-md)' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            {t('backToRecords')}
          </button>
          <div
            role="alert"
            style={{ background: 'color-mix(in srgb, var(--severity-critical) 8%, var(--surface-elevated))', border: '1px solid color-mix(in srgb, var(--severity-critical) 25%, transparent)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', textAlign: 'center' }}
          >
            <p style={{ color: 'var(--severity-critical)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>{error || t('notFound')}</p>
            <button
              onClick={fetchRecord}
              style={{ padding: 'var(--space-sm) var(--space-lg)', background: 'var(--text-primary)', color: 'var(--surface-primary)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', minHeight: 'var(--touch-md)' }}
            >
              {t('retryBtn')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusToken = STATUS_TOKEN[record.status] || STATUS_TOKEN.DRAFT;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-secondary)', color: 'var(--text-primary)' }}>
      <div className="max-w-4xl mx-auto" style={{ padding: 'var(--space-lg) var(--space-md)' }}>

        {/* Header */}
        <motion.div {...fadeIn}>
          <button
            onClick={() => router.push('/portal/dashboard/records')}
            style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', minHeight: 'var(--touch-md)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 'var(--space-md)' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            {t('backToRecords')}
          </button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div>
              <h1 style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, lineHeight: 'var(--leading-tight)', marginBottom: 'var(--space-xs)' }}>
                {t('recordDetail')}
              </h1>
              <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)' }}>
                {format(new Date(record.createdAt), 'PPPp', { locale: dateLocale })}
              </p>
              {/* Status badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  marginTop: 'var(--space-sm)',
                  padding: '4px var(--space-sm)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-caption)',
                  fontWeight: 600,
                  background: statusToken.bg,
                  color: statusToken.fg,
                }}
              >
                {t(statusToken.label)}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap" style={{ gap: 'var(--space-sm)' }}>
              {/* PDF export */}
              <button
                onClick={handleExportPDF}
                disabled={!!exporting}
                aria-label={t('exportPdf')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'var(--text-primary)',
                  color: 'var(--surface-primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-body)',
                  fontWeight: 600,
                  cursor: exporting ? 'wait' : 'pointer',
                  opacity: exporting === 'pdf' ? 0.6 : 1,
                  minHeight: 'var(--touch-md)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                {exporting === 'pdf' ? t('generatingPdf') : 'PDF'}
              </button>

              {/* FHIR export */}
              <button
                onClick={handleExportFHIR}
                disabled={!!exporting}
                aria-label="FHIR Export"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'var(--surface-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-body)',
                  fontWeight: 600,
                  cursor: exporting ? 'wait' : 'pointer',
                  opacity: exporting === 'fhir' ? 0.6 : 1,
                  minHeight: 'var(--touch-md)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                {exporting === 'fhir' ? '...' : 'FHIR'}
              </button>

              {/* Share */}
              <button
                onClick={() => setShowShare(true)}
                aria-label={t('share')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'var(--surface-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-body)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: 'var(--touch-md)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                {t('share')}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Patient & Clinician Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          {/* Patient */}
          <motion.div
            {...fadeIn}
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              boxShadow: 'var(--token-shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-body-lg)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
              {t('patientInfoTitle')}
            </h3>
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-body)' }}>
              <dt style={{ color: 'var(--text-tertiary)' }}>{t('nameLabel')}</dt>
              <dd style={{ fontWeight: 500 }}>{record.patient.firstName} {record.patient.lastName}</dd>
              <dt style={{ color: 'var(--text-tertiary)' }}>{t('mrnLabel')}</dt>
              <dd style={{ fontWeight: 500 }}>{record.patient.mrn}</dd>
              <dt style={{ color: 'var(--text-tertiary)' }}>{t('dobLabel')}</dt>
              <dd style={{ fontWeight: 500 }}>{format(new Date(record.patient.dateOfBirth), 'PPP', { locale: dateLocale })}</dd>
            </dl>
          </motion.div>

          {/* Clinician */}
          <motion.div
            {...fadeIn}
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              boxShadow: 'var(--token-shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-body-lg)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
              {t('clinicianInfoTitle')}
            </h3>
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-body)' }}>
              <dt style={{ color: 'var(--text-tertiary)' }}>{t('nameLabel')}</dt>
              <dd style={{ fontWeight: 500 }}>Dr. {record.clinician.firstName} {record.clinician.lastName}</dd>
              {record.clinician.specialty && (
                <>
                  <dt style={{ color: 'var(--text-tertiary)' }}>{t('specialtyLabel')}</dt>
                  <dd style={{ fontWeight: 500 }}>{record.clinician.specialty}</dd>
                </>
              )}
              {record.clinician.licenseNumber && (
                <>
                  <dt style={{ color: 'var(--text-tertiary)' }}>{t('licenseLabel')}</dt>
                  <dd style={{ fontWeight: 500 }}>{record.clinician.licenseNumber}</dd>
                </>
              )}
            </dl>
          </motion.div>
        </div>

        {/* Chief Complaint */}
        <motion.div
          {...fadeIn}
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
            boxShadow: 'var(--token-shadow-sm)',
          }}
        >
          <h3 style={{ fontSize: 'var(--text-body-lg)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
            {t('chiefComplaintTitle')}
          </h3>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
            {record.chiefComplaint || t('notSpecified')}
          </p>
        </motion.div>

        {/* SOAP Sections */}
        <div className="flex flex-col" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          {SOAP_SECTIONS.map((section, i) => {
            const content = record[section.key as keyof SOAPNote] as string;
            return (
              <motion.div
                key={section.key}
                {...fadeIn}
                {...(reducedMotion ? {} : { transition: { delay: i * 0.06, duration: 0.25 } })}
                style={{
                  background: section.bg,
                  border: `1px solid color-mix(in srgb, ${section.accent} 20%, transparent)`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-lg)',
                  boxShadow: 'var(--token-shadow-sm)',
                }}
              >
                <div className="flex items-center" style={{ gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: section.accent,
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 'var(--text-body-lg)',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {section.letter}
                  </span>
                  <h3 style={{ fontSize: 'var(--text-body-lg)', fontWeight: 600 }}>
                    {t(`${section.key}Title`)}
                  </h3>
                </div>
                <p
                  style={{
                    fontSize: 'var(--text-body)',
                    color: 'var(--text-secondary)',
                    lineHeight: 'var(--leading-relaxed)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {content || t('notAvailable')}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Metadata */}
        <motion.div
          {...fadeIn}
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-md)',
            boxShadow: 'var(--token-shadow-sm)',
          }}
        >
          <h3 style={{ fontSize: 'var(--text-body)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
            {t('metadataTitle')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'var(--space-md)', fontSize: 'var(--text-caption)' }}>
            <div>
              <span style={{ display: 'block', color: 'var(--text-tertiary)' }}>{t('created')}</span>
              <span style={{ fontWeight: 500 }}>{format(new Date(record.createdAt), 'Pp', { locale: dateLocale })}</span>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-tertiary)' }}>{t('updated')}</span>
              <span style={{ fontWeight: 500 }}>{format(new Date(record.updatedAt), 'Pp', { locale: dateLocale })}</span>
            </div>
            {record.signedAt && (
              <div>
                <span style={{ display: 'block', color: 'var(--text-tertiary)' }}>{t('signedAt')}</span>
                <span style={{ fontWeight: 500 }}>{format(new Date(record.signedAt), 'Pp', { locale: dateLocale })}</span>
              </div>
            )}
          </div>
          {record.session?.audioDuration && (
            <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)', fontSize: 'var(--text-caption)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>{t('recordingDuration')}</span>{' '}
              <span style={{ fontWeight: 500 }}>{Math.floor(record.session.audioDuration / 60)} {t('minutes')} {record.session.audioDuration % 60} {t('seconds')}</span>
            </div>
          )}
        </motion.div>

        {/* Access Log (CYRUS invariant) */}
        <motion.div {...fadeIn} style={{ marginBottom: 'var(--space-xl)' }}>
          <button
            onClick={toggleAccessLog}
            aria-expanded={showAccessLog}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: showAccessLog ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)',
              padding: 'var(--space-md) var(--space-lg)',
              cursor: 'pointer',
              fontSize: 'var(--text-body)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              minHeight: 'var(--touch-md)',
              boxShadow: 'var(--token-shadow-sm)',
            }}
          >
            <span className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              Who viewed this record
            </span>
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
              style={{ color: 'var(--text-tertiary)', transform: showAccessLog ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          <AnimatePresence>
            {showAccessLog && (
              <motion.div
                initial={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div
                  style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-default)',
                    borderTop: 'none',
                    borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                    padding: 'var(--space-md) var(--space-lg)',
                  }}
                >
                  {loadingLog ? (
                    <div className="animate-pulse flex flex-col gap-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} style={{ height: 36, background: 'var(--border-subtle)', borderRadius: 'var(--radius-sm)' }} />
                      ))}
                    </div>
                  ) : accessLog.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-body)', textAlign: 'center', padding: 'var(--space-lg) 0' }}>
                      No access records found
                    </p>
                  ) : (
                    <div role="list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      {accessLog.map((entry) => (
                        <div
                          key={entry.id}
                          role="listitem"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-md)',
                            padding: 'var(--space-sm) 0',
                            borderBottom: '1px solid var(--border-subtle)',
                            fontSize: 'var(--text-caption)',
                          }}
                        >
                          {/* Avatar initial */}
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'color-mix(in srgb, var(--channel-sms) 15%, transparent)',
                              color: 'var(--channel-sms)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 12,
                              flexShrink: 0,
                            }}
                            aria-hidden="true"
                          >
                            {entry.userName.charAt(0).toUpperCase()}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontWeight: 500 }}>{entry.userName}</span>
                            <span style={{ color: 'var(--text-tertiary)', marginLeft: 'var(--space-xs)' }}>({entry.userRole})</span>
                            {entry.reason && (
                              <span style={{ color: 'var(--text-tertiary)', marginLeft: 'var(--space-xs)' }}>— {entry.reason}</span>
                            )}
                          </div>
                          <time style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }} dateTime={entry.timestamp}>
                            {format(new Date(entry.timestamp), 'PP p', { locale: dateLocale })}
                          </time>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Share modal */}
      <ShareRecordModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        recordId={recordId}
        recordTitle={record.chiefComplaint || t('recordDetail')}
      />
    </div>
  );
}
