'use client';

import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS, ACTIONS } from 'react-joyride';

const LS_KEY = 'holilabs:consoleTourSeen:v1';

function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === 'true';
  } catch {
    return false;
  }
}

function markTourSeen() {
  try {
    localStorage.setItem(LS_KEY, 'true');
  } catch {
    /* ignore */
  }
}

export default function ConsoleTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (hasSeenTour()) return;

    const timer = setTimeout(() => {
      setRun(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
            Welcome to the Governance Console
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            This is your control center for clinical safety. Let&apos;s walk through each
            section so you know exactly what everything means.
          </p>
        </div>
      ),
      disableBeacon: true,
      placement: 'center',
    },
    {
      target: '[data-tour="trust-score"]',
      content: (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
            Global Trust Score
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            A single number (0-100) that tells you how well your network is following
            safety protocols right now. Higher score = fewer overrides and deviations
            across all your sites.
          </p>
        </div>
      ),
      placement: 'right',
      spotlightPadding: 8,
    },
    {
      target: '[data-tour="code-focus"]',
      content: (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
            Code Focus Controls
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Filter everything on this page by clinical codes — like ICD diagnoses
            or protocol names. Pick &quot;Cardiology&quot; and the entire console
            shows only cardiology-related events.
          </p>
        </div>
      ),
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '[data-tour="validation-stream"]',
      content: (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
            Live Validation Stream
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            A real-time feed of every safety check, override, and clinical alert
            happening across your network right now. Each row shows what happened,
            where, and how serious it was — color-coded by severity.
          </p>
        </div>
      ),
      placement: 'left',
      spotlightPadding: 8,
    },
    {
      target: '[data-tour="interventions"]',
      content: (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
            Interventions
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            The total number of times the system stepped in to flag a potential safety
            issue — like a drug interaction or a missing lab result. More interventions
            means the system is actively catching risks.
          </p>
        </div>
      ),
      placement: 'right',
      spotlightPadding: 8,
    },
    {
      target: '[data-tour="hard-brakes"]',
      content: (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
            Hard Brakes
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Critical stops — the most serious interventions where the system blocked a
            high-risk action entirely. These are the moments that matter most: a
            contraindicated medication, a dangerous interaction, or a missing safety check.
          </p>
        </div>
      ),
      placement: 'left',
      spotlightPadding: 8,
    },
  ];

  const handleCallback = (data: CallBackProps) => {
    const { status, action } = data;

    if (
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED ||
      action === ACTIONS.CLOSE
    ) {
      setRun(false);
      markTourSeen();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling={false}
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: '#2563eb',
          textColor: '#1f2937',
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.55)',
          arrowColor: '#ffffff',
          zIndex: 10000,
        },
        spotlight: {
          borderRadius: 16,
        },
        tooltip: {
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: 420,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipContent: {
          padding: '8px 0',
        },
        buttonNext: {
          backgroundColor: '#2563eb',
          borderRadius: 10,
          fontSize: '13px',
          padding: '10px 20px',
          color: '#ffffff',
          fontWeight: 600,
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: 10,
          fontSize: '13px',
        },
        buttonSkip: {
          color: '#9ca3af',
          fontSize: '13px',
        },
        buttonClose: {
          color: '#9ca3af',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Got it',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
}
