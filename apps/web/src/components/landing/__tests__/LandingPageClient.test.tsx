/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light' as const, toggleTheme: jest.fn() }) }));
jest.mock('@/components/IntroAnimation', () => ({ IntroAnimation: ({ onComplete }: any) => <div data-testid="intro" onClick={onComplete} /> }));
jest.mock('@/components/landing/LandingHeader', () => ({ LandingHeader: () => <header data-testid="landing-header" /> }));
jest.mock('@/components/landing/Hero', () => ({ Hero: () => <div data-testid="hero" /> }));
jest.mock('@/components/landing/HowItWorks', () => ({ HowItWorks: () => <div data-testid="how-it-works" /> }));
jest.mock('@/components/landing/Roadmap', () => ({ Roadmap: () => <div data-testid="roadmap" /> }));
jest.mock('@/components/landing/DataMoat', () => ({ DataMoat: () => <div data-testid="data-moat" /> }));
jest.mock('@/components/landing/DemoRequest', () => ({ DemoRequest: () => <div data-testid="demo-request" /> }));
jest.mock('@/components/landing/Footer', () => ({ Footer: () => <footer data-testid="footer" /> }));

import { LandingPageClient } from '../LandingPageClient';

describe('LandingPageClient', () => {
  it('renders without crashing', () => {
    const { container } = render(<LandingPageClient />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders the landing header', () => {
    render(<LandingPageClient />);
    expect(screen.getByTestId('landing-header')).toBeInTheDocument();
  });

  it('renders the hero section and footer', () => {
    render(<LandingPageClient />);
    expect(screen.getByTestId('hero')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });
});
