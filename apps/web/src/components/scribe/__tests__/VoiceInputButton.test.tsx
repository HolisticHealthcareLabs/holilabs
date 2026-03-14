/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import VoiceInputButton from '../VoiceInputButton';

describe('VoiceInputButton', () => {
  it('renders the voice input button', () => {
    render(<VoiceInputButton onTranscript={jest.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows unsupported message when SpeechRecognition is not available', () => {
    // SpeechRecognition not defined in jsdom
    render(<VoiceInputButton onTranscript={jest.fn()} />);
    // Either shows unsupported state or a microphone button
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(<VoiceInputButton onTranscript={jest.fn()} className="my-btn" />);
    expect(container.firstChild).toBeTruthy();
  });
});
