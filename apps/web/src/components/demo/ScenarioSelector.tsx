'use client';

import React from 'react';
import { DEMO_SCENARIOS, type DemoScenario } from '@/lib/demo/demo-scenarios';

interface ScenarioSelectorProps {
  selectedId: string | null;
  onSelect: (scenario: DemoScenario) => void;
}

const scenarios = Object.values(DEMO_SCENARIOS);

const dotColors: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
};

export function ScenarioSelector({ selectedId, onSelect }: ScenarioSelectorProps) {
  return (
    <div className="w-full">
      <h3 className="text-[12px] font-bold text-[#86868b] uppercase tracking-widest mb-5">
        Select a Patient Scenario
      </h3>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
        role="listbox"
        aria-label="Patient scenarios"
      >
        {scenarios.map((scenario) => {
          const isSelected = selectedId === scenario.id;
          return (
            <button
              key={scenario.id}
              onClick={() => onSelect(scenario)}
              role="option"
              aria-selected={isSelected}
              className={`
                group text-left p-5 rounded-2xl w-full flex flex-col items-stretch
                transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isSelected
                  ? 'ring-2 ring-[#0071e3] bg-[#f5f5f7] shadow-[0_4px_24px_rgba(0,0,0,0.06)]'
                  : 'ring-1 ring-black/[0.08] bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:ring-black/[0.15]'
                }
              `}
            >
              {/* Header with dot */}
              <div className="flex w-full items-start justify-between mb-3">
                <span className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
                  {scenario.name}
                </span>
                <span
                  className={`w-2.5 h-2.5 mt-1 rounded-full flex-shrink-0 transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'} ${dotColors[scenario.trafficLight]}`}
                  aria-label={`Expected signal: ${scenario.trafficLight}`}
                />
              </div>

              {/* Demographics */}
              <p className="text-[13px] font-medium text-[#86868b] mb-2 tracking-tight">
                {scenario.demographicsSummary}
              </p>

              {/* Description */}
              <p className="text-[13px] text-[#515154] leading-relaxed line-clamp-3">
                {scenario.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
