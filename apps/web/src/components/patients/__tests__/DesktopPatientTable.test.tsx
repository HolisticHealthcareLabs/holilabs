/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/components/spatial/SpatialCard', () => ({
  SpatialCard: ({ children, className }: any) => <div className={className}>{children}</div>,
}));
jest.mock('@tanstack/react-table', () => ({
  useReactTable: () => ({
    getHeaderGroups: () => [],
    getRowModel: () => ({ rows: [] }),
    options: {},
  }),
  getCoreRowModel: () => () => ({}),
  getSortedRowModel: () => () => ({}),
  getFilteredRowModel: () => () => ({}),
  flexRender: () => null,
}));
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
  }),
}));

const { DesktopPatientTable } = require('../DesktopPatientTable');

describe('DesktopPatientTable', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders search input', () => {
    render(<DesktopPatientTable patients={[]} />);
    expect(screen.getByPlaceholderText(/Search patients/i)).toBeInTheDocument();
  });

  it('shows 0 of 0 patients with empty data', () => {
    render(<DesktopPatientTable patients={[]} />);
    expect(screen.getByText('Showing 0 of 0 patients')).toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    render(<DesktopPatientTable patients={[]} loading={true} />);
    expect(screen.getByText('Loading patients...')).toBeInTheDocument();
  });
});
