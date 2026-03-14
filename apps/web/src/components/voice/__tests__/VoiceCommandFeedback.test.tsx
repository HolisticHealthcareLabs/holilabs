/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@heroicons/react/24/solid', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { VoiceCommandFeedback } from '../VoiceCommandFeedback';

describe('VoiceCommandFeedback', () => {
  it('renders nothing when not active', () => {
    const { container } = render(
      <VoiceCommandFeedback
        isListening={false}
        isProcessing={false}
        transcript=""
        lastCommand={null}
        error={null}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders listening state', () => {
    render(
      <VoiceCommandFeedback
        isListening={true}
        isProcessing={false}
        transcript="blood pressure"
        lastCommand={null}
        error={null}
      />
    );
    expect(screen.getByText('Listening...')).toBeInTheDocument();
    expect(screen.getByText(/"blood pressure"/)).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(
      <VoiceCommandFeedback
        isListening={false}
        isProcessing={false}
        transcript=""
        lastCommand={null}
        error="Command not recognized"
      />
    );
    expect(screen.getByText('Command not recognized')).toBeInTheDocument();
  });
});
