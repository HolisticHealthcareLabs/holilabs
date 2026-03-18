/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

jest.mock('@headlessui/react', () => {
  const Dialog = ({ open, children }: any) => open ? <div role="dialog">{children}</div> : null;
  Dialog.Panel = ({ children }: any) => <div>{children}</div>;
  Dialog.Title = ({ children }: any) => <div>{children}</div>;
  Dialog.Description = ({ children }: any) => <div>{children}</div>;
  return { Dialog };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecordingConsentDialog } from '../RecordingConsentDialog';

describe('RecordingConsentDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <RecordingConsentDialog isOpen={false} patientName="Ana Torres" onConsent={jest.fn()} onDecline={jest.fn()} />
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders the patient name when open', () => {
    render(
      <RecordingConsentDialog isOpen={true} patientName="Ana Torres" onConsent={jest.fn()} onDecline={jest.fn()} />
    );
    expect(screen.getByText('Ana Torres')).toBeInTheDocument();
  });

  it('calls onConsent when authorize button is clicked', () => {
    const onConsent = jest.fn();
    render(
      <RecordingConsentDialog isOpen={true} patientName="Ana Torres" onConsent={onConsent} onDecline={jest.fn()} />
    );
    const authorizeButton = screen.getByRole('button', { name: /Autorizo/i });
    fireEvent.click(authorizeButton);
    expect(onConsent).toHaveBeenCalled();
  });
});
