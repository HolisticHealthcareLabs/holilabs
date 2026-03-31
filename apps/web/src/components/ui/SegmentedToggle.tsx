'use client';

interface SegmentedToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  labelOn?: string;
  labelOff?: string;
  size?: 'sm' | 'md';
}

export function SegmentedToggle({
  value,
  onChange,
  labelOn = 'On',
  labelOff = 'Off',
  size = 'md',
}: SegmentedToggleProps) {
  const px = size === 'sm' ? 'px-3 py-1' : 'px-4 py-1.5';
  const text = size === 'sm' ? 'text-[11px]' : 'text-[12px]';

  return (
    <div
      className="inline-flex items-center p-[2px] ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
      style={{ backgroundColor: 'var(--surface-tertiary)', borderRadius: 'var(--radius-full)' }}
    >
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`relative ${px} ${text} font-medium transition-all duration-200 ${
          !value
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        style={{ borderRadius: 'var(--radius-full)' }}
      >
        {labelOff}
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`relative ${px} ${text} font-medium transition-all duration-200 ${
          value
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        style={{ borderRadius: 'var(--radius-full)' }}
      >
        {labelOn}
      </button>
    </div>
  );
}

interface SegmentedTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  size?: 'sm' | 'md';
}

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: SegmentedTabsProps<T>) {
  const px = size === 'sm' ? 'px-3 py-1' : 'px-4 py-1.5';
  const text = size === 'sm' ? 'text-[11px]' : 'text-[12px]';

  return (
    <div
      className="inline-flex items-center p-[2px] ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
      style={{ backgroundColor: 'var(--surface-tertiary)', borderRadius: 'var(--radius-full)' }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`relative ${px} ${text} font-medium transition-all duration-200 whitespace-nowrap ${
            value === opt.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          style={{ borderRadius: 'var(--radius-full)' }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
