'use client';

import { FileText, Save } from 'lucide-react';
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// Temporal SOAP alignment
//
// Each threshold maps to the exact TRANSCRIPT_CHUNKS index at which the
// relevant clinical data first appears in the live transcript:
//
//  S — Subjective  chunk  5  Patient describes chief complaint ("five days...")
//  O — Objective   chunk 10  Doctor reads vitals (BP 162/95, SpO2 93%...)
//  A — Assessment  chunk 14  Doctor gives clinical impression (S3 gallop, CHF...)
//  P — Plan        chunk 15  Doctor orders tests (ECG, Troponin, BNP...)
//
// Sections below their threshold show "Listening…" — a live indicator that
// tells the doctor exactly which section the AI is currently populating.
// ─────────────────────────────────────────────────────────────────────────────

export const SOAP_THRESHOLDS = { S: 5, O: 10, A: 14, P: 15 } as const;

const CONTENT = {
  S: 'Patient reports precordial pain for 3 days, radiating to the left arm, with cold sweats. Worsens with physical exertion.',
  O: 'BP: 162/95 mmHg · HR: 94 bpm · SpO2: 93% · ECG: ordered urgent · BNP: pending · Troponin I: pending',
  A: 'Acute decompensated heart failure (primary) · Possible ACS given family history. Risk factors: CKD Stage 3, T2DM, HTN, dyslipidemia.',
  P: '1. Urgent 12-lead ECG + Troponin I series\n2. BNP, CMP, chest X-ray stat\n3. IV Furosemide 80 mg — hold oral Metformin\n4. Cardiology consult · return in 48 h or SOS',
};

// ─────────────────────────────────────────────────────────────────────────────
// SoapField — individual S/O/A/P section with three visual states:
//   • unlocked = false → "Listening…" pulse dot (section not yet spoken)
//   • unlocked = true  → fade-in content text
// ─────────────────────────────────────────────────────────────────────────────

interface SoapFieldProps {
  label:    string;
  color:    string;
  content:  string;
  unlocked: boolean;
}

function SoapField({ label, color, content, unlocked }: SoapFieldProps) {
  return (
    <div className="flex flex-col">
      <span className={`text-sm font-extrabold uppercase tracking-widest flex-shrink-0 pb-1.5 leading-none ${color}`}>
        {label}
      </span>

      {unlocked ? (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="text-xs leading-relaxed whitespace-pre-line mt-1.5 text-slate-700 dark:text-slate-300"
        >
          {content}
        </motion.p>
      ) : (
        /* "Listening…" state — shown before this section's transcript is spoken */
        <div className="flex items-center gap-2 mt-1 py-0.5" aria-hidden="true">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-[11px] text-slate-400 dark:text-slate-600 italic select-none">
            Listening…
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SoapNotePane
// ─────────────────────────────────────────────────────────────────────────────

interface SoapNotePaneProps {
  segmentCount:    number;
  patientSelected: boolean;
  /** Opens the billing modal — wired from page.tsx. */
  onSignAndBill:   () => void;
}

export function SoapNotePane({ segmentCount, patientSelected, onSignAndBill }: SoapNotePaneProps) {
  const isPopulating = segmentCount > 0;
  const canSign      = patientSelected && segmentCount > 0;

  return (
    <div className="
      rounded-2xl p-4 flex flex-col gap-3 overflow-hidden h-full
      bg-white dark:bg-slate-800/40
      border border-slate-200 dark:border-slate-700/60
    ">
      {/* Header */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <h2 className="text-xs font-semibold uppercase tracking-wider
                       text-slate-500 dark:text-slate-400">
          SOAP Note
        </h2>
        {!isPopulating && (
          <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-600">
            Awaiting transcript…
          </span>
        )}
        {isPopulating && (
          <span className="ml-auto text-[10px] font-medium text-cyan-600 dark:text-cyan-500/70">
            Auto-fill active
          </span>
        )}
      </div>

      {/* SOAP fields — scrollable, fill remaining height */}
      <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-5 pb-2">
        <SoapField
          label="S — Subjective"
          color="text-cyan-600 dark:text-cyan-500"
          content={CONTENT.S}
          unlocked={segmentCount >= SOAP_THRESHOLDS.S}
        />
        <SoapField
          label="O — Objective"
          color="text-emerald-600 dark:text-emerald-500"
          content={CONTENT.O}
          unlocked={segmentCount >= SOAP_THRESHOLDS.O}
        />
        <SoapField
          label="A — Assessment"
          color="text-amber-600 dark:text-amber-500"
          content={CONTENT.A}
          unlocked={segmentCount >= SOAP_THRESHOLDS.A}
        />
        <SoapField
          label="P — Plan"
          color="text-rose-600 dark:text-rose-500"
          content={CONTENT.P}
          unlocked={segmentCount >= SOAP_THRESHOLDS.P}
        />
      </div>
      </div>

      {/* Sign & Bill */}
      <motion.button
        onClick={onSignAndBill}
        disabled={!canSign}
        whileHover={canSign ? { scale: 1.02 } : {}}
        whileTap={canSign ? { scale: 0.97 } : {}}
        aria-label="Sign and bill this encounter"
        className={`
          flex-shrink-0 w-full flex items-center justify-center gap-2.5
          py-2.5 rounded-xl text-sm font-semibold transition-all
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
          focus-visible:ring-offset-2
          focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900
          ${canSign
            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white shadow-md shadow-cyan-500/20'
            : 'bg-slate-100 dark:bg-slate-700/30 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700/40 cursor-not-allowed'
          }
        `}
        title={
          !patientSelected  ? 'Select a patient first'
          : segmentCount === 0 ? 'Start recording to generate SOAP note'
          : 'Sign and bill this encounter'
        }
      >
        <Save className="w-4 h-4" />
        Sign &amp; Bill
      </motion.button>
    </div>
  );
}
