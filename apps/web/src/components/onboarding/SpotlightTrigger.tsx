'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Play } from 'lucide-react';

const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

interface SpotlightStep {
  target: string;
  title: string;
  content: string;
}

interface SpotlightTriggerProps {
  steps: SpotlightStep[];
  label?: string;
}

export default function SpotlightTrigger({ steps, label = 'Quick Tour' }: SpotlightTriggerProps) {
  const [run, setRun] = useState(false);

  const joyrideSteps = steps.map(s => ({
    target: s.target,
    content: (
      <div>
        <p className="font-semibold text-sm mb-1">{s.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{s.content}</p>
      </div>
    ),
    disableBeacon: true,
  }));

  return (
    <>
      <button
        onClick={() => setRun(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-400/50 dark:hover:border-cyan-400/40 hover:bg-cyan-50/50 dark:hover:bg-cyan-400/5 transition-colors"
        aria-label={label}
      >
        <Play className="w-3 h-3" />
        {label}
      </button>
      {run && (
        <Joyride
          steps={joyrideSteps}
          run={run}
          continuous
          showProgress
          showSkipButton
          callback={(data) => {
            if (['finished', 'skipped'].includes(data.status)) {
              setRun(false);
            }
          }}
          styles={{
            options: {
              primaryColor: '#06b6d4',
              zIndex: 10000,
            },
          }}
        />
      )}
    </>
  );
}
