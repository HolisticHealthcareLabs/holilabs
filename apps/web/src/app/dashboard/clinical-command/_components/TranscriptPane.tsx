'use client';

import { motion } from 'framer-motion';
import { HeartPulse, XCircle, Loader2, Shield, ShieldCheck } from 'lucide-react';
import { maskPHI, PHI_TOKEN_REGEX } from '@/lib/deid';
import { useTranscriptAudio, type AudioLanguage } from './useTranscriptAudio';
import { AudioWaveform } from './AudioWaveform';
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
          className="bg-cyan-900/30 text-cyan-400 rounded px-1 text-[11px] font-semibold font-sans not-italic"
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
  return (
    <motion.button
      onClick={onToggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label={isMuted ? 'Unmute audio playback' : 'Mute audio playback'}
      aria-pressed={isMuted}
      title={isMuted ? 'Audio muted — click to unmute' : 'Audio on — click to mute'}
      className={`
        flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
        text-base transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
        ${isMuted
          ? 'text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700/40'
          : 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/25 hover:bg-cyan-100 dark:hover:bg-cyan-500/20'
        }
      `}
    >
      {/* Unicode speaker symbols — universally supported, no icon import needed */}
      <span aria-hidden="true" className="leading-none select-none">
        {isMuted ? '🔇' : '🔊'}
      </span>
    </motion.button>
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
  disabled,
  audioLanguage = 'en',
  consentRecord,
  onGrantConsent,
  onRevokeConsent,
  volume = 0,
}: TranscriptPaneProps) {
  const consentMissing = !consentRecord.timestamp;
  const buttonDisabled = disabled || isFinalizing || consentMissing;
  // Ambient audio playback: reads each chunk aloud, Doctor vs Patient voices
  const { isMuted, toggleMute, isSupported } = useTranscriptAudio({
    segments,
    language: audioLanguage,
    active:   isRecording,
  });

  return (
    <div className="
      flex flex-col h-full rounded-2xl p-5 gap-4 overflow-hidden
      bg-white dark:bg-slate-800/40
      border border-slate-200 dark:border-slate-700/60
    ">
      {/* Header row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider
                         text-slate-500 dark:text-slate-400">
            Live Meeting Notes
          </h2>
          {isRecording && (
            <div className="flex items-center gap-3">
              <motion.span
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="flex items-center gap-1 text-[10px] font-bold
                           text-red-500 dark:text-red-400
                           bg-red-50 dark:bg-red-400/10
                           px-2 py-0.5 rounded-full border border-red-200 dark:border-red-500/20"
                aria-label="Recording"
              >
                <span className="w-1.5 h-1.5 bg-red-500 dark:bg-red-400 rounded-full" />
                REC
              </motion.span>
              <AudioWaveform isRecording={isRecording} volume={volume} />
            </div>
          )}
          {isFinalizing && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 text-[10px] font-bold
                         text-amber-600 dark:text-amber-400
                         bg-amber-50 dark:bg-amber-400/10
                         px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20"
              aria-label="Finalizing audio"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              FINALIZING
            </motion.span>
          )}
        </div>

      </div>

      {/* Scrollable transcript area */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Live transcript"
        className="flex-1 overflow-y-auto min-h-0 text-sm leading-relaxed
                   text-slate-700 dark:text-slate-300
                   font-mono whitespace-pre-wrap"
      >
        {segments.length === 0 ? (
          <p className="text-sm not-italic font-sans
                        text-slate-400 dark:text-slate-600 italic">
            {disabled
              ? 'Select a patient above to begin recording.'
              : consentMissing
                ? 'Grant patient consent below to enable recording.'
                : isRecording
                  ? 'Awaiting transcription...'
                  : 'Press Start Recording to begin the live transcript.'}
          </p>
        ) : (
          <>
            {segments.map((seg, i) =>
              seg.kind === 'text' ? (
                <span key={i}>{renderMasked(seg.text)}</span>
              ) : (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18 }}
                  className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded
                             bg-cyan-100 dark:bg-cyan-900/40
                             text-cyan-700 dark:text-cyan-400
                             border border-cyan-300 dark:border-cyan-500/30
                             text-[11px] font-sans font-semibold not-italic"
                  title={`PHI de-identified: ${seg.label}`}
                >
                  [{seg.label}]
                </motion.span>
              )
            )}
          </>
        )}
      </div>

      {/* LGPD / HIPAA Consent Gate (RUTH: immutable audit heuristic) */}
      <div
        className={`
          flex-shrink-0 rounded-xl p-3.5 transition-colors duration-300
          border
          ${consentRecord.granted
            ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5'
            : 'border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5'
          }
        `}
        role="region"
        aria-label="Patient consent control"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {consentRecord.granted ? (
              <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            ) : (
              <Shield className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            )}
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Recording Authorization
              </p>
              {consentRecord.timestamp ? (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                  Authorized at {new Date(consentRecord.timestamp).toLocaleTimeString()} via {consentRecord.method}
                </p>
              ) : (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                  Patient authorization is required prior to audio capture
                </p>
              )}
            </div>
          </div>

          {consentRecord.granted ? (
            <button
              onClick={onRevokeConsent}
              disabled={isRecording}
              className="
                text-[10px] font-semibold px-2.5 py-1 rounded-lg
                text-red-500 dark:text-red-400
                bg-red-50 dark:bg-red-500/10
                border border-red-200 dark:border-red-500/25
                hover:bg-red-100 dark:hover:bg-red-500/20
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400
              "
              aria-label="Revoke patient consent"
            >
              Revoke
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onGrantConsent('verbal')}
                className="
                  text-[10px] font-semibold px-2.5 py-1 rounded-lg
                  text-emerald-700 dark:text-emerald-400
                  bg-emerald-50 dark:bg-emerald-500/10
                  border border-emerald-200 dark:border-emerald-500/25
                  hover:bg-emerald-100 dark:hover:bg-emerald-500/20
                  transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
                "
                aria-label="Record verbal patient consent"
              >
                Verbal
              </button>
              <button
                onClick={() => onGrantConsent('digital')}
                className="
                  text-[10px] font-semibold px-2.5 py-1 rounded-lg
                  text-emerald-700 dark:text-emerald-400
                  bg-emerald-50 dark:bg-emerald-500/10
                  border border-emerald-200 dark:border-emerald-500/25
                  hover:bg-emerald-100 dark:hover:bg-emerald-500/20
                  transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
                "
                aria-label="Record digital patient consent"
              >
                Digital
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Button row: Record/Stop + Audio toggle */}
      <div className="flex-shrink-0 relative">
        {/* Tooltip overlay when consent is missing */}
        {consentMissing && !disabled && (
          <div
            className="
              absolute -top-8 left-1/2 -translate-x-1/2 z-10
              px-3 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap
              bg-amber-100 dark:bg-amber-900/80
              text-amber-700 dark:text-amber-300
              border border-amber-200 dark:border-amber-600/40
              shadow-sm
            "
            role="tooltip"
          >
            Awaiting Patient Authorization
          </div>
        )}

        <div className="flex gap-2">
          <motion.button
            onClick={onToggleRecord}
            disabled={buttonDisabled}
            whileHover={!buttonDisabled ? { scale: 1.02 } : {}}
            whileTap={!buttonDisabled ? { scale: 0.97 } : {}}
            className={`
              flex-1 flex items-center justify-center gap-2.5
              py-3 rounded-xl text-sm font-semibold transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
              focus-visible:ring-offset-2
              focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900
              ${consentMissing && !disabled
                ? 'bg-slate-100 dark:bg-slate-700/30 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700/40 opacity-40 cursor-not-allowed pointer-events-none'
                : buttonDisabled
                  ? 'bg-slate-100 dark:bg-slate-700/30 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700/40 cursor-not-allowed'
                  : isRecording
                    ? 'bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                    : 'bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30'
              }
            `}
            aria-label={
              consentMissing ? 'Recording locked: authorization required' :
              isFinalizing   ? 'Finalizing audio' :
              isRecording    ? 'Stop recording'   : 'Start recording'
            }
            aria-pressed={isRecording}
          >
            {isFinalizing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing...</>
            ) : isRecording ? (
              <><XCircle className="w-4 h-4" /> Stop Recording</>
            ) : (
              <><HeartPulse className="w-4 h-4" /> Start Recording</>
            )}
          </motion.button>

          {/* Speaker toggle: only rendered when Web Speech API is available */}
          {isSupported && (
            <AudioToggleButton isMuted={isMuted} onToggle={toggleMute} />
          )}
        </div>
      </div>
    </div>
  );
}
