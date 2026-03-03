'use client';

import React, { useState } from 'react';
import type { CDSAlert } from '@/lib/cds/types';

interface AttestationSimProps {
  alert: CDSAlert;
  onClose: () => void;
}

const OVERRIDE_REASON_CODES = [
  { code: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE', label: 'Clinical Judgment — Palliative Care' },
  { code: 'PATIENT_DECLINED_ALTERNATIVE', label: 'Patient Declined Alternative' },
  { code: 'CONTRAINDICATION_UNAVOIDABLE', label: 'Contraindication Unavoidable' },
  { code: 'TIME_CRITICAL_EMERGENCY', label: 'Time-Critical Emergency' },
  { code: 'DOCUMENTED_TOLERANCE', label: 'Documented Tolerance (prior safe use)' },
  { code: 'OTHER_DOCUMENTED', label: 'Other (must document below)' },
] as const;

type SimState = 'form' | 'submitted';

export function AttestationSim({ alert, onClose }: AttestationSimProps) {
  const [state, setState] = useState<SimState>('form');
  const [reasonCode, setReasonCode] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonCode) return;
    setState('submitted');
  };

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.08] shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-red-900">
            Override Request — Safety Alert
          </h3>
          <p className="text-[13px] text-red-700 mt-0.5">
            {alert.summary}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-red-400 hover:text-red-600 transition-colors p-1"
          aria-label="Close override panel"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {state === 'form' ? (
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Reason code selector */}
          <div>
            <label htmlFor="override-reason" className="block text-[13px] font-semibold text-[#1d1d1f] mb-2">
              Override Reason (required)
            </label>
            <select
              id="override-reason"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full rounded-lg border border-black/[0.12] bg-white px-3 py-2.5 text-[14px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
              required
              aria-required="true"
            >
              <option value="">Select a reason code...</option>
              {OVERRIDE_REASON_CODES.map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Clinical notes */}
          <div>
            <label htmlFor="override-notes" className="block text-[13px] font-semibold text-[#1d1d1f] mb-2">
              Clinical Notes
            </label>
            <textarea
              id="override-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Document clinical rationale for override..."
              className="w-full rounded-lg border border-black/[0.12] bg-white px-3 py-2.5 text-[14px] text-[#1d1d1f] placeholder-[#a1a1a6] resize-none focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
            />
          </div>

          {/* Warning */}
          <div className="flex gap-2 p-3 bg-amber-50 rounded-lg ring-1 ring-amber-200">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="text-amber-500 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-[12px] text-amber-800 leading-relaxed">
              Overrides are logged to the governance audit trail. The CMO will review this decision within 24 hours.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!reasonCode}
            className="w-full rounded-lg bg-red-600 text-white text-[14px] font-semibold py-3 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            Submit Override Attestation
          </button>
        </form>
      ) : (
        /* Submitted — mock audit trail */
        <div className="p-6 space-y-5">
          {/* Success badge */}
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg ring-1 ring-emerald-200">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="text-emerald-600 flex-shrink-0">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <p className="text-[14px] font-medium text-emerald-800">
              Override recorded (demo simulation)
            </p>
          </div>

          {/* Governance audit card */}
          <div className="bg-[#f5f5f7] rounded-xl p-5 ring-1 ring-black/[0.06]">
            <h4 className="text-[13px] font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-[#6e6e73]">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Governance Audit Trail
            </h4>
            <div className="space-y-2 text-[13px]">
              <AuditRow label="Override ID" value={`OVR-DEMO-${Date.now().toString(36).toUpperCase()}`} />
              <AuditRow label="Alert" value={alert.summary} />
              <AuditRow
                label="Reason"
                value={OVERRIDE_REASON_CODES.find((r) => r.code === reasonCode)?.label ?? reasonCode}
              />
              {notes && <AuditRow label="Notes" value={notes} />}
              <AuditRow label="Clinician" value="Dr. Demo Clinician" />
              <AuditRow label="Timestamp" value={new Date().toISOString()} />
              <AuditRow label="CMO Review" value="Flagged for review within 24h" highlight />
              <AuditRow label="Compliance" value="FDA 21 CFR Part 11, HIPAA Audit Trail" />
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-lg bg-[#1d1d1f] text-white text-[14px] font-semibold py-3 hover:bg-[#333] transition-colors active:scale-[0.99]"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

function AuditRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[#6e6e73] flex-shrink-0">{label}</span>
      <span className={`text-right ${highlight ? 'text-amber-600 font-medium' : 'text-[#1d1d1f]'}`}>
        {value}
      </span>
    </div>
  );
}
