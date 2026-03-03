'use client';

import { useState } from 'react';
import { Brain, AlertTriangle, CheckCircle, XCircle, Loader2, ChevronDown } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ExtractedMedication {
  name: string;
  dose: string;
  frequency: string;
  route?: string;
  quantity?: number;
  tussCode?: string;
}

interface SafetyAlert {
  ruleId?: string;
  summary: string;
  severity: 'info' | 'warning' | 'critical';
}

interface CopilotResult {
  extractedMedications: ExtractedMedication[];
  safetyCheck: {
    color: 'GREEN' | 'AMBER' | 'RED';
    signal: SafetyAlert[];
    financialRisk: { glosaRisk: boolean; rulesFired: string[] };
    processingTimeMs: number;
  };
  extraction: { model: string; extractionTimeMs: number; medicationCount: number };
}

// ── Color config ───────────────────────────────────────────────────────────────

const COLOR_CONFIG = {
  GREEN: {
    bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-800',
    icon: CheckCircle, iconClass: 'text-green-600', label: 'CLEARED',
  },
  AMBER: {
    bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800',
    icon: AlertTriangle, iconClass: 'text-yellow-600', label: 'REVIEW REQUIRED',
  },
  RED: {
    bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-800',
    icon: XCircle, iconClass: 'text-red-600', label: 'BLOCKED',
  },
};

const ALERT_SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
};

// ── Demo SOAP notes ────────────────────────────────────────────────────────────

const DEMO_NOTES = {
  fin002: `Assessment: Paroxysmal atrial fibrillation (I48.0). Patient transitioning from warfarin.
Plan: Start apixaban 5mg BID. Supply 30 tablets. TUSS code: 00000000. Follow-up in 4 weeks.`,
  fin001: `Assessment: Tipo 2 diabetes mellitus com HbA1c 9.2% (E11.9). Poor glycemic control.
Plan: Prescribe apixaban 5mg BID for anticoagulation. Continue metformin 850mg BID.`,
  green: `Assessment: Paroxysmal atrial fibrillation (I48.0). CrCl 62 ml/min. Weight 72kg. Age 67.
Plan: Initiate apixaban 5mg BID, 30 tablets. Follow up in 6 weeks for INR check.`,
};

// ── Component ──────────────────────────────────────────────────────────────────

export function CopilotDraftPanel({ patientId, encounterId }: {
  patientId?: string;
  encounterId?: string;
}) {
  const [soapNote, setSoapNote] = useState('');
  const [icd10Codes, setIcd10Codes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMeds, setShowMeds] = useState(true);

  const handleCheck = async () => {
    if (!soapNote.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        patientId: patientId ?? 'demo-dr-silva-id',
        encounterId: encounterId ?? 'ENC-GLOSA-FIN002-DEMO',
        soapNote,
      };
      if (icd10Codes.trim()) {
        body.icd10Codes = icd10Codes.split(',').map((s) => s.trim()).filter(Boolean);
      }

      const res = await fetch('/api/copilot/draft-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        return;
      }
      setResult(data as CopilotResult);
    } catch {
      setError('Network error — is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? COLOR_CONFIG[result.safetyCheck.color] : null;
  const ColorIcon = cfg?.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">AI Copilot — Draft Prescription</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
            Gemini 2.5 Flash → Cortex Firewall
          </span>
        </div>
      </div>

      {/* Demo quick-load buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs text-gray-400 self-center">Load demo:</span>
        {Object.entries({ 'FIN-002 (TUSS hallucination)': DEMO_NOTES.fin002, 'FIN-001 (ICD mismatch)': DEMO_NOTES.fin001, 'GREEN (safe)': DEMO_NOTES.green }).map(([label, note]) => (
          <button
            key={label}
            onClick={() => { setSoapNote(note); setResult(null); setError(null); }}
            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-700 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* SOAP Note input */}
      <textarea
        value={soapNote}
        onChange={(e) => { setSoapNote(e.target.value); setResult(null); setError(null); }}
        placeholder="Paste clinical SOAP note here…&#10;&#10;Example: 'Assessment: Atrial fibrillation (I48.0). Plan: Start apixaban 5mg BID, 30 tablets.'"
        rows={5}
        className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 font-mono text-gray-800 placeholder-gray-400 mb-3"
      />

      {/* Optional ICD-10 override */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={icd10Codes}
          onChange={(e) => setIcd10Codes(e.target.value)}
          placeholder="ICD-10 codes (optional, comma-separated) e.g. I48.0"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
        <button
          onClick={handleCheck}
          disabled={loading || !soapNote.trim()}
          className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</>
          ) : (
            <><Brain className="w-4 h-4" /> Check Draft</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Result */}
      {result && cfg && ColorIcon && (
        <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 space-y-4`}>

          {/* Traffic light header */}
          <div className="flex items-center gap-3">
            <ColorIcon className={`w-6 h-6 ${cfg.iconClass}`} />
            <div>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                {cfg.label}
              </span>
              {result.safetyCheck.financialRisk.glosaRisk && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  ⚠ Glosa Risk — {result.safetyCheck.financialRisk.rulesFired.join(', ')}
                </span>
              )}
            </div>
            <span className="ml-auto text-xs text-gray-400 font-mono">
              {result.extraction.model} · {result.extraction.extractionTimeMs}ms extract · {result.safetyCheck.processingTimeMs}ms eval
            </span>
          </div>

          {/* Extracted medications */}
          {result.extractedMedications.length > 0 && (
            <div>
              <button
                onClick={() => setShowMeds((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-2"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showMeds ? 'rotate-180' : ''}`} />
                Extracted medications ({result.extractedMedications.length})
              </button>
              {showMeds && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {['Drug', 'Dose', 'Frequency', 'Route', 'Qty', 'TUSS'].map((h) => (
                          <th key={h} className="text-left py-1 px-2 font-medium text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.extractedMedications.map((m, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-1.5 px-2 font-semibold text-gray-800 capitalize">{m.name}</td>
                          <td className="py-1.5 px-2 font-mono text-gray-700">{m.dose}</td>
                          <td className="py-1.5 px-2 text-gray-700">{m.frequency}</td>
                          <td className="py-1.5 px-2 text-gray-500">{m.route ?? '—'}</td>
                          <td className="py-1.5 px-2 font-mono text-gray-700">{m.quantity ?? '—'}</td>
                          <td className="py-1.5 px-2 font-mono">
                            {m.tussCode
                              ? <span className={result.safetyCheck.financialRisk.rulesFired.includes('FIN-002') ? 'text-red-600 font-bold' : 'text-gray-700'}>{m.tussCode}</span>
                              : <span className="text-gray-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {result.extractedMedications.length === 0 && (
            <p className="text-sm text-gray-500">No medications extracted from this note.</p>
          )}

          {/* Safety alerts */}
          {result.safetyCheck.signal.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600">Safety & Billing Alerts</p>
              {result.safetyCheck.signal.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${ALERT_SEVERITY_STYLE[alert.severity] ?? ALERT_SEVERITY_STYLE.info}`}
                >
                  {alert.ruleId && (
                    <span className="font-bold shrink-0">[{alert.ruleId}]</span>
                  )}
                  <span>{alert.summary}</span>
                </div>
              ))}
            </div>
          )}

          {result.safetyCheck.signal.length === 0 && result.extractedMedications.length > 0 && (
            <p className="text-sm text-green-700">✓ All clinical and billing guardrails passed.</p>
          )}
        </div>
      )}
    </div>
  );
}
