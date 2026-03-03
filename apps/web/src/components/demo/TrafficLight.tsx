'use client';

import React from 'react';

export type TrafficLightSignal = 'red' | 'yellow' | 'green' | 'off';

interface TrafficLightProps {
  signal: TrafficLightSignal;
}

export function TrafficLight({ signal }: TrafficLightProps) {
  return (
    <div
      className="flex flex-col items-center gap-3 bg-[#1d1d1f] rounded-2xl p-4 w-[72px] shadow-lg"
      role="status"
      aria-label={signal === 'off' ? 'Safety check not run' : `Safety signal: ${signal}`}
    >
      <Light color="red" active={signal === 'red'} label="Critical alert" />
      <Light color="yellow" active={signal === 'yellow'} label="Warning" />
      <Light color="green" active={signal === 'green'} label="All clear" />
    </div>
  );
}

function Light({ color, active, label }: { color: 'red' | 'yellow' | 'green'; active: boolean; label: string }) {
  const colorMap = {
    red: {
      bg: 'bg-red-500',
      glow: 'shadow-[0_0_16px_4px_rgba(239,68,68,0.5)]',
    },
    yellow: {
      bg: 'bg-amber-400',
      glow: 'shadow-[0_0_16px_4px_rgba(251,191,36,0.5)]',
    },
    green: {
      bg: 'bg-emerald-500',
      glow: 'shadow-[0_0_16px_4px_rgba(16,185,129,0.5)]',
    },
  };

  const { bg, glow } = colorMap[color];

  return (
    <div
      className={`
        w-10 h-10 rounded-full transition-all duration-[600ms] ease-in-out
        ${active ? `${bg} ${glow} opacity-100` : `${bg} opacity-20`}
        ${active ? 'animate-pulse' : ''}
      `}
      role="img"
      aria-label={active ? label : `${label} (inactive)`}
    />
  );
}
