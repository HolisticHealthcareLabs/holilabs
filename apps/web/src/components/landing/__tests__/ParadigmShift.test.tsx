/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

import { ParadigmShift } from '../ParadigmShift';

describe('ParadigmShift', () => {
  it('renders without crashing', () => {
    const { container } = render(<ParadigmShift />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders a section with id "platform"', () => {
    render(<ParadigmShift />);
    expect(document.querySelector('#platform')).toBeInTheDocument();
  });

  it('renders section content', () => {
    render(<ParadigmShift />);
    // Section always renders some content
    expect(document.querySelector('section')).toBeTruthy();
  });
});
