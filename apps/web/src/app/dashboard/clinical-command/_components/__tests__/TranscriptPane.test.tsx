/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => {
  const React = require('react');
  const cache: Record<string, React.ComponentType<any>> = {};
  const handler = {
    get: (_target: any, prop: string) => {
      if (!cache[prop]) {
        cache[prop] = React.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, variants, layout, ...rest }: any, ref: any) => {
          const tag = typeof prop === 'string' ? prop : 'div';
          return React.createElement(tag, { ...rest, ref }, children);
        });
      }
      return cache[prop];
    },
  };
  const motionProxy = new Proxy({}, handler);
  return {
    __esModule: true,
    motion: motionProxy,
    m: motionProxy,
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

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
  } as any;

  it('renders Live Meeting Notes header', () => {
    render(<TranscriptPane {...baseProps} />);
    expect(screen.getByText(/live meeting notes/i)).toBeInTheDocument();
  });

  it('renders consent region', () => {
    render(<TranscriptPane {...baseProps} />);
    expect(screen.getByText(/recording authorization/i)).toBeInTheDocument();
  });

  it('shows empty state message when no segments and not recording', () => {
    render(<TranscriptPane {...baseProps} />);
    expect(screen.getByText(/press start/i)).toBeInTheDocument();
  });
});
