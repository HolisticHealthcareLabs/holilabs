'use client';

import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface ScribeTourProps {
  run?: boolean;
  onComplete?: () => void;
}

export default function ScribeTour({ run = false, onComplete }: ScribeTourProps) {
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    setRunTour(run);
  }, [run]);

  const steps: Step[] = [
    {
      target: '.patient-selection-panel',
      content: 'Start by selecting a patient from your patient list. You can search by name or MRN.',
      disableBeacon: true,
      placement: 'right',
    },
    {
      target: '.realtime-toggle',
      content: 'Choose between Real-Time Mode (live streaming transcription) or Traditional Mode (record then process).',
      placement: 'bottom',
    },
    {
      target: '.recording-controls',
      content: 'Control your recording session here. Start, pause, resume, or stop your voice recording.',
      placement: 'top',
    },
    {
      target: '.audio-waveform',
      content: 'Monitor your audio input with this live waveform visualization.',
      placement: 'top',
    },
    {
      target: '.transcript-viewer',
      content: 'View your live transcription here. You can edit any segment by clicking on it if corrections are needed.',
      placement: 'left',
    },
    {
      target: '.soap-note-editor',
      content: 'Your AI-generated SOAP note appears here. Review and edit before signing.',
      placement: 'left',
    },
  ];

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
