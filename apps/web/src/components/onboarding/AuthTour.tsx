'use client';

import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface AuthTourProps {
  run?: boolean;
  onComplete?: () => void;
  tourType: 'login' | 'register';
}

export default function AuthTour({ run = false, onComplete, tourType }: AuthTourProps) {
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    setRunTour(run);
  }, [run]);

  const loginSteps: Step[] = [
    {
      target: 'body',
      content: 'Welcome to Holi Labs! This is your clinician portal for AI-powered medical documentation.',
      disableBeacon: true,
      placement: 'center',
    },
    {
      target: '.login-form',
      content: 'Sign in with your email to access your dashboard. In development mode, you can use any email address.',
      placement: 'bottom',
    },
    {
      target: '.create-account-link',
      content: 'Don\'t have an account yet? You can request access here.',
      placement: 'top',
    },
  ];

  const registerSteps: Step[] = [
    {
      target: 'body',
      content: 'Request access to Holi Labs by filling out this registration form.',
      disableBeacon: true,
      placement: 'center',
    },
    {
      target: '.registration-form',
      content: 'Provide your professional information. Our team will review your request within 24-48 hours.',
      placement: 'bottom',
    },
    {
      target: '.back-to-login-link',
      content: 'Already have an account? Sign in here.',
      placement: 'top',
    },
  ];

  const steps = tourType === 'login' ? loginSteps : registerSteps;

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      onComplete?.();
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
          primaryColor: '#14b8a6',
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
          backgroundColor: '#14b8a6',
          borderRadius: 8,
          fontSize: '14px',
          padding: '8px 16px',
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
