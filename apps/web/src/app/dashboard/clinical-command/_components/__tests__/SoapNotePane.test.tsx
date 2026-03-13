/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => React.forwardRef(({ children, ...rest }: any, ref: any) => {
      const Tag = typeof prop === 'string' ? prop : 'div';
      return React.createElement(Tag, { ...rest, ref }, children);
    }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      soapNote: 'SOAP Note',
      soapAwaiting: 'Awaiting transcript',
      soapSubjective: 'Subjective',
      soapObjective: 'Objective',
      soapAssessment: 'Assessment',
      soapPlan: 'Plan',
      soapListening: 'Listening…',
      soapAutoFill: 'Auto-filling',
      soapComplete: 'Complete',
      soapGenerating: 'Generating...',
      soapError: 'Error',
      signAndBill: 'Sign & Bill',
      selectPatientFirst: 'Select patient first',
      completeRecording: 'Complete recording',
      soapInProgress: 'SOAP in progress',
      signAndBillEncounter: 'Sign and bill',
      soapStructuring: 'Structuring SOAP note...',
      soapGenerationFailed: 'SOAP generation failed',
      soapRetryGeneration: 'Retry',
    };
    return map[key] ?? key;
  },
}));

import { SoapNotePane } from '../SoapNotePane';

describe('SoapNotePane', () => {
  const onSignAndBill = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders SOAP Note header', () => {
    render(<SoapNotePane segmentCount={0} patientSelected={false} onSignAndBill={onSignAndBill} />);
    expect(screen.getByText('SOAP Note')).toBeInTheDocument();
  });

  it('renders all four SOAP sections', () => {
    render(<SoapNotePane segmentCount={20} patientSelected={true} onSignAndBill={onSignAndBill} isCompleted />);
    expect(screen.getByText('Subjective')).toBeInTheDocument();
    expect(screen.getByText('Objective')).toBeInTheDocument();
    expect(screen.getByText('Assessment')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });

  it('disables Sign & Bill when not completed', () => {
    render(<SoapNotePane segmentCount={5} patientSelected={true} onSignAndBill={onSignAndBill} />);
    const button = screen.getByRole('button', { name: /sign and bill/i });
    expect(button).toBeDisabled();
  });
});
