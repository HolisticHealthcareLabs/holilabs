'use client';

import { useState } from 'react';
import {
  Heart, AlertTriangle, Activity, FileText,
  Users, Stethoscope, ChevronDown, ChevronRight,
  CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
const Pill = Activity;
const Syringe = Stethoscope;
const FlaskConical = Activity;
const FlaskRound = Activity;
import type { FacesheetData } from '../_data/demo-facesheet';
import type { VitalsBatch } from './useVitalsDetector';

interface HistoryTabProps {
  facesheet: FacesheetData;
  pendingBatch: VitalsBatch;
  onAcceptAll: () => void;
  onDismiss: () => void;
  onToggleItem: (id: string) => void;
  onUndo: () => void;
  canUndo: boolean;
}

/* ── Collapsible section shell ─────────────────────────────────────────────── */
function Section({
  title,
  icon: Icon,
  count,
  defaultOpen = true,
  accent = 'text-cyan-400',
  children,
}: {
  title: string;
  icon: React.ElementType;
  count?: number;
  defaultOpen?: boolean;
  accent?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.04]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <Icon className={`w-3.5 h-3.5 ${accent} shrink-0`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 flex-1">
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/[0.06] text-gray-400">
            {count}
          </span>
        )}
        {open ? (
          <ChevronDown className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-500" />
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

/* ── Severity badge ──────────────────────────────────────────────────────── */
function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    severe: 'bg-red-500',
    high: 'bg-red-500',
    moderate: 'bg-amber-500',
    mild: 'bg-emerald-500',
    active: 'bg-red-400',
    chronic: 'bg-amber-400',
    resolved: 'bg-emerald-400',
    critical: 'bg-red-500',
    low: 'bg-blue-400',
    normal: 'bg-emerald-400',
    completed: 'bg-emerald-400',
    due: 'bg-amber-400',
    overdue: 'bg-red-400',
  };
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${colors[severity] || 'bg-gray-500'}`}
    />
  );
}

/* ── Main HistoryTab ─────────────────────────────────────────────────────── */
export function HistoryTab({
  facesheet,
  pendingBatch,
  onAcceptAll,
  onDismiss,
  onToggleItem,
  onUndo,
  canUndo,
}: HistoryTabProps) {
  const {
    demographics,
    problems,
    medications,
    allergies,
    vitals,
    familyHistory,
    socialHistory,
    labResults,
    immunizations,
    surgicalHistory,
  } = facesheet;

  const batch = pendingBatch ?? { items: [], detectedAt: null };

  return (
    <div className="h-full overflow-y-auto text-[12px] leading-relaxed">
      {/* ── Pending vitals batch (ambient detection) ──────────────────── */}
      {batch.items.length > 0 && (
        <div className="mx-2 mt-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Detected Vitals
            </span>
            <div className="flex gap-1.5">
              {canUndo && (
                <button onClick={onUndo} className="text-[10px] text-gray-400 hover:text-white transition-colors">
                  Undo
                </button>
              )}
              <button onClick={onDismiss} className="text-[10px] text-gray-400 hover:text-white transition-colors">
                Dismiss
              </button>
              <button
                onClick={onAcceptAll}
                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
          <ul className="space-y-1">
            {batch.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => onToggleItem(item.id)}
                  className="rounded border-gray-600 bg-transparent text-cyan-500 focus:ring-cyan-500/30 w-3 h-3"
                />
                <span className="text-gray-400">{item.label}:</span>
                <span className="font-medium text-white">{item.value}</span>
                <span className="text-gray-500">{item.unit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Demographics ────────────────────────────────────────────── */}
      {demographics && (
        <Section title="Demographics" icon={Users} defaultOpen={false}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {demographics.sex && <Kv label="Sex" value={demographics.sex} />}
            {demographics.bloodType && <Kv label="Blood" value={demographics.bloodType} />}
            {demographics.language && <Kv label="Language" value={demographics.language} />}
            {demographics.ethnicity && <Kv label="Ethnicity" value={demographics.ethnicity} />}
            {demographics.maritalStatus && <Kv label="Status" value={demographics.maritalStatus} />}
            {demographics.occupation && <Kv label="Occupation" value={demographics.occupation} />}
          </div>
          {demographics.insurance && (
            <div className="mt-2 pt-2 border-t border-white/[0.04]">
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Insurance</span>
              <p className="text-gray-300 mt-0.5">
                {demographics.insurance.provider} — {demographics.insurance.plan}
              </p>
              <p className="text-gray-500">{demographics.insurance.memberId}</p>
            </div>
          )}
          {demographics.careTeam && demographics.careTeam.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/[0.04]">
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Care Team</span>
              {demographics.careTeam.map((m, i) => (
                <p key={i} className="text-gray-300 mt-0.5">
                  {m.name} <span className="text-gray-500">— {m.role}, {m.specialty}</span>
                </p>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── Latest Vitals ───────────────────────────────────────────── */}
      {vitals && vitals.length > 0 && (
        <Section title="Vitals" icon={Activity} accent="text-emerald-400">
          <div className="grid grid-cols-3 gap-1.5">
            {vitals[0].bp && <VitalCard label="BP" value={vitals[0].bp} unit="mmHg" />}
            {vitals[0].hr && <VitalCard label="HR" value={String(vitals[0].hr)} unit="bpm" />}
            {vitals[0].spo2 && <VitalCard label="SpO2" value={`${vitals[0].spo2}`} unit="%" warn={vitals[0].spo2 < 95} />}
            {vitals[0].temp && <VitalCard label="Temp" value={vitals[0].temp} unit="°C" />}
            {vitals[0].rr && <VitalCard label="RR" value={String(vitals[0].rr)} unit="/min" />}
            {vitals[0].weight && <VitalCard label="Wt" value={vitals[0].weight} unit="kg" />}
          </div>
          <p className="text-[10px] text-gray-500 mt-1.5">Recorded {vitals[0].date}</p>
        </Section>
      )}

      {/* ── Active Problems ─────────────────────────────────────────── */}
      <Section title="Problems" icon={AlertCircle} count={problems.length} accent="text-red-400">
        {problems.length === 0 ? (
          <p className="text-gray-500 italic">No active problems</p>
        ) : (
          <ul className="space-y-1.5">
            {problems.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <SeverityDot severity={p.status} />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-200">{p.description}</span>
                  <span className="text-[10px] text-gray-500 ml-1.5 capitalize">{p.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ── Medications ─────────────────────────────────────────────── */}
      <Section title="Medications" icon={Pill} count={medications.length} accent="text-violet-400">
        {medications.length === 0 ? (
          <p className="text-gray-500 italic">No active medications</p>
        ) : (
          <ul className="space-y-1.5">
            {medications.map((m, i) => (
              <li key={i} className="flex items-start gap-2">
                <Pill className="w-3 h-3 text-violet-400/50 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-200 font-medium">{m.name}</span>
                  <span className="text-gray-400 ml-1">{m.dose}</span>
                  <p className="text-[10px] text-gray-500">{m.frequency}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ── Allergies ───────────────────────────────────────────────── */}
      <Section title="Allergies" icon={AlertTriangle} count={allergies.length} accent="text-amber-400">
        {allergies.length === 0 ? (
          <p className="text-emerald-400/80 font-medium">NKDA</p>
        ) : (
          <ul className="space-y-1.5">
            {allergies.map((a, i) => (
              <li key={i} className="flex items-start gap-2">
                <SeverityDot severity={a.severity} />
                <div className="flex-1 min-w-0">
                  <span className={a.severity === 'severe' ? 'text-red-300 font-medium' : 'text-gray-200'}>
                    {a.allergen}
                  </span>
                  <span className="text-gray-500 ml-1">— {a.reaction}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ── Lab Results ─────────────────────────────────────────────── */}
      {labResults && labResults.length > 0 && (
        <Section title="Lab Results" icon={FlaskRound} count={labResults.length} accent="text-blue-400" defaultOpen={false}>
          <ul className="space-y-1.5">
            {labResults.map((lr, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <SeverityDot severity={lr.flag || 'normal'} />
                  <span className="text-gray-300 truncate">{lr.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`font-mono font-medium ${
                    lr.flag === 'critical' ? 'text-red-400' :
                    lr.flag === 'high' ? 'text-amber-400' :
                    lr.flag === 'low' ? 'text-blue-400' : 'text-gray-200'
                  }`}>
                    {lr.value}
                  </span>
                  <span className="text-gray-500 text-[10px]">{lr.unit}</span>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Family History ──────────────────────────────────────────── */}
      {familyHistory && familyHistory.length > 0 && (
        <Section title="Family History" icon={Heart} count={familyHistory.length} accent="text-pink-400" defaultOpen={false}>
          <ul className="space-y-1">
            {familyHistory.map((fh, i) => (
              <li key={i} className="text-gray-300">
                <span className="text-gray-400">{fh.relation}:</span>{' '}
                {fh.condition}
                {fh.ageAtOnset && <span className="text-gray-500 ml-1">(onset {fh.ageAtOnset}y)</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Surgical History ────────────────────────────────────────── */}
      {surgicalHistory && surgicalHistory.length > 0 && (
        <Section title="Surgical History" icon={FileText} count={surgicalHistory.length} accent="text-orange-400" defaultOpen={false}>
          <ul className="space-y-1">
            {surgicalHistory.map((sh, i) => (
              <li key={i} className="text-gray-300">
                {sh.procedure} <span className="text-gray-500">({sh.date})</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Immunizations ───────────────────────────────────────────── */}
      {immunizations && immunizations.length > 0 && (
        <Section title="Immunizations" icon={Syringe} count={immunizations.length} accent="text-teal-400" defaultOpen={false}>
          <ul className="space-y-1">
            {immunizations.map((imm, i) => (
              <li key={i} className="flex items-center gap-2">
                {imm.status === 'completed' ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : imm.status === 'overdue' ? (
                  <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                ) : (
                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                )}
                <span className="text-gray-300">{imm.vaccine}</span>
                <span className="text-[10px] text-gray-500 ml-auto">{imm.date}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Social History ──────────────────────────────────────────── */}
      {socialHistory && (
        <Section title="Social History" icon={Users} accent="text-indigo-400" defaultOpen={false}>
          <div className="space-y-1">
            <Kv label="Tobacco" value={`${socialHistory.tobacco.status}${socialHistory.tobacco.packYears ? ` (${socialHistory.tobacco.packYears} pack-years)` : ''}`} />
            <Kv label="Alcohol" value={`${socialHistory.alcohol.status}${socialHistory.alcohol.drinksPerWeek ? ` (${socialHistory.alcohol.drinksPerWeek}/wk)` : ''}`} />
            <Kv label="Exercise" value={socialHistory.exercise.frequency} />
            {socialHistory.diet && <Kv label="Diet" value={socialHistory.diet} />}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="text-gray-200">{value}</span>
    </div>
  );
}

function VitalCard({ label, value, unit, warn }: { label: string; value: string; unit: string; warn?: boolean }) {
  return (
    <div className={`rounded-md px-2 py-1.5 text-center ${
      warn ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/[0.03] border border-white/[0.04]'
    }`}>
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className={`text-sm font-semibold font-mono ${warn ? 'text-red-400' : 'text-white'}`}>{value}</p>
      <p className="text-[9px] text-gray-500">{unit}</p>
    </div>
  );
}
