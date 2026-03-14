/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en' }) }));
jest.mock('@/components/landing/copy', () => ({
  getLandingCopy: () => ({
    demo: {
      title: 'Ready to see it in action?',
      subtitle: 'Join the waitlist today',
      ctaClinic: 'Start Free Trial',
      ctaEnterprise: 'Enterprise Demo',
      emailPlaceholder: 'your@email.com',
      sending: 'Sending...',
      requestCta: 'Request Access',
      inviteOnly: 'Invite only',
      noIntegration: 'No EHR required',
      desktop: 'Desktop first',
      success: "You're on the list!",
      requestError: 'Something went wrong',
      networkError: 'Network error',
    },
  }),
}));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({}),
} as any);

import { DemoRequest } from '../DemoRequest';

describe('DemoRequest', () => {
  it('renders the section title', () => {
    render(<DemoRequest />);
    expect(screen.getByText('Ready to see it in action?')).toBeInTheDocument();
  });

  it('renders the email input and submit button', () => {
    render(<DemoRequest />);
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request Access/i })).toBeInTheDocument();
  });

  it('shows success message after successful submission', async () => {
    render(<DemoRequest />);
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@example.com' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(screen.getByText("You're on the list!")).toBeInTheDocument();
    });
  });
});
