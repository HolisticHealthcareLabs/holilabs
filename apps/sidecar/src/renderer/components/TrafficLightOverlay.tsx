import React, { useState } from 'react';
import type { TrafficLightSignal } from '../../types';

interface TrafficLightProps {
  status: 'valid' | 'caution' | 'danger';
  confidence: number;
  message?: string;
  onExpand: () => void;
  signals?: TrafficLightSignal[]; // Added signals to access category/evidence
}

export const TrafficLightOverlay: React.FC<TrafficLightProps> = ({
  status,
  confidence,
  message,
  onExpand,
  signals
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Status mapping
  const statusConfig = {
    valid: { glow: 'glow-green', icon: '✓', label: 'ASSURED' },
    caution: { glow: 'glow-yellow', icon: '!', label: 'CHECK' },
    danger: { glow: 'glow-red', icon: '✕', label: 'BLOCKED' },
  };

  // Deterministic Override: If the signal is CLINICAL (RxNorm/SNOMED), use a Shield
  const primarySignal = signals?.[0];
  const isClinical = primarySignal?.category === 'CLINICAL';
  const displayIcon = isClinical && status === 'danger' ? '🛡️' : statusConfig[status].icon;
  const displayLabel = isClinical && status === 'danger' ? 'PROTOCOL' : statusConfig[status].label;

  const current = statusConfig[status];

  return (
    <div
      className={`fixed top-16 right-4 z-50 smooth-expand ${isHovered ? 'w-80' : 'w-14'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div
        className={`
          glass-panel rounded-full overflow-hidden flex items-center
          ${isHovered ? 'p-2 pl-2' : 'p-1.5'}
        `}
      >
        {/* The Glowing Core */}
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center shrink-0
            ${current.glow}
            text-white font-bold text-lg cursor-pointer
          `}
          onClick={onExpand}
        >
          {displayIcon}
        </div>

        {/* Expanded Info Surface */}
        <div
          className={`
            ml-3 flex-1 min-w-0 flex flex-col justify-center smooth-expand
            ${isHovered ? 'opacity-100 max-w-[240px]' : 'opacity-0 max-w-0 pointer-events-none'}
          `}
        >
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-bold tracking-widest text-white/60 uppercase">
                {isClinical ? 'DETERMINISTIC' : 'CONFIDENCE'}
              </span>
              <span className={`text-[10px] font-mono ${isClinical ? 'text-cyan-400' : 'text-white/90'}`}>
                {isClinical ? '100% (RxNorm)' : `${confidence}%`}
              </span>
            </div>

            <div className="text-sm font-bold text-white tracking-wide whitespace-nowrap">
              {displayLabel}
            </div>

            {message && (
              <div className="text-[10px] text-white/70 truncate mt-1 max-w-[220px]">
                {message}
              </div>
            )}

            {/* Show Source/Evidence if Clinical */}
            {isClinical && primarySignal?.evidence && (
              <div className="mt-2 pt-1 border-t border-white/10 flex gap-1 flex-wrap">
                {primarySignal.evidence.map((ev, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30">
                    {ev}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Collapse Icon (Visible only on hover) */}
        {isHovered && (
          <div className="text-gray-500 text-xs px-2 cursor-pointer" onClick={() => setIsHovered(false)}>
            ›
          </div>
        )}
      </div>
    </div>
  );
};
