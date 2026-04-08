'use client';

import { useState } from 'react';

export interface PresetOption<T extends string = string> {
  value: T;
  label: string;
  shortLabel?: string;
  color?: string;
}

interface SegmentedPresetProps<T extends string = string> {
  options: PresetOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function SegmentedPreset<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  disabled = false,
}: SegmentedPresetProps<T>) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const selectedIndex = options.findIndex((o) => o.value === value);

  const padY = size === 'sm' ? 'py-1.5' : 'py-2';
  const padX = size === 'sm' ? 'px-2' : 'px-3';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <div
      className={`inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-0.5 ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
      role="radiogroup"
    >
      {options.map((opt, i) => {
        const isSelected = selectedIndex === i;
        const isHovered = hoveredIndex === i;
        const color = opt.color || '#3B82F6';

        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`${padX} ${padY} ${textSize} font-semibold rounded-lg transition-all duration-200 whitespace-nowrap ${
              isSelected
                ? 'text-white shadow-sm'
                : isHovered
                  ? 'text-gray-700 dark:text-gray-200 bg-white/50 dark:bg-gray-700/50'
                  : 'text-gray-500 dark:text-gray-400'
            }`}
            style={isSelected ? { backgroundColor: color } : undefined}
            title={opt.label}
          >
            {opt.shortLabel || opt.label}
          </button>
        );
      })}
    </div>
  );
}

export const TREATMENT_APPROACH_OPTIONS: PresetOption<string>[] = [
  { value: 'MBE_ONLY', label: 'MBE Puro', shortLabel: 'MBE', color: '#3B82F6' },
  { value: 'MBE_PRIMARY', label: 'MBE Prioritário', shortLabel: 'MBE+', color: '#6366F1' },
  { value: 'INTEGRATIVE', label: 'Integrativo', shortLabel: 'Integ.', color: '#10B981' },
  { value: 'PICS_EMPHASIS', label: 'PICs Ênfase', shortLabel: 'PICs+', color: '#059669' },
  { value: 'PICS_LEAD', label: 'PICs Líder', shortLabel: 'PICs', color: '#047857' },
];
