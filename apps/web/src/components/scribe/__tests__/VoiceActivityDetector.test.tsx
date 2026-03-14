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

describe('VoiceActivityDetector', () => {
  it('renders the component container', () => {
    const { container } = render(
      <VoiceActivityDetector stream={null} isRecording={false} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders nothing when not recording', () => {
    const { container } = render(<VoiceActivityDetector stream={null} isRecording={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the VAD UI when recording (with a stream)', () => {
    // Even without a real stream, the component renders the indicator container
    // Pass a fake MediaStream-like object; the component only uses it in useEffect
    render(<VoiceActivityDetector stream={{} as MediaStream} isRecording={true} />);
    expect(screen.getByText(/Voz detectada|Silencio|Esperando/i)).toBeInTheDocument();
  });
});
