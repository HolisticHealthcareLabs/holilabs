/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import VoiceActivityDetector from '../VoiceActivityDetector';

// Mock AudioContext for jsdom (plain functions survive resetMocks)
// Fill data array with 128 (neutral baseline) to simulate silence
const mockAnalyser = {
  fftSize: 0,
  smoothingTimeConstant: 0,
  frequencyBinCount: 1024,
  getByteTimeDomainData: (arr: Uint8Array) => { arr.fill(128); },
};
const mockAudioContext = {
  createAnalyser: () => mockAnalyser,
  createMediaStreamSource: () => ({ connect: () => {} }),
  close: () => {},
};
(globalThis as any).AudioContext = function () { return mockAudioContext; };

describe('VoiceActivityDetector', () => {
  it('renders nothing when not recording', () => {
    const { container } = render(<VoiceActivityDetector stream={null} isRecording={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the VAD UI when recording (with a stream)', () => {
    render(<VoiceActivityDetector stream={{} as MediaStream} isRecording={true} />);
    expect(screen.getByText(/Voz detectada|Silencio/)).toBeInTheDocument();
  });

  it('renders volume indicator when recording', () => {
    const { container } = render(<VoiceActivityDetector stream={{} as MediaStream} isRecording={true} />);
    expect(container.querySelector('.bg-gradient-to-r')).toBeInTheDocument();
  });
});
