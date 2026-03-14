/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('next/image', () => ({ __esModule: true, default: ({ src, alt }: any) => <img src={src} alt={alt} /> }));

const { IntroQuestionnaireModal } = require('../IntroQuestionnaireModal');

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  onSaved: jest.fn(),
};

describe('IntroQuestionnaireModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(null),
    }) as jest.Mock;
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
      writable: true,
    });
  });

  it('renders null when open is false', () => {
    const { container } = render(<IntroQuestionnaireModal {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders "Welcome to Cortex" when open', () => {
    render(<IntroQuestionnaireModal {...defaultProps} />);
    expect(screen.getByText('Welcome to Cortex')).toBeInTheDocument();
  });

  it('renders "Skip" button', () => {
    render(<IntroQuestionnaireModal {...defaultProps} />);
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });
});
