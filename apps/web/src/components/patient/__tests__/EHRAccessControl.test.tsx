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

const { EHRAccessControl } = require('../EHRAccessControl');

describe('EHRAccessControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ permissions: [] }),
    }) as jest.Mock;
  });

  it('renders "EHR Access Control" heading', () => {
    render(<EHRAccessControl patientId="p1" />);
    expect(screen.getByText('EHR Access Control')).toBeInTheDocument();
  });

  it('shows "No active permissions" message when empty', () => {
    render(<EHRAccessControl patientId="p1" />);
    expect(screen.getByText(/No active permissions/)).toBeInTheDocument();
  });

  it('opens grant access modal when "Grant Access" is clicked', () => {
    render(<EHRAccessControl patientId="p1" />);
    fireEvent.click(screen.getByText('Grant Access'));
    expect(screen.getByText('Grant EHR Access')).toBeInTheDocument();
  });
});
