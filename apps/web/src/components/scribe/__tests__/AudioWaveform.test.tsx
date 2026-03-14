/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import AudioWaveform from '../AudioWaveform';

describe('AudioWaveform', () => {
  it('renders a canvas element', () => {
    render(<AudioWaveform stream={null} isRecording={false} />);
    expect(document.querySelector('canvas')).toBeInTheDocument();
  });

  it('shows placeholder text when not recording', () => {
    render(<AudioWaveform stream={null} isRecording={false} />);
    expect(screen.getByText(/Start Recording/i)).toBeInTheDocument();
  });

  it('does not show placeholder when recording', () => {
    render(<AudioWaveform stream={null} isRecording={true} />);
    expect(screen.queryByText(/Start Recording/i)).toBeNull();
  });
});
