/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => React.forwardRef(({ children, ...rest }: any, ref: any) => {
      const Tag = typeof prop === 'string' ? prop : 'div';
      return React.createElement(Tag, { ...rest, ref }, children);
    }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('@/lib/deid', () => ({
  maskPHI: (text: string) => text,
  PHI_TOKEN_REGEX: /\[PHI:[A-Z_]+\]/g,
}));

jest.mock('../useTranscriptAudio', () => ({
  useTranscriptAudio: () => ({ isMuted: true, toggleMute: jest.fn(), isSupported: false }),
}));

jest.mock('../AudioWaveform', () => ({
  AudioWaveform: () => <div data-testid="waveform" />,
}));

import { TranscriptPane, type Segment } from '../TranscriptPane';

describe('TranscriptPane', () => {
  const baseProps = {
    segments: [] as Segment[],
    isRecording: false,
    onToggleRecord: jest.fn(),
    disabled: false,
    consentRecord: { granted: true, timestamp: Date.now(), method: 'verbal' as const },
    onGrantConsent: jest.fn(),
    onRevokeConsent: jest.fn(),
  };

  it('renders Live Meeting Notes header', () => {
    render(<TranscriptPane {...baseProps} />);
    expect(screen.getByText('Live Meeting Notes')).toBeInTheDocument();
  });

  it('renders consent region', () => {
    render(<TranscriptPane {...baseProps} />);
    expect(screen.getByText('Recording Authorization')).toBeInTheDocument();
  });

  it('shows empty state message when no segments and not recording', () => {
    render(<TranscriptPane {...baseProps} />);
    expect(screen.getByText(/press start recording/i)).toBeInTheDocument();
  });
});
