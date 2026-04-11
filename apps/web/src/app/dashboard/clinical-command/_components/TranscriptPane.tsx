'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { XCircle, Shield, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { maskPHI, PHI_TOKEN_REGEX } from '@/lib/deid';
// useTranscriptAudio removed — TTS playback deleted per MVP session
type AudioLanguage = 'en' | 'es' | 'pt';
import type { ConsentRecord } from '../../../../../../../packages/shared-kernel/src/types/clinical-ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'phi';  label: string };

interface TranscriptPaneProps {
  segments:       Segment[];
  isRecording:    boolean;
  /** True when the FSM is in 'finalizing_audio' (tail delay active). */
  isFinalizing?:  boolean;
  onToggleRecord: () => void;
  /** Run a demo conversation for prospects testing the app */
  onRunDemo?:     () => void;
  /** Record button is locked until the doctor selects a patient. */
  disabled:       boolean;
  /** BCP-47 language for the audio playback engine. Default: 'en'. */
  audioLanguage?: AudioLanguage;
  /** LGPD consent state: microphone is hard-gated until timestamp exists. */
  consentRecord: ConsentRecord;
  onGrantConsent: (method: 'verbal' | 'digital') => void;
  onRevokeConsent: () => void;
  /** Volume level from 0 to 1 for the waveform visualizer */
  volume?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHI-safe text renderer with speaker color-coding
//
// Pipeline:
//   1. maskPHI()        — redacts PII, returns token-annotated string
//   2. split PHI tokens — renders them as cyan pills
//   3. split speakers   — colors "Doctor:" cyan-500, "Patient:" emerald-500
//      keeping dialogue text in the default slate color (no visual fatigue)
//
// No dangerouslySetInnerHTML used anywhere in this pipeline.
// ─────────────────────────────────────────────────────────────────────────────

/** Regex that captures speaker prefixes as split delimiters. */
const SPEAKER_REGEX = /(Doctor:|Patient:)/g;

const SPEAKER_STYLES: Record<string, string> = {
  'Doctor:':  'text-cyan-500 dark:text-cyan-400 font-semibold not-italic font-sans',
  'Patient:': 'text-emerald-500 dark:text-emerald-400 font-semibold not-italic font-sans',
};

function renderMasked(text: string): JSX.Element[] {
  const masked = maskPHI(text);
  const phiParts = masked.split(PHI_TOKEN_REGEX);
  const output: JSX.Element[] = [];
  let keyIdx = 0;

  for (const part of phiParts) {
    if (PHI_TOKEN_REGEX.test(part)) {
      // PHI de-identification pill
      output.push(
        <span
          key={keyIdx++}
          className="bg-cyan-900/30 text-cyan-400 px-1 text-[11px] font-semibold font-sans not-italic"
          style={{ borderRadius: 'var(--radius-md)' }}
          title={`PHI masked: ${part}`}
        >
          {part}
        </span>
      );
    } else {
      // Color-code speaker prefixes; leave dialogue text in default color
      const speakerParts = part.split(SPEAKER_REGEX);
      for (const sp of speakerParts) {
        const speakerClass = SPEAKER_STYLES[sp];
        if (speakerClass) {
          output.push(
            <span key={keyIdx++} className={speakerClass}>{sp}</span>
          );
        } else {
          output.push(<span key={keyIdx++}>{sp}</span>);
        }
      }
    }
  }

  return output;
}

// ─────────────────────────────────────────────────────────────────────────────
// AudioToggleButton — speaker mute/unmute icon
//
// Uses Unicode speaker symbols rendered in a styled button to avoid
// lucide-react icon availability concerns in this TypeScript configuration.
// ─────────────────────────────────────────────────────────────────────────────

function AudioToggleButton({
  isMuted,
  onToggle,
}: {
  isMuted: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('portal.transcriptPane');
  return (
    <m.button
      onClick={onToggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label={isMuted ? t('unmuteAudio') : t('muteAudio')}
      aria-pressed={isMuted}
      title={isMuted ? t('audioMuted') : t('audioOn')}
      className={`
        flex-shrink-0 w-8 h-8 flex items-center justify-center
        text-base transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
        ${isMuted
          ? 'text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700/40'
          : 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/25 hover:bg-cyan-100 dark:hover:bg-cyan-500/20'
        }
      `}
      style={{ borderRadius: 'var(--radius-lg)' }}
    >
      {/* Unicode speaker symbols — universally supported, no icon import needed */}
      <span aria-hidden="true" className="leading-none select-none">
        {isMuted ? '🔇' : '🔊'}
      </span>
    </m.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function TranscriptPane({
  segments,
  isRecording,
  isFinalizing = false,
  onToggleRecord,
  onRunDemo,
  disabled,
  audioLanguage = 'en',
  consentRecord,
  onGrantConsent,
  onRevokeConsent,
  volume = 0,
}: TranscriptPaneProps) {
  const t = useTranslations('portal.transcriptPane');
  const consentMissing = !consentRecord.timestamp;
  const [showVerbalPrompt, setShowVerbalPrompt] = useState(false);
  const [consentBannerHidden, setConsentBannerHidden] = useState(false);

  // Auto-hide the consent banner 11.11s after consent is granted
  useEffect(() => {
    if (consentRecord.granted) {
      const timer = setTimeout(() => setConsentBannerHidden(true), 11110);
      return () => clearTimeout(timer);
    }
    setConsentBannerHidden(false);
  }, [consentRecord.granted]);

  // Show verbal consent prompt for 15s after verbal consent is granted, then fade
  useEffect(() => {
    if (consentRecord.method === 'verbal' && consentRecord.granted && !isRecording) {
      setShowVerbalPrompt(true);
      const timer = setTimeout(() => setShowVerbalPrompt(false), 15000);
      return () => clearTimeout(timer);
    }
    setShowVerbalPrompt(false);
  }, [consentRecord.method, consentRecord.granted, isRecording]);
  const buttonDisabled = disabled || isFinalizing || consentMissing;
  // TTS playback removed — useTranscriptAudio hook no longer called

  return (
    <div className="
      flex flex-col h-full px-4 pt-2.5 pb-2 gap-2 overflow-hidden
    " style={{ backgroundColor: 'var(--surface-primary)' }}>
      {/* Header row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}>
            {t('liveMeetingNotes')}
          </h2>
          {isRecording && (
            <div className="flex items-center gap-3">
              <m.span
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="flex items-center gap-1 text-[10px] font-bold
                           px-2 py-0.5 border border-red-200 dark:border-red-500/20"
                style={{ color: 'var(--text-danger)', backgroundColor: 'var(--surface-danger)', borderRadius: 'var(--radius-full)' }}
                aria-label="Recording"
              >
                <span className="w-1.5 h-1.5 bg-red-500 dark:bg-red-400" style={{ borderRadius: 'var(--radius-full)' }} />
                REC
              </m.span>
              {/* Waveform removed — TTS playback deleted per MVP session */}
            </div>
          )}
          {isFinalizing && (
            <m.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 text-[10px] font-bold
                         text-amber-600 dark:text-amber-400
                         px-2.5 py-0.5 border border-amber-200 dark:border-amber-500/20"
              style={{ backgroundColor: 'var(--surface-warning)', borderRadius: 'var(--radius-full)' }}
              aria-label="Finalizing audio"
            >
              <m.span
                className="w-1.5 h-1.5 bg-amber-500 dark:bg-amber-400 flex-shrink-0"
                style={{ borderRadius: 'var(--radius-full)' }}
                animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              FINALIZING
            </m.span>
          )}
        </div>

      </div>

      {/* Scrollable transcript area */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Live transcript"
        className="flex-1 overflow-y-auto min-h-0 text-[13px] leading-relaxed
                   whitespace-pre-wrap"
        style={{ color: 'var(--text-secondary)' }}
      >
        {segments.length === 0 ? (
          <p className="text-sm not-italic font-sans italic"
             style={{ color: 'var(--text-muted)' }}>
            {disabled
              ? t('selectPatient')
              : consentMissing
                ? t('grantConsent')
                : isRecording
                  ? t('awaitingTranscription')
                  : t('pressStart')}
          </p>
        ) : (
          <>
            {segments.map((seg, i) =>
              seg.kind === 'text' ? (
                <span key={i}>{renderMasked(seg.text)}</span>
              ) : (
                <m.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18 }}
                  className="inline-flex items-center mx-0.5 px-1.5 py-0.5
                             bg-cyan-100 dark:bg-cyan-900/40
                             text-cyan-700 dark:text-cyan-400
                             border border-cyan-300 dark:border-cyan-500/30
                             text-[11px] font-sans font-semibold not-italic"
                  style={{ borderRadius: 'var(--radius-md)' }}
                  title={`PHI de-identified: ${seg.label}`}
                >
                  [{seg.label}]
                </m.span>
              )
            )}
          </>
        )}
      </div>

      {/* LGPD / HIPAA Consent Gate (RUTH: immutable audit heuristic) */}
      {!(consentRecord.granted && consentBannerHidden) && (
      <div
        className={`
          flex-shrink-0 p-3.5 transition-all duration-700
          border
          ${consentRecord.granted
            ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5'
            : 'border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5'
          }
        `}
        style={{ borderRadius: 'var(--radius-xl)' }}
        role="region"
        aria-label="Patient consent control"
      >
        <div className="space-y-2">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {consentRecord.granted ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              ) : (
                <Shield className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              )}
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {t('recordingAuthorization')}
                </p>
                {consentRecord.timestamp ? (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                    {t('authorizedAt', { time: new Date(consentRecord.timestamp).toLocaleTimeString(), method: consentRecord.method })}
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                    {t('authorizationRequired')}
                  </p>
                )}
              </div>
            </div>
            {consentRecord.granted && (
              <button
                onClick={onRevokeConsent}
                disabled={isRecording}
                className="text-[10px] font-semibold px-2.5 py-1 border border-red-200 dark:border-red-500/25 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ borderRadius: 'var(--radius-lg)', color: 'var(--text-danger)', backgroundColor: 'var(--surface-danger)' }}
                aria-label={t('revoke')}
              >
                {t('revoke')}
              </button>
            )}
          </div>

          {/* Verbal | Digital — thin horizontal bar */}
          {!consentRecord.granted && (
            <div className="flex border border-emerald-200 dark:border-emerald-500/25 overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
              <button
                onClick={() => onGrantConsent('verbal')}
                className="flex-1 text-[11px] font-semibold py-1.5 text-center text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors border-r border-emerald-200 dark:border-emerald-500/25"
              >
                {t('verbal')}
              </button>
              <button
                onClick={() => onGrantConsent('digital')}
                className="flex-1 text-[11px] font-semibold py-1.5 text-center text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
              >
                {t('digital')}
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Verbal consent prompt — auto-fades after 15 seconds */}
      <AnimatePresence>
        {showVerbalPrompt && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex-shrink-0 p-3 border border-blue-200 dark:border-blue-500/20"
            style={{ borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--surface-accent)' }}
          >
            <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1.5">
              Verbal Informed Consent
            </p>
            <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed italic">
              &ldquo;I am informing you that this consultation will be recorded for documentation purposes. The recording will be used solely for your medical records and clinical decision support. You may revoke consent at any time. Do you agree to proceed?&rdquo;
            </p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-2">
              Confirm patient&apos;s verbal agreement, then press Record to begin.
            </p>
          </m.div>
        )}
      </AnimatePresence>

      {/* Button row: Record/Stop + Audio toggle */}
      <div className="flex-shrink-0 relative">
        {/* Tooltip overlay when consent is missing */}
        {consentMissing && !disabled && (
          <div
            className="
              absolute -top-8 left-1/2 -translate-x-1/2 z-10
              px-3 py-1 text-[10px] font-semibold whitespace-nowrap
              text-amber-700 dark:text-amber-300
              border border-amber-200 dark:border-amber-600/40
            "
            style={{ borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--surface-warning)', boxShadow: 'var(--token-shadow-sm)' }}
            role="tooltip"
          >
            {t('awaitingAuthorization')}
          </div>
        )}

        <div className="flex gap-2">
          <m.button
            layout
            onClick={onToggleRecord}
            disabled={buttonDisabled}
            whileHover={!buttonDisabled ? { scale: 1.02 } : {}}
            whileTap={!buttonDisabled ? { scale: 0.97 } : {}}
            className={`
              flex-1 flex items-center justify-center gap-2.5
              py-3 text-sm font-semibold transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
              focus-visible:ring-offset-2
              focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900
              ${consentMissing && !disabled
                ? 'bg-slate-100 dark:bg-slate-700/30 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700/40 opacity-40 cursor-not-allowed pointer-events-none'
                : buttonDisabled
                  ? 'bg-slate-100 dark:bg-slate-700/30 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700/40 cursor-not-allowed'
                  : isRecording
                    ? 'bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                    : 'bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-500 text-white border border-red-600 dark:border-red-500 shadow-red-500/20'
              }
            `}
            style={{ borderRadius: 'var(--radius-xl)', ...((!consentMissing || disabled) && !buttonDisabled && !isRecording ? { boxShadow: 'var(--token-shadow-lg)' } : {}) }}
            transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
            aria-label={
              consentMissing ? t('recordingLocked') :
              isFinalizing   ? t('finalizingAudio') :
              isRecording    ? t('stopRecording')   : t('startRecording')
            }
            aria-pressed={isRecording}
          >
            {isFinalizing ? (
              <>
                <m.span
                  className="w-2 h-2 bg-amber-500 dark:bg-amber-400"
                  style={{ borderRadius: 'var(--radius-full)' }}
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                {t('finalizing')}
              </>
            ) : isRecording ? (
              <><XCircle className="w-4 h-4" /> {t('stopRecording')}</>
            ) : (
              <><span className="w-3 h-3 rounded-full bg-red-500" /> {t('startRecording')}</>
            )}
          </m.button>

          {/* Run Demo — slides out smoothly when recording starts */}
          <AnimatePresence>
            {onRunDemo && !isRecording && !isFinalizing && (
              <m.button
                initial={{ opacity: 1, width: 'auto', marginLeft: 0 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0, paddingLeft: 0, paddingRight: 0, overflow: 'hidden' }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                whileTap={{ scale: 0.97 }}
                onClick={onRunDemo}
                disabled={disabled}
                className="
                  flex items-center justify-center gap-2 py-2.5
                  text-[13px] font-semibold transition-colors flex-1
                  bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20
                  text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30
                  disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap
                "
                style={{ borderRadius: 'var(--radius-xl)' }}
                aria-label="Run demo conversation"
              >
                <span className="text-base">▶</span> Run Demo
              </m.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
