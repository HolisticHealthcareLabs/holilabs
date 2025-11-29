'use client';

import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import confetti from 'canvas-confetti';

interface DashboardWalkthroughProps {
  onComplete?: () => void;
}

export default function DashboardWalkthrough({ onComplete }: DashboardWalkthroughProps) {
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    // Check if user has seen the walkthrough
    const hasSeenWalkthrough = localStorage.getItem('has_seen_dashboard_walkthrough');
    
    // Only run if user hasn't seen it and is authenticated (in dashboard)
    if (!hasSeenWalkthrough) {
      // Small delay to ensure dashboard is fully rendered
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps: Step[] = [
    {
      target: 'body',
      content: 'Welcome to Holi Labs! This is your Clinical Dashboard. Let\'s take a quick tour of the essentials.',
      disableBeacon: true,
      placement: 'center',
    },
    {
      target: '.dashboard-stats',
      content: 'Here you can see your key metrics at a glance: total patients, appointments, and more.',
      placement: 'bottom',
    },
    {
      target: 'body',
      content: 'Press Cmd+K (or Ctrl+K) anytime to open the command palette for quick navigation.',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'The Co-Pilot (in Clinical Suite) is your AI-powered clinical workspace. It combines voice transcription and diagnostic assistance.',
      placement: 'center',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      localStorage.setItem('has_seen_dashboard_walkthrough', 'true');
      
      // Trigger confetti explosion
      if (status === STATUS.FINISHED) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00FF88', '#b0ffda', '#00cc6a'],
        });
        
        // Call onComplete after confetti starts
        setTimeout(() => {
          onComplete?.();
        }, 500);
      } else {
        onComplete?.();
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#00FF88',
          textColor: '#374151',
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: '#ffffff',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipContent: {
          padding: '12px 0',
          fontSize: '14px',
          lineHeight: '1.5',
        },
        buttonNext: {
          backgroundColor: '#00FF88',
          borderRadius: 8,
          fontSize: '14px',
          padding: '8px 16px',
          color: '#000000',
          fontWeight: 'bold',
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: 10,
        },
        buttonSkip: {
          color: '#9ca3af',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
}

