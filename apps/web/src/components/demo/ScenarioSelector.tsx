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
    <div>
      <h3 className="text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.06em] mb-4">
        Select a Patient Scenario
      </h3>
      <div
        className="flex gap-3 overflow-x-auto overflow-y-hidden pb-2 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:pb-0 -mx-5 px-5 md:mx-0 md:px-0"
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
                snap-center flex-shrink-0 w-[200px] md:w-auto text-left p-4 rounded-xl
                ring-1 transition-all duration-200
                ${isSelected
                  ? 'ring-[#0071e3] ring-2 bg-blue-50/40 shadow-md'
                  : 'ring-black/[0.08] bg-white hover:ring-black/[0.14] hover:shadow-sm'
                }
              `}
            >
              {/* Header with dot */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[scenario.trafficLight]}`}
                  aria-label={`Expected signal: ${scenario.trafficLight}`}
                />
                <span className="text-[14px] font-semibold text-[#1d1d1f] tracking-[-0.01em] truncate">
                  {scenario.name}
                </span>
              </div>

              {/* Demographics */}
              <p className="text-[12px] text-[#6e6e73] mb-1.5">
                {scenario.demographicsSummary}
              </p>

              {/* Description */}
              <p className="text-[13px] text-[#6e6e73] leading-snug line-clamp-2">
                {scenario.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
