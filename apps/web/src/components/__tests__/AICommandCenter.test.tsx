/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }), usePathname: () => '/test', useSearchParams: () => new URLSearchParams() }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', email: 'dr@test.com', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (key: string) => key }) }));
jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: {
      aiCommandCenter: {
        navigation: { cdss: 'nav cdss', scribe: 'nav scribe', prevention: 'nav prevention', patients: 'nav patients', pricing: 'nav pricing', login: 'nav login', dashboard: 'nav dash' },
        defaultResponse: 'I can help with {query}',
      },
    },
    language: 'es',
  }),
}));
jest.mock('@/lib/translations', () => ({
  translations: {
    es: { sendFeedback: 'Send Feedback', tellUsWhatYouThink: 'Tell us', cancel: 'Cancel', send: 'Send' },
    en: { sendFeedback: 'Send Feedback', tellUsWhatYouThink: 'Tell us', cancel: 'Cancel', send: 'Send' },
  },
}));

const { AICommandCenter } = require('../AICommandCenter');

describe('AICommandCenter', () => {
  it('returns null when not open', () => {
    const { container } = render(<AICommandCenter isOpen={false} onClose={jest.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders when open', () => {
    render(<AICommandCenter isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('AI Command Center')).toBeInTheDocument();
  });

  it('shows suggestion buttons', () => {
    render(<AICommandCenter isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText(/Decisiones Clínicas/)).toBeInTheDocument();
  });
});
