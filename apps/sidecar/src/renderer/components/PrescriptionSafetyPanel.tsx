import React from 'react';
import type { TrafficLightResult } from '../../types';

interface PrescriptionSafetyPanelProps {
  result: TrafficLightResult | null;
  loading: boolean;
  onCheck: () => void;
}

const COLOR_CONFIG = {
  RED:    { bg: '#ff3b30', label: 'BLOCKED', text: 'text-red-400' },
  YELLOW: { bg: '#ff9f0a', label: 'CAUTION', text: 'text-yellow-400' },
  GREEN:  { bg: '#30d158', label: 'CLEARED', text: 'text-green-400' },
};

export const PrescriptionSafetyPanel: React.FC<PrescriptionSafetyPanelProps> = ({
  result,
  loading,
  onCheck,
}) => {
  const color = result?.color ?? 'GREEN';
  const cfg = COLOR_CONFIG[color] ?? COLOR_CONFIG.GREEN;

  return (
    <div
      style={{ background: '#1c1c1e', fontFamily: '-apple-system, system-ui, BlinkMacSystemFont, sans-serif' }}
      className="rounded-xl border border-white/10 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-cyan-500 flex items-center justify-center">
            <span className="text-[9px] font-bold text-slate-950">Rx</span>
          </div>
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            CORTEX <span className="text-white/40 font-light">Rx Safety</span>
          </span>
        </div>

        {/* Connection badge */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          LIVE
        </div>
      </div>

      {/* Traffic Light Badge */}
      <div className="flex items-center gap-4 px-4 py-4 border-b border-white/10">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{
            background: loading ? '#3a3a3c' : cfg.bg,
            boxShadow: loading ? 'none' : `0 0 20px ${cfg.bg}60`,
          }}
        >
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <span className="text-[9px] font-bold text-white tracking-widest">{cfg.label}</span>
          )}
        </div>

        <div>
          <div className={`text-sm font-semibold ${loading ? 'text-white/40' : cfg.text}`}>
            {loading ? 'Evaluating…' : `${color} — ${cfg.label}`}
          </div>
          {result && (
            <div className="text-[10px] text-white/30 font-mono mt-0.5">
              {result.signals.length} signal{result.signals.length !== 1 ? 's' : ''} detected
            </div>
          )}
        </div>
      </div>

      {/* Signal List */}
      {result && result.signals.length > 0 ? (
        <div className="flex flex-col divide-y divide-white/5 max-h-40 overflow-y-auto">
          {result.signals.map((sig, i) => {
            const isRed = sig.color === 'RED';
            const isYellow = sig.color === 'YELLOW';
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                {/* Severity chip */}
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                  style={{
                    background: isRed ? 'rgba(255,59,48,0.15)' : isYellow ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.15)',
                    color: isRed ? '#ff3b30' : isYellow ? '#ff9f0a' : '#30d158',
                  }}
                >
                  {sig.color}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-slate-200 leading-tight">{sig.message}</div>
                  <div className="text-[9px] text-white/30 font-mono mt-0.5">{sig.ruleId}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : result ? (
        <div className="px-4 py-3 text-[11px] text-white/30 font-mono">
          No signals — prescription appears safe.
        </div>
      ) : (
        <div className="px-4 py-3 text-[11px] text-white/30 font-mono">
          Awaiting prescription context…
        </div>
      )}

      {/* CTA Button */}
      <div className="px-4 py-3 border-t border-white/10">
        <button
          onClick={onCheck}
          disabled={loading}
          className="w-full bg-white text-black rounded-full py-2 text-xs font-semibold tracking-wide hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Evaluating…' : 'Check New Prescription'}
        </button>
      </div>
    </div>
  );
};
